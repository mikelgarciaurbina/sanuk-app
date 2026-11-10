// Cueva de las letras: una cueva a oscuras, la linterna de Noi y letras talladas en la roca que brillan cuando les
// da la luz. Busca la consonante que te piden (ก ไก่…): al encontrarla los cristales chisporrotean, suena su nombre
// y vuela a tu colección. En la feria, tres galerías cada vez más hondas y una pila que se gasta: cada letra la recarga.
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import type { NoiPose } from '@/brand/noi-art';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Rom, Th, Txt } from '@/components/ui';
import { COMMON_LETTERS, LETTER_EMOJI, LETTER_SETS, consonantOf, letterCall, lookalikesOf } from '@/content/letters';
import type { Consonant } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { Countdown, Glow, Pop, Press3D, useGameFrame, useJuice } from './fx';
import { ComboBadge, useScore } from './kit';
import { seeded, useClock, usePulse, useSvgId } from './letras/anim';
import type { GameProps } from './types';

// ——— Galerías ———

type Palette = { top: string; bottom: string; slabs: string[]; edge: string; crack: string; gem: string; deep: string; mica: string };
const WALLS: Palette[] = [
  { top: '#3B4683', bottom: '#20265A', slabs: ['#3D478A', '#36407E', '#2F3872', '#46509A'], edge: '#7B86D2', crack: '#141833', gem: '#6FF3E4', deep: '#168A9A', mica: '#CFE2FF' },
  { top: '#4C3B8C', bottom: '#251A55', slabs: ['#4E3D90', '#463683', '#3D2E77', '#5A479E'], edge: '#A88CF0', crack: '#170F33', gem: '#D7B0FF', deep: '#6A3FB0', mica: '#F2DEFF' },
  { top: '#22606E', bottom: '#0E2F39', slabs: ['#256571', '#205864', '#1B4B56', '#2C7180'], edge: '#5FC4C9', crack: '#081A20', gem: '#7CFFB2', deep: '#1F9A5E', mica: '#D2FFEC' },
];

type Level = { n: number; R: number; dark: number; name: string; show: 'all' | 'rom' | 'meaning'; wall: number; size: number };
const LEVELS: Level[] = [
  { n: 6, R: 116, dark: 0.94, name: 'La entrada', show: 'all', wall: 0, size: 44 },
  { n: 8, R: 102, dark: 0.95, name: 'Galería de cristales', show: 'rom', wall: 1, size: 40 },
  { n: 10, R: 90, dark: 0.96, name: 'La cámara profunda', show: 'meaning', wall: 2, size: 38 },
];
const LESSON: Level = { n: 6, R: 124, dark: 0.91, name: '', show: 'all', wall: 0, size: 46 };

const FERIA_LETTERS = 12;
const PER_LEVEL = 4;
const FERIA_SECONDS = 80;
const RECHARGE = 3;
const BOTTOM = 116;
const LIFT = 26;
const HIT = 40;
const MARGIN = 34;

type Pt = { x: number; y: number };
type Spot = { ch: string; x: number; y: number };
type Round = { id: number; target: string; spots: Spot[]; gem: Pt | null };

// ——— Rondas ———

/** Puntos repartidos sin que se toquen (coordenadas 0–1; `aspect` = ancho / alto del campo). */
function scatter(n: number, aspect: number): Pt[] {
  let minD = 0.95 * Math.sqrt(aspect / n);
  for (let attempt = 0; attempt < 12; attempt++) {
    const pts: Pt[] = [];
    for (let k = 0; k < n * 60 && pts.length < n; k++) {
      const p = { x: Math.random(), y: Math.random() };
      if (pts.every((q) => Math.hypot((p.x - q.x) * aspect, p.y - q.y) >= minD)) pts.push(p);
    }
    if (pts.length === n) return pts;
    minD *= 0.9;
  }
  return Array.from({ length: n }, (_, k) => ({ x: ((k % 3) + 0.5) / 3, y: (Math.floor(k / 3) + 0.5) / Math.ceil(n / 3) }));
}

function makeRound(target: string, pool: string[], n: number, gem: boolean, aspect: number): Round {
  const chosen = new Set<string>([target]);
  for (const c of shuffle(lookalikesOf(target).filter((c) => COMMON_LETTERS.includes(c) || pool.includes(c))).slice(0, 2)) chosen.add(c);
  for (const c of shuffle(pool)) if (chosen.size < Math.ceil(n * 0.7)) chosen.add(c);
  for (const c of shuffle(COMMON_LETTERS)) if (chosen.size < n) chosen.add(c);
  const list = shuffle([...chosen]);
  const pts = scatter(list.length + (gem ? 1 : 0), aspect);
  return { id: Date.now() + Math.random(), target, spots: list.map((ch, k) => ({ ch, ...pts[k] })), gem: gem ? pts[list.length] : null };
}

function makePlan(pool: string[], total: number): string[] {
  const out: string[] = [];
  while (out.length < total) out.push(...shuffle(pool).filter((c) => c !== out[out.length - 1]));
  return out.slice(0, total);
}

/** Reloj (fuera del componente: el compilador de React no deja llamar a Date.now() en el cuerpo). */
const now = () => Date.now();

const callOf = (ch: string) => {
  const c = consonantOf(ch);
  return c ? letterCall(c) : ch;
};

// ——— La pared de roca ———

type WallArt = { stones: { d: string; hi: string; shade: number }[]; cracks: string[]; mica: { x: number; y: number; r: number; o: number }[]; outline: string };

