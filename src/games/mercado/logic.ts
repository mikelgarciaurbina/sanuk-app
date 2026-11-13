// Lógica de «Paga justo»: qué se vende, a qué precio y cómo se dice. Los precios se dicen SOLO con números thai
// que quien aprende ya conoce: con el 1–10, precios de 1 a 10; con ยี่สิบ y เอ็ด, hasta 99; con ร้อย, centenas;
// con พัน, miles (y entra el billete de 1.000). Nunca se rellena con números que aún no se han enseñado.
import { MARKET_ITEMS } from '@/content/drills';
import { knownForms } from '@/content';
import type { Word } from '@/content/types';
import { pick, shuffle } from '@/lib/random';
import { personalize, personalizeRom, thaiNumberRom, type Gender } from '@/lib/thai';

export type GoodArt = 'mango' | 'platano' | 'coco' | 'naranja' | 'sandia' | 'cafe' | 'khaosoi' | 'huevo' | 'guindilla' | 'lima' | 'dulce' | 'camisa' | 'paraguas' | 'bolso' | 'otro';

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

/** Lo que cuesta unas monedas: con ello hay precios de 1 a 10 baht para quien solo sabe contar hasta diez. */
const CHEAP: Good[] = [
  { th: 'พริก', rom: 'phrík', es: 'guindilla', emoji: '🌶️', clf: 'เม็ด', unit: [1, 1], art: 'guindilla', qty: [1, 10] },
  { th: 'มะนาว', rom: 'má-naao', es: 'lima', emoji: '🍈', clf: 'ลูก', unit: [1, 5], art: 'lima', qty: [1, 5] },
  { th: 'ขนม', rom: 'khà-nǒm', es: 'dulce', emoji: '🍡', clf: 'ชิ้น', unit: [5, 10], art: 'dulce', qty: [1, 3] },
];

/** Lo caro del mercado (para los precios altos de la feria): ropa y artesanía del norte. */
const CRAFTS: Good[] = [
  { th: 'เสื้อ', rom: 'sʉ̂a', es: 'camisa', emoji: '👕', clf: 'ตัว', unit: [150, 390], art: 'camisa', qty: [1, 3] },
  { th: 'ร่ม', rom: 'rôm', es: 'paraguas', emoji: '☂️', clf: 'คัน', unit: [250, 1200], art: 'paraguas', qty: [1, 1] },
  { th: 'กระเป๋า', rom: 'grà-pǎo', es: 'bolso', emoji: '👜', clf: 'ใบ', unit: [300, 1500], art: 'bolso', qty: [1, 1] },
];

export const GOODS: Good[] = [...MARKET_ITEMS.map((m) => ({ ...m, ...(ART[m.th] ?? { art: 'otro' as const, qty: [1, 3] as [number, number] }) })), ...CHEAP, ...CRAFTS];

const CLF_ROM: Record<string, string> = { ลูก: 'lûuk', หวี: 'wǐi', แก้ว: 'gɛ̂ɛo', ชาม: 'chaam', ฟอง: 'fɔɔng', ตัว: 'tua', คัน: 'khan', ใบ: 'bai', เม็ด: 'mét', ชิ้น: 'chín' };

// ——— Números ———

const DIGIT = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const UNIT = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
const NUMBER_WORDS = new Set([...DIGIT, ...UNIT.filter(Boolean), 'ยี่สิบ', 'เอ็ด']);

/** Transcripción de cada palabra de número, sacada de `thaiNumberRom` para que nunca difieran. */
const NUM_ROM: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  DIGIT.forEach((d, i) => (out[d] = thaiNumberRom(i)));
  const one = thaiNumberRom(1);
  const ten = thaiNumberRom(10);
  out['สิบ'] = ten;
  out['ยี่สิบ'] = thaiNumberRom(20);
  out['เอ็ด'] = thaiNumberRom(11).slice(ten.length + 1);
  for (let i = 2; i < UNIT.length; i++) out[UNIT[i]] = thaiNumberRom(10 ** i).slice(one.length + 1);
  return out;
})();

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

