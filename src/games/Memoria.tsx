// Juego 2 · Memoria del templo: cartas Lanna (rojas = thai, azules = español) que se reparten en abanico,
// se dejan ver un momento (más cuanto mayor es la cuadrícula) y se voltean en 3D. Las parejas enseñan su otra
// mitad, brillan y salen flotando entre pétalos. Explorar a ciegas no es fallar: solo cuenta como despiste dejar
// pasar una pareja que ya se había visto, y nunca baja la palabra en el repaso (puede ser solo la memoria). En la
// feria la cuadrícula crece por niveles, desde el 3 hay cartas «de oído», y una varilla de incienso marca el tiempo.
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Rom, Speech, Th, Txt } from '@/components/ui';
import type { Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { useJuice, type Point } from './fx';
import { ComboBadge, useScore } from './kit';
import { Carta, Loto, type CardData } from './memoria/Carta';
import { INC_H, Incienso } from './memoria/Incienso';
import { LevelChip, MultChip, ScoreChip, ToastRibbon, distinct, fitTh, multFor, pickWords, pointIn, romFor, thWidth, useLater, useToast } from './palabras/common';
import type { GameProps } from './types';

/** Parejas por nivel de la feria: la cuadrícula crece (3×2, 4×2, 4×3, 4×4…). */
const LEVELS = [3, 4, 6, 8, 8, 8];
/** Segundos de incienso al empezar (varilla entera) y los que devuelve cada nivel superado. */
const FULL_S = 80;
const LEVEL_S = 15;
const GAP = 9;
const RATIO = 1.3;
/** Milisegundos entre carta y carta al repartir. */
const DEAL_STEP = 45;
/** Ancho útil del bocadillo de Noi en el móvil más estrecho (para que el thai quepa en una línea). */
const BUBBLE_W = 190;

/** Cartas thai «de oído» (sin escritura: se voltean y se escuchan) en cada nivel de la feria. */
const audioFor = (level: number) => (level >= 5 ? 3 : level === 4 ? 2 : level === 3 ? 1 : 0);
/** Vistazo antes de jugar: crece con la cuadrícula (unos 0,3 s por carta), para que 16 cartas no sean pura suerte. */
const peekFor = (pairs: number) => Math.max(2600, 900 + 520 * pairs);

type Bubble = { kind: 'intro' | 'peek' | 'flip' | 'ok' | 'bad' | 'miss'; card?: CardData };
type Clear = { n: number; stars: number; title: string; sub: string };
type Pose = 'feliz' | 'celebra' | 'ups' | 'piensa' | 'escucha';

const clock = () => Date.now();

function makeDeck(list: Word[], audioN = 0): CardData[] {
  const audio = new Set(
    shuffle(list)
      .slice(0, audioN)
      .map((w) => w.id),
  );
  return shuffle(
    list.flatMap((w) => [
      { key: `${w.id}-th`, pair: w.id, side: 'th' as const, word: w, audio: audio.has(w.id) },
      { key: `${w.id}-es`, pair: w.id, side: 'es' as const, word: w },
    ]),
  );
}

/** La otra mitad de una carta. */
const partnerKey = (c: CardData) => `${c.pair}-${c.side === 'th' ? 'es' : 'th'}`;

const MAX_W = 118;

/** Columnas y tamaño de carta que mejor llenan el hueco (cartas lo más grandes posible, filas completas si se puede). */
function gridFor(n: number, w: number, h: number): { cols: number; rows: number; cw: number } {
  let best = { cols: 2, rows: Math.ceil(n / 2), cw: 0, score: -1 };
  for (const cols of [2, 3, 4, 5]) {
    const rows = Math.ceil(n / cols);
    const cw = Math.max(0, Math.min(MAX_W, (w - (cols - 1) * GAP) / cols, (h - (rows - 1) * GAP) / rows / RATIO));
    const score = cw - (n % cols ? 6 : 0);
    if (score > best.score) best = { cols, rows, cw, score };
  }
  return best;
}

/**
 * Estrellas de un nivel según los despistes (parejas que ya se habían visto y se dejaron pasar): voltear a ciegas
 * para descubrir cartas no resta.
 */
const starsFor = (slips: number, pairs: number) => (slips <= Math.floor(pairs / 3) ? 3 : slips <= Math.ceil(pairs * 0.75) ? 2 : 1);

/** Juego 2 · Memoria del templo: voltea cartas Lanna y encuentra las parejas thai ↔ español. */
export default function Memoria({ mode, words, focus, reads, review, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const toast = useToast();
  const later = useLater();
  const burn = useSharedValue(0);
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const gridRef = useRef<ComponentRef<typeof View>>(null);

  const [pool] = useState(() => distinct([...focus, ...words]));
  const [fresh] = useState(() => new Set(review ? [] : focus.map((w) => w.id)));
  const [deck, setDeck] = useState(() => {
    const n = feria ? LEVELS[0] : Math.min(4, Math.max(3, focus.length));
    return { round: 0, cards: makeDeck(pickWords(n, { focus: feria ? [] : focus, pool })) };
  });
  const [phase, setPhase] = useState<'deal' | 'peek' | 'play' | 'clear' | 'end'>('deal');
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [gone, setGone] = useState<string[]>([]);
  const [shakes, setShakes] = useState<Record<string, number>>({});
  const [waveClose, setWaveClose] = useState(false);
  const [moves, setMoves] = useState(0);
  const [slips, setSlips] = useState(0);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [secs, setSecs] = useState(FULL_S);
  const [bubble, setBubble] = useState<Bubble>({ kind: 'intro' });
  const [pose, setPose] = useState<Pose>('piensa');
  const [jump, setJump] = useState(0);
  const [clear, setClear] = useState<Clear | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [rowW, setRowW] = useState(0);

  const g = useRef({
    level: 1,
    points: 0,
    moves: 0,
    slips: 0,
    ended: false,
    done: false,
    running: false,
    remaining: FULL_S * 1000,
    deadline: 0,
    lastTick: 0,
    poseN: 0,
    closeN: 0,
    pending: [] as string[],
    seen: new Set<string>(),
    used: new Set<string>(),
    retry: [] as Word[],
    matchedN: 0,
    clearN: 0,
  });

  const pairs = deck.cards.length / 2;
  const tooFew = pairs < 2;
  const bail = useEffectEvent(() => onDone(score.result(0)));
  useEffect(() => {
    if (!tooFew) return;
    const t = setTimeout(() => bail(), 400);
    return () => clearTimeout(t);
  }, [tooFew]);

  // ——— Noi ———

  const setMood = (p: Pose, ms = 1400) => {
    const s = g.current;
    s.poseN += 1;
    const n = s.poseN;
    setPose(p);
    later(() => {
      if (g.current.poseN === n) setPose('feliz');
    }, ms);
  };

  // ——— el incienso (solo feria) ———

  const pFor = (ms: number) => 1 - ms / (FULL_S * 1000);

  const startClock = () => {
    const s = g.current;
    if (!feria || s.running || s.ended) return;
    s.running = true;
    s.deadline = clock() + s.remaining;
    burn.set(pFor(s.remaining));
    burn.set(withTiming(1, { duration: s.remaining, easing: Easing.linear }));
  };

  const pauseClock = () => {
    const s = g.current;
    if (!feria || !s.running) return;
    s.running = false;
    s.remaining = Math.max(0, s.deadline - clock());
    burn.set(pFor(s.remaining));
  };

  const addTime = (sec: number) => {
    const s = g.current;
    s.remaining = Math.min(FULL_S * 1000, s.remaining + sec * 1000);
    burn.set(withSpring(pFor(s.remaining), { damping: 14, stiffness: 90 }));
    setSecs(Math.ceil(s.remaining / 1000));
  };

  // ——— finales ———

  const petalShow = (n: number) => {
    const spots: [number, number][] = [
      [0.5, 0.3],
      [0.22, 0.45],
      [0.78, 0.4],
      [0.5, 0.55],
    ];
    spots.slice(0, n).forEach(([x, y], i) =>
      later(() => {
        pointIn(rootRef, x, y, (at) => {
          juice.burst(at, 'petalos', 22, 190);
          juice.burst(at, 'estrellas', 10, 130);
        });
      }, i * 260),
    );
  };

  const finishOnce = (ms: number) => {
    const s = g.current;
    later(() => {
      if (s.done) return;
      s.done = true;
      onDone(score.result(s.points));
    }, ms);
  };

  const endGame = (why: 'tiempo' | 'templo' | 'leccion', stars = 0) => {
    const s = g.current;
    if (s.ended) return;
    s.ended = true;
    s.running = false;
    setPhase('end');
    setJump((j) => j + 1);
    if (why === 'tiempo') {
      // se descubren las que quedaban, para verlas una vez más
      setOpen(deck.cards.map((c) => c.key));
      fx.bell();
      juice.banner('Se apagó el incienso', `${s.points} puntos · nivel ${s.level}`, color.azafranHondo);
      petalShow(2);
      setMood('feliz', 4000);
      finishOnce(2600);
      return;
    }
    fx.fanfare();
    petalShow(4);
    setMood('celebra', 4000);
    if (why === 'templo') {
      const bonus = Math.ceil(s.remaining / 1000) * 5;
      s.points += bonus;
      setPoints(s.points);
      setClear(null);
      juice.banner('¡Templo completo!', `+${bonus} por el incienso que sobra`, color.buatong);
    } else {
      setClear({ n: s.clearN + 1, stars, title: '¡Memoria de elefante!', sub: `${s.moves} movimientos` });
    }
    finishOnce(2300);
  };

  const onTick = useEffectEvent(() => {
    const s = g.current;
    if (!s.running || s.ended) return;
    const left = s.deadline - clock();
    const sec = Math.max(0, Math.ceil(left / 1000));
    setSecs(sec);
    if (sec <= 5 && sec > 0 && sec !== s.lastTick) {
      s.lastTick = sec;
      fx.tick();
    }
    if (left <= 0) {
      s.remaining = 0;
      endGame('tiempo');
    }
  });
  useEffect(() => {
    if (!feria || phase !== 'play') return;
    const t = setInterval(() => onTick(), 250);
    return () => clearInterval(t);
  }, [feria, phase]);

  // ——— reparto, vistazo y juego ———

  const toPeek = useEffectEvent(() => {
    if (g.current.ended) return;
    setPhase('peek');
    setBubble({ kind: 'peek' });
    setPose('escucha');
    fx.flip();
  });
  const toPlay = useEffectEvent(() => {
    if (g.current.ended) return;
    setPhase('play');
    setWaveClose(true);
    setBubble({ kind: 'intro' });
    setPose('piensa');
    fx.whoosh();
    startClock();
  });
  const endWave = useEffectEvent(() => setWaveClose(false));
  useEffect(() => {
    const n = deck.cards.length;
    const dealMs = n * DEAL_STEP + 420;
    const peekMs = peekFor(n / 2);
    const t1 = setTimeout(() => toPeek(), dealMs);
    const t2 = setTimeout(() => toPlay(), dealMs + peekMs);
    const t3 = setTimeout(() => endWave(), dealMs + peekMs + n * 30 + 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [deck.round, deck.cards.length]);

  const dealLevel = (lv: number) => {
    const s = g.current;
    for (const c of deck.cards) s.used.add(c.pair);
    const first = s.retry.splice(0, 2);
    const list = pickWords(LEVELS[Math.min(LEVELS.length, lv) - 1], { first, pool, used: s.used });
    s.seen = new Set();
    s.matchedN = 0;
    s.pending = [];
    setDeck((d) => ({ round: d.round + 1, cards: makeDeck(list, audioFor(lv)) }));
    setPhase('deal');
    setOpen([]);
    setMatched([]);
    setLeaving([]);
    setGone([]);
    setShakes({});
    setClear(null);
    setLevel(lv);
    fx.swish();
  };

  const roundCleared = () => {
    const s = g.current;
    if (s.ended) return;
    const stars = starsFor(s.slips, pairs);
    if (!feria) {
      endGame('leccion', stars);
      return;
    }
    pauseClock();
    setPhase('clear');
    const bonus = stars * 10 * s.level;
    s.points += bonus;
    setPoints(s.points);
    s.clearN += 1;
    setClear({ n: s.clearN, stars, title: `¡Nivel ${s.level} superado!`, sub: `${s.moves} movimientos · +${bonus}` });
    fx.levelup();
    petalShow(2);
    setMood('celebra');
    if (s.level >= LEVELS.length) {
      later(() => endGame('templo'), 1200);
      return;
    }
    addTime(LEVEL_S);
    later(() => {
      s.level += 1;
      s.moves = 0;
      s.slips = 0;
      setMoves(0);
      setSlips(0);
      dealLevel(s.level);
    }, 1350);
  };

  const center = (c: CardData) => {
    const i = deck.cards.indexOf(c);
    const p = posOf(i);
    return { x: p.x + cw / 2, y: p.y + ch / 2 };
  };

  const matchPair = (a: CardData, b: CardData) => {
    const s = g.current;
    const th = a.side === 'th' ? a : b;
    const combo = score.hit(true);
    onAnswer(true, a.pair);
    if (b.side === 'es') say(th.word.th);
    const gain = 10 * multFor(combo);
    s.points += gain;
    setPoints(s.points);
    s.matchedN += 1;
    // con la última pareja se para el incienso: lo que queda de fiesta ya no gasta tiempo
    const last = s.matchedN >= pairs;
    if (last) pauseClock();
    setMatched((m) => [...m, a.pair]);
    setOpen([]);
    setBubble({ kind: 'ok', card: th });
    setJump((j) => j + 1);
    if (combo >= 3) setMood('celebra');
    if (combo > 0 && combo % 5 === 0) toast.show(`¡Racha ×${combo}!`, 'los puntos se multiplican', color.farol);
    const ca = center(a);
    const cb = center(b);
    gridRef.current?.measureInWindow((gx, gy) => {
      const at: Point = { x: gx + (ca.x + cb.x) / 2, y: gy + (ca.y + cb.y) / 2 };
      later(() => {
        juice.burst(at, 'petalos', 16, 140);
        juice.burst(at, 'estrellas', 8, 110);
        juice.ring(at, color.buatong, 120);
        juice.float(at, `+${gain}`, color.azafranHondo, 32);
      }, 300);
    });
    // las dos cartas enseñan un momento la pareja entera (thai + significado) y salen flotando
    later(() => setLeaving((l) => [...l, a.pair]), 700);
    later(() => setGone((gn) => [...gn, a.pair]), 1300);
    if (last) later(roundCleared, 800);
  };

  /**
   * No eran pareja. `known`: la pareja de la primera carta ya se había visto en esta ronda, así que se podía saber
   * (un despiste: cuenta en la partida y la palabra vuelve en otro nivel). Si no, era explorar: ni cuenta ni corta
   * la racha. En ningún caso baja la palabra en el repaso espaciado: en un juego de memoria no se distingue no saber
   * la palabra de no recordar el sitio.
   */
  const missPair = (a: CardData, b: CardData, known: boolean) => {
    const s = g.current;
    if (known) {
      score.hit(false, false);
      s.slips += 1;
      setSlips(s.slips);
      if (!s.retry.some((w) => w.id === a.word.id)) s.retry.push(a.word);
      fx.bad();
      setBubble({ kind: 'bad', card: a });
      setMood('ups');
    } else setBubble({ kind: 'miss', card: a });
    setShakes((sh) => ({ ...sh, [a.key]: (sh[a.key] ?? 0) + 1, [b.key]: (sh[b.key] ?? 0) + 1 }));
    s.pending = [a.key, b.key];
    s.closeN += 1;
    const n = s.closeN;
    later(() => {
      // si entre tanto se apagó el incienso, las cartas se quedan descubiertas para verlas una vez más
      if (g.current.closeN !== n || s.ended) return;
      s.pending = [];
      setOpen([]);
    }, 1050);
  };

  const tap = (c: CardData) => {
    const s = g.current;
    if (phase !== 'play' || s.ended) return;
    if (matched.includes(c.pair) || (open.includes(c.key) && !s.pending.length)) return;
    let current = open;
    // si aún se ven las dos falladas, la nueva jugada las tapa ya
    if (s.pending.length) {
      if (s.pending.includes(c.key)) return;
      s.closeN += 1;
      s.pending = [];
      current = [];
    }
    fx.flip();
    if (c.side === 'th') say(c.word.th);
    if (current.length === 0) {
      s.seen.add(c.key);
      setOpen([c.key]);
      setBubble({ kind: 'flip', card: c });
      return;
    }
    const first = deck.cards.find((x) => x.key === current[0]);
    if (!first) return;
    const known = s.seen.has(partnerKey(first));
    s.seen.add(c.key);
    setOpen([first.key, c.key]);
    s.moves += 1;
    setMoves(s.moves);
    if (first.pair === c.pair) matchPair(first, c);
    else missPair(first, c, known);
  };

  /** Transcripción de una carta: siempre mientras no se sabe leer; después solo en lo nuevo (lección) o el nivel 1 (feria). */
  const romOf = (w: Word) => romFor(reads, { feria, level, review: !fresh.has(w.id) });
  const hasAudio = deck.cards.some((c) => c.audio);

  // ——— geometría de la cuadrícula ———

  const { cols, rows, cw } = area.w > 0 ? gridFor(deck.cards.length, area.w, area.h) : { cols: 2, rows: 1, cw: 0 };
  const ch = cw * RATIO;
  const ox = (area.w - (cols * cw + (cols - 1) * GAP)) / 2;
  const oy = Math.max(0, (area.h - (rows * ch + (rows - 1) * GAP)) / 2);
  const lastRow = deck.cards.length % cols;
  // la última fila, si está incompleta, va centrada
  const posOf = (i: number) => {
    const row = Math.floor(i / cols);
    const shift = lastRow && row === rows - 1 ? ((cols - lastRow) * (cw + GAP)) / 2 : 0;
    return { x: ox + shift + (i % cols) * (cw + GAP), y: oy + row * (ch + GAP) };
  };

  return (
    <View ref={rootRef} style={{ flex: 1 }}>
      <Backdrop scene="templo" />
      <Animated.View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }, juice.shakeStyle]}>
        <View style={styles.hud}>
          <ScoreChip value={points} />
          <View style={styles.hudMid}>
            <ComboBadge combo={score.combo} />
            <MultChip mult={multFor(score.combo)} />
          </View>
          {feria ? <LevelChip level={level} /> : <ParesChip found={gone.length} total={pairs} />}
        </View>
        <View style={styles.row2}>
          <StarsMeter slips={slips} pairs={pairs} />
          <Text style={styles.moves} numberOfLines={1}>
            {moves} {moves === 1 ? 'movimiento' : 'movimientos'}
            {slips ? ` · ${slips} ${slips === 1 ? 'despiste' : 'despistes'}` : ''}
          </Text>
        </View>
        {feria ? (
          <View style={{ height: INC_H }} onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
            {rowW > 0 ? <Incienso burn={burn} width={rowW} secs={secs} /> : null}
          </View>
        ) : null}

        <View ref={gridRef} style={{ flex: 1, marginTop: 6 }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {cw > 0
            ? deck.cards.map((c, i) => {
                const p = posOf(i);
                if (gone.includes(c.pair)) return <Loto key={`l-${deck.round}-${c.key}`} x={p.x} y={p.y} w={cw} h={ch} />;
                return (
                  <Carta
                    key={`${deck.round}-${c.key}`}
                    card={c}
                    w={cw}
                    h={ch}
                    x={p.x}
                    y={p.y}
                    from={{ x: area.w / 2 - cw / 2 - p.x, y: -ch - 30 - p.y }}
                    open={phase === 'peek' || open.includes(c.key)}
                    matched={matched.includes(c.pair)}
                    leaving={leaving.includes(c.pair)}
                    shake={shakes[c.key] ?? 0}
                    dealDelay={i * DEAL_STEP}
                    flipDelay={waveClose ? i * 30 : 0}
                    disabled={phase !== 'play'}
                    showRom={romOf(c.word)}
                    reveal={phase === 'end'}
                    onPress={() => tap(c)}
                  />
                );
              })
            : null}
        </View>

        {/* alto fijo: lo que diga Noi nunca mueve la cuadrícula mientras se memoriza */}
        <View style={styles.bottom}>
          <Noi pose={pose} size={84} jump={jump} />
          <Speech tail="left" style={styles.speech}>
            <View style={styles.speechIn}>
              <BubbleText b={bubble} rom={!bubble.card || bubble.kind !== 'flip' || romOf(bubble.card.word)} peekMs={peekFor(pairs)} round={deck.round} hasAudio={hasAudio} />
            </View>
          </Speech>
        </View>
        <ToastRibbon toast={toast.now} style={{ top: 46 }} />
      </Animated.View>
      {clear ? <LevelClear key={clear.n} stars={clear.stars} title={clear.title} sub={clear.sub} /> : null}
      {juice.layer}
    </View>
  );
}

/** Lo que dice Noi. Cabe siempre en el alto fijo del bocadillo (una línea de thai y, como mucho, dos de texto). */
function BubbleText({ b, rom, peekMs, round, hasAudio }: { b: Bubble; rom: boolean; peekMs: number; round: number; hasAudio: boolean }) {
  const w = b.card?.word;
  if (b.kind === 'peek')
    return (
      <View style={{ gap: 6 }}>
        <Txt v="bodyStrong" numberOfLines={2}>
          {hasAudio ? '¡Fíjate bien! Las del altavoz solo se oyen.' : '¡Fíjate bien dónde está cada una!'}
        </Txt>
        <PeekBar key={round} ms={peekMs} />
      </View>
    );
  if (!w || b.kind === 'intro')
    return (
      <Txt v="bodyStrong" numberOfLines={2}>
        <Text style={{ color: color.laca }}>Rojas: thai</Text> · <Text style={{ color: color.mohom }}>azules: español</Text>. ¡Busca las parejas!
      </Txt>
    );
  if (b.kind === 'miss')
    return (
      <Txt v="bodyStrong" numberOfLines={2}>
        ไม่เป็นไร · ¡ahora ya sabes dónde están!
      </Txt>
    );
  // thai y transcripción en una línea si caben; si no, la transcripción baja y el texto se queda en una línea
  const fit = fitTh(w.th, BUBBLE_W, 18, 12);
  const inline = !rom || thWidth(w.th) * fit.size + 8 + w.rom.length * 6.4 <= BUBBLE_W;
  const head = (
    <View style={inline ? styles.head : null}>
      <Th size={fit.size} bold numberOfLines={1} style={{ lineHeight: 26 }}>
        {w.th}
      </Th>
      {rom ? (
        <View style={styles.headRom}>
          <Rom rom={w.rom} size={12} />
        </View>
      ) : null}
    </View>
  );
  if (b.kind === 'ok')
    return (
      <Animated.View entering={ZoomIn.springify().damping(14)}>
        {head}
        <Text numberOfLines={inline ? 2 : 1} style={[styles.say, { color: color.arrozalHondo }]}>
          = «{w.es}» ✓
        </Text>
      </Animated.View>
    );
  if (b.kind === 'bad')
    return (
      <Animated.View entering={ZoomIn.springify().damping(14)}>
        {head}
        <Text numberOfLines={inline ? 2 : 1} style={[styles.say, { color: color.lacaHondo }]}>
          es «{w.es}» · su pareja ya había salido
        </Text>
      </Animated.View>
    );
  if (b.card?.side === 'es')
    return (
      <View>
        <Txt v="bodyStrong" numberOfLines={1}>
          «{w.es}»
        </Txt>
        <Txt v="small" numberOfLines={1}>
          ¿Cuál será en thai?
        </Txt>
      </View>
    );
  if (b.card?.audio)
    return (
      <View>
        <Txt v="bodyStrong" numberOfLines={1}>
          ¿Qué has oído?
        </Txt>
        <Txt v="small" numberOfLines={1}>
          Busca lo que significa.
        </Txt>
      </View>
    );
  return (
    <View>
      {head}
      <Txt v="small" numberOfLines={1}>
        ¿Dónde estará su pareja?
      </Txt>
    </View>
  );
}

/** Barrita que se vacía mientras dura el vistazo: se ve cuánto queda para memorizar. */
function PeekBar({ ms }: { ms: number }) {
  const p = useSharedValue(1);
  useEffect(() => {
    p.value = withTiming(0, { duration: ms, easing: Easing.linear });
  }, [p, ms]);
  const st = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={styles.peek}>
      <Animated.View style={[styles.peekFill, st]} />
    </View>
  );
}

function ParesChip({ found, total }: { found: number; total: number }) {
  return (
    <View style={styles.pares}>
      <Text style={styles.paresNum}>
        {found}
        <Text style={{ color: color.tinta3, fontSize: 15 }}> / {total}</Text>
      </Text>
    </View>
  );
}

const STAR = 'M12 1.8l2.9 6.4 7 .7-5.3 4.7 1.6 6.9L12 17l-6.2 3.5 1.6-6.9L2.1 8.9l7-.7z';

function StarIcon({ on, size = 20 }: { on: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR} fill={on ? '#FFC83D' : 'rgba(29,35,71,0.16)'} stroke={on ? '#C98F00' : 'rgba(29,35,71,0.25)'} strokeWidth={1.4} strokeLinejoin="round" />
      {on ? <Path d="M8.5 8.5 L11 7.8" stroke="#FFF6C8" strokeWidth={1.6} strokeLinecap="round" /> : null}
    </Svg>
  );
}

