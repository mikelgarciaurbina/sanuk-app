// Piezas comunes de los juegos de «Palabras» (Parejas, Memoria, Monzón, ¿Sí o บ่?, Farolillos):
// temporizadores que se limpian solos, selección de palabras sin traducciones repetidas, cuándo se enseña la
// transcripción, letra thai que cabe en su sitio, avisos que no tapan el tablero y chapas del marcador.
import { useEffect, useId, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import type { Word } from '@/content/types';
import { shuffle } from '@/lib/random';

import { Pop, type Point } from '../fx';

type ViewRef = ComponentRef<typeof View>;

/** `later(fn, ms)`: setTimeout que se cancela solo si el juego se desmonta. Devuelve cómo cancelarlo antes. */
export function useLater() {
  const list = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const l = list.current;
    return () => {
      l.forEach(clearTimeout);
      l.clear();
    };
  }, []);
  return (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      list.current.delete(t);
      fn();
    }, ms);
    list.current.add(t);
    return () => {
      clearTimeout(t);
      list.current.delete(t);
    };
  };
}

// ——— Transcripción y letra thai ———

/**
 * ¿Se enseña la transcripción? Mientras no se sabe leer (`reads` falso), siempre: sin ella la palabra no se puede
 * reconocer. Sabiendo leer se va quitando para que se lea de verdad: en la feria desde el nivel 2 y, en las
 * lecciones, en todo lo que es repaso (`review`: la palabra no es nueva de la lección o vuelve tras un fallo).
 */
export const romFor = (reads: boolean | undefined, o: { feria: boolean; level?: number; review?: boolean }) => !reads || (o.feria ? (o.level ?? 1) < 2 : !o.review);

/** Marcas thai que se dibujan encima o debajo de otra letra: no ocupan ancho. */
const TH_MARK = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;

/** Ancho aproximado, en em, de un texto thai en negrita (medido sobre Noto Sans Thai Looped Bold). */
export function thWidth(th: string): number {
  let w = 0;
  for (const ch of th) {
    if (TH_MARK.test(ch)) continue;
    w += 'เไโใะาำ '.includes(ch) ? 0.44 : 'รวงจ'.includes(ch) ? 0.57 : 'พฟฬ'.includes(ch) ? 0.75 : 'ญฌณฒ…'.includes(ch) ? 0.95 : 0.68;
  }
  return w;
}

/**
 * Tamaño de letra con el que un texto thai cabe en `width` px: en una línea si se puede con `min` o más y, si no,
 * en dos (el thai se parte solo entre palabras). Así ninguna palabra larga acaba en puntos suspensivos.
 */
export function fitTh(th: string, width: number, max: number, min = 11): { size: number; lines: 1 | 2 } {
  const em = thWidth(th) * 1.03;
  const one = Math.floor((width / em) * 2) / 2;
  if (one >= min) return { size: Math.min(max, one), lines: 1 };
  return { size: Math.max(min - 1.5, Math.min(max, Math.floor((width / (em * 0.62)) * 2) / 2)), lines: 2 };
}

const norm = (s: string) => s.trim().toLowerCase();

/** Quita repetidas: nunca dos palabras con la misma traducción ni la misma escritura thai. */
export function distinct(list: readonly Word[]): Word[] {
  const es = new Set<string>();
  const th = new Set<string>();
  return list.filter((w) => {
    const k = norm(w.es);
    if (es.has(k) || th.has(w.th)) return false;
    es.add(k);
    th.add(w.th);
    return true;
  });
}

/** ¿Chocan dos palabras (misma traducción o misma escritura)? */
export const clash = (a: Word, b: Word) => a.id !== b.id && (norm(a.es) === norm(b.es) || a.th === b.th);

/**
 * Elige `n` palabras sin repetir traducción: primero las que hay que repasar (`first`), luego las nuevas de la
 * lección (`focus`), luego las que aún no han salido en la partida (`used`) y, si faltan, cualquiera.
 */
export function pickWords(n: number, opts: { first?: readonly Word[]; focus?: readonly Word[]; pool: readonly Word[]; used?: ReadonlySet<string>; avoid?: readonly Word[] }): Word[] {
  const { first = [], focus = [], pool, used, avoid = [] } = opts;
  const fresh = pool.filter((w) => !used?.has(w.id));
  const stale = pool.filter((w) => used?.has(w.id));
  const out: Word[] = [];
  for (const w of [...first, ...shuffle(focus), ...shuffle(fresh), ...shuffle(stale)]) {
    if (out.length >= n) break;
    if (out.some((o) => o.id === w.id || clash(o, w))) continue;
    if (avoid.some((a) => a.id === w.id || clash(a, w))) continue;
    out.push(w);
  }
  return out;
}

/** Punto de la pantalla en una posición relativa (0–1) de un elemento. */
export function pointIn(ref: RefObject<ViewRef | null>, fx: number, fy: number, cb: (p: Point) => void) {
  ref.current?.measureInWindow((x, y, w, h) => cb({ x: x + w * fx, y: y + h * fy }));
}

/** Multiplicador de puntos según la racha: ×1, ×2 desde 3 seguidos, ×3 desde 6, ×4 desde 10. */
export const multFor = (combo: number) => (combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1);

// ——— Aviso que no tapa el tablero ———

export type Toast = { n: number; text: string; sub?: string; tint: string };

/**
 * Avisos cortos («¡Racha ×5!», «¡Paraguas extra!») que salen en una cinta pequeña y se van solos, para no tapar
 * el tablero mientras corre el reloj (el letrero grande de `juice.banner` se queda para las pausas).
 * Pon `<ToastRibbon toast={toast.now} />` donde deba verse y llama a `toast.show(…)`.
 */
