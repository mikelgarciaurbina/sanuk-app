// Carta de Memoria del templo: dorso Lanna (oro sobre laca roja para el thai, sobre índigo mo hom para el
// español), cara de papel de arroz, reparto en abanico, volteo 3D con elevación y salida flotando al acertar.
import { useEffect, useId } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { font } from '@/brand/tokens';
import { Rom, Th } from '@/components/ui';
import type { Word } from '@/content/types';

export type Side = 'th' | 'es';
export type CardData = { key: string; pair: string; side: Side; word: Word };

const LACA = { center: '#D9452F', edge: '#741212', line: '#8F1F23' };
const INDIGO = { center: '#4258C4', edge: '#151C58', line: '#2B3A86' };

/** Dorso Lanna dibujado: marco doble de oro, esquinas con voluta, loto central y corona de puntos. */
function Back({ side, u }: { side: Side; u: string }) {
  const c = side === 'th' ? LACA : INDIGO;
  const dots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * 27, y: 62 + Math.sin(a) * 27 };
  });
  const corner = 'M9 26 Q9 9 26 9 M14 21 Q14 14 21 14';
  return (
    <View style={[StyleSheet.absoluteFill, styles.round]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 128" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={`${u}b`} cx="50%" cy="44%" r="75%">
            <Stop offset="0" stopColor={c.center} />
            <Stop offset="1" stopColor={c.edge} />
          </RadialGradient>
          <LinearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFF0B3" />
            <Stop offset="0.45" stopColor="#E9A92B" />
            <Stop offset="1" stopColor="#FFE08A" />
          </LinearGradient>
          <LinearGradient id={`${u}s`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.06} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={128} rx={10} fill={`url(#${u}b)`} />
        <Rect x={5} y={5} width={90} height={118} rx={7} fill="none" stroke={`url(#${u}g)`} strokeWidth={2.4} />
        <Rect x={9.5} y={9.5} width={81} height={109} rx={5} fill="none" stroke="#F2C14E" strokeOpacity={0.75} strokeWidth={0.9} strokeDasharray="2 2.2" />
        <G stroke={`url(#${u}g)`} strokeWidth={1.6} fill="none" strokeLinecap="round">
          <Path d={corner} />
          <Path d={corner} transform="translate(100 0) scale(-1 1)" />
          <Path d={corner} transform="translate(0 128) scale(1 -1)" />
          <Path d={corner} transform="translate(100 128) scale(-1 -1)" />
        </G>
        {dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={i % 3 === 0 ? 1.8 : 1.1} fill="#F2C14E" />
        ))}
        <Path d="M50 38 C59 49 59 62 50 74 C41 62 41 49 50 38 Z" fill={`url(#${u}g)`} />
        <Path d="M50 46 C54 52 54 60 50 67 C46 60 46 52 50 46 Z" fill={c.line} opacity={0.55} />
        <Path d="M47.5 74 C35 72 28.5 62 29.5 51 C39 55 45.5 63 47.5 74 Z" fill={`url(#${u}g)`} />
        <Path d="M52.5 74 C65 72 71.5 62 70.5 51 C61 55 54.5 63 52.5 74 Z" fill={`url(#${u}g)`} />
        <Path d="M35 76 Q50 82 65 76 L63 80.5 Q50 86 37 80.5 Z" fill="#F2C14E" />
        <Path d="M50 13 L54 18 L50 23 L46 18 Z" fill="#F2C14E" />
        <Path d="M30 18 H42 M58 18 H70 M24 111 H36 M64 111 H76" stroke="#F2C14E" strokeOpacity={0.7} strokeWidth={1} />
        <Rect x={0} y={0} width={100} height={128} rx={10} fill={`url(#${u}s)`} />
      </Svg>
    </View>
  );
}

