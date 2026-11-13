// Eco · el micrófono. Abre la grabación y devuelve cómo pararla; quien juega no ve nada de esto.
//
// Tres caminos, del mejor al más sencillo, y cada uno cae al siguiente si falla (nunca se rompe el juego):
// · iOS y Android: `AudioStream` de expo-audio (SDK 58), que entrega el PCM del micro en directo y a la vez lo
//   guarda en un WAV para volver a oírse. Comprobado en el código instalado: node_modules/expo-audio/src/
//   AudioStream.ts y AudioStream.types.ts, ios/AudioStream.swift, android/…/AudioStream.kt.
// · Web: ahí `useAudioStream` es un hueco vacío (src/AudioStream.web.ts devuelve `stream: null`), así que se usa
//   la Web Audio API: getUserMedia + AnalyserNode para el tono y MediaRecorder para volver a oírse.
// · Si nada de eso está: el grabador de siempre (`useAudioRecorder`), que solo sabe decir el volumen.
//
// Al parar o al salir se deja el audio del teléfono como estaba, pase lo que pase: en iOS, `AudioStream.start()`
// pone la sesión en «solo grabar» y, sin devolverla a «reproducir», Noi se quedaría muda.
import { AudioModule, requestRecordingPermissionsAsync, setAudioModeAsync, type AudioRecorder, type AudioStreamBuffer } from 'expo-audio';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { createTracker, isVoiced, pitchOfBlock, type Frame, type Profile } from './tono';

/** Una grabación terminada. */
export type Take = {
  /** el archivo para volver a oírla; null si no se pudo guardar */
  uri: string | null;
  ms: number;
  /** la melodía medida (solo donde se puede medir el tono) */
  frames: Frame[] | null;
  /** se oyó una voz de verdad (no un toque en silencio) */
  spoke: boolean;
};

export type Mic = {
  /** 'tono' = se mide la melodía de la voz · 'volumen' = solo cuánto suena */
  kind: 'tono' | 'volumen';
  stop: () => Promise<Take>;
  /** deja de grabar sin guardar nada (al salir del juego) */
  cancel: () => void;
};

export type MicOptions = {
  recorder: AudioRecorder;
  /** volumen 0–1, varias veces por segundo */
  onLevel: (v: number) => void;
  /** medidas nuevas de la melodía, según llegan (solo con `kind: 'tono'`) */
  onFrames?: (frames: Frame[]) => void;
};

/** Por qué no se pudo abrir el micro: no hay permiso, o no hay micro (o falla). En los dos casos se juega de oído. */
export type MicError = 'denegado' | 'fallo';

const TICK = 70;
const EMPTY: Take = { uri: null, ms: 0, frames: null, spoke: false };
/** Medidas con voz (de 12,5 ms) para dar por hecho que alguien habló. */
const SPOKE_FRAMES = 8;

/** Si un camino falla una vez en este aparato, no se vuelve a intentar en toda la sesión. */
let streamWorks: boolean | null = null;
let webWorks: boolean | null = null;
/** Grabaciones de la web (URL de Blob) pendientes de soltar. */
let blobs: string[] = [];
/** Grabaciones del teléfono (archivos de la caché) pendientes de borrar: cada intento deja un WAV de unos 100 kB. */
let files: string[] = [];
const keep = (uri: string | null) => {
  if (uri && !files.includes(uri)) files.push(uri);
  return uri;
};

type StreamClass = (typeof AudioModule)['AudioStream'];
/**
 * La clase nativa del flujo de PCM. Se mira en el módulo en vez de usar el hook `useAudioStream` para no romper el
 * juego donde no exista: en la web el módulo no se exporta, y un cliente nativo anterior al SDK 58 no la tiene.
 */
function streamClass(): StreamClass | undefined {
  const mod: { AudioStream?: StreamClass } | undefined = AudioModule;
  return mod?.AudioStream;
}

const levelOf = (rms: number) => Math.max(0, Math.min(1, (20 * Math.log10(Math.max(rms, 1e-6)) + 52) / 46));

/** La voz de quien aprende (su altura media y cuánto se mueve), aprendida de sus grabaciones mientras la app siga abierta. */
let voice: Profile | null = null;
export const knownVoice = () => voice;
export const rememberVoice = (p: Profile | null) => {
  voice = p;
};

/** Vuelve a dejar el audio para escuchar. */
export async function restoreAudio() {
  try {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  } catch {}
}

/** Suelta las grabaciones al salir del juego: las URL de Blob en la web y los archivos de la caché en el teléfono. */
export function releaseTakes() {
  if (Platform.OS !== 'web') {
    for (const uri of files) {
      try {
        const f = new File(uri);
        if (f.exists) f.delete();
      } catch {}
    }
    files = [];
    return;
  }
  for (const u of blobs) {
    try {
      URL.revokeObjectURL(u);
    } catch {}
  }
  blobs = [];
}

