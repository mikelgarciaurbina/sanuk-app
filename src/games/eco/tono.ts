// Eco · el oído de Noi: saca la melodía (tono fundamental) de la voz grabada y la compara, sílaba a sílaba,
// con el tono que tocaba. Todo son funciones puras, sin React ni módulos nativos, para poder probarlas con
// señales sintéticas (ver el informe del juego): detector tipo YIN (70–500 Hz), limpieza de la curva
// (puerta de volumen, saltos de octava, mediana), reparto en sílabas y nota de cada sílaba.
//
// La nota es indulgente a propósito. Lo que se mide bien con un micro de móvil es la DIRECCIÓN de la voz
// (sube, cae, se queda plana) y, cuando hay con qué comparar, la ALTURA relativa (más aguda o más grave que
// la sílaba de al lado o que la voz habitual de quien habla). Nunca se compara con una voz ajena.
import type { ToneId } from '@/brand/tokens';

/** Una medida de la voz: instante (s), frecuencia (Hz; 0 = sin tono claro), confianza 0–1 y volumen (RMS 0–1). */
export type Frame = { t: number; f0: number; conf: number; rms: number };

export const F_MIN = 70;
export const F_MAX = 500;

/** Frecuencia de trabajo (Hz): la voz se baja a ~8 kHz antes de buscar el tono; sobra para 70–500 Hz. */
const WORK_HZ = 8000;
const WIN_S = 0.04;
const HOP_S = 0.0125;
/** Umbral de YIN: primer valle de la diferencia normalizada por debajo de esto. */
const YIN_TH = 0.15;

let dn = new Float32Array(256);

/** Tono de un trozo corto de señal (≥ 2 periodos del tono más grave que se quiera oír). YIN con interpolación parabólica. */
export function detectPitch(x: Float32Array, fs: number): { f0: number; conf: number; rms: number } {
  const n = x.length;
  let e = 0;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= Math.max(1, n);
  for (let i = 0; i < n; i++) e += (x[i] - mean) * (x[i] - mean);
  const rms = Math.sqrt(e / Math.max(1, n));
  const tauMin = Math.max(2, Math.floor(fs / F_MAX));
  const tauMax = Math.min(Math.ceil(fs / F_MIN), Math.floor(n / 2));
  if (rms < 1e-5 || tauMax <= tauMin + 2) return { f0: 0, conf: 0, rms };
  const w = n - tauMax;
  if (dn.length < tauMax + 2) dn = new Float32Array(tauMax + 2);
  dn[0] = 1;
  let run = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    let d = 0;
    for (let j = 0; j < w; j++) {
      const v = x[j] - x[j + tau];
      d += v * v;
    }
    run += d;
    dn[tau] = run > 0 ? (d * tau) / run : 1;
  }
  // primer valle bajo el umbral; si no lo hay, el primer valle casi tan hondo como el más hondo
  let tau = -1;
  for (let k = tauMin; k < tauMax; k++) {
    if (dn[k] < YIN_TH) {
      while (k + 1 < tauMax && dn[k + 1] < dn[k]) k++;
      tau = k;
      break;
    }
  }
  if (tau < 0) {
    let best = tauMin;
    for (let k = tauMin + 1; k < tauMax; k++) if (dn[k] < dn[best]) best = k;
    const lim = dn[best] + 0.06;
    for (let k = tauMin + 1; k < tauMax; k++) {
      if (dn[k] <= lim && dn[k] <= dn[k - 1] && dn[k] <= dn[k + 1]) {
        tau = k;
        break;
      }
    }
    if (tau < 0) tau = best;
  }
  // en el borde no hay valle de verdad: el tono queda fuera de 70–500 Hz
  if (tau <= tauMin || tau >= tauMax - 1) return { f0: 0, conf: 0, rms };
  const a = dn[tau - 1];
  const b = dn[tau];
  const c = dn[tau + 1];
  const den = a - 2 * b + c;
  const shift = den > 1e-9 ? Math.max(-1, Math.min(1, (0.5 * (a - c)) / den)) : 0;
  return { f0: fs / (tau + shift), conf: Math.max(0, Math.min(1, 1 - b)), rms };
}

const decimationOf = (fs: number) => Math.max(1, Math.round(fs / WORK_HZ));

