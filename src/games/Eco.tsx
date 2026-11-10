// Juego 9 · Eco: de noche, en un valle entre dos montañas, Noi grita la palabra y el eco rebota de una
// montaña a otra. Debajo se dibuja la melodía de tonos de lo que ha dicho. Luego grabas tu voz, que
// levanta su propia cordillera de luz, la escuchas junto a la de Noi y decides cuánto se parece.
// Si no hay micrófono, se dice en voz alta y se compara de oído.
import { RecordingPresets, createAudioPlayer, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, type AudioPlayer } from 'expo-audio';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, ZoomIn, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import type { NoiPose } from '@/brand/noi-art';
import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import type { Sentence, Word } from '@/content/types';
import { fx, stopSpeech } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { joinThai, personalize, personalizeRom, syllables, tonesOf, type Gender } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { Glow, Pop, Press3D, tapPoint, useJuice } from './fx';
import { useScore } from './kit';
import { Melody } from './tonos/curva';
import { TopBar, Waves, type Mark } from './tonos/piezas';
import { useTimers, useVoice } from './tonos/voz';
import type { GameProps } from './types';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const REC = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };
const TICK = 70;
const MAX_MS = 8000;

type Item = { id?: string; th: string; rom: string; es: string; sentence: boolean };
type Phase = 'shout' | 'ready' | 'rec' | 'has';
type Rating = 'otra' | 'casi' | 'igual';

function makeItems(mode: GameProps['mode'], sentences: Sentence[], words: Word[], focus: Word[], gender: Gender, n: number): Item[] {
  const S: Item[] = shuffle(sentences).map((x) => ({ th: joinThai(x.th.map((t) => personalize(t, gender))), rom: personalizeRom(x.rom, gender), es: personalize(x.es, gender), sentence: true }));
  const seen = new Set<string>();
  const W: Item[] = [...shuffle(focus), ...shuffle(words)]
    .filter((w) => !seen.has(w.th) && (seen.add(w.th), true))
    .map((x) => ({ id: x.id, th: x.th, rom: x.rom, es: x.es, sentence: false }));
  const out: Item[] = [];
  if (mode === 'feria') {
    // primero palabras cortas para calentar la voz; luego, frases
    const half = Math.ceil(n / 2);
    out.push(...W.filter((w) => syllables(w.rom).length <= 3).slice(0, half));
    out.push(...S.slice(0, n - out.length));
    out.push(...W.filter((w) => !out.includes(w)).slice(0, n - out.length));
  } else {
    const a = n >= 2 ? [...W] : [...S];
    const b = n >= 2 ? [...S] : [...W];
    while (out.length < n && (a.length || b.length)) {
      const it = (out.length % 2 === 0 ? a.shift() ?? b.shift() : b.shift() ?? a.shift())!;
      if (!out.some((o) => o.th === it.th)) out.push(it);
    }
  }
  return out.slice(0, n);
}

