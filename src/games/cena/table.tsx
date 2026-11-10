// El khantoke (ขันโตก), la mesa baja y redonda del norte, lacada en rojo y oro, con la cena:
// olla de curry hang le humeante, cesto de arroz glutinoso, nam prik ong con verduras, chicharrones y sai ua.
import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

const VB_W = 360;
const VB_H = 150;

function Steam({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false));
  }, [reduced, t, delay]);
  const st = useAnimatedStyle(() => ({
    opacity: (t.value < 0.25 ? t.value * 4 : (1 - t.value) / 0.75) * 0.55,
    transform: [{ translateY: -t.value * size * 2.2 }, { translateX: Math.sin(t.value * Math.PI * 2) * size * 0.25 }, { scale: 0.6 + t.value * 1.1 }],
  }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - size * 0.25, top: y - size * 0.4, width: size * 0.5, height: size * 0.8, borderRadius: size, backgroundColor: '#FFFFFF' }, st]} />;
}

export function Khantoke({ width }: { width: number }) {
  const u = `k${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const k = width / VB_W;
  const height = VB_H * k;
  return (
    <View pointerEvents="none" style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Defs>
          <LinearGradient id={`${u}t`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#D2413A" />
            <Stop offset="1" stopColor="#8E211E" />
          </LinearGradient>
          <LinearGradient id={`${u}e`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7A1B19" />
            <Stop offset="1" stopColor="#4E0F0E" />
          </LinearGradient>
          <LinearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#B7862A" />
            <Stop offset="0.5" stopColor="#FFE08A" />
            <Stop offset="1" stopColor="#B7862A" />
          </LinearGradient>
          <RadialGradient id={`${u}p`} cx="40%" cy="30%" r="70%">
            <Stop offset="0" stopColor="#C9784A" />
            <Stop offset="1" stopColor="#6E3416" />
          </RadialGradient>
          <RadialGradient id={`${u}c`} cx="50%" cy="40%" r="60%">
            <Stop offset="0" stopColor="#F2A13C" />
            <Stop offset="1" stopColor="#B85A1C" />
          </RadialGradient>
          <LinearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#C9934E" />
            <Stop offset="0.5" stopColor="#F2CC86" />
            <Stop offset="1" stopColor="#B07A36" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={180} cy={146} rx={150} ry={7} fill="#000000" opacity={0.28} />
        <Path d="M128 104 H232 L224 146 H136 Z" fill={`url(#${u}e)`} />
        <Path d="M131 118 H229 M134 132 H226" stroke={`url(#${u}g)`} strokeWidth={3} />
        <Ellipse cx={180} cy={80} rx={174} ry={50} fill={`url(#${u}e)`} />
        <Ellipse cx={180} cy={70} rx={174} ry={50} fill={`url(#${u}g)`} />
        <Ellipse cx={180} cy={68} rx={166} ry={45} fill={`url(#${u}t)`} />
        <Ellipse cx={180} cy={68} rx={150} ry={39} fill="none" stroke="#FFD166" strokeWidth={1.2} strokeDasharray="3 5" opacity={0.6} />
        <Path d="M40 52 C90 30 270 30 320 52" stroke="#FFFFFF" strokeWidth={3} fill="none" opacity={0.18} strokeLinecap="round" />

        {/* cesto de arroz glutinoso (kratip) */}
        <G>
          <Ellipse cx={92} cy={66} rx={20} ry={6} fill="#000000" opacity={0.25} />
          <Path d="M76 34 H108 L105 64 C105 68 79 68 79 64 Z" fill={`url(#${u}b)`} />
          <Path d="M77 42 H107 M78 50 H106 M78.5 58 H105.5" stroke="#8A5A22" strokeWidth={1.2} opacity={0.6} />
          <Path d="M84 34 L83 66 M92 34 V67 M100 34 L101 66" stroke="#8A5A22" strokeWidth={0.9} opacity={0.4} />
          <Ellipse cx={92} cy={33} rx={17} ry={5} fill="#DDA95F" />
          <Circle cx={92} cy={29} r={3} fill="#A87A3A" />
          <Path d="M76 40 C66 22 118 22 108 40" stroke="#7A4A1E" strokeWidth={2} fill="none" />
        </G>

        {/* olla de curry */}
        <G>
          <Ellipse cx={180} cy={66} rx={34} ry={8} fill="#000000" opacity={0.25} />
          <Path d="M148 40 C148 70 212 70 212 40 Z" fill={`url(#${u}p)`} />
          <Ellipse cx={180} cy={40} rx={32} ry={9} fill="#8E4A24" />
          <Ellipse cx={180} cy={40} rx={28} ry={7} fill={`url(#${u}c)`} />
          <Circle cx={170} cy={39} r={2.4} fill="#7A2E10" />
          <Circle cx={186} cy={41} r={2} fill="#7A2E10" />
          <Circle cx={192} cy={38} r={1.6} fill="#FFD166" />
          <Path d="M196 36 L218 18" stroke="#6E4A2E" strokeWidth={3.4} strokeLinecap="round" />
          <Path d="M156 46 C162 52 170 54 176 54" stroke="#FFFFFF" strokeWidth={2} fill="none" opacity={0.3} strokeLinecap="round" />
        </G>

        {/* nam prik ong y verduras */}
        <G>
          <Ellipse cx={262} cy={52} rx={22} ry={9} fill="#E9EEF8" />
          <Ellipse cx={262} cy={50} rx={18} ry={6.5} fill="#D9532C" />
          <Circle cx={256} cy={49} r={1.6} fill="#8E2A10" />
          <Circle cx={266} cy={51} r={1.4} fill="#FFE08A" />
          <Path d="M240 54 C246 62 278 62 284 54" stroke="#3D7BFF" strokeWidth={1.6} fill="none" opacity={0.5} />
          <Ellipse cx={288} cy={80} rx={30} ry={10} fill="#F4F7FC" />
          <Path d="M268 78 C276 70 284 70 292 76 M274 82 C284 74 296 74 304 80" stroke="#4FA36A" strokeWidth={3} fill="none" strokeLinecap="round" />
          {[
            [280, 82],
            [292, 84],
            [302, 79],
          ].map(([x, y]) => (
            <G key={x}>
              <Circle cx={x} cy={y} r={5} fill="#7BC67E" />
              <Circle cx={x} cy={y} r={3.4} fill="#E9F7D9" />
            </G>
          ))}
        </G>

        {/* chicharrones (khaep mu) */}
        <G>
          <Ellipse cx={118} cy={92} rx={24} ry={9} fill="#8E5530" />
          <Ellipse cx={118} cy={90} rx={21} ry={7} fill="#6E3E20" />
          {[
            [108, 86],
            [118, 84],
            [128, 86],
            [113, 90],
            [124, 90],
          ].map(([x, y]) => (
            <Ellipse key={`${x}${y}`} cx={x} cy={y} rx={6} ry={4} fill="#F6D58C" stroke="#D9A64A" strokeWidth={0.8} />
          ))}
        </G>

        {/* sai ua sobre hoja de plátano */}
        <G>
          <Ellipse cx={214} cy={96} rx={30} ry={9} fill="#3E9A52" />
          <Path d="M186 96 H242" stroke="#7BC67E" strokeWidth={1.2} />
          <Path d="M214 94 m-3 0 a3 2 0 1 1 6 0 a8 5 0 1 1 -14 0 a12 7.5 0 1 1 24 0 a16 9 0 1 1 -32 1" stroke="#B5452A" strokeWidth={4.5} fill="none" strokeLinecap="round" />
          <Path d="M204 90 C208 88 214 88 218 89" stroke="#F09A7A" strokeWidth={1.2} fill="none" opacity={0.7} />
        </G>
      </Svg>
      <Steam x={172 * k} y={30 * k} size={22 * k} delay={0} />
      <Steam x={184 * k} y={28 * k} size={20 * k} delay={850} />
      <Steam x={194 * k} y={32 * k} size={18 * k} delay={1700} />
    </View>
  );
}
