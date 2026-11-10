// La carretera 1095 de Mae Hong Son en pseudo-3D: franjas de asfalto en perspectiva que se curvan (con skewX
// para que los bordes queden continuos), rayas centrales y cosas del arcén (pinos, girasoles, mojones del km,
// chevrones de curva, un santuario) que vienen hacia ti, montañas por capas con parallax y un cielo que cambia
// del amanecer a la noche. Todo se mueve con valores compartidos de Reanimated, sin setState por fotograma.
import { useEffect, useId, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

import { font } from '@/brand/tokens';

/** Geometría de la escena: horizonte, alto del suelo y medio ancho de la carretera a distancia 1. */
export type Geo = { W: number; H: number; hz: number; gh: number; road: number };
export const Z_FAR = 30;

/** `top` es lo que la escena sube por detrás de la cabecera: el horizonte se coloca en la parte visible. */
export function makeGeo(W: number, H: number, top = 0): Geo {
  const hz = Math.round(top + (H - top) * 0.37);
  return { W, H, hz, gh: H - hz, road: W * 0.56 };
}

/** y en pantalla de un punto del suelo a distancia z (z = 1 es el borde inferior). */
export const yOf = (g: Geo, z: number) => {
  'worklet';
  return g.hz + g.gh / z;
};

/** Desplazamiento lateral del centro de la carretera a distancia z con curvatura c. */
export const offOf = (g: Geo, c: number, z: number) => {
  'worklet';
  return (c * (z - 1) * (z - 1) * 0.5 * g.road) / z;
};

const mod = (a: number, n: number) => {
  'worklet';
  return ((a % n) + n) % n;
};

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

// ——— Cielo y montañas ———

const SKIES: [string, string, string][] = [
  ['#7FB8F5', '#CFE6FF', '#FFF1D6'],
  ['#F2A35E', '#FFC98A', '#FFE9C2'],
  ['#3A2A6E', '#B5527A', '#FF9F6B'],
  ['#070B26', '#1B2257', '#3A3480'],
];

function SkyLayer({ id, stops }: { id: string; stops: [string, string, string] }) {
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stops[0]} />
          <Stop offset="0.6" stopColor={stops[1]} />
          <Stop offset="1" stopColor={stops[2]} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={10} height={10} fill={`url(#${id})`} />
    </Svg>
  );
}

function SkyFade({ i, tod, children }: { i: number; tod: SharedValue<number>; children: ReactNode }) {
  const st = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, tod.value - (i - 1))) }));
  if (i === 0) return <View style={StyleSheet.absoluteFill}>{children}</View>;
  return <Animated.View style={[StyleSheet.absoluteFill, st]}>{children}</Animated.View>;
}

/** Cielo con cuatro momentos del día (0 mañana · 1 tarde · 2 atardecer · 3 noche), sol o luna y estrellas. */
export function Sky({ g, tod }: { g: Geo; tod: SharedValue<number> }) {
  const u = `s${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [stars] = useState(() => Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random() * 0.8, s: 1.5 + Math.random() * 2 })));
  const sun = useAnimatedStyle(() => ({ transform: [{ translateY: tod.value * g.hz * 0.18 }], opacity: 1 - Math.max(0, tod.value - 2) }));
  const moon = useAnimatedStyle(() => ({ opacity: Math.max(0, tod.value - 2.2) / 0.8 }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: g.hz + 4 }}>
      {SKIES.map((s, i) => (
        <SkyFade key={i} i={i} tod={tod}>
          <SkyLayer id={`${u}${i}`} stops={s} />
        </SkyFade>
      ))}
      <Animated.View style={[{ position: 'absolute', left: g.W * 0.7, top: g.hz * 0.18, width: 120, height: 120, marginLeft: -60, marginTop: -60, alignItems: 'center', justifyContent: 'center' }, sun]}>
        <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFF6D8', opacity: 0.25 }} />
        <View style={{ position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF6D8', opacity: 0.35 }} />
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF4CF' }} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, moon]}>
        <View style={{ position: 'absolute', left: g.W * 0.22, top: g.hz * 0.16, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF4D8', shadowColor: '#FFF4D8', shadowOpacity: 0.9, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } }} />
        {stars.map((s, i) => (
          <View key={i} style={{ position: 'absolute', left: s.x * g.W, top: s.y * g.hz, width: s.s, height: s.s, borderRadius: s.s, backgroundColor: '#FFFFFF' }} />
        ))}
      </Animated.View>
    </View>
  );
}

/** Cresta periódica (periodo = ancho W) para que el parallax pueda repetirse sin costuras. */
function ridge(W: number, base: number, amp: number, k: number, phase: number, bottom: number) {
  const pts: string[] = [];
  for (let x = 0; x <= W * 3; x += W / 24) {
    const y = base - amp * (0.55 * Math.sin((2 * Math.PI * x * k) / W + phase) + 0.3 * Math.sin((2 * Math.PI * x * (k + 2)) / W + phase * 2) + 0.15 * Math.sin((2 * Math.PI * x * (k + 5)) / W));
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M0 ${bottom} L${pts.join(' L')} L${W * 3} ${bottom} Z`;
}