/** Juego 9 · Eco: escucha, repite y compárate con Noi. */
export default function Eco({ mode, words, focus, sentences, rounds, gender, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const voice = useVoice();
  const timers = useTimers();
  const recorder = useAudioRecorder(REC);
  const { height: winH } = useWindowDimensions();
  const compact = winH < 760;

  const [list] = useState(() => makeItems(mode, sentences, words, focus, gender, rounds ?? (feria ? 6 : 2)));
  const [i, setI] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [repeats, setRepeats] = useState(0);
  const [phase, setPhase] = useState<Phase>('shout');
  const [heard, setHeard] = useState(false);
  const [noMic, setNoMic] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [points, setPoints] = useState(0);
  const [pose, setPose] = useState<NoiPose>('feliz');
  const [jump, setJump] = useState(0);
  const [echoRun, setEchoRun] = useState(0);
  const [canyon, setCanyon] = useState({ w: 0, h: 0 });
  const [vizW, setVizW] = useState(0);
  const pointsRef = useRef(0);
  const finished = useRef(false);
  const rated = useRef(false);
  const busy = useRef(false);
  const player = useRef<AudioPlayer | null>(null);
  const meter = useRef<ReturnType<typeof setInterval> | null>(null);
  const buf = useRef<number[]>([]);
  const recMs = useRef(0);

  const melo = useSharedValue(0);
  const levels = useSharedValue<number[]>([]);
  const live = useSharedValue(0);
  const head = useSharedValue(0);
  const inhale = useSharedValue(1);

  const it = list[i];

  const dropPlayer = () => {
    try {
      player.current?.remove();
    } catch {}
    player.current = null;
  };
  const stopMeter = () => {
    if (meter.current) clearInterval(meter.current);
    meter.current = null;
  };
  useEffect(
    () => () => {
      stopMeter();
      dropPlayer();
      stopSpeech();
    },
    [],
  );

  /** Noi coge aire y grita: suena la palabra, rebota el eco y se dibuja la melodía de tonos. */
  const shout = (slow = false) => {
    if (!it) return;
    dropPlayer();
    setMine(false);
    setPose('celebra');
    inhale.set(withSequence(withTiming(1.12, { duration: 260, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 7, stiffness: 160 })));
    timers.later(
      () =>
        voice.speak(it.th, {
          rom: it.rom,
          slow,
          onStart: (ms) => {
            setEchoRun((n) => n + 1);
            melo.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: Math.max(600, ms * 0.95), easing: Easing.linear })));
          },
          onEnd: () => {
            setPose('feliz');
            setHeard(true);
            setPhase((p) => (p === 'shout' ? 'ready' : p));
          },
        }),
      240,
    );
  };

  const begin = useEffectEvent(() => {
    timers.later(() => shout(false), 550);
  });
  useEffect(() => {
    begin();
  }, [i, attempt]);

  const bail = useEffectEvent(() => onDone(score.result(0)));
  useEffect(() => {
    if (!list.length) bail();
  }, [list.length]);

  if (!it) return null;

  // ——— Grabar (mantiene lo que hacía el juego: permiso, grabar, parar, escucharte) ———
  const startRec = async () => {
    if (busy.current) return;
    busy.current = true;
    voice.stop();
    dropPlayer();
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setNoMic(true);
        setPhase('ready');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      fx.tap();
      setPose('escucha');
      setPhase('rec');
      buf.current = [];
      levels.set([]);
      live.set(1);
      head.set(0);
      recMs.current = 0;
      meter.current = setInterval(() => {
        let db = -160;
        try {
          db = recorder.getStatus().metering ?? -160;
        } catch {}
        const raw = Math.max(0, Math.min(1, (db + 52) / 46));
        const prev = buf.current[buf.current.length - 1] ?? 0;
        buf.current.push(prev * 0.45 + raw * 0.55);
        recMs.current += TICK;
        levels.set(buf.current.slice());
        if (recMs.current >= MAX_MS) void stopRec();
      }, TICK);
    } catch {
      setNoMic(true);
      setPhase('ready');
    } finally {
      busy.current = false;
    }
  };

  const stopRec = async () => {
    if (!meter.current) return;
    stopMeter();
    live.set(0);
    try {
      await recorder.stop();
      setUri(recorder.uri ?? null);
      setPhase('has');
      setPose('feliz');
      fx.pop();
    } catch {
      setNoMic(true);
      setPhase('ready');
    }
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {}
  };

  const playMine = () => {
    if (!uri) return;
    voice.stop();
    dropPlayer();
    try {
      const p = createAudioPlayer(uri);
      player.current = p;
      setMine(true);
      const ms = Math.max(600, recMs.current);
      head.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: ms, easing: Easing.linear })));
      p.addListener('playbackStatusUpdate', (st) => {
        if (st.didJustFinish) setMine(false);
      });
      p.play();
    } catch {
      setMine(false);
    }
  };

  // ——— Valorar ———
  const rate = (r: Rating, e: GestureResponderEvent) => {
    if (finished.current || rated.current) return;
    rated.current = true;
    const ok = r !== 'otra';
    const combo = score.hit(ok);
    onAnswer(ok, it.id);
    setMarks((m) => [...m, ok ? 'ok' : 'bad']);
    dropPlayer();
    setMine(false);
    const at = tapPoint(e);
    if (ok) {
      const pts = feria ? (r === 'igual' ? 30 : 15) + (combo >= 3 ? 5 : 0) : 0;
      if (feria) {
        pointsRef.current += pts;
        setPoints(pointsRef.current);
      }
      if (r === 'igual') juice.celebrate(at, feria ? `+${pts}` : '¡Igualito!', 'corazones');
      else juice.float(at, feria ? `+${pts}` : '¡Casi!', color.azafranHondo);
      if (combo >= 3 && combo % 3 === 0) timers.later(() => juice.banner('¡Eco perfecto!', `${combo} seguidas`, color.farol), 400);
      setPose('celebra');
      setJump((j) => j + 1);
    } else {
      setPose('piensa');
      juice.float(at, '¡Otra vez!', color.cielo);
    }
    // «Otra vez» repite la misma una vez; si no, a la siguiente
    const again = !ok && attempt === 0;
    if (again) setRepeats((n) => n + 1);
    timers.later(() => {
      rated.current = false;
      setUri(null);
      levels.set([]);
      setHeard(false);
      setPhase('shout');
      if (again) {
        setAttempt(1);
        return;
      }
      if (i + 1 >= list.length) {
        finish();
        return;
      }
      setAttempt(0);
      setI((v) => v + 1);
    }, 700);
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    voice.stop();
    if (!feria) {
      onDone(score.result());
      return;
    }
    fx.fanfare();
    juice.banner('¡Qué eco!', `${pointsRef.current} puntos`, color.farol);
    juice.burst(undefined, 'estrellas', 30, 170);
    timers.later(() => onDone(score.result(pointsRef.current)), 1500);
  };

  const sylls = syllables(it.rom);
  const tones = tonesOf(it.rom);
  const labels = sylls.map((s) => s.replace(/[^\p{L}\p{M}]/gu, ''));
  const canRate = phase === 'has' || (noMic && heard);
  const canyonH = compact ? 126 : 214;
  const noiSize = compact ? 84 : 122;
  const thSize = (it.th.length > 18 ? 22 : it.th.length > 10 ? 27 : 34) - (compact ? 4 : 0);
  const tip = noMic
    ? heard
      ? 'Dilo en voz alta, como Noi. ¿Te ha salido?'
      : 'Escucha a Noi…'
    : phase === 'rec'
      ? 'Te escucho… ¡tu voz levanta montañas!'
      : phase === 'has'
        ? 'Escúchate y compara. ¿Cómo te ha salido?'
        : phase === 'ready'
          ? '¡Tu turno! Toca el micro y repite'
          : 'Escucha a Noi…';

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="noche" />
      <Animated.View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }, juice.shakeStyle]}>
        <TopBar marks={marks} total={list.length + repeats} points={feria ? points : undefined} combo={score.combo} dark />

        {/* la palabra o frase */}
        <Animated.View key={`c${i}`} entering={ZoomIn.springify().damping(14)} style={[styles.card, compact && { paddingVertical: 5 }]}>
          <Th size={thSize} bold style={{ textAlign: 'center' }} numberOfLines={2}>
            {it.th}
          </Th>
          <Rom rom={it.rom} size={compact ? 15 : 17} style={{ textAlign: 'center' }} />
          <Text style={styles.es} numberOfLines={2}>
            {it.es}
          </Text>
        </Animated.View>

        {/* el valle: dos montañas, Noi en su roca y el eco que rebota */}
        <View style={{ height: canyonH }} onLayout={(e) => setCanyon({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {canyon.w > 0 ? (
            <>
              <Valley w={canyon.w} h={canyon.h} />
              <Echo run={echoRun} text={it.th} w={canyon.w} h={canyon.h} from={{ x: canyon.w / 2, y: canyon.h - noiSize * 0.75 }} />
              <View style={{ position: 'absolute', left: canyon.w / 2 - noiSize / 2, top: canyon.h - noiSize - 4 }}>
                <InhaleNoi scale={inhale} pose={pose} size={noiSize} jump={jump} />
              </View>
            </>
          ) : null}
        </View>

        {/* comparar: la melodía de Noi y la cordillera de tu voz */}
        <View style={styles.viz} onLayout={(e) => setVizW(e.nativeEvent.layout.width - 64)}>
          <View style={styles.vizRow}>
            <Text style={styles.vizLabel}>Noi</Text>
            {vizW > 0 ? <Melody key={`m${i}`} tones={tones} labels={labels} width={vizW} height={compact ? 52 : 78} progress={melo} stroke={tones.length > 8 ? 4 : 6} dark /> : null}
          </View>
          <View style={styles.vizRow}>
            <Text style={[styles.vizLabel, { color: '#FFB98A' }]}>Tú</Text>
            {vizW > 0 ? <Ridge levels={levels} live={live} head={head} playing={mine} width={vizW} height={compact ? 32 : 50} empty={phase === 'shout' || phase === 'ready'} noMic={noMic} /> : null}
          </View>
        </View>

        <Text style={[styles.tip, compact && { marginTop: 4 }]}>{tip}</Text>

        {/* escuchar a Noi · grabar · escucharte */}
        <View style={styles.controls}>
          <RoundBtn icon="speaker" label="Noi" tint={color.cielo} deep={color.cieloHondo} onPress={() => shout(false)} disabled={phase === 'rec'} small={compact} />
          {!noMic ? (
            <Mic recording={phase === 'rec'} ready={phase !== 'shout'} label={phase === 'rec' ? 'Parar' : phase === 'has' ? 'Repetir' : 'Grabar'} onPress={() => (phase === 'rec' ? void stopRec() : void startRec())} small={compact} />
          ) : (
            <View style={styles.noMic}>
              <Icon name="mic" size={26} color="#C9D0EE" />
              <Text style={styles.noMicText}>Sin micro: dilo en voz alta</Text>
            </View>
          )}
          <RoundBtn icon="play" label="Tú" tint={color.farol} deep="#C2410C" onPress={playMine} disabled={!uri || phase === 'rec'} small={compact} />
        </View>

        <View style={styles.rateRow}>
          {(
            [
              ['otra', '🔁', 'Otra vez', '#5B6BCF', '#3C4AA8'],
              ['casi', '🙂', 'Casi', color.azafran, color.azafranHondo],
              ['igual', '🤩', '¡Igualito!', color.arrozal, color.arrozalHondo],
            ] as const
          ).map(([r, emoji, label, face, edge]) => (
            <Press3D key={r} onPress={(e) => rate(r, e)} disabled={!canRate} style={{ flex: r === 'igual' ? 1.25 : 1, height: compact ? 48 : 56, opacity: canRate ? 1 : 0.4 }} depth={10} accessibilityLabel={label}>
              <View style={[styles.rateEdge, { backgroundColor: edge }]}>
                <View style={[styles.rateFace, { backgroundColor: face }]}>
                  <View style={styles.rateShine} />
                  <Text style={styles.rateEmoji}>{emoji}</Text>
                  <Text style={[styles.rateText, r === 'casi' && { color: color.tinta }]} numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              </View>
            </Press3D>
          ))}
        </View>
      </Animated.View>
      {juice.layer}
    </View>
  );
}

/** Noi coge aire antes de gritar. */
function InhaleNoi({ scale, pose, size, jump }: { scale: SharedValue<number>; pose: NoiPose; size: number; jump: number }) {
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[{ transformOrigin: `${size / 2}px ${size}px` }, st]}>
      <Glow size={size * 1.3} tint="#FFE9B8" strength={0.35} style={{ position: 'absolute', left: -size * 0.15, top: -size * 0.15 }} />
      <Noi pose={pose} size={size} jump={jump} accessibilityLabel="Noi grita para hacer eco" />
    </Animated.View>
  );
}

