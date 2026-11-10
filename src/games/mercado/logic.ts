// Lógica de «Paga justo»: qué se vende, a qué precio y cómo se dice. Los precios se eligen para que se
// digan solo con números thai que quien aprende ya conoce (y, si la lección enseña números, que los usen).
import { MARKET_ITEMS } from '@/content/drills';
import { knownForms } from '@/content';
import type { Word } from '@/content/types';
import { pick, shuffle } from '@/lib/random';
import { personalize, personalizeRom, thaiNumber, thaiNumberRom, type Gender } from '@/lib/thai';

export type GoodArt = 'mango' | 'platano' | 'coco' | 'naranja' | 'sandia' | 'cafe' | 'khaosoi' | 'huevo' | 'camisa' | 'paraguas' | 'bolso' | 'otro';

export type Good = { th: string; rom: string; es: string; emoji: string; clf: string; unit: [number, number]; art: GoodArt; qty: [number, number] };

const ART: Record<string, { art: GoodArt; qty: [number, number] }> = {
  มะม่วง: { art: 'mango', qty: [1, 4] },
  กล้วย: { art: 'platano', qty: [1, 2] },
  มะพร้าว: { art: 'coco', qty: [1, 3] },
  ส้ม: { art: 'naranja', qty: [1, 6] },
  แตงโม: { art: 'sandia', qty: [1, 2] },
  กาแฟ: { art: 'cafe', qty: [1, 3] },
  ข้าวซอย: { art: 'khaosoi', qty: [1, 3] },
  ไข่: { art: 'huevo', qty: [1, 10] },
};

/** Lo caro del mercado (para los precios altos de la feria): ropa y artesanía del norte. */
const CRAFTS: Good[] = [
  { th: 'เสื้อ', rom: 'sʉ̂a', es: 'camisa', emoji: '👕', clf: 'ตัว', unit: [150, 390], art: 'camisa', qty: [1, 2] },
  { th: 'ร่ม', rom: 'rôm', es: 'paraguas', emoji: '☂️', clf: 'คัน', unit: [250, 650], art: 'paraguas', qty: [1, 1] },
  { th: 'กระเป๋า', rom: 'grà-pǎo', es: 'bolso', emoji: '👜', clf: 'ใบ', unit: [300, 900], art: 'bolso', qty: [1, 1] },
];

export const GOODS: Good[] = [...MARKET_ITEMS.map((m) => ({ ...m, ...(ART[m.th] ?? { art: 'otro' as const, qty: [1, 3] as [number, number] }) })), ...CRAFTS];

const CLF_ROM: Record<string, string> = { ลูก: 'lûuk', หวี: 'wǐi', แก้ว: 'gɛ̂ɛo', ชาม: 'chaam', ฟอง: 'fɔɔng', ตัว: 'tua', คัน: 'khan', ใบ: 'bai' };

// ——— Números ———

const DIGIT = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const UNIT = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
const NUMBER_WORDS = new Set([...DIGIT, ...UNIT.filter(Boolean), 'ยี่สิบ', 'เอ็ด']);

/** Palabras thai con las que se dice un número (coherente con `thaiNumber`). */
export function numberParts(n: number): string[] {
  if (n === 0) return [DIGIT[0]];
  const s = String(n);
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    const pos = s.length - i - 1;
    if (d === 0) continue;
    if (pos === 1 && d === 1) out.push('สิบ');
    else if (pos === 1 && d === 2) out.push('ยี่สิบ');
    else if (pos === 0 && d === 1 && s.length > 1) out.push('เอ็ด');
    else {
      out.push(DIGIT[d]);
      if (UNIT[pos]) out.push(UNIT[pos]);
    }
  }
  return out;
}

/** Billetes y monedas de baht, de mayor a menor. */
export const DENOMS = [1000, 500, 100, 50, 20, 10, 5, 2, 1] as const;
export const isNote = (v: number) => v >= 20;

/** Desglose mínimo de una cantidad en billetes y monedas. */
export function breakdown(n: number): number[] {
  const out: number[] = [];
  let left = n;
  for (const d of DENOMS) {
    while (left >= d) {
      out.push(d);
      left -= d;
    }
  }
  return out;
}

// ——— Rondas ———

export type Kind = 'pagar' | 'cambio' | 'regateo';
/** Cómo se ve el precio en la etiqueta: cifras, cifras thai u oculto (solo se oye). */
export type Show = 'num' | 'thai' | 'oculto';

