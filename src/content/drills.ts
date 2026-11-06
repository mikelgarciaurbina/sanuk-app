/** Datos de ejercicios específicos: tonos, pares mínimos, clasificadores, «Noi dice» y dinero. */

export type MiniWord = { th: string; rom: string; es: string; emoji?: string };

/** Sílabas sueltas para «Trompa de tonos» (además de las palabras aprendidas de una sílaba). */
export const TONE_BANK: MiniWord[] = [
  { th: 'มา', rom: 'maa', es: 'venir', emoji: '👋' },
  { th: 'ไก่', rom: 'gài', es: 'pollo', emoji: '🐔' },
  { th: 'ข้าว', rom: 'khâao', es: 'arroz', emoji: '🍚' },
  { th: 'ม้า', rom: 'máa', es: 'caballo', emoji: '🐴' },
  { th: 'หมา', rom: 'mǎa', es: 'perro', emoji: '🐶' },
  { th: 'นา', rom: 'naa', es: 'arrozal', emoji: '🌾' },
  { th: 'ป่า', rom: 'pàa', es: 'bosque', emoji: '🌳' },
  { th: 'ห้า', rom: 'hâa', es: 'cinco', emoji: '5️⃣' },
  { th: 'รถ', rom: 'rót', es: 'coche', emoji: '🚙' },
  { th: 'สาม', rom: 'sǎam', es: 'tres', emoji: '3️⃣' },
  { th: 'ดี', rom: 'dii', es: 'bueno', emoji: '👍' },
  { th: 'สี่', rom: 'sìi', es: 'cuatro', emoji: '4️⃣' },
  { th: 'บ้าน', rom: 'bâan', es: 'casa', emoji: '🏡' },
  { th: 'น้ำ', rom: 'náam', es: 'agua', emoji: '💧' },
  { th: 'สอง', rom: 'sɔ̌ɔng', es: 'dos', emoji: '2️⃣' },
  { th: 'ไป', rom: 'pai', es: 'ir', emoji: '🚶' },
  { th: 'ไข่', rom: 'khài', es: 'huevo', emoji: '🥚' },
  { th: 'แม่', rom: 'mɛ̂ɛ', es: 'mamá', emoji: '👩' },
  { th: 'รัก', rom: 'rák', es: 'amar', emoji: '💗' },
  { th: 'หู', rom: 'hǔu', es: 'oreja', emoji: '👂' },
  { th: 'ปลา', rom: 'plaa', es: 'pez', emoji: '🐟' },
  { th: 'เต่า', rom: 'tào', es: 'tortuga', emoji: '🐢' },
  { th: 'ไม่', rom: 'mâi', es: 'no', emoji: '🚫' },
  { th: 'เล็ก', rom: 'lék', es: 'pequeño', emoji: '🐜' },
  { th: 'เสือ', rom: 'sʉ̌a', es: 'tigre', emoji: '🐯' },
];

