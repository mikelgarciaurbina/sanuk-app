// Revisor de tonos, iniciales, vocales y finales: lee la escritura thai sílaba a sílaba, guiándose por la
// transcripción de Sanuk, y comprueba que cada sílaba suena como dice `rom` (sobre todo el tono).
// Las palabras que no siguen las reglas de escritura están en LECTURAS_IRREGULARES (reglas.mts).
import { LECTURAS_IRREGULARES } from '../reglas.mts';

type Clase = 'M' | 'H' | 'L';
type Candidata = {
  end: number;
  override?: boolean;
  tones?: string[];
  c?: Clase;
  init?: string;
  single?: boolean;
  sonor?: boolean;
  tm?: string | null;
  vq?: string;
  short?: boolean;
  fin?: string | null;
  live?: boolean;
  implicitA?: boolean;
};

const MID = 'กจฎฏดตบปอ';
const HIGH = 'ขฃฉฐถผฝศษสห';
const CONS = 'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ';
const SONOR = 'งญณนมยรลวฬ';
const PRE = 'เแโใไ';
const UPV = 'ัิีึืุู็';
const TM = '่้๊๋';
const ATTACH = UPV + TM + 'าะำ';
const isCons = (c: string | undefined) => !!c && CONS.includes(c);
const attaches = (c: string | undefined) => !!c && ATTACH.includes(c);
const cls = (c: string): Clase => (MID.includes(c) ? 'M' : HIGH.includes(c) ? 'H' : 'L');
const INIT: Record<string, string> = {
  ก: 'g', ข: 'kh', ฃ: 'kh', ค: 'kh', ฅ: 'kh', ฆ: 'kh', ง: 'ng', จ: 'j', ฉ: 'ch', ช: 'ch', ซ: 's', ฌ: 'ch', ญ: 'y',
  ฎ: 'd', ฏ: 't', ฐ: 'th', ฑ: 'th', ฒ: 'th', ณ: 'n', ด: 'd', ต: 't', ถ: 'th', ท: 'th', ธ: 'th', น: 'n', บ: 'b', ป: 'p',
  ผ: 'ph', ฝ: 'f', พ: 'ph', ฟ: 'f', ภ: 'ph', ม: 'm', ย: 'y', ร: 'r', ล: 'l', ว: 'w', ศ: 's', ษ: 's', ส: 's', ห: 'h',
  ฬ: 'l', อ: '', ฮ: 'h',
};
const CLUSTERS: Record<string, string> = {
  กร: 'gr', กล: 'gl', กว: 'gw', ขร: 'khr', ขล: 'khl', ขว: 'khw', คร: 'khr', คล: 'khl', คว: 'khw', ปร: 'pr', ปล: 'pl',
  พร: 'phr', พล: 'phl', ผล: 'phl', ตร: 'tr', ทร: 's', จร: 'j', สร: 's', ศร: 's',
};
const FINAL = (c: string): string | null => {
  if (c === 'ง') return 'ng';
  if ('ญณนรลฬ'.includes(c)) return 'n';
  if (c === 'ม') return 'm';
  if (c === 'ย') return 'i';
  if (c === 'ว') return 'w';
  if ('กขคฆ'.includes(c)) return 'k';
  if ('บปพฟภ'.includes(c)) return 'p';
  if ('อหฮ'.includes(c)) return null;
  return 't';
};
const OVERRIDE_KEYS = Object.keys(LECTURAS_IRREGULARES).sort((a, b) => b.length - a.length);

function toneOf(c: Clase, tm: string | null | undefined, live: boolean | undefined, short: boolean | undefined) {
  if (tm === '่') return c === 'L' ? 'F' : 'L';
  if (tm === '้') return c === 'L' ? 'H' : 'F';
  if (tm === '๊') return 'H';
  if (tm === '๋') return 'R';
  if (live) return c === 'H' ? 'R' : 'M';
  if (c === 'L') return short ? 'H' : 'F';
  return 'L';
}

