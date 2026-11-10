// Juego 11 · La palabra perdida. Una hoja de palmera (ใบลาน, los manuscritos de los templos Lanna) guarda una frase
// a la que le falta una palabra: el hueco brilla, dice qué tipo de palabra falta y la lupa de Noi lo vigila. Elige la
// ficha de laca: vuela al hueco, un barrido de luz recorre la hoja y suena la frase entera. Después se explica qué
// hace esa palabra (la nota del temario o su categoría: partícula, pregunta, verbo…). Rondas al revés: la palabra
// brilla y hay que decir qué significa. Feria: tres niveles (más fichas y sin pistas), una vela que se consume
// (bonus por rapidez), combos que multiplican, hoja dorada (×2) y lo que se falla vuelve unas rondas después.
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { NoiPose } from '@/brand/noi-art';
import { color, font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Btn, Rom, SpeakBtn, Th, Txt } from '@/components/ui';
import type { Category, Sentence, Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { pick, shuffle } from '@/lib/random';
import { joinThai, personalize, personalizeRom, type Gender } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { Countdown, Floaty, Glow, Pop, Press3D, Shine, useJuice, type Point } from './fx';
import { DrainBar, GameHud, WORD_BY_TH, clamp, measureBox, shortEs, useLater, type Box, type ViewRef } from './frases/shared';
import { BAD_LINES, OK_LINES, useScore } from './kit';
import type { GameProps } from './types';

// ——— Datos ———

type Tok = { th: string; rom: string; raw: string };
type Src = { toks: Tok[]; rom: string; es: string; phrase: string };
type Answer = { th: string; rom: string; es: string; full: string; cat?: Category; note?: string; id?: string };
type Opt = { key: string; th?: string; rom?: string; es: string; ok: boolean };
type Kind = 'fill' | 'meaning';
type Item = { key: string; src: Src; gap: number; answer: Answer; kind: Kind; gold: boolean; retry: boolean; level: number; options: Opt[] };

/** Partículas y pronombres que dependen de quién habla: nunca como opción (serían una trampa). */
const GENDERED = new Set(['ครับ', 'ค่ะ', 'คะ', 'ผม', 'ฉัน', 'ดิฉัน']);

/** Qué tipo de palabra es y qué hace en la frase. */
const CAT: Partial<Record<Category, { label: string; a: string; tint: string; what: string }>> = {
  particula: { label: 'partícula', a: 'una partícula', tint: '#E0702A', what: 'Una partícula: no se traduce sola, pero cambia el tono o el sentido de la frase.' },
  pregunta: { label: 'pregunta', a: 'una palabra de pregunta', tint: '#7A55D6', what: 'Una palabra de pregunta: qué, quién, dónde, cuánto… Suele ir al final.' },
  verbo: { label: 'verbo', a: 'un verbo', tint: '#2F6FE0', what: 'Un verbo: la acción. En thai no se conjuga nunca.' },
  conector: { label: 'conector', a: 'un conector', tint: '#13856B', what: 'Un conector: une palabras o ideas.' },
  pronombre: { label: 'pronombre', a: 'un pronombre', tint: '#C93F7C', what: 'Un pronombre: quién hace la acción (y a menudo se omite).' },
  adjetivo: { label: 'adjetivo', a: 'un adjetivo', tint: '#A86F00', what: 'Un adjetivo: cómo es algo. Va detrás de lo que describe.' },
  tiempo: { label: 'tiempo', a: 'una palabra de tiempo', tint: '#0E7DA6', what: 'Una palabra de tiempo: cuándo pasa algo.' },
  numero: { label: 'número', a: 'un número', tint: '#4F5FD0', what: 'Un número: va delante del clasificador.' },
  lugar: { label: 'lugar', a: 'un lugar', tint: '#2E8B57', what: 'Un lugar o una dirección.' },
  saludo: { label: 'saludo', a: 'un saludo', tint: '#D2457F', what: 'Una fórmula para saludar o despedirse.' },
  cortesia: { label: 'cortesía', a: 'una fórmula de cortesía', tint: '#D2457F', what: 'Una fórmula de cortesía.' },
};
const catOf = (c?: Category) => (c && CAT[c]) || { label: 'palabra', a: 'una palabra', tint: '#8A5A2B', what: '' };
const GAP_SCORE: Partial<Record<Category, number>> = { pregunta: 4, particula: 3.5, conector: 3, verbo: 3, pronombre: 2, tiempo: 1.5, adjetivo: 1.5, numero: 1.5 };

function toSrc(s: Sentence, g: Gender): Src {
  const roms = s.rom.split(/\s+/).filter(Boolean);
  const aligned = roms.length === s.th.length;
  const toks = s.th.map((raw, i) => {
    const th = personalize(raw, g);
    return { raw, th, rom: aligned ? personalizeRom(roms[i], g) : (WORD_BY_TH.get(th)?.rom ?? '') };
  });
  return { toks, rom: personalizeRom(s.rom, g), es: s.es, phrase: joinThai(toks.map((t) => t.th)) };
}

/** El hueco: mejor una partícula, una pregunta o un verbo; nunca la partícula de cortesía (depende de quién habla). */
function gapOf(src: Src, prefer: Set<string>, avoid = -1, done?: Set<string>): number {
  const score = (i: number) => {
    const t = src.toks[i];
    if (/\{PQ?\}/.test(t.raw)) return -9;
    const w = WORD_BY_TH.get(t.th);
    if (!w) return -9;
    let v = (w.cat && GAP_SCORE[w.cat]) ?? 1;
    if (t.raw.includes('{I}')) v = 0.4;
    if (prefer.has(t.th)) v += 2;
    if (i === avoid) v -= 1.2;
    if (done?.has(t.th)) v -= 2.5;
    return v;
  };
  const idx = src.toks.map((_, i) => i);
  const best = Math.max(...idx.map(score));
  if (best < -1) return -1;
  return pick(idx.filter((i) => score(i) >= best - 0.6));
}

function answerOf(t: Tok): Answer {
  const w = WORD_BY_TH.get(t.th);
  return { th: t.th, rom: t.rom || w?.rom || '', es: w ? shortEs(w.es) : '', full: w?.es ?? '', cat: w?.cat, note: w?.note, id: w?.id };
}

const isClf = (es: string) => es.startsWith('clasificador');

function fillOptions(a: Answer, own: Set<string>, pool: Word[], n: number): Opt[] {
  const clf = isClf(a.full);
  const used = new Set([a.th]);
  const glosses = new Set([a.es]);
  const out: Opt[] = [{ key: 'ok', th: a.th, rom: a.rom, es: a.es, ok: true }];
  const same = shuffle(pool.filter((w) => w.cat === a.cat));
  const rest = shuffle(pool.filter((w) => w.cat !== a.cat));
  for (const w of [...same, ...rest]) {
    if (out.length >= n) break;
    const es = shortEs(w.es);
    if (used.has(w.th) || own.has(w.th) || GENDERED.has(w.th) || glosses.has(es) || w.th.length > 12 || isClf(w.es) !== clf) continue;
    used.add(w.th);
    glosses.add(es);
    out.push({ key: `o${out.length}`, th: w.th, rom: w.rom, es, ok: false });
  }
  return shuffle(out);
}

function meaningOptions(a: Answer, pool: Word[], n: number): Opt[] {
  const clf = isClf(a.full);
  const seen = [a.es.toLowerCase()];
  const out: Opt[] = [{ key: 'ok', es: a.es, ok: true }];
  const same = shuffle(pool.filter((w) => w.cat === a.cat));
  const rest = shuffle(pool.filter((w) => w.cat !== a.cat));
  for (const w of [...same, ...rest]) {
    if (out.length >= n) break;
    const es = shortEs(w.es);
    const k = es.toLowerCase();
    if (w.th === a.th || es.length > 24 || isClf(w.es) !== clf || seen.some((x) => x === k || x.includes(k) || k.includes(x))) continue;
    seen.push(k);
    out.push({ key: `o${out.length}`, es, ok: false });
  }
  return shuffle(out);
}

function buildItem(src: Src, pool: Word[], prefer: Set<string>, key: string, kind: Kind, level: number, nOpt: number, gold: boolean, retry: boolean, avoid = -1, done?: Set<string>): Item | null {
  const gap = gapOf(src, prefer, avoid, done);
  if (gap < 0) return null;
  const answer = answerOf(src.toks[gap]);
  if (!answer.es) return null;
  const own = new Set(src.toks.map((t) => t.th));
  const options = kind === 'fill' ? fillOptions(answer, own, pool, nOpt) : meaningOptions(answer, pool, nOpt);
  if (options.length < 2) return null;
  return { key, src, gap, answer, kind, gold, retry, level, options };
}

function makeItems(mode: GameProps['mode'], sentences: Sentence[], words: Word[], focus: Word[], g: Gender, n: number): { items: Item[]; pool: Word[] } {
  const seen = new Set<string>();
  const pool: Word[] = [];
  const add = (w?: Word) => {
    if (w && !seen.has(w.id)) {
      seen.add(w.id);
      pool.push(w);
    }
  };
  words.forEach(add);
  sentences.forEach((s) => s.th.forEach((t) => add(WORD_BY_TH.get(personalize(t, g)))));
  const prefer = new Set(focus.map((w) => w.th));

  let srcs = sentences.filter((s) => s.th.length >= 2).map((s) => toSrc(s, g));
  if (!srcs.length) {
    // sin frases: tríos de palabras de la lección
    const ws = [...focus, ...words].filter((w, i, all) => all.findIndex((x) => x.id === w.id) === i);
    if (ws.length < 3) return { items: [], pool };
    srcs = Array.from({ length: Math.max(1, n) }, () => {
      const three = shuffle(ws).slice(0, 3);
      const toks = three.map((w) => ({ raw: w.th, th: w.th, rom: w.rom }));
      return { toks, rom: three.map((w) => w.rom).join(' '), es: three.map((w) => shortEs(w.es)).join(' · '), phrase: joinThai(three.map((w) => w.th)) };
    });
  }

  const items: Item[] = [];
  if (mode === 'leccion') {
    const withFocus = srcs.filter((s) => s.toks.some((t) => prefer.has(t.th)));
    const order = [...shuffle(withFocus), ...shuffle(srcs.filter((s) => !withFocus.includes(s)))];
    const done = new Set<string>();
    for (let tries = 0; items.length < n && tries < n * 6; tries++) {
      const src = order[tries % order.length];
      const it = buildItem(src, pool, prefer, `r${items.length}`, items.length % 2 ? 'meaning' : 'fill', 1, 3, false, false, -1, done);
      if (!it) continue;
      done.add(it.answer.th);
      items.push(it);
    }
    return { items, pool };
  }

  const levels = Array.from({ length: n }, (_, i) => (i < Math.round(n * 0.3) ? 1 : i < Math.round(n * 0.7) ? 2 : 3));
  const kinds: Kind[] = levels.map(() => 'fill');
  const at = (lv: number) => levels.flatMap((l, i) => (l === lv && i < n - 1 ? [i] : []));
  for (const lv of [2, 3]) {
    const xs = at(lv);
    if (xs.length) kinds[pick(xs)] = 'meaning';
  }
  const golds = [...at(2), ...at(3)].filter((i) => kinds[i] === 'fill');
  const gold = golds.length ? pick(golds) : -1;
  const order = shuffle(srcs);
  const lastGap = new Map<Src, number>();
  const done = new Set<string>();
  for (let tries = 0; items.length < n && tries < n * 6; tries++) {
    const src = order[tries % order.length];
    const k = items.length;
    const it = buildItem(src, pool, prefer, `r${k}`, kinds[k], levels[k], levels[k] === 1 ? 3 : 4, k === gold, false, lastGap.get(src), done);
    if (!it) continue;
    lastGap.set(src, it.gap);
    done.add(it.answer.th);
    if (done.size > 6) done.delete(done.values().next().value as string);
    items.push(it);
  }
  return { items, pool };
}

// ——— Juego ———

type Phase = 'intro' | 'ask' | 'reveal';
type Clock = { start: number; ms: number };
/** Reloj del bonus (solo se usa en manejadores: la barra es solo para verlo). */
const clockFrom = (delay: number, ms: number): Clock => ({ start: Date.now() + delay, ms });
const remaining = (c: Clock) => clamp(1 - (Date.now() - c.start) / c.ms, 0, 1);
type Flight = { key: string; th: string; from: Box; to: Point };
const TIME = [0, 15000, 12000, 9500];

export default function Hueco({ mode, words, focus, sentences, rounds, gender, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const later = useLater();
  const [setup] = useState(() => makeItems(mode, sentences, words, focus, gender, rounds ?? (feria ? 10 : 2)));
  const [items, setItems] = useState(setup.items);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>(feria ? 'intro' : 'ask');
  const [choice, setChoice] = useState<string | null>(null);
  const [filled, setFilled] = useState(false);
  const [shine, setShine] = useState(0);
  const [points, setPoints] = useState(0);
  const [gained, setGained] = useState(0);
  const [pose, setPose] = useState<NoiPose>('piensa');
  const [jump, setJump] = useState(0);
  const [line, setLine] = useState('');
  const [flight, setFlight] = useState<Flight | null>(null);
  const rootRef = useRef<ViewRef>(null);
  const gapRef = useRef<ViewRef>(null);
  const game = useRef({ points: 0, finished: false, clock: { start: 0, ms: 1 }, adv: '', retries: 0 });
  const bonus = useSharedValue(1);

  const item = items[i] as Item | undefined;
  const hideTag = feria && (item?.level ?? 1) >= 3;
  const hideGloss = feria && (item?.level ?? 1) >= 2;

  // sin frases ni palabras no hay juego: se cierra enseguida
  useEffect(() => {
    const g = game.current;
    if (!items.length && !g.finished) {
      g.finished = true;
      onDone(score.result(0));
    }
  });

  const startClock = (it: Item, delay: number) => {
    if (!feria) return;
    const ms = TIME[it.level] ?? 12000;
    game.current.clock = clockFrom(delay, ms);
    bonus.set(1);
    bonus.set(withDelay(delay, withTiming(0, { duration: ms, easing: Easing.linear })));
  };

  const begin = () => {
    setPhase('ask');
    if (item) startClock(item, 0);
  };
  const beginRef = useRef<() => void>(() => {});
  useEffect(() => {
    beginRef.current = begin;
  });
  const [onCountdown] = useState(() => () => beginRef.current());

  if (!item) return <View style={{ flex: 1 }} />;
  const cat = catOf(item.answer.cat);
  const last = i + 1 >= items.length;

  // ——— Responder ———

  const settle = (ok: boolean) => {
    setFilled(true);
    setShine((s) => s + 1);
    setPhase('reveal');
    later(() => say(item.src.phrase), 300);
    if (feria && ok) {
      const key = item.key;
      game.current.adv = key;
      later(() => {
        if (game.current.adv === key) advance();
      }, 2600);
    }
  };

  const choose = (opt: Opt, box: Box) => {
    if (phase !== 'ask' || choice) return;
    setChoice(opt.key);
    const ok = opt.ok;
    const combo = score.hit(ok);
    onAnswer(ok, item.answer.id);
    const g = game.current;
    const at = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    if (ok) {
      const mult = Math.min(4, 1 + Math.floor(combo / 4)) * (item.gold ? 2 : 1);
      const rem = feria ? remaining(g.clock) : 0;
      bonus.set(rem);
      const pts = 10 * mult + Math.round(rem * 10) * (item.gold ? 2 : 1);
      g.points += pts;
      setPoints(g.points);
      setGained(pts);
      setPose('celebra');
      setJump((j) => j + 1);
      setLine(pick(OK_LINES));
      juice.celebrate(at, feria ? `+${pts}` : '¡Bien!');
      if (combo === 5 || combo === 10 || combo === 15) {
        juice.banner(`¡Racha ×${combo}!`, 'Los puntos se multiplican', color.farol);
        fx.sparkle();
      }
      if (item.kind === 'fill') {
        Promise.all([measureBox(rootRef), measureBox(gapRef)]).then(([root, gap]) => {
          if (!root || !gap) {
            settle(true);
            return;
          }
          const to = { x: gap.x - root.x + gap.w / 2, y: gap.y - root.y + gap.h / 2 };
          setFlight({ key: item.key, th: opt.th ?? '', from: { x: box.x - root.x, y: box.y - root.y, w: box.w, h: box.h }, to });
          later(() => {
            setFlight(null);
            settle(true);
            fx.pop();
            juice.burst({ x: gap.x + gap.w / 2, y: gap.y + gap.h / 2 }, 'chispas', 16, 90);
            juice.ring({ x: gap.x + gap.w / 2, y: gap.y + gap.h / 2 }, color.buatong, 90);
          }, 430);
        });
      } else {
        later(() => {
          settle(true);
          fx.pop();
        }, 250);
      }
      return;
    }
    // fallo: la buena se ilumina y cae en su sitio
    bonus.set(0);
    juice.shake(7);
    setPose('ups');
    setLine(pick(BAD_LINES));
    juice.float(at, opt.th ? (opt.es ? `«${opt.es}»` : '✗') : '✗', color.lacaHondo, 20);
    later(() => {
      settle(false);
      fx.flip();
    }, 650);
    requeue();
  };

  /** Lo fallado vuelve: en la feria, tres rondas después; en la lección, una vez al final. */
  const requeue = () => {
    const g = game.current;
    if (!feria) {
      if (g.retries > 0) return;
      g.retries += 1;
      const it = buildItem(item.src, setup.pool, new Set([item.answer.th]), `x${item.key}`, 'fill', 1, 3, false, true);
      if (it) setItems((list) => [...list, it]);
      return;
    }
    // la primera ronda normal a partir de tres más allá (sin pisar las especiales)
    let target = -1;
    for (let k = i + 3; k < items.length; k++) {
      const x = items[k];
      if (x.kind === 'fill' && !x.gold && !x.retry) {
        target = k;
        break;
      }
    }
    if (target < 0 || g.retries >= 3) return;
    const lv = items[target].level;
    const it = buildItem(item.src, setup.pool, new Set([item.answer.th]), `x${item.key}`, 'fill', lv, lv === 1 ? 3 : 4, false, true);
    if (!it) return;
    g.retries += 1;
    setItems((list) => list.map((x, k) => (k === target ? it : x)));
  };

  const advance = () => {
    const g = game.current;
    g.adv = '';
    if (i + 1 >= items.length) {
      finish();
      return;
    }
    const nx = items[i + 1];
    setI(i + 1);
    setChoice(null);
    setFilled(false);
    setFlight(null);
    setGained(0);
    setPose('piensa');
    setLine('');
    setPhase('ask');
    const up = feria && nx.level > item.level;
    if (up) {
      juice.banner(`¡Nivel ${nx.level}!`, nx.level === 2 ? 'Cuatro fichas y sin traducción' : 'Sin pistas: ¡a leer!', color.farol);
      fx.levelup();
    }
    const sp = nx.retry ? { t: '¡Otra vez!', sub: 'Esta se te escapó', tint: color.cieloHondo } : nx.gold ? { t: '¡Hoja dorada!', sub: 'Puntos ×2', tint: color.buatongHondo } : nx.kind === 'meaning' && feria ? { t: '¡Al revés!', sub: '¿Qué significa la que brilla?', tint: color.mohom } : null;
    if (sp) {
      later(
        () => {
          juice.banner(sp.t, sp.sub, sp.tint);
          fx.sparkle();
        },
        up ? 1350 : 120,
      );
    }
    startClock(nx, up && sp ? 2500 : up || sp ? 1250 : 0);
  };

  const finish = () => {
    const g = game.current;
    if (g.finished) return;
    g.finished = true;
    if (!feria) {
      onDone(score.result(g.points));
      return;
    }
    juice.banner('¡Manuscrito completo!', `${g.points} puntos`, color.arrozal);
    juice.burst(undefined, 'petalos', 28, 170);
    fx.fanfare();
    later(() => onDone(score.result(g.points)), 1400);
  };

  const tapToken = (th: string, at: Point) => {
    say(th);
    const w = WORD_BY_TH.get(th);
    if (w) juice.float(at, shortEs(w.es), color.mohom, 18);
  };

  const ask = item.kind === 'fill' ? '¿Qué palabra falta?' : '¿Qué significa la palabra que brilla?';

  return (
    <View ref={rootRef} style={{ flex: 1 }}>
      <Backdrop scene="templo" />
      <Animated.View style={[{ flex: 1 }, juice.shakeStyle]}>
        <GameHud label="PALABRA" i={i + 1} n={items.length} points={feria ? points : undefined} combo={score.combo} />
        <Leaf item={item} filled={filled} shine={shine} hideTag={hideTag} gapRef={gapRef} onToken={tapToken} />
        {feria ? (
          <View style={styles.clock}>
            <Candle />
            <DrainBar value={bonus} height={7} />
          </View>
        ) : null}

        <View style={styles.noiRow}>
          <Noi pose={pose} size={74} jump={jump} />
          <View style={styles.bubble}>
            <View style={styles.bubbleTail} />
            <Text style={styles.bubbleText} numberOfLines={2}>
              {phase === 'reveal' ? line : ask}
            </Text>
            {phase === 'ask' && item.kind === 'fill' && !hideTag ? <Text style={[styles.bubbleSub, { color: cat.tint }]}>Pista: falta {cat.a}</Text> : null}
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 10 }}>
          {phase === 'reveal' ? (
            <Reveal item={item} ok={!!item.options.find((o) => o.key === choice)?.ok} gained={gained} feria={feria} last={last} onNext={advance} />
          ) : (
            <View style={styles.grid}>
              {item.options.map((o, k) => (
                <OptionTile
                  key={`${item.key}-${o.key}`}
                  opt={o}
                  k={k}
                  meaning={item.kind === 'meaning'}
                  showGloss={!hideGloss}
                  state={choice === null ? 'idle' : o.key === choice ? (o.ok ? 'ok' : 'bad') : o.ok ? 'hint' : 'dim'}
                  hidden={flight !== null && o.key === choice}
                  disabled={phase !== 'ask' || choice !== null}
                  onChoose={choose}
                />
              ))}
            </View>
          )}
        </View>
      </Animated.View>
      {flight ? <Flyer key={flight.key} f={flight} /> : null}
      {phase === 'intro' ? <Countdown onDone={onCountdown} /> : null}
      {juice.layer}
    </View>
  );
}