/** ¿Se podrá medir el tono en este aparato? (para saber qué dibujar antes de la primera grabación) */
export function canMeasurePitch(): boolean {
  if (Platform.OS === 'web') {
    if (webWorks === false || typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return !!navigator.mediaDevices?.getUserMedia && (typeof AudioContext !== 'undefined' || 'webkitAudioContext' in window);
  }
  return streamWorks !== false && !!streamClass();
}

/** Reparte las medidas nuevas y lleva la cuenta de si ahí hay una voz. */
function meter(o: MicOptions) {
  const frames: Frame[] = [];
  let peak = 0;
  let voiced = 0;
  let loud = 0;
  let top = 0;
  let last = 0;
  return {
    frames,
    add(fresh: Frame[]) {
      if (!fresh.length) return;
      for (const f of fresh) {
        frames.push(f);
        if (f.rms > peak) peak = f.rms;
        if (f.rms > top) top = f.rms;
        if (f.rms > 0) loud++;
        if (isVoiced(f, peak)) voiced++;
      }
      o.onFrames?.(fresh);
      // el volumen, al ritmo del grabador (unas 14 veces por segundo), lleguen las medidas como lleguen
      const now = Date.now();
      if (now - last < TICK - 6) return;
      last = now;
      o.onLevel(levelOf(top));
      top = 0;
    },
    spoke: () => voiced >= SPOKE_FRAMES,
    /** llegó señal de verdad (no ceros) */
    alive: () => loud > 0,
  };
}

// ——— iOS y Android: PCM en directo ———

async function openStream(o: MicOptions): Promise<Mic> {
  const Stream = streamClass();
  if (!Stream) throw new Error('sin AudioStream');
  // 16 bits: lo que todos los micros dan. En Android, 16 kHz (voz de sobra, archivos pequeños); en iOS, 48 kHz, que es
  // lo que ya usa el aparato: pedir otra cosa cambiaría la frecuencia preferida de toda la sesión de audio.
  const stream = new Stream({ sampleRate: Platform.OS === 'ios' ? 48000 : 16000, channels: 1, encoding: 'int16' });
  const m = meter(o);
  let tracker: ReturnType<typeof createTracker> | null = null;
  let rate = 0;
  let buffers = 0;
  let closed = false;
  const sub = stream.addListener('audioStreamBuffer', (b: AudioStreamBuffer) => {
    if (closed) return;
    buffers++;
    try {
      const fs = b.sampleRate || stream.sampleRate;
      if (!fs) return;
      if (!tracker || rate !== fs) {
        tracker = createTracker(fs);
        rate = fs;
      }
      let pcm: ArrayLike<number> = new Int16Array(b.data, 0, b.data.byteLength >> 1);
      const ch = Math.max(1, b.channels || 1);
      if (ch > 1) {
        // canales intercalados: basta el primero
        const mono = new Int16Array(Math.floor(pcm.length / ch));
        for (let i = 0; i < mono.length; i++) mono[i] = pcm[i * ch];
        pcm = mono;
      }
      m.add(tracker.push(pcm, 1 / 32768));
    } catch {}
  });
  const drop = async () => {
    try {
      stream.stop();
    } catch {}
    try {
      sub.remove();
    } catch {}
    try {
      stream.release();
    } catch {}
    await restoreAudio();
  };
  let uri: string | null = null;
  try {
    await stream.start();
  } catch (e) {
    closed = true;
    await drop();
    throw e;
  }
  try {
    uri = (await stream.startFileRecordingAsync({ format: 'wav' })).uri;
  } catch {
    // sin archivo se mide igual; solo no habrá con qué volver a oírse
  }
  const t0 = Date.now();
  return {
    kind: 'tono',
    async stop() {
      if (closed) return EMPTY;
      closed = true;
      let ms = Date.now() - t0;
      if (uri) {
        try {
          const r = await stream.stopFileRecordingAsync();
          uri = r.uri || uri;
          if (r.duration > 0) ms = Math.round(r.duration * 1000);
        } catch {}
      }
      await drop();
      // un flujo que no entrega nada no sirve: desde ahora, el grabador de siempre
      const works = buffers > 0;
      if (!works && ms > 700) streamWorks = false;
      else if (works) streamWorks = true;
      return { uri: keep(uri), ms, frames: works ? m.frames : null, spoke: m.spoke() };
    },
    cancel() {
      if (closed) return;
      closed = true;
      keep(uri);
      void drop();
    },
  };
}

// ——— Web: Web Audio API ———

type WebAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Devuelve el micro, por qué no hay micro, o null si este navegador no da para medir (se prueba el grabador). */
async function openWeb(o: MicOptions): Promise<Mic | MicError | null> {
  if (webWorks === false || typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  const Ctx = typeof AudioContext !== 'undefined' ? AudioContext : (window as WebAudioWindow).webkitAudioContext;
  if (!Ctx || !navigator.mediaDevices?.getUserMedia) return null;
  let media: MediaStream;
  try {
    media = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    return name === 'NotAllowedError' || name === 'SecurityError' ? 'denegado' : 'fallo';
  }
  const stopTracks = () => media.getTracks().forEach((t) => t.stop());
  let ctx: AudioContext;
  let source: MediaStreamAudioSourceNode;
  let analyser: AnalyserNode;
  try {
    ctx = new Ctx();
    if (ctx.state === 'suspended') await ctx.resume();
    source = ctx.createMediaStreamSource(media);
    analyser = ctx.createAnalyser();
    // una ventana de al menos 42 ms: caben dos periodos de la voz más grave
    let size = 2048;
    while (size < ctx.sampleRate * 0.042 && size < 32768) size *= 2;
    analyser.fftSize = size;
    analyser.smoothingTimeConstant = 0;
    source.connect(analyser);
    if (typeof analyser.getFloatTimeDomainData !== 'function') throw new Error('sin getFloatTimeDomainData');
  } catch {
    stopTracks();
    webWorks = false;
    return null;
  }
  const m = meter(o);
  const block = new Float32Array(analyser.fftSize);
  const lag = analyser.fftSize / 2 / ctx.sampleRate;
  const c0 = ctx.currentTime;
  const t0 = Date.now();
  let closed = false;
  const poll = setInterval(() => {
    try {
      analyser.getFloatTimeDomainData(block);
      const p = pitchOfBlock(block, ctx.sampleRate);
      m.add([{ t: Math.max(0, ctx.currentTime - c0 - lag), f0: p.f0, conf: p.conf, rms: p.rms }]);
    } catch {}
  }, 12);
  // lo grabado, para volver a oírse (si el navegador no tiene MediaRecorder, se mide igual)
  const chunks: Blob[] = [];
  let recorder: MediaRecorder | null = null;
  try {
    if (typeof MediaRecorder !== 'undefined') {
      recorder = new MediaRecorder(media);
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.start();
    }
  } catch {
    recorder = null;
  }
  const saved = (): Promise<string | null> =>
    new Promise((resolve) => {
      const r = recorder;
      if (!r || r.state === 'inactive') {
        resolve(null);
        return;
      }
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        try {
          resolve(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: r.mimeType || 'audio/webm' })) : null);
        } catch {
          resolve(null);
        }
      };
      r.onstop = end;
      setTimeout(end, 1200);
      try {
        r.stop();
      } catch {
        end();
      }
    });
  const drop = () => {
    clearInterval(poll);
    stopTracks();
    try {
      source.disconnect();
    } catch {}
    ctx.close().catch(() => {});
  };
  return {
    kind: 'tono',
    async stop() {
      if (closed) return EMPTY;
      closed = true;
      clearInterval(poll);
      const ms = Date.now() - t0;
      const uri = await saved();
      drop();
      releaseTakes();
      if (uri) blobs.push(uri);
      // un analizador que solo da ceros no está oyendo el micro: desde ahora, el grabador de siempre
      const works = m.alive();
      if (!works && ms > 700) webWorks = false;
      else if (works) webWorks = true;
      return { uri, ms, frames: works ? m.frames : null, spoke: m.spoke() };
    },
    cancel() {
      if (closed) return;
      closed = true;
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      } catch {}
      drop();
    },
  };
}

