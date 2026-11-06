// Informe de nivel del temario: al acabar cada temporada, cuánto del thai más frecuente se ha enseñado,
// qué situaciones de conversación se cubren y si lo que se lee en cada lección ya se ha enseñado.
// Uso, desde app/: npm run temario:nivel
//   --faltan [N]   las N palabras más frecuentes que aún no enseña ninguna lección (100 si no se dice)
import type { LessonRef } from '../../src/content/index.ts';
import { cargarTemario } from './lib/cargar.mts';
import { FUNCIONES } from './lib/funciones.mts';
import { cargarFrecuencias, cobertura, crearDiccionario, cubierto, type Frecuencias, Vocabulario } from './lib/vocabulario.mts';
import { CONOCIDAS_DE_INICIO } from './reglas.mts';

const t = await cargarTemario();
const { app } = t;
const ttc = cargarFrecuencias('ttc');
const tnc = cargarFrecuencias('tnc');
const dic = crearDiccionario(tnc, ttc, Object.values(app.WORDS));
const voc = new Vocabulario(dic, [...Object.keys(CONOCIDAS_DE_INICIO), ...t.nombresPropios]);

/** Todo lo que se lee y se oye en una lección. */
const textoDe = (l: LessonRef) =>
  [
    ...l.words.map((id) => app.WORDS[id]?.th ?? ''),
    ...(l.sentences ?? []).map((id) => (app.SENTENCES[id]?.th ?? []).join('')),
    ...(l.extra?.kind === 'dialogo' ? (app.DIALOGUES[l.extra.id]?.lines ?? []).flatMap((x) => [x.th, ...(x.options ?? []).map((o) => o.th)]) : []),
  ].join(' | ');

// recorre el camino lección a lección y guarda una foto al acabar cada temporada
type Corte = { temporada: number; palabras: number; voc: Vocabulario; textos: string[] };
const cortes: Corte[] = [];
const ensenadas = new Set<string>();
const textos: string[] = [];
const orden = { frases: [0, 0], familia: [0, 0], respuestas: [0, 0] };
const cuenta = (que: keyof typeof orden, texto: string) => {
  orden[que][0] += voc.piezas(texto);
  orden[que][1] += voc.desconocidas(texto).length;
};
for (const l of app.LESSONS) {
  for (const id of l.words) {
    const w = app.WORDS[id];
    if (!w) continue;
    voc.aprender(w);
    ensenadas.add(id);
  }
  for (const id of l.sentences ?? []) cuenta('frases', (app.SENTENCES[id]?.th ?? []).join(''));
  if (l.extra?.kind === 'dialogo')
    for (const linea of app.DIALOGUES[l.extra.id]?.lines ?? []) {
      cuenta('familia', linea.th);
      for (const o of linea.options ?? []) if (o.ok) cuenta('respuestas', o.th);
    }
  textos.push(textoDe(l));
  const siguiente = app.LESSONS[l.index + 1];
  if (!siguiente || app.seasonOf(siguiente.stop) !== app.seasonOf(l.stop))
    cortes.push({ temporada: app.seasonOf(l.stop), palabras: ensenadas.size, voc: voc.copia(), textos: [...textos] });
}

// ——— tabla ———
const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const pct = (x: number, decimales = 0) => `${(x * 100).toFixed(decimales).replace('.', ',')} %`;
const TOPS = [100, 300, 500, 1000, 2000];
const situaciones = (c: Corte) => FUNCIONES.filter((f) => f.expresiones.every((re) => c.textos.some((tx) => re.test(tx))));

const filas: [string, ...string[]][] = [];
const titulo = (c: Corte) => (c === cortes[0] ? `Temporada ${c.temporada}` : `Temporadas ${cortes[0].temporada}–${c.temporada}`);
filas.push(['', ...cortes.map(titulo)]);
filas.push(['Palabras enseñadas', ...cortes.map((c) => miles(c.palabras))]);
const bloque = (nombre: string, lista: Frecuencias, tops: number[]) => {
  const datos = cortes.map((c) => cobertura(lista, c.voc, tops));
  filas.push([nombre, ...cortes.map(() => '')]);
  for (const n of tops) filas.push([`  de las ${miles(n)} más frecuentes`, ...datos.map((d) => pct(d.top[n] / n))]);
  filas.push(['  de las palabras de un texto', ...datos.map((d) => pct(d.texto, 1))]);
};
bloque('Thai cotidiano (libros de texto, TTC)', ttc, TOPS);
bloque('Thai general (prensa y libros, TNC)', tnc, [500, 1000]);
filas.push(['Situaciones de conversación', ...cortes.map((c) => `${situaciones(c).length} de ${FUNCIONES.length}`)]);

const anchos = filas[0].map((_, j) => Math.max(...filas.map((f) => [...f[j]].length)));
console.log('Sanuk · nivel del temario');
console.log('');
for (const f of filas) console.log(f.map((celda, j) => (j === 0 ? celda.padEnd(anchos[0]) : celda.padStart(anchos[j]))).join('   ').trimEnd());
console.log('');
const conocido = ([piezas, nuevas]: number[]) => pct(piezas ? 1 - nuevas / piezas : 1, 1);
console.log(`Palabras ya enseñadas cuando aparecen: frases ${conocido(orden.frases)} · lo que dice la familia ${conocido(orden.familia)} · respuestas correctas ${conocido(orden.respuestas)}`);
const ultimo = cortes[cortes.length - 1];
const faltanSituaciones = FUNCIONES.filter((f) => !situaciones(ultimo).includes(f));
if (faltanSituaciones.length) console.log(`Situaciones sin cubrir: ${faltanSituaciones.map((f) => f.nombre).join(' · ')}`);

// ——— --faltan: lo siguiente que convendría enseñar ———
const i = process.argv.indexOf('--faltan');
if (i >= 0) {
  const n = Number(process.argv[i + 1]) || 100;
  const pendientes = ttc.map((r, k) => ({ th: r[0], veces: r[1], puesto: k + 1 })).filter((r) => !cubierto(r.th, ultimo.voc.conocidas));
  console.log('');
  console.log(`Las ${n} palabras más frecuentes (TTC) que aún no enseña ninguna lección:`);
  console.log(
    pendientes
      .slice(0, n)
      .map((r) => `${r.puesto}. ${r.th}`)
      .join('  '),
  );
}
