// Juego 11 · La palabra perdida. Una hoja de palmera (ใบลาน, los manuscritos de los templos Lanna) guarda una frase
// a la que le falta una palabra: el hueco brilla, dice qué tipo de palabra falta y la lupa de Noi lo vigila. Elige la
// ficha de laca: vuela al hueco, un barrido de luz recorre la hoja y suena la frase entera. Después se explica qué
// hace esa palabra (la nota del temario o su categoría: partícula, pregunta, verbo…).
// Cuatro retos: el hueco · «al revés» (la palabra brilla y hay que decir qué significa, sin la traducción delante) ·
// dos huecos (primero uno y luego el otro) · la intrusa (suena la frase y una palabra escrita no es la que suena:
// hay que tocarla en la hoja). Las fichas no llevan traducción: si hace falta, la lupa de Noi la enseña (sin bonus
// y sin contar para el repaso). Una ficha de sobra nunca es una palabra que también valdría en el hueco.
// Feria: tres niveles, una vela que se consume (bonus por rapidez), combos que multiplican, el farol que se enciende
// con tres aciertos y vuelve dorada la hoja siguiente (×2), y lo que se falla vuelve unas rondas después.
import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { NoiPose } from '@/brand/noi-art';
import { color, font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Btn, Rom, SpeakBtn, Th, Txt } from '@/components/ui';
import type { Category, Sentence, Word } from '@/content/types';
import { fx, say, stopSpeech } from '@/lib/audio';
import { pick, shuffle } from '@/lib/random';
import { joinThai, personalize, personalizeRom, type Gender } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { Countdown, Floaty, Glow, Pop, Press3D, Shine, useJuice, type Point } from './fx';
import { DrainBar, GameHud, WORD_BY_TH, clamp, measureBox, shortEs, useLater, wordIn, type Box, type ViewRef } from './frases/shared';
import { BAD_LINES, OK_LINES, useScore } from './kit';
import type { GameProps } from './types';

// ——— Datos ———

/** `word`: la palabra del palabrario que es esta ficha en su frase (con เลย, ไหม o ถูก, el significado que toca). */
type Tok = { th: string; rom: string; raw: string; word?: Word };
type Src = { toks: Tok[]; rom: string; es: string; phrase: string };
type Answer = { th: string; rom: string; es: string; full: string; cat?: Category; note?: string; id?: string };
/** `slot`: el hueco en el que va esta ficha (−1: en ninguno, es de sobra). */
type Opt = { key: string; th?: string; rom?: string; es: string; slot: number };
/** fill: un hueco · meaning: qué significa la que brilla · double: dos huecos · spot: tocar la palabra intrusa. */
type Kind = 'fill' | 'meaning' | 'double' | 'spot';
/**
 * `gaps`: las posiciones que se preguntan (en `spot`, dónde está la intrusa) y `answers`, la palabra de cada una.
 * `intruder`: lo que hay escrito en lugar de la palabra buena (solo `spot`).
 */
type Item = { key: string; src: Src; kind: Kind; gaps: number[]; answers: Answer[]; intruder?: Tok; gold: boolean; retry: boolean; level: number; options: Opt[] };

/** Partículas y pronombres que dependen de quién habla: nunca como opción (serían una trampa). */
const GENDERED = new Set(['ครับ', 'ค่ะ', 'คะ', 'ผม', 'ฉัน', 'ดิฉัน']);

/**
 * Familias de palabras que pueden ocupar el mismo hueco sin que la frase deje de ser buena thai (y sin que la
 * traducción las distinga): nunca se ofrece una como ficha de sobra cuando la respuesta es otra de su familia.
 */
const FAMILIES: string[][] = [
  // dónde
  ['ที่ไหน', 'ไหน'],
  // partículas que cierran la frase y solo cambian el tono
  ['นะ', 'สิ', 'เถอะ', 'จ้ะ', 'จ๊ะ', 'จ้า', 'น่ะ', 'หรอก', 'เลย', 'จัง', 'ด้วย', 'ล่ะ'],
  // preguntas de sí o no
  ['ไหม', 'หรือยัง', 'เหรอ', 'หรือเปล่า', 'หรือไม่', 'หรือ', 'เปล่า'],
  // y · con · y luego
  ['กับ', 'และ', 'แล้วก็', 'แล้ว', 'ด้วย', 'รวมทั้ง', 'ต่อมา', 'ค่อย'],
  // así que · entonces
  ['เลย', 'ก็', 'ดังนั้น', 'เพราะฉะนั้น', 'งั้น'],
  // muy
  ['มาก', 'จัง', 'เลย', 'จริงๆ', 'ที่สุด'],
  // si · aunque · porque · mientras
  ['ถ้า', 'ถ้าเกิด'],
  ['แม้', 'ถึงแม้ว่า'],
  ['เพราะ', 'เนื่องจาก'],
  ['ระหว่างที่', 'ขณะที่', 'ระหว่าง', 'ตอน', 'เวลา'],
  // quizá · seguramente
  ['อาจ', 'อาจจะ', 'คง', 'น่าจะ'],
  // pasivas
  ['ถูก', 'โดน'],
  // solo · casi
  ['แค่', 'เพียง', 'เท่านั้น', 'เฉพาะ'],
  ['แทบ', 'เกือบ'],
  // quién habla y de quién
  ['ผม', 'ฉัน', 'ดิฉัน', 'กระผม', 'เรา', 'พวกเรา'],
  ['เขา', 'เธอ', 'ท่าน', 'มัน', 'คุณ'],
  ['นี้', 'นั้น', 'นี่', 'นั่น', 'อันนี้'],
  // poder · no
  ['ได้', 'เป็น', 'ไหว'],
  ['ไม่', 'ไม่ได้', 'ไม่ค่อย', 'ยังไม่'],
  // querer · ir a
  ['อยาก', 'ต้องการ'],
  ['จะ', 'กำลังจะ'],
];
const KIN: ReadonlyMap<string, Set<string>> = (() => {
  const m = new Map<string, Set<string>>();
  for (const f of FAMILIES) for (const th of f) m.set(th, new Set([...(m.get(th) ?? []), ...f]));
  return m;
})();

/** Los sentidos sueltos de una traducción: «¿dónde?, ¿cuál?» → dónde · cuál; «con; y» → con · y. */
const senses = (es: string) =>
  es
    .split(/[;,/]/)
    .map((x) => x.replace(/\(.*?\)/g, '').replace(/[¿?¡!…«»]/g, '').trim().toLowerCase())
    .filter(Boolean);

/**
 * ¿Podría esta palabra ocupar el sitio de la respuesta? Si es de su familia, si una contiene a la otra
 * (ไหน en ที่ไหน, แล้ว en แล้วก็) o si comparten algún sentido («con; y» y «y»), no sirve como ficha de sobra.
 */
function fits(w: { th: string; es: string }, a: Answer): boolean {
  if (w.th === a.th || KIN.get(a.th)?.has(w.th) || a.th.includes(w.th) || w.th.includes(a.th)) return true;
  const mine = senses(a.full || a.es);
  return senses(w.es).some((x) => mine.includes(x));
}

/** Qué tipo de palabra es y qué hace en la frase. */
const CAT: Partial<Record<Category, { label: string; a: string; tint: string; what: string }>> = {
  particula: { label: 'partícula', a: 'una partícula', tint: '#E0702A', what: 'Una partícula: no se traduce sola, pero cambia el tono o el sentido de la frase.' },
  pregunta: { label: 'pregunta', a: 'una palabra de pregunta', tint: '#7A55D6', what: 'Una palabra de pregunta: qué, quién, dónde, cuánto… Suele ir al final.' },
  verbo: { label: 'verbo', a: 'un verbo', tint: '#2F6FE0', what: 'Un verbo: la acción. En thai no se conjuga nunca.' },
  conector: { label: 'conector', a: 'un conector', tint: '#13856B', what: 'Un conector: une palabras o ideas.' },
  pronombre: { label: 'pronombre', a: 'un pronombre', tint: '#C93F7C', what: 'Un pronombre: quién hace la acción (y a menudo se omite).' },
  adjetivo: { label: 'adjetivo', a: 'un adjetivo', tint: '#A86F00', what: 'Un adjetivo: cómo es algo. Va detrás de lo que describe.' },
  tiempo: { label: 'tiempo', a: 'una palabra de tiempo', tint: '#0E7DA6', what: 'Una palabra de tiempo: cuándo pasa algo.' },
  numero: { label: 'número', a: 'un número', tint: '#4F5FD0', what: 'Un número: va delante del clasificador.' },
  lugar: { label: 'lugar', a: 'un lugar', tint: '#2E8B57', what: 'Un lugar o una dirección.' },
  saludo: { label: 'saludo', a: 'un saludo', tint: '#D2457F', what: 'Una fórmula para saludar o despedirse.' },
  cortesia: { label: 'cortesía', a: 'una fórmula de cortesía', tint: '#D2457F', what: 'Una fórmula de cortesía.' },
};
const catOf = (c?: Category) => (c && CAT[c]) || { label: 'palabra', a: 'una palabra', tint: '#8A5A2B', what: '' };
const GAP_SCORE: Partial<Record<Category, number>> = { pregunta: 4, particula: 3.5, conector: 3, verbo: 3, pronombre: 2, tiempo: 1.5, adjetivo: 1.5, numero: 1.5 };

