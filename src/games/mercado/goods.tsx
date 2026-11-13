// Lo que se vende en el puesto, dibujado: mango, plátanos, coco tierno, naranja, sandía, café helado,
// khao soi, huevos y la artesanía del norte (camisa mo hom, paraguas de Bo Sang, bolso yaam).
import { useEffect, useId, type ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { Good, GoodArt } from './logic';

function Radial({ id, stops, cx = '35%', cy = '30%' }: { id: string; stops: [number, string][]; cx?: string; cy?: string }) {
  return (
    <Defs>
      <RadialGradient id={id} cx={cx} cy={cy} r="75%">
        {stops.map(([o, c]) => (
          <Stop key={o} offset={o} stopColor={c} />
        ))}
      </RadialGradient>
    </Defs>
  );
}

function Linear({ id, stops, x2 = '0', y2 = '1' }: { id: string; stops: [number, string][]; x2?: string; y2?: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
        {stops.map(([o, c]) => (
          <Stop key={o} offset={o} stopColor={c} />
        ))}
      </LinearGradient>
    </Defs>
  );
}

const SHINE = (d: string) => <Path d={d} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.6} />;

function Art({ art, u }: { art: GoodArt; u: string }) {
  switch (art) {
    case 'mango':
      return (
        <>
          <Radial id={u} stops={[[0, '#FFF6A0'], [0.45, '#FFD23F'], [1, '#E5941B']]} cx="40%" cy="35%" />
          <Path d="M9 47 C4 35 13 18 30 11 C45 5 57 11 58 22 C59 33 48 41 38 47 C27 53 13 57 9 47 Z" fill={`url(#${u})`} />
          <Path d="M45 8 C52 8 58 13 58 21 C54 16 49 13 43 12 Z" fill="#9BC44A" opacity={0.55} />
          <Path d="M54 11 L59 6" stroke="#5B3A1A" strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M58 7 C60 1 57 -1 52 1 C50 4 52 7 58 7 Z" fill="#3E9A52" />
          {SHINE('M15 40 C15 31 21 23 29 19')}
        </>
      );
    case 'platano':
      return (
        <>
          <Linear id={u} stops={[[0, '#FFF27A'], [0.6, '#FFD12E'], [1, '#E5A50A']]} />
          <Path d="M11 26 C13 43 27 55 47 55 C53 55 57 53 59 50 C45 51 31 43 23 26 Z" fill={`url(#${u})`} stroke="#C98A06" strokeWidth={0.8} />
          <Path d="M14 20 C18 36 31 46 49 46 C55 46 58 44 59 41 C45 42 33 34 27 20 Z" fill={`url(#${u})`} stroke="#C98A06" strokeWidth={0.8} />
          <Path d="M18 15 C24 29 35 37 51 37 C56 37 59 35 59 32 C47 33 37 27 31 15 Z" fill={`url(#${u})`} stroke="#C98A06" strokeWidth={0.8} />
          <Path d="M7 16 C11 11 22 10 31 13 L29 22 C22 20 14 20 10 24 Z" fill="#7C9A2E" />
          <Circle cx={58.5} cy={50.5} r={1.8} fill="#4A3410" />
          <Circle cx={58.5} cy={41.5} r={1.8} fill="#4A3410" />
          <Circle cx={58.5} cy={32.5} r={1.8} fill="#4A3410" />
          <Path d="M22 32 C27 41 35 47 45 49" stroke="#FFFBD0" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.85} />
        </>
      );
    case 'coco':
      return (
        <>
          <Radial id={u} stops={[[0, '#B9E57E'], [0.6, '#6FB64B'], [1, '#3B7F33']]} />
          <Linear id={`${u}b`} stops={[[0, '#FFFCF0'], [1, '#E3D2A6']]} />
          <Path d="M10 37 C10 25 20 19 32 19 C44 19 54 25 54 37 C54 51 44 59 32 59 C20 59 10 51 10 37 Z" fill={`url(#${u})`} />
          <Path d="M15 31 L32 6 L49 31 C42 27 22 27 15 31 Z" fill={`url(#${u}b)`} />
          <Path d="M24 19 L32 6 L40 19 M20 25 L32 6 L44 25" stroke="#D2BE8C" strokeWidth={1} fill="none" />
          <Path d="M40 1 L34 22" stroke="#FF6A3D" strokeWidth={3.4} strokeLinecap="round" />
          <Path d="M40 1 L38.6 6" stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round" opacity={0.6} />
          {SHINE('M17 42 C17 36 20 32 24 30')}
        </>
      );
    case 'naranja':
      return (
        <>
          <Radial id={u} stops={[[0, '#FFD89A'], [0.5, '#FF9C24'], [1, '#DA640E']]} />
          <Circle cx={32} cy={37} r={22} fill={`url(#${u})`} />
          {[
            [24, 30],
            [38, 28],
            [44, 40],
            [30, 46],
            [20, 41],
            [36, 50],
          ].map(([x, y]) => (
            <Circle key={`${x}${y}`} cx={x} cy={y} r={0.9} fill="#B4500A" opacity={0.35} />
          ))}
          <Path d="M32 16 C35 8 46 7 51 11 C45 17 38 17 32 16 Z" fill="#3E9A52" />
          <Path d="M31 17 L32 13" stroke="#5B3A1A" strokeWidth={2.4} strokeLinecap="round" />
          {SHINE('M19 33 C20 27 24 23 29 21')}
        </>
      );
    case 'sandia':
      return (
        <>
          <Radial id={u} stops={[[0, '#9BDB74'], [0.55, '#3F9C3C'], [1, '#1D5F27']]} />
          <Ellipse cx={28} cy={32} rx={24} ry={20} fill={`url(#${u})`} />
          <Path d="M12 21 C17 29 17 39 12 46 M22 13.5 C27 25 27 40 22 51.5 M34 12.5 C39 25 39 40 34 51.5 M45 17 C49 27 49 38 45 47" stroke="#17501F" strokeWidth={3} fill="none" opacity={0.65} />
          {SHINE('M14 26 C16 20 20 16 25 14')}
          <Path d="M44 33 L63 57 Q44 65 25 57 Z" fill="#FF4F66" />
          <Path d="M25 57 Q44 65 63 57" stroke="#2E8B3A" strokeWidth={4.5} fill="none" strokeLinecap="round" />
          <Path d="M27.5 54.6 Q44 61.5 60.5 54.6" stroke="#E9FFD9" strokeWidth={1.6} fill="none" />
          {[
            [40, 45],
            [47, 46],
            [36, 51],
            [44, 52],
            [51, 52],
          ].map(([x, y]) => (
            <Ellipse key={`${x}${y}`} cx={x} cy={y} rx={1.3} ry={2} fill="#2B1B14" />
          ))}
        </>
      );
    case 'cafe':
      return (
        <>
          <Linear id={u} stops={[[0, '#F4D2A8'], [0.3, '#C98952'], [1, '#5A2C10']]} />
          <Path d="M17 14 H47 L43 58 C42.8 60.5 41 62 38.5 62 H25.5 C23 62 21.2 60.5 21 58 Z" fill={`url(#${u})`} />
          <Path d="M17 14 H47" stroke="#FFFFFF" strokeWidth={2} opacity={0.8} />
          <Rect x={23} y={17} width={9} height={9} rx={2} fill="#FFFFFF" opacity={0.6} transform="rotate(-14 27 21)" />
          <Rect x={33} y={19} width={8} height={8} rx={2} fill="#FFFFFF" opacity={0.5} transform="rotate(10 37 23)" />
          <Path d="M21.5 33 C28 28 36 37 45 31" stroke="#F6DDBA" strokeWidth={3} fill="none" opacity={0.8} />
          <Path d="M39 2 L35 32" stroke="#3D7BFF" strokeWidth={3.4} strokeLinecap="round" />
          <Path d="M20 18 L23.5 56" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" opacity={0.5} />
        </>
      );
    case 'khaosoi':
      return (
        <>
          <Linear id={u} stops={[[0, '#FFFFFF'], [1, '#C9D2E3']]} />
          <Radial id={`${u}c`} stops={[[0, '#FFD46A'], [1, '#E5862A']]} cx="50%" cy="40%" />
          <Path d="M5 31 H59 C59 47 47 57 32 57 C17 57 5 47 5 31 Z" fill={`url(#${u})`} />
          <Path d="M9 39 H55" stroke="#3D7BFF" strokeWidth={2} opacity={0.55} />
          <Path d="M13 45 Q18 42 23 45 T33 45 T43 45 T53 44" stroke="#3D7BFF" strokeWidth={1.5} fill="none" opacity={0.5} />
          <Ellipse cx={32} cy={31} rx={27} ry={7.5} fill={`url(#${u}c)`} />
          <Path d="M20 29 C21 21 26 24 28 18 C31 23 35 19 37 24 C40 20 45 23 43 29 Z" fill="#F7BF4E" stroke="#C98A1E" strokeWidth={0.9} />
          <Path d="M23 26 C27 23 31 26 35 23 M27 28 C31 25 36 28 40 25" stroke="#C98A1E" strokeWidth={0.9} fill="none" />
          <Path d="M45 29 L56 24 A9 9 0 0 1 51.5 33 Z" fill="#9ED36A" stroke="#5E9E35" strokeWidth={0.8} />
          <Circle cx={15} cy={31} r={1.6} fill="#D93A3F" />
          <Circle cx={48} cy={33.5} r={1.4} fill="#D93A3F" />
          <Circle cx={18} cy={34} r={1.1} fill="#D93A3F" />
        </>
      );
    case 'huevo':
      return (
        <>
          <Radial id={u} stops={[[0, '#FFFFFF'], [0.55, '#F6E7CC'], [1, '#D5B88A']]} />
          <Path d="M32 7 C44 7 52 25 52 38 C52 51 43 59 32 59 C21 59 12 51 12 38 C12 25 20 7 32 7 Z" fill={`url(#${u})`} />
          {SHINE('M21 31 C22 23 25 17 29 14')}
        </>
      );
    case 'guindilla':
      return (
        <>
          <Linear id={u} stops={[[0, '#FF7A5C'], [0.5, '#E3302B'], [1, '#A3151B']]} x2="1" />
          <Path d="M14 22 C20 15 30 17 38 26 C47 36 53 46 58 57 C45 55 32 49 22 40 C14 33 10 27 14 22 Z" fill={`url(#${u})`} />
          <Path d="M17 20 C12 16 9 11 10 5" stroke="#3E9A52" strokeWidth={3.6} strokeLinecap="round" fill="none" />
          <Path d="M11 22 C13 16 19 14 24 17 C21 22 16 25 11 22 Z" fill="#4FA85A" />
          <Path d="M50 50 C53 53 56 55 58 57" stroke="#7E0E14" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.6} />
          {SHINE('M20 25 C26 25 33 30 38 36')}
        </>
      );
    case 'lima':
      return (
        <>
          <Radial id={u} stops={[[0, '#E4F59A'], [0.5, '#8FCB3F'], [1, '#3F8A25']]} />
          <Path d="M10 36 C10 24 20 15 32 15 C44 15 54 24 54 36 C54 49 44 58 32 58 C20 58 10 49 10 36 Z" fill={`url(#${u})`} />
          <Path d="M32 15 C31 12 31 10 32 8" stroke="#5B3A1A" strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M32 12 C36 5 46 5 50 9 C45 15 38 15 32 12 Z" fill="#2F8A45" />
          <Path d="M52 38 C56 37 58 39 58 41 C56 43 53 42 52 40 Z" fill="#6FAE30" />
          {[
            [22, 32],
            [36, 26],
            [44, 40],
            [28, 46],
            [38, 50],
          ].map(([x, y]) => (
            <Circle key={`${x}${y}`} cx={x} cy={y} r={0.9} fill="#2E6B1A" opacity={0.35} />
          ))}
          {SHINE('M17 33 C18 27 22 22 27 20')}
        </>
      );
    case 'dulce':
      return (
        <>
          <Linear id={u} stops={[[0, '#FFF7E2'], [1, '#E9D3A2']]} />
          <Linear id={`${u}g`} stops={[[0, '#9BE08A'], [1, '#4FAE5A']]} />
          <Linear id={`${u}p`} stops={[[0, '#FFB5CF'], [1, '#EF7FA6']]} />
          <Path d="M4 44 C14 38 50 38 60 44 C56 54 8 54 4 44 Z" fill="#3E9A52" />
          <Path d="M10 44 C20 41 44 41 54 44" stroke="#7BC67E" strokeWidth={1.2} fill="none" />
          <Path d="M13 39 L32 46 L51 39 V24 L32 31 L13 24 Z" fill={`url(#${u}g)`} />
          <Path d="M13 34 L32 41 L51 34 V29 L32 36 L13 29 Z" fill={`url(#${u})`} />
          <Path d="M13 24 L32 17 L51 24 L32 31 Z" fill={`url(#${u}p)`} />
          <Path d="M32 31 V46" stroke="#2F7A40" strokeWidth={1} opacity={0.35} />
          <Circle cx={32} cy={23.5} r={2.6} fill="#FFFFFF" />
          <Circle cx={25} cy={24} r={1.4} fill="#FFE08A" />
          <Circle cx={39} cy={24} r={1.4} fill="#FFE08A" />
          <Path d="M17 24.5 L31 19.5" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
        </>
      );
    case 'camisa':
      return (
        <>
          <Linear id={u} stops={[[0, '#4E62CC'], [1, '#1E2A66']]} />
          <Path d="M21 8 L29 5 Q32 10 35 5 L43 8 L57 18 L51 29 L45 25 V59 H19 V25 L13 29 L7 18 Z" fill={`url(#${u})`} />
          <Path d="M29 5 Q32 12 35 5" stroke="#FFFFFF" strokeWidth={1.6} fill="none" />
          <Path d="M32 11 V59" stroke="#18224F" strokeWidth={1.4} />
          {[20, 30, 40, 50].map((y) => (
            <Circle key={y} cx={32} cy={y} r={1.4} fill="#FFFFFF" />
          ))}
          <Path d="M19 54 H45" stroke="#D93A3F" strokeWidth={3} />
          <Path d="M19 57.5 H45" stroke="#FFC83D" strokeWidth={1.4} />
          <Path d="M10 19 L14 15" stroke="#7A8CE8" strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case 'paraguas':
      return (
        <>
          <Linear id={u} stops={[[0, '#FF9E5E'], [1, '#E2413A']]} />
          <Path d="M5 31 C5 16 17 5 32 5 C47 5 59 16 59 31 C55 28 50 28 46.5 31 C43 28 36.5 28 32 31 C27.5 28 21 28 17.5 31 C14 28 9 28 5 31 Z" fill={`url(#${u})`} />
          <Path d="M32 5 C26 12 21 21 17.5 31 M32 5 C38 12 43 21 46.5 31 M32 5 V31" stroke="#B3361F" strokeWidth={1.3} fill="none" />
          <Circle cx={21} cy={20} r={3.4} fill="#FFC83D" />
          <Circle cx={43} cy={20} r={3.4} fill="#FFC83D" />
          <Circle cx={32} cy={14} r={2.8} fill="#FFFFFF" />
          <Circle cx={21} cy={20} r={1.2} fill="#E2413A" />
          <Circle cx={43} cy={20} r={1.2} fill="#E2413A" />
          <Path d="M32 31 V54 C32 60 25 60 25 54" stroke="#7A4A1E" strokeWidth={3.4} fill="none" strokeLinecap="round" />
          {SHINE('M12 22 C15 15 20 11 25 9')}
        </>
      );
    case 'bolso':
      return (
        <>
          <Linear id={u} stops={[[0, '#F05A4F'], [1, '#A3262A']]} />
          <Path d="M19 24 C17 4 47 4 45 24" stroke="#B5462E" strokeWidth={4.5} fill="none" />
          <Rect x={11} y={21} width={42} height={37} rx={6} fill={`url(#${u})`} />
          <Rect x={11} y={30} width={42} height={4} fill="#FFC83D" />
          <Rect x={11} y={37} width={42} height={3.5} fill="#2B3A86" />
          <Rect x={11} y={43.5} width={42} height={4} fill="#FFC83D" />
          <Path d="M15 58 V63 M21 58 V63 M27 58 V63 M33 58 V63 M39 58 V63 M45 58 V63 M50 58 V63" stroke="#FFC83D" strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M16 25 H30" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
        </>
      );
    default:
      return null;
  }
}

