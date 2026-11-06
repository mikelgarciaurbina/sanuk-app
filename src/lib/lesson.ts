import { LESSONS, playPool, sentencesOf, wordsOf, type LessonRef } from '@/content';
import type { GameId, Sentence, Word } from '@/content/types';
import { shuffle } from '@/lib/random';
import { syllables } from '@/lib/thai';

export type Step = { kind: 'intro'; word: Word } | { kind: 'game'; game: GameId; rounds: number };

export type BuiltLesson = { steps: Step[]; focus: Word[]; words: Word[]; sentences: Sentence[] };

type ProgressLike = Parameters<typeof playPool>[0];

/** Juegos de práctica que rotan entre lecciones para que nunca sea lo mismo. */
const ROTATION: { game: GameId; rounds: number }[][] = [
  [{ game: 'siono', rounds: 6 }],
  [{ game: 'curvas', rounds: 6 }],
  [{ game: 'monzon', rounds: 6 }],
  [{ game: 'memoria', rounds: 1 }],
  [{ game: 'farolillos', rounds: 1 }],
];

/** Construye la secuencia de pasos (tarjetas y minijuegos) de una lección: ~4 minutos. */
export function buildLesson(lesson: LessonRef, p: ProgressLike): BuiltLesson {
  const focus = wordsOf(lesson.words);
  const pool = playPool(p);
  const seen = new Set(Object.keys(p.words));
  const words = [...focus, ...pool.filter((w) => !focus.some((f) => f.id === w.id))];
  const sentences = sentencesOf(lesson.sentences);
  const fresh = focus.filter((w) => !seen.has(w.id));
  const steps: Step[] = [];

  // 1) descubrir las palabras nuevas por tandas, con un juego corto entre tandas
  const chunks: Word[][] = [];
  for (let i = 0; i < fresh.length; i += 3) chunks.push(fresh.slice(i, i + 3));
  chunks.forEach((chunk, i) => {
    chunk.forEach((word) => steps.push({ kind: 'intro', word }));
    steps.push(i % 2 === 0 ? { kind: 'game', game: 'oido', rounds: Math.min(3, chunk.length + 1) } : { kind: 'game', game: 'siono', rounds: 4 });
  });
  if (!chunks.length) steps.push({ kind: 'game', game: 'oido', rounds: 3 });

  // 2) consolidar vocabulario
  if (focus.length >= 3) steps.push({ kind: 'game', game: 'parejas', rounds: 1 });

  // 3) lo específico de la lección
  const x = lesson.extra;
  if (x?.kind === 'dialogo') steps.push({ kind: 'game', game: 'cena', rounds: 1 });
  if (x?.kind === 'cuento') steps.push({ kind: 'game', game: 'cuentos', rounds: 1 });
  if (x?.kind === 'numeros') steps.push({ kind: 'game', game: 'mercado', rounds: 2 });
  if (x?.kind === 'clasificadores') steps.push({ kind: 'game', game: 'cestas', rounds: 5 });
  if (x?.kind === 'cuerpo') steps.push({ kind: 'game', game: 'noidice', rounds: 5 });
  if (x?.kind === 'tonos') steps.push({ kind: 'game', game: 'tonos', rounds: 4 }, { kind: 'game', game: 'tigre', rounds: 2 });
  if (x?.kind === 'letras') {
    if (x.set === 'silabas' || x.set === 'vocales') steps.push({ kind: 'game', game: 'silabas', rounds: 3 });
    if (x.set !== 'silabas') steps.push({ kind: 'game', game: 'cueva', rounds: 4 });
    if (x.set === 'media' || x.set === 'baja' || x.set === 'alta') steps.push({ kind: 'game', game: 'traza', rounds: 1 });
  }

  // 4) frases
  if (sentences.length) {
    steps.push({ kind: 'game', game: 'puente', rounds: Math.min(2, sentences.length) });
    if (sentences.length >= 2) steps.push({ kind: 'game', game: 'hueco', rounds: Math.min(2, sentences.length) });
  }

  // 5) tonos si hay palabras de una sílaba y la lección no es ya de tonos
  const mono = focus.filter((w) => syllables(w.rom).length === 1);
  if (x?.kind !== 'tonos' && mono.length >= 2 && lesson.index % 2 === 1) steps.push({ kind: 'game', game: 'tonos', rounds: 3 });

  // 6) un juego de la feria que va rotando, y a veces practicar la voz
  for (const g of ROTATION[lesson.index % ROTATION.length]) steps.push({ kind: 'game', ...g });
  if (sentences.length && lesson.index % 3 === 2) steps.push({ kind: 'game', game: 'eco', rounds: 1 });

  return { steps, focus, words, sentences };
}

/** Lección de repaso con las palabras que tocan (repetición espaciada). */
export function buildReview(due: Word[], p: ProgressLike): BuiltLesson {
  const focus = shuffle(due).slice(0, 8);
  const pool = playPool(p);
  const words = [...focus, ...pool.filter((w) => !focus.some((f) => f.id === w.id))];
  const steps: Step[] = [
    { kind: 'game', game: 'oido', rounds: 3 },
    { kind: 'game', game: 'parejas', rounds: 1 },
    { kind: 'game', game: 'siono', rounds: 6 },
    { kind: 'game', game: 'curvas', rounds: 6 },
  ];
  return { steps, focus, words, sentences: [] };
}

export const lessonIndex = (id: string) => LESSONS.findIndex((l) => l.id === id);
