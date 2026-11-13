// Voz y tiempos de los juegos de «Oído y tonos»: decir thai sabiendo cuándo empieza y cuándo acaba
// (aunque la voz del sistema no avise) para animar ondas, curvas y ecos a la vez, y temporizadores
// que se cancelan solos al salir del juego.
import { useEffect, useRef, useState } from 'react';

import { say, stopSpeech } from '@/lib/audio';
import { syllables } from '@/lib/thai';

type Timer = ReturnType<typeof setTimeout>;

/** Duración aproximada (ms) de lo que dice la voz, según sus sílabas. */
export function speechMs(rom: string, slow = false): number {
  const n = Math.max(1, syllables(rom).length);
  return Math.round((260 + n * 300) * (slow ? 1.7 : 1));
}

/** Temporizadores que se cancelan solos al desmontar el juego. */
export function useTimers() {
  const list = useRef<Timer[]>([]);
  useEffect(() => {
    const l = list.current;
    return () => {
      l.forEach(clearTimeout);
      l.length = 0;
    };
  }, []);
  return {
    /** Programa algo; devuelve el temporizador por si hay que anularlo con `cancel`. */
    later(fn: () => void, ms: number): Timer {
      const t = setTimeout(() => {
        const k = list.current.indexOf(t);
        if (k >= 0) list.current.splice(k, 1);
        fn();
      }, ms);
      list.current.push(t);
      return t;
    },
    /** Anula uno de los programados (si ya saltó, no pasa nada). */
    cancel(t: Timer | null | undefined) {
      if (t == null) return;
      clearTimeout(t);
      const k = list.current.indexOf(t);
      if (k >= 0) list.current.splice(k, 1);
    },
    /** Anula todo lo pendiente: lo que quedara de una ronda no se cuela en la siguiente. */
    clear() {
      list.current.forEach(clearTimeout);
      list.current.length = 0;
    },
  };
}

export type SpeakOpts = {
  /** transcripción, para calcular cuánto dura */
  rom?: string;
  slow?: boolean;
  /** empieza a sonar (recibe la duración estimada en ms) */
  onStart?: (ms: number) => void;
  onEnd?: () => void;
};

/** Voz thai con aviso fiable de inicio y fin. `talking` sirve para animar a quien habla o escucha. */
export function useVoice() {
  const [talking, setTalking] = useState(false);
  const seq = useRef(0);
  const timers = useTimers();
  useEffect(() => () => stopSpeech(), []);

  const speak = (th: string, o: SpeakOpts = {}) => {
    timers.clear();
    seq.current += 1;
    const id = seq.current;
    const ms = speechMs(o.rom ?? th, o.slow);
    let started = false;
    let ended = false;
    const start = () => {
      if (started || seq.current !== id) return;
      started = true;
      o.onStart?.(ms);
    };
    const end = () => {
      if (ended || seq.current !== id) return;
      start();
      ended = true;
      setTalking(false);
      o.onEnd?.();
    };
    setTalking(true);
    say(th, { slow: o.slow, onStart: start, onDone: end });
    // por si la voz no avisa (web sin voz thai, errores…)
    timers.later(start, 850);
    timers.later(end, 850 + ms + 1500);
  };

  const stop = () => {
    seq.current += 1;
    timers.clear();
    stopSpeech();
    setTalking(false);
  };

  return { talking, speak, stop };
}
