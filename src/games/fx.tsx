// Efectos para que los juegos se sientan vivos: partículas, textos que flotan, banners, ondas, destellos y
// sacudidas (useJuice), y piezas animadas reutilizables: saltito al cambiar (Pop), flotar (Floaty),
// inclinación 3D al pulsar (Press3D), carta que se voltea (Flip3D), halo (Glow), barrido de luz (Shine)
// y cuenta atrás (Countdown). Todo con Reanimated, sin dependencias nuevas, en iOS, Android y web.
import { createContext, useContext, useEffect, useEffectEvent, useId, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityRole, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { color, font, motion } from '@/brand/tokens';
import { fx as sound } from '@/lib/audio';

// ——— Marco del juego ———

/** Cuánto se extiende el fondo del juego por detrás de la cabecera (`top`) y de la barra inferior (`bottom`).
 *  Lo ponen las pantallas que alojan los juegos. */
export const GameFrame = createContext({ top: 0, bottom: 0 });
export const useGameFrame = () => useContext(GameFrame);

// ——— Puntos de la pantalla ———

export type Point = { x: number; y: number };
type ViewRef = ComponentRef<typeof View>;

/** Punto de la pantalla donde se ha tocado (para lanzar un efecto justo ahí). */
export const tapPoint = (e: GestureResponderEvent): Point => ({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });

/** Centro de un elemento en la pantalla. */
export function centerOf(ref: RefObject<ViewRef | null>, cb: (p: Point) => void) {
  ref.current?.measureInWindow((x, y, w, h) => cb({ x: x + w / 2, y: y + h / 2 }));
}

// ——— useJuice: efectos de un momento ———

export type BurstKind = 'estrellas' | 'confeti' | 'petalos' | 'monedas' | 'gotas' | 'chispas' | 'corazones' | 'hojas';

type Effect =
  | { id: number; kind: 'burst'; at?: Point; type: BurstKind; n: number; power: number }
  | { id: number; kind: 'float'; at?: Point; text: string; tint: string; size: number }
  | { id: number; kind: 'banner'; text: string; sub?: string; tint: string }
  | { id: number; kind: 'ring'; at?: Point; tint: string; size: number }
  | { id: number; kind: 'flash'; tint: string };
type NewEffect = Effect extends infer E ? (E extends Effect ? Omit<E, 'id'> : never) : never;

const LIFE = { burst: 1200, float: 1000, banner: 1300, ring: 600, flash: 420 } as const;

/**
 * Efectos de un momento sobre el juego. Pon `juice.layer` como último hijo del contenedor del juego
 * y, si quieres sacudidas, `juice.shakeStyle` en un Animated.View que envuelva el tablero.
 * Las posiciones son puntos de la pantalla: `tapPoint(e)` o `centerOf(ref, …)`; sin punto, el centro.
 */
export function useJuice() {
  const [effects, setEffects] = useState<Effect[]>([]);
  const [origin, setOrigin] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const seq = useRef(0);
  const layerRef = useRef<ViewRef>(null);
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const measure = () => layerRef.current?.measureInWindow((x, y, w, h) => setOrigin((o) => (o.x === x && o.y === y && o.w === w && o.h === h ? o : { x, y, w, h })));
  const add = (e: NewEffect) => {
    seq.current += 1;
    const id = seq.current;
    measure();
    setEffects((list) => [...list.slice(-16), { ...e, id } as Effect]);
    setTimeout(() => setEffects((list) => list.filter((x) => x.id !== id)), LIFE[e.kind]);
  };

  return {
    /** Explosión de partículas (estrellas, confeti, pétalos, monedas, gotas, chispas, corazones, hojas). */
    burst: (at?: Point, type: BurstKind = 'estrellas', n = 16, power = 120) => add({ kind: 'burst', at, type, n, power }),
    /** Texto que sube y se desvanece: «+3», «¡Perfecto!»… */
    float: (at: Point | undefined, text: string, tint: string = color.azafranHondo, size = 30) => add({ kind: 'float', at, text, tint, size }),
    /** Gran letrero en el centro: «¡Combo ×5!», «¡Nivel 2!», «¡Más rápido!». */
    banner: (text: string, sub?: string, tint: string = color.farol) => add({ kind: 'banner', text, sub, tint }),
    /** Onda que se expande desde un punto. */
    ring: (at?: Point, tint: string = color.buatong, size = 90) => add({ kind: 'ring', at, tint, size }),
    /** Destello suave de toda la pantalla. */
    flash: (tint = '#FFFFFF') => add({ kind: 'flash', tint }),
    /** Sacudida del tablero (en un error, un golpe…). Necesita `shakeStyle`. */
    shake: (strength = 9) => {
      shakeX.set(
        withSequence(
        withTiming(-strength, { duration: 45 }),
        withTiming(strength, { duration: 70 }),
        withTiming(-strength * 0.6, { duration: 60 }),
        withTiming(strength * 0.35, { duration: 55 }),
        withTiming(0, { duration: 50 }),
        ),
      );
    },
    /** Acierto completo: estrellas, onda y texto. */
    celebrate: (at?: Point, text = '+1', type: BurstKind = 'estrellas') => {
      add({ kind: 'ring', at, tint: color.buatong, size: 96 });
      add({ kind: 'burst', at, type, n: 18, power: 130 });
      add({ kind: 'float', at, text, tint: color.arrozalHondo, size: 30 });
    },
    shakeStyle,
    layer: <FxLayer layerRef={layerRef} effects={effects} origin={origin} onLayout={measure} />,
  };
}

export type Juice = ReturnType<typeof useJuice>;

function FxLayer({ layerRef, effects, origin, onLayout }: { layerRef: RefObject<ViewRef | null>; effects: Effect[]; origin: { x: number; y: number; w: number; h: number }; onLayout: () => void }) {
  const local = (p?: Point) => (p ? { x: p.x - origin.x, y: p.y - origin.y } : { x: origin.w / 2, y: origin.h * 0.42 });
  return (
    <View ref={layerRef} pointerEvents="none" style={styles.layer} onLayout={onLayout}>
      {effects.map((e) => {
        if (e.kind === 'flash') return <Flash key={e.id} tint={e.tint} />;
        if (e.kind === 'banner') return <Banner key={e.id} text={e.text} sub={e.sub} tint={e.tint} />;
        const p = local(e.at);
        if (e.kind === 'burst') return <Burst key={e.id} x={p.x} y={p.y} type={e.type} n={e.n} power={e.power} />;
        if (e.kind === 'float') return <FloatText key={e.id} x={p.x} y={p.y} text={e.text} tint={e.tint} size={e.size} />;
        return <Ring key={e.id} x={p.x} y={p.y} tint={e.tint} size={e.size} />;
      })}
    </View>
  );
}

// ——— Partículas ———

const PALETTE: Record<BurstKind, string[]> = {
  estrellas: [color.buatong, '#FFE48A', color.azafran, '#FFFFFF', '#FFD166'],
  confeti: [color.farol, color.buatong, color.cielo, color.arrozalVivo, '#B26BFF', '#FF7FB0'],
  petalos: ['#FFFFFF', '#FFF4D6', '#FFD7E6', '#FFE9A8'],
  monedas: [color.buatong],
  gotas: ['#7FB6FF', '#A9D1FF', '#5A9BFF', '#CFE6FF'],
  chispas: ['#FFF2A8', color.buatong, color.farol, '#FFFFFF'],
  corazones: ['#FF5D8F', '#FF8FB1', color.farol, '#FFB3C7'],
  hojas: ['#7BC67E', '#4FA36A', '#A6D96A', '#C9E59A'],
};
const SIZE: Record<BurstKind, number> = { estrellas: 18, confeti: 12, petalos: 16, monedas: 18, gotas: 14, chispas: 8, corazones: 18, hojas: 16 };
const GRAVITY: Record<BurstKind, number> = { estrellas: 0.8, confeti: 1, petalos: 0.4, monedas: 1.6, gotas: 1.5, chispas: 0.5, corazones: 0.3, hojas: 0.45 };
const DURATION: Record<BurstKind, number> = { estrellas: 900, confeti: 1150, petalos: 1150, monedas: 950, gotas: 800, chispas: 600, corazones: 1100, hojas: 1150 };

type Spec = { dx: number; dy: number; g: number; rot: number; flutter: number; size: number; tint: string; alt: boolean };

function makeSpecs(type: BurstKind, n: number, power: number): Spec[] {
  const palette = PALETTE[type];
  const lift = type === 'chispas' || type === 'corazones' ? 0.55 : 0.3;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    const v = power * (0.45 + Math.random() * 0.75);
    return {
      dx: Math.cos(a) * v,
      dy: Math.sin(a) * v - power * lift,
      g: power * GRAVITY[type],
      rot: (Math.random() - 0.5) * 720,
      flutter: 1 + Math.random() * 3,
      size: SIZE[type] * (0.65 + Math.random() * 0.8),
      tint: palette[i % palette.length],
      alt: i % 2 === 0,
    };
  });
}