// ——— La hoja de palmera ———

function Leaf({ item, filled, shine, hideTag, gapRef, onToken }: { item: Item; filled: boolean; shine: number; hideTag: boolean; gapRef: RefObject<ViewRef | null>; onToken: (th: string, at: Point) => void }) {
  const u = `lf${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const chars = item.src.toks.reduce((n, t) => n + t.th.length, 0);
  const fs = chars > 30 ? 21 : chars > 20 ? 24 : 27;
  const romLine = item.src.toks.map((t, k) => (k === item.gap && item.kind === 'fill' && !filled ? '___' : t.rom)).join(' ');
  const gold = item.gold;
  return (
    <View style={styles.leafWrap}>
      <View style={[styles.leaf, gold ? { borderColor: '#E9A800' } : null]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={gold ? '#FFF2B8' : '#F7EACB'} />
              <Stop offset="0.55" stopColor={gold ? '#F6D66B' : '#EDD9A6'} />
              <Stop offset="1" stopColor={gold ? '#E2B33C' : '#D9BC7E'} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${u}g)`} />
          {[0.14, 0.3, 0.46, 0.62, 0.78, 0.92].map((y) => (
            <Line key={y} x1="2%" y1={`${y * 100}%`} x2="98%" y2={`${y * 100 + 0.6}%`} stroke="#B9965A" strokeWidth={0.8} strokeOpacity={0.35} />
          ))}
          <Circle cx="9%" cy="50%" r={5} fill="#8A6A3A" opacity={0.55} />
          <Circle cx="91%" cy="50%" r={5} fill="#8A6A3A" opacity={0.55} />
          <Circle cx="9%" cy="50%" r={2.4} fill="#5A3E1E" opacity={0.7} />
          <Circle cx="91%" cy="50%" r={2.4} fill="#5A3E1E" opacity={0.7} />
        </Svg>
        <View style={[styles.tokens, { minHeight: fs * 1.7 }]}>
          {item.src.toks.map((t, k) =>
            k === item.gap && item.kind === 'fill' ? (
              <GapSlot key={k} th={t.th} fs={fs} filled={filled} tag={hideTag ? null : catOf(item.answer.cat)} gapRef={gapRef} />
            ) : (
              <Token key={k} th={t.th} fs={fs} hi={item.kind === 'meaning' && k === item.gap} filled={filled} gloss={item.kind === 'meaning' && k === item.gap ? item.answer.es : undefined} gapRef={k === item.gap ? gapRef : undefined} onTap={onToken} />
            ),
          )}
        </View>
        <Rom rom={romLine} size={14} style={{ textAlign: 'center', paddingHorizontal: 18 }} />
        <View style={styles.ribbon}>
          <Text style={styles.ribbonText}>{item.src.es}</Text>
          <SpeakBtn size={34} onPress={() => say(item.src.phrase)} />
        </View>
        <Shine trigger={shine} />
      </View>
    </View>
  );
}

