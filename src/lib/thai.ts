import type { ToneId } from '@/brand/tokens';

export type Gender = 'm' | 'f';

/** Divide la transcripción en sílabas (guiones, espacios y puntos medios separan). */
export function syllables(rom: string): string[] {
  return rom.split(/[-\s·]+/).filter(Boolean);
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
