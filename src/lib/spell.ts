// «Cómo se escribe»: desglosa una palabra thai en sus letras y signos, cada uno con su sonido.
// Es una guía para quien empieza, no un analizador completo: no muestra las vocales implícitas.
import { CONSONANTS } from '@/content/letters';
import type { Consonant } from '@/content/types';

export type Glyph = { ch: string; label: string; kind: 'consonante' | 'vocal' | 'tono' | 'signo'; cls?: Consonant['cls'] };

const LEADING = 'เแโใไ';
/** Signos que se escriben encima o debajo de la consonante: se enseñan sobre un círculo de referencia. */
const COMBINING = 'ัิีึืุู็่้๊๋์';
const VOWELS: Record<string, string> = {
  'ะ': 'a',
  'ั': 'a',
  'า': 'aa',
  'ำ': 'am',
  'ิ': 'i',
  'ี': 'ii',
  'ึ': 'ʉ',
  'ื': 'ʉʉ',
  'ุ': 'u',
  'ู': 'uu',
  'เ': 'ee',
  'แ': 'ɛɛ',
  'โ': 'oo',
  'ใ': 'ai',
  'ไ': 'ai',
  '็': 'corta',
  'ฤ': 'rʉ',
};
const TONES: Record<string, string> = { '่': 'mai ek', '้': 'mai tho', '๊': 'mai tri', '๋': 'mai jattawa' };
const isMark = (c?: string) => !!c && (c in VOWELS || c in TONES) && !LEADING.includes(c);

/** Grupos de dos consonantes que se pronuncian juntas al empezar sílaba (กล = gl, คร = khr…). */
const CLUSTERS = ['กร', 'กล', 'กว', 'ขร', 'ขล', 'ขว', 'คร', 'คล', 'คว', 'ปร', 'ปล', 'พร', 'พล', 'ผล', 'ตร'];
/** Consonantes sonoras: una ห delante de ellas es muda y solo cambia el tono (หมา, ไหม). */
const SONOR = 'งญณนมยรลวฬ';

const consonantOf = (c?: string) => (c ? CONSONANTS.find((x) => x.ch === c) : undefined);
/** ¿La segunda consonante va pegada a la primera al empezar sílaba? (grupo, ห muda o อ muda ante ย) */
const joins = (a?: string, b?: string) => !!a && !!b && (CLUSTERS.includes(a + b) || (a === 'ห' && SONOR.includes(b)) || (a === 'อ' && b === 'ย'));

/** Letras de la palabra con su sonido; null si es demasiado larga o no es thai (frases, nombres largos). */
export function spell(th: string): Glyph[] | null {
  const chars = [...th].filter((c) => c >= 'ก' && c <= '๛');
  if (!chars.length || chars.length > 10) return null;

  // vocales compuestas que se leen como un solo sonido: เ◌ีย (ia), เ◌ือ (ʉa), เ◌า (ao), เ◌อ y เ◌ิ (əə), ◌ัว (ua)
  const part = new Map<number, string>();
  const tone = (k: number) => (chars[k] && chars[k] in TONES ? k + 1 : k);
  chars.forEach((ch, i) => {
    if (ch === 'เ') {
      let j = i + 1;
      if (consonantOf(chars[j])) j += joins(chars[j], chars[j + 1]) ? 2 : 1;
      const v = chars[j];
      if (v === 'ี' && chars[tone(j + 1)] === 'ย') [i, j, tone(j + 1)].forEach((n, x) => part.set(n, x ? '(ia)' : 'ia'));
      else if (v === 'ื' && chars[tone(j + 1)] === 'อ') [i, j, tone(j + 1)].forEach((n, x) => part.set(n, x ? '(ʉa)' : 'ʉa'));
      else if (v === 'ิ') [i, j].forEach((n, x) => part.set(n, x ? '(əə)' : 'əə'));
      else if (chars[tone(j)] === 'า' && chars[tone(j) + 1] !== 'ะ') [i, tone(j)].forEach((n, x) => part.set(n, x ? '(ao)' : 'ao'));
      else if (chars[tone(j)] === 'อ') [i, tone(j)].forEach((n, x) => part.set(n, x ? '(əə)' : 'əə'));
    }
    if (ch === 'ั' && chars[tone(i + 1)] === 'ว') {
      part.set(i, 'ua');
      part.set(tone(i + 1), '(ua)');
    }
  });

  const out: Glyph[] = [];
  let prevInitial = false;
  chars.forEach((ch, i) => {
    const prev = chars[i - 1];
    const next = chars[i + 1];
    const shown = COMBINING.includes(ch) ? `◌${ch}` : ch;
    let initialHere = false;
    const push = (g: Glyph) => out.push(g);
    if (ch in TONES) push({ ch: shown, label: TONES[ch], kind: 'tono' });
    else if (ch === '์') push({ ch: shown, label: 'muda', kind: 'signo' });
    else if (ch === 'ๆ') push({ ch, label: 'repite', kind: 'signo' });
    else if (part.has(i)) push({ ch: shown, label: part.get(i)!, kind: 'vocal' });
    else if (ch in VOWELS) push({ ch: shown, label: VOWELS[ch], kind: 'vocal' });
    else {
      const c = consonantOf(ch);
      if (!c) push({ ch, label: '', kind: 'signo' });
      // letras mudas: la que lleva การันต์ (์) y la ท de ทร์
      else if (next === '์' || chars[i + 2] === '์') push({ ch, label: 'muda', kind: 'consonante', cls: c.cls });
      else if (ch === 'อ' && prev === 'ื') push({ ch, label: '(ʉʉ)', kind: 'vocal' });
      else {
        // empieza sílaba: al principio, tras una vocal que va delante, ante una vocal o tono, ante una อ que
        // hace de vocal (สอน), o pegada a la consonante anterior en un grupo (ไกล = g + l, ใคร = kh + r)
        const vowelO = next === 'อ' && !isMark(chars[i + 2]);
        const initial = i === 0 || (!!prev && LEADING.includes(prev)) || isMark(next) || vowelO || (prevInitial && joins(prev, ch));
        if (ch === 'อ' && !initial) push({ ch, label: 'ɔɔ', kind: 'vocal' });
        // ห o อ delante de su pareja (หมา, ไหม, อยู่): no suenan, solo marcan el tono
        else if (initial && joins(ch, next) && (ch === 'ห' || ch === 'อ')) {
          push({ ch, label: 'muda', kind: 'consonante', cls: c.cls });
          initialHere = true;
        } else {
          push({ ch, label: initial ? c.sound : (c.final ?? c.sound), kind: 'consonante', cls: c.cls });
          initialHere = initial;
        }
      }
    }
    prevInitial = initialHere;
  });
  return out;
}

/** Nota sobre la primera consonante: «La letra ช se llama ช ช้าง (chɔɔ cháang): la «ch» de elefante». */
export function firstLetterNote(th: string): string | null {
  const c = [...th].map((ch) => CONSONANTS.find((x) => x.ch === ch)).find(Boolean);
  if (!c || c.ch === 'อ') return null;
  return `La letra ${c.ch} se llama ${c.ch} ${c.name} (${c.nameRom}): ¡la «${c.sound}» de ${c.meaning}!`;
}
