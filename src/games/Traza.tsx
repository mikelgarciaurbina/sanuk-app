// Une los puntos: escribe las consonantes como se aprenden en la escuela tailandesa, empezando por la cabeza (el
// bucle) y en su sentido. En el templo, sobre una hoja de palma enmarcada en laca, una tinta dorada sigue tu dedo
// por el trazo de verdad; cada punto se enciende con una nota más aguda y, al terminar, la letra destella y dice su
// nombre. Una estrella fugaz enseña primero el orden. En la feria, la plantilla desaparece y luego los números.
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  ZoomIn,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import type { NoiPose } from '@/brand/noi-art';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Btn, Rom, Th, Txt } from '@/components/ui';
import { LETTER_EMOJI, LETTER_SETS, LETTER_TRACE, consonantOf, letterCall } from '@/content/letters';
import { fx, say, sfx, type Sfx } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { Glow, Pop, Press3D, Shine, useJuice } from './fx';
import { ComboBadge, GameTitle, useScore } from './kit';
import { usePulse, useSvgId } from './letras/anim';
import type { GameProps } from './types';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Reloj (fuera del componente: el compilador de React no deja llamar a Date.now() en el cuerpo). */
const now = () => Date.now();

// ——— Trazo denso y puntos ———

type Dense = { x: number[]; y: number[]; len: number[]; total: number };
type DotSpec = { s: number; j: number; x: number; y: number; first: boolean };
type Model = { ch: string; strokes: Dense[]; dots: DotSpec[]; glyph: string; base: number; xh: number; demo: { x: number[]; y: number[]; l: number[]; m: number[]; total: number } };

function densify(pts: [number, number][], step = 1): Dense {
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const n = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, c2: number, d: number) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      x.push(c(p0[0], p1[0], p2[0], p3[0]));
      y.push(c(p0[1], p1[1], p2[1], p3[1]));
    }
  }
  x.push(pts[pts.length - 1][0]);
  y.push(pts[pts.length - 1][1]);
  const len = [0];
  for (let j = 1; j < x.length; j++) len.push(len[j - 1] + Math.hypot(x[j] - x[j - 1], y[j] - y[j - 1]));
  return { x, y, len, total: len[len.length - 1] };
}

/** Puntos del trazo: el inicio, las esquinas cerradas (vueltas, picos) y relleno cada ~26 unidades. */
function dotsOf(st: Dense, s: number): DotSpec[] {
  const n = st.x.length;
  const keep = new Set<number>([0, n - 1]);
  const corners: number[] = [];
  for (let j = 4; j < n - 4; j++) {
    const ax = st.x[j] - st.x[j - 4];
    const ay = st.y[j] - st.y[j - 4];
    const bx = st.x[j + 4] - st.x[j];
    const by = st.y[j + 4] - st.y[j];
    const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1);
    if (cos < -0.3) corners.push(j);
  }
  for (let k = 0; k < corners.length; ) {
    let e = k;
    while (e + 1 < corners.length && corners[e + 1] - corners[e] <= 2) e++;
    keep.add(corners[Math.floor((k + e) / 2)]);
    k = e + 1;
  }
  const fixed = [...keep].sort((a, b) => a - b);
  const all = new Set(fixed);
  for (let k = 0; k < fixed.length - 1; k++) {
    const a = fixed[k];
    const b = fixed[k + 1];
    const gap = st.len[b] - st.len[a];
    const parts = Math.round(gap / 26);
    for (let q = 1; q < parts; q++) {
      const target = st.len[a] + (gap * q) / parts;
      let j = a;
      while (j < b && st.len[j] < target) j++;
      all.add(j);
    }
  }
  const sorted = [...all].sort((a, b) => a - b);
  const out: number[] = [];
  for (const j of sorted) {
    const prev = out[out.length - 1];
    if (prev !== undefined && st.len[j] - st.len[prev] < 11) {
      if (keep.has(j) && !keep.has(prev) && prev !== 0) out[out.length - 1] = j;
      continue;
    }
    out.push(j);
  }
  if (out[out.length - 1] !== n - 1) out[out.length - 1] = n - 1;
  return out.map((j, k) => ({ s, j, x: st.x[j], y: st.y[j], first: k === 0 }));
}

