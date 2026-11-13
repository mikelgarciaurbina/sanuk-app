// Pruebas de los revisores del temario. Uso, desde app/: npm run temario:test
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { Word } from '../../src/content/types.ts';
import { comprobarTonos } from './lib/tonos.mts';
import { Vocabulario } from './lib/vocabulario.mts';

describe('revisor de tonos', () => {
  test('acepta transcripciones correctas, también con อักษรนำ, การันต์, ๆ y lecturas irregulares', () => {
    const bien = [
      ['สวัสดี', 'sà-wàt-dii'],
      ['ไม่เป็นไร', 'mâi-pen-rai'],
      ['เท่าไหร่', 'thâo-rài'],
      ['สนุก', 'sà-nùk'],
      ['ถนน', 'thà-nǒn'],
      ['หมอก', 'mɔ̀ɔk'],
      ['หน่อย', 'nɔ̀i'],
      ['อร่อย', 'à-rɔ̀i'],
      ['ผู้หญิง', 'phûu-yǐng'],
      ['ข้าว', 'khâao'],
      ['ข้าวเหนียว', 'khâao-nǐao'],
      ['เล็ก', 'lék'],
      ['กับ', 'gàp'],
      ['ปิด', 'pìt'],
      ['เพราะ', 'phrɔ́'],
      ['เขียน', 'khǐan'],
      ['เดิน', 'dəən'],
      ['ครอบครัว', 'khrɔ̂ɔp-khrua'],
      ['เปรี้ยว', 'prîao'],
      ['ไส้อั่ว', 'sâi-ùa'],
      ['น้ำพริกหนุ่ม', 'náam-phrík-nùm'],
      ['ลูกสะใภ้', 'lûuk-sà-phái'],
      ['แม่ฮ่องสอน', 'mɛ̂ɛ-hɔ̂ng-sɔ̌ɔn'],
      ['พรุ่งนี้', 'phrûng-níi'],
      ['ตลอดไป', 'tà-lɔ̀ɔt pai'],
      ['ขวัญเอ๋ย', 'khwǎn ə̌əi'],
      ['เจดีย์', 'jee-dii'],
      ['ศูนย์', 'sǔun'],
      ['สายสิญจน์', 'sǎai-sǐn'],
      ['วันจันทร์', 'wan-jan'],
      ['ช้าๆ', 'cháa-cháa'],
      ['เด็กๆ', 'dèk-dèk'],
      ['กรุณา', 'gà-rú-naa'],
      ['ภรรยา', 'phan-rá-yaa'],
      ['โทรศัพท์', 'thoo-rá-sàp'],
      ['สามารถ', 'sǎa-mâat'],
      ['สุขภาพแข็งแรง', 'sùk-khà-phâap khɛ̌ng-rɛɛng'],
    ];
    for (const [th, rom] of bien) assert.equal(comprobarTonos(th, rom), null, `${th} · ${rom}`);
  });

  test('rechaza tonos, iniciales, vocales y finales equivocados', () => {
    const mal = [
      ['สวัสดี', 'sà-wát-dii'], // วัส toma la clase alta de ส: tono bajo
      ['ไม่เป็นไร', 'mài-pen-rai'],
      ['สนุก', 'sà-núk'],
      ['ถนน', 'thà-non'], // นน toma la clase alta de ถ: ascendente
      ['หมอก', 'mɔ́ɔk'],
      ['อร่อย', 'à-rɔ̂i'],
      ['ข้าว', 'khǎao'],
      ['เล็ก', 'lèk'],
      ['เพราะ', 'phrɔ̀'],
      ['เขียน', 'khian'],
      ['ครอบครัว', 'khrɔ̂ɔp-khrúa'],
      ['กับ', 'kàp'], // ก es g en la transcripción de Sanuk
      ['ปิด', 'pìk'], // final ด = t
      ['เดิน', 'doen'], // vocal ə
    ];
    for (const [th, rom] of mal) assert.notEqual(comprobarTonos(th, rom), null, `${th} · ${rom} debería dar error`);
  });
});

