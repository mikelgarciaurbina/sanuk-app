import type { Story, StoryToken } from './types';

/** Cuentos de las paradas 13–14. Cada token lleva transcripción, traducción y, si existe, la palabra del palabrario (w). */
const t = (th: string, rom: string, es: string, w?: string): StoryToken => (w ? { th, rom, es, w } : { th, rom, es });

export const STORIES_B: Story[] = [
  {
    id: 'st2',
    title: 'Cuando Yai era pequeña',
    titleTh: 'ตอนยายยังเด็ก',
    pages: [
      {
        lines: [
          [t('เมื่อก่อน', 'mʉ̂a-gɔ̀ɔn', 'antes', 'muakon'), t('หมู่บ้าน', 'mùu-bâan', 'el pueblo', 'muubaan'), t('นี้', 'níi', 'este', 'nii_this'), t('ไม่', 'mâi', 'no', 'mai_neg'), t('มี', 'mii', 'tenía', 'mii'), t('ถนน', 'thà-nǒn', 'carretera', 'thanon')],
          [t('คน', 'khon', 'la gente', 'khon'), t('เดิน', 'dəən', 'caminaba', 'doen'), t('ไป', 'pai', 'ir', 'pai'), t('ทุก', 'thúk', 'todos', 'thuk'), t('ที่', 'thîi', 'los sitios')],
        ],
        es: 'Antes, este pueblo no tenía carretera. La gente iba andando a todas partes.',
      },
      {
        lines: [
          [t('ตอนเด็ก', 'tɔɔn-dèk', 'de pequeña', 'tondek'), t('ยาย', 'yaai', 'la abuela', 'yaai'), t('ตื่น', 'tʉ̀ʉn', 'se despertaba', 'tuen'), t('ตี', 'tii', 'a las… (de madrugada)', 'tii_hora'), t('ห้า', 'hâa', 'cinco', 'haa'), t('ทุก', 'thúk', 'cada', 'thuk'), t('วัน', 'wan', 'día', 'wan')],
          [t('ยาย', 'yaai', 'la abuela', 'yaai'), t('เดิน', 'dəən', 'caminaba', 'doen'), t('ไป', 'pai', 'ir', 'pai'), t('โรงเรียน', 'roong-rian', 'la escuela'), t('กับ', 'gàp', 'con', 'kap'), t('เพื่อน', 'phʉ̂an', 'sus amigos', 'phuean')],
        ],
        es: 'De pequeña, la abuela se despertaba cada día a las cinco de la madrugada e iba andando a la escuela con sus amigos.',
      },
      {
        lines: [
          [t('วันหนึ่ง', 'wan nʉ̀ng', 'un día'), t('ฝน', 'fǒn', 'la lluvia', 'fon'), t('ตก', 'tòk', 'caer', 'tok'), t('หนัก', 'nàk', 'fuerte')],
          [t('ยาย', 'yaai', 'la abuela', 'yaai'), t('เลย', 'ləəi', 'así que', 'loei_so'), t('ไม่ได้', 'mâi dâi', 'no pudo', 'maidai'), t('ไป', 'pai', 'ir', 'pai'), t('โรงเรียน', 'roong-rian', 'a la escuela')],
          [t('ยาย', 'yaai', 'la abuela', 'yaai'), t('ช่วย', 'chûay', 'ayudó', 'chuay'), t('แม่', 'mɛ̂ɛ', 'a su madre', 'mae'), t('ทำ', 'tham', 'hacer', 'tham'), t('อาหาร', 'aa-hǎan', 'la comida', 'aahaan'), t('ทั้งวัน', 'tháng wan', 'todo el día')],
        ],
        es: 'Un día llovió muchísimo, así que la abuela no pudo ir a la escuela. Ayudó a su madre a cocinar todo el día.',
      },
      {
        lines: [
          [t('ตอนนี้', 'tɔɔn-níi', 'ahora', 'tonnii'), t('มี', 'mii', 'hay', 'mii'), t('ถนน', 'thà-nǒn', 'carretera', 'thanon'), t('แล้ว', 'lɛ́ɛo', 'ya', 'laeo')],
          [t('แต่', 'tɛ̀ɛ', 'pero', 'tae'), t('ยาย', 'yaai', 'la abuela', 'yaai'), t('ยัง', 'yang', 'todavía', 'yang'), t('จำ', 'jam', 'recuerda', 'jam'), t('เพื่อน', 'phʉ̂an', 'a sus amigos', 'phuean'), t('ทุก', 'thúk', 'todos', 'thuk'), t('คน', 'khon', '(personas)', 'khon'), t('ได้', 'dâi', '(puede)', 'dai')],
        ],
        es: 'Ahora ya hay carretera. Pero la abuela todavía se acuerda de todos sus amigos.',
      },
    ],
    questions: [
      { q: '¿A qué hora se despertaba Yai de pequeña?', options: ['A las ocho de la mañana', 'A las cinco de la madrugada', 'A mediodía'], answer: 1 },
      { q: '¿Por qué un día no fue a la escuela?', options: ['Porque llovió muchísimo', 'Porque estaba enferma', 'Porque era domingo'], answer: 0 },
      { q: '¿Qué hay ahora en el pueblo?', options: ['Un lago', 'Una escuela nueva', 'Una carretera'], answer: 2 },
    ],
  },
  {
    id: 'st3',
    title: 'Yai y el teléfono',
    titleTh: 'ยายเรียนใช้โทรศัพท์',
    pages: [
      {
        lines: [
          [t('ยาย', 'yaai', 'la abuela', 'yaai'), t('อายุ', 'aa-yú', 'tiene (de edad)', 'aayu'), t('แปดสิบ', 'pɛ̀ɛt-sìp', 'ochenta'), t('ปี', 'pii', 'años', 'pii')],
          [t('หลาน', 'lǎan', 'un nieto', 'laan'), t('ของ', 'khɔ̌ɔng', 'de', 'khong'), t('ยาย', 'yaai', 'la abuela', 'yaai'), t('อยู่', 'yùu', 'vive', 'yuu'), t('ที่', 'thîi', 'en', 'thii'), t('สเปน', 'sà-peen', 'España')],
        ],
        es: 'La abuela tiene ochenta años. Uno de sus nietos vive en España.',
      },
      {
        lines: [
          [t('ยาย', 'yaai', 'la abuela', 'yaai'), t('อยาก', 'yàak', 'quería', 'yaak'), t('เห็น', 'hěn', 'ver'), t('หน้า', 'nâa', 'la cara', 'naa_face'), t('หลาน', 'lǎan', 'de su nieto', 'laan')],
          [t('น้อง', 'nɔ́ɔng', 'Nong', 'nong'), t('เลย', 'ləəi', 'así que', 'loei_so'), t('สอน', 'sɔ̌ɔn', 'enseñó'), t('ยาย', 'yaai', 'a la abuela', 'yaai'), t('ใช้', 'chái', 'a usar'), t('โทรศัพท์', 'thoo-rá-sàp', 'el teléfono')],
        ],
        es: 'La abuela quería ver la cara de su nieto, así que Nong le enseñó a usar el teléfono.',
      },
      {
        lines: [
          [t('ตอนแรก', 'tɔɔn-rɛ̂ɛk', 'al principio'), t('ยาก', 'yâak', 'difícil'), t('มาก', 'mâak', 'muy', 'maak')],
          [t('ยาย', 'yaai', 'la abuela', 'yaai'), t('ลืม', 'lʉʉm', 'se olvidaba', 'luem'), t('บ่อย', 'bɔ̀i', 'a menudo')],
          [t('แต่', 'tɛ̀ɛ', 'pero', 'tae'), t('ยาย', 'yaai', 'la abuela', 'yaai'), t('ไม่', 'mâi', 'no', 'mai_neg'), t('หยุด', 'yùt', 'dejó de'), t('เรียน', 'rian', 'aprender', 'rian')],
        ],
        es: 'Al principio era muy difícil y la abuela se olvidaba a menudo. Pero no dejó de aprender.',
      },
      {
        lines: [
          [t('ตอนนี้', 'tɔɔn-níi', 'ahora', 'tonnii'), t('ยาย', 'yaai', 'la abuela', 'yaai'), t('โทร', 'thoo', 'llama'), t('หา', 'hǎa', 'a', 'haa_visit'), t('หลาน', 'lǎan', 'su nieto', 'laan'), t('ทุก', 'thúk', 'cada', 'thuk'), t('วันอาทิตย์', 'wan-aa-thít', 'domingo', 'wanaathit')],
          [t('ยาย', 'yaai', 'la abuela', 'yaai'), t('บอก', 'bɔ̀ɔk', 'dice', 'bok'), t('ว่า', 'wâa', 'que'), t('ไม่มีใครแก่เกินเรียน', 'mâi mii khrai gɛ̀ɛ gəən rian', 'nadie es demasiado mayor para aprender', 'sp_maimiikhrai')],
        ],
        es: 'Ahora la abuela llama a su nieto cada domingo. Y dice: «Nadie es demasiado mayor para aprender».',
      },
    ],
    questions: [
      { q: '¿Cuántos años tiene Yai?', options: ['Sesenta', 'Ochenta', 'Cien'], answer: 1 },
      { q: '¿Quién le enseñó a usar el teléfono?', options: ['Mae', 'Lung', 'Nong'], answer: 2 },
      { q: '¿Cuándo llama Yai a su nieto?', options: ['Cada domingo', 'Cada mañana', 'Nunca'], answer: 0 },
    ],
  },
  {
    id: 'st4',
    title: 'El khwan de Noi',
    titleTh: 'ขวัญของน้อย',
    pages: [
      {
        lines: [
          [t('วันหนึ่ง', 'wan nʉ̀ng', 'un día'), t('น้อย', 'nɔ́ɔi', 'Noi'), t('เดิน', 'dəən', 'caminaba', 'doen'), t('ข้าม', 'khâam', 'cruzando', 'khaam'), t('สะพาน', 'sà-phaan', 'el puente', 'saphaan'), t('ไม้ไผ่', 'máai-phài', 'de bambú', 'maaiphai')],
          [t('ลม', 'lom', 'el viento', 'lom'), t('แรง', 'rɛɛng', 'fuerte'), t('มาก', 'mâak', 'muy', 'maak')],
          [t('น้อย', 'nɔ́ɔi', 'Noi'), t('ตกใจ', 'tòk-jai', 'se asustó')],
        ],
        es: 'Un día, Noi cruzaba el puente de bambú. Soplaba un viento muy fuerte y Noi se asustó.',
      },
      {
        lines: [
          [t('ขวัญ', 'khwǎn', 'el khwan', 'khwan'), t('ของ', 'khɔ̌ɔng', 'de', 'khong'), t('น้อย', 'nɔ́ɔi', 'Noi'), t('หนี', 'nǐi', 'huyó'), t('ไป', 'pai', '(se fue)', 'pai')],
          [t('น้อย', 'nɔ́ɔi', 'Noi'), t('ไม่', 'mâi', 'no', 'mai_neg'), t('อยาก', 'yàak', 'quería', 'yaak'), t('กิน', 'gin', 'comer', 'kin'), t('ไม่', 'mâi', 'ni', 'mai_neg'), t('อยาก', 'yàak', 'quería', 'yaak'), t('เล่น', 'lên', 'jugar')],
        ],
        es: 'El khwan de Noi se escapó. Noi no quería comer ni jugar.',
      },
      {
        lines: [
          [t('ยาย', 'yaai', 'la abuela', 'yaai'), t('ทำ', 'tham', 'hizo', 'tham'), t('พิธี', 'phí-thii', 'una ceremonia'), t('สู่ขวัญ', 'sùu-khwǎn', 'de llamar al khwan', 'suukhwan'), t('ให้', 'hâi', 'para', 'hai'), t('น้อย', 'nɔ́ɔi', 'Noi')],
          [t('ยาย', 'yaai', 'la abuela', 'yaai'), t('ผูก', 'phùuk', 'ató'), t('สายสิญจน์', 'sǎai-sǐn', 'el hilo sagrado', 'saaisin'), t('ที่', 'thîi', 'en', 'thii'), t('ข้อมือ', 'khɔ̂ɔ-mʉʉ', 'la muñeca')],
        ],
        es: 'La abuela hizo una ceremonia para llamar al khwan de Noi y le ató el hilo sagrado en la muñeca.',
      },
      {
        lines: [
          [t('ยาย', 'yaai', 'la abuela', 'yaai'), t('พูด', 'phûut', 'dijo', 'phuut'), t('ว่า', 'wâa', 'que'), t('ขวัญ', 'khwǎn', 'khwan', 'khwan'), t('เอ๋ย', 'ə̌əi', '¡oh!'), t('ขวัญ', 'khwǎn', 'khwan', 'khwan'), t('มา', 'maa', 'vuelve', 'maa')],
          [t('แล้ว', 'lɛ́ɛo', 'y entonces', 'laeo'), t('ขวัญ', 'khwǎn', 'el khwan', 'khwan'), t('ก็', 'gɔ̂ɔ', '(pues)', 'ko'), t('กลับ', 'glàp', 'volvió', 'klap'), t('มา', 'maa', '(aquí)', 'maa')],
          [t('น้อย', 'nɔ́ɔi', 'Noi'), t('มี', 'mii', 'tuvo', 'mii'), t('ความสุข', 'khwaam-sùk', 'felicidad', 'khwaamsuk'), t('อีก', 'ìik', 'otra', 'iik'), t('ครั้ง', 'khráng', 'vez')],
        ],
        es: 'La abuela dijo: «¡Khwan, oh khwan, vuelve!». Y el khwan volvió, y Noi fue feliz otra vez.',
      },
    ],
    questions: [
      { q: '¿Por qué se asustó Noi?', options: ['Por un tigre', 'Por el viento en el puente', 'Por la lluvia'], answer: 1 },
      { q: '¿Qué le ató Yai en la muñeca?', options: ['El hilo blanco sagrado', 'Una flor', 'Una campana'], answer: 0 },
      { q: '¿Qué pasó al final?', options: ['Noi se fue a casa', 'Noi se durmió', 'El khwan volvió y Noi fue feliz'], answer: 2 },
    ],
  },
];
