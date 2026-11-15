import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

const SOURCES = {
  tap: require('../../assets/sfx/tap.wav'),
  pop: require('../../assets/sfx/pop.wav'),
  ok: require('../../assets/sfx/ok.wav'),
  combo: require('../../assets/sfx/combo.wav'),
  bad: require('../../assets/sfx/bad.wav'),
  flip: require('../../assets/sfx/flip.wav'),
  bell: require('../../assets/sfx/bell.wav'),
  stamp: require('../../assets/sfx/stamp.wav'),
  done: require('../../assets/sfx/done.wav'),
  whoosh: require('../../assets/sfx/whoosh.wav'),
  coin: require('../../assets/sfx/coin.wav'),
  n1: require('../../assets/sfx/n1.wav'),
  n2: require('../../assets/sfx/n2.wav'),
  n3: require('../../assets/sfx/n3.wav'),
  n4: require('../../assets/sfx/n4.wav'),
  n5: require('../../assets/sfx/n5.wav'),
  n6: require('../../assets/sfx/n6.wav'),
  n7: require('../../assets/sfx/n7.wav'),
  n8: require('../../assets/sfx/n8.wav'),
  sparkle: require('../../assets/sfx/sparkle.wav'),
  levelup: require('../../assets/sfx/levelup.wav'),
  tick: require('../../assets/sfx/tick.wav'),
  go: require('../../assets/sfx/go.wav'),
  boom: require('../../assets/sfx/boom.wav'),
  swish: require('../../assets/sfx/swish.wav'),
  fanfare: require('../../assets/sfx/fanfare.wav'),
  plip: require('../../assets/sfx/plip.wav'),
} as const;

export type Sfx = keyof typeof SOURCES;
type ResultSound = 'ok' | 'bad';

const players: Partial<Record<Sfx, AudioPlayer>> = {};
let soundOn = true;
let hapticsOn = true;
let voiceRate = 0.85;
let initialized = false;
let quietEffects = 0;

/** El micro y la comparación necesitan la sesión libre de efectos, incluso los ya iniciados. */
export function suspendSoundEffects(): () => void {
  quietEffects += 1;
  pauseResult(false);
  for (const player of Object.values(players)) {
    try { player?.pause(); } catch {}
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    quietEffects -= 1;
  };
}

// iOS no escala la duración de forma lineal: multiplicar por 0.6 apenas pausaba la voz.
// Este ajuste se calibra con palabras thai; los otros motores conservan su factor de lectura lenta.
const SLOW_VOICE_FACTOR = Platform.OS === 'ios' ? 0.1 : 0.6;

export function configureAudio(opts: { sound: boolean; haptics: boolean; voiceRate: number }) {
  soundOn = opts.sound;
  hapticsOn = opts.haptics;
  voiceRate = opts.voiceRate;
  if (!soundOn) {
    pauseResult(false);
    for (const player of Object.values(players)) {
      try { player?.pause(); } catch {}
    }
  }
}

