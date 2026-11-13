// «Noi dice»: dónde está cada parte de Noi en su dibujo (viewBox 240×240, src/brand/noi-art.ts) y qué parte se ha
// tocado. Las zonas siguen a la pose (con «ups» la mano sube a la cabeza, con «celebra» suben las dos y la trompa),
// las partes de delante tapan a las de detrás (la trompa a la boca, las manos a la barriga) y lo que se pedía
// tiene manga ancha: si el dedo cae en esa parte o a un pelo, vale, aunque pise otra.
// Las partes finas (rodillas, hombros, brazos, cintura, cuello, sombrero) solo existen cuando ya se han enseñado;
// hasta entonces su sitio es de la parte grande (las rodillas son «patas», el sombrero es «cabeza»).
import { NOI_POSE_DEFS, type NoiPose } from '@/brand/noi-art';
import type { NoiTarget } from '@/content/drills';

import type { Box } from './shared';

type Shape =
  | { k: 'rect'; x: number; y: number; w: number; h: number }
  | { k: 'oval'; cx: number; cy: number; rx: number; ry: number }
  /** un tramo grueso de brazo o de trompa: de (x1, y1) a (x2, y2), con radio r */
  | { k: 'limb'; x1: number; y1: number; x2: number; y2: number; r: number };

const rect = (x: number, y: number, w: number, h: number): Shape => ({ k: 'rect', x, y, w, h });
const oval = (cx: number, cy: number, rx: number, ry: number): Shape => ({ k: 'oval', cx, cy, rx, ry });
const limb = (x1: number, y1: number, x2: number, y2: number, r: number): Shape => ({ k: 'limb', x1, y1, x2, y2, r });

/** Lo mismo al otro lado del dibujo (el eje está en x = 120). */
const flip = (s: Shape): Shape =>
  s.k === 'rect' ? rect(240 - s.x - s.w, s.y, s.w, s.h) : s.k === 'oval' ? oval(240 - s.cx, s.cy, s.rx, s.ry) : limb(240 - s.x1, s.y1, 240 - s.x2, s.y2, s.r);

/** Distancia de un punto a una forma (0 si está dentro), en unidades del dibujo. */
function gap(s: Shape, x: number, y: number): number {
  if (s.k === 'rect') return Math.hypot(Math.max(s.x - x, 0, x - s.x - s.w), Math.max(s.y - y, 0, y - s.y - s.h));
  if (s.k === 'oval') return Math.max(0, (Math.hypot((x - s.cx) / s.rx, (y - s.cy) / s.ry) - 1) * Math.min(s.rx, s.ry));
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / len)) : 0;
  return Math.max(0, Math.hypot(x - s.x1 - dx * t, y - s.y1 - dy * t) - s.r);
}
const near = (shapes: Shape[], x: number, y: number) => Math.min(...shapes.map((s) => gap(s, x, y)));

function bounds(s: Shape): Box {
  if (s.k === 'rect') return { x: s.x, y: s.y, w: s.w, h: s.h };
  if (s.k === 'oval') return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 };
  const x = Math.min(s.x1, s.x2) - s.r;
  const y = Math.min(s.y1, s.y2) - s.r;
  return { x, y, w: Math.max(s.x1, s.x2) + s.r - x, h: Math.max(s.y1, s.y2) + s.r - y };
}
function union(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}

// ——— Brazos y trompa, según la pose (lado izquierdo de quien mira; el otro es su espejo) ———

/** Centro de la mano y tramo del brazo (del borde de la manga a la muñeca) de cada postura del brazo. */
const ARMS: Record<string, { hand: [number, number]; arm: [number, number, number, number] }> = {
  down: { hand: [75, 195], arm: [87, 166, 80, 184] },
  head: { hand: [73, 100], arm: [86, 156, 76, 118] },
  up: { hand: [44, 95], arm: [84, 158, 54, 114] },
  wave: { hand: [46, 103], arm: [84, 158, 56, 120] },
  chin: { hand: [78, 128], arm: [86, 158, 80, 140] },
  ear: { hand: [70, 106], arm: [88, 158, 74, 124] },
};
const ARM_POSE: Record<string, keyof typeof ARMS> = { lDown: 'down', rDown: 'down', lWave: 'wave', lUp: 'up', rUp: 'up', rChin: 'chin', lHead: 'head', rEar: 'ear' };

const TRUNKS: Record<string, Shape[]> = {
  curl: [limb(120, 110, 123, 140, 11), limb(123, 140, 134, 154, 10), limb(134, 154, 150, 152, 9), limb(150, 152, 150, 140, 8), limb(150, 140, 142, 134, 7)],
  up: [limb(120, 110, 126, 126, 11), limb(126, 126, 140, 130, 10), limb(140, 130, 156, 120, 9), limb(156, 120, 158, 98, 9), limb(158, 98, 170, 84, 8)],
  droop: [limb(120, 110, 120, 160, 11), limb(120, 160, 130, 174, 9)],
  think: [limb(120, 110, 118, 138, 11), limb(118, 138, 108, 152, 10), limb(108, 152, 92, 148, 9), limb(92, 148, 100, 136, 7)],
};

/** `shapes`: lo que vale cuando esa parte es la que se pide · `core`: lo que es esa parte cuando se toca sin querer. */
type Zone = { id: NoiTarget; shapes: Shape[]; core: Shape[]; /** una luz por forma (los dos hombros) en vez de una para todo */ split?: boolean };

/** El sombrero: la copa y el ala. */
const HAT = [rect(76, 4, 88, 40), rect(50, 34, 140, 27)];