/**
 * Escucha en directo: se le van dando trozos de PCM tal como llegan del micro (a cualquier frecuencia de muestreo)
 * y devuelve una medida cada 12,5 ms. `gain` convierte las muestras a ±1 (1/32768 para enteros de 16 bits).
 */
export function createTracker(fs: number) {
  const dec = decimationOf(fs);
  const fa = fs / dec;
  const N = Math.max(64, Math.round(fa * WIN_S));
  const hop = Math.max(1, Math.round(fa * HOP_S));
  const win = new Float32Array(N);
  const ring = new Float32Array(dec);
  let ringSum = 0;
  let ringAt = 0;
  let acc = 0;
  let cnt = 0;
  let fill = 0;
  let total = 0;
  return {
    /** frecuencia a la que se analiza (Hz) */
    rate: fa,
    push(samples: ArrayLike<number>, gain = 1): Frame[] {
      const out: Frame[] = [];
      for (let i = 0; i < samples.length; i++) {
        // dos medias seguidas (ventana triangular) antes de quedarse con 1 de cada `dec` muestras
        const s = samples[i] * gain;
        ringSum += s - ring[ringAt];
        ring[ringAt] = s;
        ringAt = ringAt + 1 === dec ? 0 : ringAt + 1;
        acc += ringSum;
        if (++cnt < dec) continue;
        win[fill++] = acc / (dec * dec);
        acc = 0;
        cnt = 0;
        total++;
        if (fill < N) continue;
        const p = detectPitch(win, fa);
        out.push({ t: (total - N / 2) / fa, f0: p.f0, conf: p.conf, rms: p.rms });
        win.copyWithin(0, hop);
        fill = N - hop;
      }
      return out;
    },
  };
}

/** Tono de una «foto» suelta de la señal (p. ej. de un AnalyserNode de la web), a cualquier frecuencia de muestreo. */
export function pitchOfBlock(block: Float32Array, fs: number): { f0: number; conf: number; rms: number } {
  const dec = decimationOf(fs);
  if (dec === 1) return detectPitch(block, fs);
  const fa = fs / dec;
  const n = Math.min(Math.floor(block.length / dec), Math.round(fa * WIN_S * 1.25));
  const x = new Float32Array(n);
  const off = block.length - n * dec;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < dec; j++) s += block[off + i * dec + j];
    x[i] = s / dec;
  }
  return detectPitch(x, fa);
}

// ——— La curva limpia ———

/** Curva de una grabación: instante, altura en semitonos (NaN = sin voz) y volumen en dB de cada medida. */
export type Track = { t: number[]; st: number[]; db: number[]; voiced: number };

/** Semitonos sobre 100 Hz. Solo importa la diferencia entre alturas, no el cero. */
export const toSemitones = (hz: number) => 12 * Math.log2(hz / 100);

const VOICED_CONF = 0.5;
/** Por debajo de esto (−54 dBFS) es el ruido de la sala, no una voz. */
const FLOOR_RMS = 0.002;

function median(list: number[]): number {
  if (!list.length) return NaN;
  const s = [...list].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const quantile = (sorted: number[], q: number) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.round(q * (sorted.length - 1))))];
const avg = (list: number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : NaN);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** 0 hasta `a`, 1 desde `b`, lineal entre medias. */
const ramp = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1);

/** ¿Suena esta medida a voz? (para pintar en directo, antes de limpiar la curva entera) */
export const isVoiced = (f: Frame, peakRms = 0) => f.f0 >= F_MIN && f.f0 <= F_MAX && f.conf >= VOICED_CONF + 0.1 && f.rms >= Math.max(FLOOR_RMS, peakRms * 0.1);

