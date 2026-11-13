/** La carta de Yai: cada palabra se despeja de niebla cuando aprendes las palabras de `w`. */
export type LetterToken = { th: string; rom: string; es: string; w: string[] };

const t = (th: string, rom: string, es: string, ...w: string[]): LetterToken => ({ th, rom, es, w });

export const YAI_LETTER: { tokens: LetterToken[]; es: string }[] = [
  {
    // หลาน vale para nieto y nieta: la traducción no le pone género a quien aprende
    tokens: [t('สวัสดี', 'sà-wàt-dii', 'hola', 'sawatdii'), t('จ้ะ', 'jâ', '(con cariño)', 'ja'), t('หลาน', 'lǎan', 'nieto, nieta (así te llama Yai)', 'laan'), t('รัก', 'rák', 'a quien quiero', 'rak')],
    es: 'Hola, cariño mío.',
  },
  {
    tokens: [
      t('ยาย', 'yaai', 'la abuela', 'yaai'),
      t('ดีใจ', 'dii-jai', 'contenta', 'diijai'),
      t('มาก', 'mâak', 'muy', 'maak'),
      t('ที่', 'thîi', 'de que', 'thii'),
      t('หลาน', 'lǎan', 'tú', 'laan'),
      t('จะ', 'jà', 'vas a', 'ja_fut'),
      t('มา', 'maa', 'venir', 'maa'),
      t('หา', 'hǎa', 'a vernos', 'haa_visit'),
    ],
    es: 'La abuela está muy contenta de que vengas a vernos.',
  },
  {
    tokens: [
      t('ทาง', 'thaang', 'el camino', 'thaang'),
      t('มา', 'maa', 'a', 'maa'),
      t('บ้าน', 'bâan', 'casa', 'baan'),
      t('เรา', 'rao', 'nuestra', 'rao'),
      t('มี', 'mii', 'tiene', 'mii'),
      t('โค้ง', 'khóong', 'curvas', 'khoong'),
      t('เยอะ', 'yə́', 'muchas', 'yoe'),
      t('มาก', 'mâak', 'muchísimas', 'maak'),
    ],
    es: 'El camino a nuestra casa tiene muchísimas curvas.',
  },
  {
    tokens: [t('ขับรถ', 'khàp-rót', 'conduce', 'khaprot'), t('ช้าๆ', 'cháa-cháa', 'despacito', 'chaachaa'), t('นะ', 'ná', '¿vale?', 'na')],
    es: 'Conduce despacito, ¿vale?',
  },
  {
    tokens: [
      t('ที่บ้าน', 'thîi-bâan', 'en casa', 'thii', 'baan'),
      t('มี', 'mii', 'hay', 'mii'),
      t('ข้าวซอย', 'khâao-sɔɔi', 'khao soi', 'khaosoi'),
      t('มี', 'mii', 'hay', 'mii'),
      t('กาแฟ', 'gaa-fɛɛ', 'café', 'kaafae'),
      t('ร้อน', 'rɔ́ɔn', 'caliente', 'ron'),
      t('และ', 'lɛ́', 'y', 'lae'),
      t('มี', 'mii', 'hay', 'mii'),
      t('หมอก', 'mɔ̀ɔk', 'niebla', 'mok'),
      t('ทุก', 'thúk', 'cada', 'thuk'),
      t('เช้า', 'cháao', 'mañana', 'chao'),
    ],
    es: 'En casa hay khao soi, café caliente y niebla cada mañana.',
  },
  {
    tokens: [
      t('พ่อ', 'phɔ̂ɔ', 'papá', 'pho'),
      t('กับ', 'gàp', 'y', 'kap'),
      t('แม่', 'mɛ̂ɛ', 'mamá', 'mae'),
      t('รอ', 'rɔɔ', 'esperan', 'ro'),
      t('อยู่', 'yùu', '(ahora)', 'yuu'),
      t('น้อง', 'nɔ́ɔng', 'los pequeños', 'nong'),
      t('ก็', 'gɔ̂ɔ', 'también', 'ko'),
      t('รอ', 'rɔɔ', 'esperan', 'ro'),
      t('อยู่', 'yùu', '(ahora)', 'yuu'),
    ],
    es: 'Papá y mamá te esperan, y los pequeños también.',
  },
  {
    tokens: [
      t('มาถึง', 'maa-thʉ̌ng', 'llegar', 'maa', 'thueng'),
      t('เมื่อไหร่', 'mʉ̂a-rài', 'cuando', 'muarai'),
      t('ยาย', 'yaai', 'la abuela', 'yaai'),
      t('จะ', 'jà', 'va a', 'ja_fut'),
      t('ผูกข้อมือ', 'phùuk-khɔ̂ɔ-mʉʉ', 'atarte el hilo de la bendición', 'phukkhomue'),
      t('ให้', 'hâi', '(para ti)', 'hai'),
    ],
    es: 'Cuando llegues, la abuela te atará el hilo de la bendición.',
  },
  { tokens: [t('รัก', 'rák', 'te quiero', 'rak'), t('นะ', 'ná', '¿vale?', 'na')], es: 'Te quiero.' },
  { tokens: [t('ยาย', 'yaai', 'Yai', 'yaai')], es: 'Yai' },
];

export const YAI_TOKENS = YAI_LETTER.flatMap((l) => l.tokens);

/** Palabras que forman la carta (para resaltarlas al aprenderlas). */
export const YAI_WORD_IDS = Array.from(new Set(YAI_TOKENS.flatMap((tk) => tk.w)));
