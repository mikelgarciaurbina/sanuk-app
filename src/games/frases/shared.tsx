// Piezas comunes de los juegos de frases (Puente de bambú, La palabra perdida, Cestas del mercado y Noi dice):
// diccionario thai → palabra, glosas cortas, medidas en pantalla, temporizadores que se limpian solos,
// la barra de arriba (ronda, racha y puntos) y una barra que se vacía con el tiempo.
import { useEffect, useRef, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import { WORDS } from '@/content';
import type { Word } from '@/content/types';

import { Pop } from '../fx';
import { ComboBadge } from '../kit';

export type ViewRef = ComponentRef<typeof View>;
export type Box = { x: number; y: number; w: number; h: number };

/** Palabra del temario a partir de su escritura thai (la primera que aparece). */
export const WORD_BY_TH: ReadonlyMap<string, Word> = (() => {
  const m = new Map<string, Word>();
  for (const w of Object.values(WORDS)) if (!m.has(w.th)) m.set(w.th, w);
  return m;
})();

/** Traducción corta: «partícula amable (habla un hombre)» → «partícula amable»; «ya; y luego» → «ya». */
export function shortEs(es: string): string {
  const s = es.split(/[;(]/)[0].replace(/…/g, '').trim();
  return s || es.trim();
}

export const glossOf = (th: string) => {
  const w = WORD_BY_TH.get(th);
  return w ? shortEs(w.es) : undefined;
};

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Caja de un elemento en la pantalla (para lanzar cosas de un sitio a otro). */
export function measureBox(ref: RefObject<ViewRef | null>): Promise<Box | null> {
  return new Promise((resolve) => {
    const v = ref.current;
    if (!v) {
      resolve(null);
      return;
    }
    v.measureInWindow((x, y, w, h) => resolve({ x, y, w, h }));
  });
}

/** `later(fn, ms)`: un setTimeout que se cancela solo si el juego se desmonta. */
export function useLater() {
  const ids = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const list = ids.current;
    return () => {
      list.forEach(clearTimeout);
      list.length = 0;
    };
  }, []);
  return (fn: () => void, ms: number) => {
    ids.current.push(setTimeout(fn, ms));
  };
}

/** Caracteres thai que no ocupan ancho (vocales de arriba y abajo, marcas de tono). */
const MARK = /[ัิ-ฺ็-๎]/g;
/** Ancho aproximado de un texto thai a un tamaño de letra (para repartir fichas sin medir). */
export const thaiWidth = (th: string, size: number) => th.replace(MARK, '').length * size * 0.6;

const STAR = 'M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z';

/** Barra de arriba: ronda, racha (llama) y puntos. */
export function GameHud({ label, i, n, points, combo, dark, children }: { label: string; i: number; n: number; points?: number; combo: number; dark?: boolean; children?: ReactNode }) {
  return (
    <View style={styles.hud}>
      <View style={[styles.pill, dark ? styles.pillDark : null]}>
        <Text style={[styles.pillLabel, dark ? { color: '#D9DEF7' } : null]}>{label}</Text>
        <Text style={[styles.pillNum, dark ? { color: '#FFFFFF' } : null]}>
          {Math.min(i, n)}
          <Text style={[styles.pillOf, dark ? { color: '#AEB6DD' } : null]}>/{n}</Text>
        </Text>
      </View>
      {children}
      <View style={{ flex: 1 }} />
      <ComboBadge combo={combo} />
      {points !== undefined ? (
        <Pop trigger={points}>
          <View style={[styles.pill, styles.score, dark ? styles.pillDark : null]}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d={STAR} fill={color.buatong} stroke={color.buatongHondo} strokeWidth={1.4} />
            </Svg>
            <Text style={[styles.pillNum, dark ? { color: '#FFFFFF' } : null]}>{points}</Text>
          </View>
        </Pop>
      ) : null}
    </View>
  );
}

/** Barra que se vacía (0–1, un valor de Reanimated): verde → amarillo → rojo. */
export function DrainBar({ value, dark, height = 8 }: { value: SharedValue<number>; dark?: boolean; height?: number }) {
  const fill = useAnimatedStyle(() => {
    const v = Math.max(0, Math.min(1, value.value));
    return { width: `${v * 100}%`, backgroundColor: interpolateColor(v, [0, 0.35, 0.7, 1], ['#FF5A3D', '#FFB02E', '#9ED43D', '#2DBE78']) };
  });
  return (
    <View style={[styles.track, { height, borderRadius: height, backgroundColor: dark ? 'rgba(255,255,255,0.16)' : 'rgba(29,35,71,0.10)' }]}>
      <Animated.View style={[{ height: '100%', borderRadius: height }, fill]}>
        <View style={[styles.trackShine, { top: height * 0.2, height: Math.max(1.5, height * 0.28) }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 4, minHeight: 46 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#1D2347',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  pillDark: { backgroundColor: 'rgba(20,16,40,0.55)', borderColor: 'rgba(255,255,255,0.18)' },
  pillLabel: { fontFamily: font.uiHeavy, fontSize: 12, letterSpacing: 0.4, color: color.tinta3 },
  pillNum: { fontFamily: font.displayBold, fontSize: 18, color: color.tinta },
  pillOf: { fontFamily: font.display, fontSize: 14, color: color.tinta3 },
  score: { paddingLeft: 9 },
  track: { flex: 1, overflow: 'hidden' },
  trackShine: { position: 'absolute', left: 4, right: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
});
