// Qué palabras thai conoce ya quien aprende, y qué parte del thai frecuente cubren.
// El thai se escribe sin espacios: para saber qué palabras hay en un texto se segmenta con un diccionario
// (listas de frecuencia de PyThaiNLP, en ../datos) más el vocabulario del propio temario.
import { readFileSync } from 'node:fs';

import type { Word } from '../../../src/content/types.ts';

/** Palabra y número de apariciones en el corpus, de la más frecuente a la menos. */
export type Frecuencias = [palabra: string, veces: number][];

const DATOS = new URL('../datos/', import.meta.url);
const LARGO_MAX = 20;
const esThai = (c: string) => c >= '฀' && c <= '๿';
/** Trozos de thai seguido: lo demás (espacios, puntuación, latín) y la marca de repetición ๆ los separan. */
const trozos = (texto: string) => texto.split(/[^฀-๿]+|ๆ/).filter(Boolean);
const largo = (s: string) => [...s].length;

/**
 * TTC: Thai Textbook Corpus (libros de texto; thai escolar y cotidiano).
 * TNC: Thai National Corpus (prensa, literatura, documentos; thai general y formal).
 */
export function cargarFrecuencias(corpus: 'ttc' | 'tnc'): Frecuencias {
  return readFileSync(new URL(`${corpus}_freq.txt`, DATOS), 'utf8')
    .split('\n')
    .map((linea) => linea.split('\t'))
    .filter((r) => r[0] && esThai(r[0][0]))
    .map((r) => [r[0], Number(r[1])]);
}

/** Formas de una palabra del temario: «ช้าๆ» → ช้า; «ครับ/ค่ะ» → ครับ, ค่ะ. */
export const formas = (w: Word) => w.th.split(/[\s…/()ๆ]+/).filter(Boolean);

/** Quita los marcadores de partícula y pronombre ({P}, {PQ}, {I}). */
export const sinMarcadores = (texto: string) => texto.replaceAll('{PQ}', ' ').replaceAll('{P}', ' ').replaceAll('{I}', ' ');

/** Diccionario para segmentar: las 60.000 palabras más frecuentes del TNC, todo el TTC y el vocabulario del temario. */
export function crearDiccionario(tnc: Frecuencias, ttc: Frecuencias, palabras: Iterable<Word>): Set<string> {
  const dic = new Set<string>([...tnc.slice(0, 60000).map((r) => r[0]), ...ttc.map((r) => r[0])]);
  for (const w of palabras) for (const f of formas(w)) dic.add(f);
  return dic;
}

/**
 * Parte un texto en palabras con el menor número de piezas. Una letra suelta que no está en el diccionario
 * cuesta mucho, y las seguidas se juntan en una sola pieza desconocida. `excluir` impide usar esa palabra entera.
 */
export function segmentar(texto: string, dic: Set<string>, excluir?: string): string[] {
  const out: string[] = [];
  for (const trozo of trozos(texto)) {
    const n = trozo.length;
    const coste = new Array<number>(n + 1).fill(Infinity);
    const previo = new Array<number>(n + 1).fill(-1);
    coste[0] = 0;
    for (let i = 0; i < n; i++) {
      if (coste[i] === Infinity) continue;
      for (let j = i + 1; j <= Math.min(n, i + LARGO_MAX); j++) {
        const pieza = trozo.slice(i, j);
        const c = dic.has(pieza) && pieza !== excluir ? 1 : j === i + 1 ? 50 : Infinity;
        if (coste[i] + c < coste[j]) {
          coste[j] = coste[i] + c;
          previo[j] = i;
        }
      }
    }
    const piezas: string[] = [];
    for (let j = n; j > 0; j = previo[j]) piezas.unshift(trozo.slice(previo[j], j));
    for (const p of piezas) {
      if (!dic.has(p) && out.length && !dic.has(out[out.length - 1]) && p.length === 1) out[out.length - 1] += p;
      else out.push(p);
    }
  }
  return out;
}

/** ¿Se puede escribir el texto entero juntando formas conocidas? */
export function cubierto(texto: string, conocidas: Set<string>): boolean {
  for (const trozo of trozos(texto)) {
    const n = trozo.length;
    const llega = new Array<boolean>(n + 1).fill(false);
    llega[0] = true;
    for (let i = 0; i < n; i++) {
      if (!llega[i]) continue;
      for (let j = i + 1; j <= Math.min(n, i + LARGO_MAX); j++) if (conocidas.has(trozo.slice(i, j))) llega[j] = true;
    }
    if (!llega[n]) return false;
  }
  return true;
}

/** Lo que sabe quien aprende en un momento del camino. */
export class Vocabulario {
  readonly dic: Set<string>;
  readonly conocidas: Set<string>;

  constructor(dic: Set<string>, iniciales: Iterable<string> = []) {
    this.dic = dic;
    this.conocidas = new Set(iniciales);
  }

  /**
   * Aprende una palabra del temario: sus formas y las piezas de 2 o más letras que la componen
   * (โรงพยาบาล enseña también พยาบาล). Las letras sueltas no cuentan: con ellas se «compondría» cualquier palabra.
   */
  aprender(w: Word) {
    for (const f of formas(w)) {
      this.conocidas.add(f);
      for (const p of segmentar(f, this.dic)) if (largo(p) > 1) this.conocidas.add(p);
      for (const p of segmentar(f, this.dic, f)) if (this.dic.has(p) && largo(p) > 1) this.conocidas.add(p);
    }
  }

  /** ¿Conoce todas las palabras de este texto? */
  conoce(texto: string): boolean {
    return cubierto(sinMarcadores(texto), this.conocidas);
  }

  /** Las palabras del texto que aún no se han enseñado. */
  desconocidas(texto: string): string[] {
    const t = sinMarcadores(texto);
    if (cubierto(t, this.conocidas)) return [];
    return segmentar(t, this.dic).filter((p) => !cubierto(p, this.conocidas));
  }

  /** Cuántas palabras tiene el texto según el diccionario. */
  piezas(texto: string): number {
    return segmentar(sinMarcadores(texto), this.dic).length;
  }

  copia(): Vocabulario {
    return new Vocabulario(this.dic, this.conocidas);
  }
}

/** Cuántas de las N palabras más frecuentes se conocen, y qué parte de un texto corriente suponen. */
export function cobertura(lista: Frecuencias, voc: Vocabulario, tops: number[]) {
  const total = lista.reduce((a, r) => a + r[1], 0);
  const conocida = lista.map((r) => cubierto(r[0], voc.conocidas));
  const top = Object.fromEntries(tops.map((n) => [n, conocida.slice(0, n).filter(Boolean).length])) as Record<number, number>;
  const masa = lista.reduce((a, r, i) => a + (conocida[i] ? r[1] : 0), 0);
  return { top, texto: masa / total };
}