// ——— En cualquier parte: el grabador, que solo mide el volumen ———

async function openRecorder(o: MicOptions): Promise<Mic> {
  try {
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await o.recorder.prepareToRecordAsync();
    o.recorder.record();
  } catch (e) {
    await restoreAudio();
    throw e;
  }
  const t0 = Date.now();
  let closed = false;
  let loud = 0;
  let prev = 0;
  const poll = setInterval(() => {
    let db = -160;
    try {
      db = o.recorder.getStatus().metering ?? -160;
    } catch {}
    const raw = Math.max(0, Math.min(1, (db + 52) / 46));
    if (raw >= 0.35) loud++;
    prev = prev * 0.45 + raw * 0.55;
    o.onLevel(prev);
  }, TICK);
  return {
    kind: 'volumen',
    async stop() {
      if (closed) return EMPTY;
      closed = true;
      clearInterval(poll);
      const ms = Date.now() - t0;
      let uri: string | null = null;
      try {
        await o.recorder.stop();
        uri = o.recorder.uri ?? null;
      } catch {}
      await restoreAudio();
      return { uri: keep(uri), ms, frames: null, spoke: loud >= 3 };
    },
    cancel() {
      if (closed) return;
      closed = true;
      clearInterval(poll);
      void (async () => {
        try {
          await o.recorder.stop();
        } catch {}
        await restoreAudio();
      })();
    },
  };
}

/** Pide permiso y empieza a grabar por el mejor camino que haya. Devuelve el micro abierto, o por qué no se pudo. */
export async function openMic(o: MicOptions): Promise<Mic | MicError> {
  if (Platform.OS === 'web') {
    // getUserMedia ya pide el permiso: pedirlo antes por separado abriría el micro dos veces
    const web = await openWeb(o);
    if (web) return web;
  }
  try {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return 'denegado';
  } catch {
    return 'fallo';
  }
  if (Platform.OS !== 'web' && streamWorks !== false && streamClass()) {
    try {
      return await openStream(o);
    } catch {
      streamWorks = false;
    }
  }
  try {
    return await openRecorder(o);
  } catch {
    return 'fallo';
  }
}
