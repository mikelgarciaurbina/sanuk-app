// Carga el temario tal como lo ve la app (src/content/index.ts) y, además, lo que exporta cada archivo,
// para encontrar ids repetidos y archivos que no se han registrado en index.ts.
import { readdirSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

import type { Dialogue, Pattern, Sentence, Stop, Story, Word } from '../../../src/content/types.ts';

export const CONTENIDO = new URL('../../../src/content/', import.meta.url);

// El temario importa sin extensión ('./stops-a') y con el alias '@/' (src/), como permite Metro; Node necesita
// la ruta exacta. Además se marca cada .ts como módulo ES para que Node no tenga que adivinarlo (y no avise).
const SRC = new URL('../../../src/', import.meta.url);
registerHooks({
  resolve(especificador, contexto, siguiente) {
    const spec = especificador.startsWith('@/') ? new URL(especificador.slice(2), SRC).href : especificador;
    let r: ReturnType<typeof siguiente> | undefined;
    if (/^(\.{1,2}\/|file:)/.test(spec) && !/\.[cm]?[jt]sx?$/.test(spec)) {
      for (const ext of ['.ts', '/index.ts']) {
        try {
          r = siguiente(spec + ext, contexto);
          break;
        } catch {
          // probamos la siguiente forma
        }
      }
    }
    r ??= siguiente(spec, contexto);
    return r.url.endsWith('.ts') ? { ...r, format: 'module-typescript' } : r;
  },
});

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
