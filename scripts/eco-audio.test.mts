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
  const events: string[] = [];
  let listener: ((status: any) => void) | undefined;
  let config: any;
  const player = {
    isLoaded: false, duration: 2.5, volume: 0, muted: true, loop: true,
    addListener: (_: string, cb: typeof listener) => { listener = cb; return { remove: () => events.push('unlisten') }; },
    seekTo: () => { events.push('seek'); return new Promise<void>(() => {}); },
    play: () => events.push('play'), pause: () => events.push('pause'), remove: () => events.push('remove'),
  };
  const mod = load('games/eco/reproduccion.ts', {
    'expo-audio': {
      createAudioPlayer: (uri: string, options: unknown) => { events.push(`create:${uri}`); config = options; return player; },
      setIsAudioActiveAsync: () => { throw Error('No cambiar la habilitación global desde una comparación'); },
    },
    './captura': { restoreAudio: () => restored.promise },
  });
  const cancel = mod.playTake({ uri: 'file:///voz.wav', ms: 20 }, {
    onStart: () => events.push('start'), onProgress: (n: number) => events.push(`progress:${n}`),
    onEnd: () => events.push('end'), onError: () => events.push('error'),
  });
  const emit = (status: unknown) => listener?.({ isLoaded: true, playing: false, didJustFinish: false, duration: 2.5, currentTime: 0, ...status as object });
  const loaded = async () => { restored.resolve(); await flush(); player.isLoaded = true; emit({}); await flush(); };
  return { restored, player, events, emit, loaded, cancel, config: () => config };
}

test('un reproductor nuevo empieza desde cero sin depender de un seek nativo que puede quedar pendiente', async (t) => {
  const p = playback(t); await p.loaded();
  assert.ok(p.events.includes('play')); assert.ok(!p.events.includes('seek')); assert.ok(!p.events.includes('error'));
  assert.equal(p.config().keepAudioSessionActive, true);
  assert.equal(p.config().allowsExternalPlayback, false, 'el archivo local no se delega a un reproductor AirPlay remoto');
  p.cancel();
});

test('el cursor y el final siguen la reproducción real, sin dar por terminada la toma por su duración estimada', async (t) => {
  const p = playback(t);
  assert.deepEqual(p.events, []);
  await p.loaded();
  assert.ok(!p.events.includes('start'));
  assert.equal(p.player.volume, 1); assert.equal(p.player.muted, false);
  p.emit({ playing: true, currentTime: 1.25 });
  assert.ok(p.events.includes('start')); assert.ok(p.events.includes('progress:0.5'));
  t.mock.timers.tick(4000);
  assert.ok(!p.events.includes('end'));
  p.emit({ didJustFinish: true, currentTime: 2.5 });
  p.emit({ didJustFinish: true });
  assert.equal(p.events.filter(e => e === 'end').length, 1);
  assert.ok(p.events.includes('remove'));
});

test('cancelar mientras carga impide reproducir una toma antigua cuando llega el evento tardío', async (t) => {
  const p = playback(t); p.restored.resolve(); await flush();
  p.cancel(); p.player.isLoaded = true; p.emit({}); await flush();
  assert.ok(!p.events.includes('play')); assert.ok(!p.events.includes('end')); assert.ok(!p.events.includes('error'));
  assert.equal(p.events.filter(e => e === 'remove').length, 1);
});

test('salir antes de restaurar la sesión no llega a crear un reproductor', async (t) => {
  const p = playback(t); p.cancel(); p.restored.resolve(); await flush();
  assert.deepEqual(p.events, []);
});

test('un archivo inválido avisa y libera el reproductor', async (t) => {
  const p = playback(t); p.restored.resolve(); await flush(); p.emit({ error: 'cannot decode' });
  assert.ok(p.events.includes('error')); assert.ok(p.events.includes('remove')); assert.ok(!p.events.includes('play'));
});

test('una carga que no termina devuelve el control sin simular una comparación', async (t) => {
  const p = playback(t); p.restored.resolve(); await flush(); t.mock.timers.tick(8000); await flush();
  assert.ok(p.events.includes('error')); assert.ok(p.events.includes('remove')); assert.ok(!p.events.includes('play'));
});

