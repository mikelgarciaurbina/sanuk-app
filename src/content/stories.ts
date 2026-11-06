import type { Story } from './types';

/** Cuentos de Yai: cada token puede llevar transcripción, traducción y la palabra del palabrario (w). */
export const STORIES_A: Story[] = [
  {
    id: 'st1',
    title: 'La elefantita y la niebla',
    titleTh: 'ช้างน้อยกับหมอก',
    pages: [
      {
        lines: [
          [{ th: 'เช้า', rom: 'cháao', es: 'mañana', w: 'chao' }, { th: 'วันหนึ่ง', rom: 'wan nʉ̀ng', es: 'un día' }],
          [{ th: 'ช้าง', rom: 'cháang', es: 'elefante', w: 'chang' }, { th: 'น้อย', rom: 'nɔ́ɔi', es: 'pequeña' }, { th: 'ตื่น', rom: 'tʉ̀ʉn', es: 'despertarse' }, { th: 'ขึ้นมา', rom: 'khʉ̂n maa', es: '(se levantó)' }],
        ],
        es: 'Una mañana, la elefantita se despertó.',
      },
      {
        lines: [
          [{ th: 'บน', rom: 'bon', es: 'sobre' }, { th: 'ภูเขา', rom: 'phuu-khǎo', es: 'montaña' }, { th: 'มี', rom: 'mii', es: 'había', w: 'mii' }, { th: 'หมอก', rom: 'mɔ̀ɔk', es: 'niebla', w: 'mok' }, { th: 'เต็มไปหมด', rom: 'tem pai mòt', es: 'por todas partes' }],
          [{ th: 'ช้าง', rom: 'cháang', es: 'elefante', w: 'chang' }, { th: 'น้อย', rom: 'nɔ́ɔi', es: 'pequeña' }, { th: 'มอง', rom: 'mɔɔng', es: 'mirar' }, { th: 'ไม่', rom: 'mâi', es: 'no', w: 'mai_neg' }, { th: 'เห็น', rom: 'hěn', es: 'ver' }, { th: 'ทาง', rom: 'thaang', es: 'camino', w: 'thaang' }],
        ],
        es: 'En la montaña todo estaba lleno de niebla. La elefantita no veía el camino.',
      },
      {
        lines: [
          [{ th: 'แต่', rom: 'tɛ̀ɛ', es: 'pero' }, { th: 'ยาย', rom: 'yaai', es: 'la abuela', w: 'yaai' }, { th: 'บอกว่า', rom: 'bɔ̀ɔk wâa', es: 'dijo que' }],
          [{ th: 'ไม่ต้อง', rom: 'mâi tɔ̂ng', es: 'no hace falta' }, { th: 'กลัว', rom: 'glua', es: 'tener miedo' }],
          [{ th: 'หมอก', rom: 'mɔ̀ɔk', es: 'niebla', w: 'mok' }, { th: 'จะ', rom: 'jà', es: '(futuro)', w: 'ja_fut' }, { th: 'หายไป', rom: 'hǎai pai', es: 'desaparecer' }, { th: 'เมื่อ', rom: 'mʉ̂a', es: 'cuando' }, { th: 'พระอาทิตย์', rom: 'phrá-aa-thít', es: 'el sol' }, { th: 'ขึ้น', rom: 'khʉ̂n', es: 'salir, subir' }],
        ],
        es: 'Pero la abuela le dijo: no tengas miedo. La niebla se irá cuando salga el sol.',
      },
      {
        lines: [
          [{ th: 'ช้าง', rom: 'cháang', es: 'elefante', w: 'chang' }, { th: 'น้อย', rom: 'nɔ́ɔi', es: 'pequeña' }, { th: 'รอ', rom: 'rɔɔ', es: 'esperar', w: 'ro' }],
          [{ th: 'แล้ว', rom: 'lɛ́ɛo', es: 'y entonces', w: 'laeo' }, { th: 'หมอก', rom: 'mɔ̀ɔk', es: 'niebla', w: 'mok' }, { th: 'ก็', rom: 'gɔ̂ɔ', es: '(pues)', w: 'ko' }, { th: 'หายไป', rom: 'hǎai pai', es: 'desapareció' }],
          [{ th: 'ทาง', rom: 'thaang', es: 'el camino', w: 'thaang' }, { th: 'สวย', rom: 'sǔay', es: 'bonito', w: 'suay' }, { th: 'มาก', rom: 'mâak', es: 'muy', w: 'maak' }],
        ],
        es: 'La elefantita esperó. Y entonces la niebla desapareció. ¡El camino era precioso!',
      },
    ],
    questions: [
      { q: '¿Qué había en la montaña?', options: ['Niebla', 'Lluvia', 'Elefantes'], answer: 0 },
      { q: '¿Qué le dijo la abuela?', options: ['Que no tuviera miedo', 'Que volviera a casa', 'Que corriera'], answer: 0 },
      { q: '¿Cuándo se va la niebla?', options: ['Cuando sale el sol', 'Por la noche', 'Nunca'], answer: 0 },
    ],
  },
];
