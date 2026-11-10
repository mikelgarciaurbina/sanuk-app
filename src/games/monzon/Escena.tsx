// Escena de Monzón: el arrozal en terrazas que verdea y se llena de matas con los aciertos, el arcoíris del
// final, los paraguas de Bo Sang (vidas) que salen volando y el relámpago de cada nivel.
import { useEffect, useId, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { Art } from '@/components/icons';

export const FIELD_H = 122;
const PLANTS = 18;

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Mezcla dos colores (t = 0 → a, t = 1 → b). */
function mix(a: string, b: string, t: number) {
  const x = hex(a);
  const y = hex(b);
  const k = Math.max(0, Math.min(1, t));
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

/** Arrozal en tres terrazas: de charca turbia a verde intenso, con matas que brotan según `grow` (0–1). */
export function Arrozal({ width, grow, ripe }: { width: number; grow: number; ripe: boolean }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [spots] = useState(() =>
    Array.from({ length: PLANTS }, (_, i) => ({ row: i % 3, fx: (Math.floor(i / 3) + 0.25 + Math.random() * 0.5) / (PLANTS / 3), s: 0.75 + Math.random() * 0.45, d: Math.random() * 1600 })),
  );
  const w = width;
  const h = FIELD_H;
  const bands = [
    { d: `M0 ${h * 0.2} Q${w * 0.3} ${h * 0.05} ${w * 0.62} ${h * 0.16} T${w} ${h * 0.1} V${h} H0 Z`, a: '#A3AE86', b: '#8ED36F' },
    { d: `M0 ${h * 0.47} Q${w * 0.35} ${h * 0.34} ${w * 0.7} ${h * 0.44} T${w} ${h * 0.38} V${h} H0 Z`, a: '#909F74', b: '#62B95C' },
    { d: `M0 ${h * 0.74} Q${w * 0.4} ${h * 0.62} ${w * 0.74} ${h * 0.72} T${w} ${h * 0.66} V${h} H0 Z`, a: '#7D8E63', b: '#459A4E' },
  ];
  const rowY = [h * 0.27, h * 0.54, h * 0.82];
  const shown = Math.round(Math.max(0, Math.min(1, grow)) * PLANTS);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h }}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {bands.map((b, i) => (
          <G key={i}>
            <Path d={b.d} fill={mix(b.a, b.b, grow)} />
            <Path d={b.d} fill={`url(#${u}s)`} opacity={0.5} />
            <Path d={b.d.split('V')[0]} stroke="#F2FBE6" strokeOpacity={0.75} strokeWidth={2.5} fill="none" />
          </G>
        ))}
        {[0.33, 0.6, 0.88].map((f, i) => (
          <Path key={i} d={`M${w * 0.06} ${h * f} q${w * 0.1} -3 ${w * 0.2} 0 M${w * 0.55} ${h * (f + 0.04)} q${w * 0.12} -3 ${w * 0.24} 0`} stroke="#E4F2FF" strokeOpacity={0.45 * (1 - grow * 0.6)} strokeWidth={2} fill="none" strokeLinecap="round" />
        ))}
      </Svg>
      {spots.map((p, i) => (
        <Mata key={i} on={i < shown} ripe={ripe} x={p.fx * w} y={rowY[p.row]} scale={p.s * (0.8 + p.row * 0.12)} delay={p.d} />
      ))}
    </View>
  );
}

