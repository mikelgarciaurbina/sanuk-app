// Juego 10 · Puente de bambú. Noi espera al otro lado del río y cada palabra de la frase es una tabla de bambú:
// tócalas en orden y vuelan a su sitio con un «clac» (y una nota más aguda en cada acierto seguido). Con el
// puente completo, Noi lo cruza a saltitos mientras suena la frase entera y se ilumina cada tabla que pisa.
// Una tabla que no es de la frase cae al agua con salpicadura; una que va más adelante rebota y vuelve.
// Feria: tres niveles (frases más largas y más tablas de sobra), rondas a ciegas (solo audio), bambú dorado
// (puntos ×2), revancha con la frase que más costó, combos que multiplican y bonus por rapidez.
import { useEffect, useId, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

import type { NoiPose } from '@/brand/noi-art';
import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Btn, Rom, SpeakBtn, Th, Txt } from '@/components/ui';
import type { Sentence, Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { joinThai, personalize, personalizeRom, type Gender } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { Countdown, Floaty, Press3D, useJuice, type Point } from './fx';
import { DrainBar, GameHud, WORD_BY_TH, clamp, measureBox, shortEs, thaiWidth, useLater, type Box, type ViewRef } from './frases/shared';
import { useScore } from './kit';
import type { GameProps } from './types';

// ——— Rondas ———

type Tok = { th: string; rom: string; es?: string; id?: string };
type Plank = { id: string; th: string; rom: string; fake: boolean };
type Kind = 'normal' | 'listen' | 'gold' | 'retry';
type Src = { toks: Tok[]; rom: string; es: string; extras: string[] };
type Round = { key: string; src: Src; phrase: string; planks: Plank[]; level: number; kind: Kind; fakes: number };

/** Partículas y pronombres que cambian con quien habla: nunca como tabla de sobra (serían una trampa). */
const GENDERED = new Set(['ครับ', 'ค่ะ', 'คะ', 'ผม', 'ฉัน', 'ดิฉัน']);

function toksOf(s: Sentence, g: Gender): Tok[] {
  const roms = s.rom.split(/\s+/).filter(Boolean);
  const aligned = roms.length === s.th.length;
  return s.th.map((raw, i) => {
    const th = personalize(raw, g);
    const w = WORD_BY_TH.get(th);
    return { th, rom: aligned ? personalizeRom(roms[i], g) : (w?.rom ?? ''), es: w ? shortEs(w.es) : undefined, id: w?.id };
  });
}

/** Tablas de sobra: palabras de otras frases que no se parecen (ni en thai ni en traducción) a las de esta. */
function pickFakes(toks: Tok[], extras: string[], n: number): Plank[] {
  const own = new Set(toks.map((t) => t.th));
  const glosses = new Set(toks.map((t) => t.es).filter((x): x is string => !!x));
  const out: Plank[] = [];
  for (const th of shuffle([...new Set(extras)])) {
    if (out.length >= n) break;
    if (own.has(th) || GENDERED.has(th) || th.length > 14) continue;
    const w = WORD_BY_TH.get(th);
    const es = w ? shortEs(w.es) : undefined;
    if (es && glosses.has(es)) continue;
    if (es) glosses.add(es);
    own.add(th);
    out.push({ id: `f${out.length}`, th, rom: w?.rom ?? '', fake: true });
  }
  return out;
}

function buildRound(src: Src, key: string, level: number, kind: Kind, fakes: number): Round {
  const planks = shuffle<Plank>([...src.toks.map((t, i) => ({ id: `t${i}`, th: t.th, rom: t.rom, fake: false })), ...pickFakes(src.toks, src.extras, fakes)]);
  return { key, src, phrase: joinThai(src.toks.map((t) => t.th)), planks, level, kind, fakes };
}

const oneOf = (xs: number[]) => (xs.length ? xs[Math.floor(Math.random() * xs.length)] : -1);

function makeRounds(mode: GameProps['mode'], sentences: Sentence[], words: Word[], focus: Word[], g: Gender, n: number): Round[] {
  const usable = sentences.filter((s) => s.th.length >= 2 && s.th.length <= 10);
  const wordTh = words.map((w) => w.th);
  let srcs: Src[];
  if (usable.length) {
    const toks = usable.map((s) => toksOf(s, g));
    srcs = usable.map((s, i) => ({
      toks: toks[i],
      rom: personalizeRom(s.rom, g),
      es: s.es,
      extras: [...toks.filter((_, j) => j !== i).flatMap((t) => t.map((x) => x.th)), ...wordTh],
    }));
  } else {
    // sin frases: parejas y tríos de palabras de la lección
    const seen = new Set<string>();
    const pool: Word[] = [];
    for (const w of [...shuffle(focus), ...shuffle(words)]) {
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      pool.push(w);
    }
    if (pool.length < 2) return [];
    srcs = Array.from({ length: Math.max(1, n) }, (_, i) => {
      const ws = shuffle(pool).slice(0, i % 2 ? 3 : 2);
      return { toks: ws.map((w) => ({ th: w.th, rom: w.rom, es: shortEs(w.es), id: w.id })), rom: ws.map((w) => w.rom).join(' '), es: ws.map((w) => shortEs(w.es)).join(' · '), extras: wordTh };
    });
  }

  if (mode === 'leccion') {
    const focusTh = new Set(focus.map((w) => w.th));
    const byLen = [...srcs].sort((a, b) => a.toks.length - b.toks.length);
    const withFocus = byLen.filter((s) => s.toks.some((t) => focusTh.has(t.th)));
    const base = (withFocus.length >= n ? withFocus : byLen).slice(0, Math.max(n + 1, 3));
    const chosen = shuffle(base).slice(0, n);
    for (let i = 0; chosen.length < n; i++) chosen.push(byLen[i % byLen.length]);
    return chosen.sort((a, b) => a.toks.length - b.toks.length).map((s, i) => buildRound(s, `r${i}`, 1, 'normal', 1));
  }

  // feria: frases cortas al principio, largas al final
  const sorted = shuffle(srcs).sort((a, b) => a.toks.length - b.toks.length);
  const L = sorted.length;
  const c1 = Math.max(1, Math.round(L / 3));
  const c2 = Math.max(c1 + 1, Math.round((2 * L) / 3));
  const buckets = [sorted.slice(0, c1), sorted.slice(c1, c2), sorted.slice(c2)];
  const uses = new Map<Src, number>();
  let prev: Src | null = null;
  const take = (lv: number) => {
    const b = buckets[lv - 1].length ? buckets[lv - 1] : buckets[1].length ? buckets[1] : sorted;
    const best = [...b].sort((x, y) => (uses.get(x) ?? 0) - (uses.get(y) ?? 0) || Number(x === prev) - Number(y === prev))[0];
    uses.set(best, (uses.get(best) ?? 0) + 1);
    prev = best;
    return best;
  };
  const levels = Array.from({ length: n }, (_, i) => (i < Math.round(n * 0.375) ? 1 : i < Math.round(n * 0.75) ? 2 : 3));
  const kinds: Kind[] = levels.map(() => 'normal');
  const at = (lv: number) => levels.flatMap((l, i) => (l === lv && i < n - 1 ? [i] : []));
  const l2 = oneOf(at(2));
  if (l2 >= 0) kinds[l2] = 'listen';
  const l3 = oneOf(at(3));
  if (l3 >= 0) kinds[l3] = 'listen';
  const gold = oneOf([...at(2), ...at(3)].filter((i) => kinds[i] === 'normal'));
  if (gold >= 0) kinds[gold] = 'gold';
  return levels.map((lv, i) => {
    const s = take(lv);
    return buildRound(s, `r${i}`, lv, kinds[i], lv === 1 ? 1 : lv === 2 ? 2 : s.toks.length <= 6 ? 3 : 2);
  });
}

// ——— Geometría del puente (en perspectiva: la orilla de enfrente arriba, la nuestra abajo) ———

type Slot = { y0: number; y1: number; hw0: number; hw1: number };
type Geo = { W: number; H: number; cx: number; top: number; bottom: number; hwTop: number; hwBot: number; slots: Slot[]; noi: number; hwAt: (y: number) => number };

function geometry(W: number, H: number, n: number): Geo {
  const cx = W / 2;
  const top = Math.round(clamp(H * 0.2, 58, 96));
  const bottom = H - 6;
  const L = bottom - top;
  const hwTop = Math.min(W * 0.25, 104);
  const hwBot = Math.min(W * 0.41, 182);
  const s0 = 0.72; // la primera tabla mide un 72 % de la última
  const a = (2 * s0) / (1 + s0);
  const b = 1 - a;
  const yAt = (t: number) => top + L * (a * t + b * t * t);
  const hwAt = (y: number) => hwTop + ((hwBot - hwTop) * (y - top)) / L;
  const slots = Array.from({ length: n }, (_, i) => {
    const y0 = yAt(i / n);
    const y1 = yAt((i + 1) / n);
    return { y0, y1, hw0: hwAt(y0), hw1: hwAt(y1) };
  });
  return { W, H, cx, top, bottom, hwTop, hwBot, slots, noi: Math.round(clamp(top * 0.95, 54, 84)), hwAt };
}

/** Trapecio de una tabla en coordenadas de su propia caja. */
const localTrap = (s: Slot, inset = 1) => {
  const h = s.y1 - s.y0;
  return `${s.hw1 - s.hw0 + inset},${inset} ${s.hw1 + s.hw0 - inset},${inset} ${2 * s.hw1 - inset},${h - inset} ${inset},${h - inset}`;
};

// ——— Colores del bambú ———

const BAMBOO = { a: '#FAEDB0', b: '#E6C462', c: '#B88A2E', slab: '#8A6220', node: '#9C7024', hi: '#FFF6CF', ink: '#4A3210', edge: '#9C7024' };
const GOLDEN = { a: '#FFF7C9', b: '#FFD54A', c: '#D99A00', slab: '#A06A00', node: '#C08300', hi: '#FFFDF0', ink: '#5A3A00', edge: '#C08300' };

type PlankSize = { fs: number; h: number; rom: boolean };

/** Tamaño de letra de las tablas de la orilla para que quepan todas en el espacio de abajo. */
function poolSize(planks: Plank[], width: number, height: number, withRom: boolean): PlankSize {
  let last: PlankSize = { fs: 15, h: 40, rom: withRom };
  for (const fs of [21, 19, 17, 15]) {
    const h = Math.round(fs * 1.6 + (withRom ? 16 : 8));
    last = { fs, h, rom: withRom };
    const avail = width - 28;
    let rows = 1;
    let x = 0;
    for (const p of planks) {
      const w = Math.max(70, thaiWidth(p.th, fs) + 42);
      if (x > 0 && x + 10 + w > avail) {
        rows += 1;
        x = w;
      } else x += (x > 0 ? 10 : 0) + w;
    }
    if (rows * (h + 4 + 10) + 10 <= height) return last;
  }
  return last;
}

// ——— Juego ———

type Phase = 'intro' | 'play' | 'cross' | 'done';
type Flight = { key: string; plank: Plank; kind: 'ok' | 'later' | 'wrong'; from: Box; to: Box; fall: Point; size: PlankSize; gold: boolean };
type Summary = { perfect: boolean; base: number; perf: number; speed: number };

const EMPTY: Round = { key: 'vacio', src: { toks: [], rom: '', es: '', extras: [] }, phrase: '', planks: [], level: 1, kind: 'normal', fakes: 0 };
const OK_MS = 380;
const LATER_MS = 720;
const WRONG_MS = 860;
const SPLASH_MS = 700;
const LEVEL_SUB = ['', '', 'Sobran más tablas', 'Frases largas: ¡a por ellas!'];
const SPECIAL: Partial<Record<Kind, { t: string; sub: string; tint: string }>> = {
  listen: { t: '¡A ciegas!', sub: 'Escucha la frase y constrúyela', tint: color.cieloHondo },
  gold: { t: '¡Bambú dorado!', sub: 'Puntos ×2 en este puente', tint: color.buatongHondo },
  retry: { t: '¡Revancha!', sub: 'La frase que más se te resistió', tint: color.farol },
};

export default function Puente({ mode, words, focus, sentences, rounds: nRounds, gender, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const later = useLater();
  const [rounds, setRounds] = useState(() => makeRounds(mode, sentences, words, focus, gender, nRounds ?? (feria ? 8 : 2)));
  const [ri, setRi] = useState(0);
  const [phase, setPhase] = useState<Phase>(feria ? 'intro' : 'play');
  const [filled, setFilled] = useState(0);
  const [landed, setLanded] = useState(0);
  const [out, setOut] = useState<Record<string, true>>({});
  const [hint, setHint] = useState<string | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [lit, setLit] = useState(-1);
  const [points, setPoints] = useState(0);
  const [pose, setPose] = useState<NoiPose>('hola');
  const [jump, setJump] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [retried, setRetried] = useState(false);
  const [layout, setLayout] = useState({ w: 0, h: 0, stageY: 0, stageH: 0 });
  const rootRef = useRef<ViewRef>(null);
  const stageRef = useRef<ViewRef>(null);
  const game = useRef({
    next: 0,
    mistakes: 0,
    missAt: -1,
    missCount: 0,
    tried: new Set<number>(),
    out: new Set<string>(),
    base: 0,
    points: 0,
    seq: 0,
    worst: null as null | { src: Src; mistakes: number },
    finished: false,
    clock: { start: 0, ms: 1 },
    noiWin: { x: 0, y: 0 } as Point,
  });

  const bonus = useSharedValue(1);
  const ny = useSharedValue(0); // desplazamiento de Noi desde la orilla de enfrente
  const nsc = useSharedValue(1);
  const nop = useSharedValue(1);

  const r = rounds[ri] ?? EMPTY;
  const n = r.src.toks.length;
  const geo = layout.stageH > 0 && n > 0 ? geometry(layout.w, layout.stageH, n) : null;
  const bottomH = layout.h ? Math.round(clamp(layout.h * 0.3, 184, 250)) : 210;
  const gold = r.kind === 'gold';
  const listen = r.kind === 'listen';
  const size = poolSize(r.planks, layout.w || 375, bottomH, !feria);
  const noiSize = geo?.noi ?? 70;

  const noiStyle = useAnimatedStyle(() => ({
    opacity: nop.value,
    transform: [{ translateY: ny.value }, { scale: nsc.value }],
  }));

  // sin frases ni palabras no hay juego: se cierra enseguida
  useEffect(() => {
    const g = game.current;
    if (!rounds.length && !g.finished) {
      g.finished = true;
      onDone(score.result(0));
    }
  });

  useEffect(() => {
    const t = setTimeout(() => setPose((p) => (p === 'hola' ? 'feliz' : p)), 1600);
    return () => clearTimeout(t);
  }, [ri]);

  // por si onLayout llega tarde (en web va con ResizeObserver y solo salta al pintar): medimos al montar
  useEffect(() => {
    let live = true;
    Promise.all([measureBox(rootRef), measureBox(stageRef)]).then(([root, stage]) => {
      if (!live || !root || !stage || !root.h || !stage.h) return;
      const next = { w: root.w, h: root.h, stageY: stage.y - root.y, stageH: stage.h };
      setLayout((l) => (l.h && l.stageH ? l : next));
    });
    return () => {
      live = false;
    };
  }, []);

  const placeNoi = () => {
    ny.set(0);
    nsc.set(1);
  };

  const onRoot = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout((l) => (l.w === width && l.h === height ? l : { ...l, w: width, h: height }));
  };
  const onStage = (e: LayoutChangeEvent) => {
    const { y, height, width } = e.nativeEvent.layout;
    setLayout((l) => (l.stageY === y && l.stageH === height ? l : { ...l, w: width || l.w, stageY: y, stageH: height }));
  };

  const timeFor = (round: Round) => 4500 + 1400 * round.src.toks.length;
  const startTimer = (round: Round, delay: number) => {
    if (!feria) return;
    // la barra es solo para verla: el bonus se calcula con el reloj (no depende de los fotogramas)
    game.current.clock = { start: Date.now() + delay, ms: timeFor(round) };
    bonus.set(1);
    bonus.set(withDelay(delay, withTiming(0, { duration: timeFor(round), easing: Easing.linear })));
  };

  const begin = () => {
    setPhase('play');
    const sp = SPECIAL[r.kind];
    if (sp) {
      juice.banner(sp.t, sp.sub, sp.tint);
      fx.sparkle();
    }
    startTimer(r, sp ? 1100 : 0);
    if (r.kind === 'listen') later(() => say(r.phrase), sp ? 1300 : 300);
  };

  // la cuenta atrás necesita una función estable (si cambia, vuelve a empezar el número)
  const beginRef = useRef<() => void>(() => {});
  useEffect(() => {
    beginRef.current = begin;
  });
  const [onCountdown] = useState(() => () => beginRef.current());

  // ——— Tocar una tabla ———

  const launch = (p: Plank, box: Box, k: number, kind: Flight['kind'], onLand: (at: Point) => void) => {
    Promise.all([measureBox(rootRef), measureBox(stageRef)]).then(([root, stage]) => {
      if (!root || !stage || !geo) return;
      const s = geo.slots[k];
      const from = { x: box.x - root.x + box.w / 2, y: box.y - root.y + box.h / 2, w: box.w, h: box.h };
      const to = { x: stage.x - root.x + geo.cx, y: stage.y - root.y + (s.y0 + s.y1) / 2, w: s.hw0 + s.hw1, h: s.y1 - s.y0 };
      const side = from.x < to.x ? -1 : 1;
      const sy = (s.y0 + s.y1) / 2;
      const fall = {
        x: clamp(to.x + side * (geo.hwAt(sy) + 30), 22, root.w - 22),
        y: stage.y - root.y + clamp(sy + 36, geo.top + 26, geo.bottom - 34),
      };
      game.current.seq += 1;
      const key = `${r.key}-${game.current.seq}`;
      setFlights((f) => [...f, { key, plank: p, kind, from, to, fall, size, gold }]);
      const ms = kind === 'ok' ? OK_MS : kind === 'later' ? LATER_MS : WRONG_MS;
      later(() => setFlights((f) => f.filter((x) => x.key !== key)), ms);
      if (kind === 'ok') later(() => onLand({ x: to.x + root.x, y: to.y + root.y }), OK_MS - 20);
      else if (kind === 'wrong') later(() => onLand({ x: fall.x + root.x, y: fall.y + root.y }), SPLASH_MS);
      else later(() => onLand({ x: 0, y: 0 }), LATER_MS - 30);
      game.current.noiWin = { x: stage.x + geo.cx, y: stage.y + geo.bottom - 40 };
    });
  };

  const pick = (p: Plank, box: Box) => {
    const g = game.current;
    if (phase !== 'play' || g.out.has(p.id)) return;
    const k = g.next;
    if (k >= n) return;
    const want = r.src.toks[k];
    const firstTry = !g.tried.has(k);
    g.tried.add(k);
    g.out.add(p.id);
    setOut((o) => ({ ...o, [p.id]: true }));

    if (p.th === want.th) {
      g.next = k + 1;
      setFilled(k + 1);
      if (firstTry) onAnswer(true, want.id);
      const combo = score.hit(true, false);
      const pts = 10 * Math.min(4, 1 + Math.floor(combo / 5)) * (gold ? 2 : 1);
      g.base += pts;
      g.points += pts;
      setPoints(g.points);
      setHint(null);
      g.missAt = -1;
      fx.swish();
      launch(p, box, k, 'ok', (at) => {
        setLanded((c) => Math.max(c, k + 1));
        fx.ok(combo);
        fx.pop();
        setJump((j) => j + 1);
        juice.burst(at, 'chispas', 12, 80);
        juice.ring(at, color.buatong, 70);
        if (want.es) juice.float({ x: at.x, y: at.y - 6 }, want.es, color.arrozalHondo, 22);
        if (feria) juice.float({ x: at.x + 70, y: at.y - 30 }, `+${pts}`, color.azafranHondo, 20);
        if (!feria) say(want.th);
        if (k === n - 1) later(cross, 280);
      });
      return;
    }

    // tabla equivocada
    const isLater = r.src.toks.some((t, j) => j > k && t.th === p.th);
    if (firstTry) onAnswer(false, want.id);
    score.hit(false);
    g.mistakes += 1;
    if (g.missAt === k) g.missCount += 1;
    else {
      g.missAt = k;
      g.missCount = 1;
    }
    if (!feria || g.missCount >= 2) {
      const right = r.planks.find((q) => q.th === want.th && !g.out.has(q.id));
      if (right) setHint(right.id);
    }
    setPose('ups');
    later(() => setPose((x) => (x === 'ups' ? 'feliz' : x)), 950);
    launch(p, box, k, isLater ? 'later' : 'wrong', (at) => {
      if (isLater) {
        g.out.delete(p.id);
        setOut((o) => {
          const rest = { ...o };
          delete rest[p.id];
          return rest;
        });
        return;
      }
      fx.plip();
      juice.burst(at, 'gotas', 16, 95);
      juice.ring(at, '#E6F7FF', 80);
      juice.float({ x: at.x, y: at.y - 20 }, '¡Plof!', color.cieloHondo, 22);
      juice.shake(4);
    });
    if (isLater) juice.float(undefined, 'Esa va más adelante', color.cieloHondo, 22);
  };

  // ——— Noi cruza el puente ———

  const cross = () => {
    if (!geo) return;
    const g = game.current;
    setPhase('cross');
    const { start, ms } = g.clock;
    const rem = feria ? clamp(1 - (Date.now() - start) / ms, 0, 1) : 0;
    bonus.set(rem);
    say(r.phrase);
    setPose('feliz');
    const STEP = 300;
    const steps = geo.slots.map((s) => {
      const y = s.y0 + (s.y1 - s.y0) * 0.72;
      return { y, sc: Math.min(1.75, Math.pow(geo.hwAt(y) / geo.hwTop, 0.85)) };
    });
    const base = geo.top + 2;
    const endY = geo.bottom + 2 - base;
    const endSc = Math.min(1.75, Math.pow(geo.hwBot / geo.hwTop, 0.85));
    ny.set(
      withSequence(
        ...steps.flatMap((st) => [
          withTiming(st.y - base - 14 * st.sc, { duration: STEP * 0.45, easing: Easing.out(Easing.quad) }),
          withTiming(st.y - base, { duration: STEP * 0.55, easing: Easing.in(Easing.quad) }),
        ]),
        withTiming(endY - 26, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(endY, { duration: 220, easing: Easing.in(Easing.quad) }),
      ),
    );
    nsc.set(withSequence(...steps.map((st) => withTiming(st.sc, { duration: STEP })), withTiming(endSc, { duration: 380 })));
    steps.forEach((_, i) => later(() => setLit(i), i * STEP + STEP * 0.5));
    later(() => {
      setLit(-1);
      setPose('celebra');
      setJump((j) => j + 1);
      fx.sparkle();
      const mult = gold ? 2 : 1;
      const perfect = g.mistakes === 0;
      const perf = perfect ? 20 * mult : 0;
      const speed = feria ? Math.round(rem * 40) * mult : 0;
      g.points += perf + speed;
      setPoints(g.points);
      if (!g.worst || g.mistakes > g.worst.mistakes) g.worst = { src: r.src, mistakes: g.mistakes };
      const at = g.noiWin;
      juice.burst(at, 'confeti', 24, 150);
      if (perfect) juice.float({ x: at.x, y: at.y - 40 }, feria ? `¡Perfecto! +${perf}` : '¡Perfecto!', color.arrozalHondo, 26);
      if (speed > 0) later(() => juice.float({ x: at.x, y: at.y - 10 }, `Rapidez +${speed}`, color.azafranHondo, 22), 260);
      setSummary({ perfect, base: g.base, perf, speed });
      later(() => setPhase('done'), 750);
    }, steps.length * STEP + 400);
  };

  // ——— Siguiente ronda y final ———

  const finish = () => {
    const g = game.current;
    if (g.finished) return;
    g.finished = true;
    if (!feria) {
      onDone(score.result(g.points));
      return;
    }
    juice.banner('¡Puente maestro!', `${g.points} puntos`, color.arrozal);
    juice.burst(undefined, 'confeti', 30, 180);
    fx.fanfare();
    later(() => onDone(score.result(g.points)), 1400);
  };

  const next = () => {
    const g = game.current;
    let list = rounds;
    let again = retried;
    // lección: la frase que ha costado vuelve una vez al final
    if (!feria && g.mistakes > 0 && !again) {
      again = true;
      list = [...rounds, buildRound(r.src, `x${ri}`, 1, 'retry', 1)];
    }
    if (ri + 1 >= list.length) {
      finish();
      return;
    }
    // feria: la última ronda es la revancha de la frase que más costó
    if (feria && ri + 1 === list.length - 1 && !again && g.worst && g.worst.mistakes >= 2) {
      again = true;
      list = [...list.slice(0, -1), buildRound(g.worst.src, 'rv', 3, 'retry', list[list.length - 1].fakes)];
    }
    if (list !== rounds) setRounds(list);
    if (again !== retried) setRetried(again);
    const nr = list[ri + 1];
    g.next = 0;
    g.mistakes = 0;
    g.missAt = -1;
    g.missCount = 0;
    g.tried = new Set();
    g.out = new Set();
    g.base = 0;
    setRi(ri + 1);
    setFilled(0);
    setLanded(0);
    setOut({});
    setHint(null);
    setLit(-1);
    setSummary(null);
    setPose('hola');
    setPhase('play');
    placeNoi();
    nop.set(0);
    nop.set(withTiming(1, { duration: 350 }));
    const up = feria && nr.level > r.level;
    if (up) {
      juice.banner(`¡Nivel ${nr.level}!`, LEVEL_SUB[nr.level], color.farol);
      fx.levelup();
    }
    const sp = nr.kind === 'retry' && !feria ? undefined : SPECIAL[nr.kind];
    if (sp) {
      later(
        () => {
          juice.banner(sp.t, sp.sub, sp.tint);
          fx.sparkle();
        },
        up ? 1350 : 150,
      );
    }
    startTimer(nr, up || sp ? (up && sp ? 2400 : 1200) : 0);
    if (nr.kind === 'listen') later(() => say(nr.phrase), up ? 2600 : 1300);
  };

  const last = ri + 1 >= rounds.length && !(!feria && summary && !summary.perfect && !retried);

  return (
    <View ref={rootRef} style={{ flex: 1 }} onLayout={onRoot}>
      <Backdrop scene="arrozal" />
      <Animated.View style={[{ flex: 1 }, juice.shakeStyle]}>
        {geo && layout.h ? <RiverScene W={layout.w} H={layout.h - layout.stageY} top={layout.stageY} geo={geo} /> : null}
        <GameHud label={feria ? 'PUENTE' : 'FRASE'} i={ri + 1} n={rounds.length} points={feria ? points : undefined} combo={score.combo} />
        <View style={styles.prompt}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.promptLabel}>{listen && phase !== 'done' ? 'ESCUCHA Y CONSTRUYE' : r.kind === 'retry' ? 'REVANCHA · EN THAI' : 'CONSTRUYE EN THAI'}</Text>
              {listen && phase !== 'done' ? (
                <Txt v="h3" style={{ color: color.cieloHondo }}>¿Qué has oído?</Txt>
              ) : (
                <Txt v="h3" style={{ fontSize: 19, lineHeight: 23 }}>{r.src.es}</Txt>
              )}
            </View>
            <SpeakBtn size={40} onPress={() => say(r.phrase)} />
            {listen ? (
              <Btn
                v="ghost"
                height={40}
                style={{ width: 50 }}
                silent
                accessibilityLabel="Escuchar más lento"
                icon={<Icon name="turtle" size={28} color={color.cieloHondo} />}
                onPress={() => say(r.phrase, { slow: true })}
              />
            ) : null}
          </View>
          {feria ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d="M13 2 4 14h7l-1 8 9-12h-7z" fill={color.buatong} stroke={color.buatongHondo} strokeWidth={1.5} strokeLinejoin="round" />
              </Svg>
              <DrainBar value={bonus} height={7} />
            </View>
          ) : null}
        </View>

        <View ref={stageRef} collapsable={false} style={{ flex: 1 }} onLayout={onStage}>
          {geo ? (
            <>
              {r.src.toks.slice(0, landed).map((t, k) => (
                <BridgePlank key={`${r.key}-${k}`} slot={geo.slots[k]} cx={geo.cx} th={t.th} gold={gold} lit={lit === k} />
              ))}
              {phase === 'play' && filled < n ? <NextSlot key={`${r.key}-n${filled}`} slot={geo.slots[filled]} cx={geo.cx} /> : null}
              <Rails geo={geo} />
              <Animated.View
                pointerEvents="none"
                style={[{ position: 'absolute', left: geo.cx - noiSize / 2, top: geo.top + 2 - noiSize, width: noiSize, height: noiSize, transformOrigin: '50% 100%' }, noiStyle]}>
                <Noi pose={pose} size={noiSize} jump={jump} />
              </Animated.View>
            </>
          ) : null}
        </View>

        <View style={{ height: bottomH }}>
          {phase === 'done' && summary ? (
            <ResultCard round={r} summary={summary} feria={feria} last={last} minH={bottomH - 12} onNext={next} />
          ) : (
            <View style={styles.pool}>
              {r.planks.map((p, i) => (
                <PoolPlank key={`${r.key}-${p.id}`} p={p} i={i} size={size} gold={gold} hidden={!!out[p.id]} dim={phase === 'cross'} hint={hint === p.id} disabled={phase !== 'play'} onPick={pick} />
              ))}
            </View>
          )}
        </View>
      </Animated.View>

      {flights.map((f) => (
        <Flyer key={f.key} f={f} />
      ))}
      {phase === 'intro' && n > 0 ? <Countdown onDone={onCountdown} /> : null}
      {juice.layer}
    </View>
  );
}

