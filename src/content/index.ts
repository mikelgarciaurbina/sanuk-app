import { DIALOGUES_A } from './dialogues';
import { DIALOGUES_B } from './dialogues-b';
import { PATTERNS_A } from './patterns-a';
import { PATTERNS_B } from './patterns-b';
import { RENAMED_A, STOPS_A, SENTENCES_A, WORDS_A } from './stops-a';
import { RENAMED_B, STOPS_B, SENTENCES_B, WORDS_B } from './stops-b';
import { DIALOGUES_S2A, PATTERNS_S2A, SENTENCES_S2A, STOPS_S2A, STORIES_S2A, WORDS_S2A } from './season2/meses-a';
import { DIALOGUES_S2B, PATTERNS_S2B, SENTENCES_S2B, STOPS_S2B, STORIES_S2B, WORDS_S2B } from './season2/meses-b';
import { DIALOGUES_S2C, PATTERNS_S2C, SENTENCES_S2C, STOPS_S2C, STORIES_S2C, WORDS_S2C } from './season2/meses-c';
import { DIALOGUES_S2D, PATTERNS_S2D, SENTENCES_S2D, STOPS_S2D, STORIES_S2D, WORDS_S2D } from './season2/meses-d';
import { STORIES_A } from './stories';
import { STORIES_B } from './stories-b';
import type { Dialogue, Lesson, Pattern, Sentence, Stop, Story, Word } from './types';
import { YAI_TOKENS } from './yai';

export * from './types';

export const TOTAL_CURVES = 1864;

/** Temporada 1 (la carretera, paradas 1–15) y temporada 2 (un año en el pueblo, paradas 16–27). */
export const STOPS: Stop[] = [...STOPS_A, ...STOPS_B, ...STOPS_S2A, ...STOPS_S2B, ...STOPS_S2C, ...STOPS_S2D];

export const WORDS: Record<string, Word> = {};
for (const w of [...WORDS_A, ...WORDS_B, ...WORDS_S2A, ...WORDS_S2B, ...WORDS_S2C, ...WORDS_S2D]) if (!WORDS[w.id]) WORDS[w.id] = w;

export const SENTENCES: Record<string, Sentence> = {};
for (const s of [...SENTENCES_A, ...SENTENCES_B, ...SENTENCES_S2A, ...SENTENCES_S2B, ...SENTENCES_S2C, ...SENTENCES_S2D]) if (!SENTENCES[s.id]) SENTENCES[s.id] = s;

export const DIALOGUES: Record<string, Dialogue> = Object.fromEntries([...DIALOGUES_A, ...DIALOGUES_B, ...DIALOGUES_S2A, ...DIALOGUES_S2B, ...DIALOGUES_S2C, ...DIALOGUES_S2D].map((d) => [d.id, d]));
export const STORIES: Story[] = [...STORIES_A, ...STORIES_B, ...STORIES_S2A, ...STORIES_S2B, ...STORIES_S2C, ...STORIES_S2D];

/** Gramática en un minuto: los patrones que explican las lecciones (`Lesson.patterns`). */
export const PATTERNS: Record<string, Pattern> = Object.fromEntries(
  [...PATTERNS_A, ...PATTERNS_B, ...PATTERNS_S2A, ...PATTERNS_S2B, ...PATTERNS_S2C, ...PATTERNS_S2D].map((x) => [x.id, x]),
);
export const patternsOf = (ids: string[] = []) => ids.map((id) => PATTERNS[id]).filter(Boolean);

/** Lecciones que cambiaron de id respecto a la versión 1 del temario (id antiguo → nuevo), para migrar el progreso guardado. */
export const RENAMED_LESSONS: Record<string, string> = { ...RENAMED_A, ...RENAMED_B };

export type LessonRef = Lesson & { stop: Stop; index: number; inStop: number; last: boolean };

