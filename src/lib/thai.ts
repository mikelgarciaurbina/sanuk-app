import type { ToneId } from '@/brand/tokens';

export type Gender = 'm' | 'f';

/** Algo que se pronuncia: una letra latina o fonética (a–z, ɛ ɔ ʉ ə…), con o sin tilde de tono. */
const SOUND = /[A-Za-z\u00C0-\u02AF]/;

/**
 * Divide la transcripción en sílabas (guiones, espacios y puntos medios separan). Los puntos suspensivos de los
 * moldes («ทั้ง…และ…» = «tháng … lɛ́») no son sílabas: sin esto contaban como una sílaba de tono medio.
 */
export function syllables(rom: string): string[] {
  return rom.split(/(?:[-\s·…]|\.{3})+/).filter((s) => SOUND.test(s));
}

/** Tono de una sílaba a partir de su tilde (NFD): ` bajo, ^ descendente, ´ alto, ˇ ascendente, sin tilde medio. */
export function toneOfSyllable(s: string): ToneId {
  const d = s.normalize('NFD');
  if (d.includes('̀')) return 'L';
  if (d.includes('̂')) return 'F';
  if (d.includes('́')) return 'H';
  if (d.includes('̌')) return 'R';
  return 'M';
}

export const tonesOf = (rom: string): ToneId[] => syllables(rom).map(toneOfSyllable);

/** La transcripción sin las tildes de tono: lo que queda igual en «mâi», «mài» y «mǎi». */
export function stripTones(rom: string): string {
  return rom.normalize('NFD').replace(/[\u0300\u0301\u0302\u030C]/g, '').normalize('NFC');
}

/** Una sílaba partida en ataque (consonantes iniciales) y rima (vocal y final), sin tono: «khâao» → kh + aao. */
export function soundParts(syllable: string): { onset: string; rhyme: string } {
  const s = stripTones(syllable).toLowerCase();
  const v = s.search(/[aeiouɛɔʉə]/);
  return v < 0 ? { onset: s, rhyme: '' } : { onset: s.slice(0, v), rhyme: s.slice(v) };
}

/**
 * Cuánto se parecen al oído dos palabras (0–1), por sus transcripciones: 1 = solo cambia el tono (o ni eso);
 * suman las sílabas con la misma rima o el mismo ataque en la misma posición. Sirve para elegir distractores que
 * obliguen a escuchar («khâao» frente a «khǎao» o «khâo», no frente a «sà-wàt-dii»).
 */
export function soundCloseness(a: string, b: string): number {
  const A = syllables(a).map(soundParts);
  const B = syllables(b).map(soundParts);
  if (!A.length || !B.length) return 0;
  const sim = (x: (typeof A)[number], y: (typeof A)[number]) => {
    if (x.onset === y.onset && x.rhyme === y.rhyme) return 1;
    let s = 0;
    if (x.rhyme === y.rhyme) s += 0.6;
    else if (x.rhyme[0] === y.rhyme[0]) s += x.rhyme.replace(/(.)\1/g, '$1') === y.rhyme.replace(/(.)\1/g, '$1') ? 0.5 : 0.2;
    if (x.onset === y.onset) s += 0.3;
    else if (x.onset[0] === y.onset[0]) s += 0.15;
    return s;
  };
  const n = Math.max(A.length, B.length);
  let total = 0;
  // sílaba a sílaba desde el principio y, si no miden lo mismo, también las últimas entre sí
  for (let i = 0; i < Math.min(A.length, B.length); i++) total += sim(A[i], B[i]);
  if (A.length !== B.length) total = Math.max(total, sim(A[A.length - 1], B[B.length - 1]) + sim(A[0], B[0]) * (Math.min(A.length, B.length) > 1 ? 1 : 0));
  return Math.min(1, total / n);
}

const PARTICLE = { m: { P: 'ครับ', PQ: 'ครับ', I: 'ผม' }, f: { P: 'ค่ะ', PQ: 'คะ', I: 'ฉัน' } } as const;
const PARTICLE_ROM = { m: { P: 'khráp', PQ: 'khráp', I: 'phǒm' }, f: { P: 'khâ', PQ: 'khá', I: 'chǎn' } } as const;

/** Sustituye {P}, {PQ} y {I} por la partícula y el pronombre de quien aprende. */
export function personalize(token: string, g: Gender): string {
  return token.replaceAll('{PQ}', PARTICLE[g].PQ).replaceAll('{P}', PARTICLE[g].P).replaceAll('{I}', PARTICLE[g].I);
}

export function personalizeRom(rom: string, g: Gender): string {
  return rom
    .replace(/\{PQ\}/g, PARTICLE_ROM[g].PQ)
    .replace(/\{P\}/g, PARTICLE_ROM[g].P)
    .replace(/\{I\}/g, PARTICLE_ROM[g].I);
}

export const particle = (g: Gender) => ({ th: PARTICLE[g].P, rom: PARTICLE_ROM[g].P });

/** Frase thai completa a partir de tokens (el thai no separa palabras con espacios). */
export function joinThai(tokens: string[]): string {
  return tokens.join('').replace(/\s+/g, ' ').trim();
}

/** Normaliza texto español para comparar respuestas. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:«»"']/g, '')
    .trim();
}

/** Número en palabras thai (0–999.999). */
export function thaiNumber(n: number): string {
  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  if (n === 0) return digits[0];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  const s = String(n);
  let out = '';
  const len = s.length;
  for (let i = 0; i < len; i++) {
    const d = Number(s[i]);
    const pos = len - i - 1;
    if (d === 0) continue;
    if (pos === 1 && d === 1) out += 'สิบ';
    else if (pos === 1 && d === 2) out += 'ยี่สิบ';
    else if (pos === 0 && d === 1 && len > 1) out += 'เอ็ด';
    else out += digits[d] + units[pos];
  }
  return out;
}

/** Transcripción de un número (0–999.999), coherente con thaiNumber. */
export function thaiNumberRom(n: number): string {
  const digits = ['sǔun', 'nʉ̀ng', 'sɔ̌ɔng', 'sǎam', 'sìi', 'hâa', 'hòk', 'jèt', 'pɛ̀ɛt', 'gâo'];
  if (n === 0) return digits[0];
  const units = ['', 'sìp', 'rɔ́ɔi', 'phan', 'mʉ̀ʉn', 'sɛ̌ɛn'];
  const s = String(n);
  const parts: string[] = [];
  const len = s.length;
  for (let i = 0; i < len; i++) {
    const d = Number(s[i]);
    const pos = len - i - 1;
    if (d === 0) continue;
    if (pos === 1 && d === 1) parts.push('sìp');
    else if (pos === 1 && d === 2) parts.push('yîi-sìp');
    else if (pos === 0 && d === 1 && len > 1) parts.push('èt');
    else parts.push(units[pos] ? `${digits[d]}-${units[pos]}` : digits[d]);
  }
  return parts.join('-');
}

/** Dígitos thai (๐๑๒…). */
export const thaiDigits = (n: number) => String(n).replace(/\d/g, (d) => '๐๑๒๓๔๕๖๗๘๙'[Number(d)]);
