// Eco · el volumen de la copia de escucha.
//
// La grabación se sube hasta el nivel de la voz de Noi para que el oído compare de igual a igual. En un iPhone la
// voz llega del micro a unos −20 dBFS (medido en tomas reales, con el modo normal del micro; ver
// patches/expo-audio+*.patch) y hay que subirla unos 8 dB.
// Lo que se mide es la VOZ, no el archivo entero: el silencio de antes y de después de hablar bajaría la media, y
// un golpe suelto (el dedo en la pantalla) la falsearía. Los picos que no caben se redondean en vez de recortarse.
// El análisis del tono no pasa por aquí: conserva las muestras originales.

/**
 * Nivel (RMS) al que queda la voz. La voz thai del sistema ronda 0,17, pero una grabación se percibe más floja que
 * una voz sintética: con 0,17–0,20 se oía «un poco más baja» que Noi en un iPhone y con 0,28 «un poquito por encima».
 */
const VOICE_LEVEL = 0.23;
/** Ganancia máxima (36 dB): por encima solo se subiría el ruido de fondo. */
const MAX_GAIN = 64;
/** Hasta aquí la onda sale intacta; por encima se va curvando… */
const KNEE = 0.6;
/** …sin llegar nunca a este techo. */
const CEILING = 0.98;
/** Tramos de 20 ms para medir dónde hay voz. */
const FRAME_S = 0.02;
/** Los tramos con voz son los que quedan a menos de 16 dB del nivel alto de la toma (como en ITU-T P.56). */
const ACTIVE_RATIO = 10 ** (-16 / 10);

/** Redondea lo que pasa de KNEE: continua, con pendiente 1 en el codo y sin superar CEILING. */
function limit(value: number): number {
  const size = Math.abs(value);
  if (size <= KNEE) return value;
  const room = CEILING - KNEE;
  return Math.sign(value) * (KNEE + room * Math.tanh((size - KNEE) / room));
}

/** Devuelve una copia del WAV con la voz a un nivel cómodo, o null si no hay nada que subir. */
export function voiceVolume(wav: Uint8Array): Uint8Array | null {
  if (wav.byteLength < 44) return null;
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const tag = (at: number) => String.fromCharCode(...wav.subarray(at, at + 4));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  let pcm16 = false;
  let channels = 1;
  let rate = 0;
  let start = 0;
  let size = 0;
  for (let at = 12; at + 8 <= wav.byteLength;) {
    const length = view.getUint32(at + 4, true);
    const body = at + 8;
    if (length > wav.byteLength - body) return null;
    if (tag(at) === 'fmt ' && length >= 16) {
      pcm16 = view.getUint16(body, true) === 1 && view.getUint16(body + 14, true) === 16;
      channels = Math.max(1, view.getUint16(body + 2, true));
      rate = view.getUint32(body + 4, true);
    }
    if (tag(at) === 'data') { start = body; size = length; }
    at = body + length + (length % 2);
  }
  if (!pcm16 || !rate || !start || size < 2 || size % 2) return null;

  const samples = size / 2;
  const frame = Math.max(1, Math.round(rate * FRAME_S) * channels);
  const powers: number[] = [];
  let energy = 0;
  let peak = 0;
  for (let first = 0; first < samples; first += frame) {
    const end = Math.min(samples, first + frame);
    let sum = 0;
    for (let i = first; i < end; i++) {
      const sample = view.getInt16(start + i * 2, true) / 32768;
      sum += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    energy += sum;
    // Un último tramo a medias no representa el nivel de nada.
    if (end - first === frame || !powers.length) powers.push(sum / (end - first));
  }
  // No convertir silencio digital o ruido ínfimo en un soplido fuerte.
  if (Math.sqrt(energy / samples) < 0.0005 || peak === 0) return null;

  // El nivel alto de la toma es su percentil 95, no su máximo: un golpe de 20 ms no cuenta como voz.
  const sorted = powers.slice().sort((a, b) => a - b);
  const high = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  let active = 0;
  let count = 0;
  for (const power of powers) {
    if (power < high * ACTIVE_RATIO) continue;
    // …y si lo hubo, pesa como un tramo de voz más, no como el más fuerte de la toma.
    active += Math.min(power, high);
    count++;
  }
  const voice = Math.sqrt(active / Math.max(1, count));
  if (!(voice > 0)) return null;
  const gain = Math.min(MAX_GAIN, VOICE_LEVEL / voice);
  if (gain < 1.1) return null;

  const out = new Uint8Array(wav);
  const result = new DataView(out.buffer);
  for (let at = start; at < start + size; at += 2) {
    result.setInt16(at, Math.round(limit((view.getInt16(at, true) / 32768) * gain) * 32767), true);
  }
  return out;
}
