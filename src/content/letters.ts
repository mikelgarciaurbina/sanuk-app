import type { Consonant, Vowel } from './types';

/** Las 44 consonantes con su palabra-guía (como se enseñan en las escuelas tailandesas). */
export const CONSONANTS: Consonant[] = [
  // clase media
  { ch: 'ก', name: 'ไก่', nameRom: 'gɔɔ gài', meaning: 'pollo', sound: 'g', final: 'k', cls: 'media' },
  { ch: 'จ', name: 'จาน', nameRom: 'jɔɔ jaan', meaning: 'plato', sound: 'j', final: 't', cls: 'media' },
  { ch: 'ฎ', name: 'ชฎา', nameRom: 'dɔɔ chá-daa', meaning: 'tocado de danza', sound: 'd', final: 't', cls: 'media' },
  { ch: 'ฏ', name: 'ปฏัก', nameRom: 'tɔɔ pà-tàk', meaning: 'aguijada', sound: 't', final: 't', cls: 'media' },
  { ch: 'ด', name: 'เด็ก', nameRom: 'dɔɔ dèk', meaning: 'niño', sound: 'd', final: 't', cls: 'media' },
  { ch: 'ต', name: 'เต่า', nameRom: 'tɔɔ tào', meaning: 'tortuga', sound: 't', final: 't', cls: 'media' },
  { ch: 'บ', name: 'ใบไม้', nameRom: 'bɔɔ bai-máai', meaning: 'hoja', sound: 'b', final: 'p', cls: 'media' },
  { ch: 'ป', name: 'ปลา', nameRom: 'pɔɔ plaa', meaning: 'pez', sound: 'p', final: 'p', cls: 'media' },
  { ch: 'อ', name: 'อ่าง', nameRom: 'ɔɔ àang', meaning: 'palangana', sound: '(muda)', cls: 'media' },
  // clase alta
  { ch: 'ข', name: 'ไข่', nameRom: 'khɔ̌ɔ khài', meaning: 'huevo', sound: 'kh', final: 'k', cls: 'alta' },
  { ch: 'ฃ', name: 'ขวด', nameRom: 'khɔ̌ɔ khùat', meaning: 'botella (ya no se usa)', sound: 'kh', final: 'k', cls: 'alta' },
  { ch: 'ฉ', name: 'ฉิ่ง', nameRom: 'chɔ̌ɔ chìng', meaning: 'platillos', sound: 'ch', cls: 'alta' },
  { ch: 'ฐ', name: 'ฐาน', nameRom: 'thɔ̌ɔ thǎan', meaning: 'pedestal', sound: 'th', final: 't', cls: 'alta' },
  { ch: 'ถ', name: 'ถุง', nameRom: 'thɔ̌ɔ thǔng', meaning: 'bolsa', sound: 'th', final: 't', cls: 'alta' },
  { ch: 'ผ', name: 'ผึ้ง', nameRom: 'phɔ̌ɔ phʉ̂ng', meaning: 'abeja', sound: 'ph', cls: 'alta' },
  { ch: 'ฝ', name: 'ฝา', nameRom: 'fɔ̌ɔ fǎa', meaning: 'tapa', sound: 'f', cls: 'alta' },
  { ch: 'ศ', name: 'ศาลา', nameRom: 'sɔ̌ɔ sǎa-laa', meaning: 'pabellón', sound: 's', final: 't', cls: 'alta' },
  { ch: 'ษ', name: 'ฤๅษี', nameRom: 'sɔ̌ɔ rʉʉ-sǐi', meaning: 'ermitaño', sound: 's', final: 't', cls: 'alta' },
  { ch: 'ส', name: 'เสือ', nameRom: 'sɔ̌ɔ sʉ̌a', meaning: 'tigre', sound: 's', final: 't', cls: 'alta' },
  { ch: 'ห', name: 'หีบ', nameRom: 'hɔ̌ɔ hìip', meaning: 'cofre', sound: 'h', cls: 'alta' },
  // clase baja
  { ch: 'ค', name: 'ควาย', nameRom: 'khɔɔ khwaai', meaning: 'búfalo', sound: 'kh', final: 'k', cls: 'baja' },
  { ch: 'ฅ', name: 'คน', nameRom: 'khɔɔ khon', meaning: 'persona (ya no se usa)', sound: 'kh', final: 'k', cls: 'baja' },
  { ch: 'ฆ', name: 'ระฆัง', nameRom: 'khɔɔ rá-khang', meaning: 'campana', sound: 'kh', final: 'k', cls: 'baja' },
  { ch: 'ง', name: 'งู', nameRom: 'ngɔɔ nguu', meaning: 'serpiente', sound: 'ng', final: 'ng', cls: 'baja' },
  { ch: 'ช', name: 'ช้าง', nameRom: 'chɔɔ cháang', meaning: 'elefante', sound: 'ch', final: 't', cls: 'baja' },
  { ch: 'ซ', name: 'โซ่', nameRom: 'sɔɔ sôo', meaning: 'cadena', sound: 's', final: 't', cls: 'baja' },
  { ch: 'ฌ', name: 'เฌอ', nameRom: 'chɔɔ chəə', meaning: 'árbol', sound: 'ch', cls: 'baja' },
  { ch: 'ญ', name: 'หญิง', nameRom: 'yɔɔ yǐng', meaning: 'mujer', sound: 'y', final: 'n', cls: 'baja' },
  { ch: 'ฑ', name: 'มณโฑ', nameRom: 'thɔɔ mon-thoo', meaning: 'Monthó (personaje del Ramakien)', sound: 'th', final: 't', cls: 'baja' },
  { ch: 'ฒ', name: 'ผู้เฒ่า', nameRom: 'thɔɔ phûu-thâo', meaning: 'anciano', sound: 'th', final: 't', cls: 'baja' },
  { ch: 'ณ', name: 'เณร', nameRom: 'nɔɔ neen', meaning: 'novicio', sound: 'n', final: 'n', cls: 'baja' },
  { ch: 'ท', name: 'ทหาร', nameRom: 'thɔɔ thá-hǎan', meaning: 'soldado', sound: 'th', final: 't', cls: 'baja' },
  { ch: 'ธ', name: 'ธง', nameRom: 'thɔɔ thong', meaning: 'bandera', sound: 'th', final: 't', cls: 'baja' },
  { ch: 'น', name: 'หนู', nameRom: 'nɔɔ nǔu', meaning: 'ratón', sound: 'n', final: 'n', cls: 'baja' },
  { ch: 'พ', name: 'พาน', nameRom: 'phɔɔ phaan', meaning: 'bandeja de ofrendas', sound: 'ph', final: 'p', cls: 'baja' },
  { ch: 'ฟ', name: 'ฟัน', nameRom: 'fɔɔ fan', meaning: 'diente', sound: 'f', final: 'p', cls: 'baja' },
  { ch: 'ภ', name: 'สำเภา', nameRom: 'phɔɔ sǎm-phao', meaning: 'junco (barco)', sound: 'ph', final: 'p', cls: 'baja' },
  { ch: 'ม', name: 'ม้า', nameRom: 'mɔɔ máa', meaning: 'caballo', sound: 'm', final: 'm', cls: 'baja' },
  { ch: 'ย', name: 'ยักษ์', nameRom: 'yɔɔ yák', meaning: 'gigante', sound: 'y', final: 'i', cls: 'baja' },
  { ch: 'ร', name: 'เรือ', nameRom: 'rɔɔ rʉa', meaning: 'barca', sound: 'r', final: 'n', cls: 'baja' },
  { ch: 'ล', name: 'ลิง', nameRom: 'lɔɔ ling', meaning: 'mono', sound: 'l', final: 'n', cls: 'baja' },
  { ch: 'ว', name: 'แหวน', nameRom: 'wɔɔ wɛ̌ɛn', meaning: 'anillo', sound: 'w', final: 'o', cls: 'baja' },
  { ch: 'ฬ', name: 'จุฬา', nameRom: 'lɔɔ jù-laa', meaning: 'cometa', sound: 'l', final: 'n', cls: 'baja' },
  { ch: 'ฮ', name: 'นกฮูก', nameRom: 'hɔɔ nók-hûuk', meaning: 'búho', sound: 'h', cls: 'baja' },
];

