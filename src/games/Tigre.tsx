// Juego 8 · ¿Tigre o camisa?: en el mercado nocturno suena una palabra y hay que tocar su carta entre
// dos, tres o cuatro que suenan casi igual y solo cambian de tono (เสือ tigre / เสื้อ camisa…). Al
// responder, las cartas se dan la vuelta y enseñan el contorno de cada tono, y suenan una tras otra
// para comparar. En la feria: primero parejas con pista de tono, luego tríos sin pista y al final
// más cartas, con bonus de rapidez, racha y una pista que cuesta la mitad de los puntos.
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, ZoomIn, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import type { NoiPose } from '@/brand/noi-art';
import { color, font, tones, type ToneId } from '@/brand/tokens';
import { Icon, ToneGlyph } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import { MINIMAL_SETS, type MiniWord } from '@/content/drills';
import { fx } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { toneOfSyllable } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { Flip3D, Glow, Pop, Press3D, tapPoint, useJuice } from './fx';
import { useScore } from './kit';
import { Melody, TONE_HOW } from './tonos/curva';
import { AudioOrb, Badge, CardSkin, Fuse, LannaBack, Medallion, NextButton, SKINS, SlowPill, TopBar, medalOf, type Mark } from './tonos/piezas';
import { useTimers, useVoice } from './tonos/voz';
import type { GameProps } from './types';

type MSet = (typeof MINIMAL_SETS)[number];
type Round = { set: MSet; items: MiniWord[]; target: number; level: number; retry?: boolean };
type Phase = 'deal' | 'play' | 'done' | 'out';
type Face = 'back' | 'front' | 'contour';
type CardState = 'idle' | 'ok' | 'bad' | 'dim';

const LEVELS = [
  { name: '¡A escuchar!', sub: 'Parejas, con pista de tono', hints: true, sizes: [2], base: 15 },
  { name: '¡Nivel 2!', sub: 'Tríos y sin pistas', hints: false, sizes: [3, 2], base: 20 },
  { name: '¡Nivel 3!', sub: 'Más cartas, ¡más rápido!', hints: false, sizes: [4, 3], base: 25 },
];

const toneOf = (w: MiniWord): ToneId => toneOfSyllable(w.rom);

function plan(mode: GameProps['mode'], known: Set<string>, focusTh: Set<string>, rounds: number): Round[] {
  const used = new Set<MSet>();
  const out: Round[] = [];
  for (let i = 0; i < rounds; i++) {
    const level = mode === 'feria' ? (i < rounds * 0.35 ? 0 : i < rounds * 0.7 ? 1 : 2) : 0;
    const sizes = mode === 'feria' ? LEVELS[level].sizes : [2, 3];
    const fresh = MINIMAL_SETS.filter((s) => !used.has(s));
    const pool = fresh.length ? fresh : MINIMAL_SETS;
    // tamaño del nivel, y mejor si sale alguna palabra de la lección o ya aprendida
    const best = shuffle(pool)
      .map((s) => ({
        s,
        v:
          (sizes.includes(s.items.length) ? 3 - sizes.indexOf(s.items.length) : 0) +
          s.items.filter((w) => focusTh.has(w.th)).length * 3 +
          s.items.filter((w) => known.has(w.th)).length * 0.4,
      }))
      .sort((a, b) => b.v - a.v)[0].s;
    used.add(best);
    const items = shuffle(best.items);
    const pref = items.findIndex((w) => focusTh.has(w.th));
    const target = pref >= 0 && Math.random() < 0.7 ? pref : Math.floor(Math.random() * items.length);
    out.push({ set: best, items, target, level });
  }
  return out;
}

