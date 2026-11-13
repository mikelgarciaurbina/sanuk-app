// Revisor del temario de Sanuk. Uso, desde app/: npm run temario  (con --todo, sin recortar listas largas)
// Comprueba que lo que carga la app está completo y bien enlazado, que cada transcripción suena como se
// escribe (tonos incluidos) y que ninguna frase usa palabras antes de enseñarlas.
// Termina con código 1 si hay errores (❌); los avisos (⚠️) no bloquean.
import type { Stop } from '../../src/content/types.ts';
import { cargarTemario, type ConOrigen } from './lib/cargar.mts';
import { comprobarTonos } from './lib/tonos.mts';
import { cargarFrecuencias, crearDiccionario, Vocabulario } from './lib/vocabulario.mts';
import { ANTES_DE_TIEMPO, CONOCIDAS_DE_INICIO, GRUPOS_DE_LETRAS_ESPECIALES, HOMOGRAFOS, type Rango, reglasDe, TAMANOS_ESPECIALES, TEXTOS } from './reglas.mts';

type Seccion = { titulo: string; errores: string[]; avisos: string[]; nota?: string };
const secciones: Seccion[] = [];
const seccion = (titulo: string): Seccion => {
  const s: Seccion = { titulo, errores: [], avisos: [] };
  secciones.push(s);
  return s;
};
const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const plural = (n: number, uno: string, varios: string) => `${miles(n)} ${n === 1 ? uno : varios}`;

const t = await cargarTemario();
const { app } = t;
const temporada = (st: Stop) => app.seasonOf(st);
const palabras = Object.values(app.WORDS);
const frases = Object.values(app.SENTENCES);
const dialogos = Object.values(app.DIALOGUES);

// ——— 1. Archivos: todo lo que exporta src/content llega a la app ———
{
  const s = seccion('Archivos registrados en src/content/index.ts');
  const NOMBRES = { palabras: ['palabra', 'palabras'], frases: ['frase', 'frases'], paradas: ['parada', 'paradas'], conversaciones: ['conversación', 'conversaciones'], cuentos: ['cuento', 'cuentos'] } as const;
  const faltan = new Map<string, Map<keyof typeof NOMBRES, number>>();
  const anota = (archivo: string, que: keyof typeof NOMBRES) => {
    const m = faltan.get(archivo) ?? new Map<keyof typeof NOMBRES, number>();
    m.set(que, (m.get(que) ?? 0) + 1);
    faltan.set(archivo, m);
  };
  for (const { item, archivo } of t.palabras) if (!(item.id in app.WORDS)) anota(archivo, 'palabras');
  for (const { item, archivo } of t.frases) if (!(item.id in app.SENTENCES)) anota(archivo, 'frases');
  for (const { item, archivo } of t.paradas) if (!app.STOPS.includes(item)) anota(archivo, 'paradas');
  for (const { item, archivo } of t.dialogos) if (!(item.id in app.DIALOGUES)) anota(archivo, 'conversaciones');
  for (const { item, archivo } of t.cuentos) if (!app.STORIES.includes(item)) anota(archivo, 'cuentos');
  for (const { item, archivo } of t.patrones) if (app.PATTERNS[item.id] !== item) s.errores.push(`${archivo}: el patrón ${item.id} no llega a la app (impórtalo en src/content/index.ts o tiene el id repetido)`);
  for (const [archivo, m] of faltan) {
    const lista = [...m].map(([que, n]) => plural(n, NOMBRES[que][0], NOMBRES[que][1])).join(', ');
    s.errores.push(`${archivo} no llega a la app (${lista}): impórtalo en src/content/index.ts`);
  }
  app.STOPS.forEach((st, i) => {
    if (st.n !== i + 1) s.errores.push(`la parada ${st.id} tiene n = ${st.n}, pero es la ${i + 1}.ª del camino`);
    if (st.id !== `p${st.n}`) s.errores.push(`la parada ${st.id} debería llamarse p${st.n}`);
    const antes = app.STOPS[i - 1];
    if (antes && temporada(st) < temporada(antes)) s.errores.push(`la parada ${st.id} (temporada ${temporada(st)}) va después de ${antes.id} (temporada ${temporada(antes)})`);
  });
}