function Burst({ x, y, type, n, power }: { x: number; y: number; type: BurstKind; n: number; power: number }) {
  const [specs] = useState(() => makeSpecs(type, n, power));
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: DURATION[type], easing: Easing.linear });
  }, [p, type]);
  if (reduced) return null;
  return (
    <View style={{ position: 'absolute', left: x, top: y }}>
      {specs.map((s, i) => (
        <Particle key={i} p={p} s={s} type={type} />
      ))}
    </View>
  );
}

function Particle({ p, s, type }: { p: SharedValue<number>; s: Spec; type: BurstKind }) {
  const st = useAnimatedStyle(() => {
    const t = p.value;
    const e = 1 - (1 - t) * (1 - t);
    const appear = Math.min(1, t / 0.08);
    const fade = t > 0.62 ? Math.max(0, (1 - t) / 0.38) : 1;
    const flip = type === 'confeti' || type === 'petalos' || type === 'hojas' ? Math.cos(t * Math.PI * 2 * s.flutter) : 1;
    return {
      opacity: appear * fade,
      transform: [
        { translateX: s.dx * e },
        { translateY: s.dy * e + s.g * t * t },
        { rotate: `${s.rot * t}deg` },
        { scaleX: flip },
        { scale: (0.4 + 0.6 * appear) * (1 - 0.3 * t) },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: -s.size / 2, top: -s.size / 2, width: s.size, height: s.size, alignItems: 'center', justifyContent: 'center' }, st]}>
      <Shape type={type} size={s.size} tint={s.tint} alt={s.alt} />
    </Animated.View>
  );
}

