// Juego 8 · ¿Tigre o camisa?: en el mercado nocturno suena una palabra y hay que tocar su carta entre
// dos, tres o cuatro que suenan igual y solo cambian de tono (เสือ tigre / เสื้อ camisa…). Al responder,
// las cartas se dan la vuelta y enseñan el contorno de cada tono, y suenan una tras otra para comparar.
// Las familias de palabras salen de los pares escogidos a mano y, sobre todo, del vocabulario de quien
// aprende (tonos/familias.ts): cuanto más camino, más cartas distintas. Nunca hay dos cartas con el mismo
// tono ni se repite la familia de la ronda anterior. En la feria: parejas con pista de tono, luego más
// cartas sin pista y al final más rápido, con rondas de «¿Igual o distinto?» (suenan dos sílabas: ¿mismo
// tono?), una ronda dorada, bonus de rapidez, racha y una pista que cuesta la mitad de los puntos.
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, ZoomIn, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import type { NoiPose } from '@/brand/noi-art';
import { color, font, tones } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import { fx } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { Flip3D, Glow, Pop, Press3D, tapPoint, useJuice, type Point } from './fx';
import { useScore } from './kit';
import { Contour, Melody, TONE_HOW } from './tonos/curva';
import { dealCards, dealPair, shortEs, toneFamilies, tonesIn, type Family, type Twin } from './tonos/familias';
import { AudioOrb, Badge, CardSkin, Fuse, LannaBack, Medallion, NextButton, SKINS, SlowPill, Tag, TopBar, medalOf, type Mark } from './tonos/piezas';
import { useTimers, useVoice } from './tonos/voz';
import type { GameProps } from './types';

type Base = { items: Twin[]; title: string; level: number; retry?: boolean };
/** Suena una palabra: ¿cuál de estas cartas es? */
type CardRound = Base & { kind: 'cartas'; fam: Family; target: number; joke?: string; golden?: boolean };
/** Suenan dos sílabas: ¿tienen el mismo tono? `cross`: son sílabas distintas (otra sílaba, ¿misma melodía?). */
type PairRound = Base & { kind: 'igual'; same: boolean; cross: boolean };
type Round = CardRound | PairRound;
type Phase = 'deal' | 'play' | 'done' | 'out';
type Face = 'back' | 'front' | 'contour';
type CardState = 'idle' | 'ok' | 'bad' | 'dim';

/** `size`: cartas que se intentan poner (si la familia tiene tantos tonos) · `fuse`: lo que dura el bonus de rapidez. */
const LEVELS = [
  { name: '¡A escuchar!', hints: true, size: 2, base: 15, fuse: 4500 },
  { name: '¡Nivel 2!', hints: false, size: 3, base: 20, fuse: 4500 },
  { name: '¡Nivel 3!', hints: false, size: 4, base: 25, fuse: 3200 },
];

/** Lo que de verdad trae un nivel: se anuncia mirando las rondas que vienen, no lo que el nivel querría poner. */
function levelSub(level: number, upcoming: Round[]): string {
  const sizes = [...new Set(upcoming.filter((r) => r.kind === 'cartas').map((r) => r.items.length))];
  const max = Math.max(2, ...sizes);
  const what = sizes.length > 1 ? (max >= 4 ? 'Hasta cuatro cartas' : 'Parejas y tríos') : max >= 4 ? 'Cuatro cartas' : max === 3 ? 'Tríos' : 'Parejas';
  if (level === 0) return `${what}, con pista de tono`;
  return level === 1 ? `${what}, ¡ya sin pistas!` : `${what}, ¡y más rápido!`;
}