function Token({ th, fs, hi, filled, gloss, gapRef, onTap }: { th: string; fs: number; hi: boolean; filled: boolean; gloss?: string; gapRef?: RefObject<ViewRef | null>; onTap: (th: string, at: Point) => void }) {
  return (
    <View ref={gapRef} collapsable={false} style={{ alignItems: 'center' }}>
      {hi && !filled ? <Glow size={fs * 3.4} tint={color.buatong} strength={0.9} style={{ position: 'absolute', top: -fs * 0.9, alignSelf: 'center' }} /> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Escuchar ${th}`} onPress={(e) => onTap(th, { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY - 20 })}>
        <View style={[styles.tok, hi ? styles.tokHi : null]}>
          <Th size={fs} bold={hi} style={{ color: hi ? '#7A2E00' : '#3B2A12' }}>
            {th}
          </Th>
        </View>
      </Pressable>
      {hi && !filled ? (
        <View style={styles.lupaHi} pointerEvents="none">
          <Lupa size={34} />
        </View>
      ) : null}
      {hi && filled && gloss ? (
        <Animated.View entering={FadeInDown.springify().damping(12)} style={styles.glossTag}>
          <Text style={styles.glossText}>{gloss}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function GapSlot({ th, fs, filled, tag, gapRef }: { th: string; fs: number; filled: boolean; tag: { label: string; tint: string } | null; gapRef: RefObject<ViewRef | null> }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, reduced]);
  const pulse = useAnimatedStyle(() => ({ borderColor: filled ? '#2DBE78' : `rgba(233,168,0,${0.55 + 0.45 * t.value})`, transform: [{ scale: filled ? 1 : 1 + 0.03 * t.value }] }));
  return (
    <View style={{ alignItems: 'center', marginTop: tag ? 12 : 0 }}>
      {!filled ? <Glow size={fs * 4} tint={color.buatong} strength={0.85} style={{ position: 'absolute', top: -fs * 1.2, alignSelf: 'center' }} /> : null}
      {tag && !filled ? (
        <View style={[styles.tag, { backgroundColor: tag.tint }]}>
          <Text style={styles.tagText}>{tag.label}</Text>
        </View>
      ) : null}
      <Animated.View ref={gapRef} collapsable={false} style={[styles.gap, { minWidth: fs * 2.6, height: fs * 1.75 }, filled ? styles.gapFilled : null, pulse]}>
        {filled ? (
          <Pop trigger={filled} scale={1.3}>
            <Th size={fs} bold style={{ color: color.arrozalHondo }}>
              {th}
            </Th>
          </Pop>
        ) : (
          <Text style={[styles.gapQ, { fontSize: fs * 0.95 }]}>?</Text>
        )}
      </Animated.View>
      {!filled ? (
        <View style={styles.lupa} pointerEvents="none">
          <Floaty amp={3} ms={1600} rotate={6}>
            <Lupa size={40} />
          </Floaty>
        </View>
      ) : null}
    </View>
  );
}

/** Lupa de Noi: aro dorado, cristal con reflejo y mango de madera. */
function Lupa({ size }: { size: number }) {
  const u = `lp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id={`${u}r`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE58A" />
          <Stop offset="1" stopColor="#C98F00" />
        </LinearGradient>
        <LinearGradient id={`${u}g`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E9F7FF" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#9CCFF0" stopOpacity={0.45} />
        </LinearGradient>
      </Defs>
      <Path d="M26 26 L37 37" stroke="#7A4A22" strokeWidth={6} strokeLinecap="round" />
      <Path d="M26 26 L37 37" stroke="#B9783E" strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx={16} cy={16} r={12} fill={`url(#${u}g)`} stroke={`url(#${u}r)`} strokeWidth={4} />
      <Path d="M10 12 Q12 8 17 8" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Vela del templo que se consume (la barra de al lado marca el bonus por rapidez). */
function Candle() {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 160, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, reduced]);
  const flame = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.9 + 0.18 * t.value }, { rotate: `${-4 + 8 * t.value}deg` }] }));
  return (
    <View style={{ width: 18, height: 28, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, width: 10, height: 13, transformOrigin: '50% 100%' }, flame]}>
        <Svg width={10} height={13} viewBox="0 0 10 13">
          <Path d="M5 0 C7 4 9 6 9 9 A4 4 0 0 1 1 9 C1 6 3 4 5 0 Z" fill="#FF9A2E" />
          <Path d="M5 5 C6 7 7 8 7 9.5 A2 2 0 0 1 3 9.5 C3 8 4 7 5 5 Z" fill="#FFE68A" />
        </Svg>
      </Animated.View>
      <View style={{ width: 9, height: 15, borderRadius: 2.5, backgroundColor: '#FFF4D6', borderWidth: 1, borderColor: '#E3C88A' }} />
    </View>
  );
}

