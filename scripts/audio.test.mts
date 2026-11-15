import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test, type TestContext } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/lib/audio.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

type Playback = {
  text: string;
  options: {
    voice?: string;
    language?: string;
    rate: number;
    useApplicationAudioSession?: boolean;
    onStart: () => void;
    onDone: () => void;
    onStopped: () => void;
    onError: () => void;
  };
};

// Se ejecuta el módulo real con los puentes nativos controlados: permite reproducir un stop lento,
// eventos atrasados de iOS y la carga de voces sin depender de un simulador para esas carreras.
function loadAudio(t: TestContext, platform = 'ios') {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const playbacks: Playback[] = [];
  const voices = [{ identifier: 'kanya', name: 'Kanya', language: 'th-TH', quality: 'Default' }];
  const speech = {
    getAvailableVoicesAsync: async () => voices,
    stop: async () => {},
    speak: (text: string, options: Playback['options']) => { playbacks.push({ text, options }); },
  };
  const effects: string[] = [];
  const players = new Map<string, {
    playing: boolean; isLoaded: boolean; volume: number;
    seekTo: () => Promise<void>; play: () => void; pause: () => void;
  }>();
  const createAudioPlayer = (source: string) => {
    const player = {
      playing: false, isLoaded: true, volume: 1,
      seekTo: async () => {},
      play: () => { player.playing = true; effects.push(source.split('/').at(-1)!); },
      pause: () => { player.playing = false; },
    };
    players.set(source.split('/').at(-1)!, player);
    return player;
  };
  const modules: Record<string, unknown> = {
    'expo-speech': speech,
    'expo-audio': { createAudioPlayer, setAudioModeAsync: async () => {} },
    'expo-haptics': {
      selectionAsync: async () => {}, notificationAsync: async () => {}, impactAsync: async () => {},
      NotificationFeedbackType: { Success: 'success' }, ImpactFeedbackStyle: { Soft: 'soft' },
    },
    react: {},
    'react-native': { Platform: { OS: platform }, AppState: { addEventListener: () => {} } },
  };
  const exports = {} as {
    initAudio: () => Promise<void>;
    say: (text: string, opts?: { slow?: boolean; onDone?: () => void; onStart?: () => void }) => void;
    stopSpeech: () => void;
    suspendSoundEffects: () => () => void;
    sfx: (name: string) => void;
    fx: { ok: (combo?: number) => void; bad: () => void };
    configureAudio: (opts: { sound: boolean; haptics: boolean; voiceRate: number }) => void;
  };
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      if (name.endsWith('.wav')) return name;
      assert.ok(name in modules, `Módulo sin doble de pruebas: ${name}`);
      return modules[name];
    },
    setTimeout,
    clearTimeout,
  });
  return { audio: exports, speech, playbacks, voices, effects, players };
}

test('grabar o comparar silencia todos los efectos y no recupera un sonido antiguo al terminar', async (t) => {
  const { audio, effects, players } = loadAudio(t);
  await audio.initAudio();
  audio.sfx('tap');
  const recording = audio.suspendSoundEffects();
  assert.equal(players.get('tap.wav')!.playing, false);
  const comparing = audio.suspendSoundEffects();
  audio.fx.ok(1);
  audio.sfx('pop');
  t.mock.timers.tick(1000);
  await flush();
  assert.deepEqual(effects, ['tap.wav']);
  recording();
  recording();
  audio.sfx('pop');
  assert.deepEqual(effects, ['tap.wav']);
  comparing();
  t.mock.timers.tick(1000);
  await flush();
  assert.deepEqual(effects, ['tap.wav']);
  audio.sfx('pop');
  assert.deepEqual(effects, ['tap.wav', 'pop.wav']);
});

test('iOS: saludar y repetir, a velocidad normal y lenta, usa una sesión independiente de los efectos', async (t) => {
  const { audio, playbacks } = loadAudio(t);
  await audio.initAudio();
  for (const [text, slow] of [['สวัสดี', false], ['ขอบคุณครับ', false], ['สวัสดี', true]] as const) {
    audio.sfx('tap');
    audio.say(text, { slow });
    await flush();
    const playback = playbacks.at(-1)!;
    assert.equal(playback.text, text);
    assert.equal(playback.options.useApplicationAudioSession, false);
    assert.equal(playback.options.voice, 'kanya');
    assert.equal(playback.options.rate, slow ? 0.085 : 0.85);
    playback.options.onDone();
  }
  assert.equal(playbacks.length, 3);
});

