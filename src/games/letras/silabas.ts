// Lógica de «Bloques de sílabas»: qué sílabas tocan en cada lección o nivel, qué bloques se ofrecen para montarlas,
// qué lecturas se proponen al descifrarlas y cómo se explica la regla del tono (clase + viva o muerta + marca).
import { tones, type ToneId } from '@/brand/tokens';
import {
  COMMON_LETTERS,
  SYLLABLES,
  TONE_MARKS,
  VOWELS,
  consonantOf,
  finalSound,
  lookalikesOf,
  romOf,
  toneByRule,
  vowelParts,
  type LetterClass,
  type Syllable,
  type VowelForm,
  type VowelSet,
} from '@/content/letters';
import type { LetterSet } from '@/content/types';
import { shuffle } from '@/lib/random';

export const DOT = '◌';

// ——— El plan de una partida ———

/** `build`: se oye la sílaba y se monta con bloques · `decode`: se ve escrita y se dice su tono (y cómo suena). */
export type Task = 'build' | 'decode';
/** `marks`: al montar, hay fila de marcas de tono · `sound`: al descifrar, también se pregunta cómo suena. */
export type PlanItem = { s: Syllable; task: Task; marks: boolean; sound: boolean; lv: number };
export type Plan = { items: PlanItem[]; levels: { name: string; secs: number }[]; sets: VowelSet[] };

type Who = { focus: Set<string>; known: Set<string> };

const ALL_SETS: VowelSet[] = ['vocales', 'cortas', 'compuestas'];
const VOWEL_SETS: Partial<Record<LetterSet, VowelSet[]>> = { vocales: ['vocales'], cortas: ['vocales', 'cortas'], compuestas: ALL_SETS };

/** Las de la lección primero, luego las palabras que ya se conocen y, al final, las demás. */
const byPreference = (list: Syllable[], { focus, known }: Who): Syllable[] => [
  ...shuffle(list.filter((s) => focus.has(s.th))),
  ...shuffle(list.filter((s) => !focus.has(s.th) && known.has(s.th))),
  ...shuffle(list.filter((s) => !focus.has(s.th) && !known.has(s.th))),
];

/** Elige `n` sin repetir `key` (la vocal, el tono…) mientras haya variedad. */
function varied<T>(list: T[], n: number, key: (x: T) => string): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const x of list) {
    if (out.length >= n || seen.has(key(x))) continue;
    seen.add(key(x));
    out.push(x);
  }
  for (const x of list) if (out.length < n && !out.includes(x)) out.push(x);
  return out;
}

/** En la feria: dos de cada tres son palabras que ya se conocen; el resto, palabras nuevas para leer de verdad. */
function mixed(list: Syllable[], n: number, who: Who, key: (s: Syllable) => string): Syllable[] {
  const known = shuffle(list.filter((s) => who.known.has(s.th)));
  const fresh = shuffle(list.filter((s) => !who.known.has(s.th)));
  const first = [...known.slice(0, Math.ceil((n * 2) / 3)), ...fresh];
  return varied([...first, ...known], n, key);
}

/** La escalera de la regla del tono: de lo que solo depende de la clase a lo que pide mirarlo todo. */
const LADDER: ((s: Syllable) => boolean)[] = [
  (s) => !s.t && s.live && !s.lead, // viva y sin marca: decide la clase
  (s) => (s.t === '่' || s.t === '้') && s.cls !== 'baja', // marca sobre media o alta
  (s) => (s.t === '่' || s.t === '้') && s.cls === 'baja', // marca sobre baja: al revés
  (s) => !s.t && !s.live, // muerta: corta en seco
  (s) => !!s.lead, // ห o อ muda delante
  (s) => s.t === '๊' || s.t === '๋', // las dos marcas de la clase media
];

const stepOf = (s: Syllable) => LADDER.findIndex((step) => step(s));

function ladder(n: number, pool: Syllable[], who: Who, steps: number[]): Syllable[] {
  const out: Syllable[] = [];
  for (let k = 0; out.length < n && k < n * 3; k++) {
    const step = LADDER[steps[k % steps.length]];
    const next = byPreference(pool.filter((s) => step(s) && !out.includes(s)), who)[0];
    if (next) out.push(next);
  }
  for (const s of shuffle(pool)) if (out.length < n && !out.includes(s)) out.push(s);
  return out;
}

