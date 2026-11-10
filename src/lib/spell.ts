// «Cómo se escribe»: desglosa una palabra thai en sus letras y signos, cada uno con su sonido.
// Es una guía para quien empieza, no un analizador completo: no muestra las vocales implícitas. Las reglas
// dan una primera lectura y, si se pasa la transcripción de la ficha, cada consonante se ajusta a ella
// (inicial, final o muda), para que el desglose nunca contradiga lo que se oye y se lee en la ficha.
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
const isLeading = (c?: string) => !!c && LEADING.includes(c);

/** Grupos de dos consonantes que se pronuncian juntas al empezar sílaba (กล = gl, คร = khr…). */
const CLUSTERS = ['กร', 'กล', 'กว', 'ขร', 'ขล', 'ขว', 'คร', 'คล', 'คว', 'ปร', 'ปล', 'พร', 'พล', 'ตร'];
/** Grupos falsos: la ร no suena (จริง, สร้าง, ศรี) y ทร se lee «s» (ทราบ, ทราย). */
const SILENT_R = ['จร', 'ซร', 'ศร', 'สร', 'ทร'];
/** Consonantes sonoras: una ห delante de ellas es muda y solo cambia el tono (หมา, ไหม). */
const SONOR = 'งญณนมยรลวฬ';

const consonantOf = (c?: string) => (c ? CONSONANTS.find((x) => x.ch === c) : undefined);
/** ¿La segunda consonante va pegada a la primera al empezar sílaba? (grupo, grupo falso, ห muda o อ muda ante ย) */
const joins = (a?: string, b?: string) =>
  !!a && !!b && (CLUSTERS.includes(a + b) || SILENT_R.includes(a + b) || (a === 'ห' && SONOR.includes(b)) || (a === 'อ' && b === 'ย'));

/** Cada consonante con sus lecturas posibles: la de las reglas primero; `fixed` si no hay duda (การันต์, อ). */
type Choice = { alts: string[]; fixed?: boolean };

