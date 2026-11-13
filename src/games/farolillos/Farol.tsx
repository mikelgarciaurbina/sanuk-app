// Farolillos de Yi Peng: papel con luz cálida por dentro (degradado radial desde la llama), costillas de bambú
// y una llama que tiembla. El farolillo flota esperando con su palabra thai (y su transcripción mientras no se
// sabe leer); si es de la categoría sube al cielo con estela, si no, se balancea y se apaga. Al acabar la ronda,
// los que nadie tocó se apagan despacio y enseñan lo que significaban. En el cielo quedan los soltados, titilando.
import { useEffect, useId, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { font } from '@/brand/tokens';
import { Rom, Th } from '@/components/ui';
import type { Word } from '@/content/types';

import { Glow } from '../fx';
import { fitTh } from '../palabras/common';

export const LW = 84;
export const LH = 106;

/** `rest`: no era de la categoría y nadie lo tocó: al acabar la ronda se apaga y enseña su significado. */
export type LanternState = 'float' | 'ok' | 'bad' | 'lost' | 'rest';

const BODY = 'M9 22 Q42 6 75 22 L68 84 Q42 96 16 84 Z';

/** Dibujo del farolillo (encendido o apagado). */
export function LanternArt({ lit, size = 1, u }: { lit: boolean; size?: number; u: string }) {
  const w = LW * size;
  const h = LH * size;
  return (
    <Svg width={w} height={h} viewBox="0 0 84 106">
      <Defs>
        <RadialGradient id={`${u}b`} cx="50%" cy="78%" r="72%">
          <Stop offset="0" stopColor={lit ? '#FFF6C4' : '#7F88B8'} />
          <Stop offset="0.42" stopColor={lit ? '#FFC15A' : '#4C5590'} />
          <Stop offset="1" stopColor={lit ? '#E8552E' : '#2A3166'} />
        </RadialGradient>
        <LinearGradient id={`${u}s`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000000" stopOpacity={0.22} />
          <Stop offset="0.35" stopColor="#000000" stopOpacity={0} />
          <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.25} />
        </LinearGradient>
      </Defs>
      <Path d={BODY} fill={`url(#${u}b)`} />
      <Path d={BODY} fill={`url(#${u}s)`} />
      <G stroke={lit ? '#B7411A' : '#1E2350'} strokeOpacity={0.35} strokeWidth={1.4} fill="none">
        <Path d="M28 14 Q24 50 29 90" />
        <Path d="M42 11 L42 93" />
        <Path d="M56 14 Q60 50 55 90" />
        <Path d="M12 40 Q42 30 72 40" />
        <Path d="M14 64 Q42 72 70 64" />
      </G>
      <Ellipse cx={42} cy={20} rx={33} ry={6} fill={lit ? '#9A2E12' : '#20264F'} />
      <Ellipse cx={42} cy={86} rx={26} ry={6} fill={lit ? '#7A2410' : '#1A1F45'} />
      <Ellipse cx={42} cy={85} rx={18} ry={3.5} fill={lit ? '#FFE07A' : '#2A3166'} opacity={lit ? 0.9 : 1} />
    </Svg>
  );
}

function Flame({ lit }: { lit: boolean }) {
  const reduced = useReducedMotion();
  const f = useSharedValue(0);
  const on = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    f.value = withRepeat(withSequence(withTiming(1, { duration: 140 }), withTiming(0.3, { duration: 110 }), withTiming(0.75, { duration: 130 })), -1, true);
  }, [f, reduced]);
  useEffect(() => {
    on.value = withTiming(lit ? 1 : 0, { duration: 380 });
  }, [lit, on]);
  const st = useAnimatedStyle(() => ({ opacity: on.value * (0.75 + 0.25 * f.value), transform: [{ scaleY: (0.8 + 0.35 * f.value) * on.value }, { scaleX: 0.9 + 0.1 * f.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.flame, st]}>
      <Svg width={16} height={22} viewBox="0 0 16 22">
        <Path d="M8 0 C12 6 15 10 15 14 A7 7 0 0 1 1 14 C1 10 4 6 8 0 Z" fill="#FFB020" />
        <Path d="M8 7 C10 10 11.5 12 11.5 14.5 A3.5 3.5 0 0 1 4.5 14.5 C4.5 12 6 10 8 7 Z" fill="#FFF8D6" />
      </Svg>
    </Animated.View>
  );
}

/** Farolillo de la ronda, con su palabra thai. */
export function Farol({
  word,
  x,
  y,
  state,
  delay,
  showEs,
  rom,
  onPress,
}: {
  word: Word;
  x: number;
  y: number;
  state: LanternState;
  delay: number;
  showEs: boolean;
  /** transcripción bajo el thai (siempre mientras no se sabe leer) */
  rom: boolean;
  onPress: (e: GestureResponderEvent) => void;
}) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduced = useReducedMotion();
  const [bob] = useState(() => ({ ms: 2200 + Math.random() * 900, amp: 4 + Math.random() * 4, rot: 2 + Math.random() * 3 }));
  const t = useSharedValue(0.5);
  const appear = useSharedValue(0);
  const rise = useSharedValue(0);
  const sink = useSharedValue(0);
  const sway = useSharedValue(0);
  const glow = useSharedValue(0.6);

  useEffect(() => {
    appear.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 110 }));
    if (!reduced) t.value = withDelay(delay, withRepeat(withTiming(1, { duration: bob.ms, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [appear, t, delay, reduced, bob.ms]);

  useEffect(() => {
    if (state === 'ok') {
      glow.value = withSequence(withTiming(1.25, { duration: 160 }), withTiming(1, { duration: 300 }));
      rise.value = withTiming(1, { duration: 1700, easing: Easing.in(Easing.quad) });
    } else if (state === 'lost') {
      rise.value = withTiming(1, { duration: 2600, easing: Easing.in(Easing.quad) });
      glow.value = withTiming(0.35, { duration: 600 });
    } else if (state === 'bad') {
      glow.value = withTiming(0, { duration: 400 });
      sway.value = withSequence(withTiming(-14, { duration: 120 }), withTiming(11, { duration: 160 }), withTiming(-7, { duration: 160 }), withTiming(4, { duration: 150 }), withTiming(0, { duration: 150 }));
      sink.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
    } else if (state === 'rest') {
      // se apaga sin susto: solo baja la luz y da un pequeño vaivén
      glow.value = withTiming(0, { duration: 500 });
      sway.value = withSequence(withTiming(-5, { duration: 160 }), withTiming(4, { duration: 180 }), withTiming(0, { duration: 180 }));
      sink.value = withTiming(0.35, { duration: 700, easing: Easing.out(Easing.quad) });
    }
  }, [state, rise, glow, sway, sink]);

  const st = useAnimatedStyle(() => {
    const a = appear.value;
    const r = rise.value;
    return {
      opacity: Math.min(1, a * 1.5) * (1 - Math.max(0, r - 0.75) * 4) * (1 - sink.value * 0.45),
      transform: [
        { translateY: (1 - a) * 90 + (t.value - 0.5) * 2 * bob.amp - r * (y + LH + 140) + sink.value * 26 },
        { translateX: Math.sin(r * Math.PI * 2) * 10 },
        { rotate: `${(t.value - 0.5) * 2 * bob.rot + sway.value}deg` },
        { scale: (0.6 + 0.4 * a) * (1 - 0.45 * r) },
      ],
    };
  });
  const halo = useAnimatedStyle(() => ({ opacity: glow.value * 0.9, transform: [{ scale: 0.85 + 0.25 * glow.value }] }));
  const trail = useAnimatedStyle(() => ({ opacity: Math.min(1, rise.value * 3) * (1 - rise.value * 0.6), transform: [{ scaleY: 0.3 + rise.value * 1.4 }] }));

  const lit = state !== 'bad' && state !== 'rest';
  // el papel se estrecha hacia abajo: con transcripción el thai va en una línea y algo más pequeño
  const fit = fitTh(word.th, 66, rom ? 17 : 20, rom ? 10 : 11);
  const romSize = Math.max(8.5, Math.min(11, 66 / (0.54 * word.rom.length)));
  const ink = lit ? '#4A1A05' : '#C9D0EE';
  return (
    <Animated.View pointerEvents={state === 'float' ? 'auto' : 'none'} style={[styles.wrap, { left: x, top: y }, st]}>
      <Animated.View pointerEvents="none" style={[styles.trail, trail]} />
      <Animated.View pointerEvents="none" style={[styles.halo, halo]}>
        <Glow size={LW + 70} tint="#FFA94D" strength={0.7} pulse={false} />
      </Animated.View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Farolillo: ${word.th}`} disabled={state !== 'float'} onPress={onPress} style={{ width: LW, height: LH }}>
        <LanternArt lit={lit} u={u} />
        <Flame lit={lit && state !== 'lost'} />
        <View style={styles.label}>
          <Th size={fit.size} bold numberOfLines={fit.lines} style={{ color: ink, lineHeight: Math.round(fit.size * 1.4), textAlign: 'center' }}>
            {word.th}
          </Th>
          {rom ? (
            <View style={{ maxHeight: Math.ceil(romSize * 1.3) + 1, overflow: 'hidden' }}>
              <Rom rom={word.rom} size={romSize} mono={ink} />
            </View>
          ) : null}
        </View>
      </Pressable>
      {showEs ? (
        <Text numberOfLines={1} style={styles.es}>
          {word.es}
        </Text>
      ) : null}
    </Animated.View>
  );
}

/** Farolillo pequeño ya suelto en el cielo: titila y se mece. */
export function Lucero({ x, y, s, delay, up }: { x: number; y: number; s: number; delay: number; up: boolean }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  const a = useSharedValue(0);
  const fly = useSharedValue(0);
  useEffect(() => {
    a.value = withTiming(1, { duration: 900 });
    if (!reduced) t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1600 + delay / 2, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [a, t, delay, reduced]);
  useEffect(() => {
    if (up) fly.value = withDelay(delay / 3, withTiming(1, { duration: 2600, easing: Easing.in(Easing.quad) }));
  }, [up, fly, delay]);
  const st = useAnimatedStyle(() => ({
    opacity: a.value * (0.65 + 0.35 * t.value) * (1 - fly.value),
    transform: [{ translateY: (t.value - 0.5) * 6 - fly.value * 260 }, { scale: s * (1 - fly.value * 0.4) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - LW / 2, top: y - LH / 2, width: LW, height: LH }, st]}>
      <View style={styles.skyGlow}>
        <Glow size={LW + 80} tint="#FFB25C" strength={0.8} pulse={false} />
      </View>
      <LanternArt lit u={u} />
    </Animated.View>
  );
}

/** Farolillo de la gran suelta final (sube desde abajo hasta perderse). */
export function Suelta({ x, h, delay, s }: { x: number; h: number; delay: number; s: number }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 4200, easing: Easing.out(Easing.quad) }));
  }, [p, delay]);
  const st = useAnimatedStyle(() => ({
    opacity: p.value < 0.08 ? p.value * 12 : 1 - Math.max(0, p.value - 0.7) / 0.3,
    transform: [{ translateY: h - p.value * (h + 120) }, { translateX: Math.sin(p.value * Math.PI * 3) * 14 }, { scale: s * (1 - p.value * 0.55) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - LW / 2, top: 0, width: LW, height: LH }, st]}>
      <View style={styles.skyGlow}>
        <Glow size={LW + 80} tint="#FFB25C" strength={0.8} pulse={false} />
      </View>
      <LanternArt lit u={u} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', width: LW, height: LH },
  halo: { position: 'absolute', left: -35, top: LH / 2 - (LW + 70) / 2 + 6, width: LW + 70, height: LW + 70 },
  trail: { position: 'absolute', left: LW / 2 - 7, top: LH - 6, width: 14, height: 120, borderRadius: 7, backgroundColor: 'rgba(255,210,120,0.55)', shadowColor: '#FFC15A', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  flame: { position: 'absolute', left: LW / 2 - 8, top: 70, width: 16, height: 22 },
  label: { position: 'absolute', left: 3, right: 3, top: 26, height: 52, alignItems: 'center', justifyContent: 'center' },
  es: { position: 'absolute', left: -30, right: -30, top: LH + 2, textAlign: 'center', fontFamily: font.uiHeavy, fontSize: 13, color: '#FFE7B0', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  skyGlow: { position: 'absolute', left: -40, top: -28, width: LW + 80, height: LW + 80 },
});
