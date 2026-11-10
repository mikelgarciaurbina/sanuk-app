// Juego 6 · Oído de elefante: al amanecer suena una palabra, Noi se inclina con su gran oreja para
// escucharla y tú eliges la carta que has oído. En la feria hay niveles (tres cartas con dibujo,
// cuatro cartas y, al final, en thai escrito), ronda dorada, bonus por rapidez y racha.
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, ZoomIn, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import type { NoiPose } from '@/brand/noi-art';
import type { Word } from '@/content/types';
import { fx } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { syllables } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { Flip3D, Glow, Pop, Press3D, tapPoint, useJuice } from './fx';
import { useScore } from './kit';
import { AudioOrb, Badge, CardSkin, LannaBack, Medallion, NextButton, SKINS, SlowPill, Tag, TopBar, medalOf, type Mark } from './tonos/piezas';
import { useTimers, useVoice } from './tonos/voz';
import type { GameProps } from './types';

type Kind = 'imagen' | 'thai';
type Round = { target: Word; options: Word[]; kind: Kind; level: number; retry?: boolean; golden?: boolean };
type Phase = 'deal' | 'play' | 'done' | 'out';
type CardState = 'idle' | 'ok' | 'bad' | 'dim';

/** Carta que ya no cuenta: apagada pero opaca (sin que se vea la niebla a través). */
const DIM = { top: '#EEF1F6', bottom: '#E1E6EE', border: '#D9DFE8', edge: '#C2CBD8' };

const LEVELS: { name: string; sub: string; kind: Kind; n: number; base: number }[] = [
  { name: '¡Nivel 1!', sub: 'Tres cartas con dibujo', kind: 'imagen', n: 3, base: 10 },
  { name: '¡Nivel 2!', sub: 'Ahora, cuatro cartas', kind: 'imagen', n: 4, base: 15 },
  { name: '¡Nivel 3!', sub: 'En thai escrito', kind: 'thai', n: 4, base: 20 },
];

const sylCount = (w: Word) => syllables(w.rom).length;

/** Lo que pone en la carta: la primera acepción («montaña; él» → «montaña»). */
const label = (w: Word) => w.es.split(';')[0].trim();

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'u', 'e', 'a', 'al', 'en', 'con', 'sin', 'para', 'por', 'que', 'se', 'lo', 'le', 'les', 'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'muy', 'algo', 'cosa', 'cosas', 'hacer', 'ser', 'estar']);
/** Palabras con significado de una traducción (para no poner juntas «él, ella» y «usted; él, ella»). */
const keys = (es: string) => es.toLowerCase().split(/[^a-záéíóúüñ]+/).filter((t) => t.length > 1 && !STOP.has(t));

/** Opciones verosímiles pero sin dudas: nunca dos con la misma traducción (ni que se pisen), el mismo thai o el mismo dibujo. */
function optionsFor(target: Word, words: Word[], focus: Word[], n: number, kind: Kind): Word[] {
  const focusIds = new Set(focus.map((w) => w.id));
  const scored = words
    .filter((w) => w.id !== target.id)
    .map((w) => ({
      w,
      s:
        Math.random() +
        (focusIds.has(w.id) ? 1.2 : 0) +
        (w.cat && w.cat === target.cat ? 0.7 : 0) +
        (kind === 'thai' && sylCount(w) === sylCount(target) ? 0.8 : 0) +
        (kind === 'thai' && w.th[0] === target.th[0] ? 0.5 : 0),
    }))
    .sort((a, b) => b.s - a.s);
  const out: Word[] = [];
  for (const strict of [true, false]) {
    const chosen = [target, ...out];
    for (const { w } of scored) {
      if (out.length >= n - 1) break;
      const clash = chosen.some(
        (c) =>
          c.id === w.id ||
          c.es === w.es ||
          label(c) === label(w) ||
          c.th === w.th ||
          (kind === 'imagen' && c.emoji === w.emoji) ||
          (strict && keys(c.es).some((k) => keys(w.es).includes(k))),
      );
      if (clash) continue;
      chosen.push(w);
      out.push(w);
    }
  }
  return shuffle([target, ...out]);
}