function buildModel(ch: string): Model {
  const t = LETTER_TRACE[ch];
  const strokes = t.strokes.map((pts) => densify(pts));
  const dots = strokes.flatMap((st, s) => dotsOf(st, s));
  const dx: number[] = [];
  const dy: number[] = [];
  const dl: number[] = [];
  const dm: number[] = [];
  let acc = 0;
  strokes.forEach((st, s) => {
    if (s > 0) acc += 22; // pausa: la estrella se queda quieta y salta al siguiente trazo
    st.x.forEach((x, j) => {
      dx.push(x);
      dy.push(st.y[j]);
      dl.push(acc + st.len[j]);
      dm.push(j === 0 ? 1 : 0);
    });
    acc += st.total;
  });
  return { ch, strokes, dots, glyph: t.glyph, base: t.base, xh: t.xh, demo: { x: dx, y: dy, l: dl, m: dm, total: acc } };
}

function partialD(xs: number[], ys: number[], upto: number, k: number): string {
  'worklet';
  let d = `M${Math.round(xs[0] * k * 10) / 10} ${Math.round(ys[0] * k * 10) / 10}`;
  const n = Math.min(xs.length - 1, Math.floor(upto));
  for (let j = 1; j <= n; j++) d += ` L${Math.round(xs[j] * k * 10) / 10} ${Math.round(ys[j] * k * 10) / 10}`;
  return d;
}

function demoD(xs: number[], ys: number[], ls: number[], ms: number[], upto: number, k: number): string {
  'worklet';
  let d = '';
  for (let j = 0; j < xs.length && ls[j] <= upto; j++) d += `${ms[j] === 1 ? ' M' : ' L'}${Math.round(xs[j] * k * 10) / 10} ${Math.round(ys[j] * k * 10) / 10}`;
  return d || `M${xs[0] * k} ${ys[0] * k}`;
}

// ——— La hoja y el marco ———

function Paper({ S, base, xh }: { S: number; base: number; xh: number }) {
  const id = useSvgId('paper');
  const k = S / 100;
  return (
    <Svg width={S} height={S} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0" stopColor="#FFFBEF" />
          <Stop offset="0.6" stopColor="#FBEFD2" />
          <Stop offset="1" stopColor="#F1DDB3" />
        </LinearGradient>
        <RadialGradient id={`${id}v`} cx="50%" cy="48%" r="70%">
          <Stop offset="0.6" stopColor="#B07A3A" stopOpacity={0} />
          <Stop offset="1" stopColor="#8A5A26" stopOpacity={0.28} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={S} height={S} fill={`url(#${id}g)`} />
      {/* fibras de la hoja de palma */}
      {Array.from({ length: 16 }, (_, i) => (
        <Path key={i} d={`M0 ${(i + 0.5) * (S / 16)} Q${S * 0.5} ${(i + 0.5) * (S / 16) + (i % 2 ? 3 : -3)} ${S} ${(i + 0.5) * (S / 16)}`} stroke="#D9BC86" strokeOpacity={0.35} strokeWidth={1} fill="none" />
      ))}
      <Rect x={0} y={0} width={S} height={S} fill={`url(#${id}v)`} />
      {/* pautas del cuaderno: altura de la x y línea de base */}
      <Line x1={6} x2={S - 6} y1={xh * k} y2={xh * k} stroke="#C98F5A" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="7 6" />
      <Line x1={6} x2={S - 6} y1={base * k} y2={base * k} stroke="#B9663A" strokeOpacity={0.75} strokeWidth={2} />
    </Svg>
  );
}

function Frame({ S }: { S: number }) {
  const id = useSvgId('frame');
  const F = S + 24;
  const flower = (x: number, y: number) => (
    <Path
      key={`${x}-${y}`}
      d={`M${x} ${y - 6} Q${x + 2} ${y - 2} ${x + 6} ${y} Q${x + 2} ${y + 2} ${x} ${y + 6} Q${x - 2} ${y + 2} ${x - 6} ${y} Q${x - 2} ${y - 2} ${x} ${y - 6} Z`}
      fill="#FFD36A"
    />
  );
  return (
    <Svg width={F} height={F} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#A3302A" />
          <Stop offset="0.5" stopColor="#6E1717" />
          <Stop offset="1" stopColor="#3F0B0B" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={F} height={F} rx={24} fill={`url(#${id})`} />
      <Rect x={3} y={3} width={F - 6} height={F - 6} rx={21} fill="none" stroke="#FFD36A" strokeWidth={2.5} />
      <Rect x={8.5} y={8.5} width={F - 17} height={F - 17} rx={16} fill="none" stroke="#E8A93A" strokeWidth={1.2} strokeDasharray="2 4" />
      {[flower(12, 12), flower(F - 12, 12), flower(12, F - 12), flower(F - 12, F - 12)]}
      <Rect x={14} y={1.5} width={F - 28} height={2} rx={1} fill="#FFFFFF" opacity={0.35} />
    </Svg>
  );
}