const item = (s: Syllable, task: Task, marks: boolean, sound = false, lv = 0): PlanItem => ({ s, task, marks, sound, lv });

/** Un paso de lección: `n` sílabas del grupo que se estudia. */
function lessonPlan(set: LetterSet, n: number, who: Who): Plan {
  const simple = SYLLABLES.filter((s) => s.simple);
  const levels = [{ name: '', secs: 0 }];

  // vocales: solo consonante + vocal (con final si la vocal la pide); todavía no hay marcas de tono
  if (set === 'vocales' || set === 'cortas' || set === 'compuestas') {
    const pool = simple.filter((s) => !s.t && s.form.set === set && (set !== 'vocales' || s.level === 1));
    const picked = varied(byPreference(pool, who), n, (s) => s.v).sort((a, b) => a.level - b.level);
    return { items: picked.map((s) => item(s, 'build', false)), levels, sets: VOWEL_SETS[set] ?? ALL_SETS };
  }

  // reglas: leer la sílaba y decir su tono. Primero las palabras de la lección (variadas: otra clase, otro final);
  // lo que falte, con los peldaños de la escalera que ellas no pisan. Siempre de lo fácil a lo difícil.
  if (set === 'reglas') {
    const pool = SYLLABLES.filter((s) => [...s.c].length === 1);
    const mine = varied(shuffle(pool.filter((s) => who.focus.has(s.th))), n, (s) => `${stepOf(s)}${s.cls}${s.live || s.long}`);
    const missing = [0, 1, 2, 3].filter((k) => !mine.some((s) => stepOf(s) === k));
    const rest = mine.length < n ? ladder(n - mine.length, pool.filter((s) => !mine.includes(s)), who, missing.length ? missing : [0, 1, 2, 3, 4, 5]) : [];
    const picked = [...mine, ...rest].sort((a, b) => stepOf(a) - stepOf(b));
    return { items: picked.map((s) => item(s, 'decode', false)), levels, sets: ALL_SETS };
  }

  // sílabas: construir lo que se oye, hasta donde llegan las palabras de la lección
  const inFocus = simple.filter((s) => who.focus.has(s.th));
  const maxLevel = inFocus.length ? Math.max(...inFocus.map((s) => s.level)) : 2;
  const seen = new Set(simple.filter((s) => who.focus.has(s.th) || who.known.has(s.th)).map((s) => s.v));
  const pool = simple.filter((s) => s.level <= maxLevel && (s.form.set === 'vocales' || seen.has(s.v)));
  const picked = byPreference(pool, who)
    .slice(0, n)
    .sort((a, b) => a.level - b.level);
  return { items: picked.map((s) => item(s, 'build', maxLevel >= 2)), levels, sets: ALL_SETS };
}

/** La partida de la feria: tres niveles de construir y, si ya se estudiaron las reglas, uno de lectura relámpago. */
function feriaPlan(pool: LetterSet[], who: Who): Plan {
  const sets: VowelSet[] = ['vocales', ...(['cortas', 'compuestas'] as const).filter((x) => pool.includes(x))];
  const fair = (s: Syllable) => sets.includes(s.form.set) || who.known.has(s.th);
  const rules = pool.includes('reglas');
  const levels = [
    { name: 'Consonante + vocal', secs: 16 },
    { name: 'Con marca de tono', secs: 16 },
    { name: 'Con consonante final', secs: 22 },
    ...(rules ? [{ name: 'Lee y di el tono', secs: 14 }] : []),
  ];
  const items: PlanItem[] = [];
  (rules ? [3, 3, 2] : [3, 4, 3]).forEach((n, lv) => {
    const all = SYLLABLES.filter((s) => s.simple && s.level === lv + 1);
    const list = all.filter(fair);
    for (const s of mixed(list.length >= n ? list : all, n, who, (x) => x.v)) items.push(item(s, 'build', lv > 0, false, lv));
  });
  if (rules) {
    const readable = SYLLABLES.filter((s) => [...s.c].length === 1 && fair(s));
    const steps = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 4).sort((a, b) => a - b);
    ladder(4, readable.length >= 8 ? readable : SYLLABLES, who, steps).forEach((s, k) => items.push(item(s, 'decode', false, k >= 2, 3)));
  }
  return { items, levels, sets };
}

