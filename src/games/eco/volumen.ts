/** Ajusta solo la amplitud del WAV de escucha. El análisis del tono conserva las muestras originales. */
export function voiceVolume(wav: Uint8Array): Uint8Array | null {
  if (wav.byteLength < 44) return null;
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const tag = (at: number) => String.fromCharCode(...wav.subarray(at, at + 4));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  let pcm16 = false;
  let start = 0;
  let size = 0;
  for (let at = 12; at + 8 <= wav.byteLength;) {
    const length = view.getUint32(at + 4, true);
    const body = at + 8;
    if (length > wav.byteLength - body) return null;
    if (tag(at) === 'fmt ' && length >= 16) {
      pcm16 = view.getUint16(body, true) === 1 && view.getUint16(body + 14, true) === 16;
    }
    if (tag(at) === 'data') { start = body; size = length; }
    at = body + length + (length % 2);
  }
  if (!pcm16 || !start || size < 2 || size % 2) return null;
  let energy = 0;
  let peak = 0;
  for (let at = start; at < start + size; at += 2) {
    const sample = view.getInt16(at, true) / 32768;
    energy += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  const rms = Math.sqrt(energy / (size / 2));
  // No convertir silencio digital o ruido ínfimo en un soplido fuerte.
  if (rms < 0.0005 || peak === 0) return null;
  // Nivel de voz cómodo, con techo de pico para conservar la onda sin recortarla.
  const gain = Math.min(32, 0.12 / rms, 0.9 / peak);
  if (gain < 1.1) return null;
  const out = new Uint8Array(wav);
  const result = new DataView(out.buffer);
  for (let at = start; at < start + size; at += 2) result.setInt16(at, Math.round(view.getInt16(at, true) * gain), true);
  return out;
}
