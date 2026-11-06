import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { color, motion } from '@/brand/tokens';
import { rand } from '@/lib/random';

/** Banda de niebla que deriva despacio de lado a lado. */
export function MistBand({ top, width, height = 22, opacity = 0.7, delay = 0, distance = 40 }: { top: number; width: number; height?: number; opacity?: number; delay?: number; distance?: number }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    x.value = withDelay(
      delay,
      withRepeat(withTiming(distance, { duration: motion.nieblaMs / 2, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [reduced, delay, distance, x]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', top, left: -40, width, height, borderRadius: height, backgroundColor: '#FFFFFF', opacity }, s]} />;
}

/** Paisaje de montañas de Mae Hong Son por capas, con sol y niebla. */
export function Mountains({ height = 420, dawn = true, house = false }: { height?: number; dawn?: boolean; house?: boolean }) {
  const { width } = useWindowDimensions();
  const w = Math.max(width, 360);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height }}>
      <Svg width={w} height={height} viewBox={`0 0 390 ${height}`} preserveAspectRatio="xMidYMax slice">
        {dawn ? <Circle cx={290} cy={height - 300} r={64} fill={color.alba} /> : null}
        <Path d={`M0 ${height - 270} L60 ${height - 315} L120 ${height - 282} L190 ${height - 350} L250 ${height - 300} L320 ${height - 338} L390 ${height - 300} L390 ${height} L0 ${height} Z`} fill={color.monte1} />
        <Path d={`M0 ${height - 208} L80 ${height - 260} L150 ${height - 220} L230 ${height - 278} L300 ${height - 228} L390 ${height - 270} L390 ${height} L0 ${height} Z`} fill={color.monte2} />
        {house ? (
          <>
            <Path d={`M214 ${height - 278} L232 ${height - 291} L250 ${height - 278} Z`} fill={color.teca} />
            <Rect x={218} y={height - 278} width={28} height={18} fill="#C07A45" />
            <Rect x={228} y={height - 273} width={8} height={8} rx={1.5} fill={color.buatong} />
          </>
        ) : null}
        <Path d={`M0 ${height - 138} L100 ${height - 196} L190 ${height - 154} L290 ${height - 202} L390 ${height - 170} L390 ${height} L0 ${height} Z`} fill={color.monte3} />
        <Path d={`M0 ${height - 60} L130 ${height - 108} L240 ${height - 72} L390 ${height - 114} L390 ${height} L0 ${height} Z`} fill={color.monte4} />
      </Svg>
      <MistBand top={height - 300} width={w * 0.62} opacity={0.75} />
      <MistBand top={height - 230} width={w * 0.6} opacity={0.65} delay={1200} distance={-50} />
      <MistBand top={height - 96} width={w * 0.55} opacity={0.5} delay={600} distance={36} />
    </View>
  );
}

/** Lluvia de pétalos de bua tong y chispas al celebrar. */
export function Confetti({ count = 28, run }: { count?: number; run: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `${run}-${i}`,
        x: rand(0.1, 0.9) * width,
        dx: rand(-80, 80),
        rot: rand(-180, 180),
        delay: rand(0, 220),
        dur: rand(1100, 1800),
        c: [color.buatong, color.azafran, color.farol, color.arrozalVivo, color.cielo][i % 5],
        w: rand(7, 11),
        h: rand(11, 17),
      })),
    [count, run, width],
  );
  if (!run) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <Petal key={p.id} {...p} fall={height * 0.75} />
      ))}
    </View>
  );
}

function Petal({ x, dx, rot, delay, dur, c, w, h, fall }: { id?: string; x: number; dx: number; rot: number; delay: number; dur: number; c: string; w: number; h: number; fall: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) }));
  }, [t, delay, dur]);
  const s = useAnimatedStyle(() => ({
    opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [
      { translateX: x + dx * t.value },
      { translateY: -40 + fall * t.value - 160 * Math.sin(Math.PI * Math.min(t.value * 1.4, 1)) },
      { rotate: `${rot * t.value * 3}deg` },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: w, backgroundColor: c }, s]} />;
}

/** Estrellas que parpadean (fondos de noche). */
export function Stars({ n = 18 }: { n?: number }) {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(() => Array.from({ length: n }, () => ({ x: rand(0, width), y: rand(0, height * 0.7), s: rand(1.5, 3.2), d: rand(0, 2000) })), [n, width, height]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((st, i) => (
        <Twinkle key={i} {...st} />
      ))}
    </View>
  );
}

function Twinkle({ x, y, s, d }: { x: number; y: number; s: number; d: number }) {
  const o = useSharedValue(0.4);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    o.value = withDelay(d, withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.3, { duration: 900 })), -1, false));
  }, [o, d, reduced]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: s, backgroundColor: '#FFFFFF' }, st]} />;
}