// ——— 2. Ids y referencias ———
{
  const s = seccion('Ids y referencias');
  const repetidos = <T,>(lista: ConOrigen<T>[], id: (x: T) => string, que: string) => {
    const vistos = new Map<string, string>();
    for (const { item, archivo } of lista) {
      const k = id(item);
      const antes = vistos.get(k);
      if (antes !== undefined) s.errores.push(`id repetido en ${que}: ${k} (${antes === archivo ? `dos veces en ${archivo}` : `${antes} y ${archivo}`})`);
      else vistos.set(k, archivo);
    }
  };
  repetidos(t.palabras, (w) => w.id, 'palabras');
  repetidos(t.frases, (f) => f.id, 'frases');
  repetidos(t.paradas, (p) => p.id, 'paradas');
  repetidos(t.dialogos, (d) => d.id, 'conversaciones');
  repetidos(t.cuentos, (c) => c.id, 'cuentos');
  repetidos(
    app.LESSONS.map((l) => ({ item: l, archivo: l.stop.id })),
    (l) => l.id,
    'lecciones',
  );

  for (const { item: w, archivo } of t.palabras) {
    if (!/^[a-z0-9_]+$/.test(w.id)) s.errores.push(`palabra ${w.id} (${archivo}): el id solo puede llevar a-z, 0-9 y _`);
    for (const campo of ['th', 'rom', 'es', 'emoji', 'cat'] as const) if (!w[campo]?.trim()) s.errores.push(`palabra ${w.id}: falta ${campo}`);
  }
  for (const { item: f, archivo } of t.frases) {
    if (!/^[a-z0-9_]+$/.test(f.id)) s.errores.push(`frase ${f.id} (${archivo}): el id solo puede llevar a-z, 0-9 y _`);
    if (!f.th.length || f.th.some((pieza) => !pieza.trim())) s.errores.push(`frase ${f.id}: tiene piezas vacías`);
  }

  // la misma palabra thai enseñada dos veces (salvo homógrafos), o dos palabras con la misma traducción
  const porTh = new Map<string, Set<string>>();
  for (const w of palabras) porTh.set(w.th, (porTh.get(w.th) ?? new Set()).add(w.id));
  for (const [th, ids] of porTh)
    if (ids.size > 1 && !HOMOGRAFOS[th]) s.errores.push(`«${th}» se enseña dos veces (${[...ids].join(', ')}): usa la primera o, si significa otra cosa, añádela a HOMOGRAFOS en reglas.mts`);
  const porEs = new Map<string, string>();
  for (const w of palabras) {
    const k = w.es.trim().toLowerCase();
    const otra = porEs.get(k);
    if (otra) s.errores.push(`${otra} y ${w.id} se traducen igual («${w.es}»): los juegos no podrían distinguirlas`);
    else porEs.set(k, w.id);
  }

  const enLecciones = new Set<string>();
  const frasesEnLecciones = new Set<string>();
  for (const l of app.LESSONS) {
    const vistas = new Set<string>();
    for (const id of l.words) {
      if (!app.WORDS[id]) s.errores.push(`${l.id}: la palabra ${id} no existe`);
      if (vistas.has(id)) s.errores.push(`${l.id}: la palabra ${id} está dos veces`);
      vistas.add(id);
      enLecciones.add(id);
    }
    for (const id of l.sentences ?? []) {
      if (!app.SENTENCES[id]) s.errores.push(`${l.id}: la frase ${id} no existe`);
      frasesEnLecciones.add(id);
    }
    const x = l.extra;
    if (x?.kind === 'dialogo' && !app.DIALOGUES[x.id]) s.errores.push(`${l.id}: la conversación ${x.id} no existe`);
    if (x?.kind === 'cuento' && !app.STORIES.some((c) => c.id === x.id)) s.errores.push(`${l.id}: el cuento ${x.id} no existe`);
    if (x?.kind === 'letras' && !t.letras.LETTER_SETS[x.set] && !GRUPOS_DE_LETRAS_ESPECIALES[x.set]) s.errores.push(`${l.id}: el grupo de letras «${x.set}» no existe`);
  }
  for (const { item: w, archivo } of t.palabras) if (!enLecciones.has(w.id)) s.errores.push(`la palabra ${w.id} (${archivo}) no se enseña en ninguna lección`);
  for (const { item: f, archivo } of t.frases) if (!frasesEnLecciones.has(f.id)) s.errores.push(`la frase ${f.id} (${archivo}) no sale en ninguna lección`);

  for (const c of app.STORIES)
    for (const p of c.pages)
      for (const linea of p.lines)
        for (const tk of linea) {
          if (!tk.w) continue;
          const w = app.WORDS[tk.w];
          if (!w) s.errores.push(`cuento ${c.id}: «${tk.th}» enlaza a la palabra ${tk.w}, que no existe`);
          else if (w.th !== tk.th) s.errores.push(`cuento ${c.id}: «${tk.th}» enlaza a ${tk.w}, que es «${w.th}»`);
        }

  for (const tk of t.carta.YAI_TOKENS)
    for (const id of tk.w) {
      const w = app.WORDS[id];
      if (!w) s.errores.push(`carta de Yai: «${tk.th}» enlaza a la palabra ${id}, que no existe`);
      else if (!tk.th.includes(w.th) && !w.th.includes(tk.th)) s.avisos.push(`carta de Yai: «${tk.th}» enlaza a ${id}, que es «${w.th}»`);
    }
}

