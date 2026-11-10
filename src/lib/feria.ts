import { LESSONS, SENTENCES, WORDS, knownForms } from '@/content';
import { CLASSIFIERS, bodyCommandsFor, classifierItemsFor, minimalSetsFor, toneBankFor } from '@/content/drills';
import type { GameId, LessonExtra, Sentence, Word } from '@/content/types';
import { MIN_MARKET_NUMBERS, marketNumbers } from '@/games/mercado/logic';
import { introducedIds } from '@/lib/lesson';
import { pick, shuffle } from '@/lib/random';
import { syllables } from '@/lib/thai';

/** Palabras presentadas que hacen falta para que la feria tenga con qué jugar. */
export const MIN_FERIA_WORDS = 6;

/** Juegos que necesitan frases enteras. */
const SENTENCE_GAMES: GameId[] = ['puente', 'hueco', 'eco'];

type ProgressLike = Parameters<typeof introducedIds>[0];

export type FeriaSetup = { words: Word[]; sentences: Sentence[]; extra?: LessonExtra } | { needMore: string };

const seenLesson = (p: ProgressLike, l: (typeof LESSONS)[number]) => !!p.completed[l.id] || l.stop.n < p.profile.startStop;
/** Lo que traen las lecciones ya hechas de una clase (diálogos, cuentos, letras…). */
const seenExtras = <K extends LessonExtra['kind']>(p: ProgressLike, kind: K) =>
  LESSONS.filter((l) => l.extra?.kind === kind && seenLesson(p, l)).map((l) => l.extra as Extract<LessonExtra, { kind: K }>);

/** Palabras con ficha que se pueden usar en la feria. */
export function feriaWords(p: ProgressLike): Word[] {
  return [...introducedIds(p)].map((id) => WORDS[id]).filter(Boolean);
}

/** ¿Hay al menos dos cestas con dos cosas presentadas cada una (y su clasificador presentado)? */
function enoughBaskets(words: Word[], forms: Set<string>) {
  const count = new Map<string, Set<string>>();
  const add = (clf: string, th: string) => count.set(clf, (count.get(clf) ?? new Set<string>()).add(th));
  for (const it of classifierItemsFor(forms)) add(it.clf, it.th);
  for (const w of words) if (w.clf && w.emoji && w.clf !== w.th && forms.has(w.clf) && CLASSIFIERS.some((c) => c.clf === w.clf)) add(w.clf, w.th);
  return [...count.values()].filter((s) => s.size >= 2).length >= 2;
}

/**
 * Lo que usa una partida de la feria: solo palabras que ya tienen ficha, frases que se entienden enteras con
 * ellas, conversaciones, cuentos y letras de lecciones ya hechas y, de los ejercicios con vocabulario propio
 * (pares de tonos, cestas, mercado, «Noi dice»), solo lo ya presentado. Nunca rellena con lo que vendrá:
 * si aún falta, lo dice.
 */
export function feriaSetup(id: GameId, p: ProgressLike): FeriaSetup {
  const words = shuffle(feriaWords(p));
  if (words.length < MIN_FERIA_WORDS)
    return { needMore: 'Aún sabes pocas palabras. Termina las primeras lecciones del camino y la feria se llenará con lo que aprendas.' };

  const forms = knownForms(words);
  const sentences = shuffle(Object.values(SENTENCES).filter((s) => s.th.every((t) => t.startsWith('{') || forms.has(t)))).slice(0, 12);
  if (SENTENCE_GAMES.includes(id) && sentences.length < 2) return { needMore: 'Este juego necesita frases que ya entiendas. Sigue unas lecciones más por el camino y vuelve.' };

  // ejercicios con vocabulario propio: solo si lo ya presentado da para una partida
  if (id === 'tigre' && minimalSetsFor(forms).length < 2)
    return { needMore: 'Aún no conoces bastantes palabras que solo cambien de tono. Sigue el camino y este puesto se abrirá.' };
  if (id === 'tonos' && words.filter((w) => syllables(w.rom).length === 1).length + toneBankFor(forms).length < 4)
    return { needMore: 'Este juego necesita más palabras cortas que ya conozcas. Sigue unas lecciones más por el camino.' };
  if (id === 'cestas' && !enoughBaskets(words, forms)) return { needMore: 'Las cestas se abren cuando aprendas los clasificadores (ตัว, คน, ใบ…) en el camino.' };
  if (id === 'noidice' && (bodyCommandsFor(forms).length < 4 || !forms.has('บอก')))
    return { needMore: 'Noi dice se abre cuando termines las lecciones del cuerpo en el camino.' };
  if (id === 'mercado' && marketNumbers(forms) < MIN_MARKET_NUMBERS) return { needMore: 'Paga justo se abre cuando aprendas los números en el camino.' };

  let extra: LessonExtra | undefined;
  if (id === 'cena') {
    const dialogues = seenExtras(p, 'dialogo').map((x) => x.id);
    if (!dialogues.length) return { needMore: 'La cena familiar se abre cuando termines tu primera conversación en el camino.' };
    extra = { kind: 'dialogo', id: pick(dialogues) };
  }
  if (id === 'cuentos') {
    // la estantería solo tiene los cuentos ya leídos en el camino
    const read = [...new Set(seenExtras(p, 'cuento').map((x) => x.id))];
    if (!read.length) return { needMore: 'La estantería de Yai se abre cuando leas tu primer cuento en el camino.' };
    extra = { kind: 'cuento', id: pick(read), shelf: read };
  }
  if (id === 'cueva' || id === 'traza') {
    const sets = [...new Set(seenExtras(p, 'letras').map((x) => x.set))].filter((s) => s === 'media' || s === 'baja' || s === 'alta');
    if (!sets.length) return { needMore: 'Este puesto se abre cuando aprendas tus primeras letras en el camino.' };
    extra = { kind: 'letras', set: pick(sets) };
  }
  if (id === 'silabas' && !seenExtras(p, 'letras').some((x) => x.set === 'silabas'))
    return { needMore: 'Los bloques de sílabas se abren cuando aprendas a juntar letras en el camino.' };
  return { words, sentences, extra };
}
