// Billetes y monedas de baht dibujados: colores reales (20 verde, 50 azul, 100 rojo, 500 morado, 1000 marrón),
// roseta de seguridad, marca de agua con una chedi y cifras thai; monedas plateadas, doradas y la bimetálica de 10.
import { useId, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { font, motion } from '@/brand/tokens';
import { thaiDigits } from '@/lib/thai';

import type { Point } from '../fx';

const NOTE: Record<number, [string, string, string]> = {
  20: ['#17693A', '#38A05E', '#A8E2B4'],
  50: ['#1F4AA8', '#3D73DD', '#A9C5FA'],
  100: ['#A92E2B', '#DC4F49', '#FFB1A3'],
  500: ['#4E2C93', '#7E52C9', '#CDB4F6'],
  1000: ['#5E3922', '#93613F', '#DDB792'],
};

const CHEDI = 'M19 45 H41 V42 H38 C38 35.5 34.6 31.2 30 29.4 C25.4 31.2 22 35.5 22 42 H19 Z M28.4 29.8 L30 14 L31.6 29.8 Z M26 47 H34 V45 H26 Z';

/** Billete de baht (proporción 2:1). */
export function Note({ v, width }: { v: number; width: number }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [dk, md, lt] = NOTE[v] ?? NOTE[20];
  const h = width / 2;
  const big = Math.max(11, width * 0.2);
  return (
    <View style={{ width, height: h }}>
      <Svg width={width} height={h} viewBox="0 0 120 60">
        <Defs>
          <LinearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={lt} />
            <Stop offset="0.5" stopColor={md} />
            <Stop offset="1" stopColor={dk} />
          </LinearGradient>
          <RadialGradient id={`${u}w`} cx="50%" cy="45%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.7} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.05} />
          </RadialGradient>
          <LinearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.45} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="120" height="60" rx="6" fill={`url(#${u}g)`} />
        <Rect x="3.5" y="3.5" width="113" height="53" rx="4" fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1.1} />
        <Rect x="6" y="6" width="108" height="48" rx="3" fill="none" stroke={dk} strokeOpacity={0.35} strokeWidth={0.8} strokeDasharray="2 1.6" />
        <G opacity={0.32}>
          {[0, 30, 60, 90, 120, 150].map((a) => (
            <Ellipse key={a} cx="84" cy="34" rx="17" ry="6" fill="none" stroke="#FFFFFF" strokeWidth={0.9} transform={`rotate(${a} 84 34)`} />
          ))}
        </G>
        <Ellipse cx="30" cy="31" rx="15" ry="19" fill={`url(#${u}w)`} />
        <Path d={CHEDI} fill={dk} opacity={0.5} />
        <Rect x="55" y="0" width="2.2" height="60" fill="#FFFFFF" opacity={0.4} />
        <Rect x="55" y="8" width="2.2" height="5" fill={dk} opacity={0.5} />
        <Rect x="55" y="30" width="2.2" height="5" fill={dk} opacity={0.5} />
        <Rect x="0" y="0" width="120" height="60" rx="6" fill={`url(#${u}s)`} />
      </Svg>
      <Text style={[styles.noteBig, { fontSize: big, lineHeight: big * 1.1, right: width * 0.07, top: h * 0.06 }]}>{v}</Text>
      <Text style={[styles.noteTh, { fontSize: big * 0.48, lineHeight: big * 0.62, right: width * 0.08, bottom: h * 0.08 }]}>{thaiDigits(v)} บาท</Text>
    </View>
  );
}

type CoinLook = { face: [string, string, string]; rim: string; core?: [string, string, string] };
const SILVER: [string, string, string] = ['#FFFFFF', '#CBD3DB', '#7F8C99'];
const GOLD: [string, string, string] = ['#FFF6C8', '#E9C35B', '#A47A18'];
const COIN: Record<number, CoinLook> = {
  1: { face: SILVER, rim: '#8995A2' },
  2: { face: GOLD, rim: '#A87F1C' },
  5: { face: SILVER, rim: '#B4683A' },
  10: { face: SILVER, rim: '#8995A2', core: GOLD },
};
/** Tamaño relativo de cada moneda (la de 10 es la más grande). */
export const COIN_SCALE: Record<number, number> = { 1: 0.76, 2: 0.82, 5: 0.9, 10: 1 };