/** Las dos montañas del valle, con luz de luna en el borde, nieve y pinos, y la roca de Noi. */
function Valley({ w, h }: { w: number; h: number }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const L = `M-10 ${h} L${w * 0.02} ${h * 0.5} L${w * 0.12} ${h * 0.12} L${w * 0.2} ${h * 0.3} L${w * 0.27} ${h * 0.22} L${w * 0.42} ${h} Z`;
  const R = `M${w * 0.58} ${h} L${w * 0.72} ${h * 0.2} L${w * 0.8} ${h * 0.04} L${w * 0.9} ${h * 0.26} L${w + 10} ${h * 0.34} L${w + 10} ${h} Z`;
  const snowL = `M${w * 0.085} ${h * 0.24} L${w * 0.12} ${h * 0.12} L${w * 0.165} ${h * 0.23} L${w * 0.14} ${h * 0.2} L${w * 0.12} ${h * 0.26} L${w * 0.1} ${h * 0.21} Z`;
  const snowR = `M${w * 0.755} ${h * 0.13} L${w * 0.8} ${h * 0.04} L${w * 0.845} ${h * 0.14} L${w * 0.82} ${h * 0.12} L${w * 0.8} ${h * 0.17} L${w * 0.775} ${h * 0.12} Z`;
  const pine = (x: number, y: number, s: number) => `M${x} ${y - 16 * s} L${x + 7 * s} ${y} L${x - 7 * s} ${y} Z`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${u}m`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3B3F86" />
          <Stop offset="1" stopColor="#151937" />
        </LinearGradient>
        <LinearGradient id={`${u}r`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4A3F8C" />
          <Stop offset="1" stopColor="#1A1B40" />
        </LinearGradient>
        <RadialGradient id={`${u}g`} cx="50%" cy="100%" r="60%">
          <Stop offset="0" stopColor="#FFB86B" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#FFB86B" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={w / 2} cy={h} r={w * 0.4} fill={`url(#${u}g)`} />
      <Path d={L} fill={`url(#${u}m)`} />
      <Path d={`M${w * 0.12} ${h * 0.12} L${w * 0.2} ${h * 0.3} L${w * 0.27} ${h * 0.22} L${w * 0.42} ${h}`} stroke="#B9C2FF" strokeOpacity={0.45} strokeWidth={2} fill="none" />
      <Path d={snowL} fill="#EEF2FF" opacity={0.9} />
      <Path d={R} fill={`url(#${u}r)`} />
      <Path d={`M${w * 0.58} ${h} L${w * 0.72} ${h * 0.2} L${w * 0.8} ${h * 0.04}`} stroke="#C9C2FF" strokeOpacity={0.5} strokeWidth={2} fill="none" />
      <Path d={snowR} fill="#EEF2FF" opacity={0.9} />
      <G opacity={0.85}>
        {[0.06, 0.1, 0.16, 0.31, 0.36].map((x, k) => (
          <Path key={`l${k}`} d={pine(w * x, h - 4 - (k % 2) * 8, 0.9 + (k % 3) * 0.2)} fill="#0F1330" />
        ))}
        {[0.66, 0.7, 0.86, 0.92, 0.96].map((x, k) => (
          <Path key={`r${k}`} d={pine(w * x, h - 4 - (k % 2) * 8, 0.9 + (k % 3) * 0.2)} fill="#0F1330" />
        ))}
      </G>
      <Path d={`M${w * 0.32} ${h} Q${w * 0.36} ${h - 22} ${w * 0.5} ${h - 24} Q${w * 0.64} ${h - 22} ${w * 0.68} ${h} Z`} fill="#26294F" />
      <Path d={`M${w * 0.34} ${h - 8} Q${w * 0.4} ${h - 22} ${w * 0.5} ${h - 23} Q${w * 0.6} ${h - 22} ${w * 0.66} ${h - 8}`} stroke="#8F97E8" strokeOpacity={0.5} strokeWidth={2} fill="none" />
    </Svg>
  );
}