/** Sílabas posibles que empiezan en la posición i. */
function candidates(s: string, i: number): Candidata[] {
  const out: Candidata[] = [];
  for (const k of OVERRIDE_KEYS) if (s.startsWith(k, i)) out.push({ end: i + k.length, tones: LECTURAS_IRREGULARES[k].split(''), override: true });
  let p = i;
  let pre: string | null = null;
  if (PRE.includes(s[p])) {
    pre = s[p];
    p++;
  }
  if (s[p] === 'ฤ' && !pre) {
    out.push({ end: p + 1, c: 'L', single: false, init: 'r', vq: 'ʉ', live: false, short: true, fin: null, tm: null });
    return out;
  }
  if (!isCons(s[p])) return out;
  const inits: { q: number; c: Clase; init: string; single: boolean; sonor?: boolean }[] = [];
  if (s[p] === 'ห' && SONOR.includes(s[p + 1])) inits.push({ q: p + 2, c: 'H', init: INIT[s[p + 1]], single: false });
  if (s[p] === 'อ' && s[p + 1] === 'ย') inits.push({ q: p + 2, c: 'M', init: 'y', single: false });
  const pair = s.slice(p, p + 2);
  if (CLUSTERS[pair]) inits.push({ q: p + 2, c: cls(s[p]), init: CLUSTERS[pair], single: false });
  inits.push({ q: p + 1, c: cls(s[p]), init: INIT[s[p]], single: true, sonor: SONOR.includes(s[p]) });

  for (const ini of inits) {
    const q = ini.q;
    let uv: string | null = null;
    let q1 = q;
    if (UPV.includes(s[q])) {
      uv = s[q];
      q1 = q + 1;
    }
    let tm: string | null = null;
    let q2 = q1;
    if (TM.includes(s[q1])) {
      tm = s[q1];
      q2 = q1 + 1;
    }
    const base = { ...ini, tm };
    // sílaba con final opcional ('opt'), obligatoria ('req') o sin final ('none')
    const withFinal = (pos: number, vq: string, short: boolean, finalMode: 'opt' | 'req' | 'none') => {
      if (finalMode !== 'req') out.push({ ...base, end: pos, vq, short, fin: null, live: !short });
      if (finalMode === 'none') return;
      const f = s[pos];
      const fs = isCons(f) ? FINAL(f) : null;
      if (fs && !attaches(s[pos + 1])) out.push({ ...base, end: pos + 1, vq, short, fin: fs, live: !['k', 't', 'p'].includes(fs) });
    };
    const glide = (pos: number, vq: string, fin: string) => out.push({ ...base, end: pos, vq, short: true, fin, live: true });
    if (!pre) {
      if (uv === 'ั') {
        if (s[q2] === 'ว') {
          if (s[q2 + 1] === 'ะ') out.push({ ...base, end: q2 + 2, vq: 'ua', short: true, fin: null, live: false });
          else withFinal(q2 + 1, 'ua', false, 'opt');
        } else withFinal(q2, 'a', true, 'req');
      } else if (uv === 'ิ') withFinal(q2, 'i', true, 'opt');
      else if (uv === 'ี') withFinal(q2, 'i', false, 'opt');
      else if (uv === 'ึ') withFinal(q2, 'ʉ', true, 'opt');
      else if (uv === 'ื') {
        if (s[q2] === 'อ') withFinal(q2 + 1, 'ʉ', false, 'opt');
        else withFinal(q2, 'ʉ', false, 'req');
      } else if (uv === 'ุ') withFinal(q2, 'u', true, 'opt');
      else if (uv === 'ู') withFinal(q2, 'u', false, 'opt');
      else if (uv === null) {
        if (s[q2] === 'า') withFinal(q2 + 1, 'a', false, 'opt');
        else if (s[q2] === 'ะ') out.push({ ...base, end: q2 + 1, vq: 'a', short: true, fin: null, live: false });
        else if (s[q2] === 'ำ') glide(q2 + 1, 'a', 'm');
        else {
          if (s[q2] === 'อ') withFinal(q2 + 1, 'ɔ', false, 'opt');
          if (s[q2] === 'ว' && isCons(s[q2 + 1])) withFinal(q2 + 1, 'ua', false, 'req');
          // vocal implícita o (sílaba cerrada)
          if (isCons(s[q2]) && s[q2] !== 'อ') {
            if (s[q2] === 'ร' && !attaches(s[q2 + 1])) out.push({ ...base, end: q2 + 1, vq: 'ɔ', short: false, fin: 'n', live: true });
            const fs = FINAL(s[q2]);
            if (fs && !attaches(s[q2 + 1])) out.push({ ...base, end: q2 + 1, vq: 'o', short: true, fin: fs, live: !['k', 't', 'p'].includes(fs) });
          }
          // vocal implícita a (sílaba abierta, antes de otra sílaba)
          if (!tm && (isCons(s[q2]) || PRE.includes(s[q2]))) out.push({ ...base, end: q2, vq: 'a', short: true, fin: null, live: false, implicitA: true });
        }
      }
    } else if (pre === 'เ') {
      if (uv === '็') withFinal(q2, 'e', true, 'req');
      else if (uv === 'ี' && s[q2] === 'ย') {
        if (s[q2 + 1] === 'ะ') out.push({ ...base, end: q2 + 2, vq: 'ia', short: true, fin: null, live: false });
        else withFinal(q2 + 1, 'ia', false, 'opt');
      } else if (uv === 'ื' && s[q2] === 'อ') {
        if (s[q2 + 1] === 'ะ') out.push({ ...base, end: q2 + 2, vq: 'ʉa', short: true, fin: null, live: false });
        else withFinal(q2 + 1, 'ʉa', false, 'opt');
      } else if (uv === 'ิ') withFinal(q2, 'ə', false, 'req');
      else if (uv === null) {
        if (s[q2] === 'า') {
          if (s[q2 + 1] === 'ะ') out.push({ ...base, end: q2 + 2, vq: 'ɔ', short: true, fin: null, live: false });
          else glide(q2 + 1, 'a', 'w');
        } else if (s[q2] === 'อ') {
          if (s[q2 + 1] === 'ะ') out.push({ ...base, end: q2 + 2, vq: 'ə', short: true, fin: null, live: false });
          else withFinal(q2 + 1, 'ə', false, 'opt');
        } else if (s[q2] === 'ย') glide(q2 + 1, 'ə', 'i');
        else if (s[q2] === 'ะ') out.push({ ...base, end: q2 + 1, vq: 'e', short: true, fin: null, live: false });
        else withFinal(q2, 'e', false, 'opt');
      }
    } else if (pre === 'แ') {
      if (uv === '็') withFinal(q2, 'ɛ', true, 'req');
      else if (uv === null) {
        if (s[q2] === 'ะ') out.push({ ...base, end: q2 + 1, vq: 'ɛ', short: true, fin: null, live: false });
        else withFinal(q2, 'ɛ', false, 'opt');
      }
    } else if (pre === 'โ') {
      if (uv === null) {
        if (s[q2] === 'ะ') out.push({ ...base, end: q2 + 1, vq: 'o', short: true, fin: null, live: false });
        else withFinal(q2, 'o', false, 'opt');
      }
    } else if (pre === 'ใ' || pre === 'ไ') {
      if (uv === null) glide(q2, 'a', 'i');
    }
  }
  return out;
}