// ——— La voz thai ———
//
// Todo el thai que suena en la app lo dice la voz del sistema (expo-speech). Lo que hace de verdad el paquete
// instalado (expo-speech 58, leído en node_modules/expo-speech) y por qué elegimos así:
//
// · iOS (ios/SpeechModule.swift): `language` → AVSpeechSynthesisVoice(language:), que da `nil` si no hay voz de
//   ese idioma (y entonces lee la voz por defecto del sistema, que no sabe thai). `voice` → la voz con ese
//   identificador; si ya no existe, la llamada lanza y no llega ningún aviso. La calidad «premium» se anuncia como
//   "Default" (solo `.enhanced` da "Enhanced"), así que se reconoce por el identificador (…voice.premium.th-TH…).
// · Android (android/…/SpeechModule.kt): `language` pasa por Locale.Builder().setLanguage(), que SOLO admite el
//   código de idioma: con "th-TH" lanza IllformedLocaleException y el módulo se queda con el idioma del teléfono.
//   Hay que pasar "th". Después pone la voz cuyo nombre sea `voice`, si existe. "Enhanced" es cualquier voz con
//   calidad por encima de la normal, y eso incluye las de red de Google (…-network), mudas sin conexión: el módulo
//   no dice cuáles necesitan red, así que se descartan por el nombre y se prefieren las locales (…-local) o la del
//   idioma (th-TH-language). Si solo hay voces de red no se fija ninguna: con el idioma "th" el motor elige.
// · Web (src/ExponentSpeech.web.ts): `language` → utterance.lang; `voice` → la voz con ese voiceURI y, si no la
//   encuentra, ¡la primera de la lista! (por eso solo se pasa una que acabamos de ver). La lista puede tardar o no
//   llegar nunca: la promesa del paquete se queda esperando `voiceschanged`, así que aquí se le pone un límite.
//
// Si no hay ninguna voz thai, la app entera se queda muda: `thaiVoiceStatus()` / `useThaiVoiceStatus()` lo dicen
// y `VoiceWarning` (src/components) explica cómo instalar una.

export type ThaiVoiceStatus = 'ok' | 'missing' | 'unknown';

/** Idioma que entiende cada plataforma (ver arriba: Android solo admite el código de idioma). */
const THAI_LANG = Platform.OS === 'android' ? 'th' : 'th-TH';
const isThai = (lang?: string) => /^th(?:[-_]|$)/i.test(lang ?? '');
const VOICES_TIMEOUT = 4000;

let thaiVoice: string | undefined;
/** Lo que dice la lista de voces del sistema. */
let listed: ThaiVoiceStatus = 'unknown';
/** Android: la voz está en la lista pero falla al hablar (datos sin descargar y sin red). */
let failing = false;
let failures = 0;
let checking: Promise<ThaiVoiceStatus> | null = null;
let watching = false;
const statusListeners = new Set<() => void>();

const currentStatus = (): ThaiVoiceStatus => (listed === 'ok' && failing ? 'missing' : listed);

function setVoiceState(next: { listed?: ThaiVoiceStatus; failing?: boolean }) {
  const before = currentStatus();
  if (next.listed !== undefined) listed = next.listed;
  if (next.failing !== undefined) failing = next.failing;
  if (currentStatus() !== before) statusListeners.forEach((fn) => fn());
}

type AnyVoice = Speech.Voice & Partial<Pick<Speech.WebVoice, 'localService'>>;

/** Cuánto conviene una voz thai en esta plataforma; negativo = mejor no fijarla. */
function voiceScore(v: AnyVoice): number {
  const id = `${v.identifier ?? ''} ${v.name ?? ''}`.toLowerCase();
  const enhanced = String(v.quality).toLowerCase() === 'enhanced';
  if (Platform.OS === 'android') {
    if (id.includes('network')) return -1;
    return (id.includes('local') ? 3 : /-language\b/.test(id) ? 2 : 1) + (enhanced ? 0.5 : 0);
  }
  if (Platform.OS === 'ios') return id.includes('premium') ? 3 : enhanced || id.includes('enhanced') ? 2 : 1;
  // web: las voces «naturales» (Edge) suenan mucho mejor; a igualdad, una del sistema (funciona sin red)
  return 1 + (/natural|neural|premium|enhanced/.test(id) ? 2 : 0) + (v.localService ? 1 : 0);
}

const sleep = (ms: number) => new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));

