import { DIALOGUES_A } from './dialogues';
import { DIALOGUES_B } from './dialogues-b';
import { STOPS_A, SENTENCES_A, WORDS_A } from './stops-a';
import { STOPS_B, SENTENCES_B, WORDS_B } from './stops-b';
import { DIALOGUES_S2A, SENTENCES_S2A, STOPS_S2A, STORIES_S2A, WORDS_S2A } from './season2/meses-a';
import { DIALOGUES_S2B, SENTENCES_S2B, STOPS_S2B, STORIES_S2B, WORDS_S2B } from './season2/meses-b';
import { DIALOGUES_S2C, SENTENCES_S2C, STOPS_S2C, STORIES_S2C, WORDS_S2C } from './season2/meses-c';
import { DIALOGUES_S2D, SENTENCES_S2D, STOPS_S2D, STORIES_S2D, WORDS_S2D } from './season2/meses-d';
import { STORIES_A } from './stories';
import { STORIES_B } from './stories-b';
import type { Dialogue, Lesson, Sentence, Stop, Story, Word } from './types';
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

export type LessonRef = Lesson & { stop: Stop; index: number; inStop: number; last: boolean };

export const LESSONS: LessonRef[] = STOPS.flatMap((stop) =>
  stop.lessons.map((l, inStop) => ({ ...l, stop, inStop, last: inStop === stop.lessons.length - 1, index: 0 })),
).map((l, index) => ({ ...l, index }));

export const TOTAL_LESSONS = LESSONS.length;

/** Lecciones de la carretera: de Chiang Mai a la ceremonia (el epílogo es un extra fuera del camino). */
const ROAD = LESSONS.filter((l) => l.stop.n <= 14);

/** Curvas que se ganan al completar una lección por primera vez: suman 1.864 justo al llegar al pueblo. */
export function curvesFor(lesson: LessonRef): number {
  const i = ROAD.findIndex((l) => l.id === lesson.id);
  if (i < 0) return 0;
  const base = Math.floor(TOTAL_CURVES / ROAD.length);
  return i === ROAD.length - 1 ? TOTAL_CURVES - base * (ROAD.length - 1) : base;
}

/** La lección final del camino: responder a la carta de Yai. */
export const REPLY_LESSON = LESSONS.find((l) => l.id === 'p14l5') ?? ROAD[ROAD.length - 1];

/** Temporada de una parada: 1 = la carretera · 2 = un año en el pueblo. */
export const seasonOf = (s: Stop): 1 | 2 => s.season ?? 1;
export const SEASON_2_STOPS = STOPS.filter((s) => seasonOf(s) === 2);
export const HAS_SEASON_2 = SEASON_2_STOPS.length > 0;
export const seasonLessons = (n: 1 | 2) => LESSONS.filter((l) => seasonOf(l.stop) === n);
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

/** Palabras ya vistas (para los juegos de la feria y el repaso). */
export function learnedWords(p: ProgressLike): Word[] {
  return Object.keys(p.words)
    .map((id) => WORDS[id])
    .filter(Boolean);
}

/** Conjunto de palabras para jugar: las aprendidas o, si aún son pocas, las del principio del camino. */
export function playPool(p: ProgressLike, min = 12): Word[] {
  const learned = learnedWords(p);
  if (learned.length >= min) return learned;
  const extra = LESSONS.slice(0, 6).flatMap((l) => wordsOf(l.words));
  const seen = new Set(learned.map((w) => w.id));
  return [...learned, ...extra.filter((w) => !seen.has(w.id) && (seen.add(w.id), true))];
}

/** Palabras que tocan repaso (repetición espaciada). */
export function dueWords(p: { words: Record<string, { s: number; due: number }> }, now = Date.now()): Word[] {
  return Object.entries(p.words)
    .filter(([, st]) => st.due <= now)
    .sort((a, b) => a[1].s - b[1].s)
    .map(([id]) => WORDS[id])
    .filter(Boolean);
}

/** Cuánto de la carta de Yai se lee ya. */
export function letterProgress(p: { words: Record<string, unknown> }) {
  const known = (tk: { w: string[] }) => tk.w.length > 0 && tk.w.every((id) => !!p.words[id]);
  const cleared = YAI_TOKENS.filter(known).length;
  return { cleared, total: YAI_TOKENS.length, pct: Math.round((cleared / YAI_TOKENS.length) * 100), known };
}

export const allWords = () => Object.values(WORDS);
