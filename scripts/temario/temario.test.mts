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
      b.steps.map((s) => (s.kind === 'intro' ? `ficha:${s.word.id}` : s.game)),
      ['ficha:sawatdii', 'ficha:khopkhun', 'oido', 'eco', 'cena'],
    );
    for (const s of b.steps) if (s.kind === 'game') assert.deepEqual((s.words ?? []).map((w) => w.id).sort(), ['khopkhun', 'sawatdii']);
  });

  test('recorriendo las 164 lecciones en orden, cada juego solo usa palabras ya presentadas', () => {
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
        const usados = [...(s.words ?? b.words), ...(s.focus ?? b.focus)];
        const sinFicha = usados.filter((w) => !shown.has(w.id)).map((w) => w.id);
        assert.deepEqual(sinFicha, [], `${l.id} · ${s.game}: usa palabras sin ficha`);
      }
      // al terminar la lección, sus palabras quedan presentadas
      for (const id of l.words) words[id] = { s: 1, intro: true };
      completed[l.id] = { stars: 3, best: 1, at: '' };
    }
  });

  test('una palabra respondida en un juego, pero sin ficha, sigue teniendo su ficha en la lección', () => {
    const p = { words: { sawatdii: { s: 1, intro: true }, maipenrai: { s: 0 } }, completed: { p1l1: { stars: 3, best: 1, at: '' } }, profile: { startStop: 1 } };
    const b = buildLesson(app.LESSONS[1], p);
    assert.ok(b.steps.some((s) => s.kind === 'intro' && s.word.id === 'maipenrai'));
  });
});