export type Round = {
  kind: Kind;
  good: Good;
  qty: number;
  /** precio que dice la vendedora */
  price: number;
  /** precio rebajado (regateo) */
  deal?: number;
  /** billete con el que has pagado (cambio) */
  paid?: number;
  /** cambio que te devuelve (puede estar mal) */
  change?: number;
  show: Show;
  level: number;
  /** palabra de número que se practica (repaso espaciado) */
  numWord?: Word;
};

export type Knowledge = {
  /** números thai que ya conoce quien aprende (null = aún no sabe bastantes: sin restricción) */
  known: Set<string> | null;
  /** números que enseña la lección (se usan con prioridad) */
  fresh: Set<string>;
  words: Word[];
  focus: Word[];
  /** todo el thai ya presentado: la vendedora solo dice lo que se entiende */
  said: Set<string>;
  /** sabe pedir rebaja (ลด) · sabe preguntar el precio (เท่าไหร่) · sabe «caro» (แพง) */
  canHaggle: boolean;
  canAsk: boolean;
  saysCaro: boolean;
  /** la lección va de dar el cambio (ทอน) */
  teachesChange: boolean;
};

export function knowledge(words: Word[], focus: Word[]): Knowledge {
  const said = knownForms([...words, ...focus]);
  const nums = [...said].filter((t) => NUMBER_WORDS.has(t));
  const fresh = new Set(focus.map((w) => w.th).filter((t) => NUMBER_WORDS.has(t)));
  return {
    known: nums.length >= 4 ? new Set(nums) : null,
    fresh,
    words,
    focus,
    said,
    canHaggle: ['ลด', 'ได้', 'ไหม'].every((t) => said.has(t)),
    canAsk: ['อันนี้', 'เท่าไหร่'].every((t) => said.has(t)),
    saysCaro: ['แพง', 'มาก'].every((t) => said.has(t)),
    teachesChange: focus.some((w) => w.th === 'ทอน'),
  };
}

/** Números thai presentados que hacen falta para jugar al mercado en la feria. */
export const MIN_MARKET_NUMBERS = 4;
export const marketNumbers = (said: Set<string>) => [...said].filter((t) => NUMBER_WORDS.has(t)).length;

const sayable = (n: number, k: Knowledge) => !k.known || numberParts(n).every((p) => k.known!.has(p));

/** Precios con aspecto de mercado (los baratos, de uno en uno; los demás, de cinco en cinco). */
function pricesIn(lo: number, hi: number, k: Knowledge): number[] {
  const out: number[] = [];
  for (let n = Math.max(1, lo); n <= hi; n++) {
    if (n > 30 && n % 5 !== 0) continue;
    if (n > 300 && n % 10 !== 0) continue;
    if (sayable(n, k)) out.push(n);
  }
  return out;
}

/** Elige uno, con más peso para los que usan los números nuevos de la lección. */
function choosePrice(list: number[], k: Knowledge): number {
  if (!k.fresh.size) return pick(list);
  const hot = list.filter((n) => numberParts(n).some((p) => k.fresh.has(p)));
  return hot.length && Math.random() < 0.8 ? pick(hot) : pick(list);
}

/** La palabra de número que se practica en este precio (la nueva de la lección si la hay). */
export function numWordOf(n: number, k: Knowledge): Word | undefined {
  const parts = numberParts(n);
  return k.focus.find((w) => parts.includes(w.th)) ?? shuffle(k.words.filter((w) => parts.includes(w.th)))[0];
}

type Band = { lo: number; hi: number; crafts: boolean };

function order(band: Band, k: Knowledge, avoid?: string): { good: Good; qty: number; price: number } | null {
  const food = shuffle(GOODS.filter((g) => !CRAFTS.includes(g) && g.th !== avoid));
  const crafts = shuffle(CRAFTS.filter((g) => g.th !== avoid));
  // en lo caro, casi siempre artesanía (paraguas, bolsos, camisas)
  const goods = !band.crafts ? food : Math.random() < 0.65 ? [...crafts, ...food] : shuffle([...food, ...crafts]);
  for (const good of goods) {
    const qtys = shuffle(Array.from({ length: good.qty[1] - good.qty[0] + 1 }, (_, i) => good.qty[0] + i));
    for (const qty of qtys) {
      if (k.known && !sayable(qty, k)) continue;
      const list = pricesIn(Math.max(band.lo, good.unit[0] * qty), Math.min(band.hi, good.unit[1] * qty), k);
      if (list.length) return { good, qty, price: choosePrice(list, k) };
    }
  }
  return null;
}