test('espera a que termine la cancelación nativa antes de repetir la frase', async (t) => {
  const { audio, speech, playbacks } = loadAudio(t);
  await audio.initAudio();
  const stop = deferred<void>();
  speech.stop = () => stop.promise;
  audio.say('สวัสดี');
  await flush();
  assert.equal(playbacks.length, 0);
  stop.resolve();
  await flush();
  assert.equal(playbacks.length, 1);
});

test('varios toques rápidos reproducen solo la última petición y completan cada anterior una vez', async (t) => {
  const { audio, speech, playbacks } = loadAudio(t);
  await audio.initAudio();
  const stop = deferred<void>();
  speech.stop = () => stop.promise;
  let cancelled = 0;
  audio.say('ครับ', { onDone: () => { cancelled += 1; } });
  audio.say('ค่ะ', { onDone: () => { cancelled += 1; } });
  audio.say('สวัสดี', { slow: true });
  await flush();
  assert.equal(playbacks.length, 0);
  assert.equal(cancelled, 2);
  stop.resolve();
  await flush();
  assert.deepEqual(playbacks.map((p) => p.text), ['สวัสดี']);
});

test('salir de una pantalla cancela la reproducción pendiente y sus eventos tardíos', async (t) => {
  const { audio, speech, playbacks } = loadAudio(t);
  await audio.initAudio();
  let started = 0;
  let completed = 0;
  audio.say('สวัสดี', { onStart: () => { started += 1; }, onDone: () => { completed += 1; } });
  await flush();
  const old = playbacks[0];
  audio.stopSpeech();
  old.options.onStart();
  old.options.onStopped();
  old.options.onDone();
  assert.equal(started, 0);
  assert.equal(completed, 1);

  const stop = deferred<void>();
  speech.stop = () => stop.promise;
  audio.say('ขอบคุณครับ', { onDone: () => { completed += 1; } });
  await flush();
  audio.stopSpeech();
  stop.resolve();
  await flush();
  assert.equal(playbacks.length, 1);
  assert.equal(completed, 2);
});

test('la primera frase espera a la voz tailandesa y puede cancelarse mientras se carga', async (t) => {
  const { audio, speech, playbacks, voices } = loadAudio(t);
  const loading = deferred<typeof voices>();
  speech.getAvailableVoicesAsync = () => loading.promise;
  const initialized = audio.initAudio();
  audio.say('สวัสดี');
  await flush();
  assert.equal(playbacks.length, 0);
  audio.stopSpeech();
  loading.resolve(voices);
  await initialized;
  await flush();
  assert.equal(playbacks.length, 0);
  audio.say('สวัสดี');
  await flush();
  assert.equal(playbacks[0].options.voice, 'kanya');
});

test('sin voz tailandesa, los callbacks permiten continuar y repetir sin quedar bloqueado', async (t) => {
  const { audio, playbacks, voices } = loadAudio(t);
  voices.length = 0;
  await audio.initAudio();
  let completed = 0;
  audio.say('สวัสดี', { onDone: () => { completed += 1; } });
  await flush();
  audio.say('ขอบคุณค่ะ', { onDone: () => { completed += 1; } });
  await flush();
  t.mock.timers.tick(10000);
  assert.equal(playbacks.length, 0);
  assert.equal(completed, 2);
});

test('Android conserva el idioma compatible con su motor de voz', async (t) => {
  const { audio, playbacks } = loadAudio(t, 'android');
  await audio.initAudio();
  audio.say('สวัสดี');
  await flush();
  assert.equal(playbacks[0].options.language, 'th');
  assert.equal(playbacks[0].options.useApplicationAudioSession, undefined);
});

test('acierto y fallo reproducen los dos gestos de Noi, también con racha, sin el antiguo arpegio', async (t) => {
  const { audio, effects } = loadAudio(t);
  await audio.initAudio();
  audio.fx.ok(5);
  t.mock.timers.tick(80);
  await flush();
  audio.fx.bad();
  t.mock.timers.tick(80);
  await flush();
  assert.deepEqual(effects, ['ok.wav', 'bad.wav']);
});