function toSrc(s: Sentence, g: Gender): Src {
  const roms = s.rom.split(/\s+/).filter(Boolean);
  const aligned = roms.length === s.th.length;
  const toks = s.th.map((raw, i) => {
    const th = personalize(raw, g);
    const word = wordIn(th, s);
    return { raw, th, word, rom: aligned ? personalizeRom(roms[i], g) : (word?.rom ?? '') };
  });
  return { toks, rom: personalizeRom(s.rom, g), es: s.es, phrase: joinThai(toks.map((t) => t.th)) };
}

/** Cuánto interesa preguntar cada posición: mejor una partícula, una pregunta o un verbo; nunca la partícula de cortesía (depende de quién habla). */
function gapScores(src: Src, prefer: Set<string>, avoid = -1, done?: Set<string>): number[] {
  return src.toks.map((t, i) => {
    if (/\{PQ?\}/.test(t.raw)) return -9;
    const w = t.word;
    if (!w) return -9;
    let v = (w.cat && GAP_SCORE[w.cat]) ?? 1;
    if (t.raw.includes('{I}')) v = 0.4;
    if (prefer.has(t.th)) v += 2;
    if (i === avoid) v -= 1.2;
    if (done?.has(t.th)) v -= 2.5;
    return v;
  });
}

/** La mejor posición (o una de las mejores, al azar); −1 si ninguna sirve (las ya preguntadas sirven, si no hay otra). */
function bestGap(scores: number[]): number {
  const best = Math.max(...scores);
  if (best < -5) return -1;
  return pick(scores.flatMap((v, i) => (v >= best - 0.6 ? [i] : [])));
}

function answerOf(t: Tok): Answer {
  const w = t.word;
  return { th: t.th, rom: t.rom || w?.rom || '', es: w ? shortEs(w.es) : '', full: w?.es ?? '', cat: w?.cat, note: w?.note, id: w?.id };
}

const isClf = (es: string) => es.startsWith('clasificador');

/**
 * Fichas de sobra para unos huecos: de la misma categoría si se puede, y nunca una palabra que también valdría
 * (misma familia o sentido), ni de la propia frase, ni las que dependen de quién habla. Con un clasificador,
 * tampoco อัน: es el comodín y casi siempre vale.
 */
function distractors(answers: Answer[], own: Set<string>, pool: Word[], n: number): Word[] {
  const clf = answers.some((a) => isClf(a.full));
  const cats = new Set(answers.map((a) => a.cat));
  const used = new Set(answers.map((a) => a.th));
  const glosses = new Set(answers.map((a) => a.es));
  const out: Word[] = [];
  const same = shuffle(pool.filter((w) => cats.has(w.cat)));
  const rest = shuffle(pool.filter((w) => !cats.has(w.cat)));
  // con un clasificador, primero otros clasificadores; si aún no se conoce ninguno más, valen otras palabras
  for (const strict of [true, false]) {
    for (const w of [...same, ...rest]) {
      if (out.length >= n) break;
      const es = shortEs(w.es);
      if (used.has(w.th) || own.has(w.th) || GENDERED.has(w.th) || glosses.has(es) || w.th.length > 12 || (clf && w.th === 'อัน')) continue;
      if (strict ? isClf(w.es) !== clf : !clf) continue;
      if (answers.some((a) => fits(w, a))) continue;
      used.add(w.th);
      glosses.add(es);
      out.push(w);
    }
  }
  return out;
}

const wordOpt = (w: Word, key: string): Opt => ({ key, th: w.th, rom: w.rom, es: shortEs(w.es), slot: -1 });

/** «Al revés»: qué significa la que brilla. Las otras opciones salen primero de la propia frase (hay que saber cuál es cuál). */
function meaningOptions(a: Answer, src: Src, gap: number, pool: Word[], n: number): Opt[] {
  const clf = isClf(a.full);
  const seen = [a.es.toLowerCase()];
  const out: Opt[] = [{ key: 'a0', es: a.es, slot: 0 }];
  const mates = shuffle(src.toks.flatMap((t, k) => (k !== gap && t.word && !t.raw.includes('{') ? [t.word] : []))).slice(0, 2);
  const same = shuffle(pool.filter((w) => w.cat === a.cat));
  const rest = shuffle(pool.filter((w) => w.cat !== a.cat));
  for (const w of [...mates, ...same, ...rest]) {
    if (out.length >= n) break;
    const es = shortEs(w.es);
    const k = es.toLowerCase();
    if (es.length > 24 || isClf(w.es) !== clf || fits(w, a) || seen.some((x) => x === k || x.includes(k) || k.includes(x))) continue;
    seen.push(k);
    out.push({ key: `o${out.length}`, es, slot: -1 });
  }
  return shuffle(out);
}

type Recipe = { src: Src; pool: Word[]; prefer: Set<string>; key: string; kind: Kind; level: number; nOpt: number; retry?: boolean; avoid?: number; done?: Set<string> };

/**
 * Una ronda de un tipo con una frase; `null` si esa frase no da para ese tipo (el que llama prueba con «fill»).
 * Se pregunta por la mejor posición; si con esa no salen fichas de sobra, por la siguiente.
 */
function buildItem(recipe: Recipe): Item | null {
  const { src, prefer, avoid = -1, done } = recipe;
  const scores = gapScores(src, prefer, avoid, done);
  const first = bestGap(scores);
  if (first < 0) return null;
  const others = scores.flatMap((v, k) => (k !== first && v > -5 ? [k] : [])).sort((x, y) => scores[y] - scores[x]);
  for (const k of [first, ...others]) {
    const it = itemAt(recipe, scores, k);
    if (it) return it;
  }
  return null;
}

function itemAt({ src, pool, key, kind, level, nOpt, retry = false }: Recipe, scores: number[], first: number): Item | null {
  const a = answerOf(src.toks[first]);
  if (!a.es) return null;
  const base = { key, src, gold: false, retry, level };
  const own = new Set(src.toks.map((t) => t.th));

  if (kind === 'meaning') {
    const options = meaningOptions(a, src, first, pool, nOpt);
    return options.length >= 2 ? { ...base, kind, gaps: [first], answers: [a], options } : null;
  }
  if (kind === 'spot') {
    // la intrusa: otra palabra del mismo tipo que no valdría ahí
    const w = src.toks.length >= 3 ? distractors([a], own, pool, 1)[0] : undefined;
    return w ? { ...base, kind, gaps: [first], answers: [a], intruder: { th: w.th, rom: w.rom, raw: w.th, word: w }, options: [] } : null;
  }
  if (kind === 'double') {
    const second = src.toks.length >= 4 ? bestGap(scores.map((v, k) => (k === first || src.toks[k].th === a.th ? -9 : v))) : -1;
    if (second < 0 || !answerOf(src.toks[second]).es) return null;
    const gaps = [first, second].sort((x, y) => x - y);
    const answers = gaps.map((k) => answerOf(src.toks[k]));
    const extra = distractors(answers, own, pool, Math.max(1, nOpt - 2));
    if (!extra.length) return null;
    const options = shuffle([...answers.map((x, slot): Opt => ({ key: `a${slot}`, th: x.th, rom: x.rom, es: x.es, slot })), ...extra.map((w, k) => wordOpt(w, `o${k}`))]);
    return { ...base, kind, gaps, answers, options };
  }
  const extra = distractors([a], own, pool, nOpt - 1);
  if (!extra.length) return null;
  const options = shuffle([{ key: 'a0', th: a.th, rom: a.rom, es: a.es, slot: 0 }, ...extra.map((w, k) => wordOpt(w, `o${k}`))]);
  return { ...base, kind: 'fill', gaps: [first], answers: [a], options };
}