const VOWEL_LETTERS = 'aeiouɛɔəʉ';
const sinTildes = (syl: string) =>
  syl
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** null si la sílaba transcrita encaja con la candidata; si no, qué parte falla. */
function checkRomSyl(cand: Candidata, romSyl: string): string | null {
  const b = sinTildes(romSyl);
  const init = cand.init ?? '';
  if (init === '') {
    if (!VOWEL_LETTERS.includes(b[0])) return 'inicial';
  } else {
    if (!b.startsWith(init)) return 'inicial';
    if (!VOWEL_LETTERS.includes(b[init.length])) return 'inicial';
  }
  let rest = b.slice(init.length);
  const f = cand.fin;
  if (f === 'ng' || f === 'n' || f === 'm' || f === 'k' || f === 't' || f === 'p') {
    if (!rest.endsWith(f)) return 'final';
    if (f === 'n' && rest.endsWith('ng')) return 'final';
    rest = rest.slice(0, -f.length);
  } else if (f === 'i') {
    if (!/[iy]$/.test(rest)) return 'final';
    rest = rest.slice(0, -1);
  } else if (f === 'w') {
    if (!/[ou]$/.test(rest)) return 'final';
    rest = rest.slice(0, -1);
  } else if (/(ng|[ktpmn])$/.test(rest)) return 'final';
  // la vocal, sin contar la longitud (las largas se escriben dobles)
  const norm = (v: string) => v.replace(/(.)\1+/g, '$1');
  const vq = norm(rest);
  const want = cand.vq ?? '';
  if (vq !== want && norm(vq) !== norm(want)) return `vocal(${vq}≠${want})`;
  return null;
}

const toneOfRom = (s: string) => {
  const d = s.normalize('NFD');
  if (d.includes('̀')) return 'L';
  if (d.includes('̂')) return 'F';
  if (d.includes('́')) return 'H';
  if (d.includes('̌')) return 'R';
  return 'M';
};

