// Gota de Monzón: agua con volumen (degradado radial, brillo, borde y sombra interior) que cae tambaleándose
// con su palabra thai. Al acertar revienta; al fallar se enturbia y cae de golpe.
import { useEffect, useId } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { Th } from '@/components/ui';
import type { Word } from '@/content/types';

export const DROP_W = 86;
export const DROP_H = 106;
const BODY = 'M43 3 C43 3 9 44 9 68 C9 89 24 102 43 102 C62 102 77 89 77 68 C77 44 43 3 43 3 Z';

export type DropState = 'fall' | 'pop' | 'bad';

const TINT = {
  agua: { hi: '#F2FAFF', mid: '#9BD3FF', lo: '#3E8FE6', rim: '#2A6CC4', text: '#0D2A58' },
  oro: { hi: '#FFFBE0', mid: '#FFD666', lo: '#E59A10', rim: '#B87400', text: '#4A2F00' },
  turbia: { hi: '#F3F1F4', mid: '#C9C2CF', lo: '#8E8597', rim: '#6E6478', text: '#3A3342' },
};

export function Gota({
  word,
  x,
  fallTo,
  dur,
  state,
  golden,
  onPress,
}: {
  word: Word;
  x: number;
  fallTo: number;
  dur: number;
  state: DropState;
  golden: boolean;
  onPress: (e: GestureResponderEvent) => void;
}) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduced = useReducedMotion();
  const y = useSharedValue(-DROP_H);
  const wob = useSharedValue(0);
  const pop = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    y.value = withTiming(fallTo, { duration: dur, easing: Easing.linear });
    if (!reduced) wob.value = withRepeat(withTiming(1, { duration: 520 + Math.round(dur / 40), easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(y);
  }, [y, wob, fallTo, dur, reduced]);

  useEffect(() => {
    if (state === 'pop') {
      cancelAnimation(y);
      pop.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    }
    if (state === 'bad') {
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 60 }), withTiming(-5, { duration: 60 }), withTiming(0, { duration: 60 }));
      y.set(withTiming(fallTo + 80, { duration: 520, easing: Easing.in(Easing.quad) }));
    }
  }, [state, y, pop, shake, fallTo]);

  const st = useAnimatedStyle(() => ({
    opacity: 1 - pop.value,
    transform: [
      { translateX: shake.value },
      { translateY: y.value },
      { rotate: `${(wob.value - 0.5) * 7}deg` },
      { scaleX: (1 + (wob.value - 0.5) * 0.06) * (1 + pop.value * 0.45) },
      { scaleY: (1 - (wob.value - 0.5) * 0.06) * (1 + pop.value * 0.3) },
    ],
  }));

  const t = state === 'bad' ? TINT.turbia : golden ? TINT.oro : TINT.agua;
  const len = word.th.length;
  const size = len > 9 ? 15 : len > 6 ? 18 : len > 3 ? 21 : 24;
  return (
    <Animated.View pointerEvents={state === 'fall' ? 'auto' : 'none'} style={[styles.drop, { left: x }, st]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Gota: ${word.th}`} disabled={state !== 'fall'} onPress={onPress} style={styles.press}>
        <Svg width={DROP_W} height={DROP_H} viewBox="0 0 86 106" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={`${u}g`} cx="38%" cy="48%" r="62%">
              <Stop offset="0" stopColor={t.hi} />
              <Stop offset="0.5" stopColor={t.mid} />
              <Stop offset="1" stopColor={t.lo} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={43} cy={103} rx={22} ry={3} fill="#1B2A44" opacity={0.18} />
          <Path d={BODY} fill={`url(#${u}g)`} stroke={t.rim} strokeWidth={1.6} />
          <Path d="M22 82 C28 95 46 99 60 93" stroke={t.lo} strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" fill="none" />
          <Ellipse cx={28} cy={52} rx={6} ry={13} fill="#FFFFFF" opacity={0.75} transform="rotate(28 28 52)" />
          <Ellipse cx={36} cy={33} rx={2.6} ry={4} fill="#FFFFFF" opacity={0.8} transform="rotate(28 36 33)" />
        </Svg>
        <View style={styles.label}>
          <Th size={size} bold numberOfLines={1} style={{ color: t.text, lineHeight: Math.round(size * 1.45) }}>
            {word.th}
          </Th>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drop: { position: 'absolute', top: 0, width: DROP_W, height: DROP_H },
  press: { width: DROP_W, height: DROP_H },
  label: { position: 'absolute', left: 6, right: 6, top: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
});
