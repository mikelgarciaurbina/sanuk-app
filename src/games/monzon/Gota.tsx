// Gota de Monzón: agua con volumen (degradado radial, brillo, borde y sombra interior) que cae tambaleándose
// con su palabra thai (y su transcripción debajo mientras no se sabe leer). La letra se ajusta para que la palabra
// quepa entera. Al acertar revienta; al fallar se enturbia y cae de golpe; si es una pista, lleva un halo dorado.
import { useEffect, useId, useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { color } from '@/brand/tokens';
import { Rom, Th } from '@/components/ui';
import type { Word } from '@/content/types';

import { Glow } from '../fx';
import { fitTh } from '../palabras/common';

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
  rom,
  hint,
  onPress,
}: {
  word: Word;
  x: number;
  fallTo: number;
  dur: number;
  state: DropState;
  golden: boolean;
  /** transcripción bajo el thai (siempre mientras no se sabe leer) */
  rom: boolean;
  /** pista: la gota buena vuelve con un halo cuando ya se ha escapado (lecciones) */
  hint: boolean;
  onPress: (e: GestureResponderEvent) => void;
}) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduced = useReducedMotion();
  // la gota cae hasta donde estaba el arrozal cuando nació: si el campo cambia de alto a mitad de caída (un aviso de
  // dos líneas, la llama de la racha), no vuelve a empezar la caída ni se desfasa del momento en que toca el agua
  const [to] = useState(fallTo);
  const y = useSharedValue(-DROP_H);
  const wob = useSharedValue(0);
  const pop = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    y.value = withTiming(to, { duration: dur, easing: Easing.linear });
    if (!reduced) wob.value = withRepeat(withTiming(1, { duration: 520 + Math.round(dur / 40), easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(y);
  }, [y, wob, to, dur, reduced]);

  useEffect(() => {
    if (state === 'pop') {
      cancelAnimation(y);
      pop.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    }
    if (state === 'bad') {
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 60 }), withTiming(-5, { duration: 60 }), withTiming(0, { duration: 60 }));
      y.set(withTiming(to + 80, { duration: 520, easing: Easing.in(Easing.quad) }));
    }
  }, [state, y, pop, shake, to]);

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
  // la gota es más estrecha arriba: con transcripción el thai sube un poco y va más pequeño
  const fit = fitTh(word.th, rom ? 64 : 70, rom ? 19 : 24, rom ? 10 : 11);
  const romSize = Math.max(8.5, Math.min(11.5, 70 / (0.54 * word.rom.length)));
  return (
    <Animated.View pointerEvents={state === 'fall' ? 'auto' : 'none'} style={[styles.drop, { left: x }, st]}>
      {hint && state === 'fall' ? <Glow size={DROP_W + 64} tint={color.buatong} strength={0.85} style={styles.hint} /> : null}
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
          <Th size={fit.size} bold numberOfLines={fit.lines} style={{ color: t.text, lineHeight: Math.round(fit.size * 1.4), textAlign: 'center' }}>
            {word.th}
          </Th>
          {rom ? (
            <View style={{ maxHeight: Math.ceil(romSize * 1.3) + 1, overflow: 'hidden' }}>
              <Rom rom={word.rom} size={romSize} mono={t.text} />
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drop: { position: 'absolute', top: 0, width: DROP_W, height: DROP_H },
  press: { width: DROP_W, height: DROP_H },
  label: { position: 'absolute', left: 4, right: 4, top: 40, height: 58, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', left: -32, top: 68 - (DROP_W + 64) / 2 },
});
