// Señal de curva de la carretera 1095: rombo amarillo con la flecha de la curva y un cartel con la palabra.
// Llega desde el horizonte en perspectiva (escala y posición según su distancia) y se toca para elegir.
import { useEffect, useId } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import { Th } from '@/components/ui';

import { offOf, yOf, type Geo } from './road';

export type SignState = 'idle' | 'ok' | 'bad' | 'hint' | 'dim';
const SW = 176;
const SH = 236;

const TONE: Record<SignState, [string, string, string]> = {
  idle: ['#FFE066', '#F2B705', '#1D2347'],
  hint: ['#9BF0C4', '#2DBE78', '#0B5E37'],
  ok: ['#7CE6AE', '#13854F', '#FFFFFF'],
  bad: ['#FF8C8C', '#D93A3F', '#FFFFFF'],
  dim: ['#F4E9C2', '#D9C68A', '#6B6A60'],
};

function fit(text: string, latin: boolean) {
  const n = [...text].length;
  if (latin) return n <= 6 ? 30 : n <= 10 ? 25 : n <= 16 ? 20 : 16;
  return n <= 3 ? 44 : n <= 6 ? 36 : n <= 10 ? 28 : 22;
}

/** `side` −1 izquierda · 1 derecha; `z` es la distancia compartida de las dos señales; `dir` el sentido de la curva. */
export function RoadSign({ g, side, z, curve, dir, text, latin, state, onChoose, label }: { g: Geo; side: -1 | 1; z: SharedValue<number>; curve: SharedValue<number>; dir: -1 | 1; text: string; latin: boolean; state: SignState; onChoose: (side: 0 | 1, e: GestureResponderEvent) => void; label: string }) {
  const u = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const pop = useSharedValue(1);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (state === 'ok' || state === 'hint') pop.value = withSequence(withTiming(1.22, { duration: 120 }), withSpring(1.06, { damping: 7, stiffness: 220 }));
    else if (state === 'bad') shake.value = withSequence(withTiming(-14, { duration: 50 }), withTiming(14, { duration: 60 }), withTiming(-9, { duration: 60 }), withTiming(6, { duration: 60 }), withTiming(0, { duration: 60 }));
    else pop.value = withTiming(state === 'dim' ? 0.92 : 1, { duration: 150 });
  }, [state, pop, shake]);
  const st = useAnimatedStyle(() => {
    const zz = Math.max(0.95, z.value);
    const s = Math.min(1.12, (2.6 / zz) * 0.85);
    const half = (SW * s) / 2;
    const raw = g.W / 2 + offOf(g, curve.value, zz) + side * (g.road / zz + 14 / zz + half * 0.92);
    const x = Math.max(half + 2, Math.min(g.W - half - 2, raw));
    const y = Math.min(yOf(g, zz), g.H + SH);
    return {
      opacity: zz > 26 ? Math.max(0, (30 - zz) / 4) : zz < 1.08 ? Math.max(0, (zz - 0.95) / 0.13) : 1,
      transform: [{ translateX: x - SW / 2 + shake.value }, { translateY: y - SH }, { scale: s * pop.value }],
    };
  });
  const [hi, mid, ink] = TONE[state];
  const size = fit(text, latin);
  const arrow = dir > 0 ? 'M81 52 V40 C81 32 87 28 97 28 M91 21 L98 28 L91 35' : 'M95 52 V40 C95 32 89 28 79 28 M85 21 L78 28 L85 35';
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: SW, height: SH, transformOrigin: `${SW / 2}px ${SH}px` }, st]}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={(e) => onChoose(side < 0 ? 0 : 1, e)} disabled={state !== 'idle'} hitSlop={8} style={{ width: SW, height: SH }}>
        <Svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={u} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={hi} />
              <Stop offset="1" stopColor={mid} />
            </LinearGradient>
            <LinearGradient id={`${u}p`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#8E98A6" />
              <Stop offset="0.5" stopColor="#E6EBF0" />
              <Stop offset="1" stopColor="#7C8694" />
            </LinearGradient>
          </Defs>
          <Rect x={82} y={140} width={12} height={96} fill={`url(#${u}p)`} />
          <Rect x={82} y={176} width={12} height={8} fill="#D93A3F" />
          <Rect x={82} y={196} width={12} height={8} fill="#FFFFFF" />
          <Path d="M88 4 L120 36 L88 68 L56 36 Z" fill={`url(#${u})`} stroke="#1D2347" strokeWidth={4} strokeLinejoin="round" />
          <Path d={arrow} stroke="#1D2347" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Rect x={6} y={66} width={164} height={80} rx={14} fill="#1D2347" />
          <Rect x={10} y={70} width={156} height={72} rx={11} fill={`url(#${u})`} />
          <Rect x={16} y={76} width={144} height={60} rx={8} fill="none" stroke={ink} strokeOpacity={0.35} strokeWidth={1.6} />
          <Path d="M18 80 H110" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.5} />
        </Svg>
        <View style={styles.board} pointerEvents="none">
          {latin ? (
            <Text style={[styles.latin, { fontSize: size, lineHeight: size * 1.12, color: ink }]} numberOfLines={2}>
              {text}
            </Text>
          ) : (
            <Th size={size} bold numberOfLines={1} style={{ color: ink, lineHeight: size * 1.5 }}>
              {text}
            </Th>
          )}
        </View>
        {state === 'ok' || state === 'bad' || state === 'hint' ? (
          <View style={[styles.badge, { backgroundColor: state === 'bad' ? color.laca : color.arrozalVivo }]} pointerEvents="none">
            <Text style={styles.badgeText}>{state === 'bad' ? '✕' : '✓'}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: { position: 'absolute', left: 14, right: 14, top: 72, height: 68, alignItems: 'center', justifyContent: 'center' },
  latin: { fontFamily: font.displayBold, textAlign: 'center' },
  badge: { position: 'absolute', right: 2, top: 54, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  badgeText: { fontFamily: font.uiBlack, fontSize: 20, color: '#FFFFFF', lineHeight: 24 },
});