// ——— Piezas ———

function Board({ th, rom, size, gold }: { th: string; rom?: string; size: PlankSize; gold?: boolean }) {
  const id = `pb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const c = gold ? GOLDEN : BAMBOO;
  return (
    <View style={[styles.slab, { backgroundColor: c.slab }]}>
      <View style={[styles.board, { height: size.h }]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.a} />
              <Stop offset="0.55" stopColor={c.b} />
              <Stop offset="1" stopColor={c.c} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
        <View style={[styles.node, { left: 8, backgroundColor: c.node }]} />
        <View style={[styles.nodeHi, { left: 11, backgroundColor: c.hi }]} />
        <View style={[styles.node, { right: 8, backgroundColor: c.node }]} />
        <View style={[styles.nodeHi, { right: 5, backgroundColor: c.hi }]} />
        <View style={[styles.boardShine, { backgroundColor: c.hi }]} />
        <Th size={size.fs} bold numberOfLines={1} style={{ color: c.ink }}>
          {th}
        </Th>
        {size.rom && rom ? <Rom rom={rom} size={11} style={{ marginTop: -4 }} /> : null}
      </View>
    </View>
  );
}

function PoolPlank({ p, i, size, gold, hidden, dim, hint, disabled, onPick }: { p: Plank; i: number; size: PlankSize; gold: boolean; hidden: boolean; dim: boolean; hint: boolean; disabled: boolean; onPick: (p: Plank, box: Box) => void }) {
  const ref = useRef<ViewRef>(null);
  return (
    <View ref={ref} collapsable={false} pointerEvents={hidden ? 'none' : 'auto'} style={{ opacity: hidden ? 0 : dim ? 0.35 : 1 }}>
      {hint && !hidden ? <HintHalo /> : null}
      <Floaty amp={hint ? 4 : 1.6} ms={1700 + ((i * 373) % 900)} delay={(i * 211) % 700}>
        <Press3D
          disabled={disabled || hidden}
          accessibilityLabel={`Tabla ${p.th}`}
          style={{ height: size.h + 4 }}
          onPress={() => ref.current?.measureInWindow((x, y, w, h) => onPick(p, { x, y, w, h }))}>
          <Board th={p.th} rom={p.rom} size={size} gold={gold} />
        </Press3D>
      </Floaty>
    </View>
  );
}

function HintHalo() {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, reduced]);
  const st = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * t.value, transform: [{ scale: 1 + 0.05 * t.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.halo, st]} />;
}

function Flyer({ f }: { f: Flight }) {
  const x = useSharedValue(f.from.x);
  const y = useSharedValue(f.from.y);
  const r = useSharedValue(0);
  const s = useSharedValue(1);
  const o = useSharedValue(1);
  useEffect(() => {
    const spin = (f.to.x >= f.from.x ? 1 : -1) * 16;
    if (f.kind === 'ok') {
      const k = clamp(f.to.w / f.from.w, 0.7, 1.35);
      x.value = withTiming(f.to.x, { duration: OK_MS - 20, easing: Easing.out(Easing.cubic) });
      y.value = withSequence(
        withTiming(Math.min(f.from.y, f.to.y) - 46, { duration: 170, easing: Easing.out(Easing.quad) }),
        withTiming(f.to.y, { duration: OK_MS - 190, easing: Easing.in(Easing.quad) }),
      );
      r.value = withSequence(withTiming(spin, { duration: 170 }), withTiming(0, { duration: OK_MS - 190 }));
      s.value = withTiming(k, { duration: OK_MS - 20 });
      return;
    }
    const mx = f.from.x + (f.to.x - f.from.x) * 0.6;
    const my = f.from.y + (f.to.y - f.from.y) * 0.6 - 26;
    const go = { duration: 230, easing: Easing.out(Easing.quad) };
    if (f.kind === 'later') {
      x.value = withSequence(withTiming(mx, go), withTiming(mx + 7, { duration: 60 }), withTiming(mx - 5, { duration: 60 }), withSpring(f.from.x, { damping: 13, stiffness: 150 }));
      y.value = withSequence(withTiming(my, go), withTiming(my, { duration: 120 }), withSpring(f.from.y, { damping: 13, stiffness: 150 }));
      r.value = withSequence(withTiming(spin * 0.6, go), withTiming(-14, { duration: 60 }), withTiming(10, { duration: 60 }), withSpring(0, { damping: 10, stiffness: 160 }));
      return;
    }
    x.value = withSequence(withTiming(mx, go), withTiming(mx + 7, { duration: 60 }), withTiming(mx - 5, { duration: 60 }), withTiming(f.fall.x, { duration: 360, easing: Easing.out(Easing.quad) }));
    y.value = withSequence(withTiming(my, go), withTiming(my - 6, { duration: 120 }), withTiming(f.fall.y, { duration: 360, easing: Easing.in(Easing.quad) }));
    r.value = withSequence(withTiming(spin * 0.6, go), withTiming(-14, { duration: 60 }), withTiming(10, { duration: 60 }), withTiming(spin * 7, { duration: 360 }));
    s.value = withDelay(410, withTiming(0.55, { duration: 360 }));
    o.value = withDelay(650, withTiming(0, { duration: 160 }));
  }, [f, x, y, r, s, o]);
  const w = f.from.w;
  const h = f.from.h;
  const st = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateX: x.value - w / 2 }, { translateY: y.value - h / 2 }, { rotate: `${r.value}deg` }, { scale: s.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h, zIndex: 50 }, st]}>
      <Board th={f.plank.th} rom={f.plank.rom} size={f.size} gold={f.gold} />
    </Animated.View>
  );
}

function BridgePlank({ slot, cx, th, gold, lit }: { slot: Slot; cx: number; th: string; gold: boolean; lit: boolean }) {
  const u = `bp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const c = gold ? GOLDEN : BAMBOO;
  const w = slot.hw1 * 2;
  const h = slot.y1 - slot.y0;
  const pts = localTrap(slot, 1);
  // bordes del trapecio a una altura y (coordenadas de la caja)
  const left = (y: number) => (slot.hw1 - slot.hw0) * (1 - y / h);
  const right = (y: number) => w - left(y);
  // cañas de bambú tumbadas: una cada ~15 px, con sus nudos
  const k = Math.max(1, Math.round(h / 15));
  const seams = Array.from({ length: k - 1 }, (_, j) => (h * (j + 1)) / k);
  const nodes = Array.from({ length: k }, (_, j) => {
    const y0 = (h * j) / k + 1.5;
    const y1 = (h * (j + 1)) / k - 1.5;
    const f = 0.12 + (((j * 0.37) % 0.76) + 0.76) % 0.76;
    const g = 0.12 + (((j * 0.61 + 0.43) % 0.76) + 0.76) % 0.76;
    return [f, g].map((t) => ({ x: left((y0 + y1) / 2) + (right((y0 + y1) / 2) - left((y0 + y1) / 2)) * t, y0, y1 }));
  });
  const fs = clamp(h * 0.5, 12, 24);
  const s = useSharedValue(1.3);
  const flash = useSharedValue(1);
  const glow = useSharedValue(0);
  useEffect(() => {
    s.value = withSpring(1, { damping: 8, stiffness: 300 });
    flash.value = withTiming(0, { duration: 450 });
  }, [s, flash]);
  useEffect(() => {
    glow.value = lit ? withSequence(withTiming(1, { duration: 110 }), withTiming(0.3, { duration: 650 })) : withTiming(0, { duration: 300 });
  }, [lit, glow]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const fl = useAnimatedStyle(() => ({ opacity: flash.value * 0.85 }));
  const gl = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: cx - slot.hw1, top: slot.y0, width: w, height: h }, st]}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={u} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.a} />
            <Stop offset="0.5" stopColor={c.b} />
            <Stop offset="1" stopColor={c.c} />
          </LinearGradient>
        </Defs>
        <Polygon points={pts} fill={`url(#${u})`} stroke={c.edge} strokeWidth={1} />
        {seams.map((y, j) =>
          j % 2 ? null : (
            <Polygon
              key={`d${j}`}
              points={`${left(y)},${y} ${right(y)},${y} ${right(Math.min(h - 1, y + h / k))},${Math.min(h - 1, y + h / k)} ${left(Math.min(h - 1, y + h / k))},${Math.min(h - 1, y + h / k)}`}
              fill={c.node}
              opacity={0.1}
            />
          ),
        )}
        {seams.map((y) => (
          <G key={y}>
            <Path d={`M${left(y) + 1} ${y} L${right(y) - 1} ${y}`} stroke={c.node} strokeWidth={1.3} opacity={0.75} />
            <Path d={`M${left(y + 1.4) + 2} ${y + 1.4} L${right(y + 1.4) - 2} ${y + 1.4}`} stroke={c.hi} strokeWidth={0.9} opacity={0.75} />
          </G>
        ))}
        {nodes.flat().map((nd, i) => (
          <G key={`n${i}`}>
            <Path d={`M${nd.x} ${nd.y0} L${nd.x} ${nd.y1}`} stroke={c.node} strokeWidth={1.8} strokeLinecap="round" opacity={0.8} />
            <Path d={`M${nd.x + 1.8} ${nd.y0 + 0.5} L${nd.x + 1.8} ${nd.y1 - 0.5}`} stroke={c.hi} strokeWidth={0.9} strokeLinecap="round" opacity={0.8} />
          </G>
        ))}
        <Path d={`M${left(3) + 4} 3 L${right(3) - 4} 3`} stroke={c.hi} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, gl]}>
        <Svg width={w} height={h}>
          <Polygon points={pts} fill="#FFF0A0" opacity={0.75} />
        </Svg>
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Th size={fs} bold numberOfLines={1} style={[styles.carved, { color: c.ink }]}>
          {th}
        </Th>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, fl]}>
        <Svg width={w} height={h}>
          <Polygon points={pts} fill="#FFFFFF" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

