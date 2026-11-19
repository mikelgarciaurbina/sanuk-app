// Carga el temario tal como lo ve la app (src/content/index.ts) y, además, lo que exporta cada archivo,
// para encontrar ids repetidos y archivos que no se han registrado en index.ts.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import '../../register-app.mjs';
import type { Dialogue, Pattern, Sentence, Stop, Story, Word } from '../../../src/content/types.ts';

export const CONTENIDO = new URL('../../../src/content/', import.meta.url);

export type ConOrigen<T> = { item: T; archivo: string };

export type Temario = {
  /** Lo que importa la app: STOPS, LESSONS, WORDS, SENTENCES, DIALOGUES, STORIES, seasonOf… */
  app: typeof import('../../../src/content/index.ts');
  /** Lo que exporta cada archivo (WORDS_*, SENTENCES_*, STOPS_*, DIALOGUES_*, STORIES_*), con repetidos incluidos. */
  palabras: ConOrigen<Word>[];
  frases: ConOrigen<Sentence>[];
  paradas: ConOrigen<Stop>[];
  dialogos: ConOrigen<Dialogue>[];
  cuentos: ConOrigen<Story>[];
  patrones: ConOrigen<Pattern>[];
  /** Nombres propios que se usan sin enseñarse (PROPER_NOUNS_*). */
  nombresPropios: string[];
  carta: typeof import('../../../src/content/yai.ts');
  letras: typeof import('../../../src/content/letters.ts');
};

const PREFIJOS = {
  WORDS_: 'palabras',
  SENTENCES_: 'frases',
  STOPS_: 'paradas',
  DIALOGUES_: 'dialogos',
  STORIES_: 'cuentos',
  PATTERNS_: 'patrones',
  PROPER_NOUNS_: 'nombresPropios',
} as const;

export async function cargarTemario(): Promise<Temario> {
  const t = {
    app: await import(new URL('index.ts', CONTENIDO).href),
    palabras: [],
    frases: [],
    paradas: [],
    dialogos: [],
    cuentos: [],
    patrones: [],
    nombresPropios: [],
    carta: await import(new URL('yai.ts', CONTENIDO).href),
    letras: await import(new URL('letters.ts', CONTENIDO).href),
  } as Temario;
  const archivos = (readdirSync(fileURLToPath(CONTENIDO), { recursive: true }) as string[])
    .filter((f) => f.endsWith('.ts') && !/(^|\/)(index|types)\.ts$/.test(f))
    .sort();
  for (const archivo of archivos) {
    const modulo: Record<string, unknown> = await import(new URL(archivo, CONTENIDO).href);
    for (const [nombre, valor] of Object.entries(modulo)) {
      const prefijo = (Object.keys(PREFIJOS) as (keyof typeof PREFIJOS)[]).find((p) => nombre.startsWith(p));
      if (!prefijo || !Array.isArray(valor)) continue;
      const destino = PREFIJOS[prefijo];
      if (destino === 'nombresPropios') t.nombresPropios.push(...(valor as string[]));
      else (t[destino] as ConOrigen<unknown>[]).push(...valor.map((item) => ({ item, archivo })));
    }
  }
  return t;
}