export function useToast() {
  const [now, setNow] = useState<Toast | null>(null);
  const n = useRef(0);
  const show = (text: string, sub?: string, tint: string = color.farol) => {
    n.current += 1;
    setNow({ n: n.current, text, sub, tint });
  };
  return { now, show };
}

/** La cinta del aviso: entra con un saltito, se queda un segundo y se desvanece. No recibe toques. */
export function ToastRibbon({ toast, style }: { toast: Toast | null; style?: StyleProp<ViewStyle> }) {
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[styles.toastWrap, style]}>
      <ToastBody key={toast.n} toast={toast} />
    </View>
  );
}

function ToastBody({ toast }: { toast: Toast }) {
  const enter = useSharedValue(0);
  const leave = useSharedValue(0);
  useEffect(() => {
    enter.value = withSequence(withTiming(1.12, { duration: 140, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 9, stiffness: 220 }));
    leave.value = withDelay(1250, withTiming(1, { duration: 260, easing: Easing.in(Easing.quad) }));
  }, [enter, leave]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.value * 1.6) * (1 - leave.value),
    transform: [{ translateY: (1 - Math.min(1, enter.value)) * -14 - leave.value * 10 }, { scale: 0.6 + 0.4 * enter.value }],
  }));
  return (
    <Animated.View style={[styles.toast, { borderColor: toast.tint, shadowColor: toast.tint }, st]}>
      <Text style={[styles.toastText, { color: toast.tint }]} numberOfLines={1}>
        {toast.text}
      </Text>
      {toast.sub ? (
        <Text style={styles.toastSub} numberOfLines={1}>
          {toast.sub}
        </Text>
      ) : null}
    </Animated.View>
  );
}

// ——— Chapas del marcador ———

/** Moneda dorada con brillo. */
export function Coin({ size = 22 }: { size?: number }) {
  const id = `coin${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <RadialGradient id={id} cx="38%" cy="32%" r="70%">
          <Stop offset="0" stopColor="#FFF4BF" />
          <Stop offset="0.45" stopColor="#FFC83D" />
          <Stop offset="1" stopColor="#C98F00" />
        </RadialGradient>
      </Defs>
      <Circle cx={12} cy={12.6} r={10.4} fill="#9A6A00" />
      <Circle cx={12} cy={11.6} r={10.4} fill={`url(#${id})`} />
      <Circle cx={12} cy={11.6} r={6.6} fill="none" stroke="#E8A600" strokeWidth={1.6} />
      <Path d="M12 7.4l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z" fill="#FFF1B8" />
      <Ellipse cx={8.2} cy={6.6} rx={2.6} ry={1.4} fill="#FFFFFF" opacity={0.7} transform="rotate(-30 8.2 6.6)" />
    </Svg>
  );
}

/** Puntos de la partida, con moneda; da un saltito al cambiar. */
export function ScoreChip({ value, dark, style }: { value: number; dark?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Pop trigger={value} scale={1.18} style={[styles.chip, dark ? styles.chipDark : styles.chipLight, style]}>
      <Coin size={22} />
      <Text style={[styles.num, { color: dark ? '#FFF3D0' : color.tinta }]}>{value}</Text>
    </Pop>
  );
}

/** Multiplicador por racha (×2, ×3…). No ocupa sitio si es ×1. */
export function MultChip({ mult }: { mult: number }) {
  if (mult <= 1) return null;
  const tint = mult >= 4 ? '#7B4DFF' : mult >= 3 ? '#E63E8C' : color.farol;
  return (
    <Pop trigger={mult} scale={1.4} style={[styles.mult, { backgroundColor: tint, shadowColor: tint }]}>
      <Text style={styles.multText}>×{mult}</Text>
    </Pop>
  );
}

/** «Nivel 3» en una chapa. */
export function LevelChip({ level, dark, label = 'Nivel' }: { level: number; dark?: boolean; label?: string }) {
  return (
    <Pop trigger={level} scale={1.3} style={[styles.chip, dark ? styles.chipDark : styles.chipLight, { paddingHorizontal: 12 }]}>
      <Text style={[styles.small, { color: dark ? '#C9D0EE' : color.tinta3 }]}>{label}</Text>
      <Text style={[styles.num, { color: dark ? '#FFFFFF' : color.tinta }]}>{level}</Text>
    </Pop>
  );
}

/** Degradado lineal vertical listo para usar dentro de un <Svg>. */
export function VGrad({ id, stops }: { id: string; stops: [number, string, number?][] }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {stops.map(([o, c, op]) => (
          <Stop key={o} offset={o} stopColor={c} stopOpacity={op ?? 1} />
        ))}
      </LinearGradient>
    </Defs>
  );
}

export const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingLeft: 7, paddingRight: 12, borderRadius: 999, borderWidth: 2 },
  chipLight: { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(255,255,255,0.95)', shadowColor: '#1D2347', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  chipDark: { backgroundColor: 'rgba(14,17,40,0.55)', borderColor: 'rgba(255,255,255,0.16)' },
  num: { fontFamily: font.displayBold, fontSize: 19, lineHeight: 23 },
  small: { fontFamily: font.uiHeavy, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  toastWrap: { position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center', zIndex: 50, elevation: 50 },
  toast: { maxWidth: '92%', paddingHorizontal: 16, paddingVertical: 5, borderRadius: 18, borderWidth: 3, backgroundColor: '#FFFFFF', alignItems: 'center', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  toastText: { fontFamily: font.displayBold, fontSize: 20, lineHeight: 25, textAlign: 'center' },
  toastSub: { fontFamily: font.uiBold, fontSize: 12, lineHeight: 15, color: color.tinta2, textAlign: 'center' },
  mult: { height: 30, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  multText: { fontFamily: font.displayBold, fontSize: 17, color: '#FFFFFF' },
});