/** Sílabas de una transcripción: separadas por guion, espacio o punto medio, sin puntuación. */
export function silabas(rom: string): string[] {
  return rom
    .split(/[-\s·]+/)
    .map((x) => x.replace(/[!?¡¿.,;:«»"()…—]/g, ''))
    .filter(Boolean);
}

/** Quita las consonantes mudas (con การันต์). */
function karan(s: string) {
  return s.replace(/ทร์/g, '').replace(/ตร์/g, '').replace(/[ก-ฮ]์/g, '');
}

/**
 * Comprueba que `th` (puede llevar espacios y puntuación) se lee con las sílabas de `rom`.
 * Devuelve null si cuadra, o qué sílaba falla y qué lecturas había.
 */
export function comprobarTonos(th: string, rom: string): string | null {
  const syl = silabas(rom);
  const target = syl.map(toneOfRom);
  let s = th.replace(/[^฀-๿]+/g, '|');
  // las lecturas irregulares con การันต์ se protegen antes de quitar las letras mudas
  const protect: string[] = [];
  for (const k of OVERRIDE_KEYS) {
    if (k.includes('์')) {
      while (s.includes(k)) {
        const tag = String.fromCharCode(0xe000 + protect.length);
        protect.push(k);
        s = s.replace(k, tag);
      }
    }
  }
  s = karan(s);
  protect.forEach((k, idx) => {
    s = s.replace(String.fromCharCode(0xe000 + idx), k);
  });
  let best: { k: number; i: number; lead: Clase | null } = { k: -1, i: 0, lead: null };
  const memo = new Set<string>();
  const path: string[] = [];
  function dfs(i: number, k: number, lead: Clase | null): boolean {
    if (k > best.k) best = { k, i, lead };
    if (i >= s.length) return k === target.length;
    if (s[i] === '|') return dfs(i + 1, k, null);
    const key = `${i}:${k}:${lead}:${path.slice(-3).join('')}`;
    if (memo.has(key)) return false;
    if (s[i] === 'ๆ') {
      for (let m = 1; m <= 3 && m <= path.length; m++) {
        const rep = path.slice(-m);
        if (rep.every((t, j) => target[k + j] === t)) {
          path.push(...rep);
          if (dfs(i + 1, k + m, null)) return true;
          path.splice(path.length - m, m);
        }
      }
      memo.add(key);
      return false;
    }
    for (const c of candidates(s, i)) {
      if (c.override) {
        const tones = c.tones ?? [];
        const n = tones.length;
        if (tones.every((t, j) => target[k + j] === t)) {
          path.push(...tones);
          if (dfs(c.end, k + n, null)) return true;
          path.splice(path.length - n, n);
        }
        continue;
      }
      if (k >= target.length) continue;
      // อักษรนำ: tras una sílaba implícita «a» de clase media o alta, la sonorante toma esa clase
      const classes: Clase[] = lead && c.single && c.sonor ? [lead] : [c.c as Clase];
      const tones = classes.map((cc) => toneOf(cc, c.tm, c.live, c.short));
      if (!tones.includes(target[k])) continue;
      if (checkRomSyl(c, syl[k])) continue;
      const nextLead = c.implicitA && c.single && c.c !== 'L' ? (c.c as Clase) : null;
      path.push(target[k]);
      if (dfs(c.end, k + 1, nextLead)) return true;
      path.pop();
    }
    memo.add(key);
    return false;
  }
  if (dfs(0, 0, null)) return null;
  // diagnóstico: qué sílaba falla y cómo se leería según la escritura (con la clase que le da una อักษรนำ)
  const k = best.k;
  const near = s.slice(best.i, best.i + 6);
  const cands = candidates(s, best.i)
    .filter((c) => !c.override)
    .map((c) => {
      const fallo = checkRomSyl(c, syl[k] ?? '');
      const clase = best.lead && c.single && c.sonor ? best.lead : (c.c as Clase);
      return `${s.slice(best.i, c.end)}=${toneOf(clase, c.tm, c.live, c.short)}${c.fin ? '/' + c.fin : ''}${fallo ? '(' + fallo + ')' : ''}`;
    });
  return `sílaba ${k + 1} «${syl[k] ?? '∅'}» (tono ${target[k] ?? '-'}) en «${near}» · lecturas posibles: ${cands.join(' ')}`;
}
