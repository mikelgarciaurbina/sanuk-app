// Carga el temario tal como lo ve la app (src/content/index.ts) y, además, lo que exporta cada archivo,
// para encontrar ids repetidos y archivos que no se han registrado en index.ts.
import { readdirSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

import type { Dialogue, Sentence, Stop, Story, Word } from '../../../src/content/types.ts';

export const CONTENIDO = new URL('../../../src/content/', import.meta.url);

// El temario importa sin extensión ('./stops-a'), como permite Metro; Node necesita la ruta exacta.
// Además se marca cada .ts como módulo ES para que Node no tenga que adivinarlo (y no avise por ello).
registerHooks({
  resolve(especificador, contexto, siguiente) {
    let r: ReturnType<typeof siguiente> | undefined;
    if (/^\.{1,2}\//.test(especificador) && !/\.[cm]?[jt]sx?$/.test(especificador)) {
      for (const ext of ['.ts', '/index.ts']) {
        try {
          r = siguiente(especificador + ext, contexto);
          break;
        } catch {
          // probamos la siguiente forma
        }
      }
    }
    r ??= siguiente(especificador, contexto);
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
