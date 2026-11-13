// La cometa de las sílabas: papel de morera con varillas de bambú y la sílaba escrita bien grande. Se mece con el
// viento; cuando se acierta el tono, dibuja en el aire su melodía (plano, bajo, cae, alto, sube) y gana un lazo del
// color de ese tono en la cola. Si no, solo cabecea: la cola no se pierde nunca.
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { color, font, tones, type ToneId } from '@/brand/tokens';

import { Glow } from '../fx';
import { usePulse, useSvgId } from './anim';

/** Columnas que ocupa un texto thai (los signos de encima y debajo no cuentan). */
export const thaiCols = (th: string) => [...th].filter((ch) => !'ัิีึืุู็่้๊๋์ํ'.includes(ch)).length;

/** Cuánto sube (−) o baja (+) la cometa al dibujar cada tono, en fracciones de su tamaño. */
const CONTOUR: Record<ToneId, number[]> = {
  M: [0, 0, 0],
  L: [0.06, 0.1, 0.1],
  F: [-0.16, -0.04, 0.14],
  H: [-0.06, -0.14, -0.18],
  R: [0.1, 0.02, -0.18],
};

function Bow({ tone, size }: { tone: ToneId; size: number }) {
  const t = tones[tone];
  return (
    <Svg width={size} height={size * 0.62} viewBox="0 0 40 25">
      <Path d="M20 12.5 L3 2 Q0 12.5 3 23 Z" fill={t.fill} stroke="#00000022" strokeWidth={1} strokeLinejoin="round" />
      <Path d="M20 12.5 L37 2 Q40 12.5 37 23 Z" fill={t.fill} stroke="#00000022" strokeWidth={1} strokeLinejoin="round" />
      <Path d="M6 6 L15 11" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={20} cy={12.5} r={4.2} fill="#FFFFFF" stroke={t.fill} strokeWidth={2} />
    </Svg>
  );
}

/**
 * `ribbons`: los tonos acertados (un lazo cada uno) · `fly`: al cambiar `n`, dibuja la melodía de `tone` ·
 * `nod`: al cambiar, cabecea · `lit`: halo dorado de acierto.
 */
export function Kite({ th, size, ribbons, fly, nod, lit }: { th: string; size: number; ribbons: ToneId[]; fly: { tone: ToneId; n: number } | null; nod: number; lit: boolean }) {
  const id = useSvgId('kite');
  const sway = usePulse(2400);
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);
  const sc = useSharedValue(1);
  const flyN = fly?.n ?? 0;
  const flyTone = fly?.tone ?? 'M';

  useEffect(() => {
    if (!flyN) return;
    const [a, b, c] = CONTOUR[flyTone];
    const step = (v: number) => withTiming(v * size, { duration: 260, easing: Easing.inOut(Easing.quad) });
    ty.value = withSequence(step(a), step(b), step(c), withDelay(500, withSpring(0, { damping: 11, stiffness: 90 })));
    sc.value = withSequence(withTiming(1.1, { duration: 140 }), withSpring(1, { damping: 7, stiffness: 200 }));
  }, [flyN, flyTone, size, ty, sc]);

  useEffect(() => {
    if (!nod) return;
    rot.value = withSequence(withTiming(-9, { duration: 90 }), withTiming(8, { duration: 130 }), withTiming(-5, { duration: 120 }), withSpring(0, { damping: 8, stiffness: 160 }));
  }, [nod, rot]);

  const W = size;
  const H = size * 1.08;
  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value + (sway.value - 0.5) * 10 }, { rotate: `${rot.value + (sway.value - 0.5) * 5}deg` }, { scale: sc.value }],
  }));
  const tail = useAnimatedStyle(() => ({ transform: [{ rotate: `${(0.5 - sway.value) * 16}deg` }] }));

  const cols = Math.max(1, thaiCols(th));
  const fs = Math.round(Math.min(size * 0.34, (size * 0.56) / (cols * 0.6)));
  const shown = ribbons.slice(-5);
  const bow = Math.max(26, size * 0.17);
  const tailH = 26 + shown.length * (bow * 0.62 + 6);

  return (
    <Animated.View style={[{ width: W, height: H + 150 }, body]}>
      {lit ? <Glow size={W * 1.5} tint="#FFE27A" strength={0.7} style={{ position: 'absolute', left: -W * 0.25, top: H / 2 - W * 0.75 }} /> : null}
      {/* la cola: un cordón con un lazo por cada tono acertado */}
      <Animated.View style={[{ position: 'absolute', left: W / 2 - bow / 2, top: H - 6, width: bow, height: tailH, alignItems: 'center', transformOrigin: 'top center' }, tail]}>
        <View style={{ position: 'absolute', top: 0, bottom: 0, width: 2.5, borderRadius: 2, backgroundColor: '#B9773F' }} />
        <View style={{ height: 18 }} />
        {shown.map((t, k) => (
          <Animated.View key={ribbons.length - shown.length + k} entering={ZoomIn.springify().damping(7).stiffness(220)} style={{ marginBottom: 6 }}>
            <Bow tone={t} size={bow} />
          </Animated.View>
        ))}
      </Animated.View>
      <Svg width={W} height={H} viewBox="0 0 200 216">
        <Defs>
          <LinearGradient id={`${id}p`} x1="0" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#FFFDF3" />
            <Stop offset="0.6" stopColor="#FFF1CF" />
            <Stop offset="1" stopColor="#FFDFA3" />
          </LinearGradient>
          <LinearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.azafran} />
            <Stop offset="1" stopColor={color.farol} />
          </LinearGradient>
        </Defs>
        {/* sombra, papel y ribete */}
        <Path d="M100 10 L192 96 L100 212 L8 96 Z" fill="#1D2347" opacity={0.14} transform="translate(4 6)" />
        <Path d="M100 6 L192 92 L100 208 L8 92 Z" fill={`url(#${id}p)`} stroke="#C8552B" strokeWidth={5} strokeLinejoin="round" />
        {/* puntas pintadas */}
        <Path d="M100 6 L128 32 L72 32 Z" fill={`url(#${id}t)`} />
        <Path d="M100 208 L122 180 L78 180 Z" fill={color.laca} opacity={0.9} />
        <Path d="M8 92 L30 72 L30 112 Z" fill={color.cielo} opacity={0.85} />
        <Path d="M192 92 L170 72 L170 112 Z" fill={color.arrozalVivo} opacity={0.9} />
        {/* varillas de bambú y cenefa */}
        <Path d="M100 6 L100 208 M8 92 L192 92" stroke="#B98652" strokeOpacity={0.28} strokeWidth={3} strokeLinecap="round" />
        <Path d="M100 20 L178 92 L100 192 L22 92 Z" fill="none" stroke="#E8A93A" strokeWidth={1.4} strokeDasharray="2 5" strokeLinejoin="round" />
        <Path d="M60 44 L84 22" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={4} strokeLinecap="round" />
        {[
          [100, 6],
          [192, 92],
          [100, 208],
          [8, 92],
        ].map(([x, y], k) => (
          <Circle key={k} cx={x} cy={y} r={4.5} fill="#7A4A22" />
        ))}
      </Svg>
      <View pointerEvents="none" style={[styles.text, { width: W, height: H, paddingBottom: H * 0.14 }]}>
        <Text accessibilityLabel={`Sílaba escrita: ${th}`} style={[styles.thai, { fontSize: fs, lineHeight: fs * 1.6 }]}>
          {th}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  thai: { fontFamily: font.thaiBold, color: color.tinta, textAlign: 'center', includeFontPadding: false },
});