// ——— Tinta, estrella guía, puntos ———

function Ink({ st, prog, k }: { st: Dense; prog: SharedValue<number>; k: number }) {
  const id = useSvgId('ink');
  const d = useDerivedValue(() => partialD(st.x, st.y, prog.value, k));
  const glow = useAnimatedProps(() => ({ d: d.value }));
  const core = useAnimatedProps(() => ({ d: d.value }));
  const hi = useAnimatedProps(() => ({ d: d.value }));
  return (
    <>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={100 * k} y2={100 * k} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFC93C" />
          <Stop offset="0.5" stopColor="#F29E05" />
          <Stop offset="1" stopColor="#E06A00" />
        </LinearGradient>
      </Defs>
      <AnimatedPath animatedProps={glow} stroke="#FFB300" strokeOpacity={0.3} strokeWidth={10 * k} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <AnimatedPath animatedProps={core} stroke={`url(#${id})`} strokeWidth={5 * k} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <AnimatedPath animatedProps={hi} stroke="#FFF8DA" strokeOpacity={0.85} strokeWidth={1.3 * k} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  );
}

function DemoTrail({ model, demo, fade, k }: { model: Model; demo: SharedValue<number>; fade: SharedValue<number>; k: number }) {
  const { x, y, l, m } = model.demo;
  const props = useAnimatedProps(() => ({ d: demoD(x, y, l, m, demo.value, k), strokeOpacity: 0.5 * fade.value }));
  return <AnimatedPath animatedProps={props} stroke="#FFC93C" strokeWidth={4 * k} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${1 * k} ${2.2 * k}`} fill="none" />;
}

function Comet({ model, demo, fade, k }: { model: Model; demo: SharedValue<number>; fade: SharedValue<number>; k: number }) {
  const { x, y, l } = model.demo;
  const st = useAnimatedStyle(() => {
    const v = demo.value;
    let j = 0;
    while (j < l.length - 2 && l[j + 1] < v) j++;
    const span = l[j + 1] - l[j] || 1;
    const f = Math.max(0, Math.min(1, (v - l[j]) / span));
    const px = (x[j] + (x[j + 1] - x[j]) * f) * k;
    const py = (y[j] + (y[j + 1] - y[j]) * f) * k;
    return { opacity: fade.value, transform: [{ translateX: px - 30 }, { translateY: py - 30 }, { rotate: `${v * 6}deg` }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.comet, st]}>
      <Glow size={60} tint="#FFE27A" strength={0.95} />
      <Svg width={30} height={30} viewBox="0 0 24 24" style={{ position: 'absolute' }}>
        <Path d="M12 0 14.6 9.4 24 12 14.6 14.6 12 24 9.4 14.6 0 12 9.4 9.4Z" fill="#FFF6C8" stroke="#FFB300" strokeWidth={1.2} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

function Tip({ tx, ty, on }: { tx: SharedValue<number>; ty: SharedValue<number>; on: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({ opacity: on.value, transform: [{ translateX: tx.value - 20 }, { translateY: ty.value - 20 }, { scale: 0.7 + 0.3 * on.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.tip, st]}>
      <Glow size={40} tint="#FFF2B0" strength={0.9} pulse={false} />
      <View style={styles.tipCore} />
    </Animated.View>
  );
}

type DotState = 'lit' | 'next' | 'idle';

function Dot({ x, y, n, state, num, first }: { x: number; y: number; n: number; state: DotState; num: boolean; first: boolean }) {
  const size = first ? 30 : 24;
  const lit = state === 'lit';
  const next = state === 'next';
  return (
    <View pointerEvents="none" style={[styles.center, { position: 'absolute', left: x - size, top: y - size, width: size * 2, height: size * 2 }]}>
      {next ? <PulseRing size={size + 6} /> : null}
      {lit ? <Glow size={size * 2} tint="#FFD54A" strength={0.6} pulse={false} style={{ position: 'absolute' }} /> : null}
      <Animated.View
        key={state}
        entering={lit ? ZoomIn.springify().damping(8) : undefined}
        style={[
          styles.bead,
          { width: size, height: size, borderRadius: size },
          lit ? styles.beadLit : next ? styles.beadNext : first ? styles.beadFirst : styles.beadIdle,
          !num && !first && !next && !lit ? { width: 12, height: 12, borderRadius: 6 } : null,
        ]}>
        <View style={[styles.beadShine, { width: size * 0.4, height: size * 0.18 }]} />
        {num || first ? <Text style={[styles.beadNum, { color: lit || next || first ? '#FFFFFF' : '#7A4A1E', fontSize: first ? 14 : 12 }]}>{n}</Text> : null}
      </Animated.View>
    </View>
  );
}

function PulseRing({ size }: { size: number }) {
  const p = usePulse(700);
  const st = useAnimatedStyle(() => ({ opacity: 0.9 - 0.7 * p.value, transform: [{ scale: 1 + 0.6 * p.value }] }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size, borderWidth: 3, borderColor: color.azafran }, st]} />;
}

function GoldGlyph({ glyph, S, on }: { glyph: string; S: number; on: SharedValue<number> }) {
  const id = useSvgId('gold');
  const st = useAnimatedStyle(() => ({ opacity: on.value, transform: [{ scale: 0.96 + 0.04 * on.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st]}>
      <Svg width={S} height={S} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#FFF3B0" />
            <Stop offset="0.45" stopColor="#FFC531" />
            <Stop offset="1" stopColor="#D97A00" />
          </LinearGradient>
        </Defs>
        <Path d={glyph} fill={`url(#${id})`} stroke="#9A5300" strokeWidth={0.6} />
      </Svg>
    </Animated.View>
  );
}