function makeItems(mode: GameProps['mode'], sentences: Sentence[], words: Word[], focus: Word[], g: Gender, n: number): { items: Item[]; pool: Word[] } {
  const seen = new Set<string>();
  const pool: Word[] = [];
  const add = (w?: Word) => {
    if (w && !seen.has(w.id)) {
      seen.add(w.id);
      pool.push(w);
    }
  };
  words.forEach(add);
  sentences.forEach((s) => s.th.forEach((t) => add(wordIn(personalize(t, g), s))));
  const prefer = new Set(focus.map((w) => w.th));

  let srcs = sentences.filter((s, i, all) => s.th.length >= 2 && all.findIndex((x) => x.id === s.id) === i).map((s) => toSrc(s, g));
  if (!srcs.length) {
    // sin frases: tríos de palabras de la lección
    const ws = [...focus, ...words].filter((w, i, all) => !GENDERED.has(w.th) && all.findIndex((x) => x.id === w.id) === i);
    if (ws.length < 3) return { items: [], pool };
    srcs = Array.from({ length: Math.max(1, n) }, () => {
      const three = shuffle(ws).slice(0, 3);
      const toks = three.map((w) => ({ raw: w.th, th: w.th, rom: w.rom, word: w }));
      return { toks, rom: three.map((w) => w.rom).join(' '), es: three.map((w) => shortEs(w.es)).join(' · '), phrase: joinThai(three.map((w) => w.th)) };
    });
  }

  const items: Item[] = [];
  const lastGap = new Map<Src, number>();
  const done = new Set<string>();
  /** Añade una ronda de ese tipo con esa frase (o, si la frase no da para tanto, una de hueco). */
  const push = (src: Src, kind: Kind, level: number, nOpt: number) => {
    const recipe = { src, pool, prefer, key: `r${items.length}`, level, nOpt, avoid: lastGap.get(src), done };
    const it = buildItem({ ...recipe, kind }) ?? (kind === 'fill' ? null : buildItem({ ...recipe, kind: 'fill' }));
    if (!it) return;
    lastGap.set(src, it.gaps[0]);
    for (const a of it.answers) done.add(a.th);
    while (done.size > 6) done.delete(done.values().next().value as string);
    items.push(it);
  };

  if (mode === 'leccion') {
    const withFocus = srcs.filter((s) => s.toks.some((t) => prefer.has(t.th)));
    const order = [...shuffle(withFocus), ...shuffle(srcs.filter((s) => !withFocus.includes(s)))];
    for (let tries = 0; items.length < n && tries < n * 6; tries++) push(order[tries % order.length], items.length % 2 ? 'meaning' : 'fill', 1, 3);
    return { items, pool };
  }

  // con muy poco que preguntar la partida se acorta: cada palabra sale, como mucho, dos veces
  const askable = srcs.reduce((sum, s) => sum + gapScores(s, prefer).filter((v) => v > -5).length, 0);
  n = Math.min(n, Math.max(3, askable * 2));
  const levels = Array.from({ length: n }, (_, i) => (i < Math.round(n * 0.3) ? 1 : i < Math.round(n * 0.7) ? 2 : 3));
  const kinds: Kind[] = levels.map(() => 'fill');
  const at = (lv: number) => shuffle(levels.flatMap((l, i) => (l === lv && i < n - 1 ? [i] : [])));
  // nivel 2: una «al revés» y una intrusa · nivel 3: dos huecos y otra intrusa
  at(2).slice(0, 2).forEach((i, k) => (kinds[i] = k ? 'spot' : 'meaning'));
  at(3).slice(0, 2).forEach((i, k) => (kinds[i] = k ? 'spot' : 'double'));
  const order = shuffle(srcs);
  for (let tries = 0, turn = 0; items.length < n && tries < n * 6; tries++) {
    const kind = kinds[items.length];
    const prev = items[items.length - 1]?.src;
    // dos huecos y la intrusa piden frases con cuerpo; las demás van por turno. Nunca la misma dos veces seguidas.
    const roomy = kind === 'double' || kind === 'spot' ? shuffle(order.filter((s) => s !== prev && s.toks.length >= (kind === 'double' ? 4 : 3))) : [];
    let src = roomy[0];
    if (!src) {
      src = order[turn++ % order.length];
      if (src === prev && order.length > 1) src = order[turn++ % order.length];
    }
    push(src, kind, levels[items.length], levels[items.length] === 1 ? 3 : 4);
  }
  return { items, pool };
}

// ——— Juego ———

type Phase = 'intro' | 'ask' | 'reveal';
type Clock = { start: number; ms: number };
/** Reloj del bonus (solo se usa en manejadores: la barra es solo para verlo). */
const clockFrom = (delay: number, ms: number): Clock => ({ start: Date.now() + delay, ms });
const remaining = (c: Clock) => clamp(1 - (Date.now() - c.start) / c.ms, 0, 1);
type Flight = { key: string; th: string; from: Box; to: Point };
/** Qué ha pasado con una ficha: acertada, fallada o ya colocada en su hueco. */
type TileMark = 'ok' | 'bad' | 'gone';
const TIME = [0, 15000, 12000, 9500];
/** Aciertos seguidos que encienden el farol (y vuelven dorada la hoja siguiente). */
const LANTERN = 3;
const ASK: Record<Kind, string> = {
  fill: '¿Qué palabra falta?',
  double: 'Faltan dos: ¿cuál va en el hueco que brilla?',
  meaning: '¿Qué significa la palabra que brilla?',
  spot: 'Escucha: ¿qué palabra escrita no es la que suena?',
};
const SPECIAL: Partial<Record<Kind, { t: string; sub: string; tint: string }>> = {
  meaning: { t: '¡Al revés!', sub: '¿Qué significa la que brilla?', tint: color.mohom },
  double: { t: '¡Dos huecos!', sub: 'Primero uno y luego el otro', tint: color.arrozal },
  spot: { t: '¡Hay una intrusa!', sub: 'Una palabra escrita no es la que suena', tint: color.cieloHondo },
};

/** Juego · La palabra perdida. Sin frases ni palabras con las que hacer rondas no hay partida: se cierra enseguida. */
export default function Hueco(props: GameProps) {
  const { mode, sentences, words, focus, gender, rounds, onDone } = props;
  const [setup] = useState(() => makeItems(mode, sentences, words, focus, gender, rounds ?? (mode === 'feria' ? 10 : 2)));
  const bail = useEffectEvent(() => onDone({ correct: 0, total: 0, bananas: 0, score: 0 }));
  useEffect(() => {
    if (!setup.items.length) bail();
  }, [setup]);
  return setup.items.length ? <HuecoGame {...props} setup={setup} /> : <View style={{ flex: 1 }} />;
}

