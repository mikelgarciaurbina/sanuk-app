// Juego 7 · Trompa de tonos: suena una sílaba y eliges su tono con las cinco teclas de colores. Mientras
// no respondes solo hay sonido: la palabra, su significado y su curva salen después (si se vieran antes
// bastaría con acordarse de la ficha, y esto es para el oído). Al responder, la trompa de Noi dibuja en el
// aire la curva del tono mientras vuelve a sonar (y, si fallaste, la que elegiste al lado para comparar).
// Las primeras veces empieza explicando qué es un tono: «maa / máa / mǎa = venir / caballo / perro» y las
// cinco melodías ancladas a cosas que ya se hacen al hablar español; después, un recordatorio de dos
// segundos. En la feria se empieza con dos tonos y se sube hasta los cinco, con racha y bonus de rapidez
// (que solo cuenta cuando la sílaba ha terminado de sonar).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, ZoomIn, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { NoiPose } from '@/brand/noi-art';
import { color, font, tones, type ToneId } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import { knownForms } from '@/content';
import { toneBankFor, type MiniWord } from '@/content/drills';
import { CONSONANTS } from '@/content/letters';
import type { Word } from '@/content/types';
import { fx } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { tonesOf } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { Countdown, Glow, Pop, Press3D, tapPoint, useJuice } from './fx';
import { useScore } from './kit';
import { Contour, Melody, TONE_ANCHOR, TONE_HOW, TONE_ORDER } from './tonos/curva';
import { Badge, CardSkin, Fuse, Medallion, NextButton, SKINS, SlowPill, Tag, TopBar, medalOf, type Mark } from './tonos/piezas';
import { useTimers, useVoice } from './tonos/voz';
import type { GameProps } from './types';

type Item = { id?: string; th: string; rom: string; es: string; emoji?: string; tone: ToneId };
type Round = { item: Item; choices: ToneId[]; level: number; retry?: boolean };
/** boot = mirando si ya se vio la explicación · intro = la explicación entera · recall = el recordatorio corto */
type Phase = 'boot' | 'intro' | 'recall' | 'count' | 'deal' | 'play' | 'done' | 'out';
type KeyState = 'idle' | 'ok' | 'bad' | 'dim' | 'off' | 'sleep';

/** Feria: de dos tonos a los cinco, siempre de oído. El último nivel es el de la lección. */
const LEVELS = [
  { name: '¡Nivel 1!', sub: 'Elige entre dos tonos', n: 2, base: 10 },
  { name: '¡Nivel 2!', sub: 'Ahora, entre tres', n: 3, base: 15 },
  { name: '¡Nivel 3!', sub: 'Cuatro tonos', n: 4, base: 20 },
  { name: '¡Nivel 4!', sub: '¡Los cinco tonos!', n: 5, base: 30 },
  { name: '', sub: 'Los cinco tonos', n: 5, base: 20 },
];

/** Con qué se confunde cada tono, de más a menos: el alto con el ascendente (los dos acaban arriba), el medio
 *  con el bajo (los dos van planos), el descendente con el bajo (los dos acaban abajo)… */
const NEAR: Record<ToneId, ToneId[]> = { M: ['L', 'H', 'F', 'R'], L: ['M', 'F', 'R', 'H'], F: ['L', 'H', 'M', 'R'], H: ['R', 'M', 'F', 'L'], R: ['H', 'L', 'M', 'F'] };
/** El tono que mejor se distingue de cada uno (para las primeras rondas, de calentamiento). */
const FAR: Record<ToneId, ToneId> = { M: 'R', L: 'H', F: 'R', H: 'L', R: 'F' };

/** «La melodía cambia la palabra»: la misma sílaba con tres tonos, tres palabras del camino. */
const TRIO: MiniWord[] = [
  { th: 'มา', rom: 'maa', es: 'venir', emoji: '👋' },
  { th: 'ม้า', rom: 'máa', es: 'caballo', emoji: '🐴' },
  { th: 'หมา', rom: 'mǎa', es: 'perro', emoji: '🐶' },
];

/** Una misma sílaba, «khaa», con los cinco tonos (cinco palabras de verdad): solo cambia la melodía. */
const MODEL: Record<ToneId, MiniWord> = {
  M: { th: 'คา', rom: 'khaa', es: 'quedarse atascado' },
  L: { th: 'ข่า', rom: 'khàa', es: 'galanga' },
  F: { th: 'ค่า', rom: 'khâa', es: 'precio' },
  H: { th: 'ค้า', rom: 'kháa', es: 'comerciar' },
  R: { th: 'ขา', rom: 'khǎa', es: 'pierna' },
};
const SHORT: Record<ToneId, string> = { M: 'medio', L: 'bajo', F: 'desc.', H: 'alto', R: 'asc.' };

/** Cuántas veces se da la explicación entera antes de dejarla en un recordatorio. */
const INTRO_TIMES = 2;
const INTRO_KEY = 'sanuk:tonos:intro';

