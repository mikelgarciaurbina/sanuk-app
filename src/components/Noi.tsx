import { useEffect, useId, useMemo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { NOI_PIVOTS, noiEyesOpen, noiLayerXml, noiParts, type NoiPartId, type NoiPose } from '@/brand/noi-art';

type Props = {
  pose?: NoiPose;
  size?: number;
  /** cambia este número para que Noi dé un salto de alegría */
  jump?: number;
  onPress?: () => void;
  still?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Capas agrupadas para animarlas por separado (orden de pintado). */
const GROUPS: { key: string; parts: NoiPartId[] }[] = [
  { key: 'shadow', parts: ['shadow'] },
  { key: 'earL', parts: ['earL'] },
  { key: 'earR', parts: ['earR'] },
  { key: 'body', parts: ['pack', 'legs', 'body', 'head', 'brows', 'mouth'] },
  { key: 'eyes', parts: ['eyes'] },
  { key: 'trunk', parts: ['trunk'] },
  { key: 'hat', parts: ['hat'] },
  { key: 'armL', parts: ['armL'] },
  { key: 'armR', parts: ['armR'] },
  { key: 'extras', parts: ['extras'] },
];

const loop = (anim: number) => withRepeat(anim, -1, false);

export function Noi({ pose = 'feliz', size = 160, jump = 0, onPress, still, style, accessibilityLabel }: Props) {
  const reduced = useReducedMotion();
  const animate = !still && !reduced;
  const k = size / 240;
  // En web todos los SVG comparten documento: ids únicos por instancia para que los degradados
  // no apunten a los de otra Noi oculta (p. ej. en una pantalla anterior de la pila).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  const xml = useMemo(() => {
    const parts = noiParts(pose);
    const byId = new Map(parts.map((p) => [p.id, p]));
    return Object.fromEntries(
      GROUPS.map((g) => {
        const markup = g.parts
          .map((id) => {
            const p = byId.get(id)!;
            return p.transform ? `<g transform="${p.transform}">${p.markup}</g>` : p.markup;
          })
          .join('');
        const doc = noiLayerXml({ id: g.parts[0], markup }).replace(/noi-(skin2|skin|ear|iris|hat|shirt|shorts|pack|pkm)\b/g, `noi-$1-${uid}`);
        return [g.key, doc];
      }),
    ) as Record<string, string>;
  }, [pose, uid]);

  const breathe = useSharedValue(1);
  const blink = useSharedValue(1);
  const earL = useSharedValue(0);
  const earR = useSharedValue(0);
  const trunk = useSharedValue(0);
  const armL = useSharedValue(0);
  const armR = useSharedValue(0);
  const float = useSharedValue(0);
  const hop = useSharedValue(0);
  const squish = useSharedValue(1);

  useEffect(() => {
    if (!animate) return;
    breathe.value = loop(withSequence(withTiming(1.018, { duration: 1700, easing: Easing.inOut(Easing.sin) }), withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) })));
    if (noiEyesOpen(pose)) {
      blink.value = loop(withSequence(withDelay(2600 + Math.random() * 1600, withTiming(0.08, { duration: 70 })), withTiming(1, { duration: 110 })));
    }
    earL.value = loop(withSequence(withDelay(2200, withTiming(-7, { duration: 170 })), withTiming(3, { duration: 160 }), withTiming(0, { duration: 260 })));
    earR.value = loop(withSequence(withDelay(2600, withTiming(7, { duration: 170 })), withTiming(-3, { duration: 160 }), withTiming(0, { duration: 260 })));
    trunk.value = withRepeat(withSequence(withTiming(4, { duration: 1300, easing: Easing.inOut(Easing.sin) }), withTiming(-3, { duration: 1300, easing: Easing.inOut(Easing.sin) })), -1, true);
    float.value = withRepeat(withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
    if (pose === 'hola') {
      armL.value = loop(withSequence(withTiming(14, { duration: 240 }), withTiming(-8, { duration: 240 }), withTiming(10, { duration: 220 }), withTiming(0, { duration: 260 }), withDelay(700, withTiming(0, { duration: 1 }))));
    } else if (pose === 'celebra') {
      armL.value = withRepeat(withSequence(withTiming(-10, { duration: 220 }), withTiming(6, { duration: 220 })), -1, true);
      armR.value = withRepeat(withSequence(withTiming(10, { duration: 220 }), withTiming(-6, { duration: 220 })), -1, true);
      hop.value = withRepeat(withSequence(withTiming(-10, { duration: 260, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) })), -1, false);
    } else if (pose === 'ups') {
      armL.value = withRepeat(withSequence(withTiming(-6, { duration: 160 }), withTiming(4, { duration: 160 })), -1, true);
    } else if (pose === 'escucha') {
      earR.value = withRepeat(withSequence(withTiming(9, { duration: 500 }), withTiming(2, { duration: 500 })), -1, true);
    }
  }, [animate, pose, breathe, blink, earL, earR, trunk, armL, armR, float, hop]);

  useEffect(() => {
    if (!jump) return;
    hop.set(withSequence(withTiming(-22, { duration: 180, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 9, stiffness: 180 })));
  }, [jump, hop]);

  const px = (v: number) => v * k;
  const origin = (p: { x: number; y: number }) => `${px(p.x)}px ${px(p.y)}px`;

  const sWrap = useAnimatedStyle(() => ({
    transform: [{ translateY: hop.value }, { scaleY: breathe.value }, { scale: squish.value }],
  }));
  const sEyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const sEarL = useAnimatedStyle(() => ({ transform: [{ rotate: `${earL.value}deg` }] }));
  const sEarR = useAnimatedStyle(() => ({ transform: [{ rotate: `${earR.value}deg` }] }));
  const sTrunk = useAnimatedStyle(() => ({ transform: [{ rotate: `${trunk.value}deg` }] }));
  const sArmL = useAnimatedStyle(() => ({ transform: [{ rotate: `${armL.value}deg` }] }));
  const sArmR = useAnimatedStyle(() => ({ transform: [{ rotate: `${armR.value}deg` }] }));
  const sFloat = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));

  const layerStyle = (key: string) => {
    switch (key) {
      case 'eyes':
        return [sEyes, { transformOrigin: origin(NOI_PIVOTS.eyes) }];
      case 'earL':
        return [sEarL, { transformOrigin: origin(NOI_PIVOTS.earL) }];
      case 'earR':
        return [sEarR, { transformOrigin: origin(NOI_PIVOTS.earR) }];
      case 'trunk':
        return [sTrunk, { transformOrigin: origin(NOI_PIVOTS.trunk) }];
      case 'armL':
        return [sArmL, { transformOrigin: origin(NOI_PIVOTS.armL) }];
      case 'armR':
        return [sArmR, { transformOrigin: origin(NOI_PIVOTS.armR) }];
      case 'extras':
        return [sFloat];
      default:
        return [];
    }
  };

  const body = (
    <Animated.View style={[{ width: size, height: size, transformOrigin: `${size / 2}px ${size * 0.96}px` }, sWrap]}>
      {GROUPS.map((g) => (
        <Animated.View key={g.key} pointerEvents="none" style={[StyleSheet.absoluteFill, ...layerStyle(g.key)]}>
          <SvgXml xml={xml[g.key]} width={size} height={size} />
        </Animated.View>
      ))}
    </Animated.View>
  );

  if (!onPress) {
    return (
      <View style={style} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel ?? 'Noi, la elefanta'}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      style={style}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Noi, la elefanta. Tócala'}
      onPressIn={() => {
        squish.set(withTiming(0.93, { duration: 90 }));
      }}
      onPressOut={() => {
        squish.set(withSpring(1, { damping: 7, stiffness: 220 }));
      }}
      onPress={onPress}>
      {body}
    </Pressable>
  );
}