/** Cara de la carta: papel de arroz con filete del color de su dorso. */
function Face({ card, u, w, matched }: { card: CardData; u: string; w: number; matched: boolean }) {
  const c = card.side === 'th' ? LACA : INDIGO;
  const small = w < 92;
  const len = card.word.th.length;
  const thSize = small ? (len > 8 ? 13 : len > 5 ? 16 : 20) : len > 8 ? 17 : len > 5 ? 21 : 26;
  const es = card.word.es;
  const esSize = small ? (es.length > 22 ? 10.5 : es.length > 12 ? 12 : 13.5) : es.length > 22 ? 12.5 : 15;
  return (
    <View style={[StyleSheet.absoluteFill, styles.round, styles.face, { borderColor: matched ? '#FFC83D' : '#E9B44C' }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={matched ? '#FFF8D6' : '#FFFDF7'} />
            <Stop offset="1" stopColor={matched ? '#FFE48A' : '#FCEBC6'} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${u}f)`} />
        <Rect x={4} y={4} width={Math.max(0, w - 12)} height="92%" rx={6} fill="none" stroke={c.line} strokeOpacity={0.35} strokeWidth={1} />
      </Svg>
      <View style={styles.faceIn}>
        {card.side === 'th' ? (
          <>
            <Th size={thSize} bold numberOfLines={1} style={{ color: '#3A1F0B', lineHeight: Math.round(thSize * 1.5) }}>
              {card.word.th}
            </Th>
            {w >= 70 ? <Rom rom={card.word.rom} size={small ? 10 : 12} /> : null}
          </>
        ) : (
          <>
            {card.word.emoji && w >= 64 ? <Text style={{ fontSize: small ? 20 : 26, lineHeight: small ? 26 : 34 }}>{card.word.emoji}</Text> : null}
            <Text numberOfLines={3} style={[styles.es, { fontSize: esSize, lineHeight: esSize * 1.2 }]}>
              {es}
            </Text>
          </>
        )}
      </View>
      <View style={[styles.tag, { backgroundColor: c.line }]} />
    </View>
  );
}

export function Carta({
  card,
  w,
  h,
  x,
  y,
  from,
  open,
  matched,
  leaving,
  shake,
  dealDelay,
  flipDelay,
  disabled,
  onPress,
}: {
  card: CardData;
  w: number;
  h: number;
  x: number;
  y: number;
  from: { x: number; y: number };
  open: boolean;
  matched: boolean;
  leaving: boolean;
  shake: number;
  dealDelay: number;
  flipDelay: number;
  disabled: boolean;
  onPress: () => void;
}) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const deal = useSharedValue(0);
  const r = useSharedValue(0);
  const out = useSharedValue(0);
  const sx = useSharedValue(0);
  const glow = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    deal.value = withDelay(dealDelay, withSpring(1, { damping: 13, stiffness: 120 }));
  }, [deal, dealDelay]);
  useEffect(() => {
    r.value = withDelay(open ? 0 : flipDelay, withTiming(open || matched ? 180 : 0, { duration: 430, easing: Easing.out(Easing.back(1.15)) }));
  }, [open, matched, flipDelay, r]);
  useEffect(() => {
    if (matched) glow.value = withSequence(withTiming(1, { duration: 220 }), withTiming(0.75, { duration: 300 }));
  }, [matched, glow]);
  useEffect(() => {
    if (leaving) out.value = withTiming(1, { duration: 650, easing: Easing.in(Easing.quad) });
  }, [leaving, out]);
  useEffect(() => {
    if (shake === 0) return;
    sx.value = withSequence(withTiming(-6, { duration: 45 }), withTiming(6, { duration: 70 }), withTiming(-4, { duration: 60 }), withTiming(0, { duration: 60 }));
  }, [shake, sx]);

  const outer = useAnimatedStyle(() => {
    const d = deal.value;
    const o = out.value;
    return {
      opacity: Math.min(1, Math.max(0, d * 1.4)) * (1 - o),
      transform: [
        { translateX: (1 - d) * from.x + sx.value },
        { translateY: (1 - d) * from.y - o * 80 },
        { rotate: `${(1 - d) * -24 + o * 8}deg` },
        { scale: (0.5 + 0.5 * d) * (1 - 0.25 * o) * (1 - 0.05 * press.value) },
      ],
    };
  });
  // la carta se eleva a mitad del giro (sensación de tenerla en la mano)
  const lift = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.1 * Math.sin((r.value / 180) * Math.PI) }] }));
  const back = useAnimatedStyle(() => ({ opacity: r.value < 90 ? 1 : 0, transform: [{ perspective: 800 }, { rotateY: `${r.value}deg` }] }));
  const face = useAnimatedStyle(() => ({ opacity: r.value >= 90 ? 1 : 0, transform: [{ perspective: 800 }, { rotateY: `${r.value - 180}deg` }] }));
  const halo = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: w, height: h }, outer]}>
      <Animated.View pointerEvents="none" style={[styles.halo, { borderRadius: 16 }, halo]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open || matched ? (card.side === 'th' ? `Thai: ${card.word.th}` : card.word.es) : card.side === 'th' ? 'Carta roja (thai) boca abajo' : 'Carta azul (español) boca abajo'}
        disabled={disabled || open || matched}
        onPressIn={() => press.set(withTiming(1, { duration: 70 }))}
        onPressOut={() => press.set(withSpring(0, { damping: 10, stiffness: 260 }))}
        onPress={onPress}
        style={{ flex: 1 }}>
        <Animated.View style={[{ flex: 1 }, lift]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.lifted, { backgroundColor: card.side === 'th' ? LACA.edge : INDIGO.edge }, back]}>
            <Back side={card.side} u={u} />
            <Text style={styles.backTag}>{card.side === 'th' ? 'ไทย' : 'ESP'}</Text>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.lifted, { backgroundColor: '#FCEBC6' }, face]}>
            <Face card={card} u={u} w={w} matched={matched} />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Marca de loto dorado que queda en el hueco de una pareja ya encontrada. */
export function Loto({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const s = Math.min(w, h) * 0.55;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(201,143,0,0.28)', borderStyle: 'dashed' }]} />
      <Svg width={s} height={s} viewBox="0 0 40 40" opacity={0.45}>
        <Path d="M20 6 C26 13 26 21 20 29 C14 21 14 13 20 6 Z" fill="#E5A92B" />
        <Path d="M18.5 29 C10 28 5.5 21 6 13.5 C12.5 16 17 21.5 18.5 29 Z" fill="#E5A92B" />
        <Path d="M21.5 29 C30 28 34.5 21 34 13.5 C27.5 16 23 21.5 21.5 29 Z" fill="#E5A92B" />
        <Path d="M10 31 Q20 35 30 31 L28.5 34 Q20 37.5 11.5 34 Z" fill="#C98F00" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  round: { borderRadius: 10, overflow: 'hidden' },
  face: { borderWidth: 2 },
  faceIn: { position: 'absolute', left: 4, right: 4, top: 4, bottom: 8, alignItems: 'center', justifyContent: 'center', gap: 1 },
  es: { fontFamily: font.uiHeavy, color: '#1D2347', textAlign: 'center' },
  tag: { position: 'absolute', left: '35%', right: '35%', bottom: 4, height: 3, borderRadius: 2, opacity: 0.6 },
  backTag: { position: 'absolute', left: 0, right: 0, bottom: '7%', textAlign: 'center', fontFamily: font.uiHeavy, fontSize: 10, letterSpacing: 1.5, color: '#FFE7A8' },
  lifted: { borderRadius: 10, shadowColor: '#5A2A10', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  halo: { position: 'absolute', left: -7, right: -7, top: -7, bottom: -7, backgroundColor: 'rgba(255,214,90,0.55)', shadowColor: '#FFC83D', shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
});
