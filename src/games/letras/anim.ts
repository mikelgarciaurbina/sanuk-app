// Ayudas de animación para los juegos de «Letras» (Cueva, Traza, Sílabas, Cuentos).
import { useEffect, useId } from 'react';
import { Easing, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/** Reloj que avanza sin parar (1 unidad cada `ms`), para movimientos continuos sin saltos: sin(clock·2π·f). */
export function useClock(ms = 9000) {
  const reduced = useReducedMotion();
  const c = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    c.value = withTiming(2000, { duration: 2000 * ms, easing: Easing.linear });
  }, [c, ms, reduced]);
  return c;
}

/** Va y viene de 0 a 1 (latido, brillo, balanceo). Respeta «reducir movimiento». */
export function usePulse(ms = 1400, on = true) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced || !on) {
      p.value = 0;
      return;
    }
    p.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [p, ms, on, reduced]);
  return p;
}

/** Id único para degradados SVG (en la web todos los SVG comparten documento). */
export function useSvgId(prefix: string) {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

/** Generador pseudoaleatorio con semilla (para dibujos estables). */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
