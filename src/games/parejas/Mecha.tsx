// La mecha de Parejas: una cuerda trenzada que arde de izquierda a derecha con una chispa que chisporrotea,
// y al final un cohete de feria que sale disparado cuando se consume.
import { useEffect, useId, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { font } from '@/brand/tokens';

import { Glow, Pop } from '../fx';

export const FUSE_H = 66;
const X0 = 14;
const ROCKET_W = 46;
const ROCKET_H = 74;
const SPARK = 30;

/** Altura de la cuerda en el punto `p` (0–1): ondula suave, como una mecha de verdad. */
export function fuseY(p: number) {
  'worklet';
  return FUSE_H * 0.62 + 6 * Math.sin(p * Math.PI * 5 + 0.6);
}

/** Geometría de la mecha para un ancho dado (la usan el dibujo, la chispa y el juego para lanzar efectos). */
export function fuseGeom(width: number) {
  const x1 = Math.max(X0 + 40, width - ROCKET_W + 6);
  return { x0: X0, x1, len: x1 - X0 };
}

function ropePath(x0: number, len: number) {
  const n = 56;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    d += `${i === 0 ? 'M' : 'L'}${(x0 + p * len).toFixed(1)} ${fuseY(p).toFixed(1)} `;
  }
  return d;
}

export function Mecha({ burn, width, secs, launched }: { burn: SharedValue<number>; width: number; secs: number; launched: boolean }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { x0, x1, len } = fuseGeom(width);
  const d = ropePath(x0, len);
  const low = secs <= 8;
  // la parte nueva de la cuerda se recorta por la izquierda a medida que arde
  const clip = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, burn.value));
    return { left: x0 + p * len };
  });
  const inner = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, burn.value));
    return { transform: [{ translateX: -(x0 + p * len) }] };
  });
  const mm = Math.floor(Math.max(0, secs) / 60);
  const ss = String(Math.max(0, secs) % 60).padStart(2, '0');
  return (
    <View style={{ height: FUSE_H, width }} pointerEvents="none">
      {/* cuerda quemada */}
      <Svg width={width} height={FUSE_H} style={StyleSheet.absoluteFill}>
        <Path d={d} stroke="#120A14" strokeOpacity={0.5} strokeWidth={9} fill="none" strokeLinecap="round" transform="translate(0 2)" />
        <Path d={d} stroke="#2B1D24" strokeWidth={6} fill="none" strokeLinecap="round" />
        <Path d={d} stroke="#6B5A5E" strokeWidth={2} strokeDasharray="1 7" fill="none" strokeLinecap="round" />
      </Svg>
      {/* cuerda nueva, trenzada */}
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, right: 0, overflow: 'hidden' }, clip]}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width, height: FUSE_H }, inner]}>
          <Svg width={width} height={FUSE_H}>
            <Path d={d} stroke="#120A14" strokeOpacity={0.45} strokeWidth={10} fill="none" strokeLinecap="round" transform="translate(0 2.5)" />
            <Path d={d} stroke="#C98B45" strokeWidth={8} fill="none" strokeLinecap="round" />
            <Path d={d} stroke="#8A5524" strokeWidth={8} strokeDasharray="3 4" fill="none" />
            <Path d={d} stroke="#F7D9A0" strokeOpacity={0.75} strokeWidth={2} fill="none" strokeLinecap="round" transform="translate(0 -2)" />
          </Svg>
        </Animated.View>
      </Animated.View>
      <Rocket u={u} x={x1 - ROCKET_W / 2 + 4} launched={launched} />
      {!launched ? <Spark burn={burn} x0={x0} len={len} low={low} /> : null}
      <Pop trigger={low ? secs : 0} scale={1.25} style={[styles.time, low ? styles.timeLow : null]}>
        <Text style={[styles.timeText, low ? { color: '#FFFFFF' } : null]}>
          {mm}:{ss}
        </Text>
      </Pop>
    </View>
  );
}

function Spark({ burn, x0, len, low }: { burn: SharedValue<number>; x0: number; len: number; low: boolean }) {
  const reduced = useReducedMotion();
  const flick = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    flick.value = withRepeat(withSequence(withTiming(1, { duration: 90 }), withTiming(0.2, { duration: 120 }), withTiming(0.7, { duration: 80 })), -1, true);
  }, [flick, reduced]);
  const pos = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, burn.value));
    return { transform: [{ translateX: x0 + p * len - SPARK / 2 }, { translateY: fuseY(p) - SPARK / 2 }] };
  });
  const star = useAnimatedStyle(() => ({ transform: [{ scale: 0.75 + 0.45 * flick.value }, { rotate: `${flick.value * 45}deg` }] }));
  const g = low ? 86 : 64;
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: SPARK, height: SPARK, alignItems: 'center', justifyContent: 'center' }, pos]}>
      <Glow size={g} tint={low ? '#FF7A3D' : '#FFB347'} strength={0.95} style={{ position: 'absolute', left: SPARK / 2 - g / 2, top: SPARK / 2 - g / 2 }} />
      <SparkBits n={reduced ? 0 : low ? 10 : 7} />
      <Animated.View style={star}>
        <Svg width={26} height={26} viewBox="0 0 24 24">
          <Path d="M12 0 14.2 9.8 24 12 14.2 14.2 12 24 9.8 14.2 0 12 9.8 9.8Z" fill="#FFF6C8" />
          <Circle cx={12} cy={12} r={4.2} fill="#FFFFFF" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const BIT_COLORS = ['#FFF2A8', '#FFC83D', '#FF8A3D', '#FFFFFF', '#FFD9A0'];