/** Mata de arroz: brota con un muelle y se mece; madura (espigas doradas) al final. */
function Mata({ on, ripe, x, y, scale, delay }: { on: boolean; ripe: boolean; x: number; y: number; scale: number; delay: number }) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(0);
  const sway = useSharedValue(0);
  useEffect(() => {
    grow.value = withSpring(on ? 1 : 0, { damping: 9, stiffness: 140 });
  }, [on, grow]);
  useEffect(() => {
    if (reduced) return;
    sway.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [sway, delay, reduced]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, grow.value * 2),
    transform: [{ translateY: 17 }, { rotate: `${(sway.value - 0.5) * 10}deg` }, { translateY: -17 }, { scale: scale * grow.value }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 12, top: y - 30, width: 24, height: 34 }, st]}>
      <Svg width={24} height={34} viewBox="0 0 24 34">
        <G stroke="#3E9A52" strokeWidth={2.6} strokeLinecap="round" fill="none">
          <Path d="M12 34 C11 24 6 16 2 10" />
          <Path d="M12 34 C14 25 19 17 23 12" />
        </G>
        <G stroke="#6CC261" strokeWidth={2.4} strokeLinecap="round" fill="none">
          <Path d="M12 34 C12 22 10 10 9 2" />
          <Path d="M12 34 C13 22 15 10 17 3" />
          <Path d="M12 34 C12 26 12 18 12 7" />
        </G>
        {ripe ? (
          <G fill="#F2C94C">
            <Ellipse cx={9} cy={4} rx={1.8} ry={2.6} />
            <Ellipse cx={17} cy={5} rx={1.8} ry={2.6} />
            <Ellipse cx={12} cy={8} rx={1.8} ry={2.6} />
            <Ellipse cx={3} cy={11} rx={1.6} ry={2.3} />
            <Ellipse cx={22} cy={13} rx={1.6} ry={2.3} />
          </G>
        ) : null}
      </Svg>
    </Animated.View>
  );
}

const RAINBOW = ['#FF5D5D', '#FF9F43', '#FFD93D', '#6BCB77', '#4D96FF', '#9B5DE5'];

/** Arcoíris que sale del arrozal cuando para la lluvia. */
export function Arcoiris({ width, show }: { width: number; show: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (show) p.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [show, p]);
  const st = useAnimatedStyle(() => ({ opacity: p.value * 0.9, transform: [{ translateY: (1 - p.value) * 40 }, { scale: 0.6 + 0.4 * p.value }] }));
  const w = width * 0.92;
  const h = w * 0.5;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: (width - w) / 2, bottom: FIELD_H * 0.55, width: w, height: h }, st]}>
      <Svg width={w} height={h} viewBox="0 0 200 100">
        {RAINBOW.map((c, i) => {
          const r = 96 - i * 7;
          return <Path key={c} d={`M${100 - r} 100 A${r} ${r} 0 0 1 ${100 + r} 100`} stroke={c} strokeWidth={7.5} fill="none" opacity={0.85} />;
        })}
      </Svg>
    </Animated.View>
  );
}

/** Paraguas de Bo Sang (una vida): si se pierde, sale volando dando vueltas. */
export function Paraguas({ lost }: { lost: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = lost ? withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }) : withSpring(0, { damping: 10, stiffness: 160 });
  }, [lost, p]);
  const fly = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ translateY: -60 * p.value }, { translateX: 30 * p.value }, { rotate: `${p.value * 400}deg` }, { scale: 1 + p.value * 0.3 }] }));
  return (
    <View style={{ width: 32, height: 32 }}>
      <View style={[StyleSheet.absoluteFill, { opacity: 0.22 }]}>
        <Art name="paraguas" size={32} />
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, fly]}>
        <Art name="paraguas" size={32} />
      </Animated.View>
    </View>
  );
}

/** Relámpago: un rayo que cruza el cielo y parpadea cada vez que cambia `n`. */
export function Rayo({ n, width }: { n: number; width: number }) {
  const p = useSharedValue(0);
  const first = useRef(true);
  const [path, setPath] = useState('');
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    p.value = withSequence(withTiming(1, { duration: 50 }), withTiming(0.15, { duration: 80 }), withTiming(1, { duration: 50 }), withDelay(120, withTiming(0, { duration: 260 })));
  }, [n, p]);
  useEffect(() => {
    if (n === 0) return;
    const t = setTimeout(() => {
      const x0 = width * (0.25 + Math.random() * 0.5);
      let d = `M${x0} 0`;
      let x = x0;
      for (let i = 1; i <= 6; i++) {
        x += (Math.random() - 0.5) * 70;
        d += ` L${x.toFixed(0)} ${i * 34}`;
      }
      setPath(d);
    }, 0);
    return () => clearTimeout(t);
  }, [n, width]);
  const st = useAnimatedStyle(() => ({ opacity: p.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width, height: 210 }, st]}>
      <Svg width={width} height={210}>
        <Path d={path} stroke="#FFF7C2" strokeOpacity={0.45} strokeWidth={12} fill="none" strokeLinejoin="round" />
        <Path d={path} stroke="#FFFFFF" strokeWidth={4} fill="none" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}
