import type { ToneId } from '@/brand/tokens';

export type { ToneId };

/** Una palabra o expresión. `rom` usa la transcripción de Sanuk (tipo Paiboon):
 *  vocales largas dobles, ɛ ɔ ʉ ə, y tono con tilde: à bajo · â descendente · á alto · ǎ ascendente · a medio. */
export type Word = {
  id: string;
  th: string;
  rom: string;
  es: string;
  emoji?: string;
  cat?: Category;
  note?: string;
  /** clasificador para contar (ตัว, คน, ใบ…) */
  clf?: string;
};

export type Category =
  | 'saludo' | 'cortesia' | 'pronombre' | 'pregunta' | 'particula' | 'numero' | 'dinero' | 'comida' | 'bebida'
  | 'fruta' | 'animal' | 'color' | 'cuerpo' | 'adjetivo' | 'verbo' | 'lugar' | 'transporte' | 'tiempo'
  | 'clima' | 'naturaleza' | 'familia' | 'casa' | 'sentimiento' | 'cultura' | 'cocina' | 'conector' | 'norte';

/** Frase en tokens thai. Marcadores: {P} partícula (ครับ/ค่ะ), {PQ} partícula de pregunta (ครับ/คะ), {I} «yo» (ผม/ฉัน). */
export type Sentence = {
  id: string;
  th: string[];
  rom: string;
  es: string;
};

export type GameId =
  | 'parejas' | 'memoria' | 'monzon' | 'siono' | 'farolillos'
  | 'oido' | 'tonos' | 'tigre' | 'eco'
  | 'puente' | 'hueco' | 'cestas' | 'noidice'
  | 'mercado' | 'cena' | 'curvas'
  | 'cueva' | 'traza' | 'silabas' | 'cuentos';

export type LessonExtra =
  | { kind: 'dialogo'; id: string }
  /** `shelf`: en la feria, los cuentos que ya se pueden leer (los de lecciones hechas) */
  | { kind: 'cuento'; id: string; shelf?: string[] }
  | { kind: 'letras'; set: string }
  | { kind: 'tonos' }
  | { kind: 'numeros' }
  | { kind: 'clasificadores' }
  | { kind: 'cuerpo' };

export type Lesson = {
  id: string;
  title: string;
  goal: string;
  words: string[];
  sentences?: string[];
  extra?: LessonExtra;
};

export type FamilyMessage = { from: 'Yai' | 'Mae' | 'Pho' | 'Nong'; th: string; rom: string; es: string };

/** Reto para hacer en la vida real, con la pareja o la familia, al terminar un mes de la temporada 2. */
export type Mission = { es: string; th: string; rom: string; tip?: string };

export type Stop = {
  id: string;
  n: number;
  place: string;
  title: string;
  theme: string;
  level: string;
  stamp: string;
  lessons: Lesson[];
  message?: FamilyMessage;
  /** 1 = la carretera (por defecto) · 2 = un año en el pueblo */
  season?: 1 | 2;
  /** mes de la temporada 2 («Abril»…) y su nombre thai */
  month?: string;
  monthTh?: string;
  mission?: Mission;
};

export type Consonant = {
  ch: string;
  name: string;
  nameRom: string;
  meaning: string;
  sound: string;
  final?: string;
  cls: 'media' | 'alta' | 'baja';
};

export type Vowel = { ch: string; rom: string; long: boolean; pos: 'antes' | 'despues' | 'arriba' | 'abajo' | 'rodea' };

export type DialogueLine = {
  who: 'Mae' | 'Pho' | 'Yai' | 'Nong' | 'Lung' | 'Noi';
  th: string;
  rom: string;
  es: string;
  options?: { th: string; rom: string; es: string; ok: boolean; reply?: { th: string; rom: string; es: string } }[];
};

export type Dialogue = { id: string; title: string; scene: string; lines: DialogueLine[] };

export type StoryToken = { th: string; rom?: string; es?: string; w?: string };
export type Story = {
  id: string;
  title: string;
  titleTh: string;
  pages: { lines: StoryToken[][]; es: string }[];
  questions: { q: string; options: string[]; answer: number }[];
};