/** Letras de la palabra con su sonido; null si es demasiado larga o no es thai (frases, nombres largos). */
export function spell(th: string, rom?: string): Glyph[] | null {
  const chars = [...th].filter((c) => c >= 'ก' && c <= '๛');
  if (!chars.length || chars.length > 10) return null;

  /** ว que hace de vocal «ua» entre dos consonantes, sin otra vocal (สวน, ด้วย, ควร, หลวง). */
  const wawVowel = (k: number) => {
    if (chars[k] !== 'ว' || !consonantOf(chars[k + 1]) || isMark(chars[k + 2]) || (chars[k + 1] === 'ร' && chars[k + 2] === 'ร')) return false;
    let p = k - 1;
    if (chars[p] && chars[p] in TONES) p--;
    if (!consonantOf(chars[p]) || chars[p] === 'ว') return false;
    const q = joins(chars[p - 1], chars[p]) ? p - 2 : p - 1;
    return !isLeading(chars[q]);
  };
  /** Lo que sigue en `k` hace de vocal: un signo de vocal o tono, una อ vocal o una ว vocal. */
  const vowelAt = (k: number) => isMark(chars[k]) || (chars[k] === 'อ' && !isMark(chars[k + 1])) || wawVowel(k);
  /** ร หัน (รร): la primera hace de «a»; la segunda, de «n» si cierra la sílaba (ธรรม = th-a-m, พรรษา = ph-a-n-s-aa). */
  const rrFirst = (k: number) => chars[k] === 'ร' && chars[k + 1] === 'ร' && !!consonantOf(chars[k - 1]);
  /** Una sílaba empieza por un grupo en mitad de la palabra (ตะกร้า, ต้นกล้า, บายศรี, ทุกอย่าง). */
  const pairAhead = (i: number) => {
    const prev = chars[i - 1];
    const after = !prev || !!consonantOf(prev) || 'ะาำ'.includes(prev) || isLeading(prev);
    const pair = chars[i] + chars[i + 1];
    return after && (CLUSTERS.includes(pair) || SILENT_R.includes(pair) || pair === 'อย') && chars[i + 2] !== 'ร' && vowelAt(i + 2);
  };

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
  const choices = new Map<number, Choice>();
  let prevInitial = false;
  chars.forEach((ch, i) => {
    const prev = chars[i - 1];
    const next = chars[i + 1];
    const shown = COMBINING.includes(ch) ? `◌${ch}` : ch;
    let initialHere = false;
    const push = (g: Glyph, choice?: Choice) => {
      if (choice) choices.set(out.length, choice);
      out.push(g);
    };
    if (ch in TONES) push({ ch: shown, label: TONES[ch], kind: 'tono' });
    else if (ch === '์') push({ ch: shown, label: 'muda', kind: 'signo' });
    else if (ch === 'ๆ') push({ ch, label: 'repite', kind: 'signo' });
    else if (part.has(i)) push({ ch: shown, label: part.get(i)!, kind: 'vocal' });
    else if (ch in VOWELS) push({ ch: shown, label: VOWELS[ch], kind: 'vocal' });
    else if (rrFirst(i)) push({ ch, label: 'a', kind: 'vocal' });
    else if (ch === 'ร' && rrFirst(i - 1)) {
      // la segunda ร: «n» si la sílaba acaba aquí (al final, ante una letra muda o ante otra sílaba)
      const closes = !chars[i + 1] || chars[i + 2] === '์' || chars[i + 3] === '์' || vowelAt(i + 2);
      if (closes) push({ ch, label: 'n', kind: 'consonante', cls: consonantOf(ch)!.cls }, { alts: ['n', 'muda'] });
      else push({ ch, label: '(a)', kind: 'vocal' });
    } else if (wawVowel(i)) push({ ch, label: 'ua', kind: 'vocal' });
    else {
      const c = consonantOf(ch);
      if (!c) push({ ch, label: '', kind: 'signo' });
      // letras mudas: la que lleva การันต์ (์) y la ท de ทร์
      else if (next === '์' || chars[i + 2] === '์') push({ ch, label: 'muda', kind: 'consonante', cls: c.cls }, { alts: ['muda'], fixed: true });
      else if (ch === 'อ' && prev === 'ื') push({ ch, label: '(ʉʉ)', kind: 'vocal' });
      else {
        // empieza sílaba: al principio, tras una vocal que va delante, ante una vocal o tono, ante una อ que
        // hace de vocal (สอน), pegada a la consonante anterior en un grupo (ไกล = g + l, ใคร = kh + r), ante una
        // ว vocal (สวน), ante รร (ธรรม) o al empezar un grupo en mitad de la palabra (ตะกร้า)
        const vowelO = next === 'อ' && !isMark(chars[i + 2]) && !(chars[i + 2] === 'ย' && vowelAt(i + 3));
        const initial =
          i === 0 || isLeading(prev) || isMark(next) || vowelO || (prevInitial && joins(prev, ch)) || wawVowel(i + 1) || rrFirst(i + 1) || pairAhead(i);
        const sounds = [c.sound, c.final ?? c.sound, ...(ch === 'ว' ? ['o', 'u', 'w'] : ch === 'ย' ? ['i', 'y'] : ch === 'ท' && next === 'ร' ? ['s'] : [])];
        const choose = (label: string): Choice => ({ alts: [...new Set([label, ...sounds, 'muda'])] });
        if (ch === 'อ' && !initial) push({ ch, label: 'ɔɔ', kind: 'vocal' });
        else if (ch === 'อ') {
          // la อ que sostiene una vocal no suena (อา, อยู่)
          const label = joins(ch, next) ? 'muda' : c.sound;
          push({ ch, label, kind: 'consonante', cls: c.cls }, { alts: [label], fixed: true });
          initialHere = true;
        } else if (ch === 'ร' && prevInitial && SILENT_R.includes(prev + ch)) {
          // grupo falso: la ร no suena (จริง, สร้าง, ศรี, ทราบ)
          push({ ch, label: 'muda', kind: 'consonante', cls: c.cls }, choose('muda'));
          initialHere = true;
        } else if (ch === 'ห' && !!next && SONOR.includes(next) && !wawVowel(i + 1) && ((initial && joins(ch, next)) || vowelAt(i + 2))) {
          // ห delante de su pareja (หมา, ไหม, จดหมาย): no suena, solo marca el tono
          push({ ch, label: 'muda', kind: 'consonante', cls: c.cls }, choose('muda'));
          initialHere = true;
        } else {
          const label = initial && ch === 'ท' && next === 'ร' ? 's' : initial ? c.sound : (c.final ?? c.sound);
          push({ ch, label, kind: 'consonante', cls: c.cls }, choose(label));
          initialHere = initial;
        }
      }
    }
    prevInitial = initialHere;
  });
  return rom ? alignTo(out, choices, rom, chars.includes('ๆ')) : out;
}