const MAI: Record<string, string> = { '่': 'mai ek', '้': 'mai tho' };

/** Regla de tono solo cuando se puede deducir con seguridad: consonante inicial + una marca (mai ek / mai tho). */
function ruleHint(item: Item): string | undefined {
  const m = item.th.match(/^[เแโไใ]?([ก-ฮ])[ะาิีึืุูัำ็ๅ]*([่้])/);
  if (!m) return undefined;
  const cls = CONSONANTS.find((c) => c.ch === m[1])?.cls;
  if (!cls) return undefined;
  const ek = m[2] === '่';
  const derived: ToneId = ek ? (cls === 'baja' ? 'F' : 'L') : cls === 'baja' ? 'H' : 'F';
  if (derived !== item.tone) return undefined;
  return `${m[1]} (consonante ${cls}) + ${MAI[m[2]]} ${m[2]} = tono ${tones[derived].name.toLowerCase()}.`;
}

/**
 * Las teclas de una ronda: el tono que suena y aquellos con los que más se confunde (no al azar). `warm`: en las
 * primeras rondas entra también el que mejor se distingue, para coger confianza.
 */
function choicesFor(tone: ToneId, n: number, warm = false): ToneId[] {
  if (n >= 5) return TONE_ORDER;
  const near = NEAR[tone];
  // casi siempre las confusiones más probables; a veces la primera y otra cualquiera, para que no sea siempre igual
  const rest = Math.random() < 0.65 ? near : [near[0], ...shuffle(near.slice(1))];
  const list = warm ? [FAR[tone], ...rest.filter((t) => t !== FAR[tone])] : rest;
  return [tone, ...list.slice(0, n - 1)];
}

/** Una palabra suelta de una sílaba (sin moldes ni dobles formas: «ค่ะ/ครับ», «ทั้ง…และ…»). */
const mono = (w: { th: string; rom: string }) => tonesOf(w.rom).length === 1 && !/[\s/…()]/.test(w.th);
const toItem = (w: Word | MiniWord, id?: string): Item => ({ id, th: w.th, rom: w.rom, es: w.es, emoji: w.emoji, tone: tonesOf(w.rom)[0] });

function plan(mode: GameProps['mode'], words: Word[], focus: Word[], rounds: number): Round[] {
  const seen = new Set<string>();
  const uniq = (list: Item[]) => list.filter((it) => !seen.has(it.th) && (seen.add(it.th), true));
  const F = uniq(shuffle(focus.filter(mono).map((w) => toItem(w, w.id))));
  // sílabas de práctica: las palabras de una sílaba ya presentadas y, del banco, solo las que se conocen
  const R = uniq(shuffle([...words.filter(mono).map((w) => toItem(w, w.id)), ...toneBankFor(knownForms([...words, ...focus])).map((w) => toItem(w))]));
  const used: Item[] = [];
  const takeFrom = (list: Item[], ok: (it: Item) => boolean) => {
    const k = list.findIndex(ok);
    return k >= 0 ? list.splice(k, 1)[0] : undefined;
  };
  // las palabras de la lección van primero si el tono es de los que hay en la bolsa
  const take = (tone?: ToneId) => takeFrom(F, (it) => !tone || it.tone === tone) ?? takeFrom(R, (it) => !tone || it.tone === tone);
  const out: Round[] = [];
  let bag: ToneId[] = [];
  for (let i = 0; i < rounds; i++) {
    const last = out[out.length - 1]?.item;
    const prev = last?.tone;
    // con pocas sílabas se vuelve a empezar la vuelta (barajadas y sin repetir la de la ronda anterior)
    if (!F.length && !R.length) {
      const again = used.splice(0);
      R.push(...shuffle(again.filter((it) => it !== last)));
      if (last && again.includes(last)) used.push(last);
    }
    // en la lección, una palabra nueva cuando su tono no repite el anterior; si no, un tono variado
    let item = mode === 'leccion' ? takeFrom(F, (it) => it.tone !== prev) : undefined;
    for (let tries = 0; tries < 6 && !item; tries++) {
      if (!bag.length) bag = shuffle(TONE_ORDER);
      const t = bag.pop();
      if (t === prev) continue;
      item = take(t);
    }
    item ??= take();
    if (!item) break;
    used.push(item);
    const level = mode === 'feria' ? Math.min(3, Math.floor((i / Math.max(1, rounds)) * 4)) : i < 2 ? 1 : 4;
    out.push({ item, level, choices: choicesFor(item.tone, LEVELS[level].n, mode === 'feria' ? i < 2 : i === 0) });
  }
  return out;
}

/** Mezcla dos colores (#rrggbb). */
function mix(a: string, b: string, k: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * k);
  return `#${((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, '0')}`;
}