function plan(mode: GameProps['mode'], words: Word[], focus: Word[], rounds: number, oral = false): Round[] {
  const seen = new Set<string>();
  const order: Word[] = [];
  for (const w of [...shuffle(focus), ...shuffle(words)]) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    order.push(w);
  }
  if (order.length < 2) return [];
  const n = Math.max(1, rounds);
  const golden = mode === 'feria' && n >= 6 ? 3 + Math.floor(Math.random() * (n - 4)) : -1;
  return Array.from({ length: n }, (_, i) => {
    const target = order[i % order.length];
    const level = mode === 'feria' ? (i < Math.round(n * 0.3) ? 0 : i < Math.round(n * 0.6) ? 1 : 2) : !oral && n >= 3 && i === n - 1 ? 2 : 1;
    const L = LEVELS[level];
    return { target, kind: L.kind, level, options: optionsFor(target, words, focus, L.n, L.kind), golden: i === golden };
  });
}

/** Juego 6 · Oído de elefante: escucha y elige lo que has oído. */
export default function Oido({ mode, words, focus, rounds = 4, oral = false, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const voice = useVoice();
  const timers = useTimers();
  const { height: winH } = useWindowDimensions();
  const compact = winH < 760;

  const [queue, setQueue] = useState(() => plan(mode, words, focus, rounds, oral));
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('deal');
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [points, setPoints] = useState(0);
  const [pose, setPose] = useState<NoiPose>('escucha');
  const [jump, setJump] = useState(0);
  const [grid, setGrid] = useState({ w: 0, h: 0 });
  const pointsRef = useRef(0);
  const retries = useRef(0);
  const finished = useRef(false);
  // bonus por rapidez: vale mientras suena la palabra y hasta 2,5 s después
  const fast = useRef(true);
  const roundId = useRef(0);

  const r = queue[i];

  const play = (slow = false) => {
    if (!r) return;
    const id = roundId.current;
    voice.speak(r.target.th, {
      rom: r.target.rom,
      slow,
      onEnd: () =>
        timers.later(() => {
          if (roundId.current === id) fast.current = false;
        }, 2500),
    });
  };

  // al empezar cada ronda: se reparten las cartas y suena la palabra
  const startRound = useEffectEvent(() => {
    if (!r) return;
    roundId.current += 1;
    fast.current = true;
    const prev = queue[i - 1];
    let wait = 0;
    if (feria && (!prev || prev.level !== r.level)) {
      wait = 650;
      timers.later(() => {
        if (i > 0) fx.levelup();
        juice.banner(i === 0 ? '¡A escuchar!' : LEVELS[r.level].name, i === 0 ? `${LEVELS[r.level].name.replace(/[¡!]/g, '')} · ${LEVELS[r.level].sub}` : LEVELS[r.level].sub, color.cieloHondo);
      }, 80);
    } else if (r.golden) {
      wait = 650;
      timers.later(() => {
        fx.sparkle();
        juice.banner('¡Ronda dorada!', 'Esta vale el doble', color.buatongHondo);
      }, 80);
    }
    timers.later(() => fx.flip(), wait + 100);
    r.options.forEach((_, k) => timers.later(() => setShown(k + 1), wait + 120 + k * 110));
    timers.later(
      () => {
        setPhase('play');
        play(false);
      },
      wait + 260 + r.options.length * 110,
    );
  });
  useEffect(() => {
    startRound();
  }, [i]);

  // sin palabras suficientes no hay juego: se termina sin más
  const bail = useEffectEvent(() => onDone(score.result(0)));
  useEffect(() => {
    if (!queue.length) bail();
  }, [queue.length]);

  // Noi se inclina hacia el sonido mientras suena
  const lean = useSharedValue(0);
  useEffect(() => {
    lean.value = withSpring(voice.talking ? 1 : 0, { damping: 11, stiffness: 120 });
  }, [voice.talking, lean]);
  const leanStyle = useAnimatedStyle(() => ({ transform: [{ translateX: lean.value * 10 }, { rotate: `${lean.value * 8}deg` }] }));

  if (!r) return null;

  const answer = (k: number, e: GestureResponderEvent) => {
    if (phase !== 'play' || pick !== null) return;
    const ok = r.options[k].id === r.target.id;
    setPick(k);
    setPhase('done');
    const combo = score.hit(ok);
    onAnswer(ok, r.target.id);
    setMarks((m) => [...m, ok ? 'ok' : 'bad']);
    const at = tapPoint(e);
    if (ok) {
      let pts = 0;
      if (feria) {
        const quick = fast.current;
        pts = (LEVELS[r.level].base + (quick ? 5 : 0) + (combo >= 3 ? 5 : 0)) * (r.golden ? 2 : 1);
        pointsRef.current += pts;
        setPoints(pointsRef.current);
        if (quick) timers.later(() => juice.float({ x: at.x, y: at.y - 46 }, '¡Rápido!', color.cieloHondo, 22), 260);
      }
      juice.celebrate(at, feria ? `+${pts}` : '¡Eso es!', r.golden ? 'monedas' : 'estrellas');
      if (combo >= 5 && combo % 5 === 0) timers.later(() => juice.banner(`¡Racha de ${combo}!`, 'Oído de elefante', color.farol), 450);
      setPose('celebra');
      setJump((j) => j + 1);
    } else {
      juice.shake();
      setPose('ups');
      // lo que se falla vuelve un poco más tarde
      if (retries.current < (feria ? 3 : 2)) {
        retries.current += 1;
        // con el nivel de las rondas de su alrededor (para no repetir el cartel de nivel)
        const p = Math.min(i + 3, queue.length);
        const lv = feria ? (queue[p] ?? queue[queue.length - 1]).level : r.level;
        const L = LEVELS[lv];
        const again: Round = { ...r, retry: true, golden: false, level: lv, kind: L.kind, options: lv === r.level ? shuffle(r.options) : optionsFor(r.target, words, focus, L.n, L.kind) };
        setQueue([...queue.slice(0, p), again, ...queue.slice(p)]);
      }
    }
    timers.later(() => voice.speak(r.target.th, { rom: r.target.rom }), ok ? 420 : 560);
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
    juice.banner('¡Qué oído!', `${pointsRef.current} puntos`, color.cieloHondo);
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
    setPhase('out');
    timers.later(() => {
      setShown(0);
      setPick(null);
      setPose('escucha');
      setPhase('deal');
      setI((v) => v + 1);
    }, 320);
  };

  const target = r.options.findIndex((o) => o.id === r.target.id);
  const stateOf = (k: number): CardState => {
    if (phase !== 'done' && phase !== 'out') return 'idle';
    if (k === target) return 'ok';
    if (k === pick) return 'bad';
    return 'dim';
  };
  const answered = phase === 'done' || (phase === 'out' && pick !== null);
  const ok = pick !== null && pick === target;

  const stageH = compact ? 172 : 214;
  const noiSize = compact ? 150 : 182;
  const cols = 2;
  const rows = Math.ceil(r.options.length / cols);
  const gap = 12;
  const cardW = grid.w ? (grid.w - gap) / cols : 0;
  const cardH = grid.h ? Math.min(178, (grid.h - gap * (rows - 1)) / rows) : 0;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="amanecer" />
      <Animated.View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }, juice.shakeStyle]}>
        <TopBar marks={marks} total={queue.length} points={feria ? points : undefined} combo={score.combo} />

        <View style={{ height: stageH, flexDirection: 'row', alignItems: 'center' }}>
          <Animated.View style={[{ marginLeft: -10 }, leanStyle]}>
            <Glow size={noiSize} tint="#FFF6DA" strength={0.7} style={{ position: 'absolute' }} />
            <Noi pose={pose} size={noiSize} jump={jump} accessibilityLabel="Noi escucha con su gran oreja" />
          </Animated.View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {answered ? (
              <Reveal word={r.target} ok={ok} onReplay={() => play(false)} />
            ) : (
              <View style={{ alignItems: 'center', marginTop: -8 }}>
                <AudioOrb onPress={() => play(false)} talking={voice.talking} size={compact ? 76 : 88} gold={r.golden} />
                <View style={{ marginTop: -14 }}>
                  <SlowPill onPress={() => play(true)} />
                </View>
              </View>
            )}
          </View>
          {!answered ? <Notes active={voice.talking} left={noiSize * 0.62} top={stageH * 0.22} gold={r.golden} /> : null}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>¿Qué has oído?</Text>
          {r.retry ? (
            <Tag text="Otra vez" tint={color.farol} />
          ) : r.golden ? (
            <Tag text="Ronda dorada ×2" tint={color.buatongHondo} bg="#FFF6D6" />
          ) : feria ? (
            <Tag text={LEVELS[r.level].sub} tint={color.cieloHondo} />
          ) : r.kind === 'thai' ? (
            <Tag text="En thai escrito" tint={color.cieloHondo} />
          ) : null}
        </View>

        <View style={{ flex: 1 }} onLayout={(e) => setGrid({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {cardW > 0 && cardH > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap }}>
              {r.options.map((w, k) => (
                <Card
                  key={`${i}-${w.id}`}
                  word={w}
                  kind={r.kind}
                  width={cardW}
                  height={cardH}
                  state={stateOf(k)}
                  faceUp={k < shown && phase !== 'out'}
                  disabled={phase !== 'play'}
                  onPress={(e) => answer(k, e)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          {phase === 'done' ? (
            <NextButton label={i + 1 >= queue.length ? (feria ? '¡Ver puntos!' : 'Terminar') : 'Siguiente'} kind={ok ? 'ok' : 'primary'} auto={feria && ok ? 1500 : undefined} onPress={next} />
          ) : (
            <Text style={styles.hint}>{phase === 'play' ? (feria ? 'Cuanto antes aciertes, más puntos' : 'Toca la carta que has oído') : ' '}</Text>
          )}
        </View>
      </Animated.View>
      {juice.layer}
    </View>
  );
}

function Card({
  word,
  kind,
  width,
  height,
  state,
  faceUp,
  disabled,
  onPress,
}: {
  word: Word;
  kind: Kind;
  width: number;
  height: number;
  state: CardState;
  faceUp: boolean;
  disabled: boolean;
  onPress: (e: GestureResponderEvent) => void;
}) {
  const skin = state === 'ok' ? SKINS.ok : state === 'bad' ? SKINS.bad : state === 'dim' ? DIM : SKINS.idle;
  const text = label(word);
  const long = text.length > 22;
  const medal = Math.round(Math.min(height * (long ? 0.44 : 0.52), width * 0.5, 88));
  const thSize = word.th.length <= 4 ? 32 : word.th.length <= 8 ? 27 : word.th.length <= 12 ? 22 : 18;
  return (
    <View style={{ width, height }}>
      {state === 'ok' ? <Glow size={width * 1.2} tint={color.arrozalVivo} strength={0.55} style={{ position: 'absolute', left: -width * 0.1, top: height / 2 - width * 0.6 }} /> : null}
      <Pop trigger={state} scale={state === 'ok' ? 1.08 : 1} style={{ flex: 1 }}>
        <Press3D onPress={onPress} disabled={disabled} style={{ flex: 1 }} accessibilityLabel={kind === 'thai' ? `${word.th}, ${word.rom}` : text}>
          <Flip3D
            flipped={!faceUp}
            duration={420}
            style={{ flex: 1 }}
            front={
              <CardSkin skin={skin}>
                <View style={{ alignItems: 'center', opacity: state === 'dim' ? 0.4 : 1 }}>
                  {kind === 'imagen' ? (
                    <>
                      <Medallion emoji={word.emoji} size={medal} tint={medalOf(word.id)} />
                      <Text numberOfLines={3} style={[styles.cardEs, { fontSize: long ? 13.5 : height < 130 ? 15 : 16.5, lineHeight: long ? 17 : 20 }]}>
                        {text}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Th size={thSize} bold numberOfLines={1} style={{ textAlign: 'center' }}>
                        {word.th}
                      </Th>
                      <Rom rom={word.rom} size={15} style={{ textAlign: 'center' }} />
                    </>
                  )}
                </View>
              </CardSkin>
            }
            back={<LannaBack />}
          />
        </Press3D>
      </Pop>
      {state === 'ok' || state === 'bad' ? <Badge ok={state === 'ok'} /> : null}
    </View>
  );
}

/** Notas que salen del sonido y vuelan hacia la oreja de Noi mientras suena. */
function Notes({ active, left, top, gold }: { active: boolean; left: number; top: number; gold?: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top, width: 120, height: 90 }}>
      {['♪', '♫', '♪'].map((g, k) => (
        <Note key={k} glyph={g} k={k} active={active} tint={gold ? '#FFE07A' : '#FFFFFF'} />
      ))}
    </View>
  );
}

function Note({ glyph, k, active, tint }: { glyph: string; k: number; active: boolean; tint: string }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (active && !reduced) {
      t.value = 0;
      t.value = withDelay(k * 330, withRepeat(withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }), -1, false));
    } else {
      cancelAnimation(t);
      t.value = 0;
    }
  }, [active, reduced, k, t]);
  const st = useAnimatedStyle(() => {
    const v = t.value;
    return {
      opacity: v <= 0 ? 0 : v < 0.2 ? v / 0.2 : (1 - v) / 0.8,
      transform: [{ translateX: 96 - v * 96 }, { translateY: 22 + k * 10 + Math.sin(v * Math.PI * 2 + k) * 9 - v * 14 }, { rotate: `${-14 + v * 28}deg` }, { scale: 0.7 + v * 0.55 }],
    };
  });
  return <Animated.Text style={[styles.note, { color: tint }, st]}>{glyph}</Animated.Text>;
}

