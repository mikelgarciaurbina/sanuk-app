// La vendedora del puesto (ป้า): sombrero ngop de paja, camisa mo hom índigo y pañuelo pha khao ma.
// Capas animadas: respira, balancea la cabeza, parpadea, mueve la boca al hablar y salta de alegría.
import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

export type Mood = 'idle' | 'happy' | 'love' | 'wow' | 'oops';

const VB_W = 160;
const VB_H = 170;
const INK = '#2B1B14';

function Body({ u }: { u: string }) {
  return (
    <>
      <Defs>
        <LinearGradient id={`${u}sh`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4659C4" />
          <Stop offset="1" stopColor="#202C69" />
        </LinearGradient>
        <LinearGradient id={`${u}nk`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C98A5E" />
          <Stop offset="1" stopColor="#E3A67A" />
        </LinearGradient>
      </Defs>
      <Path d="M70 104 H90 V128 C86 133 74 133 70 128 Z" fill={`url(#${u}nk)`} />
      <Path d="M8 170 C10 142 34 128 62 123 L98 123 C126 128 150 142 152 170 Z" fill={`url(#${u}sh)`} />
      <Path d="M62 123 C66 137 74 143 80 143 C86 143 94 137 98 123" stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Circle cx={80} cy={153} r={2.4} fill="#FFFFFF" />
      <Circle cx={80} cy={164} r={2.4} fill="#FFFFFF" />
      <Path d="M96 125 C116 131 130 142 137 160 L124 165 C118 149 108 139 94 132 Z" fill="#E8473F" />
      <Path d="M101 128 L112 159 M110 132 L122 162 M98 136 C110 140 122 148 130 158 M96 130 C108 133 120 140 128 150" stroke="#FFD8C9" strokeWidth={1.3} opacity={0.75} fill="none" />
      <Path d="M24 150 C30 140 40 134 50 131" stroke="#6E80E6" strokeWidth={2.5} strokeLinecap="round" opacity={0.6} fill="none" />
    </>
  );
}

function Head({ u, mood }: { u: string; mood: Mood }) {
  const worried = mood === 'oops';
  const up = mood === 'wow' ? -4 : 0;
  return (
    <>
      <Defs>
        <RadialGradient id={`${u}sk`} cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#FFE0C4" />
          <Stop offset="0.65" stopColor="#F2BC92" />
          <Stop offset="1" stopColor="#DD9D72" />
        </RadialGradient>
        <LinearGradient id={`${u}st`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F6D28C" />
          <Stop offset="0.6" stopColor="#E0AE5E" />
          <Stop offset="1" stopColor="#B98236" />
        </LinearGradient>
        <LinearGradient id={`${u}br`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F0C878" />
          <Stop offset="1" stopColor="#C38B3D" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={47} cy={84} rx={7} ry={9} fill="#E8A97C" />
      <Ellipse cx={113} cy={84} rx={7} ry={9} fill="#E8A97C" />
      <Circle cx={46} cy={96} r={2.8} fill="#FFC83D" />
      <Circle cx={114} cy={96} r={2.8} fill="#FFC83D" />
      <Circle cx={80} cy={80} r={34} fill={`url(#${u}sk)`} />
      <Path d="M46 78 C46 62 54 54 63 51 L60 72 C55 74 50 79 47 88 Z" fill={INK} />
      <Path d="M114 78 C114 62 106 54 97 51 L100 72 C105 74 110 79 113 88 Z" fill={INK} />
      <Path d="M50 63 C60 55 100 55 110 63 C103 61 96 61 90 65 C84 59 76 59 70 65 C64 61 57 61 50 63 Z" fill={INK} />
      <Ellipse cx={58} cy={93} rx={7.5} ry={4.6} fill="#FF7F95" opacity={mood === 'love' || mood === 'happy' ? 0.75 : 0.5} />
      <Ellipse cx={102} cy={93} rx={7.5} ry={4.6} fill="#FF7F95" opacity={mood === 'love' || mood === 'happy' ? 0.75 : 0.5} />
      <Path d="M77 88 Q80 91.5 83 88" stroke="#C47E55" strokeWidth={2} fill="none" strokeLinecap="round" />
      {worried ? (
        <>
          <Path d="M57 72 Q64 70 71 66" stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <Path d="M89 66 Q96 70 103 72" stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <Path d="M121 60 C121 60 115.5 67 115.5 70.5 A5.5 5.5 0 0 0 126.5 70.5 C126.5 67 121 60 121 60 Z" fill="#8CC3FF" />
          <Path d="M119 67 Q118.5 69.5 119.5 71" stroke="#FFFFFF" strokeWidth={1.3} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <Path d={`M57 ${70 + up} Q64 ${65 + up} 71 ${68 + up}`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <Path d={`M89 ${68 + up} Q96 ${65 + up} 103 ${70 + up}`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        </>
      )}
      <Ellipse cx={80} cy={55} rx={61} ry={13.5} fill={`url(#${u}br)`} />
      <Ellipse cx={80} cy={58} rx={50} ry={7} fill="#7A4E1E" opacity={0.3} />
      <Path d="M44 54 C46 25 62 12 80 12 C98 12 114 25 116 54 C102 48 58 48 44 54 Z" fill={`url(#${u}st)`} />
      <Path d="M53 41 C66 35 94 35 107 41 M48 48 C64 42 96 42 112 48 M59 30 C70 25 90 25 101 30 M66 21 C74 18 86 18 94 21" stroke="#A8732E" strokeWidth={1.2} fill="none" opacity={0.55} />
      <Path d="M80 13 V47 M68 15 L61 47 M92 15 L99 47 M58 20 L50 49 M102 20 L110 49" stroke="#A8732E" strokeWidth={1} fill="none" opacity={0.4} />
      <Path d="M46 49 C62 43.5 98 43.5 114 49 L114.6 53.5 C98 48 62 48 45.4 53.5 Z" fill="#D93A3F" />
      <Path d="M58 24 C65 17 73 15 80 15" stroke="#FFF4D8" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.75} />
      <Path d="M26 56 C40 50 56 48 70 48" stroke="#FFF2CF" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.6} />
    </>
  );
}

const HEART_L = 'M65 86 C59 81.5 57 78 58.6 75.3 C60.2 72.8 63.6 73.2 65 76 C66.4 73.2 69.8 72.8 71.4 75.3 C73 78 71 81.5 65 86 Z';
const HEART_R = 'M95 86 C89 81.5 87 78 88.6 75.3 C90.2 72.8 93.6 73.2 95 76 C96.4 73.2 99.8 72.8 101.4 75.3 C103 78 101 81.5 95 86 Z';

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'happy')
    return (
      <>
        <Path d="M59 81 Q65 73.5 71 81" stroke={INK} strokeWidth={3.2} fill="none" strokeLinecap="round" />
        <Path d="M89 81 Q95 73.5 101 81" stroke={INK} strokeWidth={3.2} fill="none" strokeLinecap="round" />
      </>
    );
  if (mood === 'love')
    return (
      <>
        <Path d={HEART_L} fill="#E8365E" />
        <Path d={HEART_R} fill="#E8365E" />
        <Circle cx={62.5} cy={76.5} r={1.3} fill="#FFFFFF" />
        <Circle cx={92.5} cy={76.5} r={1.3} fill="#FFFFFF" />
      </>
    );
  const big = mood === 'wow';
  const dx = mood === 'oops' ? -1.8 : 0;
  return (
    <>
      <Ellipse cx={65 + dx} cy={79} rx={big ? 6 : 4.6} ry={big ? 6.8 : 5.8} fill={INK} />
      <Ellipse cx={95 + dx} cy={79} rx={big ? 6 : 4.6} ry={big ? 6.8 : 5.8} fill={INK} />
      <Circle cx={66.8 + dx} cy={76.6} r={big ? 2.2 : 1.8} fill="#FFFFFF" />
      <Circle cx={96.8 + dx} cy={76.6} r={big ? 2.2 : 1.8} fill="#FFFFFF" />
      <Circle cx={63.6 + dx} cy={81.6} r={0.9} fill="#FFFFFF" opacity={0.8} />
      <Circle cx={93.6 + dx} cy={81.6} r={0.9} fill="#FFFFFF" opacity={0.8} />
    </>
  );
}

function Mouth({ mood, open }: { mood: Mood; open: boolean }) {
  if (open)
    return (
      <>
        <Ellipse cx={80} cy={101} rx={7} ry={6} fill="#7E2626" />
        <Ellipse cx={80} cy={104} rx={4.4} ry={2.4} fill="#FF7A8A" />
      </>
    );
  if (mood === 'happy' || mood === 'love')
    return (
      <>
        <Path d="M67 96 Q80 114 93 96 Q80 101 67 96 Z" fill="#7E2626" />
        <Path d="M73.5 104 Q80 109.5 86.5 104 Q80 101.5 73.5 104 Z" fill="#FF7A8A" />
      </>
    );
  if (mood === 'wow') return <Ellipse cx={80} cy={102} rx={4.6} ry={5.6} fill="#7E2626" />;
  if (mood === 'oops') return <Path d="M69 102 Q74.5 97.5 80 102 Q85.5 106.5 91 102" stroke="#8A3B2A" strokeWidth={2.6} fill="none" strokeLinecap="round" />;
  return <Path d="M69 98 Q80 108 91 98" stroke="#8A3B2A" strokeWidth={2.8} fill="none" strokeLinecap="round" />;
}

/** La vendedora. `talking` mueve la boca; cambia `jump` para que dé un saltito. */
export function Vendor({ width, mood, talking, jump }: { width: number; mood: Mood; talking: boolean; jump: number }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduced = useReducedMotion();
  const k = width / VB_W;
  const height = VB_H * k;
  const breathe = useSharedValue(0);
  const sway = useSharedValue(0);
  const blink = useSharedValue(1);
  const talk = useSharedValue(1);
  const hop = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    breathe.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
    sway.value = withRepeat(withTiming(1, { duration: 3300, easing: Easing.inOut(Easing.sin) }), -1, true);
    blink.value = withRepeat(withSequence(withDelay(2600, withTiming(0.08, { duration: 80 })), withTiming(1, { duration: 120 })), -1, false);
  }, [reduced, breathe, sway, blink]);

  useEffect(() => {
    if (talking && !reduced) talk.value = withRepeat(withSequence(withTiming(0.25, { duration: 105 }), withTiming(1, { duration: 115 })), -1, false);
    else talk.value = withTiming(1, { duration: 80 });
  }, [talking, reduced, talk]);

  useEffect(() => {
    if (!jump) return;
    hop.value = withSequence(withTiming(-14 * k, { duration: 150, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 8, stiffness: 200 }));
  }, [jump, hop, k]);

  const sWrap = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }, { scaleY: 1 + breathe.value * 0.014 }] }));
  const sHead = useAnimatedStyle(() => ({ transform: [{ rotate: `${(sway.value - 0.5) * 5}deg` }] }));
  const sEyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const sMouth = useAnimatedStyle(() => ({ transform: [{ scaleY: talk.value }] }));

  const layer = (children: ReactNode) => (
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {children}
    </Svg>
  );
  const blinks = mood !== 'happy' && mood !== 'love';
  return (
    <Animated.View pointerEvents="none" style={[{ width, height, transformOrigin: `${width / 2}px ${height}px` }, sWrap]}>
      <View style={StyleSheet.absoluteFill}>{layer(<Body u={u} />)}</View>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `${80 * k}px ${118 * k}px` }, sHead]}>
        {layer(<Head u={u} mood={mood} />)}
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `${80 * k}px ${79 * k}px` }, blinks ? sEyes : null]}>{layer(<Eyes mood={mood} />)}</Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `${80 * k}px ${101 * k}px` }, talking ? sMouth : null]}>{layer(<Mouth mood={mood} open={talking} />)}</Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