function HuecoGame({ mode, reads, onAnswer, onDone, setup }: GameProps & { setup: ReturnType<typeof makeItems> }) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const later = useLater();
  const [items, setItems] = useState(setup.items);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>(feria ? 'intro' : 'ask');
  // huecos ya resueltos de esta ronda (acertado o no): el siguiente es el que se pregunta
  const [marks, setMarks] = useState<boolean[]>([]);
  const [picked, setPicked] = useState<Record<string, TileMark>>({});
  const [miss, setMiss] = useState(false);
  const [busy, setBusy] = useState(false);
  const [badTok, setBadTok] = useState(-1);
  const [hinted, setHinted] = useState(false);
  const [shine, setShine] = useState(0);
  const [points, setPoints] = useState(0);
  const [gained, setGained] = useState(0);
  const [lantern, setLantern] = useState(0);
  const [fuse, setFuse] = useState(0);
  const [pose, setPose] = useState<NoiPose>('piensa');
  const [jump, setJump] = useState(0);
  const [line, setLine] = useState('');
  const [flight, setFlight] = useState<Flight | null>(null);
  const rootRef = useRef<ViewRef>(null);
  const gapA = useRef<ViewRef>(null);
  const gapB = useRef<ViewRef>(null);
  const game = useRef({
    points: 0,
    finished: false,
    clock: { start: 0, ms: 1 },
    /** ronda que avanzará sola cuando acabe de sonar (vacío: espera al botón) */
    adv: '',
    retries: 0,
    /** cada cosa que se dice lleva su número: lo que llega de una voz anterior se ignora */
    voice: 0,
    busy: false,
    hinted: false,
    gain: 0,
    lantern: 0,
    /** la ronda que está en pantalla */
    round: setup.items[0].key,
  });
  const api = useRef({ advance: () => {}, begin: () => {} });
  const bonus = useSharedValue(1);

  const item = items[i];
  const level = item.level;
  const hideTag = feria && level >= 3;
  // Transcripción: siempre mientras no se sabe leer; después, solo en el primer nivel de la feria y en la
  // primera pasada de la lección (lo que vuelve por haberse fallado ya se lee sin ayuda).
  const romOn = !reads || (feria ? level <= 1 : !item.retry);

  // ——— Voz ———

  /** Dice algo. `then` solo se llama si acaba de sonar sin que otra cosa lo haya pisado. */
  const speak = (text: string, then?: () => void, slow = false) => {
    const g = game.current;
    g.voice += 1;
    const id = g.voice;
    say(text, {
      slow,
      onDone: then
        ? () => {
            if (game.current.voice === id) then();
          }
        : undefined,
    });
  };

  /** Lee la frase sin lo que aún falta: cada hueco por rellenar suena como una gota, no como su palabra. */
  const speakGapped = (it: Item, solved: number) => {
    const g = game.current;
    g.voice += 1;
    const id = g.voice;
    const parts: string[] = [];
    let from = 0;
    for (const k of it.gaps.slice(solved)) {
      parts.push(joinThai(it.src.toks.slice(from, k).map((t) => t.th)));
      from = k + 1;
    }
    parts.push(joinThai(it.src.toks.slice(from).map((t) => t.th)));
    const step = (n: number) => {
      if (game.current.voice !== id || n >= parts.length) return;
      const drop = () => {
        if (game.current.voice !== id || n >= parts.length - 1) return;
        fx.plip();
        later(() => step(n + 1), 420);
      };
      if (parts[n]) say(parts[n], { onDone: () => later(drop, 120) });
      else drop();
    };
    step(0);
  };

  // ——— Rondas ———

  const startClock = (it: Item, delay: number) => {
    if (!feria) return;
    // dos huecos llevan más tiempo; en la intrusa, además, hay que oír la frase
    const ms = (TIME[it.level] ?? 12000) * (it.kind === 'double' ? 1.6 : 1) + (it.kind === 'spot' ? 4000 : 0);
    game.current.clock = clockFrom(delay, ms);
    bonus.set(1);
    bonus.set(withDelay(delay, withTiming(0, { duration: ms, easing: Easing.linear })));
  };

  const begin = () => {
    setPhase('ask');
    startClock(item, 0);
    if (item.kind === 'spot') later(() => speak(item.src.phrase), 250);
  };
  const [onCountdown] = useState(() => () => api.current.begin());

  const slot = marks.length;
  const cat = catOf(item.answers[Math.min(slot, item.answers.length - 1)].cat);
  const last = i + 1 >= items.length;

  // ——— Responder ———

  /** El farol: cada acierto lo carga, cada fallo le quita una llama. */
  const light = (ok: boolean) => {
    if (!feria) return;
    const g = game.current;
    const was = g.lantern;
    g.lantern = clamp(was + (ok ? 1 : -1), 0, LANTERN);
    setLantern(g.lantern);
    if (g.lantern === LANTERN && was < LANTERN) {
      later(() => {
        juice.float(undefined, '¡Farol encendido!', color.buatong, 26);
        fx.sparkle();
      }, 500);
    }
  };

  /** Puntos de un acierto (feria). `fast`: con bonus por rapidez (el último hueco de la ronda). */
  const award = (combo: number, fast: boolean) => {
    const g = game.current;
    if (!feria) return 0;
    const gold = item.gold ? 2 : 1;
    // con la lupa de Noi, puntos de consolación: ni racha ni rapidez
    const pts = g.hinted ? 5 : 10 * Math.min(4, 1 + Math.floor(combo / 4)) * gold + (fast ? Math.round(remaining(g.clock) * 10) * gold : 0);
    g.points += pts;
    g.gain += pts;
    setPoints(g.points);
    setGained(g.gain);
    return pts;
  };

  const cheer = (combo: number, at: Point, text: string) => {
    setPose('celebra');
    setJump((j) => j + 1);
    setLine(pick(OK_LINES));
    juice.celebrate(at, text);
    if (combo === 5 || combo === 10 || combo === 15) {
      juice.banner(`¡Racha ×${combo}!`, 'Los puntos se multiplican', color.farol);
      fx.sparkle();
    }
  };

  /** La ronda está resuelta: barrido de luz, la frase entera y la explicación. */
  const settle = (all: boolean[]) => {
    const g = game.current;
    const ok = all.every(Boolean);
    const key = item.key;
    g.busy = false;
    setBusy(false);
    setMiss(false);
    setMarks(all);
    setShine((s) => s + 1);
    setPhase('reveal');
    bonus.set(ok && feria ? remaining(g.clock) : 0);
    // Feria, tras un acierto: la partida sigue sola cuando la frase acaba de sonar y pasa un rato para leer la
    // explicación (más largo cuanto más hay que leer). Tocar la tarjeta, una palabra o el altavoz lo para.
    g.adv = feria && ok ? key : '';
    const what = item.answers[0].note ?? catOf(item.answers[0].cat).what;
    const read = clamp(1300 + what.length * 22, 1600, 4200);
    let armed = false;
    const arm = () => {
      if (armed || game.current.adv !== key) return;
      armed = true;
      setFuse(read);
      later(() => {
        if (game.current.adv === key) api.current.advance();
      }, read);
    };
    later(() => {
      // (si ya se ha pasado a la ronda siguiente, esta frase no suena encima)
      if (game.current.round === key) speak(item.src.phrase, arm);
    }, 300);
    // por si la voz no avisa al acabar (o no hay voz)
    if (g.adv) later(arm, 2500 + item.src.phrase.length * 170);
  };

  /** Deja de avanzar sola: quien juega quiere leer o volver a escuchar. */
  const hold = () => {
    if (!game.current.adv) return;
    game.current.adv = '';
    setFuse(0);
  };

  /** La ficha vuela a su hueco. */
  const fly = (opt: Opt, box: Box, k: number, landed: () => void) => {
    Promise.all([measureBox(rootRef), measureBox(k === 0 ? gapA : gapB)]).then(([root, gap]) => {
      setPicked((p) => ({ ...p, [opt.key]: 'gone' }));
      if (!root || !gap) {
        landed();
        return;
      }
      const to = { x: gap.x - root.x + gap.w / 2, y: gap.y - root.y + gap.h / 2 };
      setFlight({ key: `${item.key}-${k}`, th: opt.th ?? '', from: { x: box.x - root.x, y: box.y - root.y, w: box.w, h: box.h }, to });
      later(() => {
        setFlight(null);
        landed();
        fx.pop();
        juice.burst({ x: gap.x + gap.w / 2, y: gap.y + gap.h / 2 }, 'chispas', 16, 90);
        juice.ring({ x: gap.x + gap.w / 2, y: gap.y + gap.h / 2 }, color.buatong, 90);
      }, 430);
    });
  };

  /** Hueco resuelto: si quedan más, a por el siguiente; si no, se cierra la ronda. */
  const fillGap = (ok: boolean) => {
    const all = [...marks, ok];
    if (all.length >= item.gaps.length) {
      settle(all);
      return;
    }
    game.current.busy = false;
    setBusy(false);
    setMiss(false);
    setMarks(all);
    // las fichas que no han ido a un hueco vuelven a estar todas en juego (también la que se tocó antes de tiempo)
    setPicked((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v === 'gone')));
    setPose('piensa');
  };

  const choose = (opt: Opt, box: Box) => {
    const g = game.current;
    if (phase !== 'ask' || g.busy || picked[opt.key]) return;
    const a = item.answers[slot];
    const ok = opt.slot === slot;
    const final = slot + 1 >= item.gaps.length;
    g.busy = true;
    setBusy(true);
    setPicked((p) => ({ ...p, [opt.key]: ok ? 'ok' : 'bad' }));
    const combo = score.hit(ok);
    // con la lupa la respuesta estaba a la vista: ni sube ni baja la palabra en el repaso
    if (!g.hinted) onAnswer(ok, a.id);
    // (un acierto con lupa tampoco carga el farol)
    if (!(ok && g.hinted)) light(ok);
    const at = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    if (ok) {
      const pts = award(combo, final);
      cheer(combo, at, feria ? `+${pts}` : '¡Bien!');
      if (item.kind === 'meaning') {
        later(() => {
          fx.pop();
          fillGap(true);
        }, 250);
      } else fly(opt, box, slot, () => fillGap(true));
      return;
    }
    // fallo: la buena se ilumina y cae en su sitio
    setMiss(true);
    juice.shake(7);
    setPose('ups');
    setLine(pick(BAD_LINES));
    juice.float(at, opt.th ? (opt.es ? `«${opt.es}»` : '✗') : '✗', color.lacaHondo, 20);
    requeue(a);
    later(() => {
      fx.flip();
      const right = item.options.find((o) => o.slot === slot);
      if (right && item.kind !== 'meaning') setPicked((p) => ({ ...p, [right.key]: 'gone' }));
      fillGap(false);
    }, 650);
  };

  /** La intrusa: se toca en la hoja la palabra que no es la que suena. */
  const spot = (k: number, at: Point) => {
    const g = game.current;
    if (phase !== 'ask' || g.busy) return;
    const ok = k === item.gaps[0];
    g.busy = true;
    setBusy(true);
    const combo = score.hit(ok);
    light(ok);
    if (ok) {
      // ha oído la palabra buena y ha visto que no era la escrita
      onAnswer(true, item.answers[0].id);
      const pts = award(combo, true);
      cheer(combo, at, feria ? `+${pts}` : '¡Pillada!');
      later(() => {
        fx.pop();
        settle([true]);
      }, 350);
      return;
    }
    // tocar una que sí sonaba no dice qué palabra no se sabe: cuenta en la partida, no en el repaso
    setBadTok(k);
    juice.shake(7);
    setPose('ups');
    setLine(pick(BAD_LINES));
    juice.float(at, 'Esa sí suena', color.lacaHondo, 20);
    requeue(item.answers[0]);
    later(() => {
      fx.flip();
      settle([false]);
    }, 750);
  };

  /** Lo fallado vuelve como hueco: en la feria, tres rondas después; en la lección, una vez al final. */
  const requeue = (a: Answer) => {
    const g = game.current;
    const recipe = { src: item.src, pool: setup.pool, prefer: new Set([a.th]), key: `x${item.key}`, kind: 'fill' as const, retry: true };
    if (!feria) {
      if (g.retries > 0) return;
      const it = buildItem({ ...recipe, level: 1, nOpt: 3 });
      if (!it) return;
      g.retries += 1;
      setItems((list) => [...list, it]);
      return;
    }
    // la primera ronda normal a partir de tres más allá (sin pisar las especiales)
    const target = items.findIndex((x, k) => k >= i + 3 && x.kind === 'fill' && !x.gold && !x.retry);
    if (target < 0 || g.retries >= 3) return;
    const lv = items[target].level;
    const it = buildItem({ ...recipe, level: lv, nOpt: lv === 1 ? 3 : 4 });
    if (!it) return;
    g.retries += 1;
    setItems((list) => list.map((x, k) => (k === target ? it : x)));
  };

  /** La lupa de Noi enseña qué significa cada ficha. Ayuda, pero sin bonus y sin contar para el repaso. */
  const hint = () => {
    if (phase !== 'ask' || game.current.hinted) return;
    game.current.hinted = true;
    setHinted(true);
    fx.sparkle();
    juice.float(undefined, feria ? 'Con lupa: sin bonus' : 'Mira qué significa cada una', color.mohom, 20);
  };

  const advance = () => {
    const g = game.current;
    g.adv = '';
    if (i + 1 >= items.length) {
      finish();
      return;
    }
    let nx = items[i + 1];
    // el farol encendido vuelve dorada la hoja siguiente (si es de huecos y no es un repaso)
    const lit = feria && g.lantern >= LANTERN && (nx.kind === 'fill' || nx.kind === 'double') && !nx.retry;
    if (lit) {
      g.lantern = 0;
      setLantern(0);
      nx = { ...nx, gold: true };
      const golden = nx;
      setItems((list) => list.map((x, k) => (k === i + 1 ? golden : x)));
    }
    g.busy = false;
    g.hinted = false;
    g.gain = 0;
    g.round = nx.key;
    // lo que estuviera sonando de la ronda anterior se calla: no pisa la pregunta nueva
    g.voice += 1;
    stopSpeech();
    setI(i + 1);
    setMarks([]);
    setPicked({});
    setMiss(false);
    setBusy(false);
    setBadTok(-1);
    setHinted(false);
    setFlight(null);
    setGained(0);
    setFuse(0);
    setPose('piensa');
    setLine('');
    setPhase('ask');
    const up = feria && nx.level > item.level;
    if (up) {
      juice.banner(`¡Nivel ${nx.level}!`, nx.level === 2 ? (reads ? 'Cuatro fichas y sin transcripción' : 'Cuatro fichas y retos nuevos') : 'Sin pistas ni lupa: ¡a leer!', color.farol);
      fx.levelup();
    }
    const sp = nx.retry
      ? { t: '¡Otra vez!', sub: 'Esta se te escapó', tint: color.cieloHondo }
      : nx.gold
        ? { t: '¡Hoja dorada!', sub: 'El farol la ilumina: puntos ×2', tint: color.buatongHondo }
        : feria
          ? SPECIAL[nx.kind]
          : undefined;
    if (sp) {
      later(
        () => {
          juice.banner(sp.t, sp.sub, sp.tint);
          fx.sparkle();
        },
        up ? 1350 : 120,
      );
    }
    const wait = up && sp ? 2500 : up || sp ? 1250 : 0;
    startClock(nx, wait);
    if (nx.kind === 'spot') later(() => speak(nx.src.phrase), wait + 250);
  };

  const finish = () => {
    const g = game.current;
    if (g.finished) return;
    g.finished = true;
    if (!feria) {
      onDone(score.result(g.points));
      return;
    }
    juice.banner('¡Manuscrito completo!', `${g.points} puntos`, color.arrozal);
    juice.burst(undefined, 'petalos', 28, 170);
    fx.fanfare();
    later(() => onDone(score.result(g.points)), 1400);
  };

  useEffect(() => {
    api.current = { advance, begin };
  });

  /** Tocar una palabra de la hoja: en la intrusa es la respuesta; si no, suena y dice qué significa. */
  const tapToken = (k: number, at: Point) => {
    if (item.kind === 'spot' && phase === 'ask') {
      spot(k, at);
      return;
    }
    hold();
    const t = item.src.toks[k];
    speak(t.th);
    // «al revés»: la que brilla suena, pero no dice lo que significa hasta responder
    if (item.kind === 'meaning' && k === item.gaps[0] && phase === 'ask') return;
    const w = t.word ?? WORD_BY_TH.get(t.th);
    if (w) juice.float(at, shortEs(w.es), color.mohom, 18);
  };

  /** El altavoz de la hoja: mientras se pregunta por un hueco, la frase suena sin la palabra que falta. */
  const listen = (slow = false) => {
    hold();
    if (phase === 'ask' && (item.kind === 'fill' || item.kind === 'double')) speakGapped(item, marks.length);
    else speak(item.src.phrase, undefined, slow);
  };

  const canHint = phase === 'ask' && (item.kind === 'fill' || item.kind === 'double') && !hinted && !(feria && level >= 3);
  const ask = item.kind === 'double' && slot > 0 ? '¿Y en el otro hueco?' : ASK[item.kind];
  const tileState = (o: Opt): TileState => {
    const p = picked[o.key];
    if (p === 'bad') return 'bad';
    if (p) return 'ok';
    if (miss && o.slot === slot) return 'hint';
    return busy ? 'dim' : 'idle';
  };

  return (
    <View ref={rootRef} style={{ flex: 1 }}>
      <Backdrop scene="templo" />
      <Animated.View style={[{ flex: 1 }, juice.shakeStyle]}>
        <GameHud label="PALABRA" i={i + 1} n={items.length} points={feria ? points : undefined} combo={score.combo} />
        <Leaf item={item} marks={marks} asking={phase !== 'reveal'} badTok={badTok} shine={shine} hideTag={hideTag} rom={romOn} gapRefs={[gapA, gapB]} onToken={tapToken} onListen={() => listen()} />
        {feria ? (
          <View style={styles.clock}>
            <Candle />
            <DrainBar value={bonus} height={7} />
            <Lantern lit={lantern} />
          </View>
        ) : null}

        <View style={styles.noiRow}>
          <Noi pose={pose} size={74} jump={jump} />
          <View style={styles.bubble}>
            <View style={styles.bubbleTail} />
            <Text style={styles.bubbleText} numberOfLines={2}>
              {phase === 'reveal' ? line : ask}
            </Text>
            {phase === 'ask' && (item.kind === 'fill' || item.kind === 'double') && !hideTag ? <Text style={[styles.bubbleSub, { color: cat.tint }]}>Pista: falta {cat.a}</Text> : null}
          </View>
          {canHint ? <HintBtn onPress={hint} /> : null}
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 10 }}>
          {phase === 'reveal' ? (
            <Reveal item={item} marks={marks} gained={gained} feria={feria} last={last} fuse={fuse} onHold={hold} onNext={advance} />
          ) : item.kind === 'spot' ? (
            <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.spot}>
              <Text style={styles.spotTitle}>Una palabra de la hoja no es la que suena</Text>
              <Text style={styles.spotSub}>Escucha la frase y toca la intrusa</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <SpeakBtn size={56} onPress={() => listen()} />
                <SpeakBtn size={48} slow onPress={() => listen(true)} />
              </View>
            </Animated.View>
          ) : (
            <View style={styles.grid}>
              {item.options.map((o, k) => (
                <OptionTile
                  key={`${item.key}-${o.key}`}
                  opt={o}
                  k={k}
                  rom={romOn}
                  gloss={hinted}
                  state={tileState(o)}
                  hidden={picked[o.key] === 'gone'}
                  disabled={phase !== 'ask' || busy || !!picked[o.key]}
                  onChoose={choose}
                />
              ))}
            </View>
          )}
        </View>
      </Animated.View>
      {flight ? <Flyer key={flight.key} f={flight} /> : null}
      {phase === 'intro' ? <Countdown onDone={onCountdown} /> : null}
      {juice.layer}
    </View>
  );
}