function Range({ g, bgX, factor, d, top, bottomColor, haze }: { g: Geo; bgX: SharedValue<number>; factor: number; d: string; top: string; bottomColor: string; haze: number }) {
  const u = `r${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -g.W + mod(bgX.value * factor, g.W) }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: g.W * 3, height: g.hz + 4 }, st]}>
      <Svg width={g.W * 3} height={g.hz + 4}>
        <Defs>
          <LinearGradient id={u} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottomColor} />
          </LinearGradient>
        </Defs>
        <Path d={d} fill={`url(#${u})`} />
        <Path d={d} fill="#FFFFFF" opacity={haze} />
      </Svg>
    </Animated.View>
  );
}

/** Tres cordilleras con parallax (las lejanas se mueven menos) y niebla en los valles. */
export function Ranges({ g, bgX, tod }: { g: Geo; bgX: SharedValue<number>; tod: SharedValue<number> }) {
  const u = `n${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const dusk = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, tod.value - 1.3) / 1.4) }));
  const [d] = useState(() => [
    ridge(g.W, g.hz * 0.62, g.hz * 0.22, 2, 0.6, g.hz + 4),
    ridge(g.W, g.hz * 0.8, g.hz * 0.18, 3, 2.1, g.hz + 4),
    ridge(g.W, g.hz * 0.96, g.hz * 0.12, 4, 4.0, g.hz + 4),
  ]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: g.W, height: g.hz + 4, overflow: 'hidden' }}>
      <Range g={g} bgX={bgX} factor={0.12} d={d[0]} top="#9FB7D6" bottomColor="#B9CCE2" haze={0.25} />
      <Range g={g} bgX={bgX} factor={0.25} d={d[1]} top="#6FA6A0" bottomColor="#8FBDB2" haze={0.12} />
      <Range g={g} bgX={bgX} factor={0.45} d={d[2]} top="#4E9468" bottomColor="#5FA875" haze={0.04} />
      <Animated.View style={[StyleSheet.absoluteFill, dusk]}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
          <Defs>
            <LinearGradient id={u} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.35" stopColor="#070B26" stopOpacity={0} />
              <Stop offset="0.75" stopColor="#070B26" stopOpacity={0.8} />
              <Stop offset="1" stopColor="#0A0F33" stopOpacity={0.85} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={10} height={10} fill={`url(#${u})`} />
        </Svg>
      </Animated.View>
      <View style={{ position: 'absolute', left: 0, right: 0, top: g.hz - 34, height: 38 }}>
        <Haze vertical />
      </View>
    </View>
  );
}

// ——— Suelo y carretera ———

/** Prado bajo el horizonte (más claro y con niebla lejos) y sombra que se oscurece de noche. */
export function Ground({ g, tod }: { g: Geo; tod: SharedValue<number> }) {
  const u = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const dark = useAnimatedStyle(() => ({ opacity: Math.min(0.62, Math.max(0, tod.value - 1) * 0.31) }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: g.hz, bottom: 0 }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
        <Defs>
          <LinearGradient id={u} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#A9D49B" />
            <Stop offset="0.25" stopColor="#7FBF6E" />
            <Stop offset="1" stopColor="#3F8E4E" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={10} height={10} fill={`url(#${u})`} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#060A24' }, dark]} />
    </View>
  );
}