test('una toma cargada que no arranca no deja la interfaz bloqueada treinta segundos', async (t) => {
  const p = playback(t); await p.loaded(); t.mock.timers.tick(4000);
  assert.ok(p.events.includes('error')); assert.ok(p.events.includes('remove')); assert.ok(!p.events.includes('end'));
});

const { voiceVolume } = load('games/eco/volumen.ts', {});
function wav(amp = 0.006) {
  const rate = 16000, samples = 16000;
  const b = Buffer.alloc(44 + samples * 2);
  b.write('RIFF', 0); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) b.writeInt16LE(Math.round(32767 * amp * Math.sin(2 * Math.PI * 220 * i / rate)), 44 + i * 2);
  return b;
}
function rms(b: Uint8Array, start = 44) {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength); let e = 0;
  for (let i = start; i < b.length; i += 2) e += (v.getInt16(i, true) / 32768) ** 2;
  return Math.sqrt(e / ((b.length - start) / 2));
}

test('la copia de escucha hace audible un PCM bajo conservando duración, tono y archivo original', () => {
  const raw = wav(), before = Buffer.from(raw); const out = Buffer.from(voiceVolume(raw));
  assert.ok(rms(raw) < 0.005); assert.ok(Math.abs(rms(out) - 0.12) < 0.001);
  assert.equal(out.length, raw.length); assert.deepEqual(out.subarray(0, 44), raw.subarray(0, 44));
  assert.deepEqual(raw, before);
  const gain = out.readInt16LE(46) / raw.readInt16LE(46);
  for (let at = 44; at < out.length; at += 2) assert.ok(Math.abs(out.readInt16LE(at) - raw.readInt16LE(at) * gain) < 5);
});

test('los picos no se recortan y las voces que ya tienen volumen no se amplifican', () => {
  const raw = wav(0.008); raw.writeInt16LE(10000, 400);
  const out = Buffer.from(voiceVolume(raw));
  for (let at = 44; at < out.length; at += 2) assert.ok(Math.abs(out.readInt16LE(at)) <= Math.ceil(32768 * 0.9));
  assert.equal(voiceVolume(wav(0.5)), null);
});

test('no se amplifican el silencio digital, el ruido ínfimo ni un formato no soportado', () => {
  assert.equal(voiceVolume(wav(0)), null); assert.equal(voiceVolume(wav(0.0001)), null);
  const other = wav(); other.writeUInt16LE(3, 20); assert.equal(voiceVolume(other), null);
  assert.equal(voiceVolume(Buffer.from('bad')), null);
  const truncated = wav().subarray(0, 100); assert.equal(voiceVolume(truncated), null);
});

test('se respetan los chunks adicionales y las vistas con un desplazamiento en el buffer', () => {
  const original = wav(); const junk = Buffer.from([74,85,78,75,1,0,0,0,7,0]);
  const extra = Buffer.concat([original.subarray(0, 12), junk, original.subarray(12)]); extra.writeUInt32LE(extra.length - 8, 4);
  const storage = Buffer.concat([Buffer.alloc(7), extra, Buffer.alloc(3)]);
  const input = storage.subarray(7, 7 + extra.length); const out = Buffer.from(voiceVolume(input));
  assert.deepEqual(out.subarray(0, 54), extra.subarray(0, 54)); assert.ok(Math.abs(rms(out, 54) - 0.12) < 0.001);
});

