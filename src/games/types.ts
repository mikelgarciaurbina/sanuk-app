import type { GameId, LessonExtra, Sentence, Word } from '@/content/types';
import type { Gender } from '@/lib/thai';

export type GameMode = 'leccion' | 'feria';

export type GameResult = {
  correct: number;
  total: number;
  /** plátanos ganados en la partida */
  bananas: number;
  /** puntuación para el récord de la feria (si el juego la usa) */
  score?: number;
};

export type GameProps = {
  /** 'leccion' = paso corto dentro de una lección · 'feria' = partida completa con récord */
  mode: GameMode;
  /** palabras disponibles (las de la lección primero, luego las aprendidas) */
  words: Word[];
  /** palabras nuevas de la lección (prioridad) */
  focus: Word[];
  sentences: Sentence[];
  extra?: LessonExtra;
  /** número de rondas sugerido */
  rounds?: number;
  /** primera curva: todo de oído (sin opciones escritas ni preguntas sobre frases que aún no se entienden) */
  oral?: boolean;
  gender: Gender;
  /** avisa de cada respuesta (repaso espaciado, combo y sonido los gestiona el juego) */
  onAnswer: (ok: boolean, wordId?: string) => void;
  onDone: (r: GameResult) => void;
};

export type GameCategory = 'Palabras' | 'Oído y tonos' | 'Frases' | 'Vida real' | 'Letras';

export type GameMeta = {
  id: GameId;
  name: string;
  short: string;
  trains: string;
  cat: GameCategory;
  emoji: string;
  tint: string;
  /** parada a partir de la que se abre en la feria */
  unlock: number;
  rounds: { leccion: number; feria: number };
};