function makeWall(w: number, h: number, seed: number): WallArt {
  const r = seeded(seed);
  const f = (p: Pt) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  const cols = Math.max(3, Math.round(w / 88));
  const rows = Math.max(4, Math.round(h / 78));
  const cw = w / cols;
  const rh = h / rows;
  const V = Array.from({ length: rows + 1 }, (_, j) =>
    Array.from({ length: cols + 1 }, (_, i) => ({
      x: i * cw + (i > 0 && i < cols ? (r() - 0.5) * cw * 0.55 : 0),
      y: j * rh + (j > 0 && j < rows ? (r() - 0.5) * rh * 0.55 : 0),
    })),
  );
  const stones: WallArt['stones'] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const q = [V[j][i], V[j][i + 1], V[j + 1][i + 1], V[j + 1][i]];
      const cx = q.reduce((s, p) => s + p.x, 0) / 4;
      const cy = q.reduce((s, p) => s + p.y, 0) / 4;
      const c = q.map((p) => ({ x: p.x + (cx - p.x) * 0.08, y: p.y + (cy - p.y) * 0.08 }));
      const m = c.map((p, k) => ({ x: (p.x + c[(k + 1) % 4].x) / 2, y: (p.y + c[(k + 1) % 4].y) / 2 }));
      stones.push({
        d: `M${f(m[0])} Q${f(c[1])} ${f(m[1])} Q${f(c[2])} ${f(m[2])} Q${f(c[3])} ${f(m[3])} Q${f(c[0])} ${f(m[0])} Z`,
        hi: `M${f(m[3])} Q${f(c[0])} ${f(m[0])}`,
        shade: Math.floor(r() * 4),
      });
    }
  const cracks = Array.from({ length: 6 }, () => {
    let x = r() * w;
    let y = r() * h;
    let d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
    for (let k = 0; k < 4; k++) {
      x += (r() - 0.5) * 36;
      y += 8 + r() * 20;
      d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    return d;
  });
  const mica = Array.from({ length: 40 }, () => ({ x: r() * w, y: r() * h, r: 0.8 + r() * 1.7, o: 0.3 + r() * 0.6 }));
  const top: Pt[] = Array.from({ length: 10 }, (_, k) => ({ x: (k / 9) * w, y: 4 + r() * 16 }));
  const bottom: Pt[] = Array.from({ length: 8 }, (_, k) => ({ x: w - (k / 7) * w, y: h - r() * 8 }));
  const outline = `M${f(top[0])} ${top
    .slice(1)
    .map((p) => `L${f(p)}`)
    .join(' ')} L${f({ x: w - 2 - r() * 6, y: h * 0.5 })} ${bottom.map((p) => `L${f(p)}`).join(' ')} L${f({ x: 2 + r() * 6, y: h * 0.5 })} Z`;
  return { stones, cracks, mica, outline };
}

function Wall({ x, y, w, h, pal, seed }: { x: number; y: number; w: number; h: number; pal: Palette; seed: number }) {
  const id = useSvgId('wall');
  const [art] = useState(() => makeWall(w, h, seed));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={pal.top} />
            <Stop offset="1" stopColor={pal.bottom} />
          </LinearGradient>
          <ClipPath id={`${id}c`}>
            <Path d={art.outline} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${id}c)`}>
          <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}g)`} />
          {art.stones.map((s, k) => (
            <Path key={k} d={s.d} fill={pal.slabs[s.shade]} />
          ))}
          {art.stones.map((s, k) => (
            <Path key={`h${k}`} d={s.hi} stroke={pal.edge} strokeWidth={2.2} strokeOpacity={0.45} strokeLinecap="round" fill="none" />
          ))}
          {art.cracks.map((d, k) => (
            <Path key={`c${k}`} d={d} stroke={pal.crack} strokeWidth={1.6} strokeOpacity={0.8} fill="none" />
          ))}
          {art.mica.map((m, k) => (
            <Circle key={`m${k}`} cx={m.x} cy={m.y} r={m.r} fill={pal.mica} opacity={m.o} />
          ))}
        </G>
        <Path d={art.outline} stroke={pal.crack} strokeWidth={4} fill="none" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

// ——— Letras talladas: oscuras en la roca, doradas bajo la luz ———

function Carved({ ch, x, y, size, R, rs, lx, ly, pal }: { ch: string; x: number; y: number; size: number; R: number; rs: SharedValue<number>; lx: SharedValue<number>; ly: SharedValue<number>; pal: Palette }) {
  const box = size * 2;
  const glow = useAnimatedStyle(() => {
    const r = R * rs.value;
    const d = Math.hypot(lx.value - x, ly.value - y);
    const k = Math.min(1, Math.max(0, (r * 0.92 - d) / (r * 0.55)));
    return { opacity: k, transform: [{ scale: 0.94 + 0.1 * k }] };
  });
  return (
    <View pointerEvents="none" style={[styles.center, { position: 'absolute', left: x - box / 2, top: y - box / 2, width: box, height: box }]}>
      <Text style={[styles.thai, { fontSize: size, lineHeight: size * 1.5, color: pal.bottom, textShadowColor: 'rgba(255,255,255,0.2)', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 0.5 }]}>{ch}</Text>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, glow]}>
        <Glow size={box} tint={pal.gem} strength={0.42} pulse={false} style={{ position: 'absolute' }} />
        <Text style={[styles.thai, { fontSize: size, lineHeight: size * 1.5, color: '#FFF3C9', textShadowColor: '#FFB300', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 }]}>{ch}</Text>
      </Animated.View>
    </View>
  );
}

/** Gema dorada escondida (bonus de la feria): brilla al iluminarla. */
function HiddenGem({ x, y, R, rs, lx, ly }: { x: number; y: number; R: number; rs: SharedValue<number>; lx: SharedValue<number>; ly: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const d = Math.hypot(lx.value - x, ly.value - y);
    const k = Math.min(1, Math.max(0.12, (R * rs.value * 0.9 - d) / (R * 0.5)));
    return { opacity: k, transform: [{ scale: 0.85 + 0.2 * k }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.center, { position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60 }, st]}>
      <Glow size={70} tint="#FFD45C" strength={0.6} style={{ position: 'absolute' }} />
      <Crystal size={38} tint="#FFD45C" deep="#C27C00" />
    </Animated.View>
  );
}

// ——— Luz: oscuridad con un agujero, haz desde la frente de Noi y polvo dentro ———