// ——— 3. Paradas y lecciones ———
const fuera = (s: Seccion, [min, max]: Rango, n: number, que: string, tt: number) => {
  if (n < min || n > max) s.avisos.push(`${que} (en la temporada ${tt} lo habitual es ${min === max ? min : `${min}–${max}`})`);
};
{
  const s = seccion('Paradas y lecciones');
  for (const st of app.STOPS) {
    const tt = temporada(st);
    const r = reglasDe(tt);
    for (const campo of ['place', 'title', 'theme', 'level', 'stamp'] as const) if (!st[campo]?.trim()) s.errores.push(`parada ${st.id}: falta ${campo}`);
    if (!st.message) s.errores.push(`parada ${st.id}: falta el mensaje de la familia`);
    if (r.meses) {
      if (!st.month || !st.monthTh) s.errores.push(`parada ${st.id}: falta el mes (month y monthTh)`);
      if (!st.mission?.es || !st.mission.th || !st.mission.rom) s.errores.push(`parada ${st.id}: falta la misión (es, th y rom)`);
      if (st.lessons.at(-1)?.extra?.kind !== 'dialogo') s.errores.push(`parada ${st.id}: la última lección del mes debe ser la conversación (extra: { kind: 'dialogo', id })`);
    }
    fuera(s, r.leccionesPorParada, st.lessons.length, `parada ${st.id}: ${st.lessons.length} lecciones`, tt);
    st.lessons.forEach((l, i) => {
      if (l.id !== `${st.id}l${i + 1}`) s.errores.push(`lección ${l.id}: debería llamarse ${st.id}l${i + 1}`);
      if (!l.title?.trim() || !l.goal?.trim()) s.errores.push(`lección ${l.id}: falta el título o el objetivo`);
      // la historia: cada lección empieza con su momento (beat) y, si pasa algo, se cierra con otro (after)
      if (!l.beat?.trim()) s.errores.push(`lección ${l.id}: falta el momento de la historia (beat)`);
      else fuera(s, TEXTOS.momento, l.beat.length, `lección ${l.id}: el momento de la historia tiene ${l.beat.length} caracteres`, tt);
      if (l.after !== undefined) fuera(s, TEXTOS.despues, l.after.length, `lección ${l.id}: el cierre (after) tiene ${l.after.length} caracteres`, tt);
      if (TAMANOS_ESPECIALES[l.id]) return;
      fuera(s, r.palabrasPorLeccion, l.words.length, `lección ${l.id}: ${l.words.length} palabras`, tt);
      const nf = (l.sentences ?? []).length;
      fuera(s, r.frasesPorLeccion, nf, `lección ${l.id}: ${nf} frases`, tt);
    });
  }
}