// ——— Fichas de laca ———

type TileState = 'idle' | 'ok' | 'bad' | 'hint' | 'dim';

function OptionTile({ opt, k, meaning, showGloss, state, hidden, disabled, onChoose }: { opt: Opt; k: number; meaning: boolean; showGloss: boolean; state: TileState; hidden: boolean; disabled: boolean; onChoose: (o: Opt, box: Box) => void }) {
  const ref = useRef<ViewRef>(null);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (state === 'bad') shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 60 }), withTiming(-6, { duration: 60 }), withTiming(4, { duration: 60 }), withTiming(0, { duration: 60 }));
    if (state === 'hint' || state === 'ok') shake.value = withSequence(withTiming(-3, { duration: 70 }), withSpring(0, { damping: 6, stiffness: 300 }));
  }, [state, shake]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const h = meaning ? 66 : showGloss ? 78 : 66;
  const face = state === 'ok' || state === 'hint' ? GREEN : LACQUER;
  return (
    <Animated.View entering={FadeInDown.delay(k * 70).springify().damping(14)} style={[{ width: '48%' }, st, { opacity: hidden ? 0 : state === 'dim' ? 0.42 : state === 'bad' ? 0.7 : 1 }]}>
      <View ref={ref} collapsable={false}>
        {state === 'hint' || state === 'ok' ? <Glow size={150} tint={color.arrozalVivo} strength={0.6} style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -75, marginTop: -75 }} /> : null}
        <Press3D
          disabled={disabled}
          accessibilityLabel={opt.th ? `Ficha ${opt.th}` : `Ficha ${opt.es}`}
          style={{ height: h + 5 }}
          onPress={() => ref.current?.measureInWindow((x, y, w, hh) => onChoose(opt, { x, y, w, h: hh }))}>
          <LacquerFace face={face} h={h}>
            {opt.th ? (
              <>
                <Th size={24} bold style={{ color: face.ink }}>
                  {opt.th}
                </Th>
                {showGloss ? (
                  <Text style={[styles.tileGloss, { color: face.sub }]} numberOfLines={1}>
                    {opt.es}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={[styles.tileEs, { color: face.ink }]} numberOfLines={2}>
                {opt.es}
              </Text>
            )}
            {state === 'bad' ? <Text style={styles.cross}>✕</Text> : null}
          </LacquerFace>
        </Press3D>
      </View>
    </Animated.View>
  );
}