function Darkness({ w, h, top, R, alpha, rs, lx, ly }: { w: number; h: number; top: number; R: number; alpha: number; rs: SharedValue<number>; lx: SharedValue<number>; ly: SharedValue<number> }) {
  const id = useSvgId('dark');
  const hw = w * 1.3;
  const hh = (h + top) * 1.3;
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: lx.value }, { translateY: ly.value }, { scale: rs.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -hw, top: -hh, width: hw * 2, height: hh * 2 }, st]}>
      <Svg width={hw * 2} height={hh * 2}>
        <Defs>
          <RadialGradient id={id} cx={hw} cy={hh} r={R * 1.6} fx={hw} fy={hh} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFE9B5" stopOpacity={0.16} />
            <Stop offset="0.4" stopColor="#FFE0A0" stopOpacity={0.02} />
            <Stop offset="0.62" stopColor="#05060F" stopOpacity={alpha * 0.5} />
            <Stop offset="0.8" stopColor="#04050D" stopOpacity={alpha * 0.88} />
            <Stop offset="1" stopColor="#03040A" stopOpacity={alpha} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={hw * 2} height={hh * 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

function Beam({ ox, oy, R, lx, ly, clock }: { ox: number; oy: number; R: number; lx: SharedValue<number>; ly: SharedValue<number>; clock: SharedValue<number> }) {
  const id = useSvgId('beam');
  const H0 = 200;
  const WB = R * 1.7;
  const st = useAnimatedStyle(() => {
    const dx = lx.value - ox;
    const dy = ly.value - oy;
    const dist = Math.max(24, Math.hypot(dx, dy));
    const flicker = 0.9 + 0.1 * Math.sin(clock.value * 61) * Math.sin(clock.value * 23);
    return {
      opacity: flicker,
      transform: [{ translateX: (ox + lx.value) / 2 }, { translateY: (oy + ly.value) / 2 }, { rotate: `${Math.atan2(dx, -dy)}rad` }, { scaleY: dist / H0 }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -WB / 2, top: -H0 / 2, width: WB, height: H0 }, st]}>
      <Svg width={WB} height={H0}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#FFF6D6" stopOpacity={0.38} />
            <Stop offset="0.55" stopColor="#FFE7A0" stopOpacity={0.13} />
            <Stop offset="1" stopColor="#FFE7A0" stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Path d={`M${WB / 2 - 5} ${H0} L${WB / 2 + 5} ${H0} L${WB * 0.82} 0 L${WB * 0.18} 0 Z`} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

type MoteSpec = { ax: number; ay: number; f: number; ph: number; s: number };

function Dust({ R, lx, ly, clock }: { R: number; lx: SharedValue<number>; ly: SharedValue<number>; clock: SharedValue<number> }) {
  const [motes] = useState<MoteSpec[]>(() => Array.from({ length: 10 }, () => ({ ax: 0.2 + Math.random() * 0.55, ay: 0.2 + Math.random() * 0.5, f: 0.6 + Math.random() * 0.9, ph: Math.random() * 6, s: 1.6 + Math.random() * 2.2 })));
  return (
    <>
      {motes.map((m, k) => (
        <Mote key={k} m={m} R={R} lx={lx} ly={ly} clock={clock} />
      ))}
    </>
  );
}

function Mote({ m, R, lx, ly, clock }: { m: MoteSpec; R: number; lx: SharedValue<number>; ly: SharedValue<number>; clock: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const a = (clock.value * m.f + m.ph) * Math.PI * 2;
    return {
      opacity: 0.2 + 0.6 * Math.abs(Math.sin(a * 0.7)),
      transform: [{ translateX: lx.value + Math.sin(a) * m.ax * R }, { translateY: ly.value + Math.cos(a * 0.8 + m.ph) * m.ay * R }],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.mote, { left: -m.s / 2, top: -m.s / 2, width: m.s, height: m.s, borderRadius: m.s }, st]} />;
}

/** Gusanos de luz del techo de la cueva: puntitos que titilan por encima de la oscuridad. */
function GlowWorms({ w, h, top, clock }: { w: number; h: number; top: number; clock: SharedValue<number> }) {
  const [list] = useState(() => Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), s: 2 + Math.random() * 2.5, f: 0.3 + Math.random() * 0.8, ph: Math.random() * 6 })));
  return (
    <>
      {list.map((g, k) => (
        <Worm key={k} x={g.x * w} y={-top + g.y * (h * 0.22 + top)} s={g.s} f={g.f} ph={g.ph} clock={clock} />
      ))}
    </>
  );
}

function Worm({ x, y, s, f, ph, clock }: { x: number; y: number; s: number; f: number; ph: number; clock: SharedValue<number> }) {
  const st = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * Math.max(0, Math.sin((clock.value * f + ph) * Math.PI * 2)) }));
  return <Animated.View pointerEvents="none" style={[styles.worm, { left: x, top: y, width: s, height: s, borderRadius: s }, st]} />;
}

// ——— Cristales ———

function Crystal({ size, tint, deep, children }: { size: number; tint: string; deep: string; children?: ReactNode }) {
  const id = useSvgId('cry');
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 40 40" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0.1" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
            <Stop offset="0.38" stopColor={tint} />
            <Stop offset="1" stopColor={deep} />
          </LinearGradient>
        </Defs>
        <Path d="M20 1.5 L35.5 10.5 L35.5 29.5 L20 38.5 L4.5 29.5 L4.5 10.5 Z" fill={`url(#${id})`} stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={1.3} strokeLinejoin="round" />
        <Path d="M20 1.5 L20 38.5 M4.5 10.5 L35.5 29.5 M35.5 10.5 L4.5 29.5" stroke="#FFFFFF" strokeOpacity={0.16} strokeWidth={1} />
        <Path d="M9 11.5 L17.5 6.5" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={2.2} strokeLinecap="round" />
      </Svg>
      {children}
    </View>
  );
}

function CrystalCluster({ tint, deep, flip }: { tint: string; deep: string; flip?: boolean }) {
  const id = useSvgId('cl');
  return (
    <Svg width={92} height={70} viewBox="0 0 92 70" style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
          <Stop offset="0.35" stopColor={tint} />
          <Stop offset="1" stopColor={deep} />
        </LinearGradient>
      </Defs>
      <Path d="M8 70 L18 30 L28 70 Z" fill={`url(#${id})`} opacity={0.85} />
      <Path d="M24 70 L40 6 L54 70 Z" fill={`url(#${id})`} />
      <Path d="M48 70 L62 26 L74 70 Z" fill={`url(#${id})`} opacity={0.9} />
      <Path d="M68 70 L78 44 L88 70 Z" fill={`url(#${id})`} opacity={0.8} />
      <Path d="M40 6 L44 70 M18 30 L20 70 M62 26 L64 70" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.2} />
    </Svg>
  );
}

