export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function sample<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.max(0, Math.min(n, arr.length)));
}

/** n distractores distintos de `correct` (comparando por clave). */
export function distractors<T>(pool: readonly T[], correct: T, n: number, key: (x: T) => string): T[] {
  const k = key(correct);
  const seen = new Set<string>([k]);
  const out: T[] = [];
  for (const x of shuffle(pool)) {
    const kx = key(x);
    if (seen.has(kx)) continue;
    seen.add(kx);
    out.push(x);
    if (out.length === n) break;
  }
  return out;
}

export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00`).getTime();
  const db = new Date(`${b}T12:00:00`).getTime();
  return Math.round((db - da) / 86400000);
}