// ——— 4. Conversaciones y cuentos ———
{
  const s = seccion('Conversaciones y cuentos');
  const temporadaDe = new Map<string, number>();
  for (const l of app.LESSONS) if (l.extra?.kind === 'dialogo' || l.extra?.kind === 'cuento') temporadaDe.set(l.extra.id, temporada(l.stop));
  for (const d of dialogos) {
    const tt = temporadaDe.get(d.id) ?? 1;
    if (!d.title?.trim() || !d.scene?.trim()) s.errores.push(`conversación ${d.id}: falta el título o la escena`);
    fuera(s, reglasDe(tt).lineasPorDialogo, d.lines.length, `conversación ${d.id}: ${d.lines.length} líneas`, tt);
    if (!d.lines.some((linea) => linea.options)) s.errores.push(`conversación ${d.id}: no hay ninguna respuesta para elegir`);
    d.lines.forEach((linea, i) => {
      if (!linea.options) return;
      const ok = linea.options.filter((o) => o.ok);
      if (linea.options.length !== 3) s.errores.push(`conversación ${d.id}, línea ${i + 1}: ${linea.options.length} opciones (deben ser 3)`);
      if (ok.length < 1 || ok.length > 2) s.errores.push(`conversación ${d.id}, línea ${i + 1}: ${ok.length} opciones correctas (1 o 2)`);
      for (const o of ok) if (!o.reply) s.errores.push(`conversación ${d.id}: la opción correcta «${o.th}» no tiene respuesta de la familia`);
    });
  }
  for (const c of app.STORIES) {
    const tt = temporadaDe.get(c.id) ?? 1;
    if (!c.title?.trim() || !c.titleTh?.trim()) s.errores.push(`cuento ${c.id}: falta el título (title y titleTh)`);
    fuera(s, reglasDe(tt).paginasPorCuento, c.pages.length, `cuento ${c.id}: ${c.pages.length} páginas`, tt);
    if (c.questions.length !== 3) s.errores.push(`cuento ${c.id}: ${c.questions.length} preguntas (deben ser 3)`);
    for (const q of c.questions) if (!(q.answer >= 0 && q.answer < q.options.length)) s.errores.push(`cuento ${c.id}: la respuesta de «${q.q}» no es ninguna de sus opciones`);
    for (const p of c.pages) for (const linea of p.lines) for (const tk of linea) if (!tk.rom || !tk.es) s.errores.push(`cuento ${c.id}: «${tk.th}» no tiene transcripción o traducción`);
  }
}

// ——— 4b. Gramática en un minuto ———
{
  const s = seccion('Gramática en un minuto');
  const leccionDeFrase = new Map<string, number>();
  for (const l of app.LESSONS) for (const id of l.sentences ?? []) if (!leccionDeFrase.has(id)) leccionDeFrase.set(id, l.index);
  const usados = new Map<string, string>();
  for (const l of app.LESSONS)
    for (const id of l.patterns ?? []) {
      const pt = app.PATTERNS[id];
      if (!pt) {
        s.errores.push(`${l.id}: el patrón ${id} no existe`);
        continue;
      }
      const antes = usados.get(id);
      if (antes) s.errores.push(`el patrón ${id} se explica dos veces (${antes} y ${l.id}): una sola, donde aparece por primera vez`);
      usados.set(id, l.id);
      for (const f of pt.examples) {
        const donde = leccionDeFrase.get(f);
        if (!app.SENTENCES[f]) s.errores.push(`patrón ${id}: el ejemplo ${f} no es una frase del temario`);
        else if (donde === undefined || donde > l.index) s.errores.push(`patrón ${id} (${l.id}): el ejemplo ${f} es de una lección posterior; usa frases de esta lección o de las anteriores`);
      }
    }
  for (const { item: pt, archivo } of t.patrones) {
    if (!/^[a-z0-9_]+$/.test(pt.id)) s.errores.push(`patrón ${pt.id} (${archivo}): el id solo puede llevar a-z, 0-9 y _`);
    if (!usados.has(pt.id)) s.errores.push(`el patrón ${pt.id} (${archivo}) no se explica en ninguna lección (añádelo a patterns de la suya)`);
    if (!pt.title?.trim() || !pt.rule?.trim()) s.errores.push(`patrón ${pt.id}: falta el título o la regla`);
    else fuera(s, TEXTOS.regla, pt.rule.length, `patrón ${pt.id}: la regla tiene ${pt.rule.length} caracteres`, 1);
    const [min, max] = TEXTOS.ejemplosPorPatron;
    if (pt.examples.length < min || pt.examples.length > max) s.errores.push(`patrón ${pt.id}: ${pt.examples.length} ejemplos (de ${min} a ${max})`);
    const piezas = new Set(pt.examples.flatMap((f) => app.SENTENCES[f]?.th ?? []));
    for (const m of pt.mark ?? []) if (!piezas.has(m)) s.errores.push(`patrón ${pt.id}: la pieza resaltada «${m}» no sale en ninguno de sus ejemplos`);
  }
  s.nota = `${plural(t.patrones.length, 'patrón', 'patrones')}`;
}

