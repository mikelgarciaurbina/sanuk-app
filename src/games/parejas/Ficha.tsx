// Ficha de Parejas: una tarjeta con volumen (degradado, canto inferior y brillo) que entra en ola, se eleva
// al elegirla, tiembla si fallas y vuela hacia su pareja cuando aciertas.
import { useEffect, useId } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { font, motion } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Rom, Th } from '@/components/ui';
import type { Word } from '@/content/types';

import { Press3D } from '../fx';
import { fitTh } from '../palabras/common';

/** `out`: ya ha estallado y no se dibuja (para que no tape los toques). */
export type FichaState = 'idle' | 'sel' | 'bad' | 'hint' | 'ok' | 'gone' | 'out';
export type Side = 'th' | 'es';

type Look = { top: string; bottom: string; border: string; depth: string; text: string };
const LOOK: Record<'th' | 'es' | 'oro' | 'bad' | 'ok', Look> = {
  th: { top: '#FFF9EC', bottom: '#FFDDA0', border: '#E9A93B', depth: '#9A5B1E', text: '#3A1F0B' },
  es: { top: '#FFFFFF', bottom: '#D6E2FF', border: '#93A9F7', depth: '#3C4E9C', text: '#1D2347' },
  oro: { top: '#FFF6C2', bottom: '#FFC83D', border: '#C98F00', depth: '#7E5200', text: '#4A2F00' },
  bad: { top: '#FFECEA', bottom: '#FFB3AC', border: '#E2474C', depth: '#8F1F23', text: '#7A1418' },
  ok: { top: '#ECFFF4', bottom: '#9EE8C0', border: '#2DBE78', depth: '#0B5E37', text: '#0B4A2C' },
};

const DEPTH = 5;