const LACQUER = { a: '#EE5B52', b: '#C9302E', c: '#9E1F21', slab: '#6E1414', rim: '#F4C65A', ink: '#FFF4DA', sub: '#FFD98A' };
const GREEN = { a: '#4FD18F', b: '#1FA567', c: '#0E7A48', slab: '#0A5532', rim: '#F4C65A', ink: '#FFFFFF', sub: '#E3FFD1' };

function LacquerFace({ face, h, children }: { face: typeof LACQUER; h: number; children: ReactNode }) {
  const u = `lq${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[styles.slab, { backgroundColor: face.slab }]}>
      <View style={[styles.face, { height: h, borderColor: face.rim }]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={u} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={face.a} />
              <Stop offset="0.55" stopColor={face.b} />
              <Stop offset="1" stopColor={face.c} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${u})`} />
          <Ellipse cx="30%" cy="10%" rx="40%" ry="16%" fill="#FFFFFF" opacity={0.16} />
          <G opacity={0.5}>
            <Rect x="4" y="4" width="10" height="10" fill="none" stroke={face.rim} strokeWidth={1} transform="rotate(45 9 9)" />
          </G>
        </Svg>
        <View style={[styles.innerRim, { borderColor: face.rim }]} />
        {children}
      </View>
    </View>
  );
}

