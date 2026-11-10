// Piezas comunes de los juegos de «Palabras» (Parejas, Memoria, Monzón, ¿Sí o บ่?, Farolillos):
// temporizadores que se limpian solos, selección de palabras sin traducciones repetidas y chapas del marcador.
import { useEffect, useId, useRef, type ComponentRef, type RefObject } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import type { Word } from '@/content/types';
import { shuffle } from '@/lib/random';

import { Pop, type Point } from '../fx';

type ViewRef = ComponentRef<typeof View>;

/** `later(fn, ms)`: setTimeout que se cancela solo si el juego se desmonta. */
export function useLater() {
  const list = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const l = list.current;
    return () => {
      l.forEach(clearTimeout);
      l.length = 0;
    };
  }, []);
  return (fn: () => void, ms: number) => {
    list.current.push(setTimeout(fn, ms));
  };
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
  mult: { height: 30, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  multText: { fontFamily: font.displayBold, fontSize: 17, color: '#FFFFFF' },
});