const STAR5 = 'M12 1.8l2.9 6.4 7 .7-5.3 4.7 1.6 6.9L12 17l-6.2 3.5 1.6-6.9L2.1 8.9l7-.7z';
const STAR4 = 'M12 0 14.6 9.4 24 12 14.6 14.6 12 24 9.4 14.6 0 12 9.4 9.4Z';
const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z';
const DROP = 'M12 1.5S4.5 10.4 4.5 15a7.5 7.5 0 0 0 15 0c0-4.6-7.5-13.5-7.5-13.5z';
const PETAL = 'M12 1.5c4.2 3.6 5.7 8.2 4.1 12.8-1 3-2.7 5.1-4.1 7.8-1.4-2.7-3.1-4.8-4.1-7.8C6.3 9.7 7.8 5.1 12 1.5z';
const LEAF = 'M3 21C3 9.5 9.5 3.5 21 3c-.5 11.5-6.5 18-18 18z';

function Shape({ type, size, tint, alt }: { type: BurstKind; size: number; tint: string; alt: boolean }) {
  if (type === 'confeti') return <View style={{ width: size * 0.55, height: size, borderRadius: 2, backgroundColor: tint }} />;
  if (type === 'chispas') return <View style={{ width: size, height: size, borderRadius: size, backgroundColor: tint, shadowColor: tint, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />;
  if (type === 'monedas')
    return (
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color.buatong, borderWidth: 2, borderColor: color.buatongHondo, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size, borderWidth: 1.5, borderColor: '#FFE9A8' }} />
      </View>
    );
  const d = type === 'estrellas' ? (alt ? STAR4 : STAR5) : type === 'corazones' ? HEART : type === 'gotas' ? DROP : type === 'hojas' ? LEAF : PETAL;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} fill={tint} />
      {type === 'gotas' || type === 'corazones' ? <Path d="M9 9.5c.8-1.6 1.9-2.6 2.6-3.2" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={2} strokeLinecap="round" fill="none" /> : null}
    </Svg>
  );
}

function FloatText({ x, y, text, tint, size }: { x: number; y: number; text: string; tint: string; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: LIFE.float - 40, easing: Easing.out(Easing.cubic) });
  }, [p]);
  const st = useAnimatedStyle(() => {
    const v = p.value;
    const pop = v < 0.14 ? 0.5 + (v / 0.14) * 0.75 : 1.25 - Math.min(0.25, (v - 0.14) * 0.9);
    return { opacity: v < 0.7 ? 1 : (1 - v) / 0.3, transform: [{ translateY: -80 * v }, { scale: pop }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 140, top: y - size, width: 280, alignItems: 'center' }, st]}>
      <Text style={[styles.float, { color: tint, fontSize: size }]}>{text}</Text>
    </Animated.View>
  );
}