async function lookForThaiVoice(): Promise<ThaiVoiceStatus> {
  const web = Platform.OS === 'web';
  // navegador sin síntesis de voz: no hay nada que esperar
  if (web && (typeof window === 'undefined' || !('speechSynthesis' in window))) {
    thaiVoice = undefined;
    setVoiceState({ listed: 'missing' });
    return currentStatus();
  }
  let voices: AnyVoice[] | null = null;
  try {
    voices = await Promise.race([Speech.getAvailableVoicesAsync() as Promise<AnyVoice[]>, sleep(VOICES_TIMEOUT)]);
  } catch {
    voices = null;
  }
  if (!voices) {
    // en la web, un navegador que no da ninguna voz en varios segundos es que no tiene (si llegan después,
    // `voiceschanged` vuelve a mirar); en el móvil no se sabe: mejor callar que dar un aviso falso
    thaiVoice = undefined;
    setVoiceState({ listed: web ? 'missing' : 'unknown' });
    return currentStatus();
  }
  const thai = voices
    .filter((v) => isThai(v.language))
    .map((v) => ({ v, s: voiceScore(v) }))
    .sort((a, b) => b.s - a.s);
  thaiVoice = thai.length && thai[0].s > 0 ? thai[0].v.identifier : undefined;
  failures = 0;
  setVoiceState({ listed: thai.length ? 'ok' : 'missing', failing: false });
  return currentStatus();
}

/** Vuelve a mirar las voces del sistema (al volver de Ajustes tras instalar una, por ejemplo). */
export function refreshThaiVoice(): Promise<ThaiVoiceStatus> {
  const run = lookForThaiVoice().finally(() => {
    if (checking === run) checking = null;
  });
  checking = run;
  return run;
}

/**
 * ¿Hay voz thai? 'ok' = sí · 'missing' = no hay (o no consigue hablar): la app está muda · 'unknown' = el
 * sistema aún no ha contestado. La primera llamada mira las voces; las siguientes devuelven lo ya sabido.
 */
export function thaiVoiceStatus(): Promise<ThaiVoiceStatus> {
  if (checking) return checking;
  return listed === 'unknown' ? refreshThaiVoice() : Promise.resolve(currentStatus());
}

const subscribeStatus = (fn: () => void) => {
  statusListeners.add(fn);
  return () => {
    statusListeners.delete(fn);
  };
};
const serverStatus = (): ThaiVoiceStatus => 'unknown';

/** El estado de la voz thai, al día: cambia solo si se instala (o se pierde) una voz. */
export function useThaiVoiceStatus(): ThaiVoiceStatus {
  const status = useSyncExternalStore(subscribeStatus, currentStatus, serverStatus);
  useEffect(() => {
    thaiVoiceStatus().catch(() => {});
  }, []);
  return status;
}

/** Al volver a la app (o cuando el navegador carga sus voces) se vuelve a mirar: puede haber una voz nueva. */
function watchVoices() {
  if (watching) return;
  watching = true;
  try {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshThaiVoice().catch(() => {});
    });
  } catch {}
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.speechSynthesis?.addEventListener?.('voiceschanged', () => void refreshThaiVoice().catch(() => {}));
  } catch {}
}

export async function initAudio() {
  if (initialized) return;
  initialized = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {}
  // Cargados antes de la primera respuesta: el primer soplido también debe oírse.
  try {
    playerFor('ok');
    playerFor('bad');
  } catch {}
  watchVoices();
  await refreshThaiVoice().catch(() => {});
}

export function sfx(name: Sfx) {
  if (!soundOn || quietEffects) return;
  if (name === 'ok' || name === 'bad') {
    pauseResult(false);
    pendingResult = name;
    flushResult();
    return;
  }
  try {
    const p = playerFor(name);
    p.volume = finishSpeech ? 0.12 : 1;
    p.seekTo(0);
    p.play();
  } catch {}
}

function playerFor(name: Sfx) {
  return players[name] ??= createAudioPlayer(SOURCES[name], { updateInterval: 50 });
}

function mixEffects() {
  for (const [name, player] of Object.entries(players)) {
    if (name === 'ok' || name === 'bad') continue;
    try { if (player) player.volume = finishSpeech ? 0.12 : 1; } catch {}
  }
}