/** Un producto (64×64). */
export function GoodIcon({ art, size, emoji }: { art: GoodArt; size: number; emoji?: string }) {
  const u = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (art === 'otro') return <Text style={{ fontSize: size * 0.7, lineHeight: size, textAlign: 'center', width: size }}>{emoji ?? '🛍️'}</Text>;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G>
        <Art art={art} u={u} />
      </G>
    </Svg>
  );
}

/** Vapor que sube de lo caliente (khao soi, café). */
function Steam({ x, size, delay }: { x: number; size: number; delay: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false));
  }, [reduced, t, delay]);
  const st = useAnimatedStyle(() => ({ opacity: (t.value < 0.25 ? t.value * 4 : (1 - t.value) / 0.75) * 0.5, transform: [{ translateY: -t.value * size * 0.55 }, { translateX: Math.sin(t.value * Math.PI * 2) * 5 }, { scale: 0.5 + t.value * 0.9 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: 0, width: size * 0.12, height: size * 0.2, borderRadius: size, backgroundColor: '#FFFFFF' }, st]} />;
}

/** Cae al mostrador con un rebote. */
function Drop({ delay, children, style }: { delay: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const y = useSharedValue(-46);
  const o = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withSpring(0, { damping: 9, stiffness: 190 }));
    o.value = withDelay(delay, withTiming(1, { duration: 120 }));
  }, [y, o, delay]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

/** Los productos de la ronda en un cesto de bambú sobre el mostrador. */
export function GoodsDisplay({ good, qty, width, height }: { good: Good; qty: number; width: number; height: number }) {
  const u = `b${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const rows = qty > 5 ? 2 : 1;
  const perRow = Math.ceil(qty / rows);
  const size = Math.min(height * (rows === 2 ? 0.52 : 0.82), (width * 0.94) / (perRow * 0.72 + 0.28));
  const step = size * 0.72;
  const hot = good.art === 'khaosoi';
  const items = Array.from({ length: qty }, (_, i) => {
    const row = rows === 2 ? (i < perRow ? 0 : 1) : 0;
    const col = row === 0 ? i : i - perRow;
    const n = row === 0 ? perRow : qty - perRow;
    const rowW = step * (n - 1) + size;
    return { i, x: (width - rowW) / 2 + col * step, y: height - size - (rows === 2 ? (1 - row) * size * 0.42 : 0) - 8, r: ((i * 37) % 17) - 8 };
  });
  return (
    <View style={{ width, height }} pointerEvents="none">
      <Svg width={width} height={22} viewBox="0 0 120 22" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: -4 }}>
        <Linear id={u} stops={[[0, '#E2B66C'], [1, '#A8742F']]} />
        <Ellipse cx={60} cy={13} rx={58} ry={8} fill="#000000" opacity={0.2} />
        <Path d="M4 6 H116 L108 18 H12 Z" fill={`url(#${u})`} />
        <Path d="M8 9 H112 M10 13 H110" stroke="#8A5A22" strokeWidth={1} opacity={0.5} />
        <Path d="M20 6 L18 18 M36 6 L35 18 M52 6 L52 18 M68 6 L68 18 M84 6 L85 18 M100 6 L102 18" stroke="#8A5A22" strokeWidth={0.8} opacity={0.4} />
        <Path d="M4 6 H116" stroke="#F6D79A" strokeWidth={2} />
      </Svg>
      {items.map((it) => (
        <Drop key={it.i} delay={80 + it.i * 70} style={{ position: 'absolute', left: it.x, top: it.y, transform: [{ rotate: `${it.r}deg` }] }}>
          <GoodIcon art={good.art} size={size} emoji={good.emoji} />
        </Drop>
      ))}
      {hot ? (
        <View style={{ position: 'absolute', left: items[0].x + size * 0.3, top: items[0].y - size * 0.2 }}>
          <Steam x={0} size={size} delay={0} />
          <Steam x={size * 0.2} size={size} delay={700} />
          <Steam x={size * 0.38} size={size} delay={1400} />
        </View>
      ) : null}
    </View>
  );
}