function NextSlot({ slot, cx }: { slot: Slot; cx: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, reduced]);
  const st = useAnimatedStyle(() => ({ opacity: 0.45 + 0.55 * t.value }));
  const w = slot.hw1 * 2;
  const h = slot.y1 - slot.y0;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: cx - slot.hw1, top: slot.y0, width: w, height: h }, st]}>
      <Svg width={w} height={h}>
        <Polygon points={localTrap(slot, 2)} fill="rgba(255,214,90,0.4)" stroke={color.buatong} strokeWidth={2.5} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

/** Postes y barandillas de bambú (por encima de las tablas). */
function Rails({ geo }: { geo: Geo }) {
  const u = `rl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { cx } = geo;
  const bounds = [geo.slots[0].y0, ...geo.slots.map((s) => s.y1)];
  const posts = bounds.map((y) => {
    const hw = geo.hwAt(y);
    const s = hw / geo.hwBot;
    return { y, hw, s, h: 26 * s + 8 };
  });
  const px = (side: number, p: (typeof posts)[number]) => cx + side * (p.hw + 5 * p.s);
  const rail = (side: number) => posts.map((p, i) => `${i ? 'L' : 'M'}${px(side, p)} ${p.y - p.h}`).join(' ');
  const rope = (side: number) =>
    posts
      .map((p, i) => {
        const x = px(side, p);
        const yy = p.y - p.h * 0.45;
        if (!i) return `M${x} ${yy}`;
        const q = posts[i - 1];
        return `Q${(px(side, q) + x) / 2} ${(q.y - q.h * 0.45 + yy) / 2 + 5 * p.s} ${x} ${yy}`;
      })
      .join(' ');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={geo.W} height={geo.H}>
        <Defs>
          <LinearGradient id={`${u}p`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8A6220" />
            <Stop offset="0.45" stopColor="#F1D488" />
            <Stop offset="1" stopColor="#9C7024" />
          </LinearGradient>
        </Defs>
        {[-1, 1].map((side) => (
          <G key={side}>
            <Path d={rope(side)} stroke="#7A5A2A" strokeWidth={1.6} fill="none" />
            {posts.map((p, i) => (
              <G key={i}>
                <Rect x={px(side, p) - 2.8 * p.s} y={p.y - p.h} width={5.6 * p.s} height={p.h + 3} rx={2.8 * p.s} fill={`url(#${u}p)`} />
                <Circle cx={px(side, p)} cy={p.y - p.h * 0.45} r={1.8 * p.s + 0.6} fill="#6E4C1C" />
              </G>
            ))}
            <Path d={rail(side)} stroke="#B98A3A" strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d={rail(side)} stroke="#F7E2A2" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(0 -1.2)" />
          </G>
        ))}
      </Svg>
    </View>
  );
}