function Banner({ text, sub, tint }: { text: string; sub?: string; tint: string }) {
  const enter = useSharedValue(0);
  const leave = useSharedValue(0);
  useEffect(() => {
    enter.value = withSpring(1, { damping: 9, stiffness: 170 });
    leave.value = withDelay(820, withTiming(1, { duration: 300, easing: Easing.in(Easing.quad) }));
  }, [enter, leave]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.value * 2) * (1 - leave.value),
    transform: [{ scale: 0.35 + 0.65 * enter.value + leave.value * 0.3 }, { rotate: `${-7 * (1 - enter.value)}deg` }],
  }));
  return (
    <View style={styles.center} pointerEvents="none">
      <Animated.View style={[styles.banner, { borderColor: tint, shadowColor: tint }, st]}>
        <Text style={[styles.bannerText, { color: tint }]}>{text}</Text>
        {sub ? <Text style={styles.bannerSub}>{sub}</Text> : null}
      </Animated.View>
    </View>
  );
}

function Ring({ x, y, tint, size }: { x: number; y: number; tint: string; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: LIFE.ring - 40, easing: Easing.out(Easing.cubic) });
  }, [p]);
  const st = useAnimatedStyle(() => ({ opacity: 1 - p.value, borderWidth: 6 * (1 - p.value) + 1, transform: [{ scale: 0.2 + 1.9 * p.value }] }));
  return <Animated.View style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size, borderColor: tint }, st]} />;
}

function Flash({ tint }: { tint: string }) {
  const p = useSharedValue(0.5);
  useEffect(() => {
    p.value = withTiming(0, { duration: LIFE.flash - 40, easing: Easing.out(Easing.quad) });
  }, [p]);
  const st = useAnimatedStyle(() => ({ opacity: p.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: tint }, st]} />;
}

// ——— Piezas animadas ———

/** Da un saltito cada vez que cambia `trigger` (para marcadores, fichas acertadas, monedas…). */
export function Pop({ trigger, children, style, scale = 1.25 }: { trigger: unknown; children: ReactNode; style?: StyleProp<ViewStyle>; scale?: number }) {
  const s = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    s.value = withSequence(withTiming(scale, { duration: 90 }), withSpring(1, motion.boing));
  }, [trigger, s, scale]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

/** Flota arriba y abajo (y se balancea si `rotate`) sin parar: farolillos, gotas, nubes, cartas en espera. */
export function Floaty({ children, amp = 6, ms = 2600, delay = 0, rotate = 0, style }: { children: ReactNode; amp?: number; ms?: number; delay?: number; rotate?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0.5);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced, t, ms, delay]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: (t.value - 0.5) * 2 * amp }, { rotate: `${(t.value - 0.5) * 2 * rotate}deg` }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

/** Botón que se inclina en 3D hacia donde lo tocas y rebota al soltar. `onPress` recibe el evento (para `tapPoint`). */
export function Press3D({
  onPress,
  children,
  style,
  disabled,
  depth = 12,
  accessibilityLabel,
  accessibilityRole = 'button',
}: {
  onPress?: (e: GestureResponderEvent) => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  depth?: number;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}) {
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const sc = useSharedValue(1);
  const size = useRef({ w: 1, h: 1 });
  const st = useAnimatedStyle(() => ({ transform: [{ perspective: 700 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }, { scale: sc.value }] }));
  return (
    <Animated.View style={[style, st]}>
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        style={{ flex: 1 }}
        onLayout={(e) => {
          size.current = { w: Math.max(1, e.nativeEvent.layout.width), h: Math.max(1, e.nativeEvent.layout.height) };
        }}
        onPressIn={(e) => {
          const { w, h } = size.current;
          ry.set(withTiming((e.nativeEvent.locationX / w - 0.5) * depth * 1.4, { duration: 80 }));
          rx.set(withTiming(-(e.nativeEvent.locationY / h - 0.5) * depth, { duration: 80 }));
          sc.set(withTiming(0.95, { duration: 80 }));
        }}
        onPressOut={() => {
          rx.set(withSpring(0, motion.boing));
          ry.set(withSpring(0, motion.boing));
          sc.set(withSpring(1, motion.boing));
        }}
        onPress={onPress}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Carta que se voltea en 3D. Las dos caras ocupan todo el contenedor (dale tamaño con `style`). */
export function Flip3D({ flipped, front, back, style, duration = 460 }: { flipped: boolean; front: ReactNode; back: ReactNode; style?: StyleProp<ViewStyle>; duration?: number }) {
  const r = useSharedValue(flipped ? 180 : 0);
  useEffect(() => {
    r.value = withTiming(flipped ? 180 : 0, { duration, easing: Easing.out(Easing.back(1.3)) });
  }, [flipped, r, duration]);
  const a = useAnimatedStyle(() => ({ opacity: r.value < 90 ? 1 : 0, transform: [{ perspective: 900 }, { rotateY: `${r.value}deg` }] }));
  const b = useAnimatedStyle(() => ({ opacity: r.value >= 90 ? 1 : 0, transform: [{ perspective: 900 }, { rotateY: `${r.value - 180}deg` }] }));
  // la cara oculta no recibe toques (si no, la de encima se los tragaría a la visible)
  return (
    <View style={style}>
      <Animated.View pointerEvents={flipped ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, a]}>
        {front}
      </Animated.View>
      <Animated.View pointerEvents={flipped ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, b]}>
        {back}
      </Animated.View>
    </View>
  );
}