/** Las zonas de una pose, de delante atrás. `has`: las partes finas que ya están en juego. */
function zonesOf(pose: NoiPose, has: ReadonlySet<NoiTarget>): Zone[] {
  const def = NOI_POSE_DEFS[pose];
  // el brazo izquierdo del dibujo es la mano DERECHA de Noi
  const right = ARMS[ARM_POSE[def.armL] ?? 'down'];
  const left = ARMS[ARM_POSE[def.armR] ?? 'down'];
  const fine = has.has('arms');
  const hand = (a: (typeof ARMS)[string]) => (fine ? [oval(a.hand[0], a.hand[1], 12, 12)] : [limb(a.arm[0], a.arm[1], a.hand[0], a.hand[1], 11)]);
  const arm = (a: (typeof ARMS)[string]) => limb(a.arm[0], a.arm[1], a.arm[2], a.arm[3], 10);
  const grin = def.mouth === 'grin';
  const neck = has.has('neck');
  const waist = has.has('waist');
  const knees = has.has('knees');
  const hat = has.has('hat');
  const bellyTop = neck ? 171 : 158;
  const bellyBottom = waist ? 183 : 193;

  const zones: Zone[] = [];
  const add = (id: NoiTarget, shapes: Shape[], core: Shape[] = shapes, split = false) => zones.push({ id, shapes, core, split });

  if (has.has('shoulders')) add('shoulders', [oval(81, 159, 15, 13), oval(159, 159, 15, 13)], [oval(81, 159, 13, 11), oval(159, 159, 13, 11)], true);
  add('handR', hand(right));
  add('handL', hand(left).map(flip));
  if (fine) add('arms', [arm(right), flip(arm(left))], undefined, true);
  add('trunk', TRUNKS[def.trunk] ?? TRUNKS.curl);
  add('mouth', grin ? [oval(106, 147, 16, 13)] : [oval(102, 146, 14, 12)], grin ? [oval(106, 147, 13, 10)] : [oval(101, 145, 9, 8)]);
  add('eyes', [oval(98, 99, 16, 19), oval(142, 99, 16, 19), rect(98, 84, 44, 30)], [oval(98, 100, 13, 16), oval(142, 100, 13, 16)]);
  if (neck) add('neck', [rect(92, 150, 58, 22), oval(150, 154, 10, 8)], [rect(96, 154, 50, 16), oval(150, 154, 8, 6)]);
  if (hat) add('hat', HAT);
  // la cabeza, cuando se pide, es toda (con sombrero); tocada sin querer, solo la coronilla y la frente
  add('head', [oval(120, 98, 66, 56), ...HAT], hat ? [rect(68, 60, 104, 17)] : [...HAT, rect(68, 60, 104, 17)]);
  if (waist) add('waist', [rect(78, 181, 84, 17)], [rect(80, 183, 80, 13)]);
  if (knees) add('knees', [rect(82, 198, 76, 24)], [rect(82, 202, 76, 17)]);
  add('belly', [rect(92, 156, 56, 38)], [rect(94, bellyTop, 52, bellyBottom - bellyTop)]);
  // las patas, cuando se piden, son enteras (rodillas incluidas)
  add('legs', [rect(82, 198, 76, 38)], [knees ? rect(82, 219, 76, 17) : rect(82, 200, 76, 36)]);
  add('earL', [oval(203, 100, 37, 55)], [oval(208, 100, 31, 52)]);
  add('earR', [oval(37, 100, 37, 55)], [oval(32, 100, 31, 52)]);
  return zones;
}

/** Manga ancha para lo que se pedía y para un toque que se queda al borde de una parte (unidades del dibujo). */
const SLOP = 8;
const EDGE = 5;

/**
 * La parte de Noi que hay en (x, y) del dibujo (0–240). Si se pedía una (`target`) y el toque cae en ella o a un
 * pelo, es esa; si no, la parte de más delante que haya ahí, o la más cercana si se queda en su borde. `null`:
 * no se ha tocado nada con nombre (el aire, una mejilla), y no pasa nada.
 */
export function hitNoi(x: number, y: number, pose: NoiPose, target: NoiTarget | null, has: ReadonlySet<NoiTarget>): NoiTarget | null {
  const zones = zonesOf(pose, has);
  const asked = target ? zones.find((z) => z.id === target) : undefined;
  if (asked && near(asked.shapes, x, y) <= SLOP) return asked.id;
  let best: NoiTarget | null = null;
  let d = EDGE;
  for (const z of zones) {
    const g = near(z.core, x, y);
    if (g <= 0) return z.id;
    if (g < d) {
      d = g;
      best = z.id;
    }
  }
  return best;
}

/** Cajas (en unidades del dibujo) donde brilla una parte al tocarla. */
export function noiBoxes(zone: NoiTarget, pose: NoiPose, has: ReadonlySet<NoiTarget>): Box[] {
  const z = zonesOf(pose, has).find((x) => x.id === zone);
  if (!z) return [];
  const boxes = z.core.map(bounds);
  return z.split ? boxes : [union(boxes)];
}

/** Todas las partes con nombre de una pose y su caja: para que un lector de pantalla pueda recorrerlas. */
export function noiParts(pose: NoiPose, has: ReadonlySet<NoiTarget>): { id: NoiTarget; box: Box }[] {
  return zonesOf(pose, has).flatMap((z) => (z.split ? z.core.map(bounds) : [union(z.core.map(bounds))]).map((box) => ({ id: z.id, box })));
}
