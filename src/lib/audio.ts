import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

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
let thaiVoice: string | undefined;
let initialized = false;

export function configureAudio(opts: { sound: boolean; haptics: boolean; voiceRate: number }) {
  soundOn = opts.sound;
  hapticsOn = opts.haptics;
  voiceRate = opts.voiceRate;
}

export async function initAudio() {
  if (initialized) return;
  initialized = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {}
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const th = voices.filter((v) => v.language?.toLowerCase().startsWith('th'));
    thaiVoice = (th.find((v) => String(v.quality).toLowerCase().includes('enhanced')) ?? th[0])?.identifier;
  } catch {}
}

export function sfx(name: Sfx) {
  if (!soundOn) return;
  try {
    const p = (players[name] ??= createAudioPlayer(SOURCES[name]));
    p.seekTo(0);
    p.play();
  } catch {}
}

/** Pronuncia thai con la voz del sistema (th-TH). `slow` = 60 % de velocidad. */
export function say(th: string, opts: { slow?: boolean; onDone?: () => void; onStart?: () => void } = {}) {
  try {
    Speech.stop();
    Speech.speak(th, {
      language: 'th-TH',
      voice: thaiVoice,
      rate: opts.slow ? voiceRate * 0.6 : voiceRate,
      pitch: 1.05,
      onStart: opts.onStart,
      onDone: opts.onDone,
      onStopped: opts.onDone,
      onError: () => opts.onDone?.(),
    });
  } catch {
    opts.onDone?.();
  }
}

export const stopSpeech = () => {
  try {
    Speech.stop();
  } catch {}
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