/** Las tres estrellas del nivel: se apagan con los despistes (no por voltear cartas que aún no se conocían). */
function StarsMeter({ slips, pairs }: { slips: number; pairs: number }) {
  const stars = starsFor(slips, pairs);
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3].map((k) => (
        <StarIcon key={k} on={k <= stars} />
      ))}
    </View>
  );
}

/** Cartel de nivel superado con tres estrellas que caen una a una. */
function LevelClear({ stars, title, sub }: { stars: number; title: string; sub: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withSpring(1, { damping: 11, stiffness: 160 });
  }, [p]);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 1.6), transform: [{ scale: 0.4 + 0.6 * p.value }, { rotate: `${(1 - p.value) * -8}deg` }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View style={[styles.clear, st]}>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: -44 }}>
          {[1, 2, 3].map((k) => (
            <BigStar key={k} on={k <= stars} delay={110 + k * 150} big={k === 2} />
          ))}
        </View>
        <Text style={styles.clearTitle}>{title}</Text>
        <Text style={styles.clearSub}>{sub}</Text>
      </Animated.View>
    </View>
  );
}

function BigStar({ on, delay, big }: { on: boolean; delay: number; big: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 200 }));
    if (on) {
      const t = setTimeout(() => fx.coin(), delay);
      return () => clearTimeout(t);
    }
  }, [p, delay, on]);
  const st = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2), transform: [{ scale: 0.2 + 0.8 * p.value }, { rotate: `${(1 - p.value) * 90}deg` }] }));
  const size = big ? 58 : 46;
  return (
    <Animated.View style={[{ marginTop: big ? -10 : 0 }, st]}>
      <StarIcon on={on} size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46 },
  hudMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  row2: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2, paddingBottom: 2 },
  moves: { fontFamily: font.uiHeavy, fontSize: 13, color: '#7A3A10' },
  pares: { height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  paresNum: { fontFamily: font.displayBold, fontSize: 19, color: color.tinta },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 108, paddingBottom: 6 },
  speech: { flex: 1, marginBottom: 22, height: 78, paddingVertical: 8, justifyContent: 'center' },
  speechIn: { height: 62, justifyContent: 'center', overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  headRom: { flexShrink: 1, maxHeight: 18, overflow: 'hidden' },
  say: { fontFamily: font.uiBold, fontSize: 13.5, lineHeight: 17 },
  peek: { height: 6, borderRadius: 3, backgroundColor: color.niebla2, overflow: 'hidden' },
  peekFill: { height: '100%', borderRadius: 3, backgroundColor: color.azafran },
  clear: {
    minWidth: 250,
    paddingHorizontal: 26,
    paddingTop: 16,
    paddingBottom: 18,
    borderRadius: 28,
    backgroundColor: '#FFFBF0',
    borderWidth: 4,
    borderColor: '#E9B44C',
    alignItems: 'center',
    shadowColor: '#8A4A10',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  clearTitle: { fontFamily: font.displayBold, fontSize: 26, color: '#8D372D', textAlign: 'center', marginTop: 8 },
  clearSub: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta2, marginTop: 2 },
});