/** El río, las dos orillas, los pilotes, los largueros y los huecos del puente. */
function RiverScene({ W, H, top, geo }: { W: number; H: number; top: number; geo: Geo }) {
  const u = `rv${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { cx, hwTop, hwBot } = geo;
  const bt = geo.top;
  const fy = bt + 6;
  const ny = geo.bottom - 4;
  const bounds = [geo.slots[0].y0, ...geo.slots.map((s) => s.y1)];
  const riverH = ny - fy;
  const beam = (side: number) =>
    `${cx + side * (hwTop * 0.55 - 3)},${bt - 2} ${cx + side * (hwTop * 0.55 + 3)},${bt - 2} ${cx + side * (hwBot * 0.55 + 6)},${geo.bottom + 4} ${cx + side * (hwBot * 0.55 - 6)},${geo.bottom + 4}`;
  const glints = Array.from({ length: 9 }, (_, i) => ({ x: (i * 131 + 37) % Math.max(1, W - 30), y: fy + 16 + ((i * 67) % Math.max(1, riverH - 30)) }));
  const landH = Math.max(1, H - ny - 20);
  const pebbles = Array.from({ length: 10 }, (_, i) => ({ x: cx + (((i * 0.37) % 1) - 0.5) * hwBot * 1.6, y: ny + 18 + ((i * 0.53) % 1) * landH, r: 2 + (i % 3) }));
  const tufts = Array.from({ length: 8 }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    return { x: cx + side * (hwBot * 1.18 + ((i * 23) % 30)), y: ny + 26 + ((i * 0.41) % 1) * landH };
  });
  const flowers = Array.from({ length: 6 }, (_, i) => {
    const side = i % 2 ? -1 : 1;
    return { x: clamp(cx + side * (hwBot * 1.05 + ((i * 17) % 26)), 10, W - 10), y: ny + 40 + ((i * 0.29 + 0.1) % 1) * (landH - 20), c: ['#FFFFFF', '#FF9EC0', '#FFFFFF', '#FFE07A', '#C9B6FF', '#FFFFFF'][i] };
  });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top, width: W, height: H }}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id={`${u}far`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#CFEA95" />
            <Stop offset="1" stopColor="#86C463" />
          </LinearGradient>
          <LinearGradient id={`${u}near`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#97D474" />
            <Stop offset="0.3" stopColor="#71B95A" />
            <Stop offset="1" stopColor="#3F8C48" />
          </LinearGradient>
          <LinearGradient id={`${u}w`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#A6E7F7" />
            <Stop offset="0.2" stopColor="#62C1E6" />
            <Stop offset="0.75" stopColor="#3594CE" />
            <Stop offset="1" stopColor="#2A7DBB" />
          </LinearGradient>
          <LinearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F8EBC0" />
            <Stop offset="1" stopColor="#D9BD80" />
          </LinearGradient>
          <LinearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#5E4016" />
            <Stop offset="0.5" stopColor="#A47B35" />
            <Stop offset="1" stopColor="#5E4016" />
          </LinearGradient>
          <LinearGradient id={`${u}k`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#3E8A38" />
            <Stop offset="0.45" stopColor="#9BDA72" />
            <Stop offset="1" stopColor="#3A7D34" />
          </LinearGradient>
        </Defs>

        {/* agua y brillos */}
        <Rect x={0} y={fy - 8} width={W} height={riverH + 20} fill={`url(#${u}w)`} />
        {glints.map((g, i) => (
          <Path key={i} d={`M${g.x} ${g.y} q7 -4 14 0 q7 4 14 0`} stroke="#FFFFFF" strokeWidth={1.8} strokeOpacity={0.45} fill="none" strokeLinecap="round" />
        ))}
        {/* sombra del puente y pilotes */}
        <Polygon points={`${cx - hwTop + 6},${bt + 14} ${cx + hwTop + 6},${bt + 14} ${cx + hwBot + 14},${geo.bottom + 14} ${cx - hwBot + 2},${geo.bottom + 14}`} fill="#0B3A66" opacity={0.2} />
        {bounds.map((y, i) => {
          const hw = geo.hwAt(y);
          const s = hw / hwBot;
          return (
            <G key={i}>
              {[-1, 1].map((side) => (
                <G key={side}>
                  <Rect x={cx + side * (hw - 6 * s) - 2.5 * s} y={y} width={5 * s} height={22 * s} fill={`url(#${u}b)`} />
                  <Ellipse cx={cx + side * (hw - 6 * s)} cy={y + 22 * s} rx={8 * s} ry={2.4 * s} fill="#E8F8FF" opacity={0.65} />
                </G>
              ))}
            </G>
          );
        })}
        {/* nenúfares y loto */}
        <G opacity={0.95}>
          <Path d={lily(W * 0.1, fy + riverH * 0.55, 13)} fill="#4FA25A" />
          <Path d={lily(W * 0.9, fy + riverH * 0.3, 11)} fill="#57AE5F" />
          <Path d={lily(W * 0.86, fy + riverH * 0.78, 14)} fill="#4FA25A" />
          <Circle cx={W * 0.86 + 3} cy={fy + riverH * 0.78 - 5} r={5} fill="#FF9EC0" />
          <Circle cx={W * 0.86 + 3} cy={fy + riverH * 0.78 - 6} r={2.4} fill="#FFE07A" />
        </G>

        {/* orilla de enfrente */}
        <Path d={`M0 ${fy - 4} C${W * 0.3} ${fy - 9}, ${W * 0.7} ${fy + 1}, ${W} ${fy - 6} L${W} ${fy + 5} C${W * 0.7} ${fy + 10}, ${W * 0.3} ${fy}, 0 ${fy + 6} Z`} fill={`url(#${u}s)`} />
        <Path d={`M0 10 C${W * 0.28} 0, ${W * 0.62} 18, ${W} 6 L${W} ${fy - 4} C${W * 0.7} ${fy + 2}, ${W * 0.3} ${fy - 8}, 0 ${fy - 2} Z`} fill={`url(#${u}far)`} />
        <Path d={`M0 ${bt * 0.45} C${W * 0.3} ${bt * 0.32}, ${W * 0.6} ${bt * 0.58}, ${W} ${bt * 0.4}`} stroke="#EAF8C8" strokeWidth={2} strokeOpacity={0.7} fill="none" />
        <Path d={`M0 ${bt * 0.72} C${W * 0.35} ${bt * 0.6}, ${W * 0.65} ${bt * 0.84}, ${W} ${bt * 0.66}`} stroke="#EAF8C8" strokeWidth={2} strokeOpacity={0.55} fill="none" />
        <Polygon points={`${cx - 9},8 ${cx + 9},8 ${cx + hwTop * 0.8},${bt + 1} ${cx - hwTop * 0.8},${bt + 1}`} fill="#D9B97C" opacity={0.85} />
        {bambooClump(W * 0.05, fy - 2, 1, `${u}k`)}
        {bambooClump(W * 0.84, fy - 3, 0.9, `${u}k`)}
        {tung(cx - hwTop - 30, fy - 2, bt, '#E8473F', '#FFC83D')}
        {tung(cx + hwTop + 30, fy - 2, bt, '#2B5FD9', '#FFC83D')}

        {/* nuestra orilla */}
        <Path d={`M0 ${ny - 2} C${W * 0.3} ${ny - 9}, ${W * 0.7} ${ny + 3}, ${W} ${ny - 5} L${W} ${ny + 10} L0 ${ny + 10} Z`} fill={`url(#${u}s)`} />
        <Path d={`M0 ${ny + 5} C${W * 0.3} ${ny - 1}, ${W * 0.7} ${ny + 11}, ${W} ${ny + 2} L${W} ${H} L0 ${H} Z`} fill={`url(#${u}near)`} />
        <Ellipse cx={W * 0.06} cy={ny + 4} rx={16} ry={9} fill="#9AA4AE" />
        <Ellipse cx={W * 0.06 - 3} cy={ny + 1} rx={9} ry={4} fill="#C9D1D8" />
        <Ellipse cx={W * 0.95} cy={ny + 6} rx={13} ry={7} fill="#9AA4AE" />
        <Ellipse cx={W * 0.95 - 2} cy={ny + 3} rx={7} ry={3} fill="#C9D1D8" />
        {/* camino de tierra que sigue al puente, con piedrecitas, matas y flores */}
        <Polygon points={`${cx - hwBot * 0.78},${geo.bottom + 2} ${cx + hwBot * 0.78},${geo.bottom + 2} ${cx + hwBot * 1.15},${H} ${cx - hwBot * 1.15},${H}`} fill="#E2C48A" opacity={0.8} />
        <Polygon points={`${cx - hwBot * 0.6},${geo.bottom + 2} ${cx + hwBot * 0.6},${geo.bottom + 2} ${cx + hwBot * 0.8},${H} ${cx - hwBot * 0.8},${H}`} fill="#EBD3A0" opacity={0.55} />
        {pebbles.map((p, i) => (
          <Ellipse key={i} cx={p.x} cy={p.y} rx={p.r} ry={p.r * 0.6} fill={i % 2 ? '#C9AE78' : '#F3E2B8'} />
        ))}
        {tufts.map((t, i) => (
          <Path key={i} d={`M${t.x - 6} ${t.y} q2 -9 4 -12 q1 7 2 12 q2 -10 5 -14 q0 9 1 14 q3 -7 6 -9 q-2 6 -2 9 Z`} fill={i % 2 ? '#3F8C48' : '#59A84F'} />
        ))}
        {flowers.map((f, i) => (
          <G key={i}>
            {[0, 72, 144, 216, 288].map((a) => (
              <Circle key={a} cx={f.x + Math.cos((a * Math.PI) / 180) * 3.6} cy={f.y + Math.sin((a * Math.PI) / 180) * 3.6} r={2.9} fill={f.c} />
            ))}
            <Circle cx={f.x} cy={f.y} r={2.2} fill="#FFD23F" />
          </G>
        ))}

        {/* largueros y huecos */}
        <Polygon points={beam(-1)} fill={`url(#${u}b)`} />
        <Polygon points={beam(1)} fill={`url(#${u}b)`} />
        {geo.slots.map((s, i) => (
          <Polygon
            key={i}
            points={`${cx - s.hw0 + 2},${s.y0 + 2} ${cx + s.hw0 - 2},${s.y0 + 2} ${cx + s.hw1 - 2},${s.y1 - 2} ${cx - s.hw1 + 2},${s.y1 - 2}`}
            fill="rgba(255,255,255,0.14)"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={1.5}
            strokeDasharray="6 5"
          />
        ))}
      </Svg>
      <Ripples W={W} y0={fy + 12} y1={ny - 10} />
    </View>
  );
}

