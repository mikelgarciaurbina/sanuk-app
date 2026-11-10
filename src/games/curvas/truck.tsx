// La camioneta roja vista desde atrás, con Noi sentada en la caja; se inclina en las curvas, derrapa,
// rebota con los baches y enciende las luces de freno. También el polvo y el cuentakilómetros.
import { useEffect, useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import type { NoiPose } from '@/brand/noi-art';

const TW = 160;
const TH = 130;

function Cab({ u }: { u: string }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${TW} ${TH}`}>
      <Defs>
        <LinearGradient id={`${u}c`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F2675D" />
          <Stop offset="1" stopColor="#B7302A" />
        </LinearGradient>
        <LinearGradient id={`${u}w`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3A4A70" />
          <Stop offset="1" stopColor="#141A33" />
        </LinearGradient>
      </Defs>
      <Rect x={22} y={30} width={10} height={12} rx={3} fill="#2B2F3A" />
      <Rect x={128} y={30} width={10} height={12} rx={3} fill="#2B2F3A" />
      <Path d="M34 58 V18 C34 10 40 6 48 6 H112 C120 6 126 10 126 18 V58 Z" fill={`url(#${u}c)`} />
      <Rect x={42} y={13} width={76} height={34} rx={7} fill={`url(#${u}w)`} />
      <Path d="M58 13 L46 47 H56 L68 13 Z" fill="#FFFFFF" opacity={0.16} />
      <Path d="M40 8 H120" stroke="#FFFFFF" strokeWidth={2} opacity={0.35} strokeLinecap="round" />
    </Svg>
  );
}

function Bed({ u }: { u: string }) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${TW} ${TH}`}>
      <Defs>
        <LinearGradient id={`${u}t`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F45A50" />
          <Stop offset="1" stopColor="#A1231D" />
        </LinearGradient>
        <LinearGradient id={`${u}b`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#D9DEE5" />
          <Stop offset="1" stopColor="#8A94A3" />
        </LinearGradient>
      </Defs>
      <Rect x={14} y={92} width={30} height={34} rx={7} fill="#1B1F2B" />
      <Rect x={116} y={92} width={30} height={34} rx={7} fill="#1B1F2B" />
      <Path d="M20 100 V120 M27 100 V120 M34 100 V120 M122 100 V120 M129 100 V120 M136 100 V120" stroke="#3A4152" strokeWidth={2.2} />
      <Rect x={9} y={54} width={142} height={54} rx={11} fill={`url(#${u}t)`} />
      <Rect x={9} y={52} width={142} height={9} rx={4.5} fill="#8E1E19" />
      <Path d="M20 68 H140 M20 98 H140" stroke="#FF8F86" strokeWidth={1.6} opacity={0.6} />
      <Rect x={14} y={63} width={15} height={27} rx={4} fill="#FF3B30" />
      <Rect x={131} y={63} width={15} height={27} rx={4} fill="#FF3B30" />
      <Rect x={16} y={65} width={5} height={10} rx={2} fill="#FFFFFF" opacity={0.6} />
      <Rect x={133} y={65} width={5} height={10} rx={2} fill="#FFFFFF" opacity={0.6} />
      <Rect x={54} y={74} width={52} height={22} rx={4} fill="#FFF6E0" stroke="#3B3F4C" strokeWidth={1.4} />
      <Rect x={5} y={104} width={150} height={13} rx={6} fill={`url(#${u}b)`} />
      <Rect x={18} y={115} width={18} height={12} rx={2} fill="#14161E" />
      <Rect x={124} y={115} width={18} height={12} rx={2} fill="#14161E" />
      <Ellipse cx={134} cy={119} rx={5} ry={3.2} fill="#5E6672" />
      <Path d="M14 58 H146" stroke="#FFFFFF" strokeWidth={1.6} opacity={0.35} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * La camioneta. `curve` la inclina hacia fuera de la curva, `steer`/`roll` son el volantazo o el derrape,
 * `dist`/`speed` hacen los baches y `brake` enciende las luces.
 */
export function Truck({ width, curve, steer, roll, dist, speed, brake, pose, jump }: { width: number; curve: SharedValue<number>; steer: SharedValue<number>; roll: SharedValue<number>; dist: SharedValue<number>; speed: SharedValue<number>; brake: SharedValue<number>; pose: NoiPose; jump: number }) {
  const u = `t${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const k = width / TW;
  const h = TH * k;
  const st = useAnimatedStyle(() => ({
    transform: [
      { translateX: -curve.value * 220 + steer.value },
      { translateY: Math.sin(dist.value * 7) * 1.4 * Math.min(1, speed.value / 6) },
      { rotate: `${-curve.value * 30 + roll.value}deg` },
    ],
  }));
  const lights = useAnimatedStyle(() => ({ opacity: brake.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ width, height: h, transformOrigin: `${width / 2}px ${h * 0.9}px` }, st]}>
      <View style={[styles.shadow, { left: width * 0.04, right: width * 0.04, top: h * 0.86, height: h * 0.16 }]} />
      <View style={StyleSheet.absoluteFill}>
        <Cab u={u} />
      </View>
      <View style={{ position: 'absolute', left: width * 0.5 - 46 * k, top: -18 * k }}>
        <Noi pose={pose} size={92 * k} jump={jump} />
      </View>
      <View style={StyleSheet.absoluteFill}>
        <Bed u={u} />
      </View>
      <View style={[styles.plate, { left: 54 * k, top: 74 * k, width: 52 * k, height: 22 * k }]}>
        <Text style={[styles.plateText, { fontSize: 9 * k, lineHeight: 12 * k }]} numberOfLines={1}>
          แม่ฮ่องสอน
        </Text>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, lights]}>
        <View style={[styles.glow, { left: 6 * k, top: 56 * k, width: 31 * k, height: 41 * k, borderRadius: 16 * k }]} />
        <View style={[styles.glow, { left: 123 * k, top: 56 * k, width: 31 * k, height: 41 * k, borderRadius: 16 * k }]} />
      </Animated.View>
    </Animated.View>
  );
}

/** Luces largas: el charco de luz de los faros sobre la carretera (de noche). */
export function Beams() {
  const u = `b${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={u} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#FFF3B0" stopOpacity={0.55} />
          <Stop offset="0.7" stopColor="#FFF3B0" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#FFF3B0" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d="M30 100 L44 0 H56 L70 100 Z" fill={`url(#${u})`} />
    </Svg>
  );
}

/** Nube de polvo que sale de las ruedas y se disipa. */
export function Puff({ x, y, dx, dy, size, tint }: { x: number; y: number; dx: number; dy: number; size: number; tint: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 820, easing: Easing.out(Easing.quad) });
  }, [p]);
  const st = useAnimatedStyle(() => ({ opacity: (1 - p.value) * 0.7, transform: [{ translateX: dx * p.value }, { translateY: dy * p.value }, { scale: 0.4 + p.value * 1.4 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size, backgroundColor: tint }, st]} />;
}

/** Cuentakilómetros: esfera con arco de colores y aguja que sigue la velocidad. */
export function Speedometer({ speed, kmh, size = 70, perKmh }: { speed: SharedValue<number>; kmh: number; size?: number; perKmh: number }) {
  const u = `m${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const needle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-120 + Math.min(1, (speed.value * perKmh) / 140) * 240}deg` }] }));
  const ticks = Array.from({ length: 8 }, (_, i) => -120 + i * (240 / 7));
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${kmh} kilómetros por hora`}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2B3466" />
            <Stop offset="1" stopColor="#11163A" />
          </LinearGradient>
          <LinearGradient id={`${u}a`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#2DBE78" />
            <Stop offset="0.6" stopColor="#FFC83D" />
            <Stop offset="1" stopColor="#FF4F33" />
          </LinearGradient>
        </Defs>
        <Circle cx={50} cy={50} r={48} fill="#FFFFFF" />
        <Circle cx={50} cy={50} r={44} fill={`url(#${u}f)`} />
        <Path d="M19.5 72.3 A37 37 0 1 1 80.5 72.3" stroke={`url(#${u}a)`} strokeWidth={6} fill="none" strokeLinecap="round" />
        <G>
          {ticks.map((a) => (
            <Path key={a} d="M50 18 V24" stroke="#FFFFFF" strokeWidth={2} transform={`rotate(${a} 50 50)`} opacity={0.8} />
          ))}
        </G>
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center' }, needle]}>
        <View style={{ marginTop: size * 0.16, width: size * 0.045, height: size * 0.36, borderRadius: size, backgroundColor: '#FF6A3D' }} />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: size * 0.1 }]} pointerEvents="none">
        <View style={{ position: 'absolute', top: size / 2 - size * 0.07, width: size * 0.14, height: size * 0.14, borderRadius: size, backgroundColor: '#FFFFFF' }} />
        <Text style={[styles.kmh, { fontSize: size * 0.2 }]}>{kmh}</Text>
        <Text style={[styles.kmhUnit, { fontSize: size * 0.11 }]}>km/h</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.3)' },
  plate: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  plateText: { fontFamily: font.thaiBold, color: '#9E2B27' },
  glow: { position: 'absolute', backgroundColor: 'rgba(255,60,48,0.55)', shadowColor: '#FF3B30', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  kmh: { fontFamily: font.displayBold, color: '#FFFFFF', lineHeight: undefined },
  kmhUnit: { fontFamily: font.uiHeavy, color: '#C9D0EE', marginTop: -3 },
});