/** Limpia la curva: fuera ruido y saltos de octava, rellena huecos cortos y suaviza con mediana. */
export function cleanTrack(frames: Frame[]): Track {
  const n = frames.length;
  const t = frames.map((f) => f.t);
  const db = frames.map((f) => 20 * Math.log10(Math.max(f.rms, 1e-6)));
  const st: number[] = new Array(n).fill(NaN);
  const none = { t, st, db, voiced: 0 };
  if (n < 4) return none;
  const loud = frames.map((f) => f.rms).sort((a, b) => a - b);
  const gate = Math.max(FLOOR_RMS, quantile(loud, 0.95) * 0.1);
  for (let i = 0; i < n; i++) {
    const f = frames[i];
    if (f.f0 >= F_MIN && f.f0 <= F_MAX && f.conf >= VOICED_CONF && f.rms >= gate) st[i] = toSemitones(f.f0);
  }
  const med = median(st.filter((v) => !Number.isNaN(v)));
  if (Number.isNaN(med)) return none;
  // una voz no se aleja una octava de su centro: eso es el detector cogiendo el doble o la mitad
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(st[i])) continue;
    const d = st[i] - med;
    if (Math.abs(d) <= 9) continue;
    const fixed = st[i] - Math.sign(d) * 12;
    st[i] = Math.abs(fixed - med) <= 7 ? fixed : NaN;
  }
  for (let i = 1; i < n; i++) {
    if (Number.isNaN(st[i]) || Number.isNaN(st[i - 1])) continue;
    const d = st[i] - st[i - 1];
    if (Math.abs(d) > 7 && Math.abs(d - Math.sign(d) * 12) < 4) st[i] -= Math.sign(d) * 12;
  }
  // islas de menos de 3 medidas (~40 ms) son chasquidos, no sílabas
  for (let i = 0; i < n; ) {
    if (Number.isNaN(st[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && !Number.isNaN(st[j])) j++;
    if (j - i < 3) for (let k = i; k < j; k++) st[k] = NaN;
    i = j;
  }
  // huecos de 1–2 medidas dentro de una sílaba (voz rota un instante)
  for (let i = 1; i < n - 1; i++) {
    if (!Number.isNaN(st[i]) || Number.isNaN(st[i - 1])) continue;
    let j = i;
    while (j < n && Number.isNaN(st[j])) j++;
    if (j < n && j - i <= 2 && Math.abs(st[j] - st[i - 1]) < 4) {
      for (let k = i; k < j; k++) st[k] = st[i - 1] + ((st[j] - st[i - 1]) * (k - i + 1)) / (j - i + 1);
    }
    i = j;
  }
  // mediana de 5 dentro de cada tramo con voz
  const raw = st.slice();
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(raw[i])) continue;
    const near: number[] = [];
    for (let k = i - 2; k <= i + 2; k++) {
      if (k < 0 || k >= n || Number.isNaN(raw[k])) continue;
      // sin cruzar un silencio
      let gap = false;
      for (let m = Math.min(i, k); m <= Math.max(i, k); m++) if (Number.isNaN(raw[m])) gap = true;
      if (!gap) near.push(raw[k]);
    }
    st[i] = median(near);
  }
  return { t, st, db, voiced: st.reduce((c, v) => c + (Number.isNaN(v) ? 0 : 1), 0) };
}

// ——— Reparto en sílabas ———

/**
 * Reparte lo dicho en `n` sílabas. Programación dinámica: los cortes prefieren caer en silencios (consonantes
 * sordas), luego en valles de volumen o saltos de altura, y si no hay pistas, a partes iguales.
 * Devuelve los tramos [desde, hasta) en índices de la curva, o null si no hay voz para tantas sílabas.
 */