const lily = (x: number, y: number, r: number) =>
  `M${x} ${y} L${x + r} ${y - r * 0.18} A${r} ${r * 0.55} 0 1 1 ${x + r * 0.92} ${y + r * 0.3} Z`;

function bambooClump(x: number, base: number, k: number, grad: string) {
  const stalks = [
    { dx: 0, h: 44 },
    { dx: 7, h: 56 },
    { dx: 14, h: 38 },
    { dx: 21, h: 50 },
  ];
  return (
    <G>
      {stalks.map((s, i) => {
        const h = s.h * k;
        const sx = x + s.dx * k;
        return (
          <G key={i}>
            <Rect x={sx} y={base - h} width={5 * k} height={h} rx={2} fill={`url(#${grad})`} />
            {[0.3, 0.6].map((f) => (
              <Rect key={f} x={sx - 0.5} y={base - h * f} width={6 * k} height={1.6} fill="#2F6E2C" />
            ))}
            <Path d={`M${sx + 2.5 * k} ${base - h} q${-12 * k} ${-4 * k} ${-18 * k} ${4 * k} q${8 * k} ${2 * k} ${18 * k} ${-4 * k} Z`} fill="#6CC04F" />
            <Path d={`M${sx + 2.5 * k} ${base - h + 6} q${12 * k} ${-6 * k} ${18 * k} ${2 * k} q${-8 * k} ${3 * k} ${-18 * k} ${-2 * k} Z`} fill="#58AE45" />
          </G>
        );
      })}
    </G>
  );
}