export const LESSONS: LessonRef[] = STOPS.flatMap((stop) =>
  stop.lessons.map((l, inStop) => ({ ...l, stop, inStop, last: inStop === stop.lessons.length - 1, index: 0 })),
).map((l, index) => ({ ...l, index }));

export const TOTAL_LESSONS = LESSONS.length;

/** Última parada de la carretera: al acabarla se han tomado las 1.864 curvas y se llega al pueblo (parada 11). */
export const LAST_ROAD_STOP = 10;

/** Lecciones de la carretera: de Chiang Mai a Ban Rak Thai. En la casa de teca ya no hay curvas: allí avanza la carta. */
const ROAD = LESSONS.filter((l) => l.stop.n <= LAST_ROAD_STOP);

/** Curvas que se ganan al completar una lección por primera vez: suman 1.864 justo al llegar al pueblo. */
export function curvesFor(lesson: LessonRef): number {
  const i = ROAD.findIndex((l) => l.id === lesson.id);
  if (i < 0) return 0;
  const base = Math.floor(TOTAL_CURVES / ROAD.length);
  return i === ROAD.length - 1 ? TOTAL_CURVES - base * (ROAD.length - 1) : base;
}

/** Parada del alfabeto (la cueva de las letras): la primera que tiene lecciones de escritura. */
export const ALPHABET_STOP = STOPS.find((s) => s.lessons.some((l) => l.extra?.kind === 'letras' && l.extra.set === 'media'))?.n ?? 7;

/** ¿Quien aprende ya sabe leer? Ha terminado la parada del alfabeto o empezó el camino más arriba. */
export function canRead(p: { completed: Record<string, unknown>; profile: { startStop: number } }): boolean {
  if (p.profile.startStop > ALPHABET_STOP) return true;
  const cave = STOPS.find((s) => s.n === ALPHABET_STOP);
  return !!cave && cave.lessons.every((l) => !!p.completed[l.id]);
}

/** Última lección que enseña las reglas de tono (clase + viva o muerta + marca): a partir de ahí, las fichas las aplican. */
const TONE_RULES_INDEX = Math.max(-1, ...LESSONS.filter((l) => l.extra?.kind === 'letras' && l.extra.set === 'reglas').map((l) => l.index));
/** ¿Esta lección va después de las reglas de tono? Entonces sus fichas enseñan de dónde sale el tono de cada palabra. */
export const afterToneRules = (l: LessonRef) => TONE_RULES_INDEX >= 0 && l.index > TONE_RULES_INDEX;

/** La lección que cierra la temporada 1: responder a la carta de Yai (la que trae el saludo «ถึงยายที่รัก», frase b142). */
export const REPLY_LESSON = LESSONS.find((l) => l.sentences?.includes('b142')) ?? seasonLessonsOf(1).slice(-1)[0];

/** Temporada de una parada: 1 = la carretera · 2 = un año en el pueblo. */
export const seasonOf = (s: Stop): 1 | 2 => s.season ?? 1;
export const SEASON_2_STOPS = STOPS.filter((s) => seasonOf(s) === 2);
export const HAS_SEASON_2 = SEASON_2_STOPS.length > 0;
export const seasonLessons = (n: 1 | 2) => LESSONS.filter((l) => seasonOf(l.stop) === n);
function seasonLessonsOf(n: 1 | 2) {
  return LESSONS.filter((l) => (l.stop.season ?? 1) === n);
}
/** Número de luna (1–12) de un mes de la temporada 2; 0 en la temporada 1. */
export const moonOf = (s: Stop) => SEASON_2_STOPS.indexOf(s) + 1;
export const moonsDone = (p: { stamps: string[] }) => SEASON_2_STOPS.filter((s) => p.stamps.includes(s.id)).length;

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
export const stopById = (id: string) => STOPS.find((s) => s.id === id);
export const wordsOf = (ids: string[]) => ids.map((id) => WORDS[id]).filter(Boolean);
export const sentencesOf = (ids: string[] = []) => ids.map((id) => SENTENCES[id]).filter(Boolean);