/** Moneda de baht vista de frente, con canto y brillo. */
export function Coin({ v, size }: { v: number; size: number }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const look = COIN[v] ?? COIN[1];
  const [hi, mid, lo] = look.face;
  const core = look.core;
  const fs = size * (v >= 10 ? 0.36 : 0.42);
  return (
    <View style={{ width: size, height: size * 1.08 }}>
      <Svg width={size} height={size * 1.08} viewBox="0 0 64 69">
        <Defs>
          <RadialGradient id={`${u}f`} cx="35%" cy="30%" r="75%">
            <Stop offset="0" stopColor={hi} />
            <Stop offset="0.55" stopColor={mid} />
            <Stop offset="1" stopColor={lo} />
          </RadialGradient>
          {core ? (
            <RadialGradient id={`${u}c`} cx="38%" cy="32%" r="70%">
              <Stop offset="0" stopColor={core[0]} />
              <Stop offset="0.6" stopColor={core[1]} />
              <Stop offset="1" stopColor={core[2]} />
            </RadialGradient>
          ) : null}
        </Defs>
        <Ellipse cx="32" cy="64" rx="24" ry="4.5" fill="#000000" opacity={0.22} />
        <Circle cx="32" cy="35" r="30" fill={look.rim} />
        <Circle cx="32" cy="31" r="30" fill={`url(#${u}f)`} />
        <Circle cx="32" cy="31" r="26.5" fill="none" stroke={lo} strokeOpacity={0.55} strokeWidth={1.4} strokeDasharray="1.2 2.2" />
        {core ? <Circle cx="32" cy="31" r="18" fill={`url(#${u}c)`} stroke={core[2]} strokeOpacity={0.6} strokeWidth={1} /> : null}
        <Path d="M12 22 C17 12 27 7 37 7.5" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={3.2} strokeLinecap="round" fill="none" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: size * 0.1 }]} pointerEvents="none">
        <Text style={[styles.coinNum, { fontSize: fs, lineHeight: fs * 1.15, color: v === 2 || v === 10 ? '#6E4E08' : '#4A5563' }]}>{v}</Text>
      </View>
    </View>
  );
}

/** Ancho y alto de una pieza (billete o moneda) a partir del ancho de billete. */
export function pieceSize(v: number, noteW: number, coinK = 0.5): { w: number; h: number } {
  if (v >= 20) return { w: noteW, h: noteW / 2 };
  const s = noteW * coinK * (COIN_SCALE[v] ?? 1);
  return { w: s, h: s * 1.08 };
}

export function Money({ v, noteW, coinK }: { v: number; noteW: number; coinK?: number }) {
  const { w } = pieceSize(v, noteW, coinK);
  return v >= 20 ? <Note v={v} width={w} /> : <Coin v={v} size={w} />;
}

/**
 * Pieza de la cartera: se toca o se arrastra a la bandeja. `onDrop(punto, arrastrada)` devuelve si la acepta;
 * si no, vuelve a su sitio con un muelle.
 */
export function WalletPiece({ v, noteW, coinK, disabled, label, onDrop }: { v: number; noteW: number; coinK?: number; disabled?: boolean; label: string; onDrop: (at: Point | null, dragged: boolean) => boolean }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const lift = useSharedValue(0);
  const start = useRef<Point>({ x: 0, y: 0 });
  const back = () => {
    x.set(withSpring(0, motion.boing));
    y.set(withSpring(0, motion.boing));
    lift.set(withSpring(0, motion.boing));
  };
  const st = useAnimatedStyle(() => ({
    zIndex: lift.value > 0.01 ? 50 : 1,
    transform: [{ translateX: x.value }, { translateY: y.value - lift.value * 6 }, { scale: 1 + lift.value * 0.14 }, { rotate: `${lift.value * (v >= 20 ? -6 : 0)}deg` }],
  }));
  const { w, h } = pieceSize(v, noteW, coinK);
  return (
    <Animated.View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => onDrop(null, false)}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        lift.set(withTiming(1, { duration: 90 }));
      }}
      onResponderMove={(e) => {
        x.set(e.nativeEvent.pageX - start.current.x);
        y.set(e.nativeEvent.pageY - start.current.y);
      }}
      onResponderRelease={(e) => {
        const at = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        const moved = Math.abs(at.x - start.current.x) + Math.abs(at.y - start.current.y) > 12;
        const ok = onDrop(moved ? at : start.current, moved);
        if (ok) {
          x.set(0);
          y.set(0);
          lift.set(withSpring(0, motion.boing));
        } else back();
      }}
      onResponderTerminate={back}
      style={[{ width: w, height: h, opacity: disabled ? 0.55 : 1 }, st]}>
      <Money v={v} noteW={noteW} coinK={coinK} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  noteBig: { position: 'absolute', fontFamily: font.displayBold, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 2 },
  noteTh: { position: 'absolute', fontFamily: font.thaiBold, color: '#FFFFFF', opacity: 0.9 },
  coinNum: { fontFamily: font.displayBold, textShadowColor: 'rgba(255,255,255,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0.5 },
});