export function Ficha({
  word,
  side,
  state,
  delay,
  height,
  width,
  dx,
  dy,
  golden,
  audio,
  showRom,
  disabled,
  onPress,
}: {
  word: Word;
  side: Side;
  state: FichaState;
  delay: number;
  height: number;
  /** ancho de la ficha, para que el thai quepa entero en una línea */
  width: number;
  dx: number;
  dy: number;
  golden?: boolean;
  audio?: boolean;
  showRom?: boolean;
  disabled?: boolean;
  onPress: (e: GestureResponderEvent) => void;
}) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduced = useReducedMotion();
  const appear = useSharedValue(0);
  const lift = useSharedValue(0);
  const shake = useSharedValue(0);
  const fly = useSharedValue(0);
  const gone = useSharedValue(0);
  const pulse = useSharedValue(0);
  const shine = useSharedValue(0);

  useEffect(() => {
    appear.value = withDelay(delay, withSpring(1, { damping: 11, stiffness: 150 }));
  }, [appear, delay]);

  useEffect(() => {
    lift.value = withSpring(state === 'sel' ? 1 : 0, motion.pop);
    if (state === 'bad') {
      shake.value = withSequence(withTiming(-9, { duration: 45 }), withTiming(9, { duration: 70 }), withTiming(-6, { duration: 60 }), withTiming(4, { duration: 55 }), withTiming(0, { duration: 50 }));
    }
    if (state === 'ok') fly.value = withTiming(1, { duration: 250, easing: Easing.in(Easing.quad) });
    if (state === 'gone') gone.value = withTiming(1, { duration: 140 });
    if (state === 'hint' && !reduced) pulse.value = withRepeat(withTiming(1, { duration: 420, easing: Easing.inOut(Easing.sin) }), -1, true);
    else pulse.value = withTiming(0, { duration: 150 });
  }, [state, lift, shake, fly, gone, pulse, reduced]);

  useEffect(() => {
    if (!golden || reduced) return;
    shine.value = withRepeat(withSequence(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), withDelay(1100, withTiming(0, { duration: 0 }))), -1, false);
  }, [golden, reduced, shine]);

  const tilt = side === 'th' ? -1 : 1;
  const st = useAnimatedStyle(() => {
    const a = appear.value;
    const f = fly.value;
    return {
      opacity: Math.min(1, Math.max(0, a)) * (1 - gone.value),
      transform: [
        { translateX: shake.value + f * dx },
        { translateY: (1 - a) * -42 - lift.value * 5 + f * dy },
        { rotate: `${(1 - a) * tilt * 12 + f * tilt * -14}deg` },
        { scale: (0.55 + 0.45 * a) * (1 + 0.06 * lift.value) * (1 - 0.12 * f) * (1 + 0.5 * gone.value) },
      ],
    };
  });
  const ring = useAnimatedStyle(() => ({ opacity: Math.max(lift.value, pulse.value) }));
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -120 + shine.value * 360 }, { skewX: '-20deg' }] }));

  const look = state === 'bad' ? LOOK.bad : state === 'ok' ? LOOK.ok : golden ? LOOK.oro : LOOK[side];
  const ringTint = state === 'hint' ? '#6FA0FF' : '#FFD34D';
  const hideTh = audio && state !== 'ok' && state !== 'gone';
  // con transcripción el thai va algo más pequeño (y más aún en fichas bajas) para que quepan las dos líneas
  const tight = height < 54;
  const thFinal = fitTh(word.th, width - 16, showRom ? (tight ? 17 : 21) : height < 56 ? 21 : 24, 12).size;
  const esLen = word.es.length;
  const esSize = esLen > 24 ? 13 : esLen > 14 ? 14.5 : 16;

  return (
    <Animated.View pointerEvents={state === 'gone' ? 'none' : 'auto'} style={[{ height }, st]}>
      <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: ringTint, shadowColor: ringTint }, ring]} />
      <Press3D
        onPress={onPress}
        disabled={disabled || state === 'ok' || state === 'gone'}
        depth={14}
        style={{ flex: 1 }}
        accessibilityLabel={side === 'th' ? (hideTh ? 'Palabra thai: toca para escucharla' : `Thai: ${word.th}`) : word.es}>
        <View style={{ flex: 1, borderRadius: 16, backgroundColor: look.depth }}>
          <View style={[styles.face, { bottom: DEPTH, borderColor: look.border }]}>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={look.top} />
                  <Stop offset="1" stopColor={look.bottom} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${u}f)`} />
            </Svg>
            <View style={styles.hl} />
            {golden ? (
              <Animated.View pointerEvents="none" style={[styles.sweep, sweep]}>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.55)' }} />
              </Animated.View>
            ) : null}
            <View style={styles.content}>
              {side === 'th' ? (
                hideTh ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="speaker" size={24} color={look.text} />
                    <Text style={[styles.audio, { color: look.text }]}>¿qué oyes?</Text>
                  </View>
                ) : (
                  <>
                    <Th size={thFinal} bold numberOfLines={1} style={{ color: look.text, lineHeight: Math.round(thFinal * (showRom && tight ? 1.35 : 1.45)) }}>
                      {word.th}
                    </Th>
                    {showRom ? (
                      <View style={{ maxHeight: tight ? 14 : 16, overflow: 'hidden' }}>
                        <Rom rom={word.rom} size={tight ? 10.5 : 11.5} />
                      </View>
                    ) : null}
                  </>
                )
              ) : (
                <Text numberOfLines={2} style={[styles.es, { color: look.text, fontSize: esSize, lineHeight: esSize * 1.22 }]}>
                  {word.es}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Press3D>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', left: -5, right: -5, top: -5, bottom: -2, borderRadius: 21, borderWidth: 3, shadowOpacity: 0.95, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  face: { position: 'absolute', left: 0, right: 0, top: 0, borderRadius: 16, borderWidth: 2, overflow: 'hidden' },
  hl: { position: 'absolute', left: 8, right: 8, top: 3, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.65)' },
  content: { position: 'absolute', left: 4, right: 4, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  es: { fontFamily: font.uiHeavy, textAlign: 'center' },
  audio: { fontFamily: font.uiHeavy, fontSize: 13 },
  sweep: { position: 'absolute', top: -10, bottom: -10, left: 0, width: 46, opacity: 0.8 },
});
