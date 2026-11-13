// Qué se pregunta en cada curva de «1.864 curvas»: las parejas que solo cambian de tono (para las curvas de
// tono de la feria) y el orden de una lección, en la que cada palabra pasa dos veces: primero se reconoce y
// después se recuerda o se pesca de oído.
import { MINIMAL_SETS } from '@/content/drills';
import type { Word } from '@/content/types';
import { shuffle } from '@/lib/random';

/** es: «¿cuál es…?» (español → thai) · oido: solo audio → thai · th: thai → español. */
export type Ask = 'es' | 'oido' | 'th';

/** Una curva por tomar. `first`: primera vez que se ve la palabra (reconocer con todo el apoyo; aún no cuenta para
 *  el repaso espaciado) · `rival`: la otra señal, cuando tiene que ser una concreta (su pareja de tono) · `tone`:
 *  curva de tono · `any`: la forma de preguntar (`ask`) se sortea al llegar a la curva. */
export type Item = { word: Word; ask: Ask; first?: boolean; rival?: Word; tone?: boolean; any?: boolean };

/** Lo corto de una traducción: «tío/a (hermano menor de mamá)» → «tío/a». */
export const shortEs = (es: string) => es.split(/[;(]/)[0].trim();

/** La transcripción sin las tildes de tono: dos palabras que coinciden aquí solo se distinguen por el tono. */
export const toneless = (rom: string) => rom.normalize('NFD').replace(/[\u0300\u0301\u0302\u030C]/g, '').normalize('NFC');

/**
 * Parejas de palabras YA presentadas que solo cambian de tono: las de los pares mínimos del temario (tigre/camisa,
 * cerca/lejos…) y cualesquiera dos palabras con la misma transcripción salvo las tildes.
 */
export function tonePairs(pool: Word[]): [Word, Word][] {
  const byTh = new Map(pool.map((w) => [w.th, w]));
  const out: [Word, Word][] = [];
  const seen = new Set<string>();
  const add = (a: Word, b: Word) => {
    if (a.th === b.th || a.rom === b.rom || shortEs(a.es) === shortEs(b.es)) return;
    const key = [a.th, b.th].sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);
    out.push([a, b]);
  };
  for (const set of MINIMAL_SETS) {
    const ws = set.items.map((it) => byTh.get(it.th)).filter((w): w is Word => !!w);
    for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) add(ws[i], ws[j]);
  }
  const groups = new Map<string, Word[]>();
  for (const w of pool) {
    if (!w.rom || /[/…{(]/.test(w.rom + w.th)) continue;
    const k = toneless(w.rom);
    groups.set(k, [...(groups.get(k) ?? []), w]);
  }
  for (const g of groups.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) add(g[i], g[j]);
  return out;
}

/**
 * Las curvas de una lección: la mitad de `goal` palabras (las nuevas primero), cada una dos veces. Primera pasada:
 * thai → español, con transcripción y audio. Segunda, barajada: español → thai o solo de oído.
 */
export function lessonItems(focus: Word[], pool: Word[], goal: number): Item[] {
  const seen = new Set<string>();
  const words = [...shuffle(focus), ...shuffle(pool)].filter((w) => (seen.has(w.th) ? false : (seen.add(w.th), true))).slice(0, Math.max(1, Math.ceil(goal / 2)));
  const first: Item[] = words.map((word) => ({ word, ask: 'th', first: true }));
  const second: Item[] = shuffle(words).map((word, i) => ({ word, ask: i % 2 ? 'oido' : 'es' }));
  // que la última palabra de la primera pasada no sea la primera de la segunda
  if (second.length > 1 && second[0].word.th === first[first.length - 1].word.th) second.push(second.shift()!);
  return [...first, ...second];
}

/** La otra señal de una curva: su pareja de tono si la hay; si no, cualquier palabra con otra traducción. */
export function rivalOf(item: Item, pool: Word[]): { rival: Word; minimal: boolean } | null {
  if (item.rival) return { rival: item.rival, minimal: true };
  const target = item.word;
  const byTh = new Map(pool.map((w) => [w.th, w]));
  const set = MINIMAL_SETS.find((s) => s.items.some((it) => it.th === target.th));
  const partners = set ? set.items.map((it) => byTh.get(it.th)).filter((w): w is Word => !!w && w.th !== target.th && shortEs(w.es) !== shortEs(target.es)) : [];
  if (partners.length) return { rival: shuffle(partners)[0], minimal: true };
  const other = shuffle(pool.filter((w) => w.th !== target.th && shortEs(w.es) !== shortEs(target.es)))[0];
  return other ? { rival: other, minimal: false } : null;
}