function plan(mode: GameProps['mode'], families: Family[], focus: Set<string>, rounds: number): Round[] {
  if (!families.length) return [];
  const feria = mode === 'feria';
  const used = new Set<Family>();
  const out: Round[] = [];
  let lastFam: Family | undefined;
  let lastTarget: string | undefined;
  let nextSame = Math.random() < 0.5;
  for (let i = 0; i < rounds; i++) {
    const level = feria ? (i < rounds * 0.35 ? 0 : i < rounds * 0.7 ? 1 : 2) : 0;
    const inLevel = out.filter((r) => r.level === level).length;
    // «¿Igual o distinto?»: la segunda ronda de cada nivel sin pistas (en la lección, la última si hay tres o más)
    if (feria ? level >= 1 && inLevel === 1 : rounds >= 3 && i === rounds - 1) {
      const pair = dealPair(families, nextSame, feria && level === 2, lastFam);
      if (pair) {
        nextSame = !nextSame;
        lastFam = undefined;
        out.push({ kind: 'igual', ...pair, title: '¿Igual o distinto?', level });
        continue;
      }
    }
    const want = feria ? LEVELS[level].size : i === 0 ? 2 : 3;
    if (families.every((f) => used.has(f))) used.clear();
    // nunca la familia de la ronda anterior; mejor una que aún no ha salido, que llene las cartas del nivel y que
    // traiga palabras de la lección (una grande ya usada puede volver, con más cartas, si no hay otra que las llene)
    const pool = families.length > 1 ? families.filter((f) => f !== lastFam) : families;
    const fam = shuffle(pool)
      .map((f) => {
        const n = tonesIn(f);
        const fit = n >= want ? 1 - 0.1 * (n - want) : (n - 1) / (want - 1);
        return { f, v: fit * 3 + f.items.filter((w) => focus.has(w.th)).length * 3 + (f.curated ? 0.3 : 0) - (used.has(f) ? 1.2 : 0) };
      })
      .sort((a, b) => b.v - a.v)[0].f;
    used.add(fam);
    const deal = dealCards(fam, want, focus, lastTarget);
    lastFam = fam;
    lastTarget = deal.items[deal.target].th;
    out.push({ kind: 'cartas', fam, ...deal, level });
  }
  // una ronda dorada (vale el doble) en mitad de la partida, nunca la que abre un nivel
  const gold = out.filter((r, k) => r.kind === 'cartas' && r.level >= 1 && out[k - 1]?.level === r.level);
  if (feria && rounds >= 6 && gold.length) (shuffle(gold)[0] as CardRound).golden = true;
  return out;
}

const toneName = (w: Twin) => tones[w.tone].name.toLowerCase();

