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
  /** Solo si una forma thai es dos palabras del palabrario (ไหม: pregunta o seda · เลย: «de verdad» o «así que») y aquí
   *  no es la que enseña la lección de la frase ni la primera: `{ 'ไหม': 'mai_silk' }`. */
  w?: Record<string, string>;
};

export type GameId =
  | 'parejas' | 'memoria' | 'monzon' | 'siono' | 'farolillos'
  | 'oido' | 'tonos' | 'tigre' | 'eco'
  | 'puente' | 'hueco' | 'cestas' | 'noidice'
  | 'mercado' | 'cena' | 'curvas'
  | 'cueva' | 'traza' | 'silabas' | 'cuentos';

/**
 * Grupos de letras de una lección de escritura:
 * `media` · `baja` · `alta` · `raras` (consonantes: cueva y trazo) · `vocales` (largas) · `cortas` · `compuestas`
 * (vocales: bloques de sílabas y cueva) · `silabas` (construir la sílaba que se oye) · `reglas` (leer una sílaba
 * y decir su tono: clase de la consonante + sílaba viva o muerta + marca).
 */
export type LetterSet = 'media' | 'baja' | 'alta' | 'raras' | 'vocales' | 'cortas' | 'compuestas' | 'silabas' | 'reglas';

export type LessonExtra =
  | { kind: 'dialogo'; id: string }
  /** `shelf`: en la feria, los cuentos que ya se pueden leer (los de lecciones hechas) */
  | { kind: 'cuento'; id: string; shelf?: string[] }
  /** `pool`: en la feria, todos los grupos de letras ya aprendidos (para mezclarlos) */
  | { kind: 'letras'; set: LetterSet; pool?: LetterSet[] }
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
  /** El momento de la historia con el que empieza la lección: qué pasa en el viaje y por qué hace falta lo de hoy.
   *  Una o dos frases en español, en segunda persona; lo cuenta Noi antes de la primera ficha. */
  beat?: string;
  /** Cómo sigue la historia al acabar (una frase, en la pantalla de «curva superada»). Solo si pasa algo. */
  after?: string;
  /** Patrones de gramática que se explican en esta lección, antes de practicar sus frases (ids de PATTERNS). */
  patterns?: string[];
};

/**
 * Gramática en un minuto: un patrón explicado con frases que la lección ya tiene.
 * `formula` separa las piezas con « + » («frase + ไหม»). `examples` son ids de frases de esa lección o de
 * lecciones anteriores (así el revisor comprueba que no usan nada sin enseñar) y `mark`, las piezas thai que
 * se resaltan en ellas. `trap` es el error típico de quien viene del español.
 */
export type Pattern = {
  id: string;
  title: string;
  formula?: string;
  rule: string;
  examples: string[];
  mark?: string[];
  trap?: string;
};

export type FamilyMessage = { from: 'Yai' | 'Mae' | 'Pho' | 'Nong'; th: string; rom: string; es: string };

/**
 * Reto para hacer en la vida real, con la pareja o la familia, al terminar una parada o un mes.
 * `replies`: lo que es fácil que te contesten, para reconocerlo cuando llegue.
 */
export type Mission = { es: string; th: string; rom: string; tip?: string; replies?: { th: string; rom: string; es: string }[] };

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
  /** `reply.who`: quién contesta, si no es quien dice la línea (en un debate, la respuesta puede venir de otro) */
  options?: { th: string; rom: string; es: string; ok: boolean; reply?: { th: string; rom: string; es: string; who?: DialogueLine['who'] } }[];
};

/** Dónde ocurre una conversación: decide el escenario y quién está presente (solo quien habla, salvo en la mesa). */
export type DialoguePlace = 'mesa' | 'calle' | 'mercado' | 'cafe' | 'telefono' | 'templo' | 'campo' | 'cocina' | 'fuego' | 'sala';

/** `place`: si falta, la mesa de la cena familiar. */
export type Dialogue = { id: string; title: string; scene: string; place?: DialoguePlace; lines: DialogueLine[] };

export type StoryToken = { th: string; rom?: string; es?: string; w?: string };
export type Story = {
  id: string;
  title: string;
  titleTh: string;
  pages: { lines: StoryToken[][]; es: string }[];
  questions: { q: string; options: string[]; answer: number }[];
};
