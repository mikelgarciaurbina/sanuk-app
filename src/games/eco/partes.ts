// Eco · qué se grita: las palabras y frases de la partida, y las frases largas partidas en trozos que caben
// en un aliento (y en el pentagrama, con sus sílabas legibles). Sin React: se puede probar con node.
import type { Sentence, Word } from '@/content/types';
import { shuffle } from '@/lib/random';
import { joinThai, personalize, personalizeRom, syllables, type Gender } from '@/lib/thai';

/** Un trozo que Noi grita de una vez: una palabra, o unas pocas palabras seguidas de una frase. */
export type Part = { th: string; rom: string };
export type Item = { id?: string; th: string; rom: string; es: string; sentence: boolean; parts: Part[] };

/** Sílabas que caben en un trozo: más, y ni se repite de un tirón ni se leen las etiquetas. */
export const MAX_SYLLABLES = 6;

/** Las sílabas que de verdad se dicen: sin puntos suspensivos ni signos sueltos («yîng … yîng …» son dos). */
export const spoken = (rom: string) => syllables(rom).filter((s) => /\p{L}/u.test(s));

const count = (rom: string) => Math.max(1, spoken(rom).length);

/**
 * Agrupa las palabras de una frase en trozos seguidos de hasta `max` sílabas, sin partir palabras y lo más
 * parejos posible (una palabra más larga que eso va sola). Con pocas sílabas devuelve un único trozo.
 */
export function chunk(tokens: Part[], max = MAX_SYLLABLES): Part[] {
  const n = tokens.length;
  const size = tokens.map((t) => count(t.rom));
  const total = size.reduce((a, b) => a + b, 0);
  const join = (a: number, b: number): Part => ({ th: joinThai(tokens.slice(a, b).map((t) => t.th)), rom: tokens.slice(a, b).map((t) => t.rom).join(' ') });
  if (n <= 1 || total <= max) return n ? [join(0, n)] : [];
  const acc = [0];
  for (const s of size) acc.push(acc[acc.length - 1] + s);
  for (let k = Math.ceil(total / max); k <= n; k++) {
    const ideal = total / k;
    // best[g][b]: lo mejor repartiendo las b primeras palabras en g trozos
    const best = Array.from({ length: k + 1 }, () => new Array<number>(n + 1).fill(Infinity));
    const from = Array.from({ length: k + 1 }, () => new Array<number>(n + 1).fill(-1));
    best[0][0] = 0;
    for (let g = 1; g <= k; g++) {
      for (let b = g; b <= n; b++) {
        for (let a = g - 1; a < b; a++) {
          const s = acc[b] - acc[a];
          if (best[g - 1][a] === Infinity || (s > max && b - a > 1)) continue;
          const c = best[g - 1][a] + (s - ideal) * (s - ideal);
          if (c < best[g][b]) {
            best[g][b] = c;
            from[g][b] = a;
          }
        }
      }
    }
    if (best[k][n] === Infinity) continue;
    const out: Part[] = [];
    let b = n;
    for (let g = k; g >= 1; g--) {
      const a = from[g][b];
      out.unshift(join(a, b));
      b = a;
    }
    return out;
  }
  return tokens.map((_, i) => join(i, i + 1));
}

function sentenceItem(x: Sentence, gender: Gender): Item {
  const th = x.th.map((t) => personalize(t, gender));
  const rom = personalizeRom(x.rom, gender);
  const words = rom.trim().split(/\s+/);
  // en el temario, cada palabra thai de la frase tiene su palabra en la transcripción; si alguna vez no, va entera
  const tokens: Part[] = words.length === th.length ? th.map((t, i) => ({ th: t, rom: words[i] })) : [{ th: joinThai(th), rom }];
  return { th: joinThai(th), rom, es: personalize(x.es, gender), sentence: true, parts: chunk(tokens) };
}

/** Lo que se grita en la partida: en la feria, primero palabras cortas para calentar la voz y luego frases. */
export function makeItems(mode: 'leccion' | 'feria', sentences: Sentence[], words: Word[], focus: Word[], gender: Gender, n: number): Item[] {
  const S: Item[] = shuffle(sentences).map((x) => sentenceItem(x, gender));
  const seen = new Set<string>();
  const W: Item[] = [...shuffle(focus), ...shuffle(words)]
    .filter((w) => !seen.has(w.th) && (seen.add(w.th), true))
    .map((x) => ({ id: x.id, th: x.th, rom: x.rom, es: x.es, sentence: false, parts: [{ th: x.th, rom: x.rom }] }));
  const out: Item[] = [];
  if (mode === 'feria') {
    const half = Math.ceil(n / 2);
    out.push(...W.filter((w) => spoken(w.rom).length <= 3).slice(0, half));
    out.push(...S.slice(0, n - out.length));
    out.push(...W.filter((w) => !out.includes(w)).slice(0, n - out.length));
  } else {
    const a = n >= 2 ? [...W] : [...S];
    const b = n >= 2 ? [...S] : [...W];
    while (out.length < n && (a.length || b.length)) {
      const it = (out.length % 2 === 0 ? (a.shift() ?? b.shift()) : (b.shift() ?? a.shift()))!;
      if (!out.some((o) => o.th === it.th)) out.push(it);
    }
  }
  return out.slice(0, n);
}