// ——— La hoja de palmera ———

function Leaf({
  item,
  marks,
  asking,
  badTok,
  shine,
  hideTag,
  rom,
  gapRefs,
  onToken,
  onListen,
}: {
  item: Item;
  marks: boolean[];
  asking: boolean;
  badTok: number;
  shine: number;
  hideTag: boolean;
  rom: boolean;
  gapRefs: RefObject<ViewRef | null>[];
  onToken: (k: number, at: Point) => void;
  onListen: () => void;
}) {
  const u = `lf${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const toks = item.src.toks;
  const chars = toks.reduce((n, t) => n + t.th.length, 0);
  const fs = chars > 30 ? 21 : chars > 20 ? 24 : 27;
  const holes = item.kind === 'fill' || item.kind === 'double';
  const swapped = item.kind === 'spot' && asking;
  const romLine = toks
    .map((t, k) => {
      const hole = holes ? item.gaps.indexOf(k) : -1;
      if (hole >= marks.length) return '___';
      return swapped && k === item.gaps[0] ? (item.intruder?.rom ?? t.rom) : t.rom;
    })
    .join(' ');
  const gold = item.gold;
  return (
    <View style={styles.leafWrap}>
      <View style={[styles.leaf, gold ? { borderColor: '#E9A800' } : null]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={gold ? '#FFF2B8' : '#F7EACB'} />
              <Stop offset="0.55" stopColor={gold ? '#F6D66B' : '#EDD9A6'} />
              <Stop offset="1" stopColor={gold ? '#E2B33C' : '#D9BC7E'} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${u}g)`} />
          {[0.14, 0.3, 0.46, 0.62, 0.78, 0.92].map((y) => (
            <Line key={y} x1="2%" y1={`${y * 100}%`} x2="98%" y2={`${y * 100 + 0.6}%`} stroke="#B9965A" strokeWidth={0.8} strokeOpacity={0.35} />
          ))}
          <Circle cx="9%" cy="50%" r={5} fill="#8A6A3A" opacity={0.55} />
          <Circle cx="91%" cy="50%" r={5} fill="#8A6A3A" opacity={0.55} />
          <Circle cx="9%" cy="50%" r={2.4} fill="#5A3E1E" opacity={0.7} />
          <Circle cx="91%" cy="50%" r={2.4} fill="#5A3E1E" opacity={0.7} />
        </Svg>
        <View style={[styles.tokens, { minHeight: fs * 1.7 }]}>
          {toks.map((t, k) => {
            const hole = holes ? item.gaps.indexOf(k) : -1;
            if (hole >= 0)
              return (
                <GapSlot key={k} th={t.th} fs={fs} filled={hole < marks.length} ok={marks[hole] !== false} active={asking && hole === marks.length} tag={hideTag ? null : catOf(item.answers[hole].cat)} gapRef={gapRefs[hole]} />
              );
            const here = k === item.gaps[0];
            if (item.kind === 'spot')
              return (
                <Token key={k} k={k} th={swapped && here ? (item.intruder?.th ?? t.th) : t.th} fs={fs} hi={false} fixed={!asking && here} wrong={badTok === k} tag={!asking && here && item.intruder ? `ponía ${item.intruder.th}` : undefined} onTap={onToken} />
              );
            const hi = item.kind === 'meaning' && here;
            return <Token key={k} k={k} th={t.th} fs={fs} hi={hi && asking} fixed={hi && !asking} tag={hi && !asking ? item.answers[0].es : undefined} gapRef={hi ? gapRefs[0] : undefined} onTap={onToken} />;
          })}
        </View>
        {rom || !asking ? <Rom rom={romLine} size={14} style={{ textAlign: 'center', paddingHorizontal: 18 }} /> : null}
        <View style={styles.ribbon}>
          {/* «al revés»: la traducción diría la respuesta, así que espera */}
          <Text style={styles.ribbonText}>{item.kind === 'meaning' && asking ? '¿…?' : item.src.es}</Text>
          <SpeakBtn size={34} onPress={onListen} />
        </View>
        <Shine trigger={shine} />
      </View>
    </View>
  );
}