function SparkBits({ n }: { n: number }) {
  const [bits] = useState(() =>
    Array.from({ length: 10 }, (_, i) => ({
      a: -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5,
      d: 12 + Math.random() * 18,
      ms: 320 + Math.random() * 320,
      delay: Math.random() * 400,
      size: 2.5 + Math.random() * 2.5,
      tint: BIT_COLORS[i % BIT_COLORS.length],
    })),
  );
  return (
    <>
      {bits.slice(0, n).map((b, i) => (
        <SparkBit key={i} {...b} />
      ))}
    </>
  );
}

function SparkBit({ a, d, ms, delay, size, tint }: { a: number; d: number; ms: number; delay: number; size: number; tint: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: ms, easing: Easing.out(Easing.quad) }), -1, false));
  }, [t, delay, ms]);
  const st = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ translateX: Math.cos(a) * d * t.value }, { translateY: Math.sin(a) * d * t.value + 16 * t.value * t.value }, { scale: 1 - 0.5 * t.value }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size, backgroundColor: tint, shadowColor: tint, shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }, st]} />;
}

/** Cohete de feria con laca roja y bandas de oro; cuando la mecha llega, sale volando. */
function Rocket({ u, x, launched }: { u: string; x: number; launched: boolean }) {
  const y = useSharedValue(0);
  const flame = useSharedValue(0);
  useEffect(() => {
    if (!launched) return;
    flame.value = withTiming(1, { duration: 120 });
    y.value = withTiming(-520, { duration: 760, easing: Easing.in(Easing.quad) });
  }, [launched, y, flame]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: `${-6 + y.value * -0.01}deg` }] }));
  const fl = useAnimatedStyle(() => ({ opacity: flame.value, transform: [{ scaleY: 0.6 + flame.value * 0.8 }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: FUSE_H - ROCKET_H + 8, width: ROCKET_W, height: ROCKET_H }, st]}>
      <Animated.View style={[{ position: 'absolute', left: ROCKET_W / 2 - 8, top: 46, width: 16, height: 30 }, fl]}>
        <Svg width={16} height={30} viewBox="0 0 16 30">
          <Path d="M8 30 C2 22 1 12 4 2 Q8 6 12 2 C15 12 14 22 8 30 Z" fill="#FF8A3D" />
          <Path d="M8 24 C5 19 5 12 6 6 Q8 9 10 6 C11 12 11 19 8 24 Z" fill="#FFF2A8" />
        </Svg>
      </Animated.View>
      <Svg width={ROCKET_W} height={ROCKET_H} viewBox="0 0 46 74">
        <Defs>
          <LinearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#7A1616" />
            <Stop offset="0.38" stopColor="#E84A3F" />
            <Stop offset="0.55" stopColor="#FF8569" />
            <Stop offset="0.8" stopColor="#B8322A" />
            <Stop offset="1" stopColor="#6A1212" />
          </LinearGradient>
          <LinearGradient id={`${u}c`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#B07A10" />
            <Stop offset="0.45" stopColor="#FFE58A" />
            <Stop offset="1" stopColor="#C98F00" />
          </LinearGradient>
        </Defs>
        <Path d="M23 49 L23 74" stroke="#8A5A2B" strokeWidth={2.6} strokeLinecap="round" />
        <Path d="M14 40 L6 54 L15 49 Z" fill="#8F1F23" />
        <Path d="M32 40 L40 54 L31 49 Z" fill="#8F1F23" />
        <Rect x={13} y={18} width={20} height={32} rx={3} fill={`url(#${u}b)`} />
        <Rect x={13} y={21} width={20} height={3} fill={`url(#${u}c)`} />
        <Rect x={13} y={44} width={20} height={3} fill={`url(#${u}c)`} />
        <Path d="M23 27 L27.5 33.5 L23 40 L18.5 33.5 Z" fill="#FFC83D" />
        <Path d="M23 30.5 L25 33.5 L23 36.5 L21 33.5 Z" fill="#FFF1B8" />
        <Path d="M11.5 19.5 Q23 -3 34.5 19.5 Z" fill={`url(#${u}c)`} />
        <Circle cx={23} cy={4.5} r={2.2} fill="#FFF1B8" />
        <Rect x={16} y={20} width={2.6} height={28} rx={1.3} fill="#FFFFFF" opacity={0.32} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  time: {
    position: 'absolute',
    left: X0 - 4,
    top: 0,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    justifyContent: 'center',
    backgroundColor: 'rgba(14,10,28,0.62)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,214,140,0.45)',
  },
  timeLow: { backgroundColor: '#E2474C', borderColor: '#FFC8B8' },
  timeText: { fontFamily: font.displayBold, fontSize: 15, color: '#FFE7B0' },
});
