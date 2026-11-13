// Hablar y saber cuándo se ha terminado de hablar: los juegos avanzan cuando la voz acaba (también con la voz
// lenta de los ajustes), no con un reloj fijo.
import { say } from '@/lib/audio';

/**
 * Dice `th` y llama a `done` UNA sola vez cuando la voz ha terminado de verdad (o cuando otra frase la corta).
 * Si el sistema no avisa (web sin voz thai, un error) o avisa al instante, espera un tiempo prudente según lo
 * larga que sea la frase: nunca antes de que dé tiempo a leerla, nunca colgado para siempre.
 * Devuelve cómo anular el aviso (al desmontar el juego).
 */
export function sayThen(th: string, done: () => void, opts: { slow?: boolean } = {}): () => void {
  const n = [...th].length;
  const least = Math.min(2600, 420 + n * 60);
  const most = 3000 + n * (opts.slow ? 520 : 300);
  const t0 = Date.now();
  let over = false;
  let wait: ReturnType<typeof setTimeout> | undefined;
  const fire = () => {
    if (over) return;
    over = true;
    clearTimeout(cap);
    if (wait) clearTimeout(wait);
    done();
  };
  const cap = setTimeout(fire, most);
  say(th, {
    slow: opts.slow,
    onDone: () => {
      if (over || wait) return;
      const left = least - (Date.now() - t0);
      if (left > 0) wait = setTimeout(fire, left);
      else fire();
    },
  });
  return () => {
    over = true;
    clearTimeout(cap);
    if (wait) clearTimeout(wait);
  };
}