export function makePlan(o: { feria: boolean; set: LetterSet; pool: LetterSet[]; rounds: number; focus: string[]; known: string[] }): Plan {
  const who = { focus: new Set(o.focus), known: new Set(o.known) };
  const plan = o.feria ? feriaPlan(o.pool, who) : lessonPlan(o.set, Math.max(1, o.rounds), who);
  // con muy pocas sílabas donde elegir, al menos una
  if (!plan.items.length) plan.items.push(item(SYLLABLES[0], 'build', false));
  return plan;
}

// ——— Montar la sílaba: los bloques que se ofrecen ———

export type Kind = 'c' | 'v' | 't' | 'f';
export type BuildOptions = { need: Kind[]; opts: Record<Kind, string[]> };

/** Vocales que se confunden de oído (larga y corta, o vecinas). */
const NEAR: Record<string, string[]> = {
  a: ['aa'],
  aa: ['a', 'ɔɔ'],
  i: ['ii', 'ʉ'],
  ii: ['i', 'ʉʉ'],
  u: ['uu', 'ʉ'],
  uu: ['u', 'ʉʉ'],
  ʉ: ['ʉʉ', 'i', 'u'],
  ʉʉ: ['ʉ', 'ii', 'uu'],
  e: ['ee', 'ɛ'],
  ee: ['e', 'ɛɛ'],
  ɛ: ['ɛɛ', 'e'],
  ɛɛ: ['ɛ', 'ee'],
  o: ['oo', 'ɔ'],
  oo: ['o', 'ɔɔ'],
  ɔ: ['ɔɔ', 'o'],
  ɔɔ: ['ɔ', 'oo'],
  ə: ['əə'],
  əə: ['ə', 'ʉʉ', 'ee'],
  ia: ['ʉa', 'ii'],
  ʉa: ['ia', 'ua'],
  ua: ['ʉa', 'uu'],
  ai: ['ao', 'aa'],
  ao: ['ai', 'aa'],
  am: ['a', 'aa'],
  əəi: ['əə', 'ai'],
};

const FINALS = ['น', 'ง', 'ม', 'ก', 'ด', 'บ', 'ย', 'ว'];

/** Otras formas de vocal que podrían ir en el sitio de la de `s` (con o sin final, como ella) y que no suenan igual. */
function otherVowels(s: Syllable, sets: VowelSet[]): VowelForm[] {
  const fits = (f: VowelForm) => f.id !== s.v && f.id !== 'เ◌~' && f.rom !== s.form.rom && f.ch !== s.form.ch && (s.f ? f.closed !== false : f.closed !== true);
  const inSets = VOWELS.filter((f) => fits(f) && sets.includes(f.set));
  const list = inSets.length >= 2 ? inSets : VOWELS.filter(fits);
  const near = shuffle(list.filter((f) => NEAR[s.form.rom]?.includes(f.rom)));
  const out: VowelForm[] = [];
  for (const f of [...near.slice(0, 1), ...shuffle(list)]) if (!out.some((x) => x.rom === f.rom)) out.push(f);
  return out;
}

/** Marcas que se pueden ofrecer: la buena y las que darían otro tono (๊ y ๋, solo con clase media). */
function markOptions(s: Syllable): string[] {
  const all = ['', '่', '้', ...(s.cls === 'media' ? ['๊', '๋'] : [])];
  return all.filter((t) => t === s.t || toneByRule(s.cls, s.live, s.long, t) !== s.tone);
}