function Flyer({ f }: { f: Flight }) {
  const x = useSharedValue(f.from.x + f.from.w / 2);
  const y = useSharedValue(f.from.y + f.from.h / 2);
  const s = useSharedValue(1);
  const r = useSharedValue(0);
  useEffect(() => {
    x.value = withTiming(f.to.x, { duration: 420, easing: Easing.out(Easing.cubic) });
    y.value = withSequence(withTiming(Math.min(f.from.y, f.to.y) - 40, { duration: 200, easing: Easing.out(Easing.quad) }), withTiming(f.to.y, { duration: 220, easing: Easing.in(Easing.quad) }));
    s.value = withTiming(0.62, { duration: 420 });
    r.value = withSequence(withTiming(-12, { duration: 200 }), withTiming(0, { duration: 220 }));
  }, [f, x, y, s, r]);
  const w = f.from.w;
  const h = f.from.h;
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - w / 2 }, { translateY: y.value - h / 2 }, { rotate: `${r.value}deg` }, { scale: s.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h, zIndex: 50 }, st]}>
      <LacquerFace face={GREEN} h={h - 5}>
        <Th size={24} bold style={{ color: '#FFFFFF' }}>
          {f.th}
        </Th>
      </LacquerFace>
    </Animated.View>
  );
}