describe('vocabulario: qué se ha enseñado ya', () => {
  const palabra = (th: string): Word => ({ id: th, th, rom: '', es: '' });
  const dic = new Set(['ข้าว', 'ผัด', 'ข้าวผัด', 'น้ำ', 'โรง', 'พยาบาล', 'โรงพยาบาล', 'เด็ก', 'กิน', 'นก']);

  test('reconoce un texto hecho de palabras enseñadas y señala las que faltan', () => {
    const voc = new Vocabulario(dic);
    voc.aprender(palabra('ข้าว'));
    voc.aprender(palabra('น้ำ'));
    assert.equal(voc.conoce('ข้าวน้ำ'), true);
    assert.equal(voc.conoce('ข้าวผัด'), false);
    // señala la palabra de diccionario que falta entera: ข้าวผัด (arroz frito), no solo ผัด
    assert.deepEqual(voc.desconocidas('กินข้าวผัด'), ['กิน', 'ข้าวผัด']);
  });

  test('un compuesto enseña sus partes, pero las letras sueltas no componen palabras nuevas', () => {
    const voc = new Vocabulario(dic);
    voc.aprender(palabra('โรงพยาบาล'));
    voc.aprender(palabra('กิน'));
    assert.equal(voc.conoce('พยาบาล'), true);
    assert.equal(voc.conoce('นก'), false);
  });

  test('ignora los marcadores {P} {PQ} {I} y entiende la repetición con ๆ', () => {
    const voc = new Vocabulario(dic, ['ครับ']);
    voc.aprender(palabra('เด็ก'));
    assert.equal(voc.conoce('{I}เด็กๆ{P}'), true);
    assert.deepEqual(voc.desconocidas('เด็กๆ กิน'), ['กิน']);
  });
});

describe('lecciones: nada se pregunta antes de presentarse', async () => {
  const { cargarTemario } = await import('./lib/cargar.mts');
  const { app } = await cargarTemario();
  const { buildLesson, introducedIds } = await import('../../src/lib/lesson.ts');

  test('la primera curva presenta dos expresiones, practica de oído y cierra con un saludo', () => {
    const p = { words: { sawatdii: { s: 1, intro: true } }, completed: {}, profile: { startStop: 1 } };
    const b = buildLesson(app.LESSONS[0], p);
    assert.equal(b.firstCurve, true);
    assert.deepEqual(
      b.steps.map((s) => (s.kind === 'intro' ? `ficha:${s.word.id}` : s.kind === 'game' ? s.game : s.kind)),
      ['beat', 'ficha:sawatdii', 'ficha:khopkhun', 'oido', 'eco', 'cena'],
    );
    for (const s of b.steps) if (s.kind === 'game') assert.deepEqual((s.words ?? []).map((w) => w.id).sort(), ['khopkhun', 'sawatdii']);
  });

  test('recorriendo todas las lecciones en orden, cada juego solo usa palabras ya presentadas', () => {
    const words: Record<string, { s: number; intro?: boolean }> = { sawatdii: { s: 1, intro: true } };
    const completed: Record<string, { stars: number; best: number; at: string }> = {};
    const p = { words, completed, profile: { startStop: 1 } };
    for (const l of app.LESSONS) {
      const b = buildLesson(l, p);
      const shown = introducedIds(p);
      for (const s of b.steps) {
        if (s.kind === 'intro') {
          shown.add(s.word.id);
          continue;
        }
        // el momento de la historia y la gramática en un minuto no preguntan nada
        if (s.kind !== 'game') continue;
        const usados = [...(s.words ?? b.words), ...(s.focus ?? b.focus)];
        const sinFicha = usados.filter((w) => !shown.has(w.id)).map((w) => w.id);
        assert.deepEqual(sinFicha, [], `${l.id} · ${s.game}: usa palabras sin ficha`);
      }
      // al terminar la lección, sus palabras quedan presentadas
      for (const id of l.words) words[id] = { s: 1, intro: true };
      completed[l.id] = { stars: 3, best: 1, at: '' };
    }
  });

  test('«Noi dice» enseña antes lo que pide: แตะ en «El cuerpo» y บอก en «Noi dice»', () => {
    const words: Record<string, { s: number; intro?: boolean }> = { sawatdii: { s: 1, intro: true } };
    const completed: Record<string, { stars: number; best: number; at: string }> = {};
    const p = { words, completed, profile: { startStop: 1 } };
    for (const l of app.LESSONS) {
      if (l.id === 'p3l3' || l.id === 'p3l5') {
        const b = buildLesson(l, p);
        const intros = b.steps.flatMap((s) => (s.kind === 'intro' ? [s.word.th] : []));
        assert.ok(b.steps.some((s) => s.kind === 'game' && s.game === 'noidice'), `${l.id} sin Noi dice`);
        assert.ok(intros.includes(l.id === 'p3l3' ? 'แตะ' : 'บอก'), `${l.id}: falta la ficha`);
      }
      for (const id of l.words) words[id] = { s: 1, intro: true };
      completed[l.id] = { stars: 3, best: 1, at: '' };
      if (l.id === 'p3l5') break;
    }
  });

  test('una palabra respondida en un juego, pero sin ficha, sigue teniendo su ficha en la lección', () => {
    const p = { words: { sawatdii: { s: 1, intro: true }, maipenrai: { s: 0 } }, completed: { p1l1: { stars: 3, best: 1, at: '' } }, profile: { startStop: 1 } };
    const b = buildLesson(app.LESSONS[1], p);
    assert.ok(b.steps.some((s) => s.kind === 'intro' && s.word.id === 'maipenrai'));
  });
});