/** Pares (o tríos) que solo cambian de tono. */
export const MINIMAL_SETS: { title: string; items: MiniWord[]; joke?: string }[] = [
  { title: '¿Tigre o camisa?', items: [{ th: 'เสือ', rom: 'sʉ̌a', es: 'tigre', emoji: '🐯' }, { th: 'เสื้อ', rom: 'sʉ̂a', es: 'camisa', emoji: '👕' }], joke: 'En la tienda, cuidado: no pidas un tigre de la talla M.' },
  { title: '¿Blanco, arroz o rodilla?', items: [{ th: 'ขาว', rom: 'khǎao', es: 'blanco', emoji: '⬜' }, { th: 'ข้าว', rom: 'khâao', es: 'arroz', emoji: '🍚' }, { th: 'เข่า', rom: 'khào', es: 'rodilla', emoji: '🦵' }], joke: 'Pedir «rodilla frita» en el mercado da para una buena anécdota.' },
  { title: '¿Caballo, perro o venir?', items: [{ th: 'ม้า', rom: 'máa', es: 'caballo', emoji: '🐴' }, { th: 'หมา', rom: 'mǎa', es: 'perro', emoji: '🐶' }, { th: 'มา', rom: 'maa', es: 'venir', emoji: '👋' }], joke: '«¡Ven!» y «¡perro!» se parecen mucho. Ojo al llamar a alguien.' },
  { title: '¿Cerca o lejos?', items: [{ th: 'ใกล้', rom: 'glâi', es: 'cerca', emoji: '📍' }, { th: 'ไกล', rom: 'glai', es: 'lejos', emoji: '🗺️' }], joke: 'Con el tono equivocado, el pueblo de Yai se aleja cinco horas más.' },
  { title: '¿Madera, nuevo, no o seda?', items: [{ th: 'ไม้', rom: 'máai', es: 'madera', emoji: '🪵' }, { th: 'ใหม่', rom: 'mài', es: 'nuevo', emoji: '✨' }, { th: 'ไม่', rom: 'mâi', es: 'no', emoji: '🚫' }, { th: 'ไหม', rom: 'mǎi', es: 'seda', emoji: '🧣' }], joke: 'ไม้ใหม่ไม่ไหม้: «la madera nueva no se quema». El trabalenguas favorito de Yai.' },
  { title: '¿Lanzar, bosque o tía?', items: [{ th: 'ปา', rom: 'paa', es: 'lanzar', emoji: '🤾' }, { th: 'ป่า', rom: 'pàa', es: 'bosque', emoji: '🌳' }, { th: 'ป้า', rom: 'pâa', es: 'tía', emoji: '👵' }], joke: 'Mejor no confundas a la tía con el bosque delante de ella.' },
  { title: '¿Arrozal, tío o cara?', items: [{ th: 'นา', rom: 'naa', es: 'arrozal', emoji: '🌾' }, { th: 'น้า', rom: 'náa', es: 'tío/a (hermano menor de mamá)', emoji: '🧔' }, { th: 'หน้า', rom: 'nâa', es: 'cara', emoji: '😀' }] },
  { title: '¿Cangrejo o abuelo?', items: [{ th: 'ปู', rom: 'puu', es: 'cangrejo', emoji: '🦀' }, { th: 'ปู่', rom: 'pùu', es: 'abuelo (paterno)', emoji: '👴' }], joke: 'Al abuelo no le hace gracia que le llamen cangrejo.' },
  { title: '¿Médico u olla?', items: [{ th: 'หมอ', rom: 'mɔ̌ɔ', es: 'médico', emoji: '🩺' }, { th: 'หม้อ', rom: 'mɔ̂ɔ', es: 'olla', emoji: '🍲' }] },
  { title: '¿Montaña o entrar?', items: [{ th: 'เขา', rom: 'khǎo', es: 'montaña; él', emoji: '⛰️' }, { th: 'เข้า', rom: 'khâo', es: 'entrar', emoji: '🚪' }] },
];

/** Clasificadores para «Cestas del mercado». */
export const CLASSIFIERS: { clf: string; rom: string; es: string }[] = [
  { clf: 'ตัว', rom: 'tua', es: 'animales, ropa, mesas' },
  { clf: 'คน', rom: 'khon', es: 'personas' },
  { clf: 'ใบ', rom: 'bai', es: 'hojas, bolsos, platos' },
  { clf: 'ลูก', rom: 'lûuk', es: 'frutas redondas, pelotas' },
  { clf: 'อัน', rom: 'an', es: 'cosas pequeñas' },
  { clf: 'คัน', rom: 'khan', es: 'coches, paraguas, cucharas' },
  { clf: 'เล่ม', rom: 'lêm', es: 'libros, cuchillos' },
  { clf: 'หลัง', rom: 'lǎng', es: 'casas' },
];

