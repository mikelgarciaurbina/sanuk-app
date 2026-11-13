// Familias de palabras que solo cambian de tono, para «¿Tigre o camisa?»: los pares escogidos a mano
// (MINIMAL_SETS, con sus títulos y los chistes de Yai) y, además, todos los que salen del vocabulario de quien
// aprende: palabras de una sílaba ya presentadas cuya transcripción es idéntica al quitar las tildes de tono
// (mismas consonantes, misma vocal y misma duración). Con el camino avanzado son decenas de familias en vez de
// trece. Aquí no hay nada de pantalla: solo qué palabras van juntas y cómo se reparten en una ronda.
import type { ToneId } from '@/brand/tokens';
import { formsOf, knownForms } from '@/content';
import { minimalSetsFor, type MiniWord } from '@/content/drills';
import type { Word } from '@/content/types';
import { shuffle } from '@/lib/random';
import { norm, stripTones, syllables, toneOfSyllable } from '@/lib/thai';

/** Una palabra de una familia: su tono, su sonido sin tono y, si es del palabrario, su id (para el repaso). */
export type Twin = MiniWord & { id?: string; tone: ToneId; key: string };

export type Family = {
  id: string;
  items: Twin[];
  /** si viene de los pares escogidos a mano: su título y su chiste, que nombran a `ths` */
  curated?: { title: string; joke?: string; ths: string[] };
};