export function segment(tr: Track, n: number): [number, number][] | null {
  const { t, st, db } = tr;
  let i0 = 0;
  let i1 = st.length - 1;
  while (i0 <= i1 && Number.isNaN(st[i0])) i0++;
  while (i1 >= i0 && Number.isNaN(st[i1])) i1--;
  const F = i1 - i0 + 1;
  if (n < 1 || tr.voiced < Math.max(4, n * 3) || F < n * 4) return null;
  if (n === 1) return [[i0, i1 + 1]];

  const voiced = (j: number) => !Number.isNaN(st[i0 + j]);
  const vAcc = [0];
  for (let j = 0; j < F; j++) vAcc.push(vAcc[j] + (voiced(j) ? 1 : 0));
  // instante de cada posible corte (delante de la medida j)
  const half = F > 1 ? (t[i1] - t[i0]) / (F - 1) / 2 : HOP_S / 2;
  const at = (j: number) => (j <= 0 ? t[i0] - half : j >= F ? t[i1] + half : (t[i0 + j - 1] + t[i0 + j]) / 2);
  const D = (at(F) - at(0)) / n;
  // lo que cuesta cortar delante de j: nada en un silencio, poco en un valle, mucho en mitad de una vocal
  const cut = new Float32Array(F + 1);
  // (un silencio muy corto puede ser la voz rota un instante, no una consonante: ahí cortar cuesta un poco)
  const gapLen = new Int32Array(F + 1);
  for (let j = 0; j < F; ) {
    if (voiced(j)) {
      j++;
      continue;
    }
    let e = j;
    while (e < F && !voiced(e)) e++;
    for (let k = j; k <= e; k++) gapLen[k] = e - j;
    j = e + 1;
  }
  for (let j = 1; j < F; j++) {
    if (!voiced(j - 1) || !voiced(j)) {
      cut[j] = 0.45 * (1 - clamp(gapLen[j] / 5, 0, 1));
      continue;
    }
    const here = Math.min(db[i0 + j - 1], db[i0 + j]);
    let left = -200;
    let right = -200;
    for (let k = 1; k <= 8; k++) {
      if (j - 1 - k >= 0) left = Math.max(left, db[i0 + j - 1 - k]);
      if (j + k < F) right = Math.max(right, db[i0 + j + k]);
    }
    const dip = clamp((Math.min(left, right) - here) / 8, 0, 1);
    const jump = Math.abs(st[i0 + j] - st[i0 + j - 1]) >= 2 ? 0.25 : 0;
    cut[j] = Math.max(0.1, 1 - dip * 0.8 - jump);
  }
  const MIN = 3;
  const seg = (a: number, b: number) => {
    const r = (at(b) - at(a) - D) / D;
    return 0.5 * r * r + (vAcc[b] - vAcc[a] < 2 ? 50 : 0);
  };
  const INF = 1e9;
  const best: Float64Array[] = [];
  const from: Int32Array[] = [];
  for (let k = 0; k <= n; k++) {
    best.push(new Float64Array(F + 1).fill(INF));
    from.push(new Int32Array(F + 1).fill(-1));
  }
  best[0][0] = 0;
  for (let k = 1; k <= n; k++) {
    for (let b = k * MIN; b <= F - (n - k) * MIN; b++) {
      if (k === n && b !== F) continue;
      for (let a = (k - 1) * MIN; a <= b - MIN; a++) {
        if (best[k - 1][a] >= INF) continue;
        const c = best[k - 1][a] + seg(a, b) + (b < F ? cut[b] : 0);
        if (c < best[k][b]) {
          best[k][b] = c;
          from[k][b] = a;
        }
      }
    }
  }
  if (best[n][F] >= INF) return null;
  const out: [number, number][] = [];
  let b = F;
  for (let k = n; k >= 1; k--) {
    const a = from[k][b];
    out.unshift([i0 + a, i0 + b]);
    b = a;
  }
  return out;
}

/** Puntos con los que se resume el contorno de cada sílaba. */
export const CONTOUR_POINTS = 9;

/** Contorno de una sílaba: `CONTOUR_POINTS` alturas (semitonos) repartidas por su parte con voz; null si casi no se oyó. */
export function contourOf(tr: Track, a: number, b: number): number[] | null {
  const ts: number[] = [];
  const vs: number[] = [];
  for (let i = a; i < b; i++) {
    if (Number.isNaN(tr.st[i])) continue;
    ts.push(tr.t[i]);
    vs.push(tr.st[i]);
  }
  // los bordes los tuercen las consonantes (y los cortes, que no son exactos)
  const trim = vs.length >= 10 ? Math.max(1, Math.round(vs.length * 0.1)) : vs.length >= 6 ? 1 : 0;
  const T = ts.slice(trim, ts.length - trim);
  const V = vs.slice(trim, vs.length - trim);
  if (V.length < 4) return null;
  const out: number[] = [];
  let j = 0;
  for (let k = 0; k < CONTOUR_POINTS; k++) {
    const x = T[0] + ((T[T.length - 1] - T[0]) * k) / (CONTOUR_POINTS - 1);
    while (j < T.length - 2 && T[j + 1] < x) j++;
    const f = T[j + 1] > T[j] ? clamp((x - T[j]) / (T[j + 1] - T[j]), 0, 1) : 0;
    out.push(V[j] + (V[j + 1] - V[j]) * f);
  }
  return out;
}

