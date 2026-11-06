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
} as const;

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
  ok(combo = 0) {
    sfx(combo >= 3 ? 'combo' : 'ok');
    if (canBuzz()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
