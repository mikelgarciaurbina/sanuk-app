import type { Stop } from '@/content';
import { DARK_SCENES, type Scene } from '@/games/Backdrop';
import type { SceneSpec } from '@/games/cuentos/escenas';

/**
 * El aspecto de cada parada del viaje: el escenario que abre sus lecciones (`scene`) y la viñeta de su capítulo
 * en el diario (`vignette`). Así el camino se ve cambiar: mercado, curvas, cueva, lago, casa de teca… y luego los meses.
 */
type Look = { scene: Scene; vignette: SceneSpec };

const LOOKS: Record<number, Look> = {
  // ——— Temporada 1: la carretera 1095 ———
  1: { scene: 'amanecer', vignette: { sky: 'dawn', land: 'village', noi: 'hola', items: ['🧱', '🛺'] } },
  2: { scene: 'mercado', vignette: { sky: 'day', land: 'village', noi: 'feliz', items: ['🥭', '🧣', '🌸'] } },
  3: { scene: 'dia', vignette: { sky: 'day', land: 'river', noi: 'celebra', items: ['🍌', '🐘'] } },
  4: { scene: 'amanecer', vignette: { sky: 'day', land: 'road', wind: true, noi: 'ups', items: ['🛻', '⛰️'] } },
  5: { scene: 'arrozal', vignette: { sky: 'dusk', land: 'paddy', noi: 'feliz', items: ['☕', '🛵'] } },
  6: { scene: 'amanecer', vignette: { sky: 'dawn', land: 'hills', fog: true, noi: 'escucha', items: ['📷', '🌄'] } },
  7: { scene: 'cueva', vignette: { sky: 'dark', land: 'floor', noi: 'piensa', items: ['🔦', '🦇'] } },
  8: { scene: 'arrozal', vignette: { sky: 'dawn', land: 'paddy', fog: true, noi: 'piensa', items: ['🎋', '🙏'] } },
  9: { scene: 'templo', vignette: { sky: 'dusk', land: 'river', noi: 'escucha', items: ['🛕', '📞'] } },
  10: { scene: 'dia', vignette: { sky: 'day', land: 'hills', fog: true, noi: 'feliz', items: ['🍵', '🏮'] } },
  11: { scene: 'amanecer', vignette: { sky: 'dawn', land: 'village', fog: true, noi: 'celebra', yai: true, items: ['🏡'] } },
  12: { scene: 'casa', vignette: { sky: 'indoor', land: 'floor', noi: 'feliz', yai: true, items: ['🍲', '🌶️'] } },
  13: { scene: 'noche', vignette: { sky: 'night', land: 'village', noi: 'escucha', yai: true, items: ['🔥', '📖'] } },
  14: { scene: 'casa', vignette: { sky: 'indoor', land: 'floor', noi: 'piensa', yai: true, items: ['💌'] } },
  15: { scene: 'amanecer', vignette: { sky: 'dawn', land: 'road', noi: 'hola', items: ['🧳', '✍️'] } },
  // ——— Temporada 2: un año en el pueblo, de abril a marzo ———
  16: { scene: 'dia', vignette: { sky: 'day', land: 'village', noi: 'celebra', yai: true, items: ['💦', '🪣'] } },
  17: { scene: 'mercado', vignette: { sky: 'dawn', land: 'village', noi: 'feliz', items: ['🥬', '⚖️', '🥭'] } },
  18: { scene: 'arrozal', vignette: { sky: 'rain', land: 'paddy', noi: 'ups', items: ['🌱', '⛈️'] } },
  19: { scene: 'templo', vignette: { sky: 'dusk', land: 'village', noi: 'escucha', items: ['🕯️', '🛕'] } },
  20: { scene: 'casa', vignette: { sky: 'indoor', land: 'floor', noi: 'feliz', yai: true, items: ['🌼', '💐'] } },
  21: { scene: 'lluvia', vignette: { sky: 'rain', land: 'village', noi: 'ups', items: ['🌧️', '🔦'] } },
  22: { scene: 'noche', vignette: { sky: 'night', land: 'river', noi: 'celebra', items: ['🏮', '🎆'] } },
  23: { scene: 'noche', vignette: { sky: 'night', land: 'river', noi: 'feliz', yai: true, items: ['🪷', '🌻'] } },
  24: { scene: 'arrozal', vignette: { sky: 'dawn', land: 'paddy', fog: true, noi: 'celebra', items: ['🌾', '🧣'] } },
  25: { scene: 'dia', vignette: { sky: 'day', land: 'village', noi: 'piensa', items: ['🎒', '✏️'] } },
  26: { scene: 'casa', vignette: { sky: 'indoor', land: 'floor', noi: 'escucha', yai: true, items: ['📰', '🍚'] } },
  27: { scene: 'amanecer', vignette: { sky: 'dusk', land: 'road', noi: 'hola', yai: true, items: ['🧳', '💛'] } },
};

const FALLBACK: Look = { scene: 'amanecer', vignette: { sky: 'dawn', land: 'hills', fog: true, noi: 'hola' } };

export const stopLook = (stop: Pick<Stop, 'n'>): Look => LOOKS[stop.n] ?? FALLBACK;

/** ¿El escenario de la parada es oscuro? (cabecera clara encima) */
export const stopIsDark = (stop: Pick<Stop, 'n'>) => DARK_SCENES.has(stopLook(stop).scene);

/** Escenarios de tono medio (la teca de la casa, el cielo de lluvia): la cabecera aguanta, pero un título oscuro se pierde. */
const DIM_SCENES: ReadonlySet<Scene> = new Set(['casa', 'lluvia']);

/** ¿El título de la parada va en claro sobre su escenario? */
export const stopLightInk = (stop: Pick<Stop, 'n'>) => stopIsDark(stop) || DIM_SCENES.has(stopLook(stop).scene);