/** Halo de luz que late detrás de algo (el objetivo, lo elegido, un premio). Ponlo en posición absoluta. */
export function Glow({ size = 160, tint = color.buatong, strength = 0.75, pulse = true, style }: { size?: number; tint?: string; strength?: number; pulse?: boolean; style?: StyleProp<ViewStyle> }) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!pulse || reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [pulse, reduced, t]);
  const st = useAnimatedStyle(() => ({ opacity: 0.75 + 0.25 * t.value, transform: [{ scale: 0.92 + 0.12 * t.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ width: size, height: size }, style, st]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tint} stopOpacity={strength} />
            <Stop offset="0.45" stopColor={tint} stopOpacity={strength * 0.45} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Barrido de luz sobre un elemento cada vez que cambia `trigger`. Ponlo dentro de un contenedor con `overflow: 'hidden'`. */
export function Shine({ trigger }: { trigger: unknown }) {
  const id = `shine${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [w, setW] = useState(0);
  const x = useSharedValue(-1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    x.value = -1;
    x.value = withTiming(1.4, { duration: 650, easing: Easing.inOut(Easing.quad) });
  }, [trigger, x]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * w }, { skewX: '-20deg' }] }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Animated.View style={[{ position: 'absolute', top: -20, bottom: -20, left: 0, width: Math.max(40, w * 0.45) }, st]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.7} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Cuenta atrás 3 · 2 · 1 · ¡Ya! a pantalla completa, con tic y gong. Llama a `onDone` al terminar. */
export function Countdown({ onDone, from = 3, go = '¡Ya!', dark }: { onDone: () => void; from?: number; go?: string; dark?: boolean }) {
  const [n, setN] = useState(from);
  // si el juego vuelve a pintarse con otro `onDone`, la cuenta atrás no se reinicia
  const finish = useEffectEvent(() => onDone());
  useEffect(() => {
    if (n > 0) sound.tick();
    else sound.go();
    const t = setTimeout(() => (n > 0 ? setN(n - 1) : finish()), n > 0 ? 720 : 560);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: dark ? 'rgba(14,17,36,0.55)' : 'rgba(243,246,250,0.55)' }]}>
      <CountNumber key={n} label={n > 0 ? String(n) : go} big={n > 0} />
    </View>
  );
}

function CountNumber({ label, big }: { label: string; big: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withSpring(1, { damping: 8, stiffness: 190 });
  }, [p]);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 1.5), transform: [{ scale: 0.3 + 0.7 * p.value }, { rotate: `${(1 - p.value) * -12}deg` }] }));
  return (
    <Animated.View style={st}>
      <Text style={[styles.count, { fontSize: big ? 120 : 76, color: big ? color.farol : color.arrozal }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 999, elevation: 999 },
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  // sombra oscura corta: se lee igual sobre escenarios claros y oscuros sin apagar los colores
  float: { fontFamily: font.displayBold, textAlign: 'center', textShadowColor: 'rgba(29,35,71,0.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  banner: {
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 4,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  bannerText: { fontFamily: font.displayBold, fontSize: 38, textAlign: 'center' },
  bannerSub: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta2, marginTop: 2, textAlign: 'center' },
  count: { fontFamily: font.displayBold, textAlign: 'center', textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18 },
});