/**
 * Una palabra de la hoja. `hi`: brilla y la lupa la mira (se pregunta por ella) · `fixed`: ya resuelta, en verde,
 * con su etiqueta (`tag`) · `wrong`: se ha tocado creyendo que era la intrusa.
 */
function Token({ k, th, fs, hi, fixed, wrong, tag, gapRef, onTap }: { k: number; th: string; fs: number; hi: boolean; fixed?: boolean; wrong?: boolean; tag?: string; gapRef?: RefObject<ViewRef | null>; onTap: (k: number, at: Point) => void }) {
  const shake = useSharedValue(0);
  useEffect(() => {
    if (wrong) shake.value = withSequence(withTiming(-6, { duration: 50 }), withTiming(6, { duration: 60 }), withTiming(-4, { duration: 60 }), withTiming(0, { duration: 60 }));
  }, [wrong, shake]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  return (
    <Animated.View ref={gapRef} collapsable={false} style={[{ alignItems: 'center' }, st]}>
      {hi ? <Glow size={fs * 3.4} tint={color.buatong} strength={0.9} style={{ position: 'absolute', top: -fs * 0.9, alignSelf: 'center' }} /> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Palabra ${th}`} onPress={(e) => onTap(k, { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY - 20 })}>
        <View style={[styles.tok, hi ? styles.tokHi : null, fixed ? styles.tokFixed : null, wrong ? styles.tokWrong : null]}>
          <Th size={fs} bold={hi || fixed} style={{ color: fixed ? color.arrozalHondo : hi ? '#7A2E00' : '#3B2A12' }}>
            {th}
          </Th>
        </View>
      </Pressable>
      {hi ? (
        <View style={styles.lupaHi} pointerEvents="none">
          <Lupa size={34} />
        </View>
      ) : null}
      {fixed && tag ? (
        <Animated.View entering={FadeInDown.springify().damping(12)} style={styles.glossTag}>
          <Text style={styles.glossText}>{tag}</Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** Un hueco de la hoja. `active`: es el que se pregunta ahora (late y la lupa lo vigila) · `ok`: se rellenó acertando. */
function GapSlot({ th, fs, filled, ok, active, tag, gapRef }: { th: string; fs: number; filled: boolean; ok: boolean; active: boolean; tag: { label: string; tint: string } | null; gapRef: RefObject<ViewRef | null> }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, reduced]);
  const done = ok ? '#2DBE78' : '#E0702A';
  const pulse = useAnimatedStyle(() => ({
    borderColor: filled ? done : `rgba(233,168,0,${active ? 0.55 + 0.45 * t.value : 0.45})`,
    transform: [{ scale: filled || !active ? 1 : 1 + 0.03 * t.value }],
  }));
  return (
    <View style={{ alignItems: 'center', marginTop: tag ? 12 : 0, opacity: filled || active ? 1 : 0.6 }}>
      {active ? <Glow size={fs * 4} tint={color.buatong} strength={0.85} style={{ position: 'absolute', top: -fs * 1.2, alignSelf: 'center' }} /> : null}
      {tag && !filled ? (
        <View style={[styles.tag, { backgroundColor: tag.tint }]}>
          <Text style={styles.tagText}>{tag.label}</Text>
        </View>
      ) : null}
      <Animated.View ref={gapRef} collapsable={false} style={[styles.gap, { minWidth: fs * 2.6, height: fs * 1.75 }, filled ? styles.gapFilled : null, filled && !ok ? { backgroundColor: 'rgba(255,236,214,0.95)' } : null, pulse]}>
        {filled ? (
          <Pop trigger={filled} scale={1.3}>
            <Th size={fs} bold style={{ color: ok ? color.arrozalHondo : '#A8480F' }}>
              {th}
            </Th>
          </Pop>
        ) : (
          <Text style={[styles.gapQ, { fontSize: fs * 0.95 }]}>?</Text>
        )}
      </Animated.View>
      {active ? (
        <View style={styles.lupa} pointerEvents="none">
          <Floaty amp={3} ms={1600} rotate={6}>
            <Lupa size={40} />
          </Floaty>
        </View>
      ) : null}
    </View>
  );
}

/** Lupa de Noi: aro dorado, cristal con reflejo y mango de madera. */
function Lupa({ size }: { size: number }) {
  const u = `lp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id={`${u}r`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE58A" />
          <Stop offset="1" stopColor="#C98F00" />
        </LinearGradient>
        <LinearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E9F7FF" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#9CCFF0" stopOpacity={0.45} />
        </LinearGradient>
      </Defs>
      <Path d="M26 26 L37 37" stroke="#7A4A22" strokeWidth={6} strokeLinecap="round" />
      <Path d="M26 26 L37 37" stroke="#B9783E" strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx={16} cy={16} r={12} fill={`url(#${u}g)`} stroke={`url(#${u}r)`} strokeWidth={4} />
      <Path d="M10 12 Q12 8 17 8" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Vela del templo que se consume (la barra de al lado marca el bonus por rapidez). */
function Candle() {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 160, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, reduced]);
  const flame = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.9 + 0.18 * t.value }, { rotate: `${-4 + 8 * t.value}deg` }] }));
  return (
    <View style={{ width: 18, height: 28, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, width: 10, height: 13, transformOrigin: '50% 100%' }, flame]}>
        <Svg width={10} height={13} viewBox="0 0 10 13">
          <Path d="M5 0 C7 4 9 6 9 9 A4 4 0 0 1 1 9 C1 6 3 4 5 0 Z" fill="#FF9A2E" />
          <Path d="M5 5 C6 7 7 8 7 9.5 A2 2 0 0 1 3 9.5 C3 8 4 7 5 5 Z" fill="#FFE68A" />
        </Svg>
      </Animated.View>
      <View style={{ width: 9, height: 15, borderRadius: 2.5, backgroundColor: '#FFF4D6', borderWidth: 1, borderColor: '#E3C88A' }} />
    </View>
  );
}