const N_STRIPS = 14;
/** Distancias de los bordes de las franjas: más finas cerca del horizonte, donde la curva se nota más. */
export const STRIP_Z = Array.from({ length: N_STRIPS + 1 }, (_, k) => Math.pow(Z_FAR, k / N_STRIPS));

function Strip({ g, k, curve }: { g: Geo; k: number; curve: SharedValue<number> }) {
  const za = STRIP_Z[k];
  const zb = STRIP_Z[k + 1];
  const ya = yOf(g, za);
  const yb = yOf(g, zb);
  const h = ya - yb;
  const wa = (2 * g.road) / za;
  const wb = (2 * g.road) / zb;
  const fog = Math.pow(k / N_STRIPS, 1.3);
  const asphalt = mix('#5B6370', '#C3CEDA', fog * 0.85);
  const shoulder = mix('#C9AE7C', '#DCE6D4', fog * 0.8);
  const line = fog > 0.7 ? 'rgba(255,255,255,0.4)' : '#FFFFFF';
  const L = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`;
  const inset = (f: number) => [L((wa - wb) / 2 + wb * f, 0), L((wa + wb) / 2 - wb * f, 0), L(wa - wa * f, h + 1), L(wa * f, h + 1)].join(' ');
  const edge = (f0: number, f1: number, left: boolean) =>
    left
      ? [L((wa - wb) / 2 + wb * f0, 0), L((wa - wb) / 2 + wb * f1, 0), L(wa * f1, h + 1), L(wa * f0, h + 1)].join(' ')
      : [L((wa + wb) / 2 - wb * f1, 0), L((wa + wb) / 2 - wb * f0, 0), L(wa - wa * f0, h + 1), L(wa - wa * f1, h + 1)].join(' ');
  const st = useAnimatedStyle(() => {
    const oa = offOf(g, curve.value, za);
    const ob = offOf(g, curve.value, zb);
    return { transform: [{ translateX: (oa + ob) / 2 }, { skewX: `${Math.atan((oa - ob) / h) * (180 / Math.PI)}deg` }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: g.W / 2 - wa / 2, top: yb, width: wa, height: h + 1 }, st]}>
      <Svg width={wa} height={h + 1}>
        <Polygon points={inset(0)} fill={shoulder} />
        <Polygon points={inset(0.075)} fill={asphalt} />
        <Polygon points={edge(0.085, 0.105, true)} fill={line} />
        <Polygon points={edge(0.085, 0.105, false)} fill={line} />
      </Svg>
    </Animated.View>
  );
}

export function Road({ g, curve }: { g: Geo; curve: SharedValue<number> }) {
  return (
    <>
      {Array.from({ length: N_STRIPS }, (_, k) => (
        <Strip key={k} g={g} k={k} curve={curve} />
      ))}
    </>
  );
}

const DASHES = 6;
const DASH_GAP = 4.6;

function Dash({ g, i, dist, curve }: { g: Geo; i: number; dist: SharedValue<number>; curve: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const z = 1 + mod(i * DASH_GAP - dist.value, DASHES * DASH_GAP);
    const y0 = yOf(g, Math.max(0.9, z - 0.38));
    const y1 = yOf(g, z + 0.38);
    const len = Math.max(1, y0 - y1);
    return {
      opacity: z > 22 ? Math.max(0, (27 - z) / 5) : 1,
      transform: [{ translateX: g.W / 2 + offOf(g, curve.value, z) - 3 }, { translateY: (y0 + y1) / 2 - 20 }, { scaleX: Math.max(0.15, 2.2 / z) }, { scaleY: len / 40 }],
    };
  });
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 6, height: 40, borderRadius: 3, backgroundColor: '#FFF8E1' }, st]} />;
}

export function Dashes({ g, dist, curve }: { g: Geo; dist: SharedValue<number>; curve: SharedValue<number> }) {
  return (
    <>
      {Array.from({ length: DASHES }, (_, i) => (
        <Dash key={i} g={g} i={i} dist={dist} curve={curve} />
      ))}
    </>
  );
}

// ——— Cosas del arcén ———

type Prop = 'pino' | 'girasol' | 'poste' | 'chevron' | 'arbusto' | 'santuario';
const PROP_W = 120;
const PROP_H = 150;

function PropArt({ kind, side }: { kind: Prop; side: number }) {
  switch (kind) {
    case 'pino':
      return (
        <Svg width={PROP_W} height={PROP_H} viewBox="0 0 120 150">
          <Ellipse cx={60} cy={145} rx={36} ry={6} fill="#000000" opacity={0.2} />
          <Rect x={54} y={112} width={12} height={34} rx={3} fill="#7A4A2E" />
          <Path d="M60 6 L98 70 H22 Z" fill="#2F7A44" />
          <Path d="M60 34 L106 104 H14 Z" fill="#3B8F50" />
          <Path d="M60 64 L112 124 H8 Z" fill="#2F7A44" />
          <Path d="M60 10 L40 52 M60 40 L32 88 M60 70 L24 110" stroke="#6FCB7E" strokeWidth={3} strokeLinecap="round" opacity={0.55} />
        </Svg>
      );
    case 'girasol':
      return (
        <Svg width={PROP_W} height={PROP_H} viewBox="0 0 120 150">
          <Ellipse cx={60} cy={145} rx={44} ry={6} fill="#000000" opacity={0.18} />
          {[
            [30, 96],
            [60, 80],
            [90, 100],
          ].map(([x, y], i) => (
            <G key={i}>
              <Path d={`M${x} ${y} L${x} 146`} stroke="#4E9A3E" strokeWidth={4} />
              <Path d={`M${x} ${y + 26} C${x - 14} ${y + 18} ${x - 18} ${y + 30} ${x} ${y + 34}`} fill="#5BAF4A" />
              {Array.from({ length: 10 }, (_, k) => (
                <Ellipse key={k} cx={x} cy={y - 12} rx={4.5} ry={11} fill="#FFC83D" transform={`rotate(${k * 36} ${x} ${y})`} />
              ))}
              <Circle cx={x} cy={y} r={8} fill="#6E4A1E" />
            </G>
          ))}
        </Svg>
      );
    case 'poste':
      return (
        <Svg width={PROP_W} height={PROP_H} viewBox="0 0 120 150">
          <Ellipse cx={60} cy={145} rx={22} ry={5} fill="#000000" opacity={0.2} />
          <Path d="M42 146 V74 C42 60 78 60 78 74 V146 Z" fill="#F4F6F8" />
          <Path d="M42 74 C42 60 78 60 78 74 V84 H42 Z" fill="#D93A3F" />
          <Path d="M72 76 V146" stroke="#C9D1D9" strokeWidth={5} />
        </Svg>
      );
    case 'chevron':
      return (
        <Svg width={PROP_W} height={PROP_H} viewBox="0 0 120 150">
          <Rect x={57} y={86} width={6} height={60} fill="#5E6672" />
          <Rect x={14} y={40} width={92} height={52} rx={4} fill="#FFC83D" stroke="#1D2347" strokeWidth={3} />
          {[0, 1, 2].map((k) => (
            <Path key={k} d={side > 0 ? `M${30 + k * 24} 50 L${46 + k * 24} 66 L${30 + k * 24} 82` : `M${90 - k * 24} 50 L${74 - k * 24} 66 L${90 - k * 24} 82`} stroke="#1D2347" strokeWidth={8} fill="none" strokeLinejoin="round" />
          ))}
        </Svg>
      );
    case 'santuario':
      return (
        <Svg width={PROP_W} height={PROP_H} viewBox="0 0 120 150">
          <Ellipse cx={60} cy={145} rx={30} ry={5} fill="#000000" opacity={0.2} />
          <Rect x={56} y={92} width={8} height={54} fill="#B9A58A" />
          <Rect x={34} y={64} width={52} height={32} fill="#F6E7C8" />
          <Rect x={50} y={72} width={20} height={24} fill="#8E2A1E" />
          <Path d="M26 66 L60 36 L94 66 Z" fill="#D93A3F" />
          <Path d="M26 66 L60 36 L94 66" stroke="#FFC83D" strokeWidth={3} fill="none" />
          <Path d="M60 36 V24" stroke="#FFC83D" strokeWidth={3} strokeLinecap="round" />
          <Circle cx={60} cy={84} r={4} fill="#FFC83D" />
        </Svg>
      );
    default:
      return (
        <Svg width={PROP_W} height={PROP_H} viewBox="0 0 120 150">
          <Ellipse cx={60} cy={145} rx={44} ry={6} fill="#000000" opacity={0.18} />
          <Circle cx={40} cy={122} r={24} fill="#3B8F50" />
          <Circle cx={74} cy={116} r={30} fill="#4FA35C" />
          <Circle cx={60} cy={128} r={20} fill="#2F7A44" />
          <Circle cx={66} cy={104} r={8} fill="#7FD08A" opacity={0.6} />
        </Svg>
      );
  }
}

const PROPS: { kind: Prop; side: number; z0: number }[] = [
  { kind: 'pino', side: -1, z0: 2 },
  { kind: 'poste', side: 1, z0: 5.5 },
  { kind: 'girasol', side: -1, z0: 9 },
  { kind: 'pino', side: 1, z0: 12.5 },
  { kind: 'chevron', side: 1, z0: 16 },
  { kind: 'arbusto', side: -1, z0: 19.5 },
  { kind: 'santuario', side: -1, z0: 23 },
  { kind: 'pino', side: 1, z0: 26.5 },
];
const SPAN = Z_FAR - 1;

function Roadside({ g, p, dist, curve }: { g: Geo; p: (typeof PROPS)[number]; dist: SharedValue<number>; curve: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const z = 1 + mod(p.z0 - dist.value, SPAN);
    const s = Math.min(2.2, 1.6 / z);
    const x = g.W / 2 + offOf(g, curve.value, z) + p.side * ((g.road * 1.18) / z + 26 / z + PROP_W * 0.35 * s);
    const y = yOf(g, z);
    return {
      opacity: z < 1.12 ? Math.max(0, (z - 1) / 0.12) : z > 24 ? Math.max(0, (Z_FAR - z) / 6) : 1,
      transform: [{ translateX: x - PROP_W / 2 }, { translateY: y - PROP_H }, { scale: s }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: PROP_W, height: PROP_H, transformOrigin: `${PROP_W / 2}px ${PROP_H}px` }, st]}>
      <PropArt kind={p.kind} side={p.side} />
      {p.kind === 'poste' ? <Text style={styles.km}>1095</Text> : null}
    </Animated.View>
  );
}

export function RoadsideProps({ g, dist, curve }: { g: Geo; dist: SharedValue<number>; curve: SharedValue<number> }) {
  return (
    <>
      {PROPS.map((p, i) => (
        <Roadside key={i} g={g} p={p} dist={dist} curve={curve} />
      ))}
    </>
  );
}

/** Velo de niebla con bordes difuminados (degradado), horizontal o vertical. */
function Haze({ vertical, strength = 0.7 }: { vertical?: boolean; strength?: number }) {
  const u = `h${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
      <Defs>
        <LinearGradient id={u} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={strength} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={10} height={10} fill={`url(#${u})`} />
    </Svg>
  );
}

/** Niebla que cruza la carretera de vez en cuando (Mae Hong Son es «la ciudad de las tres nieblas»). */
export function Mist({ g }: { g: Geo }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced, t]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: -g.W * 0.5 + t.value * g.W * 0.6 }] }));
  const b = useAnimatedStyle(() => ({ transform: [{ translateX: g.W * 0.2 - t.value * g.W * 0.7 }] }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: g.hz - 6, width: g.W * 1.2, height: 40 }, a]}>
        <Haze strength={0.55} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: g.hz + g.gh * 0.12, width: g.W * 1.1, height: 34 }, b]}>
        <Haze strength={0.35} />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  km: { position: 'absolute', left: 42, width: 36, top: 96, textAlign: 'center', fontFamily: font.uiBlack, fontSize: 10, color: '#1D2347' },
});