let pendingResult: ResultSound | null = null;
let activeResult: { name: ResultSound; player: AudioPlayer; started: boolean } | null = null;
let resultTimer: ReturnType<typeof setTimeout> | undefined;
let resultSeq = 0;

/** La pronunciación manda: se pausa el gesto de Noi y se guarda para después de la frase. */
function pauseResult(resume: boolean) {
  resultSeq += 1;
  clearTimeout(resultTimer);
  resultTimer = undefined;
  if (!resume) pendingResult = null;
  else if (activeResult && (!activeResult.started || activeResult.player.playing)) pendingResult ??= activeResult.name;
  activeResult = null;
  for (const name of ['ok', 'bad'] as const) {
    try { players[name]?.pause(); } catch {}
  }
}

function loaded(player: AudioPlayer): Promise<void> {
  if (player.isLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      sub.remove();
      reject(new Error('No se ha cargado el sonido de Noi'));
    }, 3000);
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.isLoaded) return;
      clearTimeout(timeout);
      sub.remove();
      resolve();
    });
  });
}

function flushResult() {
  if (!soundOn || quietEffects || finishSpeech || !pendingResult) return;
  clearTimeout(resultTimer);
  // Deja pasar la llamada a say() del mismo gesto y una pequeña separación después del thai.
  resultTimer = setTimeout(() => {
    resultTimer = undefined;
    if (!soundOn || quietEffects || finishSpeech || !pendingResult) return;
    const name = pendingResult;
    const seq = ++resultSeq;
    const play = async () => {
      const player = playerFor(name);
      const active = { name, player, started: false };
      activeResult = active;
      await loaded(player);
      if (seq !== resultSeq) return;
      await player.seekTo(0);
      if (seq !== resultSeq || finishSpeech || !soundOn) return;
      player.volume = 0.8;
      pendingResult = null;
      active.started = true;
      player.play();
    };
    play().catch(() => {
      if (seq !== resultSeq) return;
      activeResult = null;
      pendingResult = null;
    });
  }, 80);
}

/** Lo que tardaría en decirse (ms), a ojo: solo para avisar del final cuando no hay voz que lo diga. */
const guessMs = (th: string, slow?: boolean) => Math.min(6000, 350 + th.replace(/[^\u0E00-\u0E7F]/g, '').length * 110) * (slow ? 1.6 : 1);

/** Sin voz thai: la frase «muda» en curso, para poder cortarla igual que a una de verdad. */
let mute: { cut: () => void } | null = null;
const cutMute = () => {
  const m = mute;
  mute = null;
  m?.cut();
};

let speechSeq = 0;
let finishSpeech: (() => void) | null = null;
let stopping = Promise.resolve();

// La cancelación nativa es asíncrona. No se puede lanzar otra frase hasta que haya terminado:
// un stop pendiente podría borrar la frase nueva. También se ordenan los toques rápidos.
const hush = () => {
  stopping = stopping.then(() => Speech.stop()).catch(() => {});
  return stopping;
};

/**
 * Pronuncia thai con la voz del sistema. `slow` = pronunciación pausada para repetir. `onDone` llega una sola vez:
 * al acabar, al cortarla otra frase o si la voz falla. Sin voz thai no se intenta (otra voz leería cualquier
 * cosa): se avisa del inicio y del final como si hubiera sonado, para que el juego siga.
 */