/** Grupos de enseñanza (las más frecuentes primero). */
export const LETTER_SETS: Record<string, string[]> = {
  media: ['ก', 'จ', 'ด', 'ต', 'บ', 'ป', 'อ'],
  baja: ['ม', 'น', 'ร', 'ล', 'ว', 'ย', 'ง', 'ค', 'ช', 'ท', 'พ', 'ฟ'],
  alta: ['ข', 'ฉ', 'ถ', 'ผ', 'ฝ', 'ส', 'ห'],
  raras: ['ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ศ', 'ษ', 'ฆ', 'ฌ', 'ญ', 'ธ', 'ภ', 'ซ', 'ฬ', 'ฮ'],
};

export const VOWELS: Vowel[] = [
  { ch: '–ะ', rom: 'a', long: false, pos: 'despues' },
  { ch: '–า', rom: 'aa', long: true, pos: 'despues' },
  { ch: '–ิ', rom: 'i', long: false, pos: 'arriba' },
  { ch: '–ี', rom: 'ii', long: true, pos: 'arriba' },
  { ch: '–ึ', rom: 'ʉ', long: false, pos: 'arriba' },
  { ch: '–ือ', rom: 'ʉʉ', long: true, pos: 'arriba' },
  { ch: '–ุ', rom: 'u', long: false, pos: 'abajo' },
  { ch: '–ู', rom: 'uu', long: true, pos: 'abajo' },
  { ch: 'เ–', rom: 'ee', long: true, pos: 'antes' },
  { ch: 'แ–', rom: 'ɛɛ', long: true, pos: 'antes' },
  { ch: 'โ–', rom: 'oo', long: true, pos: 'antes' },
  { ch: '–อ', rom: 'ɔɔ', long: true, pos: 'despues' },
  { ch: 'เ–อ', rom: 'əə', long: true, pos: 'rodea' },
  { ch: 'เ–ีย', rom: 'ia', long: true, pos: 'rodea' },
  { ch: 'เ–ือ', rom: 'ʉa', long: true, pos: 'rodea' },
  { ch: '–ัว', rom: 'ua', long: true, pos: 'rodea' },
  { ch: 'ไ–', rom: 'ai', long: false, pos: 'antes' },
  { ch: 'ใ–', rom: 'ai', long: false, pos: 'antes' },
  { ch: 'เ–า', rom: 'ao', long: false, pos: 'rodea' },
  { ch: '–ำ', rom: 'am', long: false, pos: 'despues' },
];