/** Bandera Lanna (ตุง) en un mástil de bambú. */
function tung(x: number, base: number, top: number, c1: string, c2: string) {
  const poleTop = Math.max(6, base - top * 0.95);
  const len = Math.max(18, (base - poleTop) * 0.62);
  const fx0 = x + 3;
  const fy0 = poleTop + 4;
  return (
    <G>
      <Rect x={x - 1.6} y={poleTop} width={3.2} height={base - poleTop} rx={1.6} fill="#A47B35" />
      <Path d={`M${x} ${fy0} h10`} stroke="#A47B35" strokeWidth={2} />
      <Path d={`M${fx0 + 2} ${fy0} h9 v${len} l-4.5 6 l-4.5 -6 Z`} fill={c1} />
      {[0.25, 0.5, 0.75].map((f) => (
        <Rect key={f} x={fx0 + 2} y={fy0 + len * f} width={9} height={2.4} fill={c2} />
      ))}
    </G>
  );
}

function Ripples({ W, y0, y1 }: { W: number; y0: number; y1: number }) {
  const span = Math.max(10, y1 - y0);
  const list = Array.from({ length: 6 }, (_, i) => ({ y: y0 + ((i * 0.61 + 0.13) % 1) * span, w: 22 + ((i * 17) % 30), ms: 6500 + ((i * 1370) % 4200), d: (i * 1130) % 5000 }));
  return (
    <>
      {list.map((r, i) => (
        <Ripple key={i} W={W} y={r.y} w={r.w} ms={r.ms} delay={r.d} />
      ))}
    </>
  );
}