function capture(t: TestContext, stream = false) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const events: string[] = [];
  const files = new Map<string, { exists: boolean; size: number; bytes?: Uint8Array }>();
  const put = (uri: string, bytes?: Uint8Array) => { files.set(uri, { exists: true, size: bytes?.length ?? 12000, bytes }); return uri; };
  let finish = async () => {};
  let failStreamFile = false;
  let emptyStream = false;
  let active = false;
  let serial = 0;
  let voiced = false;
  let failListeningWrite = false;
  let streamBuffer: ((value: any) => void) | undefined;
  const recorder = {
    uri: '',
    prepareToRecordAsync: async () => { events.push('prepare'); recorder.uri = put(`file:///take-${++serial}.m4a`); },
    record: () => { events.push('record'); active = true; },
    getStatus: () => ({ isRecording: active, metering: -16 }),
    stop: async () => { events.push('stop'); await finish(); active = false; events.push('finalized'); },
  };
  class Stream {
    addListener(_: string, fn: (value: any) => void) { streamBuffer = fn; return { remove: () => {} }; }
    async start() { events.push('stream:start'); }
    async startFileRecordingAsync() { if (failStreamFile) throw Error('disk'); return { uri: put('file:///stream.wav', voiced ? wav() : undefined) }; }
    async stopFileRecordingAsync() { return { uri: 'file:///stream.wav', duration: emptyStream ? 0 : 1.5, size: emptyStream ? 44 : 12000 }; }
    stop() { events.push('stream:stop'); }
    release() { events.push('stream:release'); }
  }
  const mod = load('games/eco/captura.ts', {
    'expo-audio': {
      AudioModule: stream ? { AudioStream: Stream } : {}, requestRecordingPermissionsAsync: async () => ({ granted: true }),
      setAudioModeAsync: async (o: any) => { events.push(o.allowsRecording ? 'mode:record' : 'mode:play'); },
    },
    'expo-file-system': { File: class {
      uri: string;
      constructor(path: string | { uri: string }, name?: string) { const base = typeof path === 'string' ? path : path.uri; this.uri = name ? base + name : base; }
      get exists() { return files.get(this.uri)?.exists; }
      get size() { return files.get(this.uri)?.size ?? 0; }
      get name() { return this.uri.split('/').at(-1); }
      get parentDirectory() { return { uri: this.uri.slice(0, this.uri.lastIndexOf('/') + 1) }; }
      bytesSync() { return files.get(this.uri)?.bytes; }
      write(bytes: Uint8Array) { if (failListeningWrite) throw Error('disk full'); put(this.uri, bytes); }
      delete() { files.delete(this.uri); }
    } },
    'react-native': { Platform: { OS: 'ios' } },
    './tono': { createTracker: () => ({ push: () => voiced ? Array.from({ length: 8 }, (_, i) => ({ t: i * .0125, rms: .004, f0: 220, conf: 1 })) : [] }), isVoiced: () => voiced },
    './volumen': { voiceVolume },
  });
  const options = { recorder, onLevel: () => {} };
  const open = async () => {
    const run = mod.openMic(options); await flush(); t.mock.timers.tick(160); await flush(); return run;
  };
  return { mod, events, recorder, files, open, options, finish: (fn: () => Promise<void>) => { finish = fn; }, failFile: () => { failStreamFile = true; }, emptyStream: () => { emptyStream = true; },
    voice: () => { voiced = true; }, failListeningWrite: () => { failListeningWrite = true; },
    emitVoice: () => streamBuffer?.({ data: new ArrayBuffer(1600), sampleRate: 16000, channels: 1 }),
  };
}

test('la captura conserva el PCM para analizar, devuelve una copia audible y limpia ambas al salir', async (t) => {
  const c = capture(t, true); c.voice(); const mic = await c.open(); c.emitVoice();
  const take = await mic.stop();
  assert.equal(take.uri, 'file:///listen-stream.wav'); assert.equal(take.spoke, true); assert.equal(take.frames.length, 8);
  assert.deepEqual(Buffer.from(c.files.get('file:///stream.wav')!.bytes!), wav());
  assert.ok(Math.abs(rms(c.files.get(take.uri)!.bytes!) - .12) < .001);
  c.mod.releaseTakes(); assert.equal(c.files.size, 0);
});

test('si falla la copia de escucha se conserva la toma original sin perder la voz ni el análisis', async (t) => {
  const c = capture(t, true); c.voice(); c.failListeningWrite(); const mic = await c.open(); c.emitVoice();
  const take = await mic.stop();
  assert.equal(take.uri, 'file:///stream.wav'); assert.equal(take.spoke, true); assert.equal(take.frames.length, 8);
  assert.deepEqual(Buffer.from(c.files.get(take.uri)!.bytes!), wav());
});

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