/** Noi repite la palabra en un bocadillo: thai, transcripción y traducción. */
function Reveal({ word, ok, onReplay }: { word: Word; ok: boolean; onReplay: () => void }) {
  const size = word.th.length <= 4 ? 30 : word.th.length <= 8 ? 26 : word.th.length <= 12 ? 22 : 19;
  return (
    <Animated.View entering={ZoomIn.springify().damping(13)} style={styles.bubble}>
      <View style={styles.bubbleTail} />
      {!ok ? <Text style={styles.was}>Era:</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Th size={size} bold style={{ flexShrink: 1 }}>
          {word.th}
        </Th>
        <Press3D onPress={onReplay} style={{ width: 40, height: 40 }} depth={14} accessibilityLabel="Escuchar otra vez">
          <View style={styles.mini}>
            <Icon name="speaker" size={20} color="#FFFFFF" />
          </View>
        </Press3D>
      </View>
      <Rom rom={word.rom} size={15} />
      <Text style={[styles.es, { color: ok ? color.arrozalHondo : color.tinta }]} numberOfLines={2}>
        {word.es}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 34, marginBottom: 6 },
  title: { fontFamily: font.displayBold, fontSize: 22, color: color.tinta, textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  cardEs: { fontFamily: font.uiHeavy, color: color.tinta, textAlign: 'center', marginTop: 4, lineHeight: 20 },
  footer: { height: 82, justifyContent: 'center', paddingBottom: 10 },
  hint: { textAlign: 'center', fontFamily: font.uiBold, fontSize: 14, color: '#FFFFFF', textShadowColor: 'rgba(29,35,71,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  bubble: {
    maxWidth: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
    shadowColor: '#1D2347',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  bubbleTail: { position: 'absolute', left: -7, top: 34, width: 18, height: 18, backgroundColor: '#FFFFFF', borderRadius: 3, transform: [{ rotate: '45deg' }] },
  was: { fontFamily: font.uiHeavy, fontSize: 12.5, color: color.farol, textTransform: 'uppercase', letterSpacing: 0.8 },
  es: { fontFamily: font.uiHeavy, fontSize: 16, lineHeight: 20 },
  mini: { flex: 1, borderRadius: 20, backgroundColor: color.cielo, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderColor: color.cieloHondo },
  note: { position: 'absolute', left: 0, top: 0, fontSize: 26, fontFamily: font.displayBold, textShadowColor: 'rgba(29,35,71,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
});