function Ripple({ W, y, w, ms, delay }: { W: number; y: number; w: number; ms: number; delay: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(((delay / 5000) * 0.8) % 1);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false));
  }, [t, reduced, ms, delay]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.sin(t.value * Math.PI) * 0.7,
    transform: [{ translateX: -60 + t.value * (W + 120) }],
  }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: y, width: w, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF' }, st]} />;
}

function ResultCard({ round, summary, feria, last, minH, onNext }: { round: Round; summary: Summary; feria: boolean; last: boolean; minH: number; onNext: () => void }) {
  const total = summary.base + summary.perf + summary.speed;
  const fs = round.phrase.length > 26 ? 19 : 23;
  return (
    <Animated.View entering={FadeInDown.springify().damping(15)} style={[styles.card, { minHeight: minH }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt v="h3" style={{ flex: 1, color: summary.perfect ? color.arrozalHondo : color.tinta }}>
          {summary.perfect ? '¡Puente perfecto!' : '¡Noi ha cruzado!'}
        </Txt>
        {feria ? (
          <View style={styles.total}>
            <Text style={styles.totalText}>+{total}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Th size={fs} bold>
            {round.phrase}
          </Th>
          <Rom rom={round.src.rom} />
        </View>
        <SpeakBtn size={40} onPress={() => say(round.phrase)} />
      </View>
      <Txt v="bodyStrong" style={{ color: color.tinta2 }}>
        {round.src.es}
      </Txt>
      <Btn label={last ? 'Terminar' : 'Siguiente'} height={46} onPress={onNext} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#1D2347',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  promptLabel: { fontFamily: font.uiHeavy, fontSize: 11, letterSpacing: 1.1, color: color.arrozal },
  pool: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 8 },
  slab: {
    borderRadius: 13,
    paddingBottom: 4,
    shadowColor: '#2A3A10',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  board: { minWidth: 70, paddingHorizontal: 21, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  node: { position: 'absolute', top: 4, bottom: 4, width: 2.5, borderRadius: 2, opacity: 0.8 },
  nodeHi: { position: 'absolute', top: 5, bottom: 5, width: 1.2, borderRadius: 1, opacity: 0.8 },
  boardShine: { position: 'absolute', left: 14, right: 14, top: 4, height: 2.5, borderRadius: 2, opacity: 0.9 },
  carved: { textShadowColor: 'rgba(255,250,225,0.95)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  halo: { position: 'absolute', left: -7, right: -7, top: -7, bottom: -3, borderRadius: 18, borderWidth: 3, borderColor: color.buatong, backgroundColor: 'rgba(255,214,90,0.3)' },
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 6,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 5,
    borderTopColor: '#E6C462',
    justifyContent: 'space-between',
    shadowColor: '#1D2347',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  total: { paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: color.azafranSuave, justifyContent: 'center' },
  totalText: { fontFamily: font.displayBold, fontSize: 16, color: color.azafranHondo },
});