// ——— 5. Tonos y transcripción ———
{
  const s = seccion('Tonos y transcripción');
  // lo que pone la app en {P}, {PQ} e {I} según quien aprende (src/lib/thai.ts)
  const GENERO = {
    m: { P: ['ครับ', 'khráp'], PQ: ['ครับ', 'khráp'], I: ['ผม', 'phǒm'] },
    f: { P: ['ค่ะ', 'khâ'], PQ: ['คะ', 'khá'], I: ['ฉัน', 'chǎn'] },
  } as const;
  const conGenero = (texto: string, g: 'm' | 'f', i: 0 | 1) => texto.replaceAll('{PQ}', GENERO[g].PQ[i]).replaceAll('{P}', GENERO[g].P[i]).replaceAll('{I}', GENERO[g].I[i]);
  let comprobaciones = 0;
  const tono = (donde: string, th: string, rom: string) => {
    for (const g of ['m', 'f'] as const) {
      comprobaciones++;
      const fallo = comprobarTonos(conGenero(th, g, 0), conGenero(rom, g, 1));
      if (fallo) {
        s.errores.push(`${donde}: ${th} · ${rom}\n      ${fallo}`);
        return;
      }
    }
  };
  for (const w of palabras) tono(`palabra ${w.id}`, w.th, w.rom);
  for (const f of frases) tono(`frase ${f.id}`, f.th.join(' '), f.rom);
  for (const st of app.STOPS) {
    if (st.message) tono(`mensaje de ${st.id}`, st.message.th, st.message.rom);
    if (st.mission?.th) tono(`misión de ${st.id}`, st.mission.th, st.mission.rom);
    for (const r of st.mission?.replies ?? []) tono(`respuesta a la misión de ${st.id}`, r.th, r.rom);
  }
  for (const d of dialogos)
    for (const linea of d.lines) {
      tono(`conversación ${d.id} (${linea.who})`, linea.th, linea.rom);
      for (const o of linea.options ?? []) {
        tono(`opción de ${d.id}`, o.th, o.rom);
        if (o.reply) tono(`respuesta de ${d.id}`, o.reply.th, o.reply.rom);
      }
    }
  for (const c of app.STORIES) for (const p of c.pages) for (const linea of p.lines) for (const tk of linea) if (tk.rom) tono(`cuento ${c.id}`, tk.th, tk.rom);
  for (const tk of t.carta.YAI_TOKENS) tono('carta de Yai', tk.th, tk.rom);

  // en las frases, cada pieza se transcribe igual que la palabra que enseña
  const romsDe = new Map<string, Set<string>>();
  for (const w of palabras) romsDe.set(w.th, (romsDe.get(w.th) ?? new Set()).add(w.rom.replace(/\s+/g, '-')));
  for (const f of frases) {
    const trozos = f.rom.split(/\s+/);
    if (trozos.length !== f.th.length) {
      s.errores.push(`frase ${f.id}: ${f.th.length} piezas thai y ${trozos.length} trozos de transcripción (uno por pieza; las sílabas de una pieza van con guion)`);
      continue;
    }
    f.th.forEach((pieza, i) => {
      const roms = romsDe.get(pieza);
      if (roms && !roms.has(trozos[i])) s.errores.push(`frase ${f.id}: «${pieza}» se transcribe ${trozos[i]}, pero la palabra es ${[...roms].join(' / ')}`);
    });
  }
  s.nota = `${plural(comprobaciones, 'comprobación', 'comprobaciones')}`;
}