export const CLASSIFIER_ITEMS: (MiniWord & { clf: string })[] = [
  { th: 'แมว', rom: 'mɛɛo', es: 'gato', emoji: '🐱', clf: 'ตัว' },
  { th: 'ช้าง', rom: 'cháang', es: 'elefante', emoji: '🐘', clf: 'ตัว' },
  { th: 'ไก่', rom: 'gài', es: 'pollo', emoji: '🐔', clf: 'ตัว' },
  { th: 'เสื้อ', rom: 'sʉ̂a', es: 'camisa', emoji: '👕', clf: 'ตัว' },
  { th: 'โต๊ะ', rom: 'tó', es: 'mesa', emoji: '🪑', clf: 'ตัว' },
  { th: 'เพื่อน', rom: 'phʉ̂an', es: 'amigo', emoji: '🧑‍🤝‍🧑', clf: 'คน' },
  { th: 'ครู', rom: 'khruu', es: 'profesor', emoji: '🧑‍🏫', clf: 'คน' },
  { th: 'เด็ก', rom: 'dèk', es: 'niño', emoji: '🧒', clf: 'คน' },
  { th: 'หมอ', rom: 'mɔ̌ɔ', es: 'médico', emoji: '🩺', clf: 'คน' },
  { th: 'ใบไม้', rom: 'bai-máai', es: 'hoja', emoji: '🍃', clf: 'ใบ' },
  { th: 'กระเป๋า', rom: 'grà-pǎo', es: 'bolso', emoji: '👜', clf: 'ใบ' },
  { th: 'จาน', rom: 'jaan', es: 'plato', emoji: '🍽️', clf: 'ใบ' },
  { th: 'มะม่วง', rom: 'má-mûang', es: 'mango', emoji: '🥭', clf: 'ลูก' },
  { th: 'ส้ม', rom: 'sôm', es: 'naranja', emoji: '🍊', clf: 'ลูก' },
  { th: 'ลูกบอล', rom: 'lûuk-bɔn', es: 'pelota', emoji: '⚽', clf: 'ลูก' },
  { th: 'มะพร้าว', rom: 'má-phráao', es: 'coco', emoji: '🥥', clf: 'ลูก' },
  { th: 'ยางลบ', rom: 'yaang-lóp', es: 'goma de borrar', emoji: '🧽', clf: 'อัน' },
  { th: 'ของเล่น', rom: 'khɔ̌ɔng-lên', es: 'juguete', emoji: '🧸', clf: 'อัน' },
  { th: 'รถ', rom: 'rót', es: 'coche', emoji: '🚙', clf: 'คัน' },
  { th: 'ร่ม', rom: 'rôm', es: 'paraguas', emoji: '☂️', clf: 'คัน' },
  { th: 'ช้อน', rom: 'chɔ́ɔn', es: 'cuchara', emoji: '🥄', clf: 'คัน' },
  { th: 'หนังสือ', rom: 'nǎng-sʉ̌ʉ', es: 'libro', emoji: '📕', clf: 'เล่ม' },
  { th: 'มีด', rom: 'mîit', es: 'cuchillo', emoji: '🔪', clf: 'เล่ม' },
  { th: 'บ้าน', rom: 'bâan', es: 'casa', emoji: '🏡', clf: 'หลัง' },
];

/** Partes de Noi para «Noi dice». Zonas en el viewBox 240×240 del dibujo (izquierda/derecha DE NOI). */
export type NoiTarget = 'earL' | 'earR' | 'eyes' | 'trunk' | 'hat' | 'handL' | 'handR' | 'legs' | 'belly' | 'mouth';
export const NOI_ZONES: Record<NoiTarget, { x: number; y: number; w: number; h: number }> = {
  // la oreja izquierda de Noi está a la DERECHA de quien mira
  earL: { x: 172, y: 50, w: 64, h: 104 },
  earR: { x: 4, y: 50, w: 64, h: 104 },
  eyes: { x: 82, y: 82, w: 76, h: 36 },
  trunk: { x: 108, y: 112, w: 50, h: 46 },
  hat: { x: 54, y: 4, w: 132, h: 54 },
  handL: { x: 150, y: 160, w: 30, h: 46 },
  handR: { x: 60, y: 160, w: 30, h: 46 },
  legs: { x: 84, y: 198, w: 72, h: 36 },
  belly: { x: 100, y: 160, w: 40, h: 26 },
  mouth: { x: 90, y: 132, w: 30, h: 22 },
};

