import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test, type TestContext } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
function load(path: string, modules: Record<string, unknown>) {
  const source = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: any = {};
  runInNewContext(source, {
    exports, require: (id: string) => {
      assert.ok(id in modules, `Módulo sin doble: ${id}`);
      return modules[id];
    }, setTimeout, clearTimeout, setInterval, clearInterval, Date,
  });
  return exports;
}

test('Noi: una voz que tarda en empezar o acaba después de lo estimado no se corta ni lanza la comparación antes', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let native: any;
  const events: string[] = [];
  const stop = deferred<void>();
  const voice = load('games/tonos/voz.ts', {
    react: { useState: () => [false, () => {}], useRef: (current: unknown) => ({ current }), useEffect: () => {} },
    '@/lib/audio': { say: (_: string, o: unknown) => { native = o; }, stopSpeech: () => stop.promise },
    '@/lib/thai': { syllables: (s: string) => s.split('·') },
  }).useVoice();
  voice.speak('ขอบคุณ', { rom: 'khɔ̂ɔp·khun', slow: true, onStart: () => events.push('inicio'), onEnd: () => events.push('fin') });
  t.mock.timers.tick(5000);
  assert.deepEqual(events, []);
  native.onStart();
  t.mock.timers.tick(20000);
  assert.deepEqual(events, ['inicio']);
  native.onDone(); native.onDone();
  assert.deepEqual(events, ['inicio', 'fin']);
  assert.equal(voice.stop(), stop.promise, 'el micro puede esperar a que termine el stop nativo');
});

function playback(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const restored = deferred<void>();
  const sought = deferred<void>();
  const events: string[] = [];
  let listener: ((status: any) => void) | undefined;
  let config: any;
  const player = {
    isLoaded: false, duration: 2.5, volume: 0, muted: true, loop: true,
    addListener: (_: string, cb: typeof listener) => { listener = cb; return { remove: () => events.push('unlisten') }; },
    seekTo: (at: number) => { events.push(`seek:${at}`); return sought.promise; },
    play: () => events.push('play'), pause: () => events.push('pause'), remove: () => events.push('remove'),
  };
  const mod = load('games/eco/reproduccion.ts', {
    'expo-audio': { createAudioPlayer: (uri: string, options: unknown) => { events.push(`create:${uri}`); config = options; return player; } },
    './captura': { restoreAudio: () => restored.promise },
  });
  const cancel = mod.playTake({ uri: 'file:///voz.m4a', ms: 20 }, {
    onStart: () => events.push('start'), onProgress: (n: number) => events.push(`progress:${n}`),
    onEnd: () => events.push('end'), onError: () => events.push('error'),
  });
  const emit = (status: unknown) => listener?.({ isLoaded: true, playing: false, didJustFinish: false, duration: 2.5, currentTime: 0, ...status as object });
  return { restored, sought, player, events, emit, cancel, config: () => config };
}

test('tu grabación espera modo de escucha, carga y seek; el cursor sigue el audio y solo acaba al final real', async (t) => {
  const p = playback(t);
  assert.deepEqual(p.events, []);
  p.restored.resolve(); await flush();
  assert.deepEqual(p.events, ['create:file:///voz.m4a']);
  assert.equal(p.config().keepAudioSessionActive, true);
  p.player.isLoaded = true;
  p.emit({}); await flush();
  assert.ok(p.events.includes('seek:0'));
  assert.ok(!p.events.includes('play'));
  p.sought.resolve(); await flush();
  assert.ok(p.events.includes('play'));
  assert.ok(!p.events.includes('start'));
  assert.equal(p.player.volume, 1); assert.equal(p.player.muted, false);
  p.emit({ playing: true, currentTime: 1.25 });
  assert.ok(p.events.includes('start')); assert.ok(p.events.includes('progress:0.5'));
  t.mock.timers.tick(4000);
  assert.ok(!p.events.includes('end'), 'no usa el antiguo ms+1500 para terminar antes');
  p.emit({ didJustFinish: true, currentTime: 2.5 });
  assert.equal(p.events.filter((e) => e === 'end').length, 1);
  assert.ok(p.events.includes('remove'));
  p.emit({ didJustFinish: true });
  assert.equal(p.events.filter((e) => e === 'end').length, 1);
});

test('cancelar mientras carga impide que un evento atrasado reproduzca tu voz en otra ronda', async (t) => {
  const p = playback(t);
  p.restored.resolve(); await flush();
  p.cancel(); p.player.isLoaded = true; p.emit({}); p.sought.resolve(); await flush();
  assert.ok(!p.events.includes('play')); assert.ok(!p.events.includes('end')); assert.ok(!p.events.includes('error'));
  assert.equal(p.events.filter((e) => e === 'remove').length, 1);
});

test('cancelar con un seek pendiente tampoco arranca la reproducción', async (t) => {
  const p = playback(t);
  p.restored.resolve(); await flush(); p.player.isLoaded = true; p.emit({}); await flush();
  p.cancel(); p.sought.resolve(); await flush();
  assert.ok(!p.events.includes('play')); assert.ok(!p.events.includes('end'));
});

test('un archivo inválido y un reproductor bloqueado avisan del error en vez de simular una comparación', async (t) => {
  const p = playback(t);
  p.restored.resolve(); await flush(); p.emit({ error: 'cannot decode' });
  assert.ok(p.events.includes('error')); assert.ok(!p.events.includes('end')); assert.ok(!p.events.includes('play'));
});

