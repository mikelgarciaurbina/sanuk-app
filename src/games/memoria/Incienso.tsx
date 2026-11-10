// Reloj de la feria en Memoria del templo: una varilla de incienso sobre un cuenco de latón que se consume
// de derecha a izquierda, con la brasa encendida y volutas de humo que suben.
import { useEffect, useId, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { font } from '@/brand/tokens';

import { Glow, Pop } from '../fx';

export const INC_H = 44;
const PILL = 54;
const BOWL = 30;
const STICK_Y = 27;

export function incGeom(width: number) {
  const x0 = PILL + BOWL - 6;
  const x1 = Math.max(x0 + 40, width - 8);
  return { x0, x1, len: x1 - x0 };
}

export function Incienso({ burn, width, secs }: { burn: SharedValue<number>; width: number; secs: number }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { x0, len } = incGeom(width);
  const low = secs <= 10;
  const clip = useAnimatedStyle(() => ({ width: Math.max(0, (1 - Math.min(1, Math.max(0, burn.value))) * len) }));
  const ember = useAnimatedStyle(() => ({ transform: [{ translateX: x0 + (1 - Math.min(1, Math.max(0, burn.value))) * len - 10 }] }));
  const mm = Math.floor(Math.max(0, secs) / 60);
  const ss = String(Math.max(0, secs) % 60).padStart(2, '0');
  return (
    <View style={{ height: INC_H, width }} pointerEvents="none">
      {/* cuenco de latón */}
      <View style={{ position: 'absolute', left: PILL - 2, top: STICK_Y - 8, width: BOWL + 4, height: 22 }}>
        <Svg width={BOWL + 4} height={22} viewBox="0 0 34 22">
          <Defs>
            <LinearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#8A5A12" />
              <Stop offset="0.4" stopColor="#FFD86B" />
              <Stop offset="1" stopColor="#A86F10" />
            </LinearGradient>
          </Defs>
          <Ellipse cx={17} cy={19.5} rx={13} ry={2.5} fill="#5A2A10" opacity={0.25} />
          <Path d="M2 7 Q17 13 32 7 Q30 19 17 19 Q4 19 2 7 Z" fill={`url(#${u}b)`} />
          <Ellipse cx={17} cy={7} rx={15} ry={3.4} fill="#C98F2A" />
          <Ellipse cx={17} cy={6.6} rx={12} ry={2.2} fill="#8A6A55" />
        </Svg>
      </View>
      {/* varilla: lo que queda sin quemar */}
      <Animated.View style={[{ position: 'absolute', left: x0, top: STICK_Y - 4, height: 9, overflow: 'hidden' }, clip]}>
        <Svg width={len} height={9}>
          <Defs>
            <LinearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#D9785A" />
              <Stop offset="0.5" stopColor="#A4402A" />
              <Stop offset="1" stopColor="#6E2414" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={2.5} width={14} height={3.5} rx={1.7} fill="#E8C27A" />
          <Rect x={10} y={0.5} width={len} height={7.5} rx={3.7} fill={`url(#${u}s)`} />
          <Rect x={13} y={2} width={len} height={1.4} fill="#FFFFFF" opacity={0.35} />
        </Svg>
      </Animated.View>
      {/* brasa con humo */}
      <Animated.View style={[{ position: 'absolute', left: 0, top: STICK_Y - 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }, ember]}>
        <Glow size={low ? 64 : 46} tint={low ? '#FF5A2A' : '#FF9A3D'} strength={0.9} style={{ position: 'absolute', left: 10 - (low ? 32 : 23), top: 10 - (low ? 32 : 23) }} />
        <Smoke delay={0} />
        <Smoke delay={1300} flip />
        <View style={styles.ember} />
      </Animated.View>
      <Pop trigger={low ? secs : 0} scale={1.25} style={[styles.time, low ? styles.timeLow : null]}>
        <Text style={[styles.timeText, low ? { color: '#FFFFFF' } : null]}>
          {mm}:{ss}
        </Text>
      </Pop>
    </View>
  );
}

function Smoke({ delay, flip }: { delay: number; flip?: boolean }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  const [k] = useState(() => 0.8 + Math.random() * 0.4);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false));
  }, [t, delay, reduced]);
  const st = useAnimatedStyle(() => ({
    opacity: t.value < 0.15 ? t.value / 0.15 * 0.7 : 0.7 * (1 - t.value),
    transform: [{ translateY: -34 * t.value * k }, { translateX: Math.sin(t.value * Math.PI * 1.6) * 6 * (flip ? -1 : 1) }, { scale: 0.7 + 0.9 * t.value }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 3, top: -18, width: 14, height: 26 }, st]}>
      <Svg width={14} height={26} viewBox="0 0 14 26">
        <Path d={flip ? 'M8 26 C2 20 12 14 6 8 C3 5 6 2 8 0' : 'M6 26 C12 20 2 14 8 8 C11 5 8 2 6 0'} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ember: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#FFE08A', borderWidth: 2, borderColor: '#FF6A2A', shadowColor: '#FF6A2A', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  time: {
    position: 'absolute',
    left: 0,
    top: STICK_Y - 13,
    width: PILL - 6,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.5,
    borderColor: '#E9B44C',
  },
  timeLow: { backgroundColor: '#E2474C', borderColor: '#FFC8B8' },
  timeText: { fontFamily: font.displayBold, fontSize: 15, color: '#7A3A10' },
});
