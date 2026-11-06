// Sintetiza los efectos de sonido de Sanuk (WAV 16-bit mono 22,05 kHz).
// Afinados en pentatónica, con timbre de marimba de madera (ranat ek).
// Uso: node scripts/make-sfx.mjs  →  assets/sfx/*.wav
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SR = 22050;
const OUT = join(import.meta.dirname, '..', 'assets', 'sfx');
mkdirSync(OUT, { recursive: true });

const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz
const silence = (sec) => new Float32Array(Math.round(SR * sec));

/** Barra de madera: fundamental + armónicos inarmónicos, ataque instantáneo y caída exponencial. */
function mallet(freq, dur = 0.35, amp = 0.6, decay = 9) {
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const partials = [
    [1, 1],
    [3.9, 0.28],
    [9.2, 0.08],
  ];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const [ratio, a] of partials) v += a * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp(-decay * ratio * 0.6 * t);
    const attack = Math.min(1, t / 0.002);
    out[i] = amp * attack * v * Math.exp(-decay * t * 0.4);
  }
  return out;
}

function bell(freq, dur = 1.2, amp = 0.45) {
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const partials = [
    [1, 1, 2.2],
    [2.76, 0.45, 3.5],
    [5.4, 0.22, 5],
    [8.93, 0.1, 7],
  ];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const [r, a, d] of partials) v += a * Math.sin(2 * Math.PI * freq * r * t) * Math.exp(-d * t);
    out[i] = amp * Math.min(1, t / 0.003) * v;
  }
  return out;
}

function gong(dur = 1.8, amp = 0.5) {
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const base = 98;
  const partials = [
    [1, 1, 1.6],
    [1.5, 0.5, 2.1],
    [2.02, 0.35, 2.6],
    [2.9, 0.18, 3.4],
  ];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const wobble = 1 + 0.004 * Math.sin(2 * Math.PI * 3 * t);
    let v = 0;
    for (const [r, a, d] of partials) v += a * Math.sin(2 * Math.PI * base * r * wobble * t) * Math.exp(-d * t);
    out[i] = amp * Math.min(1, t / 0.01) * v;
  }
  return out;
}

function noise(dur, amp = 0.3, decay = 30, lp = 0.2) {
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const x = Math.random() * 2 - 1;
    y += lp * (x - y);
    out[i] = amp * y * Math.exp(-decay * t);
  }
  return out;
}

function chirp(f0, f1, dur, amp = 0.4) {
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f0 + (f1 - f0) * (t / dur);
    phase += (2 * Math.PI * f) / SR;
    out[i] = amp * Math.sin(phase) * Math.sin(Math.PI * (t / dur));
  }
  return out;
}

function mix(...layers) {
  const len = Math.max(...layers.map(([buf, at = 0]) => Math.round(at * SR) + buf.length));
  const out = new Float32Array(len);
  for (const [buf, at = 0] of layers) {
    const off = Math.round(at * SR);
    for (let i = 0; i < buf.length; i++) out[off + i] += buf[i];
  }
  return out;
}

function wav(name, data) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0.95 ? 0.95 / peak : 1;
  const pcm = Buffer.alloc(data.length * 2);
  for (let i = 0; i < data.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i] * gain)) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.writeUInt32LE(pcm.length, 40);
  writeFileSync(join(OUT, `${name}.wav`), Buffer.concat([h, pcm]));
}

// Pentatónica de do: do re mi sol la
const E5 = note(76), G5 = note(79), A5 = note(81), C6 = note(84), D6 = note(86), E6 = note(88), C5 = note(72), A4 = note(69);

wav('tap', chirp(900, 1300, 0.045, 0.35));
wav('pop', chirp(520, 1250, 0.08, 0.45));
wav('ok', mix([mallet(E5, 0.3, 0.55), 0], [mallet(A5, 0.45, 0.6), 0.09]));
wav('combo', mix([mallet(G5, 0.25, 0.5), 0], [mallet(A5, 0.25, 0.5), 0.07], [mallet(C6, 0.25, 0.5), 0.14], [mallet(E6, 0.5, 0.55), 0.21]));
wav('bad', mix([mallet(A4 / 2, 0.22, 0.55, 22), 0], [noise(0.05, 0.25, 80, 0.5), 0]));
wav('flip', noise(0.14, 0.35, 22, 0.35));
wav('bell', bell(C6, 1.2, 0.4));
wav('stamp', mix([chirp(140, 60, 0.12, 0.7), 0], [noise(0.09, 0.4, 45, 0.25), 0]));
wav('done', mix([gong(1.8, 0.45), 0], [mallet(C5, 0.4, 0.4), 0.15], [mallet(E5, 0.4, 0.4), 0.27], [mallet(G5, 0.4, 0.4), 0.39], [mallet(A5, 0.4, 0.42), 0.51], [mallet(C6, 0.7, 0.45), 0.63]));
wav('whoosh', noise(0.3, 0.3, 8, 0.12));
wav('coin', mix([mallet(D6, 0.18, 0.4, 14), 0], [mallet(G5 * 2, 0.3, 0.35, 12), 0.06]));
console.log('sfx →', OUT);
