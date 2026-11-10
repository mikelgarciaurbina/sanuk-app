// Piezas comunes de los juegos de «Oído y tonos»: ondas de sonido, orbe de audio, barra de rondas y
// puntos, botón «Siguiente» con avance automático, pieles 3D de cartas, medallones y dorso Lanna.
import { useEffect, useEffectEvent, useId, type ReactNode } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeIn, ZoomIn, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { fx } from '@/lib/audio';

import { Glow, Pop, Press3D } from '../fx';
import { ComboBadge } from '../kit';

const idOf = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');

// ——— Ondas de sonido ———

/** Ondas que salen de un punto mientras suena algo. Ponlo en posición absoluta, centrado en la fuente. */
export function Waves({ active, size = 200, tint = '#FFFFFF', rings = 3, width = 3 }: { active: boolean; size?: number; tint?: string; rings?: number; width?: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    if (active) {
      t.value = 0;
      t.value = withRepeat(withTiming(1, { duration: 1150, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(t);
      t.value = 0;
    }
  }, [active, reduced, t]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: rings }, (_, i) => (
        <WaveRing key={i} t={t} phase={i / rings} size={size} tint={tint} on={active && !reduced} width={width} />
      ))}
    </View>
  );
}

function WaveRing({ t, phase, size, tint, on, width }: { t: SharedValue<number>; phase: number; size: number; tint: string; on: boolean; width: number }) {
  const st = useAnimatedStyle(() => {
    const v = (t.value + phase) % 1;
    return { opacity: on ? (1 - v) * 0.85 : 0, transform: [{ scale: 0.32 + v * 0.68 }] };
  });
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: width, borderColor: tint }, st]} />;
}

// ——— Orbe de audio ———

const ORB = {
  blue: { light: '#9CC0FF', mid: color.cielo, deep: color.cieloHondo, glow: '#BFD6FF', wave: '#FFFFFF' },
  gold: { light: '#FFF1B8', mid: color.buatong, deep: '#D99A00', glow: '#FFE07A', wave: '#FFF3C4' },
};