/** Lo que cabe en una carta: la primera acepción («tío o tía (menor que mamá)» → «tío o tía»). */
export const shortEs = (es: string) => es.split(/[;,(]/)[0].trim();
const usable = (es: string) => /[a-záéíóúüñ]{2}/i.test(shortEs(es));
const tokens = (es: string) => norm(es).split(/[^a-zñ]+/).filter((t) => t.length > 1);
const keyOf = (rom: string) => stripTones(rom).toLowerCase();

/** «¿Tigre o camisa?» con las palabras de una ronda, en el orden de las cartas. */
export function titleOf(items: { es: string }[]): string {
  const names = items.map((w) => shortEs(w.es));
  const first = names[0].charAt(0).toUpperCase() + names[0].slice(1);
  return `¿${[first, ...names.slice(1, -1)].join(', ')} o ${names[names.length - 1]}?`;
}

/**
 * La palabra del palabrario que corresponde a una de un par escogido a mano: la misma forma thai y, si hay varias
 * (ไหม «seda» y ไหม «¿…?»), la que más se parece en el significado. Así น้า «tío/a» y เขา «montaña; él» también
 * cuentan para el repaso, aunque su traducción no esté escrita igual.
 */
export function wordFor(mini: MiniWord, vocab: Word[]): Word | undefined {
  let cands = vocab.filter((w) => w.th === mini.th);
  if (!cands.length) cands = vocab.filter((w) => formsOf(w).includes(mini.th));
  if (cands.length < 2) return cands[0];
  const want = tokens(mini.es);
  const first = tokens(shortEs(mini.es));
  const score = (w: Word) => {
    const have = tokens(w.es);
    return want.filter((t) => have.includes(t)).length + first.filter((t) => have.includes(t)).length;
  };
  return cands.map((w) => ({ w, s: score(w) })).sort((a, b) => b.s - a.s)[0].w;
}

const twinOfWord = (w: Word): Twin => ({ id: w.id, th: w.th, rom: w.rom, es: w.es, emoji: w.emoji, tone: toneOfSyllable(w.rom), key: keyOf(w.rom) });

/** Una palabra escogida a mano, con su id; si quien aprende la conoce con otro significado, se enseña el suyo. */
function twinOfMini(mini: MiniWord, vocab: Word[]): Twin {
  const w = wordFor(mini, vocab);
  const base: Twin = { ...mini, id: w?.id, tone: toneOfSyllable(mini.rom), key: keyOf(mini.rom) };
  if (!w || !usable(w.es)) return base;
  const first = tokens(shortEs(mini.es));
  const have = tokens(w.es);
  // «montaña; él» para quien solo ha aprendido เขา como «él, ella»: la carta dice lo que sabe
  return first.some((t) => have.includes(t)) ? base : { ...base, es: w.es, emoji: w.emoji ?? mini.emoji };
}

/** Palabras sueltas de una sílaba que caben en una carta (sin moldes, dobles formas ni partículas sin traducción). */
const single = (w: Word) => syllables(w.rom).length === 1 && !/[\s/…(){}ๆ]/.test(w.th) && !/[/{}]/.test(w.rom) && usable(w.es);

/**
 * Todas las familias con las que se puede jugar: las escogidas a mano (solo con palabras ya presentadas) y las
 * que salen del vocabulario. `vocab`: las palabras de la lección primero. Una familia puede tener dos palabras
 * con el mismo tono (ไม่ y ไหม้ suenan igual): en una ronda nunca salen juntas (ver `dealCards`).
 */
export function toneFamilies(vocab: Word[]): Family[] {
  const seen = new Set<string>();
  const words = vocab.filter((w) => !seen.has(w.id) && (seen.add(w.id), true));
  const families: Family[] = minimalSetsFor(knownForms(words)).map((s, k) => {
    const items = s.items.map((m) => twinOfMini(m, words));
    // si alguna carta dice otra cosa que el título escogido a mano («montaña» → «él»), el título se rehace (y sin chiste)
    const same = items.every((w, j) => w.es === s.items[j].es);
    return { id: `c${k}`, items, curated: { title: same ? s.title : titleOf(items), joke: same ? s.joke : undefined, ths: items.map((w) => w.th) } };
  });

  const groups = new Map<string, Twin[]>();
  for (const w of words) {
    if (!single(w)) continue;
    const t = twinOfWord(w);
    const g = groups.get(t.key) ?? [];
    // la misma forma dos veces (ไหม «seda» y ไหม «¿…?») suena igual: basta la primera
    if (!g.some((x) => x.th === t.th)) g.push(t);
    groups.set(t.key, g);
  }
  for (const [key, group] of groups) {
    if (new Set(group.map((w) => w.tone)).size < 2) continue;
    // si ya hay una familia escogida a mano con alguna de estas palabras, se amplía en vez de repetirla
    const home = families
      .filter((f) => f.curated)
      .map((f) => ({ f, n: group.filter((w) => f.items.some((x) => x.th === w.th)).length }))
      .sort((a, b) => b.n - a.n)[0];
    if (home && home.n > 0) {
      for (const w of group) if (!home.f.items.some((x) => x.th === w.th)) home.f.items.push(w);
    } else families.push({ id: key, items: group });
  }
  return families;
}

/** Cuántos tonos distintos tiene una familia: el máximo de cartas que puede poner en una ronda. */
export const tonesIn = (f: Family) => new Set(f.items.map((w) => w.tone)).size;

export type Deal = { items: Twin[]; target: number; title: string; joke?: string };

/**
 * Reparte una ronda de `size` cartas de una familia: una palabra por tono (nunca dos cartas con el mismo tono),
 * mejor las de la lección (`focus`, formas thai) y las que suenan exactamente igual que la que hay que encontrar.
 * `avoid`: la palabra que se buscó la vez anterior, para no repetirla si hay otra.
 */
export function dealCards(f: Family, size: number, focus: Set<string>, avoid?: string): Deal {
  const pool = shuffle(f.items);
  const fresh = pool.filter((w) => w.th !== avoid);
  const from = fresh.length ? fresh : pool;
  const starred = from.filter((w) => focus.has(w.th));
  const target = starred.length && Math.random() < 0.7 ? starred[0] : from[0];
  const curated = new Set(f.curated?.ths);
  // mejor las que suenan exactamente igual que la buena, las de la lección y las escogidas a mano
  const ranked = pool
    .filter((w) => w.tone !== target.tone)
    .map((w) => ({ w, r: (w.key === target.key ? 4 : 0) + (focus.has(w.th) ? 2 : 0) + (curated.has(w.th) ? 1 : 0) + Math.random() }))
    .sort((a, b) => b.r - a.r);
  const tonesSeen = new Set<ToneId>();
  const others = ranked.filter(({ w }) => !tonesSeen.has(w.tone) && (tonesSeen.add(w.tone), true)).slice(0, Math.max(1, size - 1)).map(({ w }) => w);
  const items = shuffle([target, ...others]);
  const shown = new Set(items.map((w) => w.th));
  const whole = !!f.curated && f.curated.ths.every((th) => shown.has(th));
  return {
    items,
    target: items.indexOf(target),
    // el título escogido a mano solo si salen justo sus palabras; el chiste, si salen todas las que nombra
    title: whole && items.length === f.curated!.ths.length ? f.curated!.title : titleOf(items),
    joke: whole ? f.curated!.joke : undefined,
  };
}

export type Pair = { items: [Twin, Twin]; same: boolean; cross: boolean };

/**
 * Dos sílabas para «¿Igual o distinto?». Sin `cross`, de la misma familia: la misma palabra dos veces (o dos que
 * suenan igual) o dos que solo cambian de tono. Con `cross`, de familias distintas: otra sílaba, ¿misma melodía?
 * Devuelve `undefined` si no hay con qué.
 */
export function dealPair(families: Family[], same: boolean, cross: boolean, avoid?: Family): Pair | undefined {
  const order = shuffle(families);
  const fams = [...order.filter((f) => f !== avoid), ...order.filter((f) => f === avoid)];
  if (cross) {
    const all = shuffle(fams.flatMap((f) => f.items));
    for (const a of all) {
      const b = all.find((w) => w.key !== a.key && w.th !== a.th && (w.tone === a.tone) === same);
      if (b) return { items: [a, b], same, cross: true };
    }
    return dealPair(families, same, false, avoid);
  }
  for (const f of fams) {
    const items = shuffle(f.items);
    if (same) {
      const a = items[0];
      // dos palabras distintas que suenan exactamente igual, si las hay; si no, la misma dos veces
      const twin = items.find((w) => w.th !== a.th && w.tone === a.tone && w.key === a.key);
      return { items: [a, twin ?? a], same: true, cross: false };
    }
    for (const a of items) {
      const b = items.find((w) => w.tone !== a.tone && w.key === a.key) ?? items.find((w) => w.tone !== a.tone);
      if (b) return { items: [a, b], same: false, cross: false };
    }
  }
  return undefined;
}