export function say(th: string, opts: { slow?: boolean; onDone?: () => void; onStart?: () => void } = {}) {
  const id = ++speechSeq;
  const previous = finishSpeech;
  let settled = false;
  const done = () => {
    if (settled) return;
    settled = true;
    if (finishSpeech === done) finishSpeech = null;
    opts.onDone?.();
    mixEffects();
    flushResult();
  };
  finishSpeech = done;
  mixEffects();
  pauseResult(true);
  const stopped = hush();
  cutMute();
  previous?.();

  const speak = async () => {
    await stopped;
    if (id !== speechSeq) return;
    // La primera frase también espera a conocer la voz: no debe usar por accidente la del teléfono.
    const status = await thaiVoiceStatus();
    if (id !== speechSeq) return;
    const start = () => {
      if (!settled && id === speechSeq) opts.onStart?.();
    };
    if (status === 'missing') {
      const starts = setTimeout(start, 60);
      const ends = setTimeout(() => {
        if (mute === me) mute = null;
        done();
      }, 60 + guessMs(th, opts.slow));
      const me = {
        cut: () => {
          clearTimeout(starts);
          clearTimeout(ends);
          done();
        },
      };
      mute = me;
      return;
    }
    Speech.speak(th, {
      language: THAI_LANG,
      voice: thaiVoice,
      rate: opts.slow ? voiceRate * SLOW_VOICE_FACTOR : voiceRate,
      pitch: 1.05,
      // expo-audio desactiva su sesión al acabar un efecto. La síntesis debe gestionar la suya:
      // compartirla dejaba a Noi muda después del primer sonido, tanto al repetir como en los juegos.
      ...(Platform.OS === 'ios' ? { useApplicationAudioSession: false } : {}),
      onStart: start,
      onDone: () => {
        if (settled) return;
        failures = 0;
        if (failing) setVoiceState({ failing: false });
        done();
      },
      onStopped: done,
      onError: () => {
        if (settled) return;
        // Android avisa cuando la voz no puede hablar (web también al cortar una frase: no cuenta).
        if (Platform.OS === 'android' && ++failures >= 2) setVoiceState({ failing: true });
        done();
      },
    });
  };
  speak().catch(() => {
    if (id === speechSeq) {
      done();
    }
  });
}

export const stopSpeech = () => {
  speechSeq += 1;
  const previous = finishSpeech;
  finishSpeech = null;
  // Al salir de la pantalla no se arrastran reacciones pendientes al siguiente ejercicio.
  pauseResult(false);
  const stopped = hush();
  cutMute();
  previous?.();
  return stopped;
};

const canBuzz = () => hapticsOn && Platform.OS !== 'web';

/** Sonido + tacto para cada momento del juego. */
export const fx = {
  tap() {
    sfx('tap');
    if (canBuzz()) Haptics.selectionAsync().catch(() => {});
  },
  pop() {
    sfx('pop');
    if (canBuzz()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Acierto: barrito de Noi con notas ascendentes. La racha sigue contando en cada juego. */
  ok(_combo = 0) {
    sfx('ok');
    if (canBuzz()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** Brillo de campanillas: acierto perfecto, premio, algo mágico. */
  sparkle() {
    sfx('sparkle');
  },
  /** Subida de nivel o de velocidad. */
  levelup() {
    sfx('levelup');
    if (canBuzz()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** Tic de cuenta atrás o de reloj. */
  tick() {
    sfx('tick');
    if (canBuzz()) Haptics.selectionAsync().catch(() => {});
  },
  /** ¡Ya! Empieza la partida. */
  go() {
    sfx('go');
    if (canBuzz()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  /** Golpe grave: explosión de fuegos, algo que cae al suelo. */
  boom() {
    sfx('boom');
    if (canBuzz()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  /** Algo que pasa volando rápido. */
  swish() {
    sfx('swish');
  },
  /** Récord o gran final. */
  fanfare() {
    sfx('fanfare');
    if (canBuzz()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** Gota de agua. */
  plip() {
    sfx('plip');
    if (canBuzz()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Fallo: barrito más grave y notas descendentes, sin un aviso estridente. */
  bad() {
    sfx('bad');
    if (canBuzz()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  },
  flip() {
    sfx('flip');
  },
  coin() {
    sfx('coin');
    if (canBuzz()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  bell() {
    sfx('bell');
  },
  whoosh() {
    sfx('whoosh');
  },
  stamp() {
    sfx('stamp');
    if (canBuzz()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  done() {
    sfx('done');
    if (canBuzz()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