// ——— Lo que hace la palabra ———

function Reveal({ item, ok, gained, feria, last, onNext }: { item: Item; ok: boolean; gained: number; feria: boolean; last: boolean; onNext: () => void }) {
  const a = item.answer;
  const c = catOf(a.cat);
  const what = a.note ?? c.what;
  return (
    <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.reveal}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.okDot, { backgroundColor: ok ? color.arrozalVivo : color.laca }]}>
          <Text style={styles.okDotText}>{ok ? '✓' : '↻'}</Text>
        </View>
        <Txt v="h3" style={{ flex: 1, color: ok ? color.arrozalHondo : color.lacaHondo }}>
          {ok ? (item.kind === 'fill' ? '¡Encontrada!' : '¡Eso significa!') : 'Era esta:'}
        </Txt>
        {feria && ok && gained ? (
          <Animated.View entering={FadeIn} style={styles.gain}>
            <Text style={styles.gainText}>+{gained}</Text>
          </Animated.View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Th size={26} bold>
          {a.th}
        </Th>
        <View style={{ gap: 0 }}>
          <Rom rom={a.rom} size={14} />
          <Text style={styles.revealEs}>{a.full || a.es}</Text>
        </View>
        <View style={[styles.catChip, { backgroundColor: c.tint }]}>
          <Text style={styles.catChipText}>{c.label}</Text>
        </View>
      </View>
      {what ? (
        <View style={styles.note}>
          <Text style={styles.noteLabel}>QUÉ HACE</Text>
          <Text style={styles.noteText} numberOfLines={4}>
            {what}
          </Text>
        </View>
      ) : null}
      <Btn label={last ? 'Terminar' : feria && ok ? 'Siguiente ›' : 'Siguiente'} height={46} onPress={onNext} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  leafWrap: { paddingHorizontal: 12, paddingTop: 4 },
  leaf: {
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#B08A4A',
    overflow: 'hidden',
    paddingTop: 16,
    paddingBottom: 10,
    gap: 6,
    shadowColor: '#5A3A10',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', columnGap: 4, rowGap: 10, paddingHorizontal: 22 },
  tok: { borderRadius: 10, paddingHorizontal: 3 },
  tokHi: { backgroundColor: 'rgba(255,214,90,0.55)', borderWidth: 2, borderColor: '#E9A800', paddingHorizontal: 6 },
  lupaHi: { position: 'absolute', right: -20, top: -24 },
  glossTag: { marginTop: 2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: color.arrozal },
  glossText: { fontFamily: font.uiHeavy, fontSize: 12, color: '#FFFFFF' },
  gap: { borderRadius: 14, borderWidth: 3, borderStyle: 'dashed', backgroundColor: 'rgba(255,248,214,0.75)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  gapFilled: { borderStyle: 'solid', backgroundColor: 'rgba(221,245,232,0.95)' },
  gapQ: { fontFamily: font.displayBold, color: '#C98F00' },
  tag: { position: 'absolute', top: -14, zIndex: 2, paddingHorizontal: 8, height: 18, borderRadius: 9, justifyContent: 'center' },
  tagText: { fontFamily: font.uiHeavy, fontSize: 10, letterSpacing: 0.4, color: '#FFFFFF' },
  lupa: { position: 'absolute', right: -24, top: -22 },
  ribbon: {
    marginHorizontal: 14,
    marginTop: 2,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#A82A28',
    borderWidth: 1.5,
    borderColor: '#F4C65A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ribbonText: { flex: 1, fontFamily: font.display, fontSize: 17, lineHeight: 21, color: '#FFF4DA' },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingTop: 8 },
  noiRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, marginTop: 4 },
  bubble: { flex: 1, minHeight: 50, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.94)', shadowColor: '#5A3A10', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  bubbleTail: { position: 'absolute', left: -6, top: 18, width: 14, height: 14, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.94)', transform: [{ rotate: '45deg' }] },
  bubbleText: { fontFamily: font.display, fontSize: 17, lineHeight: 21, color: color.tinta },
  bubbleSub: { fontFamily: font.uiHeavy, fontSize: 12, marginTop: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: '4%', rowGap: 12, paddingHorizontal: 14 },
  slab: { borderRadius: 18, paddingBottom: 5, shadowColor: '#4A0E0E', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  face: { borderRadius: 17, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  innerRim: { position: 'absolute', left: 5, right: 5, top: 5, bottom: 5, borderRadius: 13, borderWidth: 1, opacity: 0.45 },
  tileGloss: { fontFamily: font.uiBold, fontSize: 12, marginTop: -4 },
  tileEs: { fontFamily: font.display, fontSize: 17, lineHeight: 20, textAlign: 'center' },
  cross: { position: 'absolute', right: 10, top: 6, fontFamily: font.displayBold, fontSize: 16, color: '#FFE0DC' },
  reveal: {
    marginHorizontal: 12,
    padding: 14,
    gap: 8,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 5,
    borderTopColor: '#C9302E',
    shadowColor: '#5A3A10',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  okDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  okDotText: { fontFamily: font.displayBold, fontSize: 15, color: '#FFFFFF' },
  gain: { paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: color.azafranSuave, justifyContent: 'center' },
  gainText: { fontFamily: font.displayBold, fontSize: 15, color: color.azafranHondo },
  revealEs: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  catChip: { paddingHorizontal: 9, height: 22, borderRadius: 11, justifyContent: 'center' },
  catChipText: { fontFamily: font.uiHeavy, fontSize: 11, color: '#FFFFFF', letterSpacing: 0.3 },
  note: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF6E0', borderWidth: 1, borderColor: '#F0D9A6' },
  noteLabel: { fontFamily: font.uiHeavy, fontSize: 10, letterSpacing: 1, color: '#A86F00' },
  noteText: { fontFamily: font.ui, fontSize: 14, lineHeight: 19, color: color.tinta2 },
});