/** Farol Lanna (โคม) que se enciende con los aciertos seguidos: tres llamas y la hoja siguiente es dorada. */
function Lantern({ lit }: { lit: number }) {
  const u = `ln${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const full = lit >= LANTERN;
  const glow = 54 + lit * 14;
  return (
    <Pop trigger={lit} scale={1.35} style={styles.lantern}>
      <View accessible accessibilityRole="image" accessibilityLabel={full ? 'Farol encendido: la hoja siguiente vale el doble' : `Farol: ${lit} de ${LANTERN} llamas`}>
        {lit > 0 ? <Glow size={glow} tint={color.buatong} strength={0.3 + 0.2 * lit} pulse={full} style={{ position: 'absolute', left: 17 - glow / 2, top: 24 - glow / 2 }} /> : null}
        <Floaty amp={1.2} ms={2100} rotate={full ? 7 : 3}>
          <Svg width={34} height={48} viewBox="0 0 34 48">
            <Defs>
              <LinearGradient id={u} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={lit ? '#FFF6C4' : '#F1E6CC'} />
                <Stop offset="0.5" stopColor={lit ? (full ? '#FFC23A' : '#FFD67A') : '#DCCBA4'} />
                <Stop offset="1" stopColor={lit ? (full ? '#F0792B' : '#F2A03C') : '#B9A478'} />
              </LinearGradient>
            </Defs>
            <Path d="M17 0 V6" stroke="#7A4A22" strokeWidth={1.6} strokeLinecap="round" />
            <Rect x={11} y={5} width={12} height={4.5} rx={1.6} fill="#A82A28" />
            <Path d="M10 9.5 H24 L30 18 V29 L24 37.5 H10 L4 29 V18 Z" fill={`url(#${u})`} stroke="#A82A28" strokeWidth={1.6} strokeLinejoin="round" />
            <Path d="M10 9.5 V37.5 M17 9.5 V37.5 M24 9.5 V37.5 M4 18 H30 M4 29 H30" stroke="#A82A28" strokeWidth={0.9} opacity={0.38} />
            {lit > 0 ? <Ellipse cx={17} cy={24.5} rx={3 + lit * 1.4} ry={5 + lit * 1.8} fill="#FFFBE0" opacity={0.8} /> : null}
            <Path d="M9 13 Q12 11 15 12" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" fill="none" opacity={0.7} />
            <Rect x={11} y={37} width={12} height={3.4} rx={1.3} fill="#A82A28" />
            <Path d="M13 40.5 V46 M17 40.5 V47.5 M21 40.5 V46" stroke="#F4C65A" strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        </Floaty>
      </View>
      <View style={styles.pips}>
        {Array.from({ length: LANTERN }, (_, k) => (
          <View key={k} style={[styles.pip, k < lit ? styles.pipOn : null]} />
        ))}
      </View>
    </Pop>
  );
}

/** La lupa de Noi como botón: enseña qué significa cada ficha. */
function HintBtn({ onPress }: { onPress: () => void }) {
  return (
    <Animated.View entering={FadeIn.delay(500)}>
      <Pressable accessibilityRole="button" accessibilityLabel="Pista: ver qué significa cada ficha" onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.hintBtn, pressed ? { transform: [{ scale: 0.92 }] } : null]}>
        <Lupa size={26} />
        <Text style={styles.hintText}>pista</Text>
      </Pressable>
    </Animated.View>
  );
}

// ——— Fichas de laca ———

type TileState = 'idle' | 'ok' | 'bad' | 'hint' | 'dim';

/** `rom`: con transcripción (mientras no se sabe leer) · `gloss`: con traducción (solo con la lupa de Noi). */
function OptionTile({ opt, k, rom, gloss, state, hidden, disabled, onChoose }: { opt: Opt; k: number; rom: boolean; gloss: boolean; state: TileState; hidden: boolean; disabled: boolean; onChoose: (o: Opt, box: Box) => void }) {
  const ref = useRef<ViewRef>(null);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (state === 'bad') shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 60 }), withTiming(-6, { duration: 60 }), withTiming(4, { duration: 60 }), withTiming(0, { duration: 60 }));
    if (state === 'hint' || state === 'ok') shake.value = withSequence(withTiming(-3, { duration: 70 }), withSpring(0, { damping: 6, stiffness: 300 }));
  }, [state, shake]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const withRom = !!opt.th && rom && !!opt.rom;
  const withGloss = !!opt.th && gloss;
  const h = 66 + (withRom ? 10 : 0) + (withGloss ? 12 : 0);
  const face = state === 'ok' || state === 'hint' ? GREEN : LACQUER;
  return (
    <Animated.View entering={FadeInDown.delay(k * 70).springify().damping(14)} pointerEvents={hidden ? 'none' : 'auto'} style={[{ width: '48%' }, st, { opacity: hidden ? 0 : state === 'dim' ? 0.42 : state === 'bad' ? 0.7 : 1 }]}>
      <View ref={ref} collapsable={false}>
        {state === 'hint' || state === 'ok' ? <Glow size={150} tint={color.arrozalVivo} strength={0.6} style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -75, marginTop: -75 }} /> : null}
        <Press3D
          disabled={disabled || hidden}
          accessibilityLabel={opt.th ? `Ficha ${opt.th}` : `Ficha ${opt.es}`}
          style={{ height: h + 5 }}
          onPress={() => ref.current?.measureInWindow((x, y, w, hh) => onChoose(opt, { x, y, w, h: hh }))}>
          <LacquerFace face={face} h={h}>
            {opt.th ? (
              <>
                <Th size={24} bold style={{ color: face.ink }}>
                  {opt.th}
                </Th>
                {withRom ? <Rom rom={opt.rom ?? ''} size={12} mono={face.sub} style={{ marginTop: -5 }} /> : null}
                {withGloss ? (
                  <Animated.Text entering={FadeIn} style={[styles.tileGloss, { color: '#FFFFFF' }]} numberOfLines={1}>
                    {opt.es}
                  </Animated.Text>
                ) : null}
              </>
            ) : (
              <Text style={[styles.tileEs, { color: face.ink }]} numberOfLines={2}>
                {opt.es}
              </Text>
            )}
            {state === 'bad' ? <Text style={styles.cross}>✕</Text> : null}
          </LacquerFace>
        </Press3D>
      </View>
    </Animated.View>
  );
}

const LACQUER = { a: '#EE5B52', b: '#C9302E', c: '#9E1F21', slab: '#6E1414', rim: '#F4C65A', ink: '#FFF4DA', sub: '#FFD98A' };
const GREEN = { a: '#4FD18F', b: '#1FA567', c: '#0E7A48', slab: '#0A5532', rim: '#F4C65A', ink: '#FFFFFF', sub: '#E3FFD1' };

function LacquerFace({ face, h, children }: { face: typeof LACQUER; h: number; children: ReactNode }) {
  const u = `lq${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[styles.slab, { backgroundColor: face.slab }]}>
      <View style={[styles.face, { height: h, borderColor: face.rim }]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={u} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={face.a} />
              <Stop offset="0.55" stopColor={face.b} />
              <Stop offset="1" stopColor={face.c} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${u})`} />
          <Ellipse cx="30%" cy="10%" rx="40%" ry="16%" fill="#FFFFFF" opacity={0.16} />
          <G opacity={0.5}>
            <Rect x="4" y="4" width="10" height="10" fill="none" stroke={face.rim} strokeWidth={1} transform="rotate(45 9 9)" />
          </G>
        </Svg>
        <View style={[styles.innerRim, { borderColor: face.rim }]} />
        {children}
      </View>
    </View>
  );
}

function Flyer({ f }: { f: Flight }) {
  const x = useSharedValue(f.from.x + f.from.w / 2);
  const y = useSharedValue(f.from.y + f.from.h / 2);
  const s = useSharedValue(1);
  const r = useSharedValue(0);
  useEffect(() => {
    x.value = withTiming(f.to.x, { duration: 420, easing: Easing.out(Easing.cubic) });
    y.value = withSequence(withTiming(Math.min(f.from.y, f.to.y) - 40, { duration: 200, easing: Easing.out(Easing.quad) }), withTiming(f.to.y, { duration: 220, easing: Easing.in(Easing.quad) }));
    s.value = withTiming(0.62, { duration: 420 });
    r.value = withSequence(withTiming(-12, { duration: 200 }), withTiming(0, { duration: 220 }));
  }, [f, x, y, s, r]);
  const w = f.from.w;
  const h = f.from.h;
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - w / 2 }, { translateY: y.value - h / 2 }, { rotate: `${r.value}deg` }, { scale: s.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h, zIndex: 50 }, st]}>
      <LacquerFace face={GREEN} h={h - 5}>
        <Th size={24} bold style={{ color: '#FFFFFF' }}>
          {f.th}
        </Th>
      </LacquerFace>
    </Animated.View>
  );
}

// ——— Lo que hace la palabra ———

