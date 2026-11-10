import { LESSONS, SENTENCES, STORIES, WORDS } from '@/content';
import type { GameId, LessonExtra, Sentence, Word } from '@/content/types';
import { introducedIds } from '@/lib/lesson';
import { pick, shuffle } from '@/lib/random';

/** Palabras presentadas que hacen falta para que la feria tenga con qué jugar. */
export const MIN_FERIA_WORDS = 6;

/** Juegos que necesitan frases enteras. */
const SENTENCE_GAMES: GameId[] = ['puente', 'hueco', 'eco'];

type ProgressLike = Parameters<typeof introducedIds>[0];

export type FeriaSetup = { words: Word[]; sentences: Sentence[]; extra?: LessonExtra } | { needMore: string };

const formsOf = (w: Word) => w.th.split(/[\s…/()ๆ]+/).filter(Boolean);
const seenLesson = (p: ProgressLike, l: (typeof LESSONS)[number]) => !!p.completed[l.id] || l.stop.n < p.profile.startStop;

/** Palabras con ficha que se pueden usar en la feria. */
export function feriaWords(p: ProgressLike): Word[] {
  return [...introducedIds(p)].map((id) => WORDS[id]).filter(Boolean);
}

/**
 * Lo que usa una partida de la feria: solo palabras que ya tienen ficha, frases que se entienden enteras con
 * ellas y conversaciones de lecciones ya hechas. Nunca rellena con vocabulario futuro: si aún falta, lo dice.
 */
export function feriaSetup(id: GameId, p: ProgressLike): FeriaSetup {
  const words = shuffle(feriaWords(p));
  if (words.length < MIN_FERIA_WORDS)
    return { needMore: 'Aún sabes pocas palabras. Termina las primeras lecciones del camino y la feria se llenará con lo que aprendas.' };

  const forms = new Set(words.flatMap(formsOf));
  const sentences = shuffle(Object.values(SENTENCES).filter((s) => s.th.every((t) => t.startsWith('{') || forms.has(t)))).slice(0, 12);
  if (SENTENCE_GAMES.includes(id) && sentences.length < 2) return { needMore: 'Este juego necesita frases que ya entiendas. Sigue unas lecciones más por el camino y vuelve.' };

  let extra: LessonExtra | undefined;
  if (id === 'cena') {
    const dialogues = LESSONS.filter((l) => l.extra?.kind === 'dialogo' && seenLesson(p, l)).map((l) => (l.extra as { id: string }).id);
    if (!dialogues.length) return { needMore: 'La cena familiar se abre cuando termines tu primera conversación en el camino.' };
    extra = { kind: 'dialogo', id: pick(dialogues) };
  }
  if (id === 'cuentos' && STORIES.length) {
    // el cuento que se propone: uno de una lección ya hecha o, si no, el primero de la estantería
    const read = LESSONS.filter((l) => l.extra?.kind === 'cuento' && seenLesson(p, l)).map((l) => (l.extra as { id: string }).id);
    extra = { kind: 'cuento', id: read.length ? pick(read) : STORIES[0].id };
  }
  if (id === 'cueva' || id === 'traza') extra = { kind: 'letras', set: pick(['media', 'baja', 'alta']) };
  return { words, sentences, extra };
}