/** El eco: la palabra sale de Noi y rebota de montaña en montaña, cada vez más pequeña y lejana. */
function Echo({ run, text, w, h, from }: { run: number; text: string; w: number; h: number; from: { x: number; y: number } }) {
  if (!run) return null;
  const pts = [from, { x: w * 0.2, y: h * 0.36 }, { x: w * 0.78, y: h * 0.28 }, { x: w * 0.3, y: h * 0.5 }];
  return (
    <View key={run} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[0, 1, 2].map((k) => (
        <Bounce key={k} k={k} text={text} a={pts[k]} b={pts[k + 1]} />
      ))}
    </View>
  );
}

function Bounce({ k, text, a, b }: { k: number; text: string; a: { x: number; y: number }; b: { x: number; y: number } }) {
  const t = useSharedValue(0);
  const ring = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(k * 470, withTiming(1, { duration: 560, easing: Easing.inOut(Easing.quad) }));
    ring.value = withDelay(k * 470 + 500, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
    const swish = k === 0 ? setTimeout(() => fx.swish(), 480) : undefined;
    return () => clearTimeout(swish);
  }, [k, t, ring]);
  const s = 1 - k * 0.22;
  const st = useAnimatedStyle(() => {
    const v = t.value;
    const x = a.x + (b.x - a.x) * v;
    const y = a.y + (b.y - a.y) * v - Math.sin(v * Math.PI) * 26;
    const o = v <= 0 ? 0 : v < 0.15 ? v / 0.15 : v > 0.78 ? Math.max(0, (1 - v) / 0.22) : 1;
    return { opacity: o * (0.95 - k * 0.22), transform: [{ translateX: x - 110 }, { translateY: y - 26 }, { scale: s * (0.7 + 0.3 * Math.sin(v * Math.PI * 0.5 + 0.5)) }] };
  });
  const rs = useAnimatedStyle(() => ({ opacity: ring.value <= 0 ? 0 : (1 - ring.value) * 0.8, transform: [{ translateX: b.x - 30 }, { translateY: b.y - 30 }, { scale: 0.3 + ring.value * 1.4 }] }));
  return (
    <>
      <Animated.View style={[styles.ring, rs]} />
      <Animated.View style={[styles.echo, st]}>
        <View style={styles.echoHalo}>
          <Text style={[styles.echoText, { fontSize: text.length > 14 ? 19 : text.length > 6 ? 26 : 34, lineHeight: text.length > 14 ? 30 : text.length > 6 ? 40 : 52 }]} numberOfLines={1}>
            {text}
          </Text>
        </View>
      </Animated.View>
    </>
  );
}