const VOWEL_SOUNDS = 'aeiouɔɛəʉ';
const silent = (label: string) => label === 'muda' || label.startsWith('(') || label === '';

/**
 * Ajusta cada consonante a la transcripción de la ficha: entre sus lecturas posibles (inicial, final, muda),
 * la que encaja en orden con lo que se pronuncia, cambiando lo mínimo respecto a las reglas. Así una
 * consonante con vocal implícita (สบาย = sà-baai) suena como inicial y una ร que no se oye (ศีรษะ) sale muda.
 */
function alignTo(glyphs: Glyph[], choices: Map<number, Choice>, rom: string, repeats: boolean): Glyph[] {
  const r = rom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}]/gu, '');
  const skip = (from: number, to: number) => {
    let c = 0;
    for (let k = from; k < to; k++) c += VOWEL_SOUNDS.includes(r[k]) ? 0.2 : 3;
    return c;
  };
  const idx = [...choices.keys()];
  // dp[g][j]: coste mínimo tras colocar las g primeras consonantes con la transcripción leída hasta j
  const INF = Number.POSITIVE_INFINITY;
  const dp: number[][] = Array.from({ length: idx.length + 1 }, () => Array<number>(r.length + 1).fill(INF));
  const from: { j: number; label: string }[][] = Array.from({ length: idx.length + 1 }, () => Array(r.length + 1));
  dp[0][0] = 0;
  idx.forEach((gi, g) => {
    const { alts, fixed } = choices.get(gi)!;
    const options = fixed ? alts.slice(0, 1) : alts;
    for (let j = 0; j <= r.length; j++) {
      if (dp[g][j] === INF) continue;
      options.forEach((label, o) => {
        const change = o === 0 ? 0 : 1.5;
        const relax = (to: number, cost: number) => {
          if (cost < dp[g + 1][to]) {
            dp[g + 1][to] = cost;
            from[g + 1][to] = { j, label };
          }
        };
        if (silent(label)) relax(j, dp[g][j] + change);
        else for (let k = j; k + label.length <= r.length; k++) if (r.startsWith(label, k)) relax(k + label.length, dp[g][j] + skip(j, k) + change);
      });
    }
  });
  // lo que queda sin leer al final cuenta (salvo con ๆ, que repite la palabra)
  let best = 0;
  for (let j = 0; j <= r.length; j++) {
    const cost = dp[idx.length][j] + (repeats ? 0 : skip(j, r.length));
    const bestCost = dp[idx.length][best] + (repeats ? 0 : skip(best, r.length));
    if (cost < bestCost) best = j;
  }
  if (dp[idx.length][best] === INF) return glyphs;
  const labels = new Map<number, string>();
  for (let g = idx.length, j = best; g > 0; g--) {
    const step = from[g][j];
    labels.set(idx[g - 1], step.label);
    j = step.j;
  }
  return glyphs.map((gl, k) => (labels.has(k) ? { ...gl, label: labels.get(k)! } : gl));
}

/** Nota sobre la primera consonante: «La letra ช se llama ช ช้าง (chɔɔ cháang): la «ch» de elefante». */
export function firstLetterNote(th: string): string | null {
  const c = [...th].map((ch) => CONSONANTS.find((x) => x.ch === ch)).find(Boolean);
  if (!c || c.ch === 'อ') return null;
  return `La letra ${c.ch} se llama ${c.ch} ${c.name} (${c.nameRom}): ¡la «${c.sound}» de ${c.meaning}!`;
}
