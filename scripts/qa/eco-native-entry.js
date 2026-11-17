// Solo para una app de simulador aislada. No sustituir el entrypoint de producción.
const React = require('react');
const { View, Text } = require('react-native');
const { registerRootComponent } = require('expo');
const { File, Paths } = require('expo-file-system');
const Audio = require('expo-audio/build/ExpoAudio');
const traceFile = new File(Paths.document, 'eco-fullflow-qa.json');
const report = { scope: 'Real Eco component, native microphone and native recording. No playback sampling or fabricated recording.', events: [], takes: [] };
const save = () => traceFile.write(JSON.stringify(report));
const event = (name, data = {}) => { report.events.push({ name, at: Date.now(), ...data }); save(); };
const Speech = require('expo-speech');
const speak = Speech.speak;
Speech.speak = (text, options) => {
  event('speech:requested', { text, voice: options.voice, independentSession: options.useApplicationAudioSession === false });
  return speak(text, { ...options,
    onStart: () => { event('speech:started'); options.onStart?.(); },
    onDone: () => { event('speech:ended'); options.onDone?.(); },
    onError: error => { event('speech:error', { error: String(error) }); options.onError?.(error); },
  });
};
for (const name of ['setAudioModeAsync', 'setIsAudioActiveAsync']) {
  const original = Audio[name];
  Audio[name] = async (...args) => {
    event(name + ':start', { args });
    try { const value = await original(...args); event(name + ':done'); return value; }
    catch (error) { event(name + ':error', { error: String(error) }); throw error; }
  };
}
const create = Audio.createAudioPlayer;
Audio.createAudioPlayer = (...args) => {
  const player = create(...args);
  const uri = args[0];
  let key = '', second = -1;
  event('player:create', { uri, options: args[1] });
  player.addListener('playbackStatusUpdate', status => {
    const next = JSON.stringify([status.isLoaded, status.playing, status.playbackState, status.error, status.didJustFinish]);
    if (key !== next || (typeof uri === 'string' && second !== Math.floor(status.currentTime))) {
      key = next; second = Math.floor(status.currentTime);
      event('player:status', { uri, status });
    }
  });
  return player;
};
const capture = require('../../src/games/eco/captura');
const openMic = capture.openMic;
capture.openMic = async options => {
  event('mic:open');
  let frames = 0, peakRms = 0;
  const mic = await openMic({ ...options, onFrames: fresh => { frames += fresh.length; for (const f of fresh) peakRms = Math.max(peakRms, f.rms); options.onFrames?.(fresh); } });
  event('mic:ready', { kind: typeof mic === 'string' ? mic : mic.kind });
  if (typeof mic === 'string') return mic;
  return { ...mic, stop: async () => {
    event('mic:stop'); const take = await mic.stop();
    const item = { ms: take.ms, spoke: take.spoke, frames, peakRms, uri: take.uri };
    if (take.uri) {
      const file = new File(take.uri); const bytes = file.bytesSync();
      item.bytes = bytes.length; item.header = Array.from(bytes.slice(0, 44));
      const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (bytes.length > 44 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF') {
        let energy = 0, peak = 0;
        for (let i = 44; i + 1 < bytes.length; i += 2) { const x = v.getInt16(i, true) / 32768; energy += x * x; peak = Math.max(peak, Math.abs(x)); }
        item.fileRms = Math.sqrt(energy / Math.max(1, (bytes.length - 44) / 2)); item.filePeak = peak;
      }
      const copy = new File(Paths.document, 'native-take-' + (report.takes.length + 1) + '.wav'); file.copy(copy); item.savedCopy = copy.uri;
    }
    report.takes.push(item); event('mic:saved', item); return take;
  } };
};
const playback = require('../../src/games/eco/reproduccion');
const playTake = playback.playTake;
playback.playTake = (take, options) => {
  event('take:requested', { uri: take.uri });
  return playTake(take, { ...options,
    onStart: () => { event('take:started'); options.onStart?.(); },
    onEnd: () => { event('take:ended'); options.onEnd(); },
    onError: () => { event('take:error'); options.onError(); },
  });
};
const { initAudio, configureAudio } = require('../../src/lib/audio');
const Eco = require('../../src/games/Eco').default;
const { WORDS } = require('../../src/content');
const word = Object.values(WORDS).find(w => w.th === 'ขอบคุณ');
if (!word) throw Error('Missing real lesson word');
const { useFonts } = require('expo-font');
const fontModules = [
  require('@expo-google-fonts/fredoka/600SemiBold'), require('@expo-google-fonts/fredoka/700Bold'),
  require('@expo-google-fonts/nunito/600SemiBold'), require('@expo-google-fonts/nunito/700Bold'),
  require('@expo-google-fonts/nunito/800ExtraBold'), require('@expo-google-fonts/nunito/900Black'),
  require('@expo-google-fonts/noto-sans-thai-looped/500Medium'), require('@expo-google-fonts/noto-sans-thai-looped/700Bold'),
];
const fonts = Object.fromEntries(fontModules.flatMap(m => Object.entries(m).filter(([k]) => /^[A-Z].*_/.test(k))));
function App() {
  const [loaded] = useFonts(fonts); const [ready, setReady] = React.useState(false);
  React.useEffect(() => { configureAudio({ sound: true, haptics: false, voiceRate: 0.85 }); initAudio().then(() => { event('app:ready', { word: word.id }); setReady(true); }); }, []);
  return React.createElement(View, { style: { flex: 1, paddingTop: 60, paddingBottom: 36, backgroundColor: '#141936' } },
    loaded && ready ? React.createElement(Eco, { mode: 'leccion', words: [word], focus: [word], sentences: [], rounds: 1, gender: 'f', reads: false, onAnswer: () => {}, onDone: result => event('game:done', { result }) }) : React.createElement(Text, null, 'Preparando Eco…'));
}
const { StoreProvider } = require('../../src/lib/store');
const { SafeAreaProvider } = require('react-native-safe-area-context');
function Root() { return React.createElement(SafeAreaProvider, null, React.createElement(StoreProvider, null, React.createElement(App))); }
registerRootComponent(Root);
