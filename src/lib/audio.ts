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

/** Notas de la cadena de aciertos, de grave a agudo (pentatónica). */
const CHAIN: Sfx[] = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];

export type Sfx = keyof typeof SOURCES;

const players: Partial<Record<Sfx, AudioPlayer>> = {};
let soundOn = true;
let hapticsOn = true;
let voiceRate = 0.85;
let initialized = false;

export function configureAudio(opts: { sound: boolean; haptics: boolean; voiceRate: number }) {
  soundOn = opts.sound;
  hapticsOn = opts.haptics;
  voiceRate = opts.voiceRate;
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
  watchVoices();
  await refreshThaiVoice().catch(() => {});
}

export function sfx(name: Sfx) {
  if (!soundOn) return;
  try {
    const p = (players[name] ??= createAudioPlayer(SOURCES[name]));
    p.seekTo(0);
    p.play();
  } catch {}
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

const hush = () => {
  try {
    Speech.stop().catch(() => {});
  } catch {}
};

/**
 * Pronuncia thai con la voz del sistema. `slow` = 60 % de velocidad. `onDone` llega siempre y una sola vez:
 * al acabar, al cortarla otra frase o si la voz falla. Sin voz thai no se intenta (otra voz leería cualquier
 * cosa): se avisa del inicio y del final como si hubiera sonado, para que el juego siga.
 */
export function say(th: string, opts: { slow?: boolean; onDone?: () => void; onStart?: () => void } = {}) {
  let settled = false;
  const done = () => {
    if (settled) return;
    settled = true;
    opts.onDone?.();
  };
  cutMute();
  hush();
  if (listed === 'missing') {
    const starts = setTimeout(() => opts.onStart?.(), 60);
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
  try {
    Speech.speak(th, {
      language: THAI_LANG,
      voice: thaiVoice,
      rate: opts.slow ? voiceRate * 0.6 : voiceRate,
      pitch: 1.05,
      onStart: opts.onStart,
      onDone: () => {
        // ha sonado entera: la voz funciona
        failures = 0;
        if (failing) setVoiceState({ failing: false });
        done();
      },
      onStopped: done,
      onError: () => {
        // Android avisa aquí cuando la voz no puede hablar (en la web también llega al cortar una frase, y no cuenta)
        if (Platform.OS === 'android' && ++failures >= 2) setVoiceState({ failing: true });
        done();
      },
    });
  } catch {
    done();
  }
}

export const stopSpeech = () => {
  cutMute();
  hush();
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
  /** Acierto: cada acierto seguido sube una nota de la escala; cada 5 seguidos suena además el arpegio. */
  ok(combo = 0) {
    sfx(CHAIN[Math.max(0, Math.min(CHAIN.length - 1, combo - 1))]);
    if (combo >= 5 && combo % 5 === 0) sfx('combo');
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