/** Tu voz como una cordillera de luz que crece mientras grabas; al escucharte, una línea la recorre. */
function Ridge({
  levels,
  live,
  head,
  playing,
  width,
  height,
  empty,
  noMic,
}: {
  levels: SharedValue<number[]>;
  live: SharedValue<number>;
  head: SharedValue<number>;
  playing: boolean;
  width: number;
  height: number;
  empty: boolean;
  noMic: boolean;
}) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const props = useAnimatedProps(() => {
    const v = levels.value;
    const n = v.length;
    if (n < 2) return { d: `M0 ${height} L${width} ${height} Z` };
    const span = live.value ? Math.max(n, MAX_MS / TICK) : n;
    let d = `M0 ${height}`;
    for (let k = 0; k < n; k++) {
      const x = (k / (span - 1)) * width;
      const y = height - 2 - v[k] * (height - 6);
      d += ` L${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
    }
    d += ` L${Math.round(((n - 1) / (span - 1)) * width * 10) / 10} ${height} Z`;
    return { d };
  });
  const hs = useAnimatedStyle(() => ({ opacity: playing ? 1 : 0, transform: [{ translateX: head.value * width - 1 }] }));
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFD089" />
            <Stop offset="0.5" stopColor="#FF8A5B" />
            <Stop offset="1" stopColor="#B83A7A" stopOpacity={0.6} />
          </LinearGradient>
        </Defs>
        <Path d={`M0 ${height - 1} L${width} ${height - 1}`} stroke="rgba(255,255,255,0.18)" strokeWidth={2} strokeDasharray="4 6" />
        <AnimatedPath animatedProps={props} fill={`url(#${u}f)`} stroke="#FFE3B0" strokeWidth={1.5} />
      </Svg>
      {empty ? (
        <Text style={styles.ridgeHint} numberOfLines={1}>
          {noMic ? 'Aquí saldría tu voz si hubiera micro' : 'Aquí se dibuja tu voz'}
        </Text>
      ) : null}
      <Animated.View style={[styles.head, { height }, hs]} />
    </View>
  );
}

function RoundBtn({ icon, label, tint, deep, onPress, disabled, small }: { icon: 'speaker' | 'play'; label: string; tint: string; deep: string; onPress: () => void; disabled?: boolean; small?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 4, opacity: disabled ? 0.4 : 1 }}>
      <Press3D onPress={onPress} disabled={disabled} style={{ width: small ? 50 : 58, height: small ? 54 : 62 }} depth={14} accessibilityLabel={label === 'Noi' ? 'Escuchar a Noi' : 'Escucharte'}>
        <View style={[styles.roundEdge, { backgroundColor: deep }]}>
          <View style={[styles.roundFace, { backgroundColor: tint }]}>
            <View style={styles.roundShine} />
            <Icon name={icon} size={26} color="#FFFFFF" />
          </View>
        </View>
      </Press3D>
      <Text style={styles.roundLabel}>{label}</Text>
    </View>
  );
}