test('si se responde durante la frase thai, Noi espera a que termine antes de reaccionar', async (t) => {
  const { audio, playbacks, effects } = loadAudio(t);
  await audio.initAudio();
  audio.say('สวัสดี');
  await flush();
  playbacks[0].options.onStart();
  audio.fx.ok();
  t.mock.timers.tick(2000);
  await flush();
  assert.deepEqual(effects, []);
  playbacks[0].options.onDone();
  t.mock.timers.tick(79);
  await flush();
  assert.deepEqual(effects, []);
  t.mock.timers.tick(1);
  await flush();
  assert.deepEqual(effects, ['ok.wav']);
});

test('la pronunciación del mismo toque tiene prioridad sobre el sonido de acierto', async (t) => {
  const { audio, playbacks, effects } = loadAudio(t);
  await audio.initAudio();
  audio.fx.ok();
  audio.say('ขอบคุณค่ะ');
  t.mock.timers.tick(100);
  await flush();
  assert.deepEqual(effects, []);
  assert.equal(playbacks[0].text, 'ขอบคุณค่ะ');
  playbacks[0].options.onDone();
  t.mock.timers.tick(80);
  await flush();
  assert.deepEqual(effects, ['ok.wav']);
});

test('repetir thai pausa una reacción que ya sonaba y la recupera después de la palabra', async (t) => {
  const { audio, playbacks, effects, players } = loadAudio(t);
  await audio.initAudio();
  audio.fx.bad();
  t.mock.timers.tick(80);
  await flush();
  assert.equal(players.get('bad.wav')!.playing, true);
  audio.say('สวัสดี', { slow: true });
  assert.equal(players.get('bad.wav')!.playing, false);
  await flush();
  playbacks[0].options.onDone();
  t.mock.timers.tick(80);
  await flush();
  assert.deepEqual(effects, ['bad.wav', 'bad.wav']);
});

test('un seek tardío del efecto no puede arrancar encima de la pronunciación', async (t) => {
  const { audio, playbacks, effects, players } = loadAudio(t);
  await audio.initAudio();
  const seek = deferred<void>();
  players.get('ok.wav')!.seekTo = () => seek.promise;
  audio.fx.ok();
  t.mock.timers.tick(80);
  await flush();
  audio.say('สวัสดี');
  await flush();
  seek.resolve();
  await flush();
  assert.deepEqual(effects, []);
  playbacks[0].options.onDone();
  t.mock.timers.tick(80);
  await flush();
  assert.deepEqual(effects, ['ok.wav']);
});

test('no se acumulan reacciones y salir o desactivar sonidos cancela las pendientes', async (t) => {
  const { audio, playbacks, effects, players } = loadAudio(t);
  await audio.initAudio();
  audio.say('สวัสดี');
  await flush();
  audio.fx.ok();
  audio.fx.bad();
  playbacks[0].options.onDone();
  t.mock.timers.tick(80);
  await flush();
  assert.deepEqual(effects, ['bad.wav']);
  audio.configureAudio({ sound: false, haptics: false, voiceRate: 0.85 });
  assert.equal(players.get('bad.wav')!.playing, false);
  audio.fx.ok();
  t.mock.timers.tick(1000);
  await flush();
  assert.deepEqual(effects, ['bad.wav']);
  audio.configureAudio({ sound: true, haptics: false, voiceRate: 0.85 });
  audio.fx.ok();
  audio.stopSpeech();
  t.mock.timers.tick(1000);
  await flush();
  assert.deepEqual(effects, ['bad.wav']);
});

test('los WAV incluyen el bloque data legible por iOS y contienen muestras audibles', () => {
  const dir = new URL('../assets/sfx/', import.meta.url);
  for (const name of readdirSync(dir).filter((name) => name.endsWith('.wav'))) {
    const wav = readFileSync(new URL(name, dir));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF', name);
    assert.equal(wav.toString('ascii', 8, 16), 'WAVEfmt ', name);
    assert.equal(wav.toString('ascii', 36, 40), 'data', name);
    assert.equal(wav.readUInt32LE(40), wav.length - 44, name);
    assert.ok(wav.subarray(44).some((byte) => byte !== 0), name);
  }
});

test('los demás efectos bajan de volumen mientras se pronuncia thai', async (t) => {
  const { audio, playbacks, players } = loadAudio(t);
  await audio.initAudio();
  audio.sfx('sparkle');
  audio.say('สวัสดี');
  assert.equal(players.get('sparkle.wav')!.volume, 0.12);
  await flush();
  audio.sfx('tap');
  assert.equal(players.get('tap.wav')!.volume, 0.12);
  playbacks[0].options.onDone();
  assert.equal(players.get('tap.wav')!.volume, 1);
});