/** Gran botón de audio, brillante y con ondas mientras suena. */
export function AudioOrb({ onPress, talking, size = 92, gold, label = 'Escuchar otra vez' }: { onPress: (e: GestureResponderEvent) => void; talking: boolean; size?: number; gold?: boolean; label?: string }) {
  const id = idOf(useId());
  const reduced = useReducedMotion();
  const beat = useSharedValue(0);
  useEffect(() => {
    if (talking && !reduced) beat.value = withRepeat(withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 210 })), -1, false);
    else {
      cancelAnimation(beat);
      beat.value = withTiming(0, { duration: 160 });
    }
  }, [talking, reduced, beat]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + beat.value * 0.07 }] }));
  const c = gold ? ORB.gold : ORB.blue;
  const box = Math.round(size * 1.75);
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <Glow size={box} tint={c.glow} strength={talking ? 0.9 : 0.5} style={{ position: 'absolute' }} />
      <Waves active={talking} size={box} tint={c.wave} />
      <Animated.View style={st}>
        <Press3D onPress={onPress} style={{ width: size, height: size + 6 }} depth={18} accessibilityLabel={label}>
          <View style={[styles.orbEdge, { borderRadius: size, backgroundColor: c.deep }]}>
            <View style={{ width: size, height: size, borderRadius: size, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
                <Defs>
                  <RadialGradient id={`${id}o`} cx="38%" cy="30%" r="78%">
                    <Stop offset="0" stopColor={c.light} />
                    <Stop offset="0.55" stopColor={c.mid} />
                    <Stop offset="1" stopColor={c.deep} />
                  </RadialGradient>
                </Defs>
                <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id}o)`} />
                <Ellipse cx={size * 0.42} cy={size * 0.22} rx={size * 0.25} ry={size * 0.1} fill="#FFFFFF" opacity={0.5} />
              </Svg>
              {/* en una vista: en web, un SVG absoluto se pinta encima de los SVG hermanos sin posición */}
              <View>
                <Icon name="speaker" size={size * 0.46} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </Press3D>
      </Animated.View>
    </View>
  );
}

/** Botoncito de «más lento» (la tortuga). */
export function SlowPill({ onPress, dark, label = 'Lento' }: { onPress: () => void; dark?: boolean; label?: string }) {
  return (
    <Press3D onPress={onPress} style={{ height: 40, alignSelf: 'center' }} depth={10} accessibilityLabel="Escuchar más lento">
      <View style={[styles.pill, dark && styles.pillDark, !label && { paddingHorizontal: 10 }]}>
        <Icon name="turtle" size={22} color={dark ? '#FFFFFF' : color.cieloHondo} />
        {label ? <Text style={[styles.pillText, dark && { color: '#FFFFFF' }]}>{label}</Text> : null}
      </View>
    </Press3D>
  );
}

// ——— Barra de arriba: rondas, puntos y racha ———

export type Mark = 'ok' | 'bad';

/** Bolitas de las rondas (verde = acierto, naranja = fallo), puntos de la feria y la llama de la racha. */
export function TopBar({ marks, total, points, combo, dark }: { marks: Mark[]; total: number; points?: number; combo: number; dark?: boolean }) {
  const dots = Array.from({ length: Math.max(total, marks.length) }, (_, i): Mark | 'now' | 'todo' => (i < marks.length ? marks[i] : i === marks.length ? 'now' : 'todo'));
  return (
    <View style={styles.top}>
      <View style={[styles.glass, dark && styles.glassDark, styles.dots]}>
        {dots.map((d, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              d === 'ok' && { backgroundColor: color.arrozalVivo },
              d === 'bad' && { backgroundColor: color.farol },
              d === 'now' && styles.dotNow,
              d === 'todo' && { backgroundColor: dark ? 'rgba(255,255,255,0.28)' : 'rgba(29,35,71,0.16)' },
            ]}
          />
        ))}
      </View>
      <View style={{ flex: 1 }} />
      {points !== undefined ? (
        <Pop trigger={points} style={[styles.glass, dark && styles.glassDark, styles.points]}>
          <Icon name="star" size={18} color={color.buatong} />
          <Text style={[styles.pointsText, dark && { color: '#FFFFFF' }]}>{points}</Text>
        </Pop>
      ) : null}
      <ComboBadge combo={combo} />
    </View>
  );
}

/** Mecha de la rapidez (0–1): se consume mientras vale el bonus. Ponla en un contenedor con posición. */
export function Fuse({ value, on, style }: { value: SharedValue<number>; on: boolean; style?: StyleProp<ViewStyle> }) {
  const st = useAnimatedStyle(() => ({ width: `${value.value * 100}%`, backgroundColor: value.value > 0.5 ? color.arrozalVivo : color.farol }));
  return (
    <View style={[styles.fuseTrack, { opacity: on ? 1 : 0 }, style]}>
      <Animated.View style={[styles.fuseFill, st]} />
    </View>
  );
}

/** Etiqueta pequeña sobre el escenario: «Nivel 2 · Sin dibujos», «Repaso»… */
export function Tag({ text, tint = color.tinta, bg = 'rgba(255,255,255,0.86)' }: { text: string; tint?: string; bg?: string }) {
  return (
    <Animated.View key={text} entering={ZoomIn.springify().damping(12)} style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color: tint }]}>{text}</Text>
    </Animated.View>
  );
}

// ——— Botón «Siguiente» ———

const NEXT = {
  ok: { face: color.arrozal, edge: color.arrozalHondo, text: '#FFFFFF', fill: 'rgba(255,255,255,0.22)' },
  primary: { face: color.azafran, edge: color.azafranHondo, text: color.tinta, fill: 'rgba(255,255,255,0.3)' },
  blue: { face: color.cielo, edge: color.cieloHondo, text: '#FFFFFF', fill: 'rgba(255,255,255,0.22)' },
};

/** Botón grande para seguir. Con `auto` (ms) se rellena y sigue solo. */
export function NextButton({ label = 'Siguiente', onPress, auto, kind = 'ok' }: { label?: string; onPress: () => void; auto?: number; kind?: keyof typeof NEXT }) {
  const fill = useSharedValue(0);
  const go = useEffectEvent(() => onPress());
  useEffect(() => {
    if (!auto) return;
    fill.value = 0;
    fill.value = withTiming(1, { duration: auto, easing: Easing.linear });
    const t = setTimeout(() => go(), auto);
    return () => clearTimeout(t);
  }, [auto, fill]);
  const st = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const c = NEXT[kind];
  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Press3D
        onPress={() => {
          fx.tap();
          onPress();
        }}
        style={{ height: 62 }}
        depth={8}
        accessibilityLabel={label}>
        <View style={[styles.btnEdge, { backgroundColor: c.edge }]}>
          <View style={[styles.btnFace, { backgroundColor: c.face }]}>
            {auto ? <Animated.View style={[styles.btnFill, { backgroundColor: c.fill }, st]} /> : null}
            <View style={styles.btnShine} />
            <Text style={[styles.btnText, { color: c.text }]}>{label}</Text>
            <Icon name="arrow" size={22} color={c.text} stroke={3} />
          </View>
        </View>
      </Press3D>
    </Animated.View>
  );
}

// ——— Cartas ———

export type Skin = { top: string; bottom: string; border: string; edge: string };
export const SKINS = {
  idle: { top: '#FFFFFF', bottom: '#EDF2F9', border: '#DCE4EF', edge: '#BFCADB' },
  ok: { top: '#F3FFF8', bottom: '#CDEFDC', border: color.arrozalVivo, edge: color.arrozal },
  bad: { top: '#FFF8F4', bottom: '#FFDCCF', border: color.farol, edge: '#D9541C' },
  gold: { top: '#FFFBEA', bottom: '#FFE9A6', border: color.buatong, edge: '#D99A00' },
} satisfies Record<string, Skin>;

/** Cara de carta con relieve: degradado, brillo arriba, canto más oscuro abajo y sombra. */
export function CardSkin({ skin, radius = 22, children, style, pad = 8 }: { skin: Skin; radius?: number; children?: ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  const id = idOf(useId());
  return (
    <View style={[styles.cardEdge, { borderRadius: radius, backgroundColor: skin.edge }, style]}>
      <View style={{ flex: 1, borderRadius: radius, borderWidth: 2, borderColor: skin.border, overflow: 'hidden' }}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={skin.top} />
              <Stop offset="1" stopColor={skin.bottom} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}g)`} />
        </Svg>
        <View style={[styles.cardShine, { borderRadius: radius }]} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: pad }}>{children}</View>
      </View>
    </View>
  );
}