// ——— La nota ———

/** Lo que hizo la voz en una sílaba. */
export type Move = 'sube' | 'cae' | 'plana';
/** En qué se apartó del tono que tocaba (para la pista). */
export type Slip = 'subio' | 'cayo' | 'plana' | 'aguda' | 'grave';
export type Grade = 'bien' | 'casi' | 'otra' | 'mudo';

export type SyllableScore = {
  tone: ToneId;
  /** contorno medido (semitonos sobre 100 Hz); null si no se oyó */
  pts: number[] | null;
  /** 0–1; NaN si no se oyó */
  score: number;
  grade: Grade;
  move: Move;
  slip: Slip | null;
};

/** La voz de quien aprende, aprendida de sus grabaciones de esta sesión: su altura media y cuánto se mueve. */
export type Profile = { mid: number; range: number; n: number };

export type Analysis = {
  /** se oyó voz suficiente para medir */
  heard: boolean;
  syll: SyllableScore[];
  /** media de las sílabas oídas, 0–1 */
  score: number;
  /** 0 = sin medir · 1 = aún no · 2 = casi · 3 = igualito */
  stars: 0 | 1 | 2 | 3;
  /** sílaba que más se apartó (para la pista); −1 si todas bien */
  worst: number;
  /** centro (semitonos) y anchura de la voz con los que se ha juzgado la altura */
  mid: number;
  range: number;
  /** la voz de quien aprende, puesta al día con esta grabación */
  profile: Profile | null;
};

/** Altura media que se espera de cada tono dentro de la voz de quien habla (0 = lo más grave, 1 = lo más agudo). */
const LEVEL: Record<ToneId, number> = { M: 0.5, L: 0.25, F: 0.68, H: 0.75, R: 0.4 };
/** Cuánto pesa la altura en la nota: mucho en los tonos planos (es lo que los distingue), poco en los que se mueven. */
const LEVEL_WEIGHT: Record<ToneId, number> = { M: 0.6, L: 0.6, H: 0.6, F: 0.3, R: 0.3 };
const DEFAULT_RANGE = 8;

function shapeOf(pts: number[]) {
  const P = pts.length;
  const q = Math.max(1, Math.round(P / 4));
  const s0 = avg(pts.slice(0, q));
  const s1 = avg(pts.slice(P - q));
  const head = pts.slice(0, Math.ceil(P * 0.75));
  return {
    net: s1 - s0,
    /** lo que sube al final desde su punto más grave */
    rise: Math.max(0, s1 - Math.min(...head)),
    /** lo que cae al final desde su punto más agudo */
    fall: Math.max(0, Math.max(...head) - s1),
    mean: avg(pts),
    top: Math.max(...pts),
    low: Math.min(...pts),
  };
}

/**
 * Pone nota a cada sílaba de lo grabado. `tonesList` son los tonos que tocaban, en orden; `profile`, la voz de
 * quien aprende si ya se la ha oído antes (afina el juicio de la altura en palabras de una sola sílaba).
 */