export const TONE_MARKS = [
  { ch: '่', name: 'ไม้เอก', rom: 'mái èek' },
  { ch: '้', name: 'ไม้โท', rom: 'mái thoo' },
  { ch: '๊', name: 'ไม้ตรี', rom: 'mái trii' },
  { ch: '๋', name: 'ไม้จัตวา', rom: 'mái jàt-tà-waa' },
];

/** Sílabas para «Bloques de sílabas»: consonante + vocal + marca de tono. */
export const SYLLABLES: { th: string; rom: string; es: string; c: string; v: string; t: string; vpos: Vowel['pos'] }[] = [
  { th: 'มา', rom: 'maa', es: 'venir', c: 'ม', v: 'า', t: '', vpos: 'despues' },
  { th: 'ดี', rom: 'dii', es: 'bueno', c: 'ด', v: 'ี', t: '', vpos: 'arriba' },
  { th: 'ปู', rom: 'puu', es: 'cangrejo', c: 'ป', v: 'ู', t: '', vpos: 'abajo' },
  { th: 'ตา', rom: 'taa', es: 'ojo', c: 'ต', v: 'า', t: '', vpos: 'despues' },
  { th: 'นา', rom: 'naa', es: 'arrozal', c: 'น', v: 'า', t: '', vpos: 'despues' },
  { th: 'ปี', rom: 'pii', es: 'año', c: 'ป', v: 'ี', t: '', vpos: 'arriba' },
  { th: 'ใจ', rom: 'jai', es: 'corazón', c: 'จ', v: 'ใ', t: '', vpos: 'antes' },
  { th: 'โต', rom: 'too', es: 'crecer', c: 'ต', v: 'โ', t: '', vpos: 'antes' },
  { th: 'หู', rom: 'hǔu', es: 'oreja', c: 'ห', v: 'ู', t: '', vpos: 'abajo' },
  { th: 'สี', rom: 'sǐi', es: 'color', c: 'ส', v: 'ี', t: '', vpos: 'arriba' },
  { th: 'ขา', rom: 'khǎa', es: 'pierna', c: 'ข', v: 'า', t: '', vpos: 'despues' },
  { th: 'ไม่', rom: 'mâi', es: 'no', c: 'ม', v: 'ไ', t: '่', vpos: 'antes' },
  { th: 'แม่', rom: 'mɛ̂ɛ', es: 'mamá', c: 'ม', v: 'แ', t: '่', vpos: 'antes' },
  { th: 'พ่อ', rom: 'phɔ̂ɔ', es: 'papá', c: 'พ', v: 'อ', t: '่', vpos: 'despues' },
  { th: 'ป้า', rom: 'pâa', es: 'tía (mayor)', c: 'ป', v: 'า', t: '้', vpos: 'despues' },
  { th: 'ไก่', rom: 'gài', es: 'pollo', c: 'ก', v: 'ไ', t: '่', vpos: 'antes' },
  { th: 'ไข่', rom: 'khài', es: 'huevo', c: 'ข', v: 'ไ', t: '่', vpos: 'antes' },
  { th: 'ม้า', rom: 'máa', es: 'caballo', c: 'ม', v: 'า', t: '้', vpos: 'despues' },
  { th: 'ห้า', rom: 'hâa', es: 'cinco', c: 'ห', v: 'า', t: '้', vpos: 'despues' },
  { th: 'ปู่', rom: 'pùu', es: 'abuelo (paterno)', c: 'ป', v: 'ู', t: '่', vpos: 'abajo' },
  { th: 'ย่า', rom: 'yâa', es: 'abuela (paterna)', c: 'ย', v: 'า', t: '่', vpos: 'despues' },
  { th: 'ฟ้า', rom: 'fáa', es: 'cielo', c: 'ฟ', v: 'า', t: '้', vpos: 'despues' },
];