// ——— El juego ———

type Level = { ghost: boolean; numbers: boolean; demo: boolean; tol: number; name: string };
const LESSON: Level = { ghost: true, numbers: true, demo: true, tol: 11, name: '' };
const LEVELS: Level[] = [
  { ghost: true, numbers: true, demo: true, tol: 10.5, name: 'Con plantilla' },
  { ghost: false, numbers: true, demo: false, tol: 9.5, name: 'Sin plantilla' },
  { ghost: false, numbers: false, demo: false, tol: 9, name: 'De memoria' },
];
const PER_LEVEL = 2;
const WINDOW = 20;

export default function Traza({ mode, extra, rounds, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const { width: winW, height: winH } = useWindowDimensions();
  const total0 = feria ? 6 : Math.max(1, rounds ?? 1);
  const setName = extra?.kind === 'letras' && LETTER_SETS[extra.set] ? extra.set : 'media';

  const [queue, setQueue] = useState<string[]>(() => {
    const pool = LETTER_SETS[setName].filter((c) => LETTER_TRACE[c]);
    const rest = shuffle(Object.keys(LETTER_TRACE).filter((c) => !pool.includes(c)));
    return [...shuffle(pool), ...rest].slice(0, total0);
  });
  const [i, setI] = useState(0);
  const [reached, setReached] = useState(0);
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);
  const [stars, setStars] = useState(0);
  const [gain, setGain] = useState(0);
  const [points, setPoints] = useState(0);
  const [pose, setPose] = useState<NoiPose>('escucha');
  const [jump, setJump] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [demoOn, setDemoOn] = useState(false);
  const [shine, setShine] = useState(0);

  const level = feria ? LEVELS[Math.min(LEVELS.length - 1, Math.floor(i / PER_LEVEL))] : LESSON;
  const ch = queue[i];
  const M = buildModel(ch);
  const c = consonantOf(ch);
  const S = Math.max(240, Math.min(winW - 56, winH - 360, 380));
  const k = S / 100;

  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const progs = [p0, p1];
  const demo = useSharedValue(0);
  const demoFade = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const tipOn = useSharedValue(0);
  const gold = useSharedValue(0);

  const live = useRef({
    si: 0,
    p: [0, 0],
    reached: 0,
    misses: 0,
    off: false,
    done: false,
    started: 0,
    org: { x: 0, y: 0 },
    retried: 0,
    counted: -1,
    combo: 0,
    points: 0,
    dead: false,
    ended: false,
    timers: [] as ReturnType<typeof setTimeout>[],
  });

  const later = (fn: () => void, ms: number) => {
    const L = live.current;
    L.timers.push(
      setTimeout(() => {
        if (!L.dead) fn();
      }, ms),
    );
  };
  useEffect(() => {
    const L = live.current;
    L.dead = false;
    return () => {
      L.dead = true;
      L.timers.forEach(clearTimeout);
    };
  }, []);

  // ——— demostración: la estrella recorre el trazo ———
  const playDemo = () => {
    setDemoOn(true);
    setPose('escucha');
    setMsg('Mira: así se escribe');
    demo.set(0);
    demoFade.set(withTiming(1, { duration: 200 }));
    const ms = Math.min(4200, 1100 + M.demo.total * 9);
    demo.set(withTiming(M.demo.total, { duration: ms, easing: Easing.inOut(Easing.quad) }));
    later(() => {
      demoFade.set(withTiming(0, { duration: 450 }));
      setPose('piensa');
      setMsg((m) => (m === 'Mira: así se escribe' ? '¡Tu turno! Empieza en el 1' : m));
    }, ms + 250);
    later(() => setDemoOn(false), ms + 750);
  };

  const onLetterStart = useEffectEvent(() => {
    if (c) say(letterCall(c));
    if (level.demo) later(playDemo, 700);
    else setPose('piensa');
  });
  useEffect(() => {
    const t = setTimeout(onLetterStart, 350);
    return () => clearTimeout(t);
  }, [i]);

  const resetLetter = () => {
    const L = live.current;
    L.si = 0;
    L.p = [0, 0];
    L.reached = 0;
    L.misses = 0;
    L.off = false;
    L.done = false;
    L.started = 0;
    p0.set(0);
    p1.set(0);
    gold.set(0);
    setReached(0);
    setMisses(0);
    setDone(false);
    setStars(0);
    setGain(0);
    setMsg(null);
  };

  // ——— dibujar ———
  const scr = (x: number, y: number) => ({ x: live.current.org.x + x * k, y: live.current.org.y + y * k });

  const passDot = (n: number) => {
    const d = M.dots[n];
    sfx(`n${Math.min(8, 1 + (n % 8))}` as Sfx);
    juice.burst(scr(d.x, d.y), 'chispas', 7, 55);
    if (n === M.dots.length - 1 || (M.dots[n + 1] && M.dots[n + 1].s !== d.s && M.dots[n + 1].first)) juice.ring(scr(d.x, d.y), '#FFD54A', 60);
  };

  const slip = () => {
    const L = live.current;
    L.misses += 1;
    setMisses(L.misses);
    sfx('plip');
    juice.shake(4);
    setPose('ups');
    setMsg('Sigue la línea de puntos');
    later(() => setPose((p) => (p === 'ups' ? 'piensa' : p)), 900);
  };

  const finishLetter = () => {
    const L = live.current;
    L.done = true;
    setDone(true);
    tipOn.set(withTiming(0, { duration: 150 }));
    const st = L.misses === 0 ? 3 : L.misses <= 2 ? 2 : 1;
    setStars(st);
    const ok = st >= 2;
    const first = L.counted !== i;
    if (first) {
      L.counted = i;
      score.hit(ok, false);
      onAnswer(ok);
      L.combo = st === 3 ? L.combo + 1 : 0;
    }
    fx.done();
    later(() => fx.sparkle(), 350);
    if (c) later(() => say(letterCall(c)), 450);
    gold.set(withSequence(withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }), withDelay(1400, withTiming(0.92, { duration: 400 }))));
    setShine((s) => s + 1);
    setPose('celebra');
    setJump((j) => j + 1);
    setMsg(null);
    const center = scr(50, 50);
    juice.burst(center, 'estrellas', 22, 170);
    juice.ring(center, '#FFD54A', 160);
    if (feria) {
      const secs = (now() - L.started) / 1000;
      const speed = Math.max(0, Math.min(100, Math.round((16 - secs) * 8)));
      const mult = 1 + 0.25 * Math.min(6, Math.max(0, L.combo - 1));
      const g = Math.round((st * 100 + speed) * mult);
      L.points += g;
      setPoints(L.points);
      setGain(g);
      juice.float(center, `+${g}`, color.azafranHondo, 38);
      if (speed >= 50) later(() => juice.float(scr(50, 70), '¡Rápido!', color.farol, 26), 250);
    } else {
      juice.float(center, st === 3 ? '¡Perfecta!' : st === 2 ? '¡Muy bien!' : '¡Hecha!', color.azafranHondo, 32);
    }
    // lo que sale regular vuelve más tarde
    if (st === 1 && first) {
      if (!feria && L.retried < 1) {
        L.retried += 1;
        setQueue((q) => [...q, ch]);
      } else if (feria && i + 2 < queue.length) {
        setQueue((q) => q.map((x, n) => (n === q.length - 1 ? ch : x)));
      }
    }
  };

  const advance = (fxp: number, fyp: number) => {
    const L = live.current;
    if (L.done) return;
    const st = M.strokes[L.si];
    let p = L.p[L.si];
    const tol = level.tol;
    if (p === 0 && Math.hypot(st.x[0] - fxp, st.y[0] - fyp) > tol * 1.25) {
      if (L.si === 0 && L.reached === 0) setMsg('Empieza por la cabeza: el punto 1');
      return;
    }
    if (!L.started) L.started = now();
    if (L.reached < M.dots.length && M.dots[L.reached].s === L.si && M.dots[L.reached].j === 0 && p === 0) {
      L.reached += 1;
      setReached(L.reached);
      passDot(L.reached - 1);
      setMsg(null);
    }
    let best = -1;
    let bestD = Infinity;
    for (let j = p; j < st.x.length && st.len[j] - st.len[p] <= WINDOW; j++) {
      const d = Math.hypot(st.x[j] - fxp, st.y[j] - fyp);
      if (d < bestD - 0.05) {
        bestD = d;
        best = j;
      }
    }
    if (best > p && bestD <= tol) {
      p = best;
      L.p[L.si] = p;
      progs[L.si].set(p);
      L.off = false;
      while (L.reached < M.dots.length && M.dots[L.reached].s === L.si && M.dots[L.reached].j <= p) {
        L.reached += 1;
        passDot(L.reached - 1);
      }
      setReached(L.reached);
      if (p >= st.x.length - 2) {
        L.p[L.si] = st.x.length - 1;
        progs[L.si].set(st.x.length - 1);
        while (L.reached < M.dots.length && M.dots[L.reached].s === L.si) {
          L.reached += 1;
          passDot(L.reached - 1);
        }
        setReached(L.reached);
        if (L.si < M.strokes.length - 1) {
          L.si += 1;
          fx.pop();
          setMsg('Levanta el dedo: ahora el trazo pequeño');
        } else finishLetter();
      }
      return;
    }
    // ¿se ha salido del camino? (mirando un poco hacia atrás y hacia delante)
    let near = Infinity;
    for (let j = 0; j < st.x.length; j++) {
      if (st.len[j] < st.len[p] - 12) continue;
      if (st.len[j] > st.len[p] + WINDOW) break;
      near = Math.min(near, Math.hypot(st.x[j] - fxp, st.y[j] - fyp));
    }
    if (near > tol * 2.1 && !L.off) {
      L.off = true;
      slip();
    } else if (near <= tol) L.off = false;
  };

  const local = (e: GestureResponderEvent) => {
    const { locationX, locationY, pageX, pageY } = e.nativeEvent;
    live.current.org = { x: pageX - locationX, y: pageY - locationY };
    return { x: locationX, y: locationY };
  };
  const onGrant = (e: GestureResponderEvent) => {
    const p = local(e);
    if (live.current.done) return;
    if (demoOn) {
      // tocar corta la demostración: a escribir
      demo.set(M.demo.total);
      demoFade.set(withTiming(0, { duration: 200 }));
      setDemoOn(false);
      setPose('piensa');
      setMsg(null);
    }
    tx.set(p.x);
    ty.set(p.y);
    tipOn.set(withTiming(1, { duration: 120 }));
    advance(p.x / k, p.y / k);
  };
  const onMove = (e: GestureResponderEvent) => {
    const p = local(e);
    if (live.current.done) return;
    tx.set(p.x);
    ty.set(p.y);
    advance(p.x / k, p.y / k);
  };
  const onRelease = () => {
    tipOn.set(withTiming(0, { duration: 220 }));
    live.current.off = false;
  };

  const next = () => {
    const L = live.current;
    if (L.ended) return;
    if (i + 1 >= queue.length) {
      L.ended = true;
      fx.fanfare();
      juice.banner(feria ? '¡Pluma de oro!' : '¡Qué buena letra!', feria ? `${L.points} puntos` : undefined, color.azafranHondo);
      juice.burst(undefined, 'petalos', 26, 180);
      later(() => onDone(score.result(feria ? L.points : undefined)), 1500);
      return;
    }
    if (feria && (i + 1) % PER_LEVEL === 0) {
      const nl = LEVELS[Math.min(LEVELS.length - 1, (i + 1) / PER_LEVEL)];
      fx.levelup();
      juice.banner(`¡Nivel ${Math.floor((i + 1) / PER_LEVEL) + 1}!`, nl.name, color.farol);
    }
    resetLetter();
    setI(i + 1);
  };

  const retry = () => {
    resetLetter();
    if (level.demo) later(playDemo, 200);
  };

  const nextDot = M.dots[reached];
  const dotState = (n: number): DotState => (n < reached ? 'lit' : n === reached && !done ? 'next' : 'idle');

  return (
    <View style={styles.root}>
      <Backdrop scene="templo" />
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <GameTitle title="Une los puntos" sub={feria ? `Letra ${i + 1} de ${queue.length} · ${level.name}` : 'Empieza por la cabeza y sigue los números.'} />
        </View>
        {feria ? (
          <Pop trigger={points}>
            <View style={styles.points}>
              <Icon name="star" size={18} color={color.buatongHondo} />
              <Txt v="num" style={{ fontSize: 20 }}>
                {points}
              </Txt>
            </View>
          </Pop>
        ) : null}
        <ComboBadge combo={score.combo} />
      </View>

      <View style={styles.center}>
        <View style={{ width: S + 24, height: S + 24 }}>
          <Frame S={S} />
          <Animated.View style={[styles.paper, { width: S, height: S }, juice.shakeStyle]}>
            <Paper S={S} base={M.base} xh={M.xh} />
            {level.ghost || done ? (
              <Svg width={S} height={S} viewBox="0 0 100 100" style={StyleSheet.absoluteFill} pointerEvents="none">
                <Path d={M.glyph} fill="#7A4618" fillOpacity={0.1} stroke="#7A4618" strokeOpacity={0.35} strokeWidth={0.45} strokeDasharray="1.4 1.2" />
              </Svg>
            ) : null}
            <GoldGlyph key={`g${i}`} glyph={M.glyph} S={S} on={gold} />
            <Svg width={S} height={S} style={StyleSheet.absoluteFill} pointerEvents="none">
              {demoOn ? <DemoTrail model={M} demo={demo} fade={demoFade} k={k} /> : null}
              {M.strokes.map((st, s) => (
                <Ink key={`${i}-${s}`} st={st} prog={progs[s]} k={k} />
              ))}
            </Svg>
            {!done
              ? M.dots.map((d, n) => <Dot key={`${i}-${n}`} x={d.x * k} y={d.y * k} n={n + 1} state={dotState(n)} num={level.numbers} first={d.first} />)
              : null}
            {demoOn ? <Comet model={M} demo={demo} fade={demoFade} k={k} /> : null}
            <Tip tx={tx} ty={ty} on={tipOn} />
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Shine trigger={shine} />
            </View>
            <View
              accessible
              accessibilityLabel={c ? `Hoja para escribir la letra ${c.ch}, ${c.meaning}. Empieza por el punto 1.` : 'Hoja para escribir'}
              style={StyleSheet.absoluteFill}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={onGrant}
              onResponderMove={onMove}
              onResponderRelease={onRelease}
              onResponderTerminate={onRelease}
            />
          </Animated.View>
          {msg && !done ? (
            <Animated.View key={msg} entering={FadeInDown.springify().damping(14)} pointerEvents="none" style={styles.msg}>
              <Txt v="small" style={{ color: '#FFFFFF' }}>
                {msg}
              </Txt>
            </Animated.View>
          ) : null}
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.infoRow}>
          <Noi pose={pose} size={84} jump={jump} />
          <View style={styles.card}>
            <View style={styles.cardEmoji}>
              <Text style={styles.emoji}>{LETTER_EMOJI[ch] ?? '✨'}</Text>
            </View>
            <View style={{ flex: 1, gap: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Th size={24} bold>
                  {ch}
                </Th>
                <Th size={20}>{c?.name}</Th>
              </View>
              {c ? <Rom rom={c.nameRom} size={14} /> : null}
              <Txt v="small" numberOfLines={1}>
                {c?.meaning}
              </Txt>
            </View>
            <Press3D onPress={() => c && say(letterCall(c))} style={styles.speak} accessibilityLabel="Escuchar el nombre de la letra">
              <View style={styles.speakFace}>
                <Icon name="speaker" size={20} color="#FFFFFF" />
              </View>
            </Press3D>
          </View>
        </View>

        {done ? (
          <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.doneRow}>
            <View style={styles.stars}>
              {[0, 1, 2].map((n) => (
                <Animated.View key={n} entering={ZoomIn.delay(150 + n * 180).springify().damping(7)}>
                  <Icon name="star" size={30} color={n < stars ? color.buatong : color.niebla3} />
                </Animated.View>
              ))}
              {feria && gain ? (
                <Txt v="num" style={{ marginLeft: 8, color: color.azafranHondo }}>
                  +{gain}
                </Txt>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!feria ? <Btn v="ghost" label="Otra vez" style={{ flex: 1 }} onPress={retry} icon={<Icon name="refresh" size={18} color={color.tinta} />} /> : null}
              <Btn label={i + 1 >= queue.length ? 'Terminar' : 'Siguiente'} style={{ flex: 1.4 }} onPress={next} />
            </View>
          </Animated.View>
        ) : (
          <View style={styles.toolRow}>
            <Txt v="small" style={{ flex: 1 }}>
              {nextDot ? (reached === 0 ? 'Pon el dedo en el punto 1.' : level.numbers ? `Ahora hacia el ${reached + 1}.` : 'Sigue el trazo.') : ''}
              {misses ? `  ·  Fuera: ${misses}` : ''}
            </Txt>
            {level.demo || !feria ? <Btn v="ghost" label="Ver" height={40} style={{ width: 92 }} onPress={() => !demoOn && playDemo()} icon={<Icon name="play" size={16} color={color.tinta} />} /> : null}
            <Btn v="ghost" label="Borrar" height={40} style={{ width: 108 }} onPress={resetLetter} icon={<Icon name="refresh" size={16} color={color.tinta} />} />
          </View>
        )}
      </View>
      {juice.layer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'visible' },
  center: { alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  points: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 10, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 2, borderColor: color.buatong },
  paper: { position: 'absolute', left: 12, top: 12, borderRadius: 16, overflow: 'hidden' },
  comet: { position: 'absolute', left: 0, top: 0, width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  tip: { position: 'absolute', left: 0, top: 0, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tipCore: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  bead: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'hidden' },
  beadIdle: { backgroundColor: '#F4DDB5', borderColor: '#B98652' },
  beadFirst: { backgroundColor: color.arrozalVivo, borderColor: color.arrozalHondo },
  beadNext: { backgroundColor: color.azafran, borderColor: color.azafranHondo },
  beadLit: { backgroundColor: '#FFC531', borderColor: '#FFF3B0' },
  beadShine: { position: 'absolute', top: 2, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.6)' },
  beadNum: { fontFamily: font.uiHeavy, includeFontPadding: false, textAlign: 'center' },
  msg: { position: 'absolute', left: 20, right: 20, bottom: 18, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: 'rgba(62,20,20,0.82)' },
  bottom: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 18, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 2, borderColor: '#F3C98B' },
  cardEmoji: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.azafranSuave, borderWidth: 2, borderColor: color.azafran, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26, lineHeight: 32, textAlign: 'center' },
  speak: { width: 46, height: 46 },
  speakFace: { flex: 1, borderRadius: 16, backgroundColor: color.cielo, borderBottomWidth: 4, borderBottomColor: color.cieloHondo, alignItems: 'center', justifyContent: 'center' },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneRow: { gap: 10 },
  stars: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
});