/** Juego 8 · ¿Tigre o camisa?: mismo sonido, distinto tono. */
export default function Tigre({ mode, words, focus, rounds, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const voice = useVoice();
  const timers = useTimers();
  const { height: winH } = useWindowDimensions();
  const compact = winH < 760;

  const [queue, setQueue] = useState(() =>
    plan(mode, new Set([...focus, ...words].map((w) => w.th)), new Set(focus.map((w) => w.th)), rounds ?? (feria ? 10 : 3)),
  );
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('deal');
  const [shown, setShown] = useState(0);
  const [turned, setTurned] = useState(0);
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
  const fuse = useSharedValue(0);

  const r = queue[i];
  // la palabra aprendida que corresponde (mismo thai y mismo significado: ไหม «seda» no es ไหม «¿…?»)
  const idOf = (w: MiniWord) => {
    const es = w.es.split(/[;,(]/)[0].trim().toLowerCase();
    return [...focus, ...words].find((x) => x.th === w.th && x.es.toLowerCase().includes(es))?.id;
  };

  /** Suena la palabra de una carta y su curva se dibuja a la vez. */
  const playCard = (k: number, onEnd?: () => void) => {
    if (!r) return;
    const w = r.items[k];
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

  const playTarget = (slow = false) => {
    if (!r) return;
    const id = roundId.current;
    const w = r.items[r.target];
    voice.speak(w.th, {
      rom: w.rom,
      slow,
      onEnd: () => {
        if (!feria || roundId.current !== id || speed.current) return;
        speed.current = 10;
        fuse.set(withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 4500, easing: Easing.linear })));
        timers.later(() => {
          if (roundId.current === id && speed.current > 0) speed.current = 5;
        }, 2200);
        timers.later(() => {
          if (roundId.current === id) speed.current = -1;
        }, 4500);
      },
    });
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
      timers.later(() => {
        if (prev) fx.levelup();
        juice.banner(LEVELS[r.level].name, LEVELS[r.level].sub, color.buatong);
      }, 60);
    }
    timers.later(() => fx.flip(), wait + 120);
    r.items.forEach((_, k) => timers.later(() => setShown(k + 1), wait + 140 + k * 130));
    timers.later(
      () => {
        setPhase('play');
        playTarget(false);
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
  const hints = level.hints || hint;
  const target = r.items[r.target];

  const answer = (k: number, e: GestureResponderEvent) => {
    if (phase !== 'play') return;
    const ok = k === r.target;
    setPick(k);
    setPhase('done');
    const combo = score.hit(ok);
    onAnswer(ok, idOf(target));
    setMarks((m) => [...m, ok ? 'ok' : 'bad']);
    const at = tapPoint(e);
    if (ok) {
      let pts = 0;
      if (feria) {
        const quick = speed.current >= 0 ? speed.current || 10 : 0;
        pts = Math.round((level.base + quick + (combo >= 3 ? 5 : 0)) / (hint ? 2 : 1));
        pointsRef.current += pts;
        setPoints(pointsRef.current);
        if (quick >= 10) timers.later(() => juice.float({ x: at.x, y: at.y - 50 }, '¡Rápido!', color.buatong, 22), 240);
      }
      juice.celebrate(at, feria ? `+${pts}` : '¡Eso es!', 'monedas');
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
        const items = shuffle(r.items);
        const again: Round = { ...r, items, target: items.indexOf(target), level: lv, retry: true };
        setQueue([...queue.slice(0, p), again, ...queue.slice(p)]);
      }
    }
    speed.current = -1;
    // las cartas se dan la vuelta y enseñan su tono; suena la buena y, para aprender, las demás
    r.items.forEach((_, j) => timers.later(() => setTurned(j + 1), 260 + j * 140));
    timers.later(() => fx.flip(), 260);
    const others = r.items.map((_, j) => j).filter((j) => j !== r.target);
    const order = [r.target, ...(feria && ok ? [] : others)];
    timers.later(() => compare(order), 700);
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    voice.stop();
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
  const ok = answered && pick === r.target;
  const stateOf = (k: number): CardState => (!answered ? 'idle' : k === r.target ? 'ok' : k === pick ? 'bad' : 'dim');
  const faceOf = (k: number): Face => (k >= shown ? 'back' : answered && k < turned ? 'contour' : 'front');

  // tras responder, el chiste de Yai (si lo hay) o una invitación a comparar
  const tip = `Mismo sonido, ${n === 2 ? 'dos' : n === 3 ? 'tres' : 'cuatro'} tonos. Toca las cartas para compararlas.`;
  const line = answered ? (r.set.joke && (!ok || !feria) ? r.set.joke : tip) : null;

  const cols = 2;
  const rows = Math.ceil(n / cols);
  const gap = 12;
  const cardW = grid.w ? (grid.w - gap) / cols : 0;
  const cardH = grid.h ? Math.min(rows === 1 ? 286 : 214, (grid.h - gap * (rows - 1)) / rows) : 0;
  const noiSize = compact ? 108 : 132;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="mercado" />
      <Animated.View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }, juice.shakeStyle]}>
        <TopBar marks={marks} total={queue.length} points={feria ? points : undefined} combo={score.combo} dark />

        <View style={styles.titleRow}>
          <Animated.Text key={r.set.title + i} entering={ZoomIn.springify().damping(12)} style={[styles.title, r.set.title.length > 22 && { fontSize: 20 }]} numberOfLines={1}>
            {r.set.title}
          </Animated.Text>
          {phase === 'play' && !level.hints && !hint ? (
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
                <AudioOrb onPress={() => playTarget(false)} talking={voice.talking && phase !== 'done'} size={compact ? 62 : 72} gold />
                <SlowPill onPress={() => playTarget(true)} dark />
              </View>
            )}
          </View>
        </View>

        <View style={{ flex: 1 }} onLayout={(e) => setGrid({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {cardW > 0 && cardH > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap }}>
              {r.items.map((w, k) => (
                <Card
                  key={`${i}-${w.th}`}
                  word={w}
                  width={cardW}
                  height={cardH}
                  face={faceOf(k)}
                  state={stateOf(k)}
                  hint={hints}
                  playing={playing === k}
                  drawN={draw.k === k ? draw.n : 0}
                  drawMs={draw.ms}
                  disabled={phase === 'deal' || phase === 'out'}
                  onPress={(e) => (phase === 'play' ? answer(k, e) : answered ? playCard(k) : undefined)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          {phase === 'done' ? (
            <NextButton label={i + 1 >= queue.length ? (feria ? '¡Ver puntos!' : 'Terminar') : 'Siguiente'} kind={ok ? 'ok' : 'primary'} auto={feria && ok ? 2000 : undefined} onPress={next} />
          ) : (
            <Text style={styles.hint}>{phase === 'play' ? (hints ? 'Escucha el tono y toca su carta' : '¿Cuál has oído?') : ' '}</Text>
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
  playing,
  drawN,
  drawMs,
  disabled,
  onPress,
}: {
  word: MiniWord;
  width: number;
  height: number;
  face: Face;
  state: CardState;
  hint: boolean;
  playing: boolean;
  drawN: number;
  drawMs: number;
  disabled: boolean;
  onPress: (e: GestureResponderEvent) => void;
}) {
  const tone = toneOf(word);
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
  return (
    <View style={{ width, height, opacity: state === 'dim' && face !== 'contour' ? 0.5 : 1 }}>
      {state === 'ok' || playing ? <Glow size={width * 1.25} tint={playing ? t.fill : color.arrozalVivo} strength={0.6} style={{ position: 'absolute', left: -width * 0.125, top: height / 2 - width * 0.625 }} /> : null}
      <Pop trigger={`${state}${playing ? 1 : 0}`} scale={state === 'ok' || playing ? 1.06 : 1} style={{ flex: 1 }}>
        <Press3D onPress={onPress} disabled={disabled} style={{ flex: 1 }} depth={14} accessibilityLabel={`${word.th}, ${word.es}`}>
          <Flip3D
            flipped={face !== 'front'}
            duration={480}
            style={{ flex: 1 }}
            front={
              <CardSkin skin={SKINS.idle} pad={6}>
                <Medallion emoji={word.emoji} size={medal} tint={medalOf(word.th)} />
                <Text style={[styles.es, { fontSize: big ? 18 : 15 }]} numberOfLines={2}>
                  {word.es.split(';')[0]}
                </Text>
                <Th size={thSize} bold style={{ textAlign: 'center', marginTop: -2 }}>
                  {word.th}
                </Th>
                {hint ? (
                  <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.chip, { backgroundColor: t.fill }]}>
                    <ToneGlyph path={t.path} color={t.on} size={20} />
                    <Text style={[styles.chipText, { color: t.on }]}>{t.name}</Text>
                  </Animated.View>
                ) : null}
              </CardSkin>
            }
            back={
              face !== 'contour' ? (
                <LannaBack tint="laca" />
              ) : (
                <CardSkin skin={skin} pad={6}>
                  <Th size={thSize - 2} bold style={{ textAlign: 'center' }}>
                    {word.th}
                  </Th>
                  <Melody tones={[tone]} width={width - 26} height={Math.max(44, height * (big ? 0.34 : 0.3))} progress={p} stroke={big ? 8 : 6} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <ToneGlyph path={t.path} color={t.fill} size={20} />
                    <Text style={[styles.toneName, { color: t.text }]}>{t.name}</Text>
                  </View>
                  <Rom rom={word.rom} size={big ? 16 : 14} style={{ textAlign: 'center' }} />
                  {big ? <Text style={styles.how}>{TONE_HOW[tone]} · {word.es.split(';')[0]}</Text> : null}
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
  footer: { height: 82, justifyContent: 'center', paddingBottom: 10 },
  hint: { textAlign: 'center', fontFamily: font.uiBold, fontSize: 14, color: '#FFE9C7', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
});
