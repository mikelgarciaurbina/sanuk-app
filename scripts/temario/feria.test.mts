import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import '../register-app.mjs';

const app = await import('../../src/content/index.ts');
const { buildReview, introducedIds } = await import('../../src/lib/lesson.ts');

describe('feria y repaso: solo palabras con ficha', async () => {
  const { feriaSetup } = await import('../../src/lib/feria.ts');
  const drills = await import('../../src/content/drills.ts');
  const mercado = await import('../../src/games/mercado/logic.ts');

  const progressAfter = (n: number) => {
    const words: Record<string, { s: number; due: number; intro?: boolean }> = { sawatdii: { s: 1, due: 0, intro: true } };
    const completed: Record<string, { stars: number; best: number; at: string }> = {};
    for (const l of app.LESSONS.slice(0, n)) {
      for (const id of l.words) words[id] = { s: 1, due: 0, intro: true };
      completed[l.id] = { stars: 3, best: 1, at: '' };
    }
    return { words, completed, profile: { startStop: 1 } };
  };

  test('quien solo conoce «hola» no recibe palabras futuras: la feria le pide aprender un poco más', () => {
    const r = feriaSetup('parejas', progressAfter(0));
    assert.ok('needMore' in r);
  });

  test('a lo largo del camino, cada juego de la feria usa solo palabras, frases y conversaciones ya vistas', () => {
    const ids = ['parejas', 'memoria', 'monzon', 'siono', 'farolillos', 'oido', 'puente', 'hueco', 'eco', 'cena', 'cuentos', 'curvas', 'tigre', 'tonos', 'cestas', 'mercado', 'noidice', 'cueva', 'traza', 'silabas'] as const;
    for (const n of [2, 10, 40, 100, 164]) {
      const p = progressAfter(n);
      const known = introducedIds(p);
      const forms = new Set([...known].flatMap((id) => app.WORDS[id].th.split(/[\s…/()ๆ]+/).filter(Boolean)));
      for (const id of ids) {
        const r = feriaSetup(id, p);
        if ('needMore' in r) continue;
        assert.deepEqual(r.words.filter((w) => !known.has(w.id)).map((w) => w.id), [], `${id} tras ${n} lecciones`);
        for (const s of r.sentences) assert.ok(s.th.every((t) => t.startsWith('{') || forms.has(t)), `${id}: frase ${s.id} tras ${n}`);
        const extra = r.extra;
        if (extra?.kind === 'dialogo')
          assert.ok(app.LESSONS.some((l) => p.completed[l.id] && l.extra?.kind === 'dialogo' && l.extra.id === extra.id), `cena con ${extra.id} tras ${n}`);
        if (extra?.kind === 'cuento')
          for (const st of extra.shelf ?? [extra.id])
            assert.ok(app.LESSONS.some((l) => p.completed[l.id] && l.extra?.kind === 'cuento' && l.extra.id === st), `cuento ${st} tras ${n}`);
        if (extra?.kind === 'letras')
          assert.ok(app.LESSONS.some((l) => p.completed[l.id] && l.extra?.kind === 'letras' && l.extra.set === extra.set), `letras ${extra.set} tras ${n}`);
      }
    }
  });

  test('los ejercicios con vocabulario propio (tonos, cestas, mercado, Noi dice) solo sacan lo presentado', () => {
    for (const n of [2, 8, 13, 15, 20, 40, 100, 164]) {
      const p = progressAfter(n);
      const words = [...introducedIds(p)].map((id) => app.WORDS[id]);
      const forms = app.knownForms(words);
      const fuera = (xs: string[]) => xs.filter((t) => !forms.has(t));
      for (const set of drills.minimalSetsFor(forms)) assert.deepEqual(fuera(set.items.map((w) => w.th)), [], `tigre «${set.title}» tras ${n}`);
      assert.deepEqual(fuera(drills.toneBankFor(forms).map((w) => w.th)), [], `tonos tras ${n}`);
      for (const it of drills.classifierItemsFor(forms)) assert.deepEqual(fuera([it.th, it.clf]), [], `cestas tras ${n}`);
      for (const c of drills.bodyCommandsFor(forms)) assert.deepEqual(fuera(drills.bodyWordsOf(c)), [], `noi dice tras ${n}`);
      // la vendedora solo nombra lo que se conoce: ni fruta, ni clasificador, ni บาท ni จ้ะ antes de tiempo
      const k = mercado.knowledge(words, []);
      for (const good of mercado.GOODS) {
        const line = mercado.quoteLine(good, 2, 10, k).th;
        for (const t of [good.th, good.clf, 'บาท', 'จ้ะ']) if (!forms.has(t)) assert.ok(!line.includes(t), `mercado «${line}» dice ${t} tras ${n}`);
      }
    }
  });

  test('cada puesto se abre cuando el camino ya ha enseñado lo suyo', () => {
    const abierto = (id: Parameters<typeof feriaSetup>[0], n: number) => !('needMore' in feriaSetup(id, progressAfter(n)));
    const leccion = (id: string) => app.LESSONS.findIndex((l) => l.id === id) + 1;
    assert.equal(abierto('noidice', leccion('p3l3')), false); // aún sin «บอก»
    assert.equal(abierto('noidice', leccion('p3l5')), true);
    assert.equal(abierto('mercado', leccion('p2l1') - 1), false);
    assert.equal(abierto('mercado', leccion('p2l1')), true);
    // los puestos de letras y de cuentos se abren con la primera lección que los trae, esté donde esté
    const primera = (es: (l: (typeof app.LESSONS)[number]) => boolean) => app.LESSONS.findIndex(es) + 1;
    const medias = primera((l) => l.extra?.kind === 'letras' && l.extra.set === 'media');
    assert.equal(abierto('cueva', medias - 1), false);
    assert.equal(abierto('cueva', medias), true);
    assert.equal(abierto('traza', medias), true);
    const silabas = primera((l) => l.extra?.kind === 'letras' && l.extra.set === 'silabas');
    assert.equal(abierto('silabas', silabas - 1), false);
    assert.equal(abierto('silabas', silabas), true);
    const cuento = primera((l) => l.extra?.kind === 'cuento');
    const primerCuento = app.LESSONS[cuento - 1].extra;
    assert.equal(abierto('cuentos', cuento - 1), false);
    const shelf = feriaSetup('cuentos', progressAfter(cuento));
    assert.ok(!('needMore' in shelf) && shelf.extra?.kind === 'cuento' && primerCuento?.kind === 'cuento' && shelf.extra.shelf?.join() === primerCuento.id);
  });

  test('el repaso solo trae palabras con ficha y no se abre con muy pocas', () => {
    const perdon = Object.values(app.WORDS).find((w) => w.th === 'ขอโทษ')!.id;
    // «hola» y «gracias» presentadas; «perdón» solo respondida en una partida de un guardado antiguo
    const p = { words: { sawatdii: { s: 1, due: 0, intro: true }, khopkhun: { s: 1, due: 0, intro: true }, [perdon]: { s: 0, due: 0 } }, completed: {}, profile: { startStop: 1 } };
    assert.deepEqual(app.dueWords(p).map((w) => w.id).sort(), ['khopkhun', 'sawatdii']);
    assert.equal(app.canReview(p), false);
    assert.equal(app.canReview(progressAfter(3)), true);
  });

  test('el repaso pone como distractores solo palabras ya presentadas', () => {
    const p = progressAfter(3);
    const known = introducedIds(p);
    const due = [...known].slice(0, 4).map((id) => app.WORDS[id]);
    const b = buildReview(due, p);
    assert.deepEqual(b.words.filter((w) => !known.has(w.id)).map((w) => w.id), []);
  });
});