test('una carga que no termina devuelve el control con un error y libera el reproductor', async (t) => {
  const p = playback(t);
  p.restored.resolve(); await flush(); t.mock.timers.tick(8000); await flush();
  assert.ok(p.events.includes('error')); assert.ok(p.events.includes('remove')); assert.ok(!p.events.includes('play'));
});

function capture(t: TestContext, stream = false) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const events: string[] = [];
  const files = new Map<string, { exists: boolean; size: number }>();
  const put = (uri: string) => { files.set(uri, { exists: true, size: 12000 }); return uri; };
  let finish = async () => {};
  let failStreamFile = false;
  let emptyStream = false;
  let active = false;
  let serial = 0;
  const recorder = {
    uri: '',
    prepareToRecordAsync: async () => { events.push('prepare'); recorder.uri = put(`file:///take-${++serial}.m4a`); },
    record: () => { events.push('record'); active = true; },
    getStatus: () => ({ isRecording: active, metering: -16 }),
    stop: async () => { events.push('stop'); await finish(); active = false; events.push('finalized'); },
  };
  class Stream {
    addListener() { return { remove: () => {} }; }
    async start() { events.push('stream:start'); }
    async startFileRecordingAsync() { if (failStreamFile) throw Error('disk'); return { uri: put('file:///stream.wav') }; }
    async stopFileRecordingAsync() { return { uri: 'file:///stream.wav', duration: emptyStream ? 0 : 1.5, size: emptyStream ? 44 : 12000 }; }
    stop() { events.push('stream:stop'); }
    release() { events.push('stream:release'); }
  }
  const mod = load('games/eco/captura.ts', {
    'expo-audio': {
      AudioModule: stream ? { AudioStream: Stream } : {}, requestRecordingPermissionsAsync: async () => ({ granted: true }),
      setAudioModeAsync: async (o: any) => { events.push(o.allowsRecording ? 'mode:record' : 'mode:play'); },
    },
    'expo-file-system': { File: class { uri: string; constructor(uri: string) { this.uri = uri; } get exists() { return files.get(this.uri)?.exists; } get size() { return files.get(this.uri)?.size ?? 0; } delete() { files.delete(this.uri); } } },
    'react-native': { Platform: { OS: 'ios' } },
    './tono': { createTracker: () => ({ push: () => [] }), isVoiced: () => false },
  });
  const options = { recorder, onLevel: () => {} };
  const open = async () => {
    const run = mod.openMic(options); await flush(); t.mock.timers.tick(160); await flush(); return run;
  };
  return { mod, events, recorder, files, open, options, finish: (fn: () => Promise<void>) => { finish = fn; }, failFile: () => { failStreamFile = true; }, emptyStream: () => { emptyStream = true; } };
}

test('la grabación convencional finaliza el archivo antes de restaurar altavoz y devolver su URI', async (t) => {
  const c = capture(t); const mic = await c.open();
  t.mock.timers.tick(1000); const take = await mic.stop();
  assert.equal(take.uri, 'file:///take-1.m4a');
  assert.ok(c.events.indexOf('mode:play') > c.events.indexOf('finalized'));
  assert.equal(take.spoke, true);
});

test('iOS deja terminar la desactivación pendiente de los efectos antes de arrancar el micro', async (t) => {
  const c = capture(t);
  const run = c.mod.openMic(c.options);
  await flush(); t.mock.timers.tick(100); await flush();
  assert.ok(!c.events.includes('prepare'));
  t.mock.timers.tick(60); await flush();
  const mic = await run;
  assert.ok(c.events.includes('record'));
  await mic.cancel();
});

test('repetir espera a que la cancelación anterior haya soltado el micro; no restaura audio encima de la nueva toma', async (t) => {
  const c = capture(t); const mic = await c.open(); const stop = deferred<void>();
  c.finish(() => stop.promise); const cancelled = mic.cancel();
  const next = c.mod.openMic(c.options); await flush(); t.mock.timers.tick(1000); await flush();
  assert.equal(c.events.filter((e) => e === 'prepare').length, 1);
  stop.resolve(); await cancelled; await flush(); t.mock.timers.tick(160); await flush();
  const other = await next;
  assert.equal(c.events.filter((e) => e === 'prepare').length, 2);
  await other.cancel();
});

test('un flujo PCM que no puede guardar un archivo cae al grabador que sí permite comparar', async (t) => {
  const c = capture(t, true); c.failFile(); const mic = await c.open();
  assert.equal(mic.kind, 'volumen');
  assert.ok(c.events.indexOf('stream:release') < c.events.indexOf('prepare'));
  const take = await mic.stop(); assert.equal(take.uri, 'file:///take-1.m4a');
});

test('un archivo ausente no se ofrece como una grabación reproducible', async (t) => {
  const c = capture(t); const mic = await c.open(); c.files.clear();
  const take = await mic.stop(); assert.equal(take.uri, null);
});

test('un WAV que solo tiene cabecera tampoco se ofrece como si contuviese tu voz', async (t) => {
  const c = capture(t, true); c.emptyStream(); const mic = await c.open();
  const take = await mic.stop(); assert.equal(take.uri, null);
});

test('finalizar dos veces la misma toma no para ni borra otra grabación', async (t) => {
  const c = capture(t); const mic = await c.open(); const first = mic.stop();
  assert.equal(mic.stop(), first); await first; await mic.cancel();
  assert.equal(c.events.filter((e) => e === 'stop').length, 1);
});