/** ¿Se le puede quitar el «uno» de delante? En el mercado se dice ร้อยห้าสิบ (150) y พันสองร้อย (1.200). */
const dropsOne = (n: number) => (n >= 100 && n < 200) || (n >= 1000 && n < 2000);

/** Las palabras de un número tal como se dicen: `casual` = como en el mercado, sin el หนึ่ง inicial. */
export const spokenParts = (n: number, casual = false) => (casual && dropsOne(n) ? numberParts(n).slice(1) : numberParts(n));

/** Un número dicho en thai, con su transcripción. */
export function spoken(n: number, casual = false): { th: string; rom: string } {
  const parts = spokenParts(n, casual);
  return { th: parts.join(''), rom: parts.map((p) => NUM_ROM[p] ?? '').join('-') };
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

/** pagar: oyes el precio y pagas · cambio: ¿te ha devuelto bien? · regateo: pides rebaja · decir: el número lo dices tú. */
export type Kind = 'pagar' | 'cambio' | 'regateo' | 'decir';
/** Cómo se ve el precio en la etiqueta: cifras, cifras thai u oculto (solo se oye). */
export type Show = 'num' | 'thai' | 'oculto';
/** Una ficha con una palabra de número, para montar la cantidad que dices tú. */
export type NumTile = { id: number; th: string; rom: string };

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
  /** cifras thai con su equivalente escrito debajo (las primeras veces que salen) */
  gloss?: boolean;
  /** la vendedora habla como en el mercado: ร้อยห้าสิบ en vez de หนึ่งร้อยห้าสิบ */
  casual?: boolean;
  /** decir: qué cantidad dices tú (el precio, o el cambio que te toca) y las fichas para montarla */
  ask?: 'precio' | 'cambio';
  tiles?: NumTile[];
};

