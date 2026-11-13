// Juego 13 · Noi dice. Noi, enorme en lo alto de una colina, pide en thai que le toques una parte del cuerpo:
// «น้อยบอกว่า แตะหู» (Noi dice: toca la oreja). Al acertar, esa parte brilla, salen corazones, suena una nota más
// aguda en cada acierto seguido y aparece la palabra con su traducción. Su izquierda es tu derecha. Si le tocas la
// trompa sin que te lo pida, estornuda. Es un juego de oído: tras las primeras órdenes, la orden no se ve hasta que
// acaba el audio (y el reloj empieza entonces); en el último nivel, si ya se sabe leer, no se ve nunca (se puede
// mirar, pero cuesta el bonus). Feria: el giro de «Simón dice»: si no empieza por น้อยบอกว่า, ¡no se toca!;
// órdenes dobles (แตะหู แล้วแตะตา), rondas cada vez más rápidas, combos que multiplican y bonus por rapidez.
// Lo que se falla vuelve unas órdenes después. Qué parte se ha tocado lo decide la geometría de ./frases/noiZones.
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import type { NoiPose } from '@/brand/noi-art';
import { color, font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import { knownForms } from '@/content';
import { BODY_COMMANDS, bodyCommandsFor, type BodyCommand, type NoiTarget } from '@/content/drills';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { Countdown, Pop, tapPoint, useJuice, type Point } from './fx';
import { hitNoi, noiBoxes, noiParts } from './frases/noiZones';
import { DrainBar, GameHud, WORD_BY_TH, clamp, measureBox, useLater, type Box, type ViewRef } from './frases/shared';
import { useScore } from './kit';
import type { GameProps } from './types';

type Cmd = BodyCommand;
type Kind = 'normal' | 'trick' | 'double';
type Who = { th: string; rom: string; es: string };
/**
 * `blind`: 0 = la orden se ve desde el principio · 1 = de oído: no se ve hasta que acaba el audio ·
 * 2 = solo de oído: no se ve hasta responder. `retry`: una orden que se falló antes y vuelve.
 */
type Round = { key: string; cmds: Cmd[]; kind: Kind; level: number; who: Who | null; blind: 0 | 1 | 2; retry?: boolean };

/** «Noi dice» en thai: la orden solo vale si empieza así. */
const NOI_SAYS: Who = { th: 'น้อยบอกว่า', rom: 'nɔ́ɔi bɔ̀ɔk wâa', es: 'Noi dice' };
/** En las trampas, a veces lo dice otra persona de la familia (y entonces tampoco se toca). */
const OTHERS: Who[] = [
  { th: 'แม่บอกว่า', rom: 'mɛ̂ɛ bɔ̀ɔk wâa', es: 'Mae dice' },
  { th: 'ยายบอกว่า', rom: 'yaai bɔ̀ɔk wâa', es: 'Yai dice' },
  { th: 'พ่อบอกว่า', rom: 'phɔ̂ɔ bɔ̀ɔk wâa', es: 'Pho dice' },
];
const AND_THEN = { th: 'แล้ว', rom: 'lɛ́ɛo' };
const GIGGLE = 'คิกคิก';

const LABEL: Record<NoiTarget, string> = {
  earL: 'oreja izquierda',
  earR: 'oreja derecha',
  eyes: 'ojos',
  trunk: 'trompa',
  mouth: 'boca',
  head: 'cabeza',
  hat: 'sombrero',
  handL: 'mano izquierda',
  handR: 'mano derecha',
  arms: 'brazo',
  shoulders: 'hombro',
  neck: 'cuello',
  belly: 'barriga',
  waist: 'cintura',
  knees: 'rodilla',
  legs: 'patas',
};
const THE: Record<NoiTarget, string> = {
  earL: 'la oreja izquierda',
  earR: 'la oreja derecha',
  eyes: 'los ojos',
  trunk: 'la trompa',
  mouth: 'la boca',
  head: 'la cabeza',
  hat: 'el sombrero',
  handL: 'la mano izquierda',
  handR: 'la mano derecha',
  arms: 'el brazo',
  shoulders: 'el hombro',
  neck: 'el cuello',
  belly: 'la barriga',
  waist: 'la cintura',
  knees: 'la rodilla',
  legs: 'las patas',
};
const MIRROR: Partial<Record<NoiTarget, NoiTarget>> = { earL: 'earR', earR: 'earL', handL: 'handR', handR: 'handL' };
/** Una parte que también vale cuando se pide otra más grande: la rodilla es pata; el sombrero va en la cabeza. */
const WITHIN: Partial<Record<NoiTarget, NoiTarget[]>> = { legs: ['knees'], head: ['hat'] };
/** Partes finas: solo son zonas aparte cuando alguna orden de la partida las pide. */
const FINE: NoiTarget[] = ['hat', 'arms', 'shoulders', 'neck', 'waist', 'knees'];
const TIME = [0, 5200, 4200, 3400, 2700];
const DEBUG_ZONES = false;

/** La palabra del cuerpo de cada orden (แตะหูซ้าย → หู) y su lado (ซ้าย), para el repaso. */
const partOf = (c: Cmd) => c.th.replace(/^แตะ/, '').replace(/(ซ้าย|ขวา)$/, '');
const sideOf = (c: Cmd) => c.th.match(/(ซ้าย|ขวา)$/)?.[0];
const idOf = (th?: string) => (th ? WORD_BY_TH.get(th)?.id : undefined);
const zoneWord = (z: NoiTarget) => {
  const c = BODY_COMMANDS.find((x) => x.target === z);
  return c ? partOf(c) : '';
};

/**
 * Rondas con las órdenes que ya se entienden enteras (แตะ + la parte del cuerpo). «น้อยบอกว่า» solo se dice
 * cuando บอก ya se ha presentado; las trampas de la familia, con quien ya se conoce, y las dobles, con แล้ว.
 * En la lección salen primero las partes nuevas (`focus`) y, tras dos órdenes a la vista, se juega de oído.
 */
function makeRounds(mode: GameProps['mode'], n: number, known: Set<string>, focus: Set<string>, reads: boolean): Round[] {
  const cmds = bodyCommandsFor(known);
  if (cmds.length < 2) return [];
  const says = known.has('บอก') && known.has('ว่า');
  const others = OTHERS.filter((o) => known.has(o.th.replace('บอกว่า', '')));
  const deck: Cmd[] = [];
  // nunca dos veces seguidas la misma parte (si se puede)
  const deal = (list: Cmd[]) => {
    const fresh = shuffle(list).filter((c) => c.target !== deck[deck.length - 1]?.target);
    deck.push(...(fresh.length ? fresh : list));
  };
  const first = cmds.filter((c) => focus.has(partOf(c)));
  if (mode === 'leccion' && first.length && first.length < cmds.length) deal(first);
  while (deck.length < n * 2 + 2) deal(cmds);
  let d = 0;
  const take = () => deck[d++];
  if (mode === 'leccion' || !says) return Array.from({ length: n }, (_, i) => ({ key: `r${i}`, cmds: [take()], kind: 'normal', level: 1, who: says ? NOI_SAYS : null, blind: i < 2 ? 0 : 1 }));
  const level = (i: number) => (i < Math.round(n * 0.27) ? 1 : i < Math.round(n * 0.54) ? 2 : i < Math.round(n * 0.8) ? 3 : 4);
  const levels = Array.from({ length: n }, (_, i) => level(i));
  const kinds: Kind[] = levels.map(() => 'normal');
  const at = (lv: number) => shuffle(levels.flatMap((l, i) => (l === lv ? [i] : [])));
  // trampas desde el nivel 2 (nunca la primera de su nivel) y órdenes dobles desde el 3
  for (const lv of [2, 3, 4]) {
    const xs = at(lv).filter((i) => levels[i - 1] === lv);
    xs.slice(0, 1).forEach((i) => (kinds[i] = 'trick'));
    if (lv >= 3 && known.has('แล้ว')) {
      const free = xs.filter((i) => kinds[i] === 'normal');
      if (free.length) kinds[free[0]] = 'double';
    }
  }
  // de oído desde el nivel 2; en el último, quien ya lee juega sin ver la orden
  const blind = (lv: number): Round['blind'] => (lv <= 1 ? 0 : lv >= 4 && reads ? 2 : 1);
  return levels.map((lv, i) => {
    const one = take();
    if (kinds[i] === 'trick') return { key: `r${i}`, cmds: [one], kind: 'trick', level: lv, who: !others.length || Math.random() < 0.5 ? null : others[Math.floor(Math.random() * others.length)], blind: blind(lv) };
    if (kinds[i] !== 'double') return { key: `r${i}`, cmds: [one], kind: kinds[i], level: lv, who: NOI_SAYS, blind: blind(lv) };
    let two = take();
    if (two.target === one.target) two = take();
    return { key: `r${i}`, cmds: [one, two], kind: 'double', level: lv, who: NOI_SAYS, blind: blind(lv) };
  });
}

const textOf = (r: Round) => {
  const body = r.cmds.map((c) => c.th).join(` ${AND_THEN.th}`);
  return r.who ? `${r.who.th} ${body}` : body;
};

type Clock = { start: number; ms: number };
const clockFrom = (delay: number, ms: number): Clock => ({ start: Date.now() + delay, ms });
const left = (c: Clock) => clamp(1 - (Date.now() - c.start) / c.ms, 0, 1);
const lift = (p: Point | undefined, dy: number) => (p ? { x: p.x, y: p.y + dy } : undefined);

type Phase = 'intro' | 'play' | 'wait';
type Flash = { key: number; boxes: Box[]; ok: boolean };

/** Juego · Noi dice. Sin órdenes que ya se entiendan no hay partida (nunca se adelantan palabras). */
export default function NoiDice(props: GameProps) {
  const { mode, rounds: n, words, focus, reads, onDone } = props;
  const [rounds] = useState(() => makeRounds(mode, n ?? (mode === 'feria' ? 15 : 5), knownForms([...words, ...focus]), knownForms(focus), !!reads));
  const bail = useEffectEvent(() => onDone({ correct: 0, total: 0, bananas: 0 }));
  useEffect(() => {
    if (!rounds.length) bail();
  }, [rounds]);
  return rounds.length ? <NoiDiceGame {...props} plan={rounds} /> : null;
}

function NoiDiceGame({ mode, plan, reads, onAnswer, onDone }: GameProps & { plan: Round[] }) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const later = useLater();
  const { width, height } = useWindowDimensions();
  const [rounds, setRounds] = useState(plan);
  // al tocar una parte que aún no se ha enseñado (la barriga…) solo se dice en español
  const [inPlay] = useState(() => new Set(plan.flatMap((r) => r.cmds.map((c) => c.target))));
  const [fine] = useState(() => new Set(FINE.filter((z) => inPlay.has(z))));
  const named = (z: NoiTarget) => (inPlay.has(z) ? `${zoneWord(z)} · ${LABEL[z]}` : LABEL[z]);
  const [i, setI] = useState(0);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>(feria ? 'intro' : 'play');
  const [pose, setPose] = useState<NoiPose>('feliz');
  const [jump, setJump] = useState(0);
  const [points, setPoints] = useState(0);
  const [missed, setMissed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [result, setResult] = useState<null | { ok: boolean; text: string }>(null);
  // de oído: ¿ha acabado ya el audio de la orden? · ¿se ha mirado la orden escrita?
  const [heard, setHeard] = useState(false);
  const [peek, setPeek] = useState(false);
  const noiRef = useRef<ViewRef>(null);
  const game = useRef({
    points: 0,
    finished: false,
    token: 0,
    clock: { start: 0, ms: 1 } as Clock,
    tried: false,
    flashes: 0,
    /** la ronda que acepta toques (vacío: aún no se ha dicho la orden, o ya está resuelta) */
    live: '',
    /** el reloj de la ronda ya corre */
    armed: false,
    peeked: false,
    voice: 0,
    speaking: false,
    requeued: 0,
  });
  const api = useRef({ timeout: () => {}, next: () => {}, begin: () => {}, heard: (_: string) => {} });
  const [onCountdown] = useState(() => () => api.current.begin());
  const bar = useSharedValue(1);

  const r = rounds[i];
  const cmd = r.cmds[Math.min(step, r.cmds.length - 1)];
  const size = Math.round(Math.min(330, width - 40, Math.max(220, height - 360)));
  const k = size / 240;
  // Transcripción: siempre mientras no se sabe leer; después, solo en el primer nivel de la feria y en las dos
  // primeras órdenes de la lección. Al resolver la ronda se enseña siempre, con la traducción.
  const romOn = !reads || (feria ? r.level <= 1 : i < 2 && !r.retry) || phase === 'wait';
  const hidden = r.blind > 0 && phase === 'play' && !peek && !missed && (r.blind === 2 || !heard);

  // ——— Rondas ———

  /** El reloj de la ronda (feria) echa a andar: al decir la orden si se ve, o al acabar el audio si es de oído. */
  const arm = (rr: Round) => {
    const g = game.current;
    if (g.armed || g.live !== rr.key) return;
    g.armed = true;
    setHeard(true);
    if (!feria) return;
    const token = g.token;
    const ms = TIME[rr.level] * (rr.kind === 'double' ? 1.7 : 1);
    g.clock = clockFrom(0, ms);
    bar.set(1);
    bar.set(withTiming(0, { duration: ms, easing: Easing.linear }));
    later(() => {
      if (token === game.current.token) api.current.timeout();
    }, ms);
  };

  /** Dice la orden. Al acabar (o, si la voz no avisa, tras un rato prudente) la ronda de oído se abre. */
  const speak = (rr: Round) => {
    const g = game.current;
    g.voice += 1;
    const id = g.voice;
    const text = textOf(rr);
    g.speaking = true;
    const done = () => {
      // si ya suena otra cosa (se ha pedido repetir), esta no cuenta
      if (game.current.voice !== id) return;
      game.current.voice += 1;
      game.current.speaking = false;
      api.current.heard(rr.key);
    };
    say(text, { onDone: done });
    later(done, 1200 + 150 * text.length);
  };

  const startRound = (idx: number, delay: number) => {
    const rr = rounds[idx];
    const g = game.current;
    g.token += 1;
    g.tried = false;
    g.live = '';
    g.armed = false;
    g.peeked = false;
    const token = g.token;
    bar.set(1);
    // hasta que no se dice la orden, tocar a Noi no cuenta (ni durante el letrero de nivel)
    later(() => {
      if (token !== game.current.token) return;
      game.current.live = rr.key;
      speak(rr);
      if (!rr.blind) arm(rr);
    }, delay + 250);
  };

  const begin = () => {
    setPhase('play');
    startRound(0, 0);
  };

  // la primera orden de la lección suena al empezar
  useEffect(() => {
    if (feria) return;
    const t = setTimeout(() => api.current.begin(), 200);
    return () => clearTimeout(t);
  }, [feria]);

  const finish = () => {
    const g = game.current;
    if (g.finished) return;
    g.finished = true;
    if (!feria) {
      onDone(score.result(g.points));
      return;
    }
    juice.banner('¡Noi está feliz!', `${g.points} puntos`, color.farol);
    juice.burst(undefined, 'corazones', 26, 170);
    fx.fanfare();
    later(() => onDone(score.result(g.points)), 1400);
  };

  const next = () => {
    if (i + 1 >= rounds.length) {
      finish();
      return;
    }
    const nr = rounds[i + 1];
    setI(i + 1);
    setStep(0);
    setMissed(false);
    setHint(null);
    setResult(null);
    setHeard(false);
    setPeek(false);
    setPose('feliz');
    setPhase('play');
    let delay = 0;
    if (feria && nr.level > r.level) {
      const sub = nr.level === 2 ? `De oído, y solo si dice «${NOI_SAYS.th}»` : nr.level === 3 ? 'Órdenes dobles: una y luego otra' : nr.blind === 2 ? 'Solo de oído: ¡sin leer!' : '¡Más rápido!';
      juice.banner(`¡Nivel ${nr.level}!`, sub, color.farol);
      fx.levelup();
      delay = 1400;
    } else if (nr.retry) juice.float(undefined, '¡Otra vez esta!', color.cieloHondo, 24);
    startRound(i + 1, delay);
  };

  /** Lo fallado vuelve: en la feria sustituye a una orden normal de un poco más adelante; en la lección, al final. */
  const requeue = (c: Cmd) => {
    const g = game.current;
    if (g.requeued >= (feria ? 3 : 2)) return;
    if (!feria) {
      // si era la última, ya se está repitiendo ahora mismo: no hace falta otra igual justo detrás
      if (i + 1 >= rounds.length || rounds.some((x) => x.retry && x.cmds[0].th === c.th)) return;
      g.requeued += 1;
      const again: Round = { key: `x${g.requeued}`, cmds: [c], kind: 'normal', level: 1, who: r.who, blind: 1, retry: true };
      setRounds((list) => [...list, again]);
      return;
    }
    const target = rounds.findIndex((x, j) => j >= i + 2 && x.kind === 'normal' && !x.retry && x.cmds[0].th !== c.th);
    if (target < 0) return;
    g.requeued += 1;
    setRounds((list) => list.map((x, j) => (j === target ? { ...x, cmds: [c], retry: true } : x)));
  };

  const gain = (base: number, combo: number, at?: Point) => {
    const g = game.current;
    const mult = Math.min(4, 1 + Math.floor(combo / 4));
    // responder antes de que acabe el audio es lo más rápido que hay; mirar la orden escrita cuesta el bonus
    const rem = !feria || g.peeked ? 0 : g.armed ? left(g.clock) : 1;
    const pts = Math.round((base + rem * 10) * mult);
    g.points += pts;
    setPoints(g.points);
    if (feria) juice.float(lift(at, -40), `+${pts}`, color.azafranHondo, 24);
    return pts;
  };

  const flashZone = (zone: NoiTarget, ok: boolean) => {
    game.current.flashes += 1;
    setFlash({ key: game.current.flashes, boxes: noiBoxes(zone, pose, fine), ok });
  };

  const resultOf = (c: Cmd) => `${c.th} = ${c.es}${c.note ? ` (${c.note})` : ''}`;

  /** Bien: brilla la parte, corazones, la palabra y su traducción, y risitas. */
  const good = (z: NoiTarget, at?: Point) => {
    const g = game.current;
    if (!g.tried) {
      // sabe la parte y, si la orden lo decía, también el lado
      onAnswer(true, idOf(partOf(cmd)));
      const side = idOf(sideOf(cmd));
      if (side) onAnswer(true, side);
    }
    g.tried = false;
    let combo = 0;
    if (missed) fx.ok(1);
    else {
      combo = score.hit(true);
      gain(r.kind === 'double' && step === 1 ? 20 : 10, combo, at);
    }
    flashZone(z, true);
    juice.burst(at, 'corazones', 14, 110);
    juice.ring(at, '#FF8FB1', 80);
    juice.float(lift(at, -8), named(z), color.mohom, 22);
    setJump((j) => j + 1);
    if (combo === 5 || combo === 10) {
      juice.banner(`¡Racha ×${combo}!`, 'Noi está encantada', color.farol);
      fx.sparkle();
    }
    if (r.kind === 'double' && step === 0) {
      // primera mitad de la orden doble: a por la segunda. Noi no cambia de postura (sus manos siguen donde
      // estaban) ni se ríe todavía: la orden puede estar sonando aún.
      setStep(1);
      setMissed(false);
      setHint(null);
      return;
    }
    setPose('celebra');
    // las risitas, solo si la orden ya ha terminado de sonar
    if (combo && combo % 3 === 0 && !g.speaking) later(() => say(GIGGLE), 350);
    g.token += 1;
    g.live = '';
    setPhase('wait');
    setResult({ ok: true, text: resultOf(cmd) });
    later(() => api.current.next(), feria ? 900 : 1300);
  };

  /** Mal: la parte tocada se marca, se dice qué era y (en la lección) se puede volver a probar. */
  const bad = (z: NoiTarget, at?: Point) => {
    const g = game.current;
    const mirror = MIRROR[cmd.target] === z;
    if (!g.tried && !missed) {
      // si ha tocado la del otro lado, la parte se la sabe: lo que baila es izquierda y derecha
      onAnswer(false, idOf(mirror ? sideOf(cmd) : partOf(cmd)));
      score.hit(false);
      requeue(cmd);
    } else fx.bad();
    g.tried = true;
    flashZone(z, false);
    juice.shake(5);
    if (z === 'trunk') {
      juice.burst(at, 'gotas', 16, 120);
      juice.float(lift(at, -10), '¡ฮัดชิ่ว! ¡Achís!', color.cieloHondo, 24);
      fx.boom();
    } else juice.float(lift(at, -8), named(z), color.lacaHondo, 20);
    setPose('ups');
    later(() => setPose((p) => (p === 'ups' ? 'feliz' : p)), 900);
    setMissed(true);
    setHint(mirror ? 'Ojo: su izquierda es tu derecha' : `Has tocado ${THE[z]}.`);
    if (feria) {
      // en la feria se pierde la orden: se ve cuál era y se sigue
      g.token += 1;
      g.live = '';
      setPhase('wait');
      flashZone(cmd.target, true);
      setResult({ ok: false, text: resultOf(cmd) });
      later(() => api.current.next(), 1500);
    }
  };

  const tap = (z: NoiTarget, at?: Point) => {
    const g = game.current;
    if (r.kind === 'trick') {
      // ¡no lo dijo Noi!
      g.token += 1;
      g.live = '';
      setPhase('wait');
      onAnswer(false);
      score.hit(false);
      juice.shake(8);
      juice.float(lift(at, -10), '¡Te pillé!', color.lacaHondo, 26);
      setPose('celebra');
      setResult({ ok: false, text: r.who ? `Lo dijo ${r.who.es.replace(' dice', '')}, no Noi: ¡no se tocaba!` : `No dijo «${NOI_SAYS.th}»: ¡no se tocaba!` });
      later(() => api.current.next(), 1700);
      return;
    }
    if (z === cmd.target || WITHIN[cmd.target]?.includes(z)) good(cmd.target, at);
    else bad(z, at);
  };

  /**
   * Un toque sobre Noi: se mira dónde ha caído en su dibujo y qué parte hay ahí con la pose de ahora mismo.
   * `own`: la parte del botón pulsado, por si el toque no trae posición (un lector de pantalla).
   */
  const onTap = (e: GestureResponderEvent, own?: NoiTarget) => {
    if (phase !== 'play') return;
    const p = tapPoint(e);
    const at = Number.isFinite(p.x) && Number.isFinite(p.y) ? p : undefined;
    measureBox(noiRef).then((box) => {
      // la ronda puede haberse cerrado mientras tanto (se acabó el tiempo): ese toque ya no cuenta
      if (game.current.live !== r.key) return;
      const z = at && box && box.w > 0 && box.h > 0 ? hitNoi(((at.x - box.x) / box.w) * 240, ((at.y - box.y) / box.h) * 240, pose, r.kind === 'trick' ? null : cmd.target, fine) : (own ?? null);
      if (z) tap(z, at);
    });
  };

  /** Se acabó el tiempo: en una trampa es un acierto; si no, se ve cuál era. */
  const timeout = () => {
    const g = game.current;
    g.token += 1;
    g.live = '';
    setPhase('wait');
    if (r.kind === 'trick') {
      onAnswer(true);
      const pts = gain(15, score.hit(true));
      juice.banner('¡No picaste!', `${r.who ? `Lo dijo ${r.who.es.replace(' dice', '')}` : `Sin «${NOI_SAYS.th}»`} · +${pts}`, color.arrozal);
      setPose('celebra');
      setJump((j) => j + 1);
      setResult({ ok: true, text: r.who ? `${r.who.th} = ${r.who.es}: solo vale Noi` : `Sin «${NOI_SAYS.th}» no se toca` });
      later(() => api.current.next(), 1500);
      return;
    }
    if (!missed) {
      // quedarse sin tiempo no demuestra que no se sepa la palabra: cuenta en la partida, no en el repaso
      onAnswer(false);
      score.hit(false);
      requeue(cmd);
    }
    flashZone(cmd.target, true);
    setPose('ups');
    juice.float(undefined, '¡Tiempo!', color.farol, 28);
    setResult({ ok: false, text: resultOf(cmd) });
    later(() => api.current.next(), 1600);
  };

  /** Mirar la orden escrita en una ronda de oído: se puede, pero sin bonus de rapidez. */
  const look = () => {
    if (phase !== 'play') return;
    game.current.peeked = true;
    setPeek(true);
  };

  useEffect(() => {
    api.current = {
      timeout,
      next,
      begin,
      heard: (key) => {
        if (rounds[i].key === key) arm(rounds[i]);
      },
    };
  });

  const showEs = !feria ? missed || phase === 'wait' : phase === 'wait';
  const who = r.who;
  const parts = noiParts(pose, fine);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="dia" />
      <Animated.View style={[{ flex: 1 }, juice.shakeStyle]}>
        <GameHud label="NOI DICE" i={i + 1} n={rounds.length} points={feria ? points : undefined} combo={score.combo} />

        {/* lo que pide Noi */}
        <View style={styles.bubbleWrap}>
          <Pop trigger={`${r.key}-${step}`} scale={1.06} style={styles.bubble}>
            {hidden ? (
              <View style={[styles.listen, { minHeight: (who ? 84 : 64) + (romOn ? 18 : 0) }]}>
                <Waves on={!heard} />
                <Text style={styles.listenText}>{heard ? '¿Qué has oído?' : '¡Escucha!'}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Ver la orden escrita (sin bonus de rapidez)" onPress={look} style={styles.look} hitSlop={8}>
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="#FFFFFF" stroke={color.tinta3} strokeWidth={2} strokeLinejoin="round" />
                    <Circle cx={12} cy={12} r={3.2} fill={color.tinta3} />
                  </Svg>
                  <Text style={styles.lookText}>ver</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {who ? (
                  <View style={styles.prefix}>
                    <Th size={15} bold style={{ color: '#FFFFFF', lineHeight: 22 }}>
                      {who.th}
                    </Th>
                    {romOn ? <Text style={styles.prefixRom}>{who.rom}</Text> : null}
                  </View>
                ) : (
                  <View style={{ height: 6 }} />
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', columnGap: 8 }}>
                  {r.cmds.map((c, j) => (
                    <View key={j} style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
                      {j > 0 ? (
                        <Th size={20} style={{ color: color.tinta3 }}>
                          {AND_THEN.th}
                        </Th>
                      ) : null}
                      <View style={[styles.cmd, r.kind === 'double' && j === step && phase === 'play' ? styles.cmdNow : null, r.kind === 'double' && j < step ? styles.cmdDone : null]}>
                        <Th size={r.cmds.length > 1 ? 26 : 34} bold>
                          {c.th}
                        </Th>
                      </View>
                    </View>
                  ))}
                </View>
                {romOn ? <Rom rom={r.cmds.map((c) => c.rom).join(` ${AND_THEN.rom} `)} style={{ textAlign: 'center' }} /> : null}
              </>
            )}
            {showEs ? (
              <Animated.Text entering={FadeIn} style={styles.es}>
                {r.kind === 'trick' ? `${who ? `${who.es}: ` : ''}${r.cmds[0].es}` : `Noi dice: ${r.cmds.map((c) => c.es).join(' y luego ')}`}
              </Animated.Text>
            ) : null}
            {feria ? (
              <View style={{ alignSelf: 'stretch', flexDirection: 'row', marginTop: 8, paddingHorizontal: 8 }}>
                <DrainBar value={bar} height={7} />
              </View>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Repetir la orden" onPress={() => speak(r)} style={styles.replay} hitSlop={8}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="M4 9v6h4l5 4V5L8 9H4z" fill={color.cieloHondo} />
                <Path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" stroke={color.cieloHondo} strokeWidth={2.2} strokeLinecap="round" fill="none" />
              </Svg>
            </Pressable>
          </Pop>
          <View style={styles.tail} />
        </View>

        {/* Noi en su colina */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View ref={noiRef} collapsable={false} style={{ width: size, height: size }}>
            <Hill size={size} />
            <Noi pose={pose} size={size} jump={jump} />
            {flash ? <ZoneFlash key={flash.key} boxes={flash.boxes} ok={flash.ok} k={k} /> : null}
            {/* un toque en cualquier sitio de Noi: la geometría dice qué parte es */}
            <Pressable accessible={false} onPress={(e) => onTap(e)} style={StyleSheet.absoluteFill} />
            {/* y cada parte, con su nombre, para quien la recorre con un lector de pantalla */}
            {parts.map((part, j) => (
              <Pressable
                key={`${part.id}-${j}`}
                accessibilityRole="button"
                accessibilityLabel={`Noi: ${LABEL[part.id]}`}
                onPress={(e) => onTap(e, part.id)}
                style={[
                  { position: 'absolute', left: part.box.x * k, top: part.box.y * k, width: part.box.w * k, height: part.box.h * k },
                  DEBUG_ZONES ? { borderWidth: 1, borderColor: 'red' } : null,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          {result ? (
            <Animated.View entering={FadeInDown.springify().damping(14)} style={[styles.result, { backgroundColor: result.ok ? color.arrozalSuave : color.lacaSuave, borderColor: result.ok ? color.arrozalVivo : color.laca }]}>
              <Pop trigger={result}>
                <Text style={[styles.resultText, { color: result.ok ? color.arrozalHondo : color.lacaHondo }]}>{result.text}</Text>
              </Pop>
            </Animated.View>
          ) : hint ? (
            <Animated.Text entering={FadeIn} style={styles.hint}>
              {hint}
            </Animated.Text>
          ) : (
            <Text style={styles.tip}>{feria ? 'Si no dice «น้อยบอกว่า», ¡no toques!' : 'Escucha y toca. Su izquierda es tu derecha.'}</Text>
          )}
        </View>
      </Animated.View>
      {phase === 'intro' ? <Countdown onDone={onCountdown} /> : null}
      {juice.layer}
    </View>
  );
}

/** Ondas de sonido mientras Noi habla y la orden aún no se ve. */
function Waves({ on }: { on: boolean }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0.3);
  useEffect(() => {
    t.value = on && !reduced ? withRepeat(withTiming(1, { duration: 380, easing: Easing.inOut(Easing.sin) }), -1, true) : withTiming(0.3, { duration: 200 });
  }, [on, reduced, t]);
  return (
    <View style={styles.waves}>
      {[0.55, 1, 0.75, 1, 0.55].map((h, j) => (
        <WaveBar key={j} t={t} h={h} odd={j % 2 === 1} />
      ))}
    </View>
  );
}

function WaveBar({ t, h, odd }: { t: SharedValue<number>; h: number; odd: boolean }) {
  const st = useAnimatedStyle(() => ({ height: 6 + 24 * h * (odd ? t.value : 1.15 - t.value * 0.75) }));
  return <Animated.View style={[styles.waveBar, st]} />;
}

/** Colina de hierba con flores bajo los pies de Noi. */
function Hill({ size }: { size: number }) {
  const u = `hl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const flowers = [
    [36, 222, '#FFFFFF'],
    [58, 230, '#FFD23F'],
    [186, 226, '#FF9EC0'],
    [206, 218, '#FFFFFF'],
    [24, 234, '#C9B6FF'],
    [218, 236, '#FFD23F'],
  ] as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={`${u}g`} cx="50%" cy="30%" r="70%">
          <Stop offset="0" stopColor="#B4E58A" />
          <Stop offset="1" stopColor="#5DAA55" />
        </RadialGradient>
        <LinearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={120} cy={236} rx={118} ry={26} fill={`url(#${u}g)`} />
      <Ellipse cx={120} cy={222} rx={80} ry={8} fill={`url(#${u}s)`} />
      {flowers.map(([x, y, c], j) => (
        <Circle key={j} cx={x} cy={y} r={3.2} fill={c} />
      ))}
    </Svg>
  );
}

/** Brillo sobre la parte de Noi que se ha tocado (verde si era, rojo si no). */
function ZoneFlash({ boxes, ok, k }: { boxes: Box[]; ok: boolean; k: number }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(0);
  const s = useSharedValue(0.7);
  useEffect(() => {
    o.value = withSequence(withTiming(1, { duration: 120 }), withDelay(ok ? 500 : 300, withTiming(0, { duration: 420 })));
    s.value = reduced ? 1 : withSpring(1, { damping: 8, stiffness: 220 });
    if (!reduced && ok) s.value = withSequence(withSpring(1.12, { damping: 6, stiffness: 260 }), withRepeat(withTiming(1, { duration: 260 }), 2, true));
  }, [o, s, ok, reduced]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  const tint = ok ? 'rgba(255,214,90,0.5)' : 'rgba(255,90,80,0.35)';
  return (
    <>
      {boxes.map((b, j) => (
        <Animated.View
          key={j}
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: b.x * k - 6,
              top: b.y * k - 6,
              width: b.w * k + 12,
              height: b.h * k + 12,
              borderRadius: Math.min(b.w, b.h) * k,
              backgroundColor: tint,
              borderWidth: 3,
              borderColor: ok ? '#FFD23F' : '#FF6A5A',
              shadowColor: ok ? '#FFD23F' : '#FF6A5A',
              shadowOpacity: 0.9,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 0 },
            },
            st,
          ]}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { paddingHorizontal: 16, paddingTop: 2, alignItems: 'center' },
  bubble: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#1D2347',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  tail: { width: 22, height: 22, marginTop: -12, backgroundColor: 'rgba(255,255,255,0.96)', transform: [{ rotate: '45deg' }], borderRadius: 4 },
  prefix: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#E5728E', marginBottom: 2 },
  prefixRom: { fontFamily: font.uiBold, fontSize: 12, color: '#FFE3EA' },
  cmd: { paddingHorizontal: 8, borderRadius: 12 },
  cmdNow: { backgroundColor: 'rgba(255,214,90,0.45)', borderWidth: 2, borderColor: color.buatong },
  cmdDone: { opacity: 0.45 },
  es: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta2, marginTop: 2, textAlign: 'center' },
  listen: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 2 },
  listenText: { fontFamily: font.displayBold, fontSize: 22, color: color.cieloHondo },
  waves: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 5 },
  waveBar: { width: 6, borderRadius: 3, backgroundColor: color.cielo },
  look: { position: 'absolute', left: -6, top: 0, height: 30, paddingHorizontal: 9, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.niebla2 },
  lookText: { fontFamily: font.uiHeavy, fontSize: 12, color: color.tinta3 },
  replay: { position: 'absolute', right: 10, top: 10, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: color.cieloSuave },
  footer: { minHeight: 64, paddingHorizontal: 20, paddingBottom: 18, alignItems: 'center', justifyContent: 'center' },
  result: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, borderWidth: 2 },
  resultText: { fontFamily: font.uiHeavy, fontSize: 15, textAlign: 'center' },
  hint: { fontFamily: font.uiHeavy, fontSize: 15, color: color.lacaHondo, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, overflow: 'hidden' },
  tip: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta2, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
});
