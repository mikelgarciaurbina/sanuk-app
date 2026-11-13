// Juego 1 · Parejas: une thai y español antes de que se consuma la mecha. Feria nocturna: cada pareja vuela
// hacia la otra y estalla en fuegos artificiales; en la feria la mecha arde, el tablero se rellena en ola y se
// sube de nivel: cada nivel las parejas devuelven menos mecha y una pareja equivocada quema un segundo, así que
// tarde o temprano el cohete sale (la mecha se para mientras se reparte el tablero nuevo). En la lección no hay
// mecha y las que se resisten vuelven en un repaso final (ya sin transcripción si se sabe leer).
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ZoomIn, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { color, font } from '@/brand/tokens';
import { Art, Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import type { Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { Countdown, Pop, useJuice, type Point } from './fx';
import { ComboBadge, useScore } from './kit';
import { LevelChip, MultChip, ScoreChip, ToastRibbon, distinct, multFor, pickWords, pointIn, romFor, useLater, useToast } from './palabras/common';
import { Ficha, type FichaState, type Side } from './parejas/Ficha';
import { FUSE_H, Mecha, fuseGeom, fuseY } from './parejas/Mecha';
import type { GameProps } from './types';

/** Segundos de mecha al empezar (y lo más larga que puede estar). */
const START_S = 40;
/** Segundos que quema una pareja equivocada. */
const MISS_S = 1;
const ROW_GAP = 10;
const COL_GAP = 14;

type Pair = { word: Word; golden: boolean; audio: boolean };
type Board = { wave: number; pairs: Pair[]; order: string[]; review?: boolean };
type Pose = 'feliz' | 'celebra' | 'ups';

const pairsFor = (level: number) => (level <= 1 ? 4 : level === 2 ? 5 : 6);
/**
 * Segundos que alarga la mecha cada pareja: cada nivel un 18 % menos (2,5 · 2 · 1,7 · 1,4 · 1,1 · 0,9 · 0,8…),
 * sin suelo cómodo: desde el nivel 6 o 7 ni la mano más rápida recupera lo que arde.
 */
const bonusFor = (level: number) => Math.max(0.3, Math.round(25 * 0.82 ** (level - 1)) / 10);
/** Segundos de premio por limpiar el tablero: también menguan (4 · 3,6 · 3,2 … 1,5). */
const clearFor = (level: number) => Math.max(1.5, Math.round((4 - 0.4 * (level - 1)) * 10) / 10);
const keyOf = (side: Side, id: string) => `${side}:${id}`;
/** Reloj de la partida (solo se consulta en manejadores y temporizadores). */
const clock = () => Date.now();
const secsText = (n: number) => String(n).replace('.', ',');

function makePairs(list: Word[], level: number, feria: boolean): Pair[] {
  const golden = feria && level >= 2 && Math.random() < 0.55 ? Math.floor(Math.random() * list.length) : -1;
  const audioN = !feria ? 0 : level >= 5 ? 2 : level >= 3 ? 1 : 0;
  const audio = new Set(shuffle(list.map((_, i) => i).filter((i) => i !== golden)).slice(0, audioN));
  return list.map((word, i) => ({ word, golden: i === golden, audio: audio.has(i) }));
}

const toBoard = (wave: number, pairs: Pair[], review?: boolean): Board => ({ wave, pairs, order: shuffle(pairs.map((p) => p.word.id)), review });

/** Juego 1 · Parejas: une thai y español antes de que se consuma la mecha. */
export default function Parejas({ mode, words, focus, reads, review, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const toast = useToast();
  const later = useLater();
  const burn = useSharedValue(0);
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const boardRef = useRef<ComponentRef<typeof View>>(null);
  const fuseRef = useRef<ComponentRef<typeof View>>(null);

  const [pool] = useState(() => distinct([...focus, ...words]));
  const [fresh] = useState(() => new Set(review ? [] : focus.map((w) => w.id)));
  const [board, setBoard] = useState<Board>(() => toBoard(0, makePairs(pickWords(feria ? pairsFor(1) : 5, { focus: feria ? [] : focus, pool }), 1, feria)));
  const [states, setStates] = useState<Record<string, FichaState>>({});
  const [sel, setSel] = useState<{ side: Side; id: string } | null>(null);
  const [phase, setPhase] = useState<'count' | 'play' | 'end'>(feria ? 'count' : 'play');
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [secs, setSecs] = useState(START_S);
  const [found, setFound] = useState(0);
  const [fb, setFb] = useState<{ n: number; ok: boolean; word: Word } | null>(null);
  const [jump, setJump] = useState(0);
  const [pose, setPose] = useState<Pose>('feliz');
  const [launched, setLaunched] = useState(false);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [rowW, setRowW] = useState(0);

  const g = useRef({
    wave: 0,
    level: 1,
    points: 0,
    ended: false,
    done: false,
    deadline: 0,
    /** mecha parada (entre tableros): `left` guarda lo que queda */
    paused: false,
    left: 0,
    lastTick: 0,
    lastMatch: 0,
    poseN: 0,
    fbN: 0,
    cleared: -1,
    reviewed: false,
    matchedN: 0,
    used: new Set<string>(),
    retry: [] as Word[],
    gone: new Set<string>(),
  });

  const tooFew = board.pairs.length < 2;
  const bail = useEffectEvent(() => onDone(score.result(0)));
  useEffect(() => {
    if (!tooFew) return;
    const t = setTimeout(() => bail(), 400);
    return () => clearTimeout(t);
  }, [tooFew]);

  // ——— Noi y la tira de respuesta ———

  const setMood = (p: Pose) => {
    const s = g.current;
    s.poseN += 1;
    const n = s.poseN;
    setPose(p);
    later(() => {
      if (g.current.poseN === n) setPose('feliz');
    }, 1300);
  };
  const tell = (ok: boolean, word: Word) => {
    g.current.fbN += 1;
    setFb({ n: g.current.fbN, ok, word });
  };

  // ——— finales ———

  const fireworks = (n: number) => {
    const spots: [number, number][] = [
      [0.5, 0.26],
      [0.24, 0.36],
      [0.76, 0.3],
      [0.4, 0.18],
      [0.64, 0.42],
    ];
    spots.slice(0, n).forEach(([fx_, fy], i) => {
      later(() => {
        pointIn(rootRef, fx_, fy, (at) => {
          juice.burst(at, 'chispas', 30, 210);
          juice.burst(at, i % 2 ? 'confeti' : 'estrellas', 14, 160);
          juice.ring(at, i % 2 ? '#FF8FB1' : '#FFE7A8', 130);
        });
        if (i % 2 === 0) fx.boom();
      }, i * 330);
    });
  };

  const finishOnce = (ms: number) => {
    const s = g.current;
    later(() => {
      if (s.done) return;
      s.done = true;
      onDone(score.result(s.points));
    }, ms);
  };

  /** Fin de la feria: el cohete despega y estalla. */
  const boom = () => {
    const s = g.current;
    if (s.ended) return;
    s.ended = true;
    setPhase('end');
    setSel(null);
    setLaunched(true);
    fx.whoosh();
    later(() => {
      juice.flash('#FFE7B0');
      fireworks(5);
      juice.banner('¡Bum!', `Fin de la feria · ${s.points} puntos`, color.buatong);
      setMood('celebra');
    }, 620);
    finishOnce(2900);
  };

  /** Fin de la lección: todas las parejas, castillo de fuegos. */
  const finish = () => {
    const s = g.current;
    if (s.ended) return;
    s.ended = true;
    setPhase('end');
    fx.fanfare();
    fireworks(3);
    juice.banner('¡Todas!', 'Parejas completas', color.buatong);
    setMood('celebra');
    setJump((j) => j + 1);
    finishOnce(1900);
  };

  // ——— la mecha (solo feria) ———

  const start = () => {
    const s = g.current;
    s.deadline = clock() + START_S * 1000;
    setPhase('play');
    burn.set(0);
    burn.set(withTiming(1, { duration: START_S * 1000, easing: Easing.linear }));
  };

  const onTick = useEffectEvent(() => {
    const s = g.current;
    if (s.ended || s.paused) return;
    const left = s.deadline - clock();
    const sec = Math.max(0, Math.ceil(left / 1000));
    setSecs(sec);
    if (sec <= 5 && sec > 0 && sec !== s.lastTick) {
      s.lastTick = sec;
      fx.tick();
    }
    if (left <= 0) boom();
  });
  useEffect(() => {
    if (!feria || phase !== 'play') return;
    const t = setInterval(() => onTick(), 200);
    return () => clearInterval(t);
  }, [feria, phase]);

  /** Alarga la mecha (`sec` > 0: una pareja, un tablero limpio) o la acorta (`sec` < 0: una pareja equivocada). */
  const addTime = (sec: number) => {
    const s = g.current;
    const now = clock();
    const full = START_S * 1000;
    let left: number;
    if (s.paused) {
      s.left = Math.max(0, Math.min(full, s.left + sec * 1000));
      left = s.left;
    } else {
      s.deadline = Math.min(now + full, s.deadline + sec * 1000);
      left = Math.max(0, s.deadline - now);
    }
    const p = 1 - left / full;
    const jump = withTiming(p, { duration: 280, easing: Easing.out(Easing.cubic) });
    burn.set(s.paused ? jump : withSequence(jump, withTiming(1, { duration: Math.max(1, left - 280), easing: Easing.linear })));
    setSecs(Math.ceil(left / 1000));
    fuseRef.current?.measureInWindow((x, y) => {
      const { x0, len } = fuseGeom(rowW);
      juice.float({ x: x + x0 + p * len, y: y + fuseY(p) }, `${sec > 0 ? '+' : '-'}${secsText(Math.abs(sec))} s`, sec > 0 ? '#5FD4FF' : '#FF8A7A', 22);
    });
  };

  /** Para la mecha (última pareja del tablero): mientras se celebra y se reparte el siguiente no arde. */
  const pauseFuse = () => {
    const s = g.current;
    if (!feria || s.paused || s.ended) return;
    s.paused = true;
    s.left = Math.max(0, s.deadline - clock());
    burn.set(1 - s.left / (START_S * 1000));
  };
  const resumeFuse = () => {
    const s = g.current;
    if (!s.paused || s.ended) return;
    s.paused = false;
    s.deadline = clock() + s.left;
    burn.set(withTiming(1, { duration: Math.max(1, s.left), easing: Easing.linear }));
  };

  // ——— tableros ———

  const deal = (pairs: Pair[], review?: boolean) => {
    const s = g.current;
    for (const p of board.pairs) s.used.add(p.word.id);
    s.wave += 1;
    s.gone = new Set();
    s.matchedN = 0;
    setBoard(toBoard(s.wave, pairs, review));
    setStates({});
    setSel(null);
    setFound(0);
    fx.swish();
  };

  const nextFeriaBoard = (lv: number) => {
    const s = g.current;
    const first = s.retry.splice(0, 2);
    const list = pickWords(pairsFor(lv), { first, pool, used: new Set([...s.used, ...board.pairs.map((p) => p.word.id)]) });
    deal(makePairs(list, lv, true));
  };

  const cleared = () => {
    const s = g.current;
    if (s.cleared === s.wave || s.ended) return;
    s.cleared = s.wave;
    if (feria) {
      // la mecha ya está parada desde la última pareja; vuelve a arder cuando el tablero nuevo está en la mesa
      pauseFuse();
      addTime(clearFor(s.level));
      s.level += 1;
      const bonus = 20 * (s.level - 1);
      s.points += bonus;
      setPoints(s.points);
      setLevel(s.level);
      fx.levelup();
      const note = s.level === 2 && reads ? 'Sin transcripción: ¡a leer!' : s.level === 3 ? 'Ahora, alguna solo de oído' : `Tablero limpio · +${bonus}`;
      juice.banner(`¡Nivel ${s.level}!`, note, color.buatong);
      pointIn(rootRef, 0.5, 0.3, (at) => {
        juice.burst(at, 'chispas', 28, 200);
        juice.burst(at, 'confeti', 18, 170);
      });
      later(() => nextFeriaBoard(s.level), 650);
      later(resumeFuse, 650 + pairsFor(s.level) * 70 + 450);
      return;
    }
    const review = s.retry.filter((w, i, a) => a.findIndex((x) => x.id === w.id) === i).slice(0, 4);
    if (review.length && !s.reviewed) {
      s.reviewed = true;
      s.retry = [];
      const fill = pickWords(Math.max(3, review.length) - review.length, { pool, avoid: review, used: new Set(board.pairs.map((p) => p.word.id)) });
      juice.banner('¡Repaso!', 'Las que se resistieron', color.cielo);
      fx.sparkle();
      later(() => deal(makePairs(shuffle([...review, ...fill]), 1, false), true), 900);
      return;
    }
    finish();
  };

  // ——— jugar ———

  const rows = board.pairs.length;
  const tileH = area.h > 0 ? Math.max(44, Math.min(70, (area.h - (rows - 1) * ROW_GAP) / Math.max(1, rows))) : 60;
  const colW = Math.max(0, (area.w - COL_GAP) / 2);
  const stackH = rows * tileH + (rows - 1) * ROW_GAP;
  const top0 = Math.max(0, (area.h - stackH) / 2);
  const rowY = (i: number) => top0 + i * (tileH + ROW_GAP);

  const match = (pair: Pair, secondSide: Side) => {
    const s = g.current;
    const id = pair.word.id;
    const combo = score.hit(true);
    onAnswer(true, id);
    if (secondSide === 'es') say(pair.word.th);
    s.matchedN += 1;
    const last = s.matchedN >= board.pairs.length;
    const now = clock();
    const quick = feria && s.lastMatch > 0 && now - s.lastMatch < 2600;
    s.lastMatch = now;
    const gain = (10 * multFor(combo) + (quick ? 5 : 0)) * (pair.golden ? 3 : 1);
    s.points += gain;
    setPoints(s.points);
    setStates((st) => ({ ...st, [keyOf('th', id)]: 'ok', [keyOf('es', id)]: 'ok' }));
    tell(true, pair.word);
    setJump((j) => j + 1);
    if (combo >= 3 || pair.golden) setMood('celebra');
    // aviso pequeño sobre la mecha: no tapa el tablero mientras arde
    if (combo > 0 && combo % 5 === 0) toast.show(`¡Racha ×${combo}!`, 'los puntos se multiplican', color.farol);
    if (pair.golden) fx.sparkle();

    const i = board.pairs.findIndex((p) => p.word.id === id);
    const j = board.order.indexOf(id);
    const mid = { x: area.w / 2, y: rowY((i + j) / 2) + tileH / 2 };
    boardRef.current?.measureInWindow((bx, by) => {
      const at: Point = { x: bx + mid.x, y: by + mid.y };
      later(() => {
        juice.burst(at, 'chispas', 22, 150);
        juice.burst(at, pair.golden ? 'monedas' : 'estrellas', pair.golden ? 14 : 9, 120);
        juice.ring(at, pair.golden ? color.buatong : '#FFE7A8', 116);
        juice.float(at, `+${gain}`, pair.golden ? '#FFC83D' : '#FFD34D', pair.golden ? 38 : 32);
        if (quick) juice.float({ x: at.x, y: at.y + 40 }, '¡Rápido!', '#FF8FB1', 18);
      }, 240);
    });
    if (feria) {
      addTime(bonusFor(s.level) + (pair.golden ? 3 : 0));
      if (last) pauseFuse();
    }

    later(() => {
      setStates((st) => ({ ...st, [keyOf('th', id)]: 'gone', [keyOf('es', id)]: 'gone' }));
      s.gone.add(id);
      setFound(s.gone.size);
      if (s.gone.size >= board.pairs.length) later(cleared, 260);
    }, 400);
    later(() => setStates((st) => (st[keyOf('th', id)] === 'gone' ? { ...st, [keyOf('th', id)]: 'out', [keyOf('es', id)]: 'out' } : st)), 600);
  };

  const miss = (thWord: Word, esId: string) => {
    const s = g.current;
    score.hit(false);
    onAnswer(false, thWord.id);
    if (!s.retry.some((w) => w.id === thWord.id)) s.retry.push(thWord);
    const kth = keyOf('th', thWord.id);
    const kes = keyOf('es', esId);
    setStates((st) => ({ ...st, [kth]: 'bad', [kes]: 'bad' }));
    juice.shake(7);
    tell(false, thWord);
    setMood('ups');
    if (feria) addTime(-MISS_S);
    later(() => {
      setStates((st) => {
        const n = { ...st };
        if (n[kth] === 'bad') delete n[kth];
        if (n[kes] === 'bad') delete n[kes];
        // en la lección se ilumina la pareja buena un momento
        if (!feria && !s.gone.has(thWord.id)) n[keyOf('es', thWord.id)] = 'hint';
        return n;
      });
    }, 620);
    if (!feria)
      later(() => {
        setStates((st) => {
          const k = keyOf('es', thWord.id);
          if (st[k] !== 'hint') return st;
          const n = { ...st };
          delete n[k];
          return n;
        });
      }, 2000);
  };

  const tap = (side: Side, pair: Pair) => {
    const s = g.current;
    if (s.ended || phase !== 'play') return;
    const id = pair.word.id;
    if (s.gone.has(id) || states[keyOf(side, id)] === 'ok') return;
    if (side === 'th') say(pair.word.th);
    else fx.tap();
    if (!sel || sel.side === side) {
      setSel(sel && sel.id === id ? null : { side, id });
      return;
    }
    setSel(null);
    const other = board.pairs.find((p) => p.word.id === sel.id);
    if (!other) return;
    if (sel.id === id) match(pair, side);
    else if (side === 'th') miss(pair.word, sel.id);
    else miss(other.word, id);
  };

  const stateOf = (side: Side, id: string): FichaState => states[keyOf(side, id)] ?? (sel && sel.side === side && sel.id === id ? 'sel' : 'idle');
  const byId = new Map(board.pairs.map((p) => [p.word.id, p]));
  const hintText = feria ? 'Cada pareja alarga la mecha; un fallo quema 1 s. ¡Encadena para multiplicar!' : 'Toca una palabra thai y luego su traducción.';
  /** Transcripción: siempre mientras no se sabe leer; después, solo en lo nuevo de la lección o el nivel 1 de la feria. */
  const romOf = (w: Word) => romFor(reads, { feria, level, review: !!board.review || !fresh.has(w.id) });
  const sideW = (colW + COL_GAP) / 2;
  const step = (tileH + ROW_GAP) / 2;

  return (
    <View ref={rootRef} style={{ flex: 1 }}>
      <Backdrop scene="mercado" />
      <Animated.View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }, juice.shakeStyle]}>
        <View style={styles.hud}>
          <ScoreChip value={points} dark />
          <View style={styles.hudMid}>
            <ComboBadge combo={score.combo} />
            <MultChip mult={multFor(score.combo)} />
          </View>
          {feria ? <LevelChip level={level} dark /> : <Lanterns total={board.pairs.length} lit={found} />}
        </View>

        {feria ? (
          <View ref={fuseRef} style={{ height: FUSE_H, marginTop: 2 }} onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
            {rowW > 0 ? <Mecha burn={burn} width={rowW} secs={secs} launched={launched} /> : null}
          </View>
        ) : (
          <View style={{ paddingVertical: 8, gap: 2 }}>
            <Text style={styles.title}>{board.review ? 'Repaso de las difíciles' : 'Empareja'}</Text>
            <Text style={styles.sub}>{board.review && reads ? 'Ahora sin transcripción: ¡léelas!' : 'Une cada palabra thai con su traducción.'}</Text>
          </View>
        )}

        <View ref={boardRef} style={{ flex: 1, marginTop: 8 }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {area.w > 0
            ? board.pairs.map((p, i) => {
                const j = board.order.indexOf(p.word.id);
                const st = stateOf('th', p.word.id);
                if (st === 'out') return null;
                return (
                  <View key={`th-${board.wave}-${p.word.id}`} style={{ position: 'absolute', left: 0, top: rowY(i), width: colW }}>
                    <Ficha
                      word={p.word}
                      side="th"
                      state={st}
                      delay={i * 70}
                      height={tileH}
                      width={colW}
                      dx={sideW}
                      dy={(j - i) * step}
                      golden={p.golden}
                      audio={p.audio}
                      showRom={romOf(p.word)}
                      disabled={phase !== 'play'}
                      onPress={() => tap('th', p)}
                    />
                  </View>
                );
              })
            : null}
          {area.w > 0
            ? board.order.map((id, j) => {
                const p = byId.get(id)!;
                const i = board.pairs.indexOf(p);
                const st = stateOf('es', id);
                if (st === 'out') return null;
                return (
                  <View key={`es-${board.wave}-${id}`} style={{ position: 'absolute', left: colW + COL_GAP, top: rowY(j), width: colW }}>
                    <Ficha
                      word={p.word}
                      side="es"
                      state={st}
                      delay={40 + j * 70}
                      height={tileH}
                      width={colW}
                      dx={-sideW}
                      dy={(i - j) * step}
                      disabled={phase !== 'play'}
                      onPress={() => tap('es', p)}
                    />
                  </View>
                );
              })
            : null}
        </View>

        <View style={styles.bottom}>
          <Noi pose={pose} size={76} jump={jump} />
          <View style={{ flex: 1, paddingBottom: 10 }}>
            {fb ? (
              <Answer key={fb.n} ok={fb.ok} word={fb.word} />
            ) : (
              <View style={styles.hint}>
                <Text style={styles.hintText}>{hintText}</Text>
              </View>
            )}
          </View>
        </View>
        <ToastRibbon toast={toast.now} style={{ top: 48 }} />
      </Animated.View>
      {phase === 'count' && !tooFew ? <Countdown dark onDone={start} /> : null}
      {juice.layer}
    </View>
  );
}

/** Tira con la pareja buena (y su audio): refuerza al acertar, enseña al fallar. */
function Answer({ ok, word }: { ok: boolean; word: Word }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Escuchar ${word.th}: ${word.es}`} onPress={() => say(word.th)} style={[styles.answer, { borderColor: ok ? '#2DBE78' : '#FF8A5B' }]}>
        <View style={[styles.answerIcon, { backgroundColor: ok ? '#2DBE78' : '#FF8A5B' }]}>
          <Icon name={ok ? 'check' : 'speaker'} size={16} color="#FFFFFF" stroke={3} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <Th size={18} bold style={{ lineHeight: 26 }}>
              {word.th}
            </Th>
            <Rom rom={word.rom} size={12} />
          </View>
          <Text numberOfLines={2} style={styles.answerEs}>
            {ok ? '' : 'es '}«{word.es}»
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Progreso de la lección: un farolillo que se enciende por pareja. */
function Lanterns({ total, lit }: { total: number; lit: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 0 }}>
      {Array.from({ length: total }, (_, i) => (
        <Pop key={i} trigger={i < lit} scale={1.5}>
          <Art name={i < lit ? 'farol' : 'farolOff'} size={i < lit ? 30 : 24} />
        </Pop>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46 },
  hudMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { fontFamily: font.displayBold, fontSize: 24, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  sub: { fontFamily: font.uiBold, fontSize: 13.5, color: '#E9DDF7' },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100, paddingBottom: 6 },
  hint: { backgroundColor: 'rgba(20,12,36,0.55)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: 'rgba(255,214,140,0.35)' },
  hintText: { fontFamily: font.uiBold, fontSize: 13.5, color: '#FFE9C2' },
  answer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 2.5, paddingHorizontal: 12, paddingVertical: 7, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  answerIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  answerEs: { fontFamily: font.uiHeavy, fontSize: 14, color: color.tinta },
});