const TITLE: Record<Kind, [ok: string, ko: string]> = {
  fill: ['¡Encontrada!', 'Era esta:'],
  double: ['¡Las dos!', 'Eran estas:'],
  meaning: ['¡Eso significa!', 'Era esto:'],
  spot: ['¡Pillada! Lo que suena es:', 'La que suena es:'],
};

/** `fuse`: milisegundos que faltan para seguir sola (feria, tras un acierto); tocar la tarjeta lo para. */
function Reveal({ item, marks, gained, feria, last, fuse, onHold, onNext }: { item: Item; marks: boolean[]; gained: number; feria: boolean; last: boolean; fuse: number; onHold: () => void; onNext: () => void }) {
  const ok = marks.every(Boolean);
  // la explicación, de la que se ha fallado (o de la primera)
  const main = item.answers[Math.max(0, marks.indexOf(false))];
  const what = main.note ?? catOf(main.cat).what;
  return (
    <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.reveal}>
      <Pressable accessible={false} onPress={onHold} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.okDot, { backgroundColor: ok ? color.arrozalVivo : color.laca }]}>
            <Text style={styles.okDotText}>{ok ? '✓' : '↻'}</Text>
          </View>
          <Txt v="h3" style={{ flex: 1, color: ok ? color.arrozalHondo : color.lacaHondo }}>
            {TITLE[item.kind][ok ? 0 : 1]}
          </Txt>
          {feria && gained ? (
            <Animated.View entering={FadeIn} style={styles.gain}>
              <Text style={styles.gainText}>+{gained}</Text>
            </Animated.View>
          ) : null}
        </View>
        {item.answers.map((a, k) => {
          const c = catOf(a.cat);
          return (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Th size={item.answers.length > 1 ? 22 : 26} bold>
                {a.th}
              </Th>
              <View style={{ gap: 0 }}>
                <Rom rom={a.rom} size={14} />
                <Text style={styles.revealEs}>{item.answers.length > 1 ? a.es : a.full || a.es}</Text>
              </View>
              <View style={[styles.catChip, { backgroundColor: c.tint }]}>
                <Text style={styles.catChipText}>{c.label}</Text>
              </View>
            </View>
          );
        })}
        {item.intruder ? (
          <Text style={styles.wasText}>
            En la hoja ponía <Text style={styles.wasTh}>{item.intruder.th}</Text>
            {item.intruder.word ? ` (${shortEs(item.intruder.word.es)})` : ''}
          </Text>
        ) : null}
        {what ? (
          <View style={styles.note}>
            <Text style={styles.noteLabel}>QUÉ HACE</Text>
            <Text style={styles.noteText} numberOfLines={4}>
              {what}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <Btn label={last ? 'Terminar' : fuse ? 'Siguiente ›' : 'Siguiente'} height={46} onPress={onNext} />
      {fuse ? <Fuse key={item.key} ms={fuse} /> : null}
    </Animated.View>
  );
}

/** Mecha del avance automático: se consume mientras se lee; al acabarse, sigue la partida. */
function Fuse({ ms }: { ms: number }) {
  const w = useSharedValue(1);
  useEffect(() => {
    w.value = withTiming(0, { duration: ms, easing: Easing.linear });
  }, [ms, w]);
  const st = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={styles.fuseRow}>
      <View style={styles.fuse}>
        <Animated.View style={[styles.fuseFill, st]} />
      </View>
      <Text style={styles.fuseText}>toca la tarjeta para leer con calma</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  leafWrap: { paddingHorizontal: 12, paddingTop: 4 },
  leaf: {
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#B08A4A',
    overflow: 'hidden',
    paddingTop: 16,
    paddingBottom: 10,
    gap: 6,
    shadowColor: '#5A3A10',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', columnGap: 4, rowGap: 10, paddingHorizontal: 22 },
  tok: { borderRadius: 10, paddingHorizontal: 3 },
  tokFixed: { backgroundColor: 'rgba(221,245,232,0.95)', borderWidth: 2, borderColor: '#2DBE78', paddingHorizontal: 6 },
  tokWrong: { backgroundColor: 'rgba(253,232,232,0.9)' },
  tokHi: { backgroundColor: 'rgba(255,214,90,0.55)', borderWidth: 2, borderColor: '#E9A800', paddingHorizontal: 6 },
  lupaHi: { position: 'absolute', right: -20, top: -24 },
  glossTag: { marginTop: 2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: color.arrozal },
  glossText: { fontFamily: font.uiHeavy, fontSize: 12, color: '#FFFFFF' },
  gap: { borderRadius: 14, borderWidth: 3, borderStyle: 'dashed', backgroundColor: 'rgba(255,248,214,0.75)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  gapFilled: { borderStyle: 'solid', backgroundColor: 'rgba(221,245,232,0.95)' },
  gapQ: { fontFamily: font.displayBold, color: '#C98F00' },
  tag: { position: 'absolute', top: -14, zIndex: 2, paddingHorizontal: 8, height: 18, borderRadius: 9, justifyContent: 'center' },
  tagText: { fontFamily: font.uiHeavy, fontSize: 10, letterSpacing: 0.4, color: '#FFFFFF' },
  lupa: { position: 'absolute', right: -24, top: -22 },
  ribbon: {
    marginHorizontal: 14,
    marginTop: 2,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#A82A28',
    borderWidth: 1.5,
    borderColor: '#F4C65A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ribbonText: { flex: 1, fontFamily: font.display, fontSize: 17, lineHeight: 21, color: '#FFF4DA' },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 22, paddingRight: 14, paddingTop: 6 },
  lantern: { width: 40, alignItems: 'center', marginTop: -6, marginBottom: -8 },
  pips: { flexDirection: 'row', gap: 3, marginTop: 1 },
  pip: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: '#C9A86A' },
  pipOn: { backgroundColor: color.buatong, borderColor: color.buatongHondo },
  hintBtn: { width: 50, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1.5, borderColor: '#F0D9A6', shadowColor: '#5A3A10', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  hintText: { fontFamily: font.uiHeavy, fontSize: 10, letterSpacing: 0.3, color: '#A86F00', marginTop: -2 },
  spot: {
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 5,
    borderTopColor: color.cielo,
    shadowColor: '#5A3A10',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  spotTitle: { fontFamily: font.display, fontSize: 18, lineHeight: 22, color: color.tinta, textAlign: 'center' },
  spotSub: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta2, textAlign: 'center' },
  noiRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, marginTop: 4 },
  bubble: { flex: 1, minHeight: 50, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.94)', shadowColor: '#5A3A10', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  bubbleTail: { position: 'absolute', left: -6, top: 18, width: 14, height: 14, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.94)', transform: [{ rotate: '45deg' }] },
  bubbleText: { fontFamily: font.display, fontSize: 17, lineHeight: 21, color: color.tinta },
  bubbleSub: { fontFamily: font.uiHeavy, fontSize: 12, marginTop: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: '4%', rowGap: 12, paddingHorizontal: 14 },
  slab: { borderRadius: 18, paddingBottom: 5, shadowColor: '#4A0E0E', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  face: { borderRadius: 17, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  innerRim: { position: 'absolute', left: 5, right: 5, top: 5, bottom: 5, borderRadius: 13, borderWidth: 1, opacity: 0.45 },
  tileGloss: { fontFamily: font.uiHeavy, fontSize: 12, marginTop: -2 },
  tileEs: { fontFamily: font.display, fontSize: 17, lineHeight: 20, textAlign: 'center' },
  cross: { position: 'absolute', right: 10, top: 6, fontFamily: font.displayBold, fontSize: 16, color: '#FFE0DC' },
  reveal: {
    marginHorizontal: 12,
    padding: 14,
    gap: 8,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 5,
    borderTopColor: '#C9302E',
    shadowColor: '#5A3A10',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  okDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  okDotText: { fontFamily: font.displayBold, fontSize: 15, color: '#FFFFFF' },
  gain: { paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: color.azafranSuave, justifyContent: 'center' },
  gainText: { fontFamily: font.displayBold, fontSize: 15, color: color.azafranHondo },
  wasText: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta2 },
  wasTh: { fontFamily: font.thaiBold, fontSize: 15, color: color.lacaHondo },
  fuseRow: { gap: 2, marginTop: -2 },
  fuse: { height: 4, borderRadius: 2, backgroundColor: color.niebla2, overflow: 'hidden' },
  fuseFill: { height: '100%', borderRadius: 2, backgroundColor: color.azafran },
  fuseText: { fontFamily: font.uiBold, fontSize: 11, color: color.tinta3, textAlign: 'center' },
  revealEs: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  catChip: { paddingHorizontal: 9, height: 22, borderRadius: 11, justifyContent: 'center' },
  catChipText: { fontFamily: font.uiHeavy, fontSize: 11, color: '#FFFFFF', letterSpacing: 0.3 },
  note: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF6E0', borderWidth: 1, borderColor: '#F0D9A6' },
  noteLabel: { fontFamily: font.uiHeavy, fontSize: 10, letterSpacing: 1, color: '#A86F00' },
  noteText: { fontFamily: font.ui, fontSize: 14, lineHeight: 19, color: color.tinta2 },
});