function anyOrder(band: Band, k: Knowledge, avoid?: string) {
  return order(band, k, avoid) ?? order({ lo: 1, hi: 1000, crafts: true }, k, avoid) ?? order({ lo: 1, hi: 1000, crafts: true }, { ...k, known: null }, avoid)!;
}

const BANDS: Record<number, Band> = {
  1: { lo: 1, hi: 60, crafts: false },
  2: { lo: 20, hi: 200, crafts: false },
  3: { lo: 60, hi: 900, crafts: true },
};

/** Una ronda del tipo pedido, con el nivel de dificultad dado. */
export function makeRound(kind: Kind, level: number, show: Show, k: Knowledge, band: Band = BANDS[level] ?? BANDS[2], avoid?: string): Round {
  if (kind === 'regateo') {
    const o = anyOrder({ ...band, lo: Math.max(band.lo, 40) }, k, avoid);
    const steps = o.price >= 300 ? [50, 100] : o.price >= 100 ? [10, 20, 30] : [5, 10];
    const deals = shuffle(steps)
      .map((d) => o.price - d)
      .filter((d) => d > 0 && sayable(d, k));
    if (deals.length) return { kind, ...o, deal: deals[0], show, level, numWord: numWordOf(deals[0], k) };
    return { kind: 'pagar', ...o, show, level, numWord: numWordOf(o.price, k) };
  }
  if (kind === 'cambio') {
    const o = anyOrder({ ...band, hi: Math.min(band.hi, 950) }, k, avoid);
    // pagas como paga la gente: un billete grande o el precio redondeado con uno o dos billetes
    const opts = new Set([20, 50, 100, 500, 1000].filter((n) => n > o.price));
    for (const step of [10, 20, 50, 100]) {
      const up = Math.ceil((o.price + 1) / step) * step;
      if (breakdown(up).every((v) => v >= 20) && breakdown(up).length <= 3) opts.add(up);
    }
    const maxChange = level >= 3 ? 600 : level === 2 ? 120 : 60;
    const fits = [...opts].filter((n) => n - o.price <= maxChange).sort((a, b) => a - b);
    const paid = fits.length ? pick(fits) : Math.min(...opts);
    const right = paid - o.price;
    // 40 % bien · 40 % te da de menos · 20 % te da de más
    const r = Math.random();
    let change = right;
    const short = [1, 2, 5, 10, 20].filter((d) => d < right && d <= Math.max(5, right / 3));
    if (r >= 0.4 && r < 0.8 && short.length) change = right - pick(short);
    else if (r >= 0.4) change = right + pick([1, 2, 5, 10, 20].filter((d) => d <= Math.max(5, right / 2)));
    return { kind, ...o, paid, change, show, level, numWord: numWordOf(o.price, k) };
  }
  const o = anyOrder(band, k, avoid);
  return { kind: 'pagar', ...o, show, level, numWord: numWordOf(o.price, k) };
}

/** Plan de la partida. Feria: tres niveles (cifras → cifras thai → solo de oído) con cambio y regateo.
 *  Lección: aprender primero (cifras a la vista) y luego de oído, con lo que enseñe la lección. */
export function makePlan(mode: 'leccion' | 'feria', total: number, k: Knowledge): Round[] {
  const out: Round[] = [];
  let last: string | undefined;
  const push = (r: Round) => {
    last = r.good.th;
    out.push(r);
  };
  if (mode === 'leccion') {
    const big = k.fresh.has('พัน') ? 1500 : k.fresh.has('ร้อย') ? 600 : 120;
    const band: Band = { lo: 1, hi: big, crafts: big > 300 };
    for (let i = 0; i < total; i++) {
      let kind: Kind = 'pagar';
      if (i === 1 && k.teachesChange) kind = 'cambio';
      else if (i === 1 && k.focus.some((w) => w.th === 'ลด')) kind = 'regateo';
      push(makeRound(kind, 1, i === 0 ? 'num' : 'oculto', k, band, last));
    }
    return out;
  }
  // cada bloque de cuatro clientes trae, en orden distinto, dos compras, un regateo y un cambio
  const kinds: Kind[] = [];
  while (kinds.length < total) {
    const block = shuffle<Kind>(['pagar', 'pagar', k.canHaggle ? 'regateo' : 'pagar', 'cambio']);
    kinds.push(...(kinds.length === 0 ? ['pagar' as Kind, ...block.filter((_, j) => j !== block.indexOf('pagar'))] : block));
  }
  for (let i = 0; i < total; i++) {
    const f = total > 1 ? i / (total - 1) : 0;
    const level = f < 0.25 ? 1 : f < 0.6 ? 2 : 3;
    const show: Show = level === 1 ? 'num' : level === 2 ? 'thai' : 'oculto';
    let r = makeRound(kinds[i], level, show, k, BANDS[level], last);
    for (let t = 0; t < 3 && out.length && r.price === out[out.length - 1].price; t++) r = makeRound(kinds[i], level, show, k, BANDS[level], last);
    push(r);
  }
  return out;
}