export type Knowledge = {
  /** números thai ya presentados: los únicos con los que se dice un precio */
  known: Set<string>;
  /** hasta dónde se sabe contar: 10 (del uno al diez) · 99 (ya se juntan decenas y unidades) · 999 · 9.999 */
  top: number;
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
  const known = new Set([...said].filter((t) => NUMBER_WORDS.has(t)));
  const fresh = new Set(focus.map((w) => w.th).filter((t) => NUMBER_WORDS.has(t)));
  // juntar decenas y unidades (สิบเอ็ด, ยี่สิบห้า…) se enseña con ยี่สิบ y เอ็ด; antes, cada precio es una sola palabra
  const joins = ['ยี่สิบ', 'เอ็ด', 'ร้อย', 'พัน'].some((t) => known.has(t));
  return {
    known,
    top: known.has('พัน') ? 9999 : known.has('ร้อย') ? 999 : joins ? 99 : 10,
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

/** ¿Se dice este número con lo que ya se sabe? */
export const sayable = (n: number, k: Knowledge) => n >= 1 && n <= k.top && numberParts(n).every((p) => k.known.has(p));

/** Precios con aspecto de mercado (los baratos, de uno en uno; los demás, de cinco en cinco o más redondos). */
function pricesIn(lo: number, hi: number, k: Knowledge): number[] {
  const out: number[] = [];
  for (let n = Math.max(1, lo); n <= hi; n++) {
    if (n > 30 && n % 5 !== 0) continue;
    if (n > 300 && n % 10 !== 0) continue;
    if (n > 1000 && n % 50 !== 0) continue;
    if (sayable(n, k)) out.push(n);
  }
  return out;
}

/** Elige uno, con más peso para los que usan los números nuevos de la lección. */
function choosePrice(list: number[], k: Knowledge): number {
  if (!k.fresh.size) return pick(list);
  // la lección de «mil»: la mitad de los precios pasan de mil (si no, casi nunca saldría)
  const thousands = k.fresh.has('พัน') ? list.filter((n) => n >= 1000) : [];
  if (thousands.length && Math.random() < 0.5) return pick(thousands);
  const hot = list.filter((n) => numberParts(n).some((p) => k.fresh.has(p)));
  return hot.length && Math.random() < 0.8 ? pick(hot) : pick(list);
}

/** La palabra de número que se practica en este precio (la nueva de la lección si la hay). */
export function numWordOf(n: number, k: Knowledge): Word | undefined {
  const parts = numberParts(n);
  return k.focus.find((w) => parts.includes(w.th)) ?? shuffle(k.words.filter((w) => parts.includes(w.th)))[0];
}

type Band = { lo: number; hi: number; crafts: boolean };
type Order = { good: Good; qty: number; price: number; unsaid?: boolean };

function order(band: Band, k: Knowledge, avoid?: string): Order | null {
  const lo = Math.max(1, band.lo);
  const hi = Math.min(band.hi, k.top);
  if (hi < lo) return null;
  const food = GOODS.filter((g) => !CRAFTS.includes(g) && g.th !== avoid);
  const crafts = CRAFTS.filter((g) => g.th !== avoid);
  // en lo caro, casi siempre artesanía (paraguas, bolsos, camisas)
  const groups = !band.crafts ? [food] : Math.random() < 0.65 ? [crafts, food] : [[...food, ...crafts]];
  for (const goods of groups) {
    // primero se elige el precio (así salen todos los números por igual, no solo los que caben en más cestos)
    // y luego qué se vende a ese precio
    const byPrice = new Map<number, { good: Good; qty: number; said: boolean }[]>();
    for (const good of goods) {
      for (let qty = good.qty[0]; qty <= good.qty[1]; qty++) {
        const said = sayable(qty, k);
        for (const price of pricesIn(Math.max(lo, good.unit[0] * qty), Math.min(hi, good.unit[1] * qty), k)) byPrice.set(price, [...(byPrice.get(price) ?? []), { good, qty, said }]);
      }
    }
    if (!byPrice.size) continue;
    const price = choosePrice([...byPrice.keys()], k);
    const all = byPrice.get(price)!;
    const good = pick([...new Set(all.map((o) => o.good))]);
    const qtys = all.filter((o) => o.good === good);
    // mejor una cantidad que la vendedora sepa decirte («สองลูก»); si no hay, la cantidad se ve en el cesto
    const best = qtys.filter((o) => o.said);
    return { good, qty: pick(best.length ? best : qtys).qty, price };
  }
  return null;
}

/**
 * Un pedido en la franja de precios; si no cabe ninguno, se ensancha la franja (y se permite repetir producto),
 * pero el precio siempre se dice con números conocidos. Solo si no se sabe NINGÚN número queda un precio del
 * 1 al 10 que se enseña escrito (`unsaid`).
 */
function anyOrder(band: Band, k: Knowledge, avoid?: string): Order {
  const wide: Band = { lo: 1, hi: k.top, crafts: band.crafts };
  const o = order(band, k, avoid) ?? order(band, k) ?? order(wide, k, avoid) ?? order(wide, k);
  if (o) return o;
  const all: Knowledge = { ...k, known: new Set(DIGIT.concat('สิบ')), top: 10 };
  return { ...(order({ lo: 1, hi: 10, crafts: false }, all, avoid) ?? { good: CHEAP[0], qty: 1, price: 1 }), unsaid: true };
}

const BANDS: Record<number, Band> = {
  1: { lo: 1, hi: 60, crafts: false },
  2: { lo: 20, hi: 200, crafts: false },
  3: { lo: 60, hi: 2500, crafts: true },
};

/** La franja de un nivel, recortada a lo que se sabe contar: si aún no se llega tan alto, el nivel sube por cómo
 *  se ve el precio (cifras thai, de oído), no por un precio que no se sabría decir. */
function bandFor(level: number, k: Knowledge): Band {
  const b = BANDS[level] ?? BANDS[2];
  const hi = Math.min(b.hi, k.top);
  return { lo: Math.min(b.lo, Math.max(1, Math.round(hi * 0.4))), hi, crafts: b.crafts && hi > 150 };
}

/** Con qué se paga: un billete grande, o el precio redondeado con uno a tres billetes. */
function payOptions(price: number): number[] {
  const opts = new Set([20, 50, 100, 500, 1000].filter((n) => n > price));
  if (price < 10) opts.add(10);
  for (const step of [10, 20, 50, 100]) {
    const up = Math.ceil((price + 1) / step) * step;
    if (breakdown(up).every((v) => v >= 20) && breakdown(up).length <= 3) opts.add(up);
  }
  return [...opts].sort((a, b) => a - b);
}

/** Fichas para decir una cantidad: sus palabras y otras conocidas que despistan (como mucho ocho). */
export function tilesFor(n: number, k: Knowledge): NumTile[] {
  const parts = numberParts(n);
  // (ni el cero ni หมื่น/แสน: aquí no se llega tan alto)
  const others = shuffle([...k.known].filter((t) => t !== DIGIT[0] && t !== UNIT[4] && t !== UNIT[5] && !parts.includes(t)));
  const total = Math.min(8, Math.max(4, parts.length + 3));
  const list = shuffle([...parts, ...others.slice(0, Math.max(0, total - parts.length))]);
  return list.map((th, i) => ({ id: i + 1, th, rom: NUM_ROM[th] ?? '' }));
}

/** Las formas correctas de decir una cantidad (con y sin el «uno» de delante cuando se puede quitar). */
export function answersOf(n: number): string[] {
  const full = numberParts(n).join('');
  return dropsOne(n) ? [full, spokenParts(n, true).join('')] : [full];
}

/** La cantidad que dices tú en una ronda «decir». */
export const sayTarget = (r: Round) => (r.ask === 'cambio' && r.paid ? r.paid - r.price : r.price);

/** Una ronda del tipo pedido, con el nivel de dificultad dado. */
export function makeRound(kind: Kind, level: number, show: Show, k: Knowledge, band: Band = bandFor(level, k), avoid?: string): Round {
  const casual = level >= 3;
  const pay = (o: Order): Round => ({ kind: 'pagar', ...o, show: o.unsaid ? 'num' : show, level, casual, numWord: numWordOf(o.price, k) });

  if (kind === 'regateo') {
    const o = anyOrder({ ...band, lo: Math.max(band.lo, Math.min(40, Math.round(band.hi * 0.6))) }, k, avoid);
    const steps = o.price >= 1000 ? [100, 200] : o.price >= 300 ? [50, 100] : o.price >= 100 ? [10, 20, 30] : o.price >= 40 ? [5, 10] : o.price >= 12 ? [2, 5] : [1, 2, 3];
    const deals = shuffle(steps)
      .map((d) => o.price - d)
      .filter((d) => d > 0 && sayable(d, k));
    if (deals.length && !o.unsaid) return { kind, ...o, deal: deals[0], show, level, casual, numWord: numWordOf(deals[0], k) };
    return pay(o);
  }

  if (kind === 'cambio') {
    const o = anyOrder({ ...band, hi: Math.min(band.hi, 950) }, k, avoid);
    const opts = payOptions(o.price);
    const maxChange = level >= 3 ? 600 : level === 2 ? 120 : 60;
    const fits = opts.filter((n) => n - o.price <= maxChange);
    const paid = fits.length ? pick(fits) : opts[0];
    const right = paid - o.price;
    // 40 % bien · 40 % te da de menos · 20 % te da de más
    const r = Math.random();
    let change = right;
    const short = [1, 2, 5, 10, 20].filter((d) => d < right && d <= Math.max(5, right / 3));
    if (r >= 0.4 && r < 0.8 && short.length) change = right - pick(short);
    else if (r >= 0.4) change = right + pick([1, 2, 5, 10, 20].filter((d) => d <= Math.max(5, right / 2)));
    return { kind, ...o, paid, change, show: o.unsaid ? 'num' : show, level, casual, numWord: numWordOf(o.price, k) };
  }

  if (kind === 'decir') {
    // en lo difícil, a veces la cuenta la haces tú: «¿cuánto cambio te toca?»
    if (level >= 3 && Math.random() < 0.6) {
      const o = anyOrder({ ...band, hi: Math.min(band.hi, 950) }, k, avoid);
      const opts = payOptions(o.price).filter((p) => sayable(p - o.price, k));
      if (opts.length && !o.unsaid) {
        const paid = pick(opts.slice(0, 3));
        return { kind, ask: 'cambio', ...o, paid, show, level, casual, numWord: numWordOf(paid - o.price, k), tiles: tilesFor(paid - o.price, k) };
      }
    }
    const o = anyOrder(band, k, avoid);
    if (o.unsaid) return pay(o);
    return { kind, ask: 'precio', ...o, show, level, casual, numWord: numWordOf(o.price, k), tiles: tilesFor(o.price, k) };
  }

  return pay(anyOrder(band, k, avoid));
}

/**
 * Plan de la partida.
 * Feria: tres niveles (cifras → cifras thai → solo de oído) y, en cada tanda de cuatro clientes, una compra, una
 * ronda en la que el precio lo dices tú, un regateo y un cambio. Las primeras cifras thai llevan su equivalente.
 * Lección: ver y oír → solo de oído → decirlo tú, siempre con los números que enseña la lección.
 */
export function makePlan(mode: 'leccion' | 'feria', total: number, k: Knowledge, opts: { reads?: boolean } = {}): Round[] {
  const out: Round[] = [];
  let last: string | undefined;
  const push = (r: Round) => {
    last = r.good.th;
    out.push(r);
  };
  if (mode === 'leccion') {
    // en la lección los precios se quedan en lo que se acaba de aprender: hasta cien y poco más; con พัน, miles
    const cap = k.fresh.has('พัน') ? 2500 : 120;
    const hi = Math.min(cap, k.top);
    const band: Band = { lo: 1, hi, crafts: hi > 300 };
    for (let i = 0; i < total; i++) {
      let kind: Kind = 'pagar';
      if (total >= 3 && i === total - 1) kind = 'decir';
      else if (i === 1 && k.teachesChange) kind = 'cambio';
      else if (i === 1 && k.focus.some((w) => w.th === 'ลด')) kind = 'regateo';
      push(makeRound(kind, 1, i === 0 || kind === 'decir' ? 'num' : 'oculto', k, band, last));
    }
    return out;
  }
  // cada tanda de cuatro clientes trae, en orden distinto, una compra, un «dilo tú», un regateo y un cambio
  const kinds: Kind[] = [];
  while (kinds.length < total) {
    const block = shuffle<Kind>(['pagar', 'decir', k.canHaggle ? 'regateo' : 'pagar', 'cambio']);
    kinds.push(...(kinds.length === 0 ? ['pagar' as Kind, ...block.filter((_, j) => j !== block.indexOf('pagar'))] : block));
  }
  let glossed = opts.reads ? 1 : 2;
  for (let i = 0; i < total; i++) {
    const f = total > 1 ? i / (total - 1) : 0;
    const level = f < 0.25 ? 1 : f < 0.6 ? 2 : 3;
    const show: Show = level === 1 ? 'num' : level === 2 ? 'thai' : 'oculto';
    const band = bandFor(level, k);
    let r = makeRound(kinds[i], level, show, k, band, last);
    for (let t = 0; t < 3 && out.length && r.price === out[out.length - 1].price; t++) r = makeRound(kinds[i], level, show, k, band, last);
    if (r.show === 'thai' && glossed > 0) {
      glossed -= 1;
      r = { ...r, gloss: true };
    }
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

const FEMININE: GoodArt[] = ['camisa', 'naranja', 'sandia', 'guindilla', 'lima'];

/** «Dos mangos», «un racimo de plátanos»… */
export function goodsEs(good: Good, qty: number): string {
  if (good.clf === 'หวี') return `${qty === 1 ? 'Un racimo' : `${qty} racimos`} de plátanos`;
  if (qty === 1) return `${FEMININE.includes(good.art) ? 'Una' : 'Un'} ${good.es}`;
  return `${qty} ${plural(good.es)}`;
}

/** La partícula de la vendedora: จ้ะ («cielo») cuando ya se ha presentado; si no, el ค่ะ de siempre. */
const vendorP = (k: Knowledge) => (k.said.has('จ้ะ') ? { th: 'จ้ะ', rom: 'jâ', es: ', cielo' } : { th: 'ค่ะ', rom: 'khâ', es: '' });

/**
 * La vendedora dice qué es y cuánto cuesta: «มะม่วงสองลูก ห้าสิบบาทจ้ะ». Solo nombra lo que ya se ha presentado:
 * sin la palabra de la fruta o del clasificador, se queda en el precio («ห้าสิบค่ะ»), y la imagen dice el resto.
 * `casual`: como se habla en el mercado (ร้อยห้าสิบ).
 */
export function quoteLine(good: Good, qty: number, price: number, k: Knowledge, casual = false): Line {
  const p = vendorP(k);
  const named = k.said.has(good.th);
  const counted = named && k.said.has(good.clf) && sayable(qty, k);
  const baht = k.said.has('บาท');
  const n = spoken(price, casual);
  const q = spoken(qty);
  const what = named ? `${good.th}${counted ? `${q.th}${good.clf}` : ''} ` : '';
  const whatRom = named ? `${good.rom}${counted ? ` ${q.rom} ${CLF_ROM[good.clf] ?? ''}` : ''}, ` : '';
  return {
    th: `${what}${n.th}${baht ? 'บาท' : ''}${p.th}`,
    rom: `${whatRom}${n.rom}${baht ? ' bàat' : ''} ${p.rom}`,
    es: `${goodsEs(good, qty)}: ${price} baht${p.es}.`,
  };
}

export function priceLine(price: number, k: Knowledge, casual = false): Line {
  const p = vendorP(k);
  const baht = k.said.has('บาท');
  const n = spoken(price, casual);
  return { th: `${n.th}${baht ? 'บาท' : ''}${p.th}`, rom: `${n.rom}${baht ? ' bàat' : ''} ${p.rom}`, es: `${price} baht${p.es}.` };
}

/** La vendedora pregunta cuánto es («เท่าไหร่คะ»); si aún no se ha presentado la palabra, solo te mira esperando. */
export function howMuchLine(k: Knowledge): Line | null {
  if (!k.said.has('เท่าไหร่')) return null;
  const jaa = k.said.has('จ๊ะ');
  return { th: `เท่าไหร่${jaa ? 'จ๊ะ' : 'คะ'}`, rom: `thâo-rài ${jaa ? 'já' : 'khá'}`, es: '¿Cuánto es?' };
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

/** La cantidad dicha por quien aprende: «ห้าสิบบาทครับ». `parts` son las palabras que ha puesto (por si quita el «uno»). */
export function amountLine(n: number, g: Gender, k: Knowledge, parts: string[] = numberParts(n)): Line {
  const baht = k.said.has('บาท');
  return {
    th: personalize(`${parts.join('')}${baht ? 'บาท' : ''}{P}`, g),
    rom: personalizeRom(`${parts.map((p) => NUM_ROM[p] ?? '').join('-')}${baht ? ' bàat' : ''} {P}`, g),
    es: `${n} baht.`,
  };
}
