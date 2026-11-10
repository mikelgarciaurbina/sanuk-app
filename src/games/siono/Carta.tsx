// Carta de ¿Sí o บ่?: se arrastra con el dedo (gesture-handler, en el hilo de la interfaz), se inclina en 3D
// siguiendo el gesto, deja ver los sellos «ใช่» y «บ่» y sale volando con giro al soltarla. También responde
// a los botones (orden `cmd`) y, en la feria, a su propio reloj (cae si se acaba el tiempo).
import { useEffect, useEffectEvent, useId, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, Extrapolation, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Rom, Th } from '@/components/ui';
import type { Word } from '@/content/types';
import { say } from '@/lib/audio';

export const THRESHOLD = 110;
export const CARD_H = 330;

export type Deal = { id: number; word: Word; other: Word; truth: boolean; dir: 'th' | 'es' };
/** `true` = ใช่ (sí), `false` = บ่ (no), `null` = se acabó el tiempo. */
export type Verdict = boolean | null;

/** Cara de la carta (también se usa, quieta, para la siguiente del mazo). */
export function CardFace({ d, showRom = true }: { d: Deal; showRom?: boolean }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const th = d.dir === 'th';
  const proposalTh = d.other.th;
  const len = (th ? d.word.th : proposalTh).length;
  const big = len > 10 ? 30 : len > 6 ? 38 : 46;
  return (
    <View style={styles.face}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#EEF4FF" />
          </LinearGradient>
          <LinearGradient id={`${u}h`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={th ? '#5AA9FF' : '#FFB347'} />
            <Stop offset="1" stopColor={th ? '#3D7BFF' : '#FF8A3D'} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${u}f)`} />
        <Rect x={0} y={0} width="100%" height={44} fill={`url(#${u}h)`} />
        {[0.12, 0.3, 0.5, 0.7, 0.88].map((f) => (
          <Circle key={f} cx={`${f * 100}%`} cy={44} r={7} fill="#FFFFFF" />
        ))}
      </Svg>
      <Text style={styles.band}>{th ? '¿Qué significa?' : '¿Cómo se dice en thai?'}</Text>
      <View style={styles.body}>
        {th ? (
          <>
            <Th size={big} bold style={{ lineHeight: Math.round(big * 1.45), textAlign: 'center' }}>
              {d.word.th}
            </Th>
            {showRom ? <Rom rom={d.word.rom} size={17} /> : null}
          </>
        ) : (
          <Text style={[styles.esBig, d.word.es.length > 16 ? { fontSize: 24, lineHeight: 29 } : null]} numberOfLines={3}>
            «{d.word.es}»
          </Text>
        )}
        <Text style={styles.eq}>{th ? 'quiere decir…' : 'se dice…'}</Text>
        <View style={styles.proposal}>
          {th ? (
            <Text style={styles.proposalEs} numberOfLines={2}>
              {d.other.es}
            </Text>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Th size={28} bold style={{ lineHeight: 40, color: color.tinta }}>
                {proposalTh}
              </Th>
              {showRom ? <Rom rom={d.other.rom} size={14} /> : null}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function Stamp({ yes }: { yes: boolean }) {
  const c = yes ? '#16A86A' : '#E2474C';
  return (
    <View style={[styles.stamp, { borderColor: c, transform: [{ rotate: yes ? '-14deg' : '14deg' }] }]}>
      <View style={[styles.stampIn, { borderColor: c }]}>
        <Th size={30} bold style={{ color: c, lineHeight: 40 }}>
          {yes ? 'ใช่' : 'บ่'}
        </Th>
        <Text style={[styles.stampEs, { color: c }]}>{yes ? 'SÍ' : 'NO'}</Text>
      </View>
    </View>
  );
}

export function SwipeCard({
  d,
  cmd,
  timeMs,
  showRom,
  onDecide,
}: {
  d: Deal;
  /** orden de los botones: cambia `n` para lanzar la carta a un lado */
  cmd: { n: number; yes: boolean };
  /** tiempo de la carta (feria); 0 = sin reloj */
  timeMs: number;
  showRom: boolean;
  onDecide: (v: Verdict) => void;
}) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const lift = useSharedValue(0);
  const gone = useSharedValue(0);
  const enter = useSharedValue(0);
  const clock = useSharedValue(1);
  const spin = useSharedValue(0);

  useEffect(() => {
    enter.set(withSpring(1, { damping: 14, stiffness: 170 }));
  }, [enter]);

  const fly = (v: Verdict) => {
    if (gone.get()) return;
    gone.set(1);
    cancelAnimation(clock);
    if (v === null) {
      y.set(withTiming(700, { duration: 520, easing: Easing.in(Easing.quad) }));
      spin.set(withTiming(25, { duration: 520 }));
    } else {
      x.set(withTiming((v ? 1 : -1) * width * 1.4, { duration: 300, easing: Easing.in(Easing.quad) }));
      spin.set(withTiming(v ? 30 : -30, { duration: 300 }));
    }
    setTimeout(() => onDecide(v), v === null ? 380 : 210);
  };

  const flyLater = useEffectEvent((v: Verdict) => fly(v));

  // botones de abajo: cada orden nueva (posterior a que esta carta llegara arriba) la lanza
  const [n0] = useState(cmd.n);
  useEffect(() => {
    if (cmd.n === n0) return;
    const t = setTimeout(() => flyLater(cmd.yes), 0);
    return () => clearTimeout(t);
  }, [cmd.n, cmd.yes, n0]);

  // reloj de la carta (feria)
  useEffect(() => {
    if (!timeMs) return;
    clock.set(withTiming(0, { duration: timeMs, easing: Easing.linear }));
    const t = setTimeout(() => flyLater(null), timeMs);
    return () => clearTimeout(t);
  }, [timeMs, clock]);

  const decideFromGesture = (yes: boolean) => {
    cancelAnimation(clock);
    setTimeout(() => onDecide(yes), 180);
  };

  // la distancia se mide desde donde se apoyó el dedo (más fiable que esperar a que el gesto se active)
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const pan = usePanGesture({
    minDistance: 4,
    onBegin: (e) => {
      'worklet';
      sx.set(e.absoluteX);
      sy.set(e.absoluteY);
    },
    onActivate: () => {
      'worklet';
      if (gone.get()) return;
      lift.set(withTiming(1, { duration: 120 }));
    },
    onUpdate: (e) => {
      'worklet';
      if (gone.get()) return;
      x.set(e.absoluteX - sx.get());
      y.set((e.absoluteY - sy.get()) * 0.35);
    },
    onDeactivate: (e) => {
      'worklet';
      lift.set(withTiming(0, { duration: 160 }));
      if (gone.get()) return;
      const dx = e.absoluteX - sx.get();
      if (Math.abs(dx) > THRESHOLD || Math.abs(e.velocityX) > 900) {
        const yes = (Math.abs(dx) > THRESHOLD ? dx : e.velocityX) > 0;
        gone.set(1);
        x.set(withTiming((yes ? 1 : -1) * width * 1.4, { duration: 280, easing: Easing.out(Easing.quad) }));
        y.set(withTiming(y.get() + e.velocityY * 0.12, { duration: 280 }));
        spin.set(withTiming(yes ? 32 : -32, { duration: 280 }));
        scheduleOnRN(decideFromGesture, yes);
      } else {
        x.set(withSpring(0, { damping: 12, stiffness: 180 }));
        y.set(withSpring(0, { damping: 12, stiffness: 180 }));
      }
    },
  });

  const card = useAnimatedStyle(() => {
    const tilt = interpolate(x.get(), [-220, 0, 220], [-14, 0, 14], Extrapolation.CLAMP);
    const e = enter.get();
    return {
      transform: [
        { perspective: 800 },
        { translateX: x.get() },
        { translateY: y.get() + (1 - e) * 16 },
        { rotateZ: `${tilt + spin.get()}deg` },
        { rotateY: `${interpolate(x.get(), [-220, 0, 220], [16, 0, -16], Extrapolation.CLAMP)}deg` },
        { rotateX: `${interpolate(y.get(), [-80, 0, 80], [-8, 0, 8], Extrapolation.CLAMP)}deg` },
        { scale: (0.94 + 0.06 * e) * (1 + 0.035 * lift.get()) },
      ],
    };
  });
  const yesSt = useAnimatedStyle(() => {
    const k = interpolate(x.get(), [24, THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { opacity: k, transform: [{ scale: 1.5 - 0.5 * k }] };
  });
  const noSt = useAnimatedStyle(() => {
    const k = interpolate(x.get(), [-THRESHOLD, -24], [1, 0], Extrapolation.CLAMP);
    return { opacity: k, transform: [{ scale: 1.5 - 0.5 * k }] };
  });
  const tint = useAnimatedStyle(() => {
    const k = interpolate(Math.abs(x.get()), [24, THRESHOLD * 1.4], [0, 0.22], Extrapolation.CLAMP);
    return { opacity: k, backgroundColor: x.get() > 0 ? '#2DBE78' : '#E2474C' };
  });
  const bar = useAnimatedStyle(() => ({
    width: `${clock.get() * 100}%`,
    backgroundColor: clock.get() > 0.5 ? '#2DBE78' : clock.get() > 0.25 ? '#FFB020' : '#E2474C',
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessible
        accessibilityLabel={d.dir === 'th' ? `${d.word.th}, ¿quiere decir ${d.other.es}? Desliza a la derecha si es correcto o a la izquierda si no.` : `«${d.word.es}», ¿se dice ${d.other.th}? Desliza a la derecha si es correcto o a la izquierda si no.`}
        style={[styles.card, card]}>
        <CardFace d={d} showRom={showRom} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 28 }, tint]} />
        {timeMs ? (
          <View style={styles.timer}>
            <Animated.View style={[styles.timerFill, bar]} />
          </View>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Escuchar" onPress={() => say(d.dir === 'th' ? d.word.th : d.other.th)} style={styles.speaker}>
          <Icon name="speaker" size={20} color="#FFFFFF" />
        </Pressable>
        <Animated.View pointerEvents="none" style={[styles.stampPos, { left: 16 }, yesSt]}>
          <Stamp yes />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.stampPos, { right: 16 }, noSt]}>
          <Stamp yes={false} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

/** Dorso de carta para el fondo del mazo. */
export function CardBack() {
  return (
    <View style={[styles.face, { backgroundColor: '#3D7BFF', alignItems: 'center', justifyContent: 'center' }]}>
      <Svg width={120} height={120} viewBox="0 0 120 120" opacity={0.35}>
        <Path d="M60 10 C75 35 75 55 60 80 C45 55 45 35 60 10 Z M20 60 C45 45 65 45 100 60 C65 75 45 75 20 60 Z" fill="#FFFFFF" />
        <Circle cx={60} cy={60} r={46} stroke="#FFFFFF" strokeWidth={3} fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 340,
    height: CARD_H,
    borderRadius: 28,
    shadowColor: '#1D2347',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  face: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderColor: '#DCE6F5', backgroundColor: '#FFFFFF' },
  band: { position: 'absolute', left: 0, right: 0, top: 11, textAlign: 'center', fontFamily: font.uiHeavy, fontSize: 14, letterSpacing: 0.4, color: '#FFFFFF' },
  body: { position: 'absolute', left: 16, right: 16, top: 52, bottom: 18, alignItems: 'center', justifyContent: 'center', gap: 2 },
  esBig: { fontFamily: font.displayBold, fontSize: 30, lineHeight: 35, color: color.tinta, textAlign: 'center' },
  eq: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta3, marginTop: 6 },
  proposal: { marginTop: 6, minWidth: '70%', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: '#FFF6E0', borderWidth: 2, borderColor: '#FFD27A', alignItems: 'center' },
  proposalEs: { fontFamily: font.displayBold, fontSize: 24, lineHeight: 29, color: color.tinta, textAlign: 'center' },
  timer: { position: 'absolute', left: 18, right: 18, bottom: 10, height: 7, borderRadius: 4, backgroundColor: 'rgba(29,35,71,0.1)', overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 4 },
  speaker: { position: 'absolute', right: 12, top: 56, width: 36, height: 36, borderRadius: 18, backgroundColor: color.cielo, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderColor: color.cieloHondo },
  stampPos: { position: 'absolute', top: 60 },
  stamp: { borderWidth: 4, borderRadius: 14, padding: 3, backgroundColor: 'rgba(255,255,255,0.75)' },
  stampIn: { borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, alignItems: 'center' },
  stampEs: { fontFamily: font.displayBold, fontSize: 12, letterSpacing: 2, marginTop: -6, marginBottom: 2 },
});