// ——— 6. Orden de enseñanza: nada se usa antes de enseñarse ———
{
  const s = seccion('Orden de enseñanza');
  const dic = crearDiccionario(cargarFrecuencias('tnc'), cargarFrecuencias('ttc'), palabras);
  const voc = new Vocabulario(dic, [...Object.keys(CONOCIDAS_DE_INICIO), ...t.nombresPropios]);
  const excepciones = ANTES_DE_TIEMPO.map((e) => ({ ...e, usada: false }));
  const nuevas = (en: string, texto: string) =>
    voc.desconocidas(texto).filter((pieza) => {
      const e = excepciones.find((x) => x.en === en && x.piezas.includes(pieza));
      if (e) e.usada = true;
      return !e;
    });
  for (const l of app.LESSONS) {
    for (const id of l.words) {
      const w = app.WORDS[id];
      if (w) voc.aprender(w);
    }
    for (const id of l.sentences ?? []) {
      const f = app.SENTENCES[id];
      // las piezas de una frase se leen juntas (ไม่ + ใช่ = ไม่ใช่) y, si eso deja dudas, de una en una: al juntarlas,
      // el segmentador puede cortar mal entre dos palabras que sí se conocen (ตลาด + มี → ตลา + ดมี)
      const juntas = f ? nuevas(id, f.th.join('')) : [];
      const n = juntas.length && f ? nuevas(id, f.th.join(' ')) : juntas;
      if (n.length) s.errores.push(`${l.id}: la frase ${id} («${f.es}») usa palabras aún no enseñadas: ${n.join(', ')}`);
    }
    if (l.extra?.kind === 'dialogo') {
      const d = app.DIALOGUES[l.extra.id];
      for (const linea of d?.lines ?? []) {
        const n = nuevas(d.id, linea.th);
        if (n.length) s.avisos.push(`${l.id}: en la conversación ${d.id}, ${linea.who} dice palabras aún no enseñadas: ${n.join(', ')}`);
        for (const o of linea.options ?? []) {
          const no = o.ok ? nuevas(d.id, o.th) : [];
          if (no.length) s.errores.push(`${l.id}: la respuesta correcta «${o.es}» (${d.id}) usa palabras aún no enseñadas: ${no.join(', ')}`);
        }
      }
    }
    if (l.last) {
      const st = l.stop;
      const nm = st.message ? nuevas(st.id, st.message.th) : [];
      if (nm.length) s.avisos.push(`${st.id}: el mensaje de ${st.message?.from} usa palabras aún no enseñadas: ${nm.join(', ')}`);
      const nmi = st.mission ? nuevas(st.id, st.mission.th) : [];
      if (nmi.length) s.errores.push(`${st.id}: la frase de la misión usa palabras aún no enseñadas: ${nmi.join(', ')}`);
    }
  }
  for (const e of excepciones) if (!e.usada) s.avisos.push(`la excepción de reglas.mts para ${e.en} (${e.piezas.join(', ')}) ya no hace falta: bórrala`);
  s.nota = `${plural(app.LESSONS.length, 'lección', 'lecciones')} en orden`;
}

// ——— Resultado ———
const todo = process.argv.includes('--todo');
const MAX = 40;
const lista = (marca: string, cosas: string[]) => {
  for (const c of todo ? cosas : cosas.slice(0, MAX)) console.log(`   ${marca} ${c}`);
  if (!todo && cosas.length > MAX) console.log(`   … y ${miles(cosas.length - MAX)} más (npm run temario -- --todo)`);
};
const errores = secciones.reduce((a, s) => a + s.errores.length, 0);
const avisos = secciones.reduce((a, s) => a + s.avisos.length, 0);
const temporadas = [...new Set(app.STOPS.map(temporada))];
console.log('Sanuk · revisor del temario');
console.log(
  `${plural(temporadas.length, 'temporada', 'temporadas')} · ${plural(app.STOPS.length, 'parada', 'paradas')} · ${plural(app.LESSONS.length, 'lección', 'lecciones')} · ${plural(palabras.length, 'palabra', 'palabras')} · ${plural(frases.length, 'frase', 'frases')} · ${plural(dialogos.length, 'conversación', 'conversaciones')} · ${plural(app.STORIES.length, 'cuento', 'cuentos')}`,
);
console.log('');
for (const s of secciones) {
  const marca = s.errores.length ? '❌' : s.avisos.length ? '⚠️ ' : '✓ ';
  const cuenta = [s.errores.length ? plural(s.errores.length, 'error', 'errores') : '', s.avisos.length ? plural(s.avisos.length, 'aviso', 'avisos') : '', s.nota ?? ''].filter(Boolean).join(' · ');
  console.log(`${marca} ${s.titulo}${cuenta ? ` (${cuenta})` : ''}`);
  lista('❌', s.errores);
  lista('⚠️ ', s.avisos);
}
console.log('');
console.log(errores ? `${plural(errores, 'error', 'errores')}${avisos ? ` y ${plural(avisos, 'aviso', 'avisos')}` : ''}` : `OK, sin errores${avisos ? ` (${plural(avisos, 'aviso', 'avisos')})` : ''}`);
process.exitCode = errores ? 1 : 0;