export function buildOptions(s: Syllable, marks: boolean, nOpts: number, sets: VowelSet[]): BuildOptions {
  const need: Kind[] = ['c', 'v', ...(marks ? (['t'] as const) : []), ...(s.f ? (['f'] as const) : [])];
  const sound = consonantOf(s.c)?.sound;
  const okC = (c: string) => c !== s.c && consonantOf(c)?.sound !== sound;
  const cons = [s.c, ...shuffle(lookalikesOf(s.c).filter((c) => COMMON_LETTERS.includes(c) && okC(c))).slice(0, 1)];
  for (const c of shuffle(COMMON_LETTERS)) if (cons.length < nOpts && okC(c) && !cons.includes(c)) cons.push(c);
  const vows = [s.v, ...otherVowels(s, sets).slice(0, nOpts - 1).map((f) => f.id)];
  const end = finalSound(s.f);
  const fins = s.f ? [s.f, ...shuffle(FINALS.filter((f) => finalSound(f) !== end)).slice(0, Math.max(2, nOpts - 1))] : [];
  return { need, opts: { c: shuffle(cons), v: shuffle(vows), t: marks ? markOptions(s) : [], f: shuffle(fins) } };
}

// ——— Descifrar la sílaba: lecturas posibles ———

const SWAP_FINAL: Record<string, string[]> = { n: ['ง', 'ม'], ng: ['น', 'ม'], m: ['น', 'ง'], k: ['ด', 'บ'], t: ['ก', 'บ'], p: ['ก', 'ด'], i: ['ว', 'น'], o: ['ย', 'ง'] };
const same = (a: string, b: string) => a.normalize('NFC') === b.normalize('NFC');

/** Tres lecturas, con el tono ya puesto: la buena y dos que cambian la vocal, la consonante o la final. */
export function soundOptions(s: Syllable): string[] {
  const first = [...s.c][0];
  const sound = consonantOf(first)?.sound;
  const vowel = otherVowels(s, ALL_SETS).map((f) => romOf(s.c, f.id, s.f, s.tone));
  const start = [
    // la ห muda leída como «h»: la trampa de หมา, หนู
    ...(s.lead === 'ห' ? [romOf('ห', s.v, s.f, s.tone)] : []),
    ...shuffle(lookalikesOf(first).filter((c) => COMMON_LETTERS.includes(c) && consonantOf(c)?.sound !== sound && c !== 'อ')).map((c) => romOf(c + [...s.c].slice(1).join(''), s.v, s.f, s.tone)),
    ...shuffle(COMMON_LETTERS.filter((c) => consonantOf(c)?.sound !== sound && c !== 'อ')).map((c) => romOf(c + [...s.c].slice(1).join(''), s.v, s.f, s.tone)),
  ];
  const end = s.f ? shuffle(SWAP_FINAL[finalSound(s.f)] ?? []).map((f) => romOf(s.c, s.v, f, s.tone)) : [];
  // una de cada clase mientras se pueda: primero la vocal (lo que más se confunde), luego final o consonante
  const out: string[] = [];
  const add = (r?: string) => {
    if (r && out.length < 2 && !same(r, s.rom) && !out.some((x) => same(x, r))) out.push(r);
  };
  add(vowel[0]);
  add(Math.random() < 0.5 ? end[0] : start[0]);
  for (const r of [...start, ...end, ...vowel]) add(r);
  return shuffle([s.rom, ...out]);
}

// ——— La regla del tono, paso a paso ———

export type StepKey = 'clase' | 'final' | 'marca';
export type RuleStep = { key: StepKey; th?: string; label: string; detail: string };

export const CLS_ES: Record<LetterClass, string> = { media: 'media', alta: 'alta', baja: 'baja' };
export const toneName = (t: ToneId) => tones[t].name.toLowerCase();
const markOf = (t: string) => TONE_MARKS.find((m) => m.ch === t);

/** Por qué la sílaba es viva o muerta. */
function ending(s: Syllable): string {
  if (s.f) return s.live ? `acaba en ${s.f} (-${finalSound(s.f)}) y el sonido sigue: viva` : `acaba en ${s.f} (-${finalSound(s.f)}) y se corta en seco: muerta`;
  if (s.long) return 'acaba en vocal larga: viva';
  if (s.live) return `${s.form.ch} acaba en -${s.form.rom.slice(-1)}: viva`;
  return 'acaba en vocal corta: muerta';
}

