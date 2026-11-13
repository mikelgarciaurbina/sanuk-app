// Juego 5 · Noche de farolillos (Yi Peng): flotan farolillos de papel encendidos, cada uno con una palabra
// thai (y su transcripción mientras no se sabe leer). Toca los de la categoría pedida: suben al cielo con su
// estela y su traducción; los demás se balancean y se apagan. Al acabar la ronda, los que no eran enseñan lo que
// significaban, y los que se fallaron vuelven en otra ronda. El cielo se va llenando de los que sueltas y la
// noche acaba con una gran suelta (las esperas entre rondas y el final se saltan con un toque).
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { color, font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import type { Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { Farol, LH, LW, Lucero, Suelta, type LanternState } from './farolillos/Farol';
import { Countdown, Pop, tapPoint, useJuice } from './fx';
import { ComboBadge, useScore } from './kit';
import { MultChip, ScoreChip, ToastRibbon, distinct, multFor, pointIn, romFor, useLater, useToast } from './palabras/common';
import type { GameProps } from './types';

/** Segundos por ronda en la feria (cada ronda, un poco menos). */
const ROUND_S = [24, 21, 19, 17];
/** Transcripción más larga que cabe, legible, dentro de un farolillo. */
const ROM_MAX = 16;
const clock = () => Date.now();
const jitter = (k: number) => (Math.random() - 0.5) * 2 * k;

/** Farolillo pequeño para el cielo, en un sitio al azar de la franja alta. */
const newStar = (id: number): Star => ({ id, fx: 0.06 + Math.random() * 0.88, fy: 0.03 + Math.random() * 0.2, s: 0.22 + Math.random() * 0.16, d: Math.random() * 1400 });

const groupOf = (w: Word): string => (w.cat === 'fruta' || w.cat === 'bebida' ? 'comida' : (w.cat ?? ''));

/** Categorías que se piden (las abstractas, como partículas o conectores, solo sirven de distractor). */
const LABEL: Record<string, [string, string]> = {
  comida: ['comida y bebida', '🍲'],
  animal: ['animales', '🐘'],
  color: ['colores', '🎨'],
  cuerpo: ['el cuerpo', '🖐️'],
  numero: ['números', '🔢'],
  lugar: ['lugares', '🏯'],
  transporte: ['transporte', '🛺'],
  // en esta categoría están también la vendedora, el médico o el vecino
  familia: ['personas y familia', '👪'],
  naturaleza: ['la naturaleza', '🌿'],
  clima: ['el clima', '🌦️'],
  casa: ['la casa', '🏠'],
  verbo: ['acciones (verbos)', '🏃'],
  adjetivo: ['cómo es algo (adjetivos)', '✨'],
  tiempo: ['el tiempo y el reloj', '⏰'],
  saludo: ['saludos', '👋'],
  cortesia: ['cortesía', '🙏'],
  pronombre: ['personas (pronombres)', '🙋'],
  sentimiento: ['sentimientos', '💗'],
  cocina: ['la cocina', '🍳'],
  dinero: ['el dinero', '💰'],
};

/**
 * Categorías vecinas: no se usan como distractor de la pedida, para que nunca se apague un farolillo que también
 * encaja. Las categorías del palabrario son temas, no cajones cerrados: «pollo» está en comida y es un animal,
 * «pagar» está en dinero y es una acción, «dulce» está en la cocina y dice cómo es algo, «naranja» es fruta y color.
 */
const NEAR: Record<string, string[]> = {
  comida: ['cocina', 'animal', 'verbo', 'adjetivo', 'cortesia', 'norte'],
  cocina: ['comida', 'verbo', 'casa', 'adjetivo', 'cortesia', 'norte'],
  naturaleza: ['clima', 'animal', 'lugar', 'norte', 'verbo', 'comida', 'casa'],
  clima: ['naturaleza', 'tiempo', 'adjetivo', 'verbo'],
  animal: ['naturaleza', 'norte', 'comida'],
  lugar: ['casa', 'naturaleza', 'transporte', 'norte', 'cultura'],
  casa: ['lugar', 'familia', 'cocina', 'verbo', 'cultura'],
  saludo: ['cortesia', 'particula', 'pregunta', 'norte'],
  cortesia: ['saludo', 'particula', 'norte', 'verbo'],
  pronombre: ['familia', 'pregunta', 'particula', 'norte'],
  familia: ['pronombre', 'casa', 'cultura', 'cortesia'],
  adjetivo: ['sentimiento', 'color', 'clima', 'cuerpo', 'cocina', 'norte', 'numero', 'lugar', 'conector', 'particula', 'tiempo', 'cortesia', 'cultura', 'familia'],
  sentimiento: ['adjetivo', 'verbo', 'cuerpo', 'norte', 'cortesia'],
  color: ['adjetivo', 'comida', 'cocina'],
  tiempo: ['numero', 'clima', 'conector', 'adjetivo', 'particula', 'cultura'],
  numero: ['dinero', 'tiempo', 'adjetivo', 'conector', 'particula', 'pregunta'],
  dinero: ['numero', 'verbo', 'adjetivo'],
  verbo: ['cocina', 'sentimiento', 'cultura', 'cortesia', 'norte', 'dinero', 'cuerpo', 'saludo', 'particula', 'conector', 'adjetivo'],
  cuerpo: ['adjetivo', 'verbo', 'sentimiento'],
  transporte: ['lugar', 'verbo'],
};

type Item = { word: Word; good: boolean; fx: number; fy: number };
type Round = { n: number; group: string; label: string; emoji: string; items: Item[] };
type Star = { id: number; fx: number; fy: number; s: number; d: number };
type Feedback = { n: number; kind: 'ok' | 'bad' | 'lost'; word?: Word; lost?: Word[]; label: string };

function groups(pool: Word[], min: number) {
  const m = new Map<string, Word[]>();
  for (const w of pool) {
    const k = groupOf(w);
    if (!LABEL[k]) continue;
    m.set(k, [...(m.get(k) ?? []), w]);
  }
  return [...m.entries()].filter(([, l]) => l.length >= min);
}

/**
 * Prepara una ronda. `again`: palabras falladas en rondas anteriores (tocadas sin ser de la categoría o que se
 * escaparon): vuelven antes que ninguna, como farolillo bueno si se puede pedir su categoría o, si no, como distractor.
 */
function makeRound(n: number, pool: Word[], focus: Word[], avoid: string[], goodN: number, badN: number, again: Word[] = []): Round | null {
  let cands = groups(pool, 3);
  if (!cands.length) cands = groups(pool, 2);
  if (!cands.length) return null;
  const fresh = cands.filter(([k]) => !avoid.includes(k));
  const list = shuffle(fresh.length ? fresh : cands);
  const isIn = (w: Word, set: Word[]) => set.some((x) => x.id === w.id);
  // primero las categorías con palabras que toca volver a ver y, en la lección, con palabras nuevas
  const rank = (l: Word[]) => (l.some((w) => isIn(w, again)) ? 2 : 0) + (l.some((w) => isIn(w, focus)) ? 1 : 0);
  list.sort((a, b) => rank(b[1]) - rank(a[1]));
  const [group, words] = list[0];
  // dentro de la ronda, por delante lo fallado antes, luego lo nuevo y luego lo demás
  const first = (w: Word) => (isIn(w, again) ? 0 : isIn(w, focus) ? 1 : 2);
  const byTurn = (l: Word[]) => [0, 1, 2].flatMap((k) => shuffle(l.filter((w) => first(w) === k)));
  const good = byTurn(words).slice(0, goodN);
  const near = NEAR[group] ?? [];
  const others = byTurn(pool.filter((w) => w.cat && groupOf(w) !== group && !near.includes(groupOf(w)) && !good.some((g) => g.es === w.es || g.th === w.th)));
  // distractores de categorías distintas entre sí (y si faltan, repetidas)
  const bad: Word[] = [];
  const seen = new Set<string>();
  for (const w of others) {
    if (bad.length >= badN || seen.has(groupOf(w)) || bad.some((b) => b.es === w.es)) continue;
    seen.add(groupOf(w));
    bad.push(w);
  }
  for (const w of others) if (bad.length < badN && !bad.includes(w) && !bad.some((b) => b.es === w.es)) bad.push(w);
  const all = shuffle([...good.map((word) => ({ word, good: true })), ...bad.map((word) => ({ word, good: false }))]);
  const cols = 3;
  const rows = Math.ceil(all.length / cols);
  const cells = shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, all.length);
  const items = all.map((it, i) => ({
    ...it,
    fx: (cells[i] % cols + 0.5) / cols + jitter(0.045),
    fy: (Math.floor(cells[i] / cols) + 0.5) / rows + jitter(0.035),
  }));
  const [label, emoji] = LABEL[group];
  return { n, group, label, emoji, items };
}

const sizesFor = (feria: boolean, r: number): [number, number] => (feria ? ([[4, 3], [4, 4], [4, 5], [5, 4]][r] as [number, number]) : [4, 3]);

/** Juego 5 · Noche de farolillos: suelta solo los de la categoría pedida. */
export default function Farolillos({ mode, words, focus, rounds = 4, reads, review, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const total = feria ? Math.min(rounds, ROUND_S.length) : 1;
  const score = useScore(mode);
  const juice = useJuice();
  const toast = useToast();
  const later = useLater();
  const rootRef = useRef<ComponentRef<typeof View>>(null);

  const [pool] = useState(() => {
    const all = distinct([...focus, ...words]);
    if (reads) return all;
    // mientras no se sabe leer cada farolillo lleva su transcripción: las frases que no caben en uno no salen aquí
    const fit = all.filter((w) => w.rom.length <= ROM_MAX);
    return fit.length >= 2 ? fit : all;
  });
  const [fresh] = useState(() => new Set(review ? [] : focus.map((w) => w.id)));
  const [round, setRound] = useState<Round | null>(() => makeRound(0, pool, feria ? [] : focus, [], ...sizesFor(feria, 0)));
  const [states, setStates] = useState<Record<string, LanternState>>({});
  const [sky, setSky] = useState<Star[]>([]);
  const [phase, setPhase] = useState<'count' | 'play' | 'between' | 'end'>(feria ? 'count' : 'play');
  const [secs, setSecs] = useState(ROUND_S[0]);
  const [points, setPoints] = useState(0);
  const [jump, setJump] = useState(0);
  const [pose, setPose] = useState<'feliz' | 'celebra' | 'ups'>('feliz');
  const [fb, setFb] = useState<Feedback | null>(null);
  const [finale, setFinale] = useState(false);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [rootSize, setRootSize] = useState({ w: 0, h: 0 });

  const g = useRef({
    r: 0,
    points: 0,
    ended: false,
    done: false,
    deadline: 0,
    /** reloj parado: se ha soltado el último farolillo bueno (`left` guarda los ms que quedaban) */
    stopped: false,
    left: 0,
    lastTick: 0,
    mistakes: 0,
    released: 0,
    sky: 0,
    fb: 0,
    poseN: 0,
    groups: [] as string[],
    closed: -1,
    /** palabras falladas que deben volver en otra ronda */
    again: [] as Word[],
    /** espera en curso que se puede saltar con un toque */
    waitN: 0,
    waited: 0,
    skip: null as (() => void) | null,
    skipFrom: 0,
  });

  const tooFew = !round;
  const bail = useEffectEvent(() => onDone(score.result(0)));
  useEffect(() => {
    if (!tooFew) return;
    const t = setTimeout(() => bail(), 400);
    return () => clearTimeout(t);
  }, [tooFew]);

  const setMood = (p: 'celebra' | 'ups') => {
    const s = g.current;
    s.poseN += 1;
    const n = s.poseN;
    setPose(p);
    later(() => {
      if (g.current.poseN === n) setPose('feliz');
    }, 1300);
  };
  const tell = (f: Omit<Feedback, 'n'>) => {
    g.current.fb += 1;
    setFb({ ...f, n: g.current.fb });
  };

  /** Espera `ms` y sigue; un toque en la pantalla (pasado un momento, para no saltarla sin querer) la acorta. */
  const wait = (fn: () => void, ms: number) => {
    const s = g.current;
    s.waitN += 1;
    const n = s.waitN;
    const run = () => {
      if (s.waitN !== n || s.waited === n) return;
      s.waited = n;
      s.skip = null;
      fn();
    };
    s.skip = run;
    s.skipFrom = clock() + 500;
    later(run, ms);
  };
  const skip = () => {
    const s = g.current;
    if (s.skip && clock() >= s.skipFrom) s.skip();
  };
  const remember = (w: Word) => {
    const s = g.current;
    if (!s.again.some((x) => x.id === w.id)) s.again.push(w);
  };

  const addStar = () => {
    const s = g.current;
    s.sky += 1;
    const star = newStar(s.sky);
    setSky((l) => [...l.slice(-28), star]);
  };

  // ——— final: la gran suelta ———

  const grandRelease = () => {
    const s = g.current;
    if (s.ended) return;
    s.ended = true;
    setPhase('end');
    setFinale(true);
    setJump((j) => j + 1);
    setMood('celebra');
    fx.fanfare();
    juice.banner('¡Yi Peng!', feria ? `${s.points} puntos · la noche se llena de luz` : 'La noche se llena de luz', color.farol);
    later(() => fx.sparkle(), 900);
    wait(
      () => {
        if (s.done) return;
        s.done = true;
        onDone(score.result(s.points));
      },
      feria ? 3000 : 1700,
    );
  };

  // ——— rondas ———

  const startRound = (r: Round) => {
    const s = g.current;
    s.mistakes = 0;
    s.released = 0;
    s.lastTick = 0;
    s.stopped = false;
    s.deadline = clock() + (ROUND_S[s.r] ?? 17) * 1000;
    setSecs(ROUND_S[s.r] ?? 17);
    setRound(r);
    setStates({});
    setPhase('play');
  };

  const endRound = (timeout: boolean) => {
    const s = g.current;
    if (!round || s.closed === round.n || s.ended) return;
    s.closed = round.n;
    setPhase('between');
    if (!round.items.some((it) => it.good)) return;
    const lost = timeout ? round.items.filter((it) => it.good && !states[it.word.id]) : [];
    // se escaparon por tiempo: cuentan en la partida y vuelven en otra ronda, pero no bajan en el repaso (quizá
    // solo faltó rapidez)
    for (const it of lost) {
      score.hit(false, false);
      remember(it.word);
    }
    // los que no eran de la categoría y nadie tocó se apagan y enseñan lo que significaban
    setStates((st) => {
      const n = { ...st };
      for (const it of lost) n[it.word.id] = 'lost';
      for (const it of round.items) if (!it.good && !n[it.word.id]) n[it.word.id] = 'rest';
      return n;
    });
    if (timeout) {
      if (lost.length) tell({ kind: 'lost', lost: lost.map((it) => it.word), label: round.label });
      fx.bell();
    }
    if (feria) {
      const left = timeout ? 0 : Math.ceil(s.left / 1000);
      const perfect = !timeout && s.mistakes === 0;
      const bonus = (timeout ? 0 : left * 2) + (perfect ? 30 : 0);
      s.points += bonus;
      setPoints(s.points);
      // en una cinta arriba, no en el centro: debajo se están leyendo los farolillos que no eran
      if (perfect) {
        fx.levelup();
        toast.show('¡Ronda perfecta!', `+${bonus} · ni un farolillo apagado`, color.buatongHondo);
        pointIn(rootRef, 0.5, 0.2, (at) => juice.burst(at, 'chispas', 26, 190));
      } else if (!timeout) toast.show(`¡Ronda ${s.r + 1} de ${total}!`, bonus ? `+${bonus} por el tiempo` : undefined, color.farol);
    }
    s.groups.push(round.group);
    if (feria && s.r + 1 < total) {
      wait(
        () => {
          s.r += 1;
          const next = makeRound(s.r, pool, [], s.groups, ...sizesFor(true, s.r), s.again);
          if (!next) {
            grandRelease();
            return;
          }
          // lo que vuelve en esta ronda ya no está pendiente
          s.again = s.again.filter((w) => !next.items.some((it) => it.word.id === w.id));
          startRound(next);
        },
        timeout ? 2800 : 2200,
      );
    } else wait(grandRelease, feria ? (timeout ? 2400 : 1500) : 700);
  };

  const start = () => {
    const s = g.current;
    s.deadline = clock() + ROUND_S[0] * 1000;
    setPhase('play');
  };

  const onTick = useEffectEvent(() => {
    const s = g.current;
    if (s.ended || s.stopped) return;
    const left = s.deadline - clock();
    const sec = Math.max(0, Math.ceil(left / 1000));
    setSecs(sec);
    if (sec <= 5 && sec > 0 && sec !== s.lastTick) {
      s.lastTick = sec;
      fx.tick();
    }
    if (left <= 0) endRound(true);
  });
  useEffect(() => {
    if (!feria || phase !== 'play') return;
    const t = setInterval(() => onTick(), 250);
    return () => clearInterval(t);
  }, [feria, phase]);

  const tap = (it: Item, e: GestureResponderEvent) => {
    const s = g.current;
    if (phase !== 'play' || !round || states[it.word.id] || s.ended) return;
    const at = tapPoint(e);
    say(it.word.th);
    if (it.good) {
      const combo = score.hit(true);
      onAnswer(true, it.word.id);
      const gain = 10 * multFor(combo);
      s.points += gain;
      setPoints(s.points);
      s.released += 1;
      setStates((st) => ({ ...st, [it.word.id]: 'ok' }));
      juice.burst(at, 'chispas', 18, 120);
      juice.float(at, `+${gain}`, '#FFD34D', 30);
      tell({ kind: 'ok', word: it.word, label: round.label });
      setJump((j) => j + 1);
      if (combo >= 3) setMood('celebra');
      if (combo > 0 && combo % 5 === 0) toast.show(`¡Racha ×${combo}!`, 'los puntos se multiplican', color.farol);
      later(addStar, 1500);
      if (s.released >= round.items.filter((x) => x.good).length) {
        // el último farolillo para el reloj en el acto: soltarlo en el último segundo no es quedarse sin tiempo
        s.stopped = true;
        s.left = Math.max(0, s.deadline - clock());
        setPhase('between');
        later(() => endRound(false), 400);
      }
    } else {
      score.hit(false);
      onAnswer(false, it.word.id);
      remember(it.word);
      s.mistakes += 1;
      setStates((st) => ({ ...st, [it.word.id]: 'bad' }));
      juice.shake(5);
      setMood('ups');
      tell({ kind: 'bad', word: it.word, label: round.label });
    }
  };

  const goodTotal = round ? round.items.filter((it) => it.good).length : 0;
  const released = round ? round.items.filter((it) => it.good && states[it.word.id] === 'ok').length : 0;
  const low = feria && secs <= 5;
  /** Transcripción: siempre mientras no se sabe leer; después, solo en lo nuevo de la lección o en la primera ronda de la feria. */
  const romOf = (w: Word) => romFor(reads, { feria, level: (round?.n ?? 0) + 1, review: !fresh.has(w.id) }) && (!reads || w.rom.length <= ROM_MAX);
  const resting = phase === 'between' || phase === 'end';

  return (
    <View ref={rootRef} style={{ flex: 1 }} onLayout={(e) => setRootSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Backdrop scene="noche" />
      {rootSize.w > 0
        ? sky.map((st) => <Lucero key={st.id} x={st.fx * rootSize.w} y={st.fy * rootSize.h} s={st.s} delay={st.d} up={finale} />)
        : null}
      <Animated.View style={[{ flex: 1, paddingHorizontal: 14, paddingTop: 4 }, juice.shakeStyle]}>
        <View style={styles.hud}>
          <ScoreChip value={points} dark />
          <View style={styles.hudMid}>
            <ComboBadge combo={score.combo} />
            <MultChip mult={multFor(score.combo)} />
          </View>
          {feria ? (
            <>
              <View style={styles.pill}>
                <Text style={styles.pillText}>
                  {Math.min((round?.n ?? 0) + 1, total)}/{total}
                </Text>
              </View>
              <Pop trigger={low ? secs : 0} scale={1.25} style={[styles.pill, low ? styles.pillLow : null]}>
                <Text style={styles.pillText}>0:{String(secs).padStart(2, '0')}</Text>
              </Pop>
            </>
          ) : (
            <Pop trigger={released} style={styles.pill}>
              <Text style={styles.pillText}>
                🏮 {released}/{goodTotal}
              </Text>
            </Pop>
          )}
        </View>

        {round ? (
          <Pop key={round.n} trigger={round.n} style={styles.sign}>
            <Text style={styles.signSmall}>{resting ? 'Así eran los demás · toca para seguir' : 'Suelta al cielo los farolillos de…'}</Text>
            <Text style={styles.signBig} numberOfLines={1}>
              {round.emoji} {round.label}
            </Text>
          </Pop>
        ) : null}

        <View style={{ flex: 1 }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {round && area.w > 0
            ? round.items.map((it, i) => {
                const x = Math.max(2, Math.min(area.w - LW - 2, it.fx * area.w - LW / 2));
                const y = Math.max(4, Math.min(area.h - LH - 26, it.fy * (area.h - 26) - LH / 2));
                const st = states[it.word.id] ?? 'float';
                return (
                  <Farol
                    key={`${round.n}-${it.word.id}`}
                    word={it.word}
                    x={x}
                    y={y}
                    state={st}
                    delay={i * 90}
                    showEs={st !== 'float'}
                    rom={romOf(it.word)}
                    onPress={(e) => tap(it, e)}
                  />
                );
              })
            : null}
        </View>

        <View style={styles.bottom}>
          <Noi pose={pose} size={74} jump={jump} />
          <View style={{ flex: 1, paddingBottom: 8 }}>
            {fb ? (
              <Strip key={fb.n} fb={fb} />
            ) : (
              <View style={styles.hint}>
                <Text style={styles.hintText}>Yi Peng: cada farolillo que sueltas se lleva un deseo. ¡Elige bien!</Text>
              </View>
            )}
          </View>
        </View>
        <ToastRibbon toast={toast.now} style={{ top: 46 }} />
      </Animated.View>
      {/* entre rondas y en la suelta final, un toque en cualquier sitio sigue adelante */}
      {resting ? <Pressable accessibilityRole="button" accessibilityLabel="Seguir" onPress={skip} style={StyleSheet.absoluteFill} /> : null}
      {finale && rootSize.w > 0
        ? Array.from({ length: 16 }, (_, k) => <Suelta key={k} x={((k * 0.37 + 0.1) % 1) * rootSize.w * 0.9 + rootSize.w * 0.05} h={rootSize.h} delay={k * 160} s={0.45 + ((k * 7) % 5) * 0.12} />)
        : null}
      {phase === 'count' && !tooFew ? <Countdown dark onDone={start} /> : null}
      {juice.layer}
    </View>
  );
}

function Strip({ fb }: { fb: Feedback }) {
  if (fb.kind === 'lost' && fb.lost) {
    return (
      <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.strip, { borderColor: '#FFB25C' }]}>
        <Text style={styles.stripHead}>Se escaparon:</Text>
        <Text style={styles.stripText} numberOfLines={2}>
          {fb.lost.map((w) => `${w.th} (${w.es})`).join(' · ')}
        </Text>
      </Animated.View>
    );
  }
  const w = fb.word;
  if (!w) return null;
  const ok = fb.kind === 'ok';
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.strip, { borderColor: ok ? '#FFD34D' : '#8A93C8' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <Th size={17} bold style={{ color: '#FFFFFF', lineHeight: 24 }}>
          {w.th}
        </Th>
        <Rom rom={w.rom} size={12} mono="#FFE7B0" />
        <Text style={styles.stripText}>= {w.es}</Text>
      </View>
      <Text style={[styles.stripSub, { color: ok ? '#FFD34D' : '#C9D0EE' }]}>{ok ? `¡Al cielo! Es de ${fb.label}.` : `No es de ${fb.label}: se apaga.`}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46 },
  hudMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pill: { height: 34, paddingHorizontal: 11, borderRadius: 999, justifyContent: 'center', backgroundColor: 'rgba(14,17,40,0.55)', borderWidth: 1.5, borderColor: 'rgba(255,214,140,0.4)' },
  pillLow: { backgroundColor: '#E2474C', borderColor: '#FFC8B8' },
  pillText: { fontFamily: font.displayBold, fontSize: 16, color: '#FFE7B0' },
  sign: {
    marginTop: 6,
    alignSelf: 'center',
    minWidth: '86%',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(20,16,48,0.72)',
    borderWidth: 2,
    borderColor: '#E9B44C',
    shadowColor: '#FFB347',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  signSmall: { fontFamily: font.uiBold, fontSize: 13, color: '#E8DDF5' },
  signBig: { fontFamily: font.displayBold, fontSize: 24, lineHeight: 30, color: '#FFD34D', textShadowColor: 'rgba(255,170,60,0.7)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 92, paddingBottom: 6 },
  hint: { backgroundColor: 'rgba(14,17,40,0.55)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: 'rgba(255,214,140,0.35)' },
  hintText: { fontFamily: font.uiBold, fontSize: 13, color: '#FFE9C2' },
  strip: { backgroundColor: 'rgba(14,17,40,0.82)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 2 },
  stripHead: { fontFamily: font.displayBold, fontSize: 14, color: '#FFB25C' },
  stripText: { fontFamily: font.uiHeavy, fontSize: 14, color: '#FFFFFF' },
  stripSub: { fontFamily: font.uiBold, fontSize: 12.5 },
});