/** Juego 7 · Trompa de tonos: escucha una sílaba y elige su tono. */
export default function Tonos({ mode, words, focus, rounds, reads = false, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const voice = useVoice();
  const timers = useTimers();
  const { height: winH } = useWindowDimensions();
  const compact = winH < 760;

  const [queue, setQueue] = useState(() => plan(mode, words, focus, rounds ?? (feria ? 12 : 4)));
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('boot');
  const [pick, setPick] = useState<ToneId | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [points, setPoints] = useState(0);
  const [pose, setPose] = useState<NoiPose>('hola');
  const [jump, setJump] = useState(0);
  const [drawn, setDrawn] = useState<ToneId | null>(null);
  const [ghost, setGhost] = useState<ToneId | null>(null);
  // la explicación: página (0 = «la melodía cambia la palabra» · 1 = las cinco melodías), qué carta o tono suena
  const [page, setPage] = useState(0);
  const [trio, setTrio] = useState({ k: -1, n: 0, ms: 600 });
  const [demo, setDemo] = useState<ToneId | null>(null);
  const [chart, setChart] = useState(true);
  const [hold, setHold] = useState(false);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const pointsRef = useRef(0);
  const retries = useRef(0);
  const finished = useRef(false);
  const introOn = useRef(false);
  const introSeen = useRef(0);
  const decided = useRef(false);
  const roundId = useRef(0);
  const speed = useRef(0);

  const draw = useSharedValue(0);
  const fuse = useSharedValue(0);

  const r = queue[i];

  /** Dice algo y, si `tone`, la trompa dibuja su curva a la vez. */
  const sayDrawing = (w: { th: string; rom: string }, tone: ToneId | null, o: { slow?: boolean; onEnd?: () => void } = {}) => {
    if (tone) {
      setDrawn(tone);
      draw.set(0);
    }
    voice.speak(w.th, {
      rom: w.rom,
      slow: o.slow,
      onStart: (ms) => {
        if (tone) draw.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: Math.max(520, ms * 0.92), easing: Easing.inOut(Easing.quad) })));
      },
      onEnd: o.onEnd,
    });
  };

  // ——— La explicación (las primeras veces): la melodía cambia la palabra, y hay cinco melodías ———

  /** Suena una de las tres palabras de «maa» y su carta dibuja la curva. */
  const playTrio = (k: number, onEnd?: () => void) => {
    const w = TRIO[k];
    voice.speak(w.th, {
      rom: w.rom,
      onStart: (ms) => setTrio((t) => ({ k, n: t.n + 1, ms })),
      onEnd: () => {
        setTrio((t) => (t.k === k ? { ...t, k: -1 } : t));
        onEnd?.();
      },
    });
  };
  const runTrio = (k: number) => {
    if (!introOn.current) return;
    if (k >= TRIO.length) {
      introOn.current = false;
      return;
    }
    playTrio(k, () => timers.later(() => runTrio(k + 1), 480));
  };

  /** Suena el ejemplo de un tono, en grande (al tocar su tecla en la explicación o en el recordatorio). */
  const playModel = (t: ToneId) => {
    introOn.current = false;
    setHold(true);
    setChart(false);
    setDemo(t);
    setGhost(null);
    sayDrawing(MODEL[t], t);
  };
  /** Los cinco tonos, uno tras otro, quedan dibujados en fila. */
  const runFive = (k: number) => {
    if (!introOn.current) return;
    if (k >= TONE_ORDER.length) {
      introOn.current = false;
      setDemo(null);
      return;
    }
    const t = TONE_ORDER[k];
    setDemo(t);
    voice.speak(MODEL[t].th, {
      rom: MODEL[t].rom,
      onStart: (ms) =>
        draw.set(withSequence(withTiming(k / 5, { duration: 0 }), withTiming((k + 1) / 5, { duration: Math.max(520, ms * 0.92), easing: Easing.inOut(Easing.quad) }))),
      onEnd: () => timers.later(() => runFive(k + 1), 600),
    });
  };

  const openIntro = () => {
    voice.stop();
    timers.clear();
    setHold(true);
    setDemo(null);
    setPage(0);
    setPose('hola');
    setPhase('intro');
    introOn.current = true;
    timers.later(() => runTrio(0), 650);
  };
  const toFive = () => {
    voice.stop();
    timers.clear();
    setTrio((t) => ({ ...t, k: -1 }));
    setPage(1);
    setChart(true);
    setDemo(null);
    draw.set(0);
    introOn.current = true;
    timers.later(() => runFive(0), 500);
  };

  // al entrar: la explicación entera las primeras veces; después, un recordatorio (lección) o la cuenta atrás (feria)
  const decide = useEffectEvent((seen: number) => {
    if (decided.current || !queue.length) return;
    decided.current = true;
    introSeen.current = seen;
    if (seen < INTRO_TIMES) openIntro();
    else if (feria) {
      setPose('escucha');
      setPhase('count');
    } else {
      setChart(true);
      setHold(false);
      draw.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
      setPhase('recall');
    }
  });
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(INTRO_KEY)
      .then((v) => alive && decide(Number(v) || 0))
      .catch(() => alive && decide(0));
    // si el almacenamiento no contesta, mejor explicar de más que quedarse esperando
    const t = setTimeout(() => alive && decide(0), 700);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  const startGame = () => {
    if (phase === 'intro') {
      // una explicación entera más vista
      introSeen.current += 1;
      AsyncStorage.setItem(INTRO_KEY, String(introSeen.current)).catch(() => {});
    }
    introOn.current = false;
    voice.stop();
    timers.clear();
    setDemo(null);
    setChart(false);
    setDrawn(null);
    draw.set(0);
    setPose('escucha');
    setPhase('deal');
  };

  // ——— Cada ronda: banner si cambia el nivel, y suena la sílaba ———
  const playRound = (slow = false) => {
    if (!r) return;
    const id = roundId.current;
    voice.speak(r.item.th, {
      rom: r.item.rom,
      slow,
      onEnd: () => {
        if (!feria || roundId.current !== id || speed.current) return;
        // el bonus de rapidez empieza cuando la sílaba ha sonado entera: +10 los primeros 2 s, +5 hasta los 4 s
        speed.current = 10;
        fuse.set(withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 4000, easing: Easing.linear })));
        timers.later(() => {
          if (roundId.current === id && speed.current > 0) speed.current = 5;
        }, 2000);
        timers.later(() => {
          if (roundId.current === id) speed.current = -1;
        }, 4000);
      },
    });
  };

  const startRound = useEffectEvent(() => {
    if (!r) return;
    roundId.current += 1;
    speed.current = 0;
    fuse.set(0);
    const prev = queue[i - 1];
    let wait = 250;
    if (feria && (!prev || prev.level !== r.level)) {
      wait = 900;
      timers.later(() => {
        if (prev) fx.levelup();
        juice.banner(LEVELS[r.level].name, LEVELS[r.level].sub, color.laca);
      }, 60);
    }
    timers.later(() => {
      setPhase('play');
      playRound(false);
    }, wait);
  });
  useEffect(() => {
    if (phase === 'deal') startRound();
  }, [phase, i]);

  const bail = useEffectEvent(() => onDone(score.result(0)));
  useEffect(() => {
    if (!queue.length) bail();
  }, [queue.length]);

  if (!r) return null;

  const level = LEVELS[r.level];

  const answer = (t: ToneId, e: GestureResponderEvent) => {
    if (phase !== 'play') return;
    const ok = t === r.item.tone;
    setPick(t);
    setPhase('done');
    const combo = score.hit(ok);
    onAnswer(ok, r.item.id);
    setMarks((m) => [...m, ok ? 'ok' : 'bad']);
    const at = tapPoint(e);
    if (ok) {
      let pts = 0;
      if (feria) {
        // responder antes de que acabe de sonar es adivinar: sin bonus de rapidez
        const quick = Math.max(0, speed.current);
        pts = level.base + quick + (combo >= 3 ? 5 : 0);
        pointsRef.current += pts;
        setPoints(pointsRef.current);
        if (quick >= 10) timers.later(() => juice.float({ x: at.x, y: at.y - 50 }, '¡Rápido!', color.laca, 22), 240);
      }
      juice.celebrate(at, feria ? `+${pts}` : '¡Eso es!', 'chispas');
      juice.burst(at, 'estrellas', 10, 90);
      if (combo >= 5 && combo % 5 === 0) timers.later(() => juice.banner(`¡Racha de ${combo}!`, 'Oído de músico', color.farol), 500);
      setPose('celebra');
      setJump((j) => j + 1);
      setGhost(null);
    } else {
      juice.shake();
      setPose('ups');
      setGhost(t);
      // la sílaba fallada vuelve un poco más tarde, con el nivel de las rondas de su alrededor
      if (retries.current < (feria ? 3 : 2)) {
        retries.current += 1;
        const p = Math.min(i + 3, queue.length);
        const lv = feria ? (queue[p] ?? queue[queue.length - 1]).level : r.level;
        const again: Round = { ...r, retry: true, level: lv, choices: choicesFor(r.item.tone, LEVELS[lv].n) };
        setQueue([...queue.slice(0, p), again, ...queue.slice(p)]);
      }
    }
    speed.current = -1;
    timers.later(() => sayDrawing(r.item, r.item.tone), ok ? 420 : 560);
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    voice.stop();
    // nada de lo pendiente (repetir la palabra, un cartel) suena ya sobre la despedida
    timers.clear();
    if (!feria) {
      onDone(score.result());
      return;
    }
    setPhase('out');
    fx.fanfare();
    juice.banner('¡Oído de músico!', `${pointsRef.current} puntos`, color.laca);
    juice.burst(undefined, 'confeti', 30, 170);
    timers.later(() => onDone(score.result(pointsRef.current)), 1500);
  };

  const next = () => {
    if (phase !== 'done') return;
    if (i + 1 >= queue.length) {
      finish();
      return;
    }
    voice.stop();
    // lo que quedara pendiente de esta ronda (la sílaba que iba a repetirse, un cartel) no se cuela en la siguiente
    timers.clear();
    setPhase('out');
    timers.later(() => {
      setPick(null);
      setGhost(null);
      setDrawn(null);
      draw.set(0);
      setPose('escucha');
      setI((v) => v + 1);
      setPhase('deal');
    }, 280);
  };

  const trioPage = phase === 'intro' && page === 0;
  const fivePage = (phase === 'intro' && page === 1) || phase === 'recall';
  const teaching = phase === 'intro' || phase === 'recall';

  const keyState = (t: ToneId): KeyState => {
    if (phase === 'boot' || trioPage) return 'sleep';
    if (teaching) return 'idle';
    if (!r.choices.includes(t)) return 'off';
    if (phase !== 'done' && phase !== 'out') return 'idle';
    if (t === r.item.tone) return 'ok';
    if (t === pick) return 'bad';
    return 'dim';
  };

  const answered = phase === 'done' || (phase === 'out' && pick !== null);
  const ok = answered && pick === r.item.tone;
  // lo que dibuja la trompa: el tono de la sílaba o, al comparar, el ejemplo del tono que elegiste
  const shownTone = fivePage ? demo : answered ? (drawn ?? r.item.tone) : null;
  const comparing = answered && !!ghost && drawn === ghost;
  const dashed = teaching ? null : comparing ? r.item.tone : ghost;
  // la regla de escritura (clase de la consonante + marca) solo dice algo a quien ya ha aprendido las letras
  const rule = answered && reads ? ruleHint(r.item) : undefined;

  const boardH = compact ? 214 : 262;
  const keyH = compact ? 62 : 70;
  const noiSize = Math.min(132, area.h * 1.05 || 120);
  const small = fivePage && chart;
  const cardW = area.w > 0 ? (area.w - 16) / 3 : 0;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="templo" />
      <Animated.View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }, juice.shakeStyle]}>
        <TopBar marks={marks} total={queue.length} points={feria ? points : undefined} combo={score.combo} />

        {/* el tablero: el aire donde la trompa de Noi dibuja */}
        <View style={[styles.board, { height: boardH }]}>
          <View style={styles.boardShine} />
          {feria ? <Fuse value={fuse} on={phase === 'play'} style={styles.fuse} /> : null}
          <View style={styles.boardTop}>
            {trioPage ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ marginLeft: -8, marginVertical: -8 }}>
                  <Noi pose="hola" size={58} accessibilityLabel="Noi explica los tonos" />
                </View>
                <Text style={[styles.introTitle, { flex: 1 }]} numberOfLines={2}>
                  En thai, la melodía cambia la palabra
                </Text>
              </View>
            ) : fivePage ? (
              <View style={{ flex: 1 }}>
                <Text style={[styles.introTitle, demo ? { color: tones[demo].text } : null]} numberOfLines={1}>
                  {demo ? `Tono ${tones[demo].name.toLowerCase()}` : phase === 'recall' ? 'Recuerda: cinco melodías' : 'Hay cinco melodías'}
                </Text>
                <Text style={styles.introSub} numberOfLines={1}>
                  {demo ? TONE_ANCHOR[demo] : phase === 'recall' ? 'Cada una convierte la sílaba en otra palabra' : 'La misma sílaba, «khaa», cantada de cinco maneras'}
                </Text>
              </View>
            ) : answered ? (
              <Animated.View key={`w${i}`} entering={ZoomIn.springify().damping(13)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Th size={r.item.th.length > 5 ? 30 : 36} bold>
                  {r.item.th}
                </Th>
                <View style={{ flexShrink: 1 }}>
                  <Rom rom={r.item.rom} size={17} />
                  <Text style={styles.es} numberOfLines={2}>
                    {r.item.emoji ? `${r.item.emoji} ` : ''}
                    {r.item.es}
                  </Text>
                </View>
              </Animated.View>
            ) : phase === 'boot' ? (
              <View style={{ flex: 1 }} />
            ) : (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.earDot}>
                  <Icon name="speaker" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.earOnly} numberOfLines={1}>
                    ¿Qué melodía es?
                  </Text>
                  <Text style={styles.introSub} numberOfLines={1}>
                    Solo de oído: la palabra sale después
                  </Text>
                </View>
              </View>
            )}
            {!teaching && phase !== 'boot' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <SlowPill label="" onPress={() => (answered ? sayDrawing(r.item, r.item.tone, { slow: true }) : playRound(true))} />
                <Press3D onPress={() => (answered ? sayDrawing(r.item, r.item.tone) : playRound(false))} style={{ width: 48, height: 48 }} depth={16} accessibilityLabel="Escuchar otra vez">
                  <View style={styles.speaker}>
                    <Icon name="speaker" size={24} color="#FFFFFF" />
                  </View>
                </Press3D>
              </View>
            ) : null}
          </View>

          <View style={{ flex: 1 }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {area.w <= 0 || phase === 'boot' ? null : trioPage ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {TRIO.map((w, k) => (
                  <IntroCard
                    key={w.th}
                    word={w}
                    width={cardW}
                    height={Math.min(170, area.h - 4)}
                    playing={trio.k === k}
                    drawN={trio.k === k ? trio.n : 0}
                    drawMs={trio.ms}
                    onPress={() => {
                      introOn.current = false;
                      playTrio(k);
                    }}
                  />
                ))}
              </View>
            ) : (
              <>
                <View style={{ position: 'absolute', left: -12, top: small ? area.h - noiSize * 0.86 : area.h / 2 - noiSize * 0.56 }}>
                  <Noi pose={teaching ? (demo ? 'feliz' : 'hola') : pose} size={small ? noiSize * 0.78 : noiSize} jump={jump} accessibilityLabel="Noi dibuja con la trompa" />
                </View>
                <View style={{ position: 'absolute', left: small ? noiSize * 0.6 : noiSize * 0.5, top: 0 }}>
                  {small ? (
                    <Melody
                      tones={TONE_ORDER}
                      labels={TONE_ORDER.map((t) => (phase === 'recall' ? SHORT[t] : MODEL[t].rom))}
                      width={area.w - noiSize * 0.6}
                      height={area.h}
                      progress={draw}
                      axis
                      stroke={compact ? 6 : 7}
                    />
                  ) : shownTone ? (
                    <Melody tones={[shownTone]} ghost={dashed} width={area.w - noiSize * 0.5} height={area.h} progress={draw} axis stroke={compact ? 8 : 10} />
                  ) : (
                    <Melody tones={[]} width={area.w - noiSize * 0.5} height={area.h} progress={draw} axis stroke={compact ? 8 : 10} />
                  )}
                  <MysteryWave active={voice.talking && !answered && !teaching} width={area.w - noiSize * 0.5} height={area.h} />
                </View>
              </>
            )}
          </View>

          <View style={styles.boardFoot}>
            {trioPage ? (
              <Text style={styles.punch} numberOfLines={1}>
                Misma sílaba, otra melodía… ¡otra palabra!
              </Text>
            ) : fivePage ? (
              demo ? (
                <Animated.View key={demo} entering={FadeIn.duration(220)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Contour tone={demo} size={26} />
                  <Text style={[styles.toneName, { color: tones[demo].text }]} numberOfLines={1}>
                    {MODEL[demo].th} {MODEL[demo].rom}
                  </Text>
                  <Text style={[styles.toneHow, { flexShrink: 1 }]} numberOfLines={1}>
                    · {MODEL[demo].es}
                  </Text>
                </Animated.View>
              ) : (
                <Text style={styles.toneHow} numberOfLines={1}>
                  Toca una tecla para oír su melodía
                </Text>
              )
            ) : shownTone ? (
              <Animated.View key={`${shownTone}${i}`} entering={FadeIn.duration(220)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Contour tone={shownTone} size={26} />
                <Text style={[styles.toneName, { color: tones[shownTone].text }]} numberOfLines={1}>
                  {comparing ? `Tono ${tones[shownTone].name.toLowerCase()}` : ok ? `¡Tono ${tones[shownTone].name.toLowerCase()}!` : `Era tono ${tones[shownTone].name.toLowerCase()}`}
                </Text>
                <Text style={[styles.toneHow, { flexShrink: 1 }]} numberOfLines={1}>
                  · {TONE_HOW[shownTone]}
                </Text>
              </Animated.View>
            ) : (
              <Text style={styles.toneHow}>{phase === 'play' ? 'Escucha la melodía y elige su tono' : ' '}</Text>
            )}
          </View>
        </View>

        {/* comparar, y a qué suena (o la regla de escritura, para quien ya lee) */}
        <View style={styles.notes}>
          {phase === 'recall' ? (
            <Press3D onPress={openIntro} style={{ height: 36 }} depth={10} accessibilityLabel="Ver la explicación de los tonos otra vez">
              <View style={[styles.compare, { borderColor: color.niebla3 }]}>
                <Icon name="bulb" size={16} color={color.buatongHondo} />
                <Text style={[styles.compareText, { color: color.tinta2 }]}>¿Cómo era? Ver la explicación</Text>
              </View>
            </Press3D>
          ) : null}
          {answered && ghost ? (
            <Press3D onPress={() => sayDrawing(MODEL[ghost], ghost)} style={{ height: 36 }} depth={10} accessibilityLabel={`Escuchar un ejemplo del tono ${tones[ghost].name.toLowerCase()}`}>
              <View style={[styles.compare, { borderColor: tones[ghost].fill }]}>
                <Icon name="speaker" size={16} color={tones[ghost].text} />
                <Text style={[styles.compareText, { color: tones[ghost].text }]} numberOfLines={1}>
                  Elegiste {tones[ghost].name.toLowerCase()}: escúchalo
                </Text>
              </View>
            </Press3D>
          ) : null}
          {rule ? (
            <View style={styles.rule}>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ) : answered ? (
            <Animated.View key={`a${i}`} entering={FadeIn.delay(200).duration(240)} style={styles.rule}>
              <Text style={styles.ruleText} numberOfLines={2}>
                <Text style={{ color: tones[r.item.tone].text, fontFamily: font.uiHeavy }}>{tones[r.item.tone].name}: </Text>
                {TONE_ANCHOR[r.item.tone]}
              </Text>
            </Animated.View>
          ) : null}
          {!answered && !teaching && phase !== 'boot' && r.retry ? <Tag text="Otra vez" tint={color.farol} /> : null}
          {!answered && !teaching && phase !== 'boot' && feria && !r.retry ? <Tag text={level.sub} tint={color.laca} /> : null}
        </View>

        {/* las cinco teclas de tono */}
        <View style={{ gap: 10 }}>
          {[TONE_ORDER.slice(0, 3), TONE_ORDER.slice(3)].map((row, k) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
              {row.map((t) => (
                <ToneKey key={t} tone={t} height={keyH} state={keyState(t)} pulse={fivePage && demo === t} onPress={(e) => (teaching ? playModel(t) : answer(t, e))} />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          {trioPage ? (
            <NextButton label="¿Cuántas hay?" kind="primary" onPress={toFive} />
          ) : phase === 'intro' ? (
            <NextButton label="¡A jugar!" kind="primary" onPress={startGame} />
          ) : phase === 'recall' ? (
            <NextButton label="¡A jugar!" kind="primary" auto={hold ? undefined : 2200} onPress={startGame} />
          ) : phase === 'done' ? (
            <NextButton label={i + 1 >= queue.length ? (feria ? '¡Ver puntos!' : 'Terminar') : 'Siguiente'} kind={ok ? 'ok' : 'primary'} auto={feria && ok ? 1700 : undefined} onPress={next} />
          ) : null}
        </View>
      </Animated.View>
      {phase === 'count' ? <Countdown onDone={() => setPhase('deal')} /> : null}
      {juice.layer}
    </View>
  );
}

/** Una de las tres palabras de «maa»: al sonar, se enciende y dibuja su melodía. */
function IntroCard({ word, width, height, playing, drawN, drawMs, onPress }: { word: MiniWord; width: number; height: number; playing: boolean; drawN: number; drawMs: number; onPress: () => void }) {
  const tone = tonesOf(word.rom)[0];
  const t = tones[tone];
  const p = useSharedValue(0);
  useEffect(() => {
    if (!drawN) return;
    p.value = 0;
    p.value = withTiming(1, { duration: Math.max(520, drawMs * 0.92), easing: Easing.inOut(Easing.quad) });
  }, [drawN, drawMs, p]);
  const big = height >= 150;
  return (
    <View style={{ width, height }}>
      {playing ? <Glow size={width * 1.5} tint={t.fill} strength={0.7} style={{ position: 'absolute', left: -width * 0.25, top: height / 2 - width * 0.75 }} /> : null}
      <Pop trigger={playing ? 1 : 0} scale={playing ? 1.08 : 1} style={{ flex: 1 }}>
        <Press3D onPress={onPress} style={{ flex: 1 }} depth={12} accessibilityLabel={`${word.rom}: ${word.es}. Tono ${t.name.toLowerCase()}`}>
          <CardSkin skin={playing ? { ...SKINS.idle, border: t.fill, edge: mix(t.fill, '#000000', 0.25) } : SKINS.idle} radius={18} pad={3}>
            {big ? <Medallion emoji={word.emoji} size={40} tint={medalOf(word.th)} /> : null}
            <Th size={big ? 26 : 22} bold style={{ textAlign: 'center' }}>
              {word.th}
            </Th>
            <Text style={[styles.cardRom, { color: t.text }]}>{word.rom}</Text>
            <Melody tones={[tone]} width={Math.max(40, width - 16)} height={big ? 42 : 30} progress={p} staff={false} stroke={5} />
            <Text style={styles.cardEs} numberOfLines={1}>
              {big || !word.emoji ? word.es : `${word.emoji} ${word.es}`}
            </Text>
          </CardSkin>
        </Press3D>
      </Pop>
    </View>
  );
}

/** Mientras suena (sin haber respondido): una onda que no delata la curva. */
function MysteryWave({ active, width, height }: { active: boolean; width: number; height: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withTiming(active ? 1 : 0, { duration: 220 });
    if (active && !reduced) {
      t.value = 0;
      t.value = withRepeat(withTiming(1, { duration: 620, easing: Easing.linear }), -1, false);
    } else cancelAnimation(t);
  }, [active, reduced, t, o]);
  const period = 54;
  const w = width + period * 2;
  const amp = 13;
  const c = amp + 4;
  let d = `M0 ${c}`;
  for (let k = 0, x = 0; x < w; k++, x += period / 2) d += ` Q${x + period / 4} ${k % 2 ? c + amp * 2 : c - amp * 2} ${x + period / 2} ${c}`;
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: -t.value * period }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden', justifyContent: 'center' }}>
      <Animated.View style={[{ width: w, height: amp * 2 + 8 }, st]}>
        <Svg width={w} height={amp * 2 + 8}>
          <Path d={d} stroke={color.tinta3} strokeOpacity={0.22} strokeWidth={10} fill="none" strokeLinecap="round" />
          <Path d={d} stroke="#FFFFFF" strokeWidth={4} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Tecla de tono: su color, su glifo, su nombre y cómo suena. */
function ToneKey({ tone, height, state, pulse, onPress }: { tone: ToneId; height: number; state: KeyState; pulse?: boolean; onPress: (e: GestureResponderEvent) => void }) {
  const t = tones[tone];
  const off = state === 'off';
  const fill = off ? '#D8DEE8' : t.fill;
  const top = off ? '#EEF1F6' : mix(t.fill, '#FFFFFF', 0.42);
  const edge = off ? '#AEB9CA' : mix(t.fill, '#000000', 0.3);
  const ink = off ? '#97A3B6' : t.on;
  const id = `k${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ width: 104, height, opacity: state === 'dim' ? 0.4 : state === 'sleep' ? 0.45 : 1 }}>
      {state === 'ok' || pulse ? <Glow size={150} tint={t.fill} strength={0.7} style={{ position: 'absolute', left: -23, top: height / 2 - 75 }} /> : null}
      <Pop trigger={`${state}${pulse ? 1 : 0}`} scale={state === 'ok' || pulse ? 1.12 : 1} style={{ flex: 1 }}>
        <Press3D onPress={onPress} disabled={off || state === 'dim' || state === 'sleep'} style={{ flex: 1 }} depth={14} accessibilityLabel={`Tono ${t.name.toLowerCase()}: ${TONE_ANCHOR[tone]}`}>
          <View style={[styles.keyEdge, { backgroundColor: edge }]}>
            <View style={styles.keyFace}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={top} />
                    <Stop offset="0.6" stopColor={fill} />
                    <Stop offset="1" stopColor={fill} />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}g)`} />
              </Svg>
              <View style={styles.keyShine} />
              <View style={{ alignItems: 'center' }}>
                {off ? <Icon name="lock" size={20} color={ink} /> : <Contour tone={tone} color={ink} size={36} />}
                <Text style={[styles.keyName, { color: ink }]} numberOfLines={1}>
                  {t.name}
                </Text>
                {height >= 66 ? (
                  <Text style={[styles.keyHow, { color: ink }]} numberOfLines={1}>
                    {TONE_HOW[tone]}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </Press3D>
      </Pop>
      {state === 'ok' || state === 'bad' ? <Badge ok={state === 'ok'} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    marginTop: 2,
    borderRadius: 28,
    backgroundColor: 'rgba(255,252,246,0.9)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    overflow: 'hidden',
    shadowColor: '#7A3A12',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  boardShine: { position: 'absolute', left: 16, right: 16, top: 5, height: 18, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.7)' },
  boardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50 },
  boardFoot: { height: 28, justifyContent: 'center' },
  introTitle: { fontFamily: font.displayBold, fontSize: 20, lineHeight: 24, color: color.tinta },
  introSub: { fontFamily: font.uiHeavy, fontSize: 14, color: color.tinta3 },
  earOnly: { fontFamily: font.displayBold, fontSize: 20, lineHeight: 24, color: color.laca },
  earDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.laca, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderColor: color.lacaHondo },
  punch: { fontFamily: font.uiHeavy, fontSize: 14, color: color.tinta2, textAlign: 'center' },
  cardRom: { fontFamily: font.uiHeavy, fontSize: 15, lineHeight: 18, marginTop: -4 },
  cardEs: { fontFamily: font.uiHeavy, fontSize: 12.5, lineHeight: 16, color: color.tinta2, textAlign: 'center' },
  es: { fontFamily: font.uiHeavy, fontSize: 15, color: color.tinta2, lineHeight: 19 },
  speaker: { flex: 1, borderRadius: 24, backgroundColor: color.laca, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderColor: color.lacaHondo },
  toneName: { fontFamily: font.displayBold, fontSize: 17 },
  toneHow: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta3 },
  notes: { minHeight: 52, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6 },
  compare: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 18, borderWidth: 2, backgroundColor: '#FFFFFF' },
  compareText: { fontFamily: font.uiHeavy, fontSize: 13.5 },
  rule: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.88)' },
  ruleText: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta2, textAlign: 'center' },
  footer: { flex: 1, justifyContent: 'flex-end', paddingBottom: 12, paddingTop: 8, minHeight: 80 },
  fuse: { position: 'absolute', left: 28, right: 28, top: 3 },
  keyEdge: { flex: 1, borderRadius: 20, paddingBottom: 5, shadowColor: '#1D2347', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  keyFace: { flex: 1, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  keyShine: { position: 'absolute', left: 10, right: 10, top: 4, height: '30%', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.32)' },
  keyName: { fontFamily: font.uiHeavy, fontSize: 13.5, marginTop: 1 },
  keyHow: { fontFamily: font.uiBold, fontSize: 11, opacity: 0.85, marginTop: -1 },
});