/** Los tres pasos de la regla para una sílaba: clase + viva o muerta + marca. */
export function ruleSteps(s: Syllable): RuleStep[] {
  const letter = s.lead || [...s.c][0];
  const cls = CLS_ES[s.cls];
  const who =
    s.lead === 'ห'
      ? `La ห no suena: va delante de ${s.c} para darle clase alta.`
      : s.lead === 'อ'
        ? `La อ no suena: le da clase media a la ${s.c}.`
        : [...s.c].length > 1
          ? `Manda la primera consonante: ${letter} es de clase ${cls}.`
          : `${letter} es de clase ${cls}.`;
  const dead = s.cls === 'baja' && !s.t ? (s.long ? 'muerta larga' : 'muerta corta') : 'muerta';
  const m = markOf(s.t);
  return [
    { key: 'clase', th: letter, label: cls, detail: who },
    { key: 'final', label: s.live ? 'viva' : dead, detail: `La sílaba ${ending(s)}.` },
    { key: 'marca', th: m ? DOT + s.t : undefined, label: m ? m.rom : 'sin marca', detail: m ? `Con marca, manda la marca: ${DOT}${s.t} sobre clase ${cls} = tono ${toneName(s.tone)}.` : `Sin marca, manda cómo acaba: clase ${cls} + ${s.live ? 'viva' : dead} = tono ${toneName(s.tone)}.` },
  ];
}

/** Qué paso de la regla ha fallado si se ha contestado `picked`, y cómo se explica. */
export function whyWrong(s: Syllable, picked: ToneId): { step: StepKey; text: string } {
  const letter = s.lead || [...s.c][0];
  const cls = CLS_ES[s.cls];
  for (const alt of (['media', 'alta', 'baja'] as const).filter((c) => c !== s.cls)) {
    if (toneByRule(alt, s.live, s.long, s.t) !== picked) continue;
    const lead = s.lead === 'ห' ? ` La ห muda de delante sube a la ${s.c} a clase alta.` : s.lead === 'อ' ? ` La อ muda de delante le da clase media.` : '';
    return { step: 'clase', text: `Ojo con la clase: ${letter} es ${cls}, no ${CLS_ES[alt]}.${lead} Así sí sería ${toneName(picked)}.` };
  }
  // sin marca, lo normal es haber mirado mal cómo acaba la sílaba
  if (!s.t && toneByRule(s.cls, !s.live, s.long, s.t) === picked) return { step: 'final', text: `Mira cómo acaba: ${ending(s)}.` };
  if (!s.t && !s.live && toneByRule(s.cls, s.live, !s.long, s.t) === picked)
    return { step: 'final', text: `Muerta y de clase baja: con vocal ${s.long ? 'larga cae (descendente)' : 'corta salta (alto)'}; con ${s.long ? 'corta saltaría' : 'larga caería'}.` };
  for (const alt of ['', '่', '้', ...(s.cls === 'media' ? ['๊', '๋'] : [])].filter((t) => t !== s.t)) {
    if (toneByRule(s.cls, s.live, s.long, alt) !== picked) continue;
    const m = markOf(s.t);
    if (!m) return { step: 'marca', text: `No lleva marca: aquí decide cómo acaba la sílaba (${ending(s)}).` };
    return { step: 'marca', text: alt ? `Mira bien la marca: es ${DOT}${s.t} (${m.rom}), no ${DOT}${alt}.` : `Lleva ${DOT}${s.t} (${m.rom}): con marca ya no importa cómo acaba la sílaba.` };
  }
  return { step: s.t ? 'marca' : 'final', text: `Clase ${cls} + ${s.live ? 'viva' : 'muerta'} + ${markOf(s.t)?.rom ?? 'sin marca'} = tono ${toneName(s.tone)}.` };
}

/** Dónde se escribe una vocal respecto a su consonante: «delante y encima». */
export function whereVowel(form: VowelForm): string {
  const p = vowelParts(form.ch);
  const parts = [p.pre ? 'delante' : '', p.on ? ('ุู'.includes(p.on) ? 'debajo' : 'encima') : '', p.post ? 'detrás' : ''].filter(Boolean);
  if (!parts.length) return 'no se escribe: entre dos consonantes se lee una «o» corta';
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0];
  return `se escribe ${list} de la consonante`;
}