/** Juego 8 · ¿Tigre o camisa?: mismo sonido, distinto tono. */
export default function Tigre({ mode, words, focus, rounds, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const voice = useVoice();
  const timers = useTimers();
  const { height: winH } = useWindowDimensions();
  const compact = winH < 760;

  const [queue, setQueue] = useState(() => plan(mode, toneFamilies([...focus, ...words]), new Set(focus.map((w) => w.th)), rounds ?? (feria ? 10 : 3)));
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('deal');
  const [shown, setShown] = useState(0);
  const [turned, setTurned] = useState(0);
  // la carta tocada o, en «¿Igual o distinto?», 0 = «igual» y 1 = «distinto»
  const [pick, setPick] = useState<number | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [points, setPoints] = useState(0);
  const [pose, setPose] = useState<NoiPose>('escucha');
  const [jump, setJump] = useState(0);
  const [hint, setHint] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [draw, setDraw] = useState({ k: -1, n: 0, ms: 600 });
  const [grid, setGrid] = useState({ w: 0, h: 0 });
  const pointsRef = useRef(0);
  const retries = useRef(0);
  const finished = useRef(false);
  const roundId = useRef(0);
  const speed = useRef(0);
  const chain = useRef(0);
  const pairSeen = useRef(false);
  const fuse = useSharedValue(0);

  const r = queue[i];

  /** Suena la palabra de una carta y su curva se dibuja a la vez. */
  const playCard = (k: number, onEnd?: () => void) => {
    if (!r) return;
    const w = r.items[k];
    chain.current += 1;
    setPlaying(k);
    voice.speak(w.th, {
      rom: w.rom,
      onStart: (ms) => setDraw((d) => ({ k, n: d.n + 1, ms })),
      onEnd: () => {
        setPlaying(null);
        onEnd?.();
      },
    });
  };

  /** El bonus de rapidez empieza cuando ha terminado de sonar lo que hay que adivinar (antes sería adivinar a ciegas). */
  const armSpeed = (id: number, ms: number) => {
    if (!feria || roundId.current !== id || speed.current) return;
    speed.current = 10;
    fuse.set(withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: ms, easing: Easing.linear })));
    timers.later(() => {
      if (roundId.current === id && speed.current > 0) speed.current = 5;
    }, ms / 2);
    timers.later(() => {
      if (roundId.current === id) speed.current = -1;
    }, ms);
  };

  /** Suena lo que hay que adivinar: la palabra de la carta buena o, en «¿Igual o distinto?», las dos sílabas seguidas. */
  const playPrompt = (slow = false) => {
    if (!r) return;
    const id = roundId.current;
    const ms = LEVELS[r.level].fuse;
    chain.current += 1;
    const run = chain.current;
    if (r.kind === 'cartas') {
      const w = r.items[r.target];
      voice.speak(w.th, { rom: w.rom, slow, onEnd: () => armSpeed(id, ms) });
      return;
    }
    const step = (k: number) => {
      if (chain.current !== run || roundId.current !== id) return;
      const w = r.items[k];
      setPlaying(k);
      voice.speak(w.th, {
        rom: w.rom,
        slow,
        onEnd: () => {
          setPlaying(null);
          if (k === 0) timers.later(() => step(1), 420);
          else armSpeed(id, ms);
        },
      });
    };
    step(0);
  };

  /** Suenan las cartas una tras otra (la buena primero) para comparar los tonos. */
  const compare = (order: number[]) => {
    const step = (j: number) => {
      if (j >= order.length) return;
      playCard(order[j], () => timers.later(() => step(j + 1), 420));
    };
    step(0);
  };

  const startRound = useEffectEvent(() => {
    if (!r) return;
    roundId.current += 1;
    speed.current = 0;
    fuse.set(0);
    const prev = queue[i - 1];
    let wait = 0;
    if (feria && (!prev || prev.level !== r.level)) {
      wait = 700;
      let j = i;
      while (j < queue.length && queue[j].level === r.level) j++;
      const sub = levelSub(r.level, queue.slice(i, j));
      timers.later(() => {
        if (prev) fx.levelup();
        juice.banner(LEVELS[r.level].name, sub, color.buatong);
      }, 60);
    } else if (r.kind === 'igual' && !pairSeen.current) {
      wait = 700;
      timers.later(() => {
        fx.sparkle();
        juice.banner('¿Igual o distinto?', 'Dos sílabas: ¿mismo tono?', color.cieloHondo);
      }, 60);
    } else if (r.kind === 'cartas' && r.golden) {
      wait = 700;
      timers.later(() => {
        fx.sparkle();
        juice.banner('¡Ronda dorada!', 'Esta vale el doble', color.buatongHondo);
      }, 60);
    }
    if (r.kind === 'igual') pairSeen.current = true;
    timers.later(() => fx.flip(), wait + 120);
    r.items.forEach((_, k) => timers.later(() => setShown(k + 1), wait + 140 + k * 130));
    timers.later(
      () => {
        setPhase('play');
        playPrompt(false);
      },
      wait + 300 + r.items.length * 130,
    );
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
  const cards = r.kind === 'cartas';
  const hints = cards && (level.hints || hint);

  /** Lo común a cualquier respuesta: marcador, puntos, fiesta o «casi», y la ronda fallada vuelve más tarde. */
  const settle = (ok: boolean, at: Point, base: number, wordId?: string) => {
    setPhase('done');
    chain.current += 1;
    const combo = score.hit(ok);
    onAnswer(ok, wordId);
    setMarks((m) => [...m, ok ? 'ok' : 'bad']);
    if (ok) {
      let pts = 0;
      if (feria) {
        // responder antes de que acabe de sonar no da bonus de rapidez
        const quick = Math.max(0, speed.current);
        pts = Math.round(((base + quick + (combo >= 3 ? 5 : 0)) / (hint ? 2 : 1)) * (cards && r.golden ? 2 : 1));
        pointsRef.current += pts;
        setPoints(pointsRef.current);
        if (quick >= 10) timers.later(() => juice.float({ x: at.x, y: at.y - 50 }, '¡Rápido!', color.buatong, 22), 240);
      }
      juice.celebrate(at, feria ? `+${pts}` : '¡Eso es!', 'monedas');
      if (cards && r.golden) juice.burst(at, 'estrellas', 14, 110);
      if (combo >= 5 && combo % 5 === 0) timers.later(() => juice.banner(`¡Racha de ${combo}!`, 'Oído de mercader', color.farol), 500);
      setPose('celebra');
      setJump((j) => j + 1);
    } else {
      juice.shake();
      setPose('ups');
      if (retries.current < (feria ? 3 : 2)) {
        retries.current += 1;
        const p = Math.min(i + 3, queue.length);
        const lv = feria ? (queue[p] ?? queue[queue.length - 1]).level : r.level;
        let again: Round;
        if (r.kind === 'cartas') {
          const items = shuffle(r.items);
          again = { ...r, items, target: items.indexOf(r.items[r.target]), level: lv, retry: true, golden: false };
        } else again = { ...r, items: [r.items[1], r.items[0]], level: lv, retry: true };
        setQueue([...queue.slice(0, p), again, ...queue.slice(p)]);
      }
    }
    speed.current = -1;
    // las cartas se dan la vuelta y enseñan su tono
    r.items.forEach((_, j) => timers.later(() => setTurned(j + 1), 260 + j * 140));
    timers.later(() => fx.flip(), 260);
  };

  const answer = (k: number, e: GestureResponderEvent) => {
    if (phase !== 'play' || r.kind !== 'cartas') return;
    const ok = k === r.target;
    setPick(k);
    settle(ok, tapPoint(e), level.base, r.items[r.target].id);
    // suena la buena y, para aprender, las demás
    const others = r.items.map((_, j) => j).filter((j) => j !== r.target);
    timers.later(() => compare([r.target, ...(feria && ok ? [] : others)]), 700);
  };

  const answerPair = (same: boolean, e: GestureResponderEvent) => {
    if (phase !== 'play' || r.kind !== 'igual') return;
    setPick(same ? 0 : 1);
    // aquí se entrena el oído, no una palabra: no cuenta para el repaso de ninguna
    settle(same === r.same, tapPoint(e), 10 + r.level * 5);
    timers.later(() => compare([0, 1]), 700);
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
    juice.banner('¡Oído de mercader!', `${pointsRef.current} puntos`, color.buatongHondo);
    juice.burst(undefined, 'monedas', 26, 170);
    timers.later(() => onDone(score.result(pointsRef.current)), 1500);
  };

  const next = () => {
    if (phase !== 'done') return;
    if (i + 1 >= queue.length) {
      finish();
      return;
    }
    voice.stop();
    chain.current += 1;
    // lo que quedara pendiente de esta ronda (cartas que iban a sonar para comparar) no se cuela en la siguiente
    timers.clear();
    setPhase('out');
    timers.later(() => {
      setShown(0);
      setTurned(0);
      setPick(null);
      setHint(false);
      setPlaying(null);
      setPose('escucha');
      setI((v) => v + 1);
      setPhase('deal');
    }, 260);
  };

  const n = r.items.length;
  const answered = phase === 'done' || (phase === 'out' && pick !== null);
  const ok = answered && (r.kind === 'cartas' ? pick === r.target : (pick === 0) === r.same);
  const stateOf = (k: number): CardState => (!answered || r.kind !== 'cartas' ? 'idle' : k === r.target ? 'ok' : k === pick ? 'bad' : 'dim');
  // en «¿Igual o distinto?» las cartas no enseñan nada hasta responder: solo suenan
  const faceOf = (k: number): Face => (k >= shown ? 'back' : answered && k < turned ? 'contour' : cards ? 'front' : 'back');
  const verdictOf = (same: boolean): CardState => (!answered || r.kind !== 'igual' ? 'idle' : same === r.same ? 'ok' : (pick === 0) === same ? 'bad' : 'dim');

  // tras responder, el chiste de Yai (si lo hay), lo que ha sonado o una invitación a comparar
  let line: string | null = null;
  if (answered) {
    if (r.kind === 'cartas') {
      line = r.joke && (!ok || !feria) ? r.joke : `Mismo sonido, ${n === 2 ? 'dos' : n === 3 ? 'tres' : 'cuatro'} tonos. Toca las cartas para compararlas.`;
    } else {
      const [a, b] = r.items;
      line = !r.same
        ? `Distintas: la primera va en tono ${toneName(a)} y la segunda, en tono ${toneName(b)}.`
        : r.cross
          ? `Otra sílaba, la misma melodía: las dos van en tono ${toneName(a)}.`
          : a.th === b.th
            ? `Era la misma sílaba dos veces, en tono ${toneName(a)}.`
            : `Suenan igual y son dos palabras distintas: las dos, en tono ${toneName(a)}.`;
    }
  }

  const cols = 2;
  const rows = Math.ceil(n / cols);
  const gap = 12;
  const verdictH = compact ? 70 : 78;
  const cardW = grid.w ? (grid.w - gap) / cols : 0;
  const cardH = !grid.h ? 0 : cards ? Math.min(rows === 1 ? 286 : 214, (grid.h - gap * (rows - 1)) / rows) : Math.min(230, grid.h - verdictH - gap);
  const noiSize = compact ? 108 : 132;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="mercado" />
      <Animated.View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }, juice.shakeStyle]}>
        <TopBar marks={marks} total={queue.length} points={feria ? points : undefined} combo={score.combo} dark />

        <View style={styles.titleRow}>
          <Animated.Text key={r.title + i} entering={ZoomIn.springify().damping(12)} style={[styles.title, r.title.length > 22 && { fontSize: 20 }]} numberOfLines={1}>
            {r.title}
          </Animated.Text>
          {r.retry ? <Tag text="Otra vez" tint={color.farol} /> : cards && r.golden ? <Tag text="Dorada ×2" tint={color.buatongHondo} bg="#FFF6D6" /> : null}
          {cards && phase === 'play' && !level.hints && !hint ? (
            <Press3D
              onPress={() => {
                fx.sparkle();
                setHint(true);
              }}
              style={{ height: 34 }}
              depth={10}
              accessibilityLabel="Ver la pista de tono (la mitad de puntos)">
              <View style={styles.hintBtn}>
                <Icon name="bulb" size={18} color={color.buatongHondo} />
                <Text style={styles.hintText}>Pista ½</Text>
              </View>
            </Press3D>
          ) : null}
        </View>
        {feria ? <Fuse value={fuse} on={phase === 'play'} style={{ marginHorizontal: 30, marginTop: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} /> : null}

        {/* Noi en su puesto: escucha y, al final, suelta el chiste de Yai */}
        <View style={[styles.stage, { height: compact ? 118 : 146 }]}>
          <View style={{ marginLeft: -8, marginBottom: -6 }}>
            <Noi pose={pose} size={noiSize} jump={jump} accessibilityLabel="Noi en el mercado" />
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {line ? (
              <Animated.View key={`l${i}`} entering={ZoomIn.springify().damping(14)} style={styles.bubble}>
                <View style={styles.bubbleTail} />
                <Text style={styles.bubbleText} numberOfLines={compact ? 3 : 4}>
                  {line}
                </Text>
              </Animated.View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <AudioOrb onPress={() => playPrompt(false)} talking={voice.talking && phase !== 'done'} size={compact ? 62 : 72} gold label={cards ? 'Escuchar otra vez' : 'Escuchar otra vez las dos sílabas'} />
                <SlowPill onPress={() => playPrompt(true)} dark />
              </View>
            )}
          </View>
        </View>

        <View style={{ flex: 1 }} onLayout={(e) => setGrid({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {cardW > 0 && cardH > 0 ? (
            <View style={{ gap }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap }}>
                {r.items.map((w, k) => (
                  <Card
                    key={`${i}-${k}-${w.th}`}
                    word={w}
                    width={cardW}
                    height={cardH}
                    face={faceOf(k)}
                    state={stateOf(k)}
                    hint={hints}
                    num={cards ? undefined : k < shown ? k + 1 : 0}
                    playing={playing === k}
                    drawN={draw.k === k ? draw.n : 0}
                    drawMs={draw.ms}
                    disabled={phase === 'deal' || phase === 'out'}
                    onPress={(e) => (cards && phase === 'play' ? answer(k, e) : phase === 'play' || answered ? playCard(k) : undefined)}
                  />
                ))}
              </View>
              {r.kind === 'igual' ? (
                <View style={{ flexDirection: 'row', gap, height: verdictH }}>
                  <Verdict same state={verdictOf(true)} disabled={phase !== 'play'} onPress={(e) => answerPair(true, e)} />
                  <Verdict same={false} state={verdictOf(false)} disabled={phase !== 'play'} onPress={(e) => answerPair(false, e)} />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          {phase === 'done' ? (
            <NextButton label={i + 1 >= queue.length ? (feria ? '¡Ver puntos!' : 'Terminar') : 'Siguiente'} kind={ok ? 'ok' : 'primary'} auto={feria && ok ? (cards ? 2000 : 2800) : undefined} onPress={next} />
          ) : (
            <Text style={styles.hint}>
              {phase !== 'play' ? ' ' : !cards ? (r.cross ? 'Otra sílaba… ¿la misma melodía?' : '¿Suenan con el mismo tono?') : hints ? 'Escucha el tono y toca su carta' : '¿Cuál has oído?'}
            </Text>
          )}
        </View>
      </Animated.View>
      {juice.layer}
    </View>
  );
}

function Card({
  word,
  width,
  height,
  face,
  state,
  hint,
  num,
  playing,
  drawN,
  drawMs,
  disabled,
  onPress,
}: {
  word: Twin;
  width: number;
  height: number;
  face: Face;
  state: CardState;
  hint: boolean;
  /** «¿Igual o distinto?»: la carta no enseña la palabra, solo su número (0 = aún sin repartir), hasta que se responde */
  num?: number;
  playing: boolean;
  drawN: number;
  drawMs: number;
  disabled: boolean;
  onPress: (e: GestureResponderEvent) => void;
}) {
  const tone = word.tone;
  const t = tones[tone];
  const p = useSharedValue(0);
  // al darse la vuelta, la curva aparece; cada vez que suena, se vuelve a trazar a su ritmo
  useEffect(() => {
    if (drawN) {
      p.value = 0;
      p.value = withTiming(1, { duration: Math.max(520, drawMs * 0.92), easing: Easing.inOut(Easing.quad) });
    } else if (face === 'contour') p.value = withDelay(260, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [face, drawN, drawMs, p]);

  const skin = state === 'ok' ? SKINS.ok : state === 'bad' ? SKINS.bad : SKINS.idle;
  const big = height > 200;
  const medal = Math.round(Math.min(height * (big ? 0.34 : 0.36), width * 0.46, 92));
  const thSize = big ? 34 : height > 150 ? 28 : 24;
  const es = shortEs(word.es);
  const mystery = num !== undefined && face !== 'contour';
  return (
    <View style={{ width, height, opacity: state === 'dim' && face !== 'contour' ? 0.5 : 1 }}>
      {state === 'ok' || playing ? (
        <Glow size={width * 1.25} tint={playing ? (mystery ? '#FFE07A' : t.fill) : color.arrozalVivo} strength={0.6} style={{ position: 'absolute', left: -width * 0.125, top: height / 2 - width * 0.625 }} />
      ) : null}
      <Pop trigger={`${state}${playing ? 1 : 0}`} scale={state === 'ok' || playing ? 1.06 : 1} style={{ flex: 1 }}>
        <Press3D onPress={onPress} disabled={disabled} style={{ flex: 1 }} depth={14} accessibilityLabel={mystery ? `Sílaba ${num}: toca para oírla` : `${word.th}, ${es}`}>
          <Flip3D
            flipped={face !== 'front'}
            duration={480}
            style={{ flex: 1 }}
            front={
              <CardSkin skin={SKINS.idle} pad={6}>
                <Medallion emoji={word.emoji} size={medal} tint={medalOf(word.th)} />
                <Text style={[styles.es, { fontSize: big ? 18 : 15 }]} numberOfLines={2}>
                  {es}
                </Text>
                <Th size={thSize} bold style={{ textAlign: 'center', marginTop: -2 }}>
                  {word.th}
                </Th>
                {hint ? (
                  <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.chip, { backgroundColor: t.fill }]}>
                    <Contour tone={tone} color={t.on} size={20} />
                    <Text style={[styles.chipText, { color: t.on }]}>{t.name}</Text>
                  </Animated.View>
                ) : null}
              </CardSkin>
            }
            back={
              face !== 'contour' ? (
                <View style={{ flex: 1 }}>
                  <LannaBack tint="laca" />
                  {num ? (
                    <Animated.View entering={ZoomIn.springify().damping(10)} pointerEvents="none" style={styles.numCoin}>
                      <Text style={styles.numText}>{num}</Text>
                    </Animated.View>
                  ) : null}
                </View>
              ) : (
                <CardSkin skin={skin} pad={6}>
                  <Th size={thSize - 2} bold style={{ textAlign: 'center' }}>
                    {word.th}
                  </Th>
                  <Melody tones={[tone]} width={width - 26} height={Math.max(44, height * (big ? 0.34 : 0.3))} progress={p} stroke={big ? 8 : 6} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Contour tone={tone} size={20} />
                    <Text style={[styles.toneName, { color: t.text }]}>{t.name}</Text>
                  </View>
                  <Rom rom={word.rom} size={big ? 16 : 14} style={{ textAlign: 'center' }} />
                  {big ? (
                    <Text style={styles.how} numberOfLines={2}>
                      {TONE_HOW[tone]} · {es}
                    </Text>
                  ) : (
                    <Text style={styles.how} numberOfLines={1}>
                      {es}
                    </Text>
                  )}
                  <View style={styles.replay}>
                    <Icon name="speaker" size={15} color={color.tinta3} />
                  </View>
                </CardSkin>
              )
            }
          />
        </Press3D>
      </Pop>
      {state === 'ok' || state === 'bad' ? <Badge ok={state === 'ok'} /> : null}
    </View>
  );
}

/** Los dos botones de «¿Igual o distinto?». */
function Verdict({ same, state, disabled, onPress }: { same: boolean; state: CardState; disabled: boolean; onPress: (e: GestureResponderEvent) => void }) {
  const skin = state === 'ok' ? SKINS.ok : state === 'bad' ? SKINS.bad : SKINS.idle;
  return (
    <View style={{ flex: 1, opacity: state === 'dim' ? 0.5 : 1 }}>
      <Pop trigger={state} scale={state === 'ok' ? 1.08 : 1} style={{ flex: 1 }}>
        <Press3D onPress={onPress} disabled={disabled} style={{ flex: 1 }} depth={12} accessibilityLabel={same ? 'Igual: suenan con el mismo tono' : 'Distinto: suenan con otro tono'}>
          <CardSkin skin={skin} pad={4}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.sign, { backgroundColor: same ? color.cielo : color.farol, borderColor: same ? color.cieloHondo : '#D9541C' }]}>
                <Text style={styles.signText}>{same ? '=' : '≠'}</Text>
              </View>
              <View>
                <Text style={styles.verdict}>{same ? 'Igual' : 'Distinto'}</Text>
                <Text style={styles.verdictSub}>{same ? 'mismo tono' : 'otro tono'}</Text>
              </View>
            </View>
          </CardSkin>
        </Press3D>
      </Pop>
      {state === 'ok' || state === 'bad' ? <Badge ok={state === 'ok'} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 40 },
  title: {
    flexShrink: 1,
    fontFamily: font.displayBold,
    fontSize: 25,
    color: '#FFFFFF',
    textShadowColor: 'rgba(255,170,80,0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  hintBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: '#FFF6D6', borderWidth: 2, borderColor: color.buatong },
  hintText: { fontFamily: font.uiHeavy, fontSize: 13.5, color: color.buatongHondo },
  stage: { flexDirection: 'row', alignItems: 'flex-end' },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bubbleTail: { position: 'absolute', left: -7, bottom: 22, width: 18, height: 18, backgroundColor: '#FFFFFF', borderRadius: 3, transform: [{ rotate: '45deg' }] },
  bubbleText: { fontFamily: font.uiBold, fontSize: 14.5, lineHeight: 20, color: color.tinta },
  es: { fontFamily: font.uiHeavy, color: color.tinta, textAlign: 'center', marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 8, borderRadius: 12, marginTop: 2 },
  chipText: { fontFamily: font.uiHeavy, fontSize: 11.5 },
  toneName: { fontFamily: font.displayBold, fontSize: 15 },
  how: { fontFamily: font.uiBold, fontSize: 12.5, color: color.tinta3, textAlign: 'center', marginTop: 2 },
  replay: { position: 'absolute', right: 8, top: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(29,35,71,0.07)', alignItems: 'center', justifyContent: 'center' },
  numCoin: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFD166',
    borderWidth: 2,
    borderColor: '#FFF3C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontFamily: font.displayBold, fontSize: 19, lineHeight: 23, color: '#5E1216' },
  sign: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3 },
  signText: { fontFamily: font.displayBold, fontSize: 26, lineHeight: 30, color: '#FFFFFF' },
  verdict: { fontFamily: font.displayBold, fontSize: 19, lineHeight: 22, color: color.tinta },
  verdictSub: { fontFamily: font.uiBold, fontSize: 12.5, lineHeight: 15, color: color.tinta3 },
  footer: { height: 82, justifyContent: 'center', paddingBottom: 10 },
  hint: { textAlign: 'center', fontFamily: font.uiBold, fontSize: 14, color: '#FFE9C7', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
});