// ——— Frases ———

export type Line = { th: string; rom: string; es: string };

function plural(es: string): string {
  if (es === 'khao soi') return es;
  const [first, ...rest] = es.split(' ');
  const p = /s$/.test(first) ? first : /[aeiouáéíóú]$/.test(first) ? `${first}s` : `${first}es`;
  return [p, ...rest].join(' ');
}

/** «Dos mangos», «un racimo de plátanos»… */
export function goodsEs(good: Good, qty: number): string {
  if (good.clf === 'หวี') return `${qty === 1 ? 'Un racimo' : `${qty} racimos`} de plátanos`;
  if (qty === 1) return `${good.art === 'camisa' || good.art === 'naranja' || good.art === 'sandia' ? 'Una' : 'Un'} ${good.es}`;
  return `${qty} ${plural(good.es)}`;
}

/** La partícula de la vendedora: จ้ะ («cielo») cuando ya se ha presentado; si no, el ค่ะ de siempre. */
const vendorP = (k: Knowledge) => (k.said.has('จ้ะ') ? { th: 'จ้ะ', rom: 'jâ', es: ', cielo' } : { th: 'ค่ะ', rom: 'khâ', es: '' });

/**
 * La vendedora dice qué es y cuánto cuesta: «มะม่วงสองลูก ห้าสิบบาทจ้ะ». Solo nombra lo que ya se ha presentado:
 * sin la palabra de la fruta o del clasificador, se queda en el precio («ห้าสิบค่ะ»), y la imagen dice el resto.
 */
export function quoteLine(good: Good, qty: number, price: number, k: Knowledge): Line {
  const p = vendorP(k);
  const named = k.said.has(good.th);
  const counted = named && k.said.has(good.clf) && sayable(qty, k);
  const baht = k.said.has('บาท');
  const what = named ? `${good.th}${counted ? `${thaiNumber(qty)}${good.clf}` : ''} ` : '';
  const whatRom = named ? `${good.rom}${counted ? ` ${thaiNumberRom(qty)} ${CLF_ROM[good.clf] ?? ''}` : ''}, ` : '';
  return {
    th: `${what}${thaiNumber(price)}${baht ? 'บาท' : ''}${p.th}`,
    rom: `${whatRom}${thaiNumberRom(price)}${baht ? ' bàat' : ''} ${p.rom}`,
    es: `${goodsEs(good, qty)}: ${price} baht${p.es}.`,
  };
}

export function priceLine(price: number, k: Knowledge): Line {
  const p = vendorP(k);
  const baht = k.said.has('บาท');
  return { th: `${thaiNumber(price)}${baht ? 'บาท' : ''}${p.th}`, rom: `${thaiNumberRom(price)}${baht ? ' bàat' : ''} ${p.rom}`, es: `${price} baht${p.es}.` };
}

export const thanksLine = (k: Knowledge): Line => {
  const p = vendorP(k);
  return { th: `ขอบคุณ${p.th}`, rom: `khɔ̀ɔp-khun ${p.rom}`, es: `Gracias${p.es}.` };
};
export const sorryLine = (k: Knowledge): Line => {
  const p = vendorP(k);
  return { th: `ขอโทษ${p.th}`, rom: `khɔ̌ɔ-thôot ${p.rom}`, es: `¡Uy, perdona${p.es}!` };
};

/** Lo que dice quien aprende (con su partícula). */
export function askLine(g: Gender): Line {
  return { th: personalize('อันนี้เท่าไหร่{PQ}', g), rom: personalizeRom('an-níi thâo-rài {PQ}', g), es: '¿Cuánto cuesta esto?' };
}

export function haggleLine(g: Gender, caro: boolean): Line {
  return caro
    ? { th: personalize('แพงมาก ลดได้ไหม{PQ}', g), rom: personalizeRom('phɛɛng mâak, lót dâi mǎi {PQ}', g), es: '¡Qué caro! ¿Me lo rebajas?' }
    : { th: personalize('ลดได้ไหม{PQ}', g), rom: personalizeRom('lót dâi mǎi {PQ}', g), es: '¿Me lo rebajas?' };
}
