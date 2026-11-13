// Vidas de ¿Sí o บ่? en la feria: corazones con volumen que laten al ganarse y se apagan al perderse.
import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z';

/** Fila de corazones: `lives` encendidos de `total`. */
export function Vidas({ lives, total, size = 28 }: { lives: number; total: number; size?: number }) {
  return (
    <View accessible accessibilityLabel={`${lives} de ${total} vidas`} style={{ flexDirection: 'row', gap: 1 }}>
      {Array.from({ length: total }, (_, i) => (
        <Corazon key={i} on={i < lives} size={size} />
      ))}
    </View>
  );
}

function Corazon({ on, size }: { on: boolean; size: number }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = useSharedValue(on ? 1 : 0);
  const beat = useSharedValue(1);
  useEffect(() => {
    p.value = withTiming(on ? 1 : 0, { duration: 260 });
    // late al ganarse y da un respingo al perderse
    beat.value = on ? withSequence(withTiming(1.45, { duration: 120 }), withSpring(1, { damping: 7, stiffness: 220 })) : withSequence(withTiming(0.6, { duration: 110 }), withSpring(0.86, { damping: 9, stiffness: 200 }));
  }, [on, p, beat]);
  const full = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: beat.value }] }));
  const empty = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ scale: beat.value }] }));
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, empty]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d={HEART} fill="rgba(29,35,71,0.18)" stroke="rgba(255,255,255,0.7)" strokeWidth={1.4} />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, full]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Defs>
            <RadialGradient id={`${u}h`} cx="36%" cy="30%" r="80%">
              <Stop offset="0" stopColor="#FF9FB0" />
              <Stop offset="0.45" stopColor="#F2475C" />
              <Stop offset="1" stopColor="#B81E3A" />
            </RadialGradient>
          </Defs>
          <Path d={HEART} fill="#8F1F23" transform="translate(0 1)" />
          <Path d={HEART} fill={`url(#${u}h)`} stroke="#FFFFFF" strokeWidth={1.2} />
          <Ellipse cx={7.6} cy={8.6} rx={2.3} ry={1.4} fill="#FFFFFF" opacity={0.75} transform="rotate(-35 7.6 8.6)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