const MEDAL: [string, string][] = [
  ['#FFE3A3', '#F5B83D'],
  ['#CFE3FF', '#7FA8F0'],
  ['#FFD6CC', '#F2917A'],
  ['#CFF0DA', '#6CC48D'],
  ['#E6D9FF', '#A98BEA'],
  ['#FFDDEB', '#F08DB5'],
  ['#D2F1F5', '#62BFCC'],
];
/** Color estable para el medallón de una palabra. */
export const medalOf = (key: string) => MEDAL[[...key].reduce((a, ch) => a + ch.charCodeAt(0), 0) % MEDAL.length];

/** Emoji dentro de un medallón redondo con volumen. */
export function Medallion({ emoji, size = 72, tint = MEDAL[0] }: { emoji?: string; size?: number; tint?: [string, string] }) {
  const id = idOf(useId());
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`${id}m`} cx="40%" cy="32%" r="72%">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.55" stopColor={tint[0]} />
            <Stop offset="1" stopColor={tint[1]} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={size / 2} cy={size * 0.94} rx={size * 0.32} ry={size * 0.05} fill="#1D2347" opacity={0.13} />
        <Circle cx={size / 2} cy={size / 2 - 2} r={size / 2 - 4} fill={`url(#${id}m)`} stroke="#FFFFFF" strokeWidth={3} />
        <Ellipse cx={size * 0.4} cy={size * 0.24} rx={size * 0.17} ry={size * 0.07} fill="#FFFFFF" opacity={0.65} />
      </Svg>
      <Text style={{ fontSize: size * 0.48, lineHeight: size * 0.64, marginTop: -3, textAlign: 'center' }}>{emoji ?? '✨'}</Text>
    </View>
  );
}