/** El gran micro: dorado y latiendo cuando es tu turno; rojo con ondas mientras graba. */
function Mic({ recording, ready, label, onPress, small }: { recording: boolean; ready: boolean; label: string; onPress: () => void; small?: boolean }) {
  const size = small ? 70 : 84;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: size, height: size + 6, alignItems: 'center', justifyContent: 'center' }}>
        {ready || recording ? <Glow size={size * 1.8} tint={recording ? '#FF5D5D' : '#FFD166'} strength={0.6} style={{ position: 'absolute' }} /> : null}
        <Waves active={recording} size={size * 1.9} tint="#FFB3B3" />
        <Pop trigger={`${recording}${ready}`} scale={1.12}>
          <Press3D onPress={onPress} style={{ width: size, height: size + 6 }} depth={18} accessibilityLabel={recording ? 'Parar la grabación' : 'Grabar tu voz'}>
            <View style={[styles.micEdge, { borderRadius: size / 2, backgroundColor: recording ? color.lacaHondo : color.azafranHondo }]}>
              <View style={[styles.micFace, { borderRadius: size / 2, backgroundColor: recording ? color.laca : color.azafran }]}>
                <View style={styles.roundShine} />
                {recording ? <View style={styles.stop} /> : <Icon name="mic" size={size * 0.45} color={color.tinta} />}
              </View>
            </View>
          </Press3D>
        </Pop>
      </View>
      <Text style={[styles.roundLabel, { color: '#FFFFFF' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  es: { fontFamily: font.uiHeavy, fontSize: 15.5, color: color.tinta2, textAlign: 'center', marginTop: 1 },
  echo: { position: 'absolute', left: 0, top: 0, width: 220, alignItems: 'center' },
  echoHalo: {
    paddingHorizontal: 14,
    borderRadius: 30,
    backgroundColor: 'rgba(255,205,120,0.16)',
    shadowColor: '#FFC56B',
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  echoText: {
    fontFamily: font.thaiBold,
    color: '#FFF6DE',
    textShadowColor: 'rgba(255,180,70,1)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  ring: { position: 'absolute', left: 0, top: 0, width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: '#FFD592' },
  viz: { marginTop: 6, borderRadius: 20, backgroundColor: 'rgba(14,17,40,0.62)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  vizRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vizLabel: { width: 32, fontFamily: font.uiHeavy, fontSize: 13, color: '#BFD6FF' },
  ridgeHint: { position: 'absolute', left: 0, right: 0, top: '30%', textAlign: 'center', fontFamily: font.uiBold, fontSize: 12.5, color: 'rgba(255,255,255,0.45)' },
  head: { position: 'absolute', left: 0, top: 0, width: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },
  tip: { textAlign: 'center', fontFamily: font.uiBold, fontSize: 14, color: '#E9ECFA', marginTop: 8, minHeight: 20 },
  controls: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-evenly', marginTop: 4 },
  noMic: { width: 130, height: 90, alignItems: 'center', justifyContent: 'center', gap: 6 },
  noMicText: { fontFamily: font.uiBold, fontSize: 12.5, color: '#C9D0EE', textAlign: 'center' },
  roundEdge: { flex: 1, borderRadius: 29, paddingBottom: 4 },
  roundFace: { flex: 1, borderRadius: 29, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  roundShine: { position: 'absolute', left: 10, right: 10, top: 4, height: '32%', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.32)' },
  roundLabel: { fontFamily: font.uiHeavy, fontSize: 13, color: '#C9D0EE' },
  micEdge: { flex: 1, borderRadius: 42, paddingBottom: 6, shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  micFace: { flex: 1, borderRadius: 42, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stop: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#FFFFFF' },
  rateRow: { flexDirection: 'row', gap: 8, marginTop: 'auto', paddingBottom: 14, paddingTop: 10 },
  rateEdge: { flex: 1, borderRadius: 18, paddingBottom: 5 },
  rateFace: { flex: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, overflow: 'hidden', paddingHorizontal: 6 },
  rateShine: { position: 'absolute', left: 8, right: 8, top: 4, height: '30%', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.28)' },
  rateEmoji: { fontSize: 18 },
  rateText: { fontFamily: font.displayBold, fontSize: 15.5, color: '#FFFFFF' },
});