// ——— Lo que vuela a la colección ———

function Flyer({ ch, from, to, pal }: { ch: string; from: Pt; to: Pt; pal: Palette }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 720, easing: Easing.inOut(Easing.cubic) });
  }, [p]);
  const st = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: t > 0.96 ? (1 - t) * 25 : 1,
      transform: [
        { translateX: from.x + (to.x - from.x) * t },
        { translateY: from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 110 },
        { scale: 1.7 - 1.0 * t },
        { rotate: `${Math.sin(t * Math.PI) * 28}deg` },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.flyer, st]}>
      <Glow size={96} tint={pal.gem} strength={0.7} style={{ position: 'absolute' }} />
      <Crystal size={50} tint={pal.gem} deep={pal.deep}>
        <Text style={[styles.thai, styles.gemText, { fontSize: 22, lineHeight: 33 }]}>{ch}</Text>
      </Crystal>
    </Animated.View>
  );
}

function Slot({ ch, x, y, size, pal }: { ch?: string; x: number; y: number; size: number; pal: Palette }) {
  return (
    <View pointerEvents="none" style={[styles.center, { position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }]}>
      <View style={[styles.socket, { width: size * 0.86, height: size * 0.86, borderRadius: size }]} />
      {ch ? (
        <Animated.View entering={ZoomIn.springify().damping(9)} style={StyleSheet.absoluteFill}>
          <Crystal size={size} tint={pal.gem} deep={pal.deep}>
            <Text style={[styles.thai, styles.gemText, { fontSize: size * 0.42, lineHeight: size * 0.64 }]}>{ch}</Text>
          </Crystal>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Brillo débil de la letra buscada que se ve a través de la oscuridad (pista). */
function Glimmer({ x, y, tint }: { x: number; y: number; tint: string }) {
  const p = usePulse(900);
  const st = useAnimatedStyle(() => ({ opacity: 0.25 + 0.55 * p.value, transform: [{ scale: 0.9 + 0.2 * p.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.center, { position: 'absolute', left: x - 50, top: y - 50, width: 100, height: 100 }, st]}>
      <Glow size={100} tint={tint} strength={0.55} pulse={false} />
    </Animated.View>
  );
}

// ——— Tarjeta de lo que hay que buscar ———

function Prompt({ c, show, onSpeak }: { c: Consonant; show: Level['show']; onSpeak: () => void }) {
  return (
    <View style={styles.prompt}>
      <View style={styles.promptShine} />
      <View style={styles.medal}>
        <Text style={styles.emoji}>{LETTER_EMOJI[c.ch] ?? '✨'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Txt v="eyebrow" style={{ color: '#AEB8EC' }}>
          Busca la letra de
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8 }}>
          {show === 'all' ? (
            <Th size={26} bold style={{ color: '#FFF1C4' }}>
              {c.name}
            </Th>
          ) : null}
          {show !== 'meaning' ? <Rom rom={c.nameRom} mono="#FFD98A" size={15} /> : null}
        </View>
        <Txt v="bodyStrong" style={{ color: '#FFFFFF' }} numberOfLines={1}>
          {c.meaning}
        </Txt>
      </View>
      <Press3D onPress={onSpeak} style={styles.speak} accessibilityLabel="Escuchar el nombre de la letra">
        <View style={styles.speakFace}>
          <Icon name="speaker" size={24} color="#FFFFFF" />
        </View>
      </Press3D>
    </View>
  );
}

/** La pila de la linterna (el tiempo de la feria). */
function Battery({ value, low }: { value: number; low: boolean }) {
  const p = usePulse(420, low);
  const st = useAnimatedStyle(() => ({ opacity: 1 - 0.45 * p.value }));
  const fill = low ? color.laca : value < 0.45 ? color.buatong : color.arrozalVivo;
  return (
    <Animated.View style={[styles.battery, st]}>
      <View style={[styles.batteryFill, { width: `${Math.max(4, Math.min(100, value * 100))}%`, backgroundColor: fill }]}>
        <View style={styles.batteryShine} />
      </View>
      <View style={styles.batteryCap} />
    </Animated.View>
  );
}

// ——— El juego ———

type Mark = { id: number; x: number; y: number };
type Info = { id: number; ch: string; x: number; y: number };
type Fly = { id: number; ch: string; from: Pt; to: Pt };

export default function Cueva({ mode, extra, rounds = 4, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const frame = useGameFrame();
  const clock = useClock(9000);
  const setName = extra?.kind === 'letras' && LETTER_SETS[extra.set] ? extra.set : 'media';
  const pool = LETTER_SETS[setName];
  const baseTotal = feria ? FERIA_LETTERS : Math.max(1, rounds);

  const [queue, setQueue] = useState<string[]>(() => makePlan(pool, baseTotal));
  const [round, setRound] = useState<Round>(() => makeRound(queue[0], pool, (feria ? LEVELS[0] : LESSON).n, false, 0.75));
  const [level, setLevel] = useState(0);
  const [phase, setPhase] = useState<'count' | 'play' | 'end'>(feria ? 'count' : 'play');
  const win = useWindowDimensions();
  // tamaño provisional (la ventana menos la cabecera) hasta que llegue el onLayout
  const [box, setBox] = useState({ w: win.width, h: Math.max(420, win.height - 70 - frame.top) });
  const [measured, setMeasured] = useState(false);
  const [topH, setTopH] = useState(150);
  const [found, setFound] = useState<{ ch: string; wall: number }[]>([]);
  const [points, setPoints] = useState(0);
  const [secs, setSecs] = useState(FERIA_SECONDS);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [info, setInfo] = useState<Info | null>(null);
  const [hint, setHint] = useState(false);
  const [gemTaken, setGemTaken] = useState(false);
  const [fly, setFly] = useState<Fly | null>(null);
  const [pose, setPose] = useState<NoiPose>('escucha');
  const [jump, setJump] = useState(0);

  const lv = feria ? LEVELS[level] : LESSON;
  const pal = WALLS[lv.wall];
  const consonant = consonantOf(round.target);
  const total = queue.length;

  const lx = useSharedValue(0);
  const ly = useSharedValue(0);
  const rs = useSharedValue(1);

  const live = useRef({
    t0: 0,
    x0: 0,
    y0: 0,
    moved: false,
    busy: false,
    answered: false,
    wrong: 0,
    roundStart: 0,
    deadline: 0,
    ended: false,
    dead: false,
    org: { x: 0, y: 0 },
    points: 0,
    perfect: true,
    requeued: 0,
    low: false,
    seq: 0,
    timers: [] as ReturnType<typeof setTimeout>[],
  });

  // ——— geometría (en píxeles del contenedor del juego) ———
  const W = box.w;
  const H = box.h;
  const fy = topH + 4;
  const fh = Math.max(160, H - BOTTOM - fy);
  const posOf = (s: Pt): Pt => ({ x: MARGIN + s.x * (W - 2 * MARGIN), y: fy + MARGIN * 0.8 + s.y * (fh - MARGIN * 1.7) });
  const noi = { x: 4, y: H - BOTTOM + 14, size: 100 };
  const lamp = { x: noi.x + noi.size * 0.5, y: noi.y + noi.size * 0.12 };
  const slots = (() => {
    const n = feria ? FERIA_LETTERS : total;
    const perRow = feria ? 6 : n;
    const size = feria ? 30 : Math.min(46, (W - 130) / Math.max(1, n));
    const gap = size + (feria ? 5 : 6);
    const rowsN = Math.ceil(n / perRow);
    const x0 = 120;
    const y0 = H - BOTTOM / 2 + 8 - ((rowsN - 1) * gap) / 2;
    return { size, at: (k: number): Pt => ({ x: x0 + (k % perRow) * gap + size / 2, y: y0 + Math.floor(k / perRow) * gap }), n };
  })();
  /** Dónde se enciende la linterna al empezar una ronda: lejos de la letra buscada. */
  const startLight = (r: Round, R: number): Pt => {
    const t = r.spots.find((s) => s.ch === r.target);
    const tp = t ? posOf(t) : { x: -999, y: -999 };
    const cands = [
      { x: W * 0.5, y: fy + fh * 0.8 },
      { x: W * 0.22, y: fy + fh * 0.75 },
      { x: W * 0.78, y: fy + fh * 0.75 },
      { x: W * 0.5, y: fy + fh * 0.45 },
      { x: W * 0.2, y: fy + fh * 0.3 },
      { x: W * 0.8, y: fy + fh * 0.3 },
    ];
    return cands.find((c) => Math.hypot(c.x - tp.x, c.y - tp.y) > R * 1.5) ?? cands.reduce((a, b) => (Math.hypot(b.x - tp.x, b.y - tp.y) > Math.hypot(a.x - tp.x, a.y - tp.y) ? b : a));
  };

  const later = (fn: () => void, ms: number) => {
    const L = live.current;
    const t = setTimeout(() => {
      if (!L.dead) fn();
    }, ms);
    L.timers.push(t);
  };

  useEffect(() => {
    const L = live.current;
    L.dead = false;
    return () => {
      L.dead = true;
      L.timers.forEach(clearTimeout);
    };
  }, []);

  // ——— ritmo de cada ronda ———
  const speakTarget = (ch: string) => {
    say(callOf(ch));
    setPose('escucha');
    later(() => setPose((p) => (p === 'escucha' ? 'piensa' : p)), 1600);
  };

  const begin = (r: Round) => {
    const L = live.current;
    L.seq += 1;
    const seq = L.seq;
    L.busy = false;
    L.answered = false;
    L.wrong = 0;
    L.roundStart = now();
    setRound(r);
    setHint(false);
    setMarks([]);
    setInfo(null);
    setGemTaken(false);
    const s = startLight(r, (feria ? LEVELS[level] : LESSON).R);
    lx.set(withTiming(s.x, { duration: 650, easing: Easing.out(Easing.cubic) }));
    ly.set(withTiming(s.y, { duration: 650, easing: Easing.out(Easing.cubic) }));
    later(() => speakTarget(r.target), 380);
    if (!feria) later(() => live.current.seq === seq && !live.current.busy && setHint(true), 16000);
  };

  const lightToStart = () => {
    const s = startLight(round, lv.R);
    lx.set(withTiming(s.x, { duration: 650, easing: Easing.out(Easing.cubic) }));
    ly.set(withTiming(s.y, { duration: 650, easing: Easing.out(Easing.cubic) }));
  };

  const intro = useEffectEvent(() => {
    lightToStart();
    if (!feria) speakTarget(round.target);
  });
  useEffect(() => {
    if (!measured) return;
    const t = setTimeout(intro, 450);
    return () => clearTimeout(t);
  }, [measured]);

  const go = () => {
    const L = live.current;
    L.deadline = now() + FERIA_SECONDS * 1000;
    L.roundStart = now();
    setPhase('play');
    lightToStart();
    speakTarget(round.target);
  };

  // ——— final ———
  const finish = (why: 'done' | 'time') => {
    const L = live.current;
    if (L.ended) return;
    L.ended = true;
    setPhase('end');
    rs.set(withTiming(why === 'time' ? 0.6 : 3.5, { duration: why === 'time' ? 900 : 1600, easing: Easing.inOut(Easing.cubic) }));
    if (feria) {
      const left = Math.max(0, Math.ceil((L.deadline - now()) / 1000));
      const bonus = why === 'done' ? left * 5 : 0;
      L.points += bonus;
      setPoints(L.points);
      fx.fanfare();
      juice.banner(why === 'done' ? '¡Cueva explorada!' : '¡Se acabó la pila!', bonus ? `+${bonus} por la pila que sobra` : `${L.points} puntos`, color.buatong);
      juice.burst(undefined, 'confeti', 30, 190);
      later(() => onDone(score.result(L.points)), 1900);
    } else {
      fx.done();
      juice.banner('¡Cueva explorada!', 'Todas las letras, a salvo', color.buatong);
      juice.burst(undefined, 'chispas', 26, 170);
      later(() => onDone(score.result()), 1500);
    }
  };

  // ——— la pila (feria) ———
  const tick = useEffectEvent(() => {
    const L = live.current;
    if (L.ended) return;
    const left = Math.max(0, Math.ceil((L.deadline - now()) / 1000));
    setSecs(left);
    const low = left <= 12;
    if (low !== L.low) {
      L.low = low;
      rs.set(low ? withRepeat(withSequence(withTiming(0.86, { duration: 90 }), withTiming(0.97, { duration: 160 }), withTiming(0.9, { duration: 70 }), withTiming(1, { duration: 420 })), -1, false) : withTiming(1, { duration: 300 }));
    }
    if (left <= 5 && left > 0) fx.tick();
    if (left <= 0) finish('time');
  });
  useEffect(() => {
    if (!feria || phase !== 'play') return;
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [feria, phase]);

  // ——— toques ———
  const scr = (p: Pt): Pt => ({ x: live.current.org.x + p.x, y: live.current.org.y + p.y });

  const onFound = (s: Spot, p: Pt, first: boolean, combo: number) => {
    const L = live.current;
    L.busy = true;
    const secsTaken = (now() - L.roundStart) / 1000;
    if (first) fx.ok(combo);
    else fx.sparkle();
    later(() => say(callOf(s.ch)), 260);
    setPose('celebra');
    setJump((j) => j + 1);
    setInfo(null);
    setHint(false);
    juice.ring(scr(p), pal.gem, 120);
    juice.burst(scr(p), 'chispas', 26, 160);
    let gain = 0;
    if (feria) {
      const speed = Math.max(0, Math.min(60, Math.round((7 - secsTaken) * 10)));
      gain = first ? Math.round((100 + speed) * Math.min(3, 1 + 0.25 * Math.max(0, combo - 1))) : 40;
      L.points += gain;
      setPoints(L.points);
      L.deadline += RECHARGE * 1000;
      juice.float(scr({ x: p.x, y: p.y - 30 }), `+${gain}`, '#FFE48A', 32);
      if (first && speed >= 40) later(() => juice.float(scr({ x: p.x, y: p.y + 10 }), '¡Rayo!', '#9FF5FF', 24), 160);
    } else {
      juice.float(scr({ x: p.x, y: p.y - 30 }), first ? '¡Bien!' : '¡Eso es!', '#FFE48A', 28);
    }
    const k = found.length;
    const to = slots.at(Math.min(k, slots.n - 1));
    setFly({ id: now(), ch: s.ch, from: p, to });
    later(() => {
      setFly(null);
      setFound((f) => [...f, { ch: s.ch, wall: lv.wall }]);
      fx.coin();
    }, 740);

    // ¿lo siguiente?
    const n = k + 1;
    later(() => {
      setPose('piensa');
      if (n >= total) {
        finish('done');
        return;
      }
      const target = queue[n];
      let lvl = level;
      if (feria && n % PER_LEVEL === 0) {
        lvl = Math.min(LEVELS.length - 1, level + 1);
        fx.levelup();
        juice.banner(`¡Nivel ${lvl + 1}!`, LEVELS[lvl].name, '#9C7BFF');
        if (L.perfect) {
          L.points += 200;
          setPoints(L.points);
          later(() => juice.float(undefined, '¡Galería perfecta! +200', '#FFE48A', 26), 700);
        }
        L.perfect = true;
        L.deadline += 1500;
        setLevel(lvl);
      }
      const nextLv = feria ? LEVELS[lvl] : LESSON;
      const gem = feria && lvl > 0 && Math.random() < 0.4;
      later(() => begin(makeRound(target, pool, nextLv.n, gem, W / Math.max(1, fh))), feria && n % PER_LEVEL === 0 ? 1300 : 0);
    }, 1350);
    return gain;
  };

  const onWrong = (s: Spot, p: Pt) => {
    const L = live.current;
    L.wrong += 1;
    L.perfect = false;
    fx.bad();
    juice.shake(6);
    setPose('ups');
    later(() => setPose((x) => (x === 'ups' ? 'piensa' : x)), 1300);
    const id = now();
    setMarks((m) => [...m.slice(-3), { id, x: p.x, y: p.y }]);
    later(() => setMarks((m) => m.filter((x) => x.id !== id)), 700);
    setInfo({ id, ch: s.ch, x: p.x, y: p.y });
    later(() => setInfo((x) => (x && x.id === id ? null : x)), 2200);
    later(() => say(callOf(s.ch)), 200);
    if (feria) {
      L.deadline -= 2000;
      juice.float(scr({ x: p.x + 40, y: p.y + 40 }), '−2 s', '#FF9D9D', 24);
    }
    if (L.wrong >= 2) setHint(true);
  };

  const choose = (s: Spot, p: Pt) => {
    const L = live.current;
    const ok = s.ch === round.target;
    let combo = score.combo;
    const first = !L.answered;
    if (first) {
      L.answered = true;
      combo = score.hit(ok, false);
      onAnswer(ok);
      if (!ok) {
        // lo que se falla vuelve más tarde
        if (feria) {
          const slot = Math.min(queue.length - 1, found.length + 3);
          if (slot > found.length + 1) setQueue((q) => q.map((c, k) => (k === slot ? round.target : c)));
        } else if (L.requeued < 2) {
          L.requeued += 1;
          setQueue((q) => [...q, round.target]);
        }
      }
    }
    if (ok) onFound(s, p, first, combo);
    else onWrong(s, p);
  };

  const takeGem = (p: Pt) => {
    const L = live.current;
    setGemTaken(true);
    L.points += 150;
    L.deadline += 5000;
    setPoints(L.points);
    fx.sparkle();
    fx.coin();
    juice.burst(scr(p), 'monedas', 16, 140);
    juice.float(scr({ x: p.x, y: p.y - 30 }), '+150 · +5 s', '#FFD45C', 28);
  };

  const pickAt = (x: number, y: number) => {
    const L = live.current;
    if (L.busy || L.ended || phase !== 'play') return;
    let best: { s: Spot; p: Pt; d: number } | null = null;
    for (const s of round.spots) {
      const p = posOf(s);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < HIT && (!best || d < best.d)) best = { s, p, d };
    }
    if (round.gem && !gemTaken) {
      const g = posOf(round.gem);
      if (Math.hypot(g.x - x, g.y - y) < HIT && (!best || Math.hypot(g.x - x, g.y - y) < best.d)) {
        takeGem(g);
        return;
      }
    }
    if (best) choose(best.s, best.p);
  };

  const at = (e: GestureResponderEvent): Pt => {
    const { locationX, locationY, pageX, pageY } = e.nativeEvent;
    live.current.org = { x: pageX - locationX, y: pageY - locationY - fy };
    return { x: locationX, y: fy + locationY };
  };
  const onGrant = (e: GestureResponderEvent) => {
    const p = at(e);
    const L = live.current;
    L.t0 = now();
    L.x0 = p.x;
    L.y0 = p.y;
    L.moved = false;
    if (phase !== 'play') return;
    lx.set(withTiming(p.x, { duration: 110 }));
    ly.set(withTiming(p.y - LIFT, { duration: 110 }));
  };
  const onMove = (e: GestureResponderEvent) => {
    const p = at(e);
    const L = live.current;
    if (!L.moved && Math.hypot(p.x - L.x0, p.y - L.y0) > 12) L.moved = true;
    if (phase !== 'play' || L.ended) return;
    lx.set(p.x);
    ly.set(p.y - LIFT);
  };
  const onRelease = () => {
    const L = live.current;
    if (L.moved || now() - L.t0 > 500) return;
    pickAt(L.x0, L.y0);
  };

  const onRootLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((b) => (b.w === width && b.h === height ? b : { w: width, h: height }));
    if (!measured) {
      setMeasured(true);
      // la linterna se enciende en la frente de Noi
      lx.set(54);
      ly.set(height - BOTTOM + 26);
    }
  };

  const target = round.spots.find((s) => s.ch === round.target);
  const tPos = target && W ? posOf(target) : null;
  const ready = W > 0;

  return (
    <View style={styles.root} onLayout={onRootLayout}>
      <Backdrop scene="cueva" />
      {ready ? <Wall key={`${lv.wall}-${Math.round(W)}-${Math.round(fh)}`} x={6} y={fy - 10} w={W - 12} h={fh + 18} pal={pal} seed={lv.wall * 977 + 31} /> : null}
      {ready
        ? round.spots.map((s) => {
            const p = posOf(s);
            return <Carved key={`${round.id}-${s.ch}`} ch={s.ch} x={p.x} y={p.y} size={lv.size} R={lv.R} rs={rs} lx={lx} ly={ly} pal={pal} />;
          })
        : null}
      {ready && round.gem && !gemTaken ? <HiddenGem key={`g${round.id}`} {...posOf(round.gem)} R={lv.R} rs={rs} lx={lx} ly={ly} /> : null}

      {ready ? <Darkness w={W} h={H} top={frame.top} R={lv.R} alpha={lv.dark} rs={rs} lx={lx} ly={ly} /> : null}
      {ready ? <Beam ox={lamp.x} oy={lamp.y} R={lv.R} lx={lx} ly={ly} clock={clock} /> : null}
      {ready ? <Dust R={lv.R} lx={lx} ly={ly} clock={clock} /> : null}
      {ready ? <GlowWorms w={W} h={H} top={frame.top} clock={clock} /> : null}

      {hint && tPos && phase === 'play' ? <Glimmer x={tPos.x} y={tPos.y} tint={pal.gem} /> : null}
      {marks.map((m) => (
        <Animated.View key={m.id} entering={ZoomIn.duration(140)} exiting={FadeOut.duration(260)} pointerEvents="none" style={[styles.center, { position: 'absolute', left: m.x - 45, top: m.y - 45, width: 90, height: 90 }]}>
          <Glow size={90} tint="#FF4D5E" strength={0.7} pulse={false} />
        </Animated.View>
      ))}

      {/* repisa de roca con Noi, su linterna y la colección */}
      {ready ? (
        <View pointerEvents="none" style={[styles.ledge, { top: H - BOTTOM, height: BOTTOM + frame.bottom }]}>
          <Ledge w={W} h={BOTTOM + frame.bottom} pal={pal} />
          <View style={{ position: 'absolute', right: -6, top: -34 }}>
            <Glow size={120} tint={pal.gem} strength={0.32} style={{ position: 'absolute', left: -14, top: -24 }} />
            <CrystalCluster tint={pal.gem} deep={pal.deep} flip />
          </View>
        </View>
      ) : null}
      {ready ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: noi.x, top: noi.y, width: noi.size, height: noi.size }}>
          <Noi pose={pose} size={noi.size} jump={jump} />
          <View style={[styles.lampWrap, { left: noi.size * 0.5 - 18, top: noi.size * 0.12 - 18 }]}>
            <Glow size={36} tint="#FFF2B8" strength={0.95} />
            <View style={styles.lampLens} />
          </View>
        </View>
      ) : null}
      {ready
        ? Array.from({ length: slots.n }, (_, k) => {
            const p = slots.at(k);
            return <Slot key={k} ch={found[k]?.ch} x={p.x} y={p.y} size={slots.size} pal={found[k] ? WALLS[found[k].wall] : pal} />;
          })
        : null}
      {ready && !feria ? (
        <Txt v="small" style={[styles.ledgeText, { left: 120, top: H - BOTTOM + 14 }]}>
          {found.length === 0 ? 'Arrastra la luz y toca la letra' : `${found.length} de ${total} letras`}
        </Txt>
      ) : null}

      {info ? (
        <Animated.View key={info.id} entering={FadeIn.duration(160)} exiting={FadeOut.duration(200)} pointerEvents="none" style={[styles.info, { left: Math.max(10, Math.min(W - 210, info.x - 100)), top: Math.max(fy, info.y - 96) }]}>
          <Text style={[styles.thai, { fontSize: 30, lineHeight: 44, color: '#FFD0D4' }]}>{info.ch}</Text>
          <View style={{ flex: 1 }}>
            <Txt v="small" style={{ color: '#FFB3BA' }}>
              Esa es otra:
            </Txt>
            <Txt v="bodyStrong" style={{ color: '#FFFFFF' }} numberOfLines={1}>
              {consonantOf(info.ch)?.name} · {consonantOf(info.ch)?.meaning}
            </Txt>
          </View>
          <Text style={styles.infoEmoji}>{LETTER_EMOJI[info.ch]}</Text>
        </Animated.View>
      ) : null}

      {/* lo que se busca y el marcador */}
      <View style={styles.top} onLayout={(e) => setTopH(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
        {consonant ? <Prompt c={consonant} show={lv.show} onSpeak={() => speakTarget(round.target)} /> : null}
        {feria ? (
          <View style={styles.hud}>
            <View style={styles.levelChip}>
              <Txt v="small" style={{ color: '#FFE7A0' }}>
                Nivel {level + 1}
              </Txt>
            </View>
            <Icon name="bulb" size={18} color={secs <= 12 ? '#FF8A8A' : '#FFE7A0'} />
            <Battery value={secs / FERIA_SECONDS} low={secs <= 12} />
            <Txt v="num" style={[styles.hudNum, { minWidth: 30 }]}>
              {secs}
            </Txt>
            <Pop trigger={points}>
              <Txt v="num" style={[styles.hudNum, { color: '#FFD98A' }]}>
                {points}
              </Txt>
            </Pop>
            <ComboBadge combo={score.combo} />
          </View>
        ) : (
          <View pointerEvents="none" style={styles.hudLesson}>
            <ComboBadge combo={score.combo} />
          </View>
        )}
      </View>

      {/* zona de la linterna: arrastra para iluminar, toca para elegir */}
      {ready ? (
        <View
          accessible
          accessibilityLabel={consonant ? `Cueva oscura. Busca la letra de ${consonant.meaning}. Arrastra para mover la linterna y toca la letra.` : 'Cueva oscura'}
          style={{ position: 'absolute', left: 0, top: fy, width: W, height: fh }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderRelease={onRelease}
          onResponderTerminate={onRelease}
        />
      ) : null}

      {fly ? <Flyer key={fly.id} ch={fly.ch} from={fly.from} to={fly.to} pal={pal} /> : null}
      {phase === 'count' ? <Countdown dark onDone={go} /> : null}
      {juice.layer}
    </View>
  );
}

function Ledge({ w, h, pal }: { w: number; h: number; pal: Palette }) {
  const id = useSvgId('ledge');
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#262B57" />
          <Stop offset="0.25" stopColor="#151935" />
          <Stop offset="1" stopColor="#090B1A" />
        </LinearGradient>
      </Defs>
      <Path d={`M0 30 Q${w * 0.12} 6 ${w * 0.3} 18 T${w * 0.62} 14 T${w} 22 V${h} H0 Z`} fill={`url(#${id})`} />
      <Path d={`M0 30 Q${w * 0.12} 6 ${w * 0.3} 18 T${w * 0.62} 14 T${w} 22`} stroke={pal.edge} strokeOpacity={0.55} strokeWidth={2.5} fill="none" />
      <Path d={`M${w * 0.18} ${h * 0.55} q18 -6 36 0 M${w * 0.55} ${h * 0.7} q22 -8 44 0`} stroke="#000000" strokeOpacity={0.35} strokeWidth={2} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'visible' },
  center: { alignItems: 'center', justifyContent: 'center' },
  thai: { fontFamily: font.thaiBold, textAlign: 'center', includeFontPadding: false },
  gemText: { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  mote: { position: 'absolute', backgroundColor: '#FFF4D0' },
  worm: { position: 'absolute', backgroundColor: '#9CFFF0', shadowColor: '#7CF5FF', shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  flyer: { position: 'absolute', left: -48, top: -48, width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  socket: { position: 'absolute', backgroundColor: 'rgba(3,4,12,0.75)', borderWidth: 2, borderColor: 'rgba(160,170,255,0.25)' },
  top: { paddingHorizontal: 14, paddingTop: 6, gap: 8 },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(14,17,40,0.86)',
    borderWidth: 2,
    borderColor: 'rgba(255,200,61,0.55)',
    shadowColor: '#FFC83D',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    overflow: 'hidden',
  },
  promptShine: { position: 'absolute', left: 14, right: 14, top: 2, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)' },
  medal: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#2B3270', borderWidth: 3, borderColor: '#FFC83D', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 32, lineHeight: 40, textAlign: 'center' },
  speak: { width: 56, height: 56 },
  speakFace: { flex: 1, borderRadius: 20, backgroundColor: color.cielo, borderBottomWidth: 4, borderBottomColor: color.cieloHondo, alignItems: 'center', justifyContent: 'center' },
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, minHeight: 34 },
  hudLesson: { position: 'absolute', right: 18, bottom: -36 },
  hudNum: { color: '#FFFFFF', fontSize: 20, textAlign: 'right' },
  levelChip: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(156,123,255,0.28)', borderWidth: 1.5, borderColor: 'rgba(200,180,255,0.6)', justifyContent: 'center' },
  battery: { flex: 1, height: 16, borderRadius: 5, borderWidth: 2, borderColor: 'rgba(255,255,255,0.65)', padding: 1.5, flexDirection: 'row' },
  batteryFill: { height: '100%', borderRadius: 3 },
  batteryShine: { position: 'absolute', left: 3, right: 3, top: 2, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  batteryCap: { position: 'absolute', right: -6, top: 3, width: 4, height: 6, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.65)' },
  ledge: { position: 'absolute', left: 0, right: 0 },
  ledgeText: { position: 'absolute', color: '#C9D0EE' },
  lampWrap: { position: 'absolute', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  lampLens: { position: 'absolute', width: 11, height: 11, borderRadius: 6, backgroundColor: '#FFFBEA', borderWidth: 2, borderColor: '#C98F2A' },
  info: {
    position: 'absolute',
    width: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(40,10,24,0.9)',
    borderWidth: 2,
    borderColor: 'rgba(255,107,122,0.7)',
  },
  infoEmoji: { fontSize: 24, lineHeight: 30 },
});