describe('«Cómo se escribe»: cada letra con su sonido', async () => {
  await import('./lib/cargar.mts');
  const { spell } = await import('../../src/lib/spell.ts');
  const labels = (th: string) => (spell(th) ?? []).map((g) => g.label).join(' ');

  test('grupos de consonantes, ห y อ mudas y vocales compuestas', () => {
    const casos: [string, string][] = [
      ['ไกล', 'ai g l'],
      ['ใคร', 'ai kh r'],
      ['ไหม', 'ai muda m'],
      ['หนังสือ', 'muda n a ng s ʉʉ (ʉʉ)'],
      ['อยู่', 'muda y uu mai ek'],
      ['ช้าง', 'ch mai tho aa ng'],
      ['สวัสดี', 's w a t d ii'],
      ['คน', 'kh n'],
      ['เปล่า', 'ao p l mai ek (ao)'],
      ['เรียน', 'ia r (ia) (ia) n'],
      ['จันทร์', 'j a n muda muda muda'],
      ['เดิน', 'əə d (əə) n'],
      ['เธอ', 'əə th (əə)'],
    ];
    for (const [th, esperado] of casos) assert.equal(labels(th), esperado, th);
  });

  test('letras que no suenan, ร หัน, ว vocal y grupos en mitad de la palabra', () => {
    const casos: [string, string][] = [
      ['จริง', 'j muda i ng'], // จร: la ร no suena
      ['ทราบ', 's muda aa p'], // ทร se lee «s»
      ['สร้าง', 's muda mai tho aa ng'],
      ['ตะกร้า', 't a g r mai tho aa'],
      ['ธรรม', 'th a (a) m'],
      ['ออกพรรษา', '(muda) ɔɔ k ph a n s aa'],
      ['นิดหน่อย', 'n i t muda n mai ek ɔɔ i'],
      ['ควร', 'kh ua n'],
      ['ผล', 'ph n'],
      ['ทุกอย่าง', 'th u k muda y mai ek aa ng'],
    ];
    for (const [th, esperado] of casos) assert.equal(labels(th), esperado, th);
  });

  test('con la transcripción de la ficha, cada consonante suena como en ella', () => {
    const casos: [string, string, string][] = [
      ['ไม่สบาย', 'mâi sà-baai', 'ai m mai ek s b aa i'], // ส con vocal escondida: inicial
      ['ศีรษะ', 'sǐi-sà', 's ii muda s a'],
      ['สามารถ', 'sǎa-mâat', 's aa m aa muda t'],
      ['ขับรถ', 'khàp-rót', 'kh a p r t'],
      ['ด้วย', 'dûay', 'd mai tho ua y'],
      ['จริงๆ', 'jing-jing', 'j muda i ng repite'],
    ];
    for (const [th, rom, esperado] of casos) assert.equal((spell(th, rom) ?? []).map((g) => g.label).join(' '), esperado, th);
  });

  test('ninguna ficha del temario se contradice: cada consonante que suena está en su transcripción, en orden', async () => {
    const { app } = await (await import('./lib/cargar.mts')).cargarTemario();
    const plano = (rom: string) => rom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}]/gu, '');
    const mal: string[] = [];
    for (const w of Object.values(app.WORDS)) {
      const g = spell(w.th, w.rom);
      if (!g) continue;
      const r = plano(w.rom);
      let pos = 0;
      for (const x of g) {
        if (x.kind !== 'consonante' || x.label === 'muda' || x.label.startsWith('(')) continue;
        const k = r.indexOf(x.label, pos);
        if (k < 0) mal.push(`${w.th} (${w.rom}): ${x.ch} = ${x.label}`);
        else pos = k + x.label.length;
      }
    }
    assert.deepEqual(mal, []);
  });
});

describe('feria y repaso: solo palabras con ficha', async () => {
  const { cargarTemario } = await import('./lib/cargar.mts');
  const { app } = await cargarTemario();
  const { buildReview, introducedIds } = await import('../../src/lib/lesson.ts');
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