export const BODY_COMMANDS: { th: string; rom: string; es: string; target: NoiTarget }[] = [
  { th: 'แตะหูซ้าย', rom: 'tɛ̀ hǔu sáai', es: 'toca la oreja izquierda', target: 'earL' },
  { th: 'แตะหูขวา', rom: 'tɛ̀ hǔu khwǎa', es: 'toca la oreja derecha', target: 'earR' },
  { th: 'แตะตา', rom: 'tɛ̀ taa', es: 'toca los ojos', target: 'eyes' },
  { th: 'แตะงวง', rom: 'tɛ̀ nguang', es: 'toca la trompa', target: 'trunk' },
  { th: 'แตะหมวก', rom: 'tɛ̀ mùak', es: 'toca el sombrero', target: 'hat' },
  { th: 'แตะมือซ้าย', rom: 'tɛ̀ mʉʉ sáai', es: 'toca la mano izquierda', target: 'handL' },
  { th: 'แตะมือขวา', rom: 'tɛ̀ mʉʉ khwǎa', es: 'toca la mano derecha', target: 'handR' },
  { th: 'แตะขา', rom: 'tɛ̀ khǎa', es: 'toca las patas', target: 'legs' },
  { th: 'แตะท้อง', rom: 'tɛ̀ thɔ́ɔng', es: 'toca la barriga', target: 'belly' },
  { th: 'แตะปาก', rom: 'tɛ̀ pàak', es: 'toca la boca', target: 'mouth' },
];

/** Puesto del mercado para «Paga justo». */
export const MARKET_ITEMS: { th: string; rom: string; es: string; emoji: string; clf: string; unit: [number, number] }[] = [
  { th: 'มะม่วง', rom: 'má-mûang', es: 'mango', emoji: '🥭', clf: 'ลูก', unit: [15, 30] },
  { th: 'กล้วย', rom: 'glûay', es: 'plátano', emoji: '🍌', clf: 'หวี', unit: [20, 40] },
  { th: 'มะพร้าว', rom: 'má-phráao', es: 'coco', emoji: '🥥', clf: 'ลูก', unit: [25, 45] },
  { th: 'ส้ม', rom: 'sôm', es: 'naranja', emoji: '🍊', clf: 'ลูก', unit: [8, 15] },
  { th: 'แตงโม', rom: 'tɛɛng-moo', es: 'sandía', emoji: '🍉', clf: 'ลูก', unit: [40, 80] },
  { th: 'กาแฟ', rom: 'gaa-fɛɛ', es: 'café', emoji: '☕', clf: 'แก้ว', unit: [35, 65] },
  { th: 'ข้าวซอย', rom: 'khâao-sɔɔi', es: 'khao soi', emoji: '🍜', clf: 'ชาม', unit: [50, 80] },
  { th: 'ไข่', rom: 'khài', es: 'huevo', emoji: '🥚', clf: 'ฟอง', unit: [4, 7] },
];

/** Billetes y monedas de baht con sus colores reales. */
export const BAHT: { v: number; kind: 'note' | 'coin'; color: string }[] = [
  { v: 1000, kind: 'note', color: '#8A5A3C' },
  { v: 500, kind: 'note', color: '#7B4FC4' },
  { v: 100, kind: 'note', color: '#D9534F' },
  { v: 50, kind: 'note', color: '#3D6FD8' },
  { v: 20, kind: 'note', color: '#3E9A5B' },
  { v: 10, kind: 'coin', color: '#E9C46A' },
  { v: 5, kind: 'coin', color: '#CFD6DE' },
  { v: 2, kind: 'coin', color: '#E3C27A' },
  { v: 1, kind: 'coin', color: '#CFD6DE' },
];