const BACKS = {
  indigo: { top: '#3A4BA8', bottom: '#1B2462', edge: '#121842', line: '#FFC83D' },
  laca: { top: '#D94A43', bottom: '#8E1F24', edge: '#5E1216', line: '#FFD166' },
};

/** Dorso de carta con motivo Lanna dorado. */
export function LannaBack({ radius = 22, tint = 'indigo' }: { radius?: number; tint?: keyof typeof BACKS }) {
  const id = idOf(useId());
  const c = BACKS[tint];
  return (
    <View style={[styles.cardEdge, { borderRadius: radius, backgroundColor: c.edge }]}>
      <View style={{ flex: 1, borderRadius: radius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor={c.top} />
              <Stop offset="1" stopColor={c.bottom} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}b)`} />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { margin: 7, borderRadius: radius - 6, borderWidth: 2, borderColor: c.line, opacity: 0.75 }]} />
        <View style={[StyleSheet.absoluteFill, { margin: 12, borderRadius: radius - 9, borderWidth: 1, borderColor: c.line, opacity: 0.4 }]} />
        <View>
          <Svg width={64} height={64} viewBox="0 0 64 64">
            <G opacity={0.95}>
              <Path d="M32 6 L39 25 L58 32 L39 39 L32 58 L25 39 L6 32 L25 25 Z" fill={c.line} />
              <Path d="M32 16 L36 28 L48 32 L36 36 L32 48 L28 36 L16 32 L28 28 Z" fill={c.bottom} />
              <Circle cx={32} cy={32} r={5} fill={c.line} />
              <Circle cx={32} cy={4} r={2} fill={c.line} />
              <Circle cx={32} cy={60} r={2} fill={c.line} />
              <Circle cx={4} cy={32} r={2} fill={c.line} />
              <Circle cx={60} cy={32} r={2} fill={c.line} />
            </G>
          </Svg>
        </View>
        <View style={[styles.cardShine, { borderRadius: radius, opacity: 0.25 }]} />
      </View>
    </View>
  );
}

/** Insignia redonda de acierto o fallo en la esquina de una carta. */
export function Badge({ ok }: { ok: boolean }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(9)} style={[styles.badge, { backgroundColor: ok ? color.arrozalVivo : color.farol }]}>
      <Icon name={ok ? 'check' : 'x'} size={18} color="#FFFFFF" stroke={3.4} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  orbEdge: { flex: 1, paddingBottom: 6, shadowColor: '#0B1E5C', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#1D2347',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pillDark: { backgroundColor: 'rgba(20,25,54,0.6)', borderColor: 'rgba(255,255,255,0.25)' },
  pillText: { fontFamily: font.uiHeavy, fontSize: 14, color: color.cieloHondo },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  glass: {
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassDark: { backgroundColor: 'rgba(14,17,40,0.5)', borderColor: 'rgba(255,255,255,0.18)' },
  dots: { flexDirection: 'row', gap: 5, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotNow: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: color.cielo },
  points: { flexDirection: 'row', gap: 5, paddingHorizontal: 12 },
  pointsText: { fontFamily: font.displayBold, fontSize: 18, color: color.tinta },
  fuseTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(29,35,71,0.1)', overflow: 'hidden' },
  fuseFill: { height: '100%', borderRadius: 3 },
  tag: { alignSelf: 'center', paddingHorizontal: 12, height: 26, borderRadius: 13, justifyContent: 'center' },
  tagText: { fontFamily: font.uiHeavy, fontSize: 12.5, letterSpacing: 0.3 },
  btnEdge: { flex: 1, borderRadius: 20, paddingBottom: 5, shadowColor: '#1D2347', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  btnFace: { flex: 1, borderRadius: 20, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  btnShine: { position: 'absolute', left: 14, right: 14, top: 5, height: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.28)' },
  btnText: { fontFamily: font.displayBold, fontSize: 20, letterSpacing: 0.2 },
  cardEdge: { flex: 1, paddingBottom: 6, shadowColor: '#1D2347', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  cardShine: { position: 'absolute', left: 8, right: 8, top: 4, height: '28%', backgroundColor: 'rgba(255,255,255,0.45)' },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#1D2347',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