/**
 * Letras para «Une los puntos»: puntos en orden (caja 0–100), empezando por el bucle (la «cabeza»),
 * como se enseña en las escuelas tailandesas. Trazos estilizados, no tipográficos.
 */
export const TRACE: { ch: string; name: string; rom: string; meaning: string; dots: [number, number][] }[] = [
  { ch: 'บ', name: 'ใบไม้', rom: 'bɔɔ bai-máai', meaning: 'hoja', dots: [[30, 22], [24, 30], [24, 52], [25, 72], [36, 86], [52, 89], [68, 86], [76, 72], [77, 50], [77, 16]] },
  { ch: 'ป', name: 'ปลา', rom: 'pɔɔ plaa', meaning: 'pez', dots: [[30, 34], [24, 42], [24, 62], [27, 78], [40, 88], [56, 88], [70, 82], [76, 66], [77, 40], [77, 4]] },
  { ch: 'ม', name: 'ม้า', rom: 'mɔɔ máa', meaning: 'caballo', dots: [[30, 70], [22, 78], [28, 88], [34, 74], [26, 44], [26, 18], [40, 52], [56, 88], [70, 76], [76, 50], [76, 16]] },
  { ch: 'น', name: 'หนู', rom: 'nɔɔ nǔu', meaning: 'ratón', dots: [[28, 22], [22, 30], [24, 60], [28, 88], [46, 56], [62, 30], [74, 34], [76, 62], [76, 84], [86, 88]] },
  { ch: 'ด', name: 'เด็ก', rom: 'dɔɔ dèk', meaning: 'niño', dots: [[38, 62], [30, 66], [32, 76], [40, 72], [30, 50], [32, 28], [50, 18], [68, 26], [76, 46], [76, 70], [76, 88]] },
  { ch: 'ร', name: 'เรือ', rom: 'rɔɔ rʉa', meaning: 'barca', dots: [[66, 14], [44, 18], [30, 26], [46, 34], [64, 40], [62, 54], [48, 64], [40, 74], [48, 84], [58, 86], [62, 80]] },
  { ch: 'ว', name: 'แหวน', rom: 'wɔɔ wɛ̌ɛn', meaning: 'anillo', dots: [[40, 70], [30, 74], [32, 86], [44, 84], [40, 60], [34, 36], [44, 20], [60, 18], [72, 30], [74, 54], [68, 78], [56, 88]] },
  { ch: 'อ', name: 'อ่าง', rom: 'ɔɔ àang', meaning: 'palangana', dots: [[40, 40], [32, 46], [36, 56], [44, 50], [34, 32], [48, 18], [66, 20], [76, 38], [76, 62], [70, 82], [52, 88], [36, 84]] },
];