export function analyse(frames: Frame[], tonesList: ToneId[], profile: Profile | null = null): Analysis {
  const n = tonesList.length;
  const blank = (): Analysis => ({
    heard: false,
    syll: tonesList.map((tone) => ({ tone, pts: null, score: NaN, grade: 'mudo', move: 'plana', slip: null })),
    score: 0,
    stars: 0,
    worst: -1,
    mid: profile?.mid ?? 0,
    range: profile?.range ?? DEFAULT_RANGE,
    profile,
  });
  const tr = cleanTrack(frames);
  const cuts = segment(tr, n);
  if (!cuts) return blank();
  const pts = cuts.map(([a, b]) => contourOf(tr, a, b));
  const got = pts.filter((p) => p !== null).length;
  if (got === 0 || got * 2 < n) return blank();
  const shapes = pts.map((p) => (p ? shapeOf(p) : null));

  // la anchura de la voz: lo que se ha movido aquí si había tonos que se mueven, y lo que ya se sabe de ella
  const all = tr.st.filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
  const moving = tonesList.some((tn, k) => pts[k] && (tn === 'F' || tn === 'R'));
  const here = (quantile(all, 0.95) - quantile(all, 0.05)) / 0.85;
  const range = clamp(moving ? (here + (profile?.range ?? DEFAULT_RANGE)) / 2 : (profile?.range ?? DEFAULT_RANGE), 5, 12);
  const rMove = clamp(range / DEFAULT_RANGE, 0.625, 1.25);
  const rFlat = Math.max(1, range / DEFAULT_RANGE);

  // el centro de la voz: suponiendo (con generosidad) que lo dicho iba, de media, a su altura
  const mids = shapes.flatMap((s, k) => (s ? [s.mean - range * (LEVEL[tonesList[k]] - 0.5)] : []));
  const mine = mids.length >= 3 ? median(mids) : avg(mids);
  const levels = tonesList.filter((_, k) => shapes[k]).map((tn) => LEVEL[tn]);
  const lm = avg(levels);
  const contrast = got >= 2 ? clamp(Math.sqrt(avg(levels.map((v) => (v - lm) * (v - lm)))) / 0.15, 0, 1) : 0;
  const known = profile ? clamp(profile.n / 4, 0, 1) * 0.8 : 0;
  const mid = contrast + known > 0 ? (contrast * mine + known * (profile?.mid ?? mine)) / (contrast + known) : mine;
  const sure = Math.max(contrast, known);
  const rel = (v: number) => 0.5 + (v - mid) / range;

  // 1) cada sílaba por sí sola: hacia dónde fue la voz y a qué altura quedó dentro de la voz de quien habla
  const solo = tonesList.map((tone, k) => {
    const s = shapes[k];
    if (!s) return null;
    const th = 2 * rMove;
    const move: Move = s.rise >= th && s.rise > s.fall ? 'sube' : s.fall >= th && s.fall >= s.rise ? 'cae' : 'plana';
    let dir: number;
    if (tone === 'F') dir = ramp(s.fall, 1.2 * rMove, 3 * rMove);
    else if (tone === 'R') dir = ramp(s.rise, 1.2 * rMove, 3 * rMove);
    else if (tone === 'M') dir = Math.min(1 - ramp(s.net, 1.5 * rFlat, 4 * rFlat), 1 - ramp(-s.net, 2 * rFlat, 4.5 * rFlat), 1 - ramp(s.top - s.low, 4.5 * rFlat, 7.5 * rFlat));
    else if (tone === 'L') dir = Math.min(1 - ramp(s.net, 1 * rFlat, 3 * rFlat), 1 - ramp(s.rise, 2 * rFlat, 4 * rFlat));
    else dir = Math.min(1 - ramp(-s.net, 1 * rFlat, 3 * rFlat), 1 - ramp(s.fall, 2 * rFlat, 4.5 * rFlat));
    // un tono bajo que se desploma desde arriba es, en realidad, un descendente: empezó demasiado agudo
    const plunge = tone === 'L' ? 0.6 * ramp(s.fall, 4.5 * rFlat, 7.5 * rFlat) : 0;

    let level: number;
    if (tone === 'L') level = 1 - ramp(rel(s.mean), 0.45, 0.68);
    else if (tone === 'M') level = Math.min(ramp(rel(s.mean), 0.12, 0.3), 1 - ramp(rel(s.mean), 0.7, 0.9));
    else if (tone === 'H') level = ramp(rel(s.mean), 0.35, 0.55);
    else if (tone === 'F') level = ramp(rel(s.top), 0.35, 0.55);
    else level = 1 - ramp(rel(s.low), 0.55, 0.8);
    return { s, move, dir, plunge, level, off: Math.max(sure * (1 - level), plunge), toward: 0, stepped: false };
  });

  // 2) cada sílaba frente a la de al lado, cuando una debería ir claramente más aguda que la otra. Si el escalón
  //    no está, la culpa es de la que ya iba rara por sí sola; si ninguna lo iba, de las dos.
  for (let k = 0; k + 1 < n; k++) {
    const a = solo[k];
    const b = solo[k + 1];
    if (!a || !b) continue;
    const want = LEVEL[tonesList[k + 1]] - LEVEL[tonesList[k]];
    if (Math.abs(want) < 0.2) continue;
    const miss = 1 - ramp(((b.s.mean - a.s.mean) / range) * Math.sign(want), -0.05, 0.08);
    if (miss <= 0) continue;
    const sa = 1 - a.dir + (1 - a.level);
    const sb = 1 - b.dir + (1 - b.level);
    const wa = sa + sb > 0.2 ? sa / (sa + sb) : 1;
    const wb = sa + sb > 0.2 ? sb / (sa + sb) : 1;
    if (miss * wa > a.off) {
      a.off = miss * wa;
      a.toward = -Math.sign(want);
      a.stepped = true;
    }
    if (miss * wb > b.off) {
      b.off = miss * wb;
      b.toward = Math.sign(want);
      b.stepped = true;
    }
  }

  const syll: SyllableScore[] = tonesList.map((tone, k) => {
    const v = solo[k];
    if (!v) return { tone, pts: null, score: NaN, grade: 'mudo', move: 'plana', slip: null };
    const score = v.dir * (1 - LEVEL_WEIGHT[tone] * v.off);
    const grade: Grade = score >= 0.7 ? 'bien' : score >= 0.4 ? 'casi' : 'otra';
    let slip: Slip | null = null;
    if (grade !== 'bien') {
      if (v.dir < 0.7) {
        if (tone === 'F') slip = v.move === 'sube' ? 'subio' : 'plana';
        else if (tone === 'R') slip = v.move === 'cae' ? 'cayo' : 'plana';
        else if (tone === 'H') slip = 'cayo';
        else if (tone === 'L') slip = 'subio';
        else slip = v.s.net > 0 ? 'subio' : 'cayo';
      } else if (v.stepped) slip = v.toward > 0 ? 'grave' : 'aguda';
      else if (tone === 'L' || tone === 'R') slip = 'aguda';
      else if (tone === 'H' || tone === 'F') slip = 'grave';
      else slip = rel(v.s.mean) > 0.5 ? 'aguda' : 'grave';
    }
    return { tone, pts: pts[k], score, grade, move: v.move, slip };
  });

  const scored = syll.filter((s) => s.grade !== 'mudo');
  const score = avg(scored.map((s) => s.score));
  // tres estrellas: todo «bien» (en trozos de 4 sílabas o más se perdona un «casi»); dos: va bien encaminado
  const almost = scored.filter((s) => s.grade === 'casi').length;
  const stars: 1 | 2 | 3 = score >= 0.8 && scored.every((s) => s.grade !== 'otra') && almost <= Math.floor(scored.length / 4) ? 3 : score >= 0.5 ? 2 : 1;
  let worst = -1;
  syll.forEach((s, k) => {
    if (s.grade === 'mudo' || s.grade === 'bien') return;
    if (worst < 0 || s.score < syll[worst].score) worst = k;
  });

  // lo aprendido de esta voz, para la próxima
  const w = Math.min(profile?.n ?? 0, 6);
  const next: Profile = {
    mid: profile ? (profile.mid * w + mine) / (w + 1) : mine,
    range: moving ? clamp(profile ? (profile.range * w + here) / (w + 1) : (here + DEFAULT_RANGE) / 2, 5, 12) : (profile?.range ?? DEFAULT_RANGE),
    n: (profile?.n ?? 0) + 1,
  };
  return { heard: true, syll, score, stars, worst, mid, range, profile: next };
}

/**
 * Cómo colocar lo medido sobre el pentagrama de Noi: una sola regla para toda la grabación (centro y anchura de la
 * voz), la que mejor hace coincidir las curvas. `ideal[k]` son las alturas 0–1 del dibujo del tono de la sílaba k,
 * en los mismos `CONTOUR_POINTS` puntos. Así el dibujo es comparable de verdad: misma escala para todas las sílabas.
 */
export function fitStaff(pts: (number[] | null)[], ideal: number[][], hint = DEFAULT_RANGE): { mid: number; range: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  pts.forEach((p, k) => {
    if (!p) return;
    p.forEach((v, i) => {
      xs.push((ideal[k]?.[i] ?? 0.5) - 0.5);
      ys.push(v);
    });
  });
  if (!xs.length) return { mid: 0, range: hint };
  const mx = avg(xs);
  const my = avg(ys);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxx += (xs[i] - mx) * (xs[i] - mx);
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  const range = clamp(sxx > 0.02 * xs.length ? sxy / sxx : hint, 5, 14);
  return { mid: my - range * mx, range };
}