type ProgressLike = { completed: Record<string, unknown>; words: Record<string, { s: number }>; profile: { startStop: number } };

export function isUnlocked(p: ProgressLike, l: LessonRef): boolean {
  if (l.index === 0 || p.completed[l.id]) return true;
  if (l.stop.n < p.profile.startStop) return true;
  if (l.stop.n === p.profile.startStop && l.inStop === 0) return true;
  const prev = LESSONS[l.index - 1];
  return !!prev && !!p.completed[prev.id];
}

/** La siguiente curva del camino: la primera desbloqueada sin completar a partir de la parada de inicio. */
export function currentLesson(p: ProgressLike): LessonRef {
  const fromStart = LESSONS.filter((l) => l.stop.n >= p.profile.startStop);
  return fromStart.find((l) => !p.completed[l.id] && isUnlocked(p, l)) ?? LESSONS.find((l) => !p.completed[l.id]) ?? LESSONS[LESSONS.length - 1];
}

export function stopDone(p: ProgressLike, stop: Stop, justDone?: string): boolean {
  return stop.lessons.every((l) => l.id === justDone || !!p.completed[l.id]);
}

type IntroLike = { completed: Record<string, unknown>; words: Record<string, { intro?: boolean }>; profile: { startStop: number } };

/**
 * Palabras ya presentadas: las que tienen ficha vista, las de lecciones terminadas y las de las paradas
 * que quien aprende se saltó al empezar (se dan por sabidas). Haber respondido una palabra en un juego
 * no cuenta: su ficha tiene que salir cuando toque.
 */
export function introducedIds(p: IntroLike): Set<string> {
  const ids = new Set<string>();
  for (const [id, st] of Object.entries(p.words)) if (st.intro) ids.add(id);
  for (const l of LESSONS) if (p.completed[l.id] || l.stop.n < p.profile.startStop) for (const id of l.words) ids.add(id);
  return ids;
}

/** Formas thai sueltas de una palabra («ช้าๆ» → ช้า, «ค่ะ/ครับ» → ค่ะ, ครับ). */
export const formsOf = (w: { th: string }) => w.th.split(/[\s…/()ๆ]+/).filter(Boolean);
/** Todas las formas thai de unas palabras: lo que un juego puede decir o enseñar sin adelantarse. */
export const knownForms = (words: { th: string }[]) => new Set(words.flatMap(formsOf));

/** Palabras presentadas que hacen falta para abrir el repaso (si no, los juegos no tienen opciones). */
export const MIN_REVIEW_WORDS = 4;

/** Palabras que tocan repaso (repetición espaciada): solo las que ya tienen ficha. */
export function dueWords(p: IntroLike & { words: Record<string, { s: number; due: number; intro?: boolean }> }, now = Date.now()): Word[] {
  const intro = introducedIds(p);
  return Object.entries(p.words)
    .filter(([id, st]) => st.due <= now && intro.has(id))
    .sort((a, b) => a[1].s - b[1].s)
    .map(([id]) => WORDS[id])
    .filter(Boolean);
}

/** ¿Se puede repasar? Hace falta algo pendiente y bastantes palabras presentadas. */
export const canReview = (p: Parameters<typeof dueWords>[0], now = Date.now()) => introducedIds(p).size >= MIN_REVIEW_WORDS && dueWords(p, now).length > 0;

/** Cuánto de la carta de Yai se lee ya. */
export function letterProgress(p: { words: Record<string, unknown> }) {
  const known = (tk: { w: string[] }) => tk.w.length > 0 && tk.w.every((id) => !!p.words[id]);
  const cleared = YAI_TOKENS.filter(known).length;
  return { cleared, total: YAI_TOKENS.length, pct: Math.round((cleared / YAI_TOKENS.length) * 100), known };
}

export const allWords = () => Object.values(WORDS);
