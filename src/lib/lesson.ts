import { LESSONS, WORDS, playPool, sentencesOf, wordsOf, type LessonRef } from '@/content';
import type { GameId, Sentence, Word } from '@/content/types';
import { shuffle } from '@/lib/random';
import { syllables } from '@/lib/thai';

/**
 * Un paso de la lección. Los juegos pueden traer sus propias `words` y `focus`: entre tandas de fichas,
 * solo las palabras que ya se han presentado (nunca se pregunta una palabra antes de enseñar su ficha).
 */
export type Step = { kind: 'intro'; word: Word } | { kind: 'game'; game: GameId; rounds: number; words?: Word[]; focus?: Word[] };

export type BuiltLesson = {
  steps: Step[];
  focus: Word[];
  words: Word[];
  sentences: Sentence[];
  /** primera curva: se aprende de oído; la escritura llega después */
  firstCurve?: boolean;
};

type ProgressLike = Parameters<typeof playPool>[0] & { words: Record<string, { s: number; intro?: boolean }> };

/** Juegos de práctica que rotan entre lecciones para que nunca sea lo mismo. */
const ROTATION: { game: GameId; rounds: number }[][] = [
  [{ game: 'siono', rounds: 6 }],
  [{ game: 'curvas', rounds: 6 }],
  [{ game: 'monzon', rounds: 6 }],
  [{ game: 'memoria', rounds: 1 }],
  [{ game: 'farolillos', rounds: 1 }],
];

/**
 * Palabras ya presentadas: las que tienen ficha vista, las de lecciones terminadas y las de las paradas
 * que quien aprende se saltó al empezar (se dan por sabidas). Haber respondido una palabra en un juego
 * no cuenta: su ficha tiene que salir cuando toque.
 */
export function introducedIds(p: ProgressLike): Set<string> {
  const ids = new Set<string>();
  for (const [id, st] of Object.entries(p.words)) if (st.intro) ids.add(id);
  for (const l of LESSONS) if (p.completed[l.id] || l.stop.n < p.profile.startStop) for (const id of l.words) ids.add(id);
  return ids;
}

/** Construye la secuencia de pasos (tarjetas y minijuegos) de una lección: ~4 minutos. */
export function buildLesson(lesson: LessonRef, p: ProgressLike): BuiltLesson {
  const focus = wordsOf(lesson.words);
  const known = introducedIds(p);
  // lo que ya se sabe de antes, para dar opciones y distractores (nunca palabras sin presentar)
  const base = [...known].filter((id) => !lesson.words.includes(id)).map((id) => WORDS[id]).filter(Boolean);
  const sentences = sentencesOf(lesson.sentences);

  // Primera curva: Noi presenta dos expresiones con audio e imagen, se practican de oído y en voz alta,
  // y la lección se cierra con un saludo de dos turnos. La escritura llega en las lecciones siguientes.
  if (lesson.index === 0) {
    const steps: Step[] = focus.map((word) => ({ kind: 'intro', word }));
    steps.push({ kind: 'game', game: 'oido', rounds: 3, words: focus, focus });
    steps.push({ kind: 'game', game: 'eco', rounds: 2, words: focus, focus });
    if (lesson.extra?.kind === 'dialogo') steps.push({ kind: 'game', game: 'cena', rounds: 1, words: focus, focus });
    return { steps, focus, words: focus, sentences, firstCurve: true };
  }

  const fresh = focus.filter((w) => !known.has(w.id));
  let shown = focus.filter((w) => known.has(w.id));
  const words = [...focus, ...base];
  const steps: Step[] = [];

  // 1) descubrir las palabras nuevas por tandas; tras cada tanda, un juego corto solo con lo ya presentado
  const chunks: Word[][] = [];
  for (let i = 0; i < fresh.length; i += 3) chunks.push(fresh.slice(i, i + 3));
  chunks.forEach((chunk, i) => {
    chunk.forEach((word) => steps.push({ kind: 'intro', word }));
    shown = [...shown, ...chunk];
    const pool = [...shown, ...base];
    steps.push(i % 2 === 0 ? { kind: 'game', game: 'oido', rounds: Math.min(3, chunk.length + 1), words: pool, focus: chunk } : { kind: 'game', game: 'siono', rounds: 4, words: pool, focus: chunk });
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
  const known = [...introducedIds(p)].map((id) => WORDS[id]).filter(Boolean);
  // distractores entre lo ya presentado; si aún es poco, el conjunto de práctica de siempre
  const pool = known.length >= 12 ? known : playPool(p);
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
