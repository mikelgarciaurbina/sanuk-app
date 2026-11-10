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

/** Letras de la palabra con su sonido; null si es demasiado larga o no es thai (frases, nombres largos). */
export function spell(th: string): Glyph[] | null {
  const chars = [...th].filter((c) => c >= '\u0E01' && c <= '\u0E5B');
  if (!chars.length || chars.length > 10) return null;
  // vocales compuestas: เ◌ีย (ia), เ◌ือ (ʉa) y ◌ัว (ua) se leen como un solo sonido
  const part = new Map<number, string>();
  chars.forEach((ch, i) => {
    if (ch !== 'เ') return;
    const j = chars[i + 2] && chars[i + 2] in TONES ? i + 3 : i + 2;
    const k = chars[j + 1] && chars[j + 1] in TONES ? j + 2 : j + 1;
    if (chars[j] === 'ี' && chars[k] === 'ย') [i, j, k].forEach((n, x) => part.set(n, x ? '(ia)' : 'ia'));
    if (chars[j] === 'ื' && chars[k] === 'อ') [i, j, k].forEach((n, x) => part.set(n, x ? '(ʉa)' : 'ʉa'));
  });
  chars.forEach((ch, i) => {
    const k = chars[i + 1] && chars[i + 1] in TONES ? i + 2 : i + 1;
    if (ch === 'ั' && chars[k] === 'ว') {
      part.set(i, 'ua');
      part.set(k, '(ua)');
    }
  });
  return chars.map((ch, i): Glyph => {
    const prev = chars[i - 1];
    const next = chars[i + 1];
    const shown = COMBINING.includes(ch) ? `◌${ch}` : ch;
    if (ch in TONES) return { ch: shown, label: TONES[ch], kind: 'tono' };
    if (ch === '์') return { ch: shown, label: 'muda', kind: 'signo' };
    if (ch === 'ๆ') return { ch, label: 'repite', kind: 'signo' };
    const inVowel = part.get(i);
    if (inVowel) return { ch: shown, label: inVowel, kind: 'vocal' };
    if (ch in VOWELS) return { ch: shown, label: VOWELS[ch], kind: 'vocal' };
    const c = CONSONANTS.find((x) => x.ch === ch);
    if (!c) return { ch, label: '', kind: 'signo' };
    // letras mudas: la que lleva การันต์ (์) y la ท de ทร์
    if (next === '์' || chars[i + 2] === '์') return { ch, label: 'muda', kind: 'consonante', cls: c.cls };
    if (ch === 'อ' && prev === 'ื') return { ch, label: '(ʉʉ)', kind: 'vocal' };
    // una consonante es inicial al empezar, tras una vocal que va delante, ante una vocal o tono,
    // o ante una อ que hace de vocal (สอน: ส + ɔɔ + น)
    const vowelO = next === 'อ' && !isMark(chars[i + 2]);
    const initial = i === 0 || (!!prev && LEADING.includes(prev)) || isMark(next) || vowelO;
    if (ch === 'อ' && !initial) return { ch, label: 'ɔɔ', kind: 'vocal' };
    return { ch, label: initial ? c.sound : (c.final ?? c.sound), kind: 'consonante', cls: c.cls };
  });
}

/** Nota sobre la primera consonante: «La letra ช se llama ช ช้าง (chɔɔ cháang): la «ch» de elefante». */
export function firstLetterNote(th: string): string | null {
  const c = [...th].map((ch) => CONSONANTS.find((x) => x.ch === ch)).find(Boolean);
  if (!c || c.ch === 'อ') return null;
  return `La letra ${c.ch} se llama ${c.ch} ${c.name} (${c.nameRom}): ¡la «${c.sound}» de ${c.meaning}!`;
}
