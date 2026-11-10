// Juego 7 · Trompa de tonos: suena una sílaba y eliges su tono con las cinco teclas de colores. Al
// responder, la trompa de Noi dibuja en el aire la curva del tono, con su color, mientras vuelve a
// sonar (y, si fallaste, la curva que elegiste al lado para comparar). En la lección empieza con
// «los cinco tonos de Noi»; en la feria se empieza con dos tonos y se sube hasta los cinco, de oído,
// con racha y bonus de rapidez.
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { NoiPose } from '@/brand/noi-art';
import { color, font, tones, type ToneId } from '@/brand/tokens';
import { Icon, ToneGlyph } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import { knownForms } from '@/content';
import { TONE_BANK, toneBankFor, type MiniWord } from '@/content/drills';
import { CONSONANTS } from '@/content/letters';
import type { Word } from '@/content/types';
import { fx } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { tonesOf } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { Countdown, Glow, Pop, Press3D, tapPoint, useJuice } from './fx';
import { useScore } from './kit';
import { Melody, TONE_HOW, TONE_ORDER } from './tonos/curva';
import { Badge, Fuse, NextButton, SlowPill, Tag, TopBar, type Mark } from './tonos/piezas';
import { useTimers, useVoice } from './tonos/voz';
import type { GameProps } from './types';

type Item = { id?: string; th: string; rom: string; es: string; emoji?: string; tone: ToneId };
type Round = { item: Item; choices: ToneId[]; level: number; retry?: boolean };
type Phase = 'intro' | 'count' | 'deal' | 'play' | 'done' | 'out';
type KeyState = 'idle' | 'ok' | 'bad' | 'dim' | 'off';

/** Feria: de dos tonos a los cinco, y al final sin ver la palabra. El último nivel es el de la lección. */
const LEVELS = [
  { name: '¡Nivel 1!', sub: 'Elige entre dos tonos', n: 2, base: 10, hide: false },
  { name: '¡Nivel 2!', sub: 'Ahora, entre tres', n: 3, base: 15, hide: false },
  { name: '¡Nivel 3!', sub: 'Cuatro tonos', n: 4, base: 20, hide: false },
  { name: '¡Nivel 4!', sub: 'Los cinco… ¡solo de oído!', n: 5, base: 30, hide: true },
  { name: '', sub: 'Los cinco tonos', n: 5, base: 20, hide: false },
];

/** Tonos que se distinguen bien de cada uno (para empezar con pares fáciles). */
const FAR: Record<ToneId, ToneId[]> = { M: ['R', 'F'], L: ['H', 'R'], F: ['R', 'M'], H: ['L', 'F'], R: ['F', 'L'] };

/** Una sílaba de ejemplo para cada tono (todas con «aa», para comparar solo la melodía). */
const MODEL: Record<ToneId, MiniWord> = {
  M: TONE_BANK.find((w) => w.th === 'มา') ?? TONE_BANK[0],
  L: TONE_BANK.find((w) => w.th === 'ป่า') ?? TONE_BANK[0],
  F: TONE_BANK.find((w) => w.th === 'ห้า') ?? TONE_BANK[0],
  H: TONE_BANK.find((w) => w.th === 'ม้า') ?? TONE_BANK[0],
  R: TONE_BANK.find((w) => w.th === 'หมา') ?? TONE_BANK[0],
};

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

function choicesFor(tone: ToneId, n: number): ToneId[] {
  if (n >= 5) return TONE_ORDER;
  const first = shuffle(FAR[tone])[0];
  const rest = shuffle(TONE_ORDER.filter((t) => t !== tone && t !== first));
  return [tone, first, ...rest].slice(0, n);
}

const mono = (w: { rom: string }) => tonesOf(w.rom).length === 1;
const toItem = (w: Word | MiniWord, id?: string): Item => ({ id, th: w.th, rom: w.rom, es: w.es, emoji: w.emoji, tone: tonesOf(w.rom)[0] });

function plan(mode: GameProps['mode'], words: Word[], focus: Word[], rounds: number): Round[] {
  const seen = new Set<string>();
  const uniq = (list: Item[]) => list.filter((it) => !seen.has(it.th) && (seen.add(it.th), true));
  const F = uniq(shuffle(focus.filter(mono).map((w) => toItem(w, w.id))));
  // sílabas de práctica: las palabras de una sílaba ya presentadas y, del banco, solo las que se conocen
  const R = uniq(shuffle([...words.filter(mono).map((w) => toItem(w, w.id)), ...toneBankFor(knownForms([...words, ...focus])).map((w) => toItem(w))]));
  const takeFrom = (list: Item[], ok: (it: Item) => boolean) => {
    const k = list.findIndex(ok);
    return k >= 0 ? list.splice(k, 1)[0] : undefined;
  };
  // las palabras de la lección van primero si el tono es de los que hay en la bolsa
  const take = (tone?: ToneId) => takeFrom(F, (it) => !tone || it.tone === tone) ?? takeFrom(R, (it) => !tone || it.tone === tone);
  const out: Round[] = [];
  let bag: ToneId[] = [];
  for (let i = 0; i < rounds; i++) {
    const prev = out[out.length - 1]?.item.tone;
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
    const level = mode === 'feria' ? Math.min(3, Math.floor((i / Math.max(1, rounds)) * 4)) : i < 2 ? 1 : 4;
    out.push({ item, level, choices: choicesFor(item.tone, LEVELS[level].n) });
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
export default function Tonos({ mode, words, focus, rounds, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const voice = useVoice();
  const timers = useTimers();
  const { height: winH } = useWindowDimensions();
  const compact = winH < 760;

  const [queue, setQueue] = useState(() => plan(mode, words, focus, rounds ?? (feria ? 12 : 4)));
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>(feria ? 'count' : 'intro');
  const [pick, setPick] = useState<ToneId | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [points, setPoints] = useState(0);
  const [pose, setPose] = useState<NoiPose>(feria ? 'escucha' : 'hola');
  const [jump, setJump] = useState(0);
  const [drawn, setDrawn] = useState<ToneId | null>(null);
  const [ghost, setGhost] = useState<ToneId | null>(null);
  const [demo, setDemo] = useState<ToneId | null>(null);
  const [chart, setChart] = useState(!feria);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const pointsRef = useRef(0);
  const retries = useRef(0);
  const finished = useRef(false);
  const introOn = useRef(!feria);
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

  // ——— «Los cinco tonos de Noi» (al empezar la lección): suenan uno tras otro y quedan dibujados en fila ———
  const playModel = (t: ToneId) => {
    introOn.current = false;
    setChart(false);
    setDemo(t);
    setGhost(null);
    sayDrawing(MODEL[t], t);
  };
  const runIntro = (k: number) => {
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
      onEnd: () => timers.later(() => runIntro(k + 1), 650),
    });
  };
  const kickoff = useEffectEvent(() => {
    if (!feria) timers.later(() => runIntro(0), 700);
  });
  useEffect(() => {
    kickoff();
  }, []);

  const startGame = () => {
    introOn.current = false;
    voice.stop();
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
        // bonus de rapidez: +10 los primeros 2 s, +5 hasta los 4 s
        speed.current = 10;
        fuse.set(withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 4000, easing: Easing.linear })));
        timers.later(() => {
          if (roundId.current === id && speed.current) speed.current = 5;
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
  const hidden = level.hide && phase !== 'done' && phase !== 'out';

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
        const quick = speed.current >= 0 ? speed.current || 10 : 0;
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

  const keyState = (t: ToneId): KeyState => {
    if (phase === 'intro') return 'idle';
    if (!r.choices.includes(t)) return 'off';
    if (phase !== 'done' && phase !== 'out') return 'idle';
    if (t === r.item.tone) return 'ok';
    if (t === pick) return 'bad';
    return 'dim';
  };

  const intro = phase === 'intro';
  const answered = phase === 'done' || (phase === 'out' && pick !== null);
  const ok = answered && pick === r.item.tone;
  // lo que dibuja la trompa: el tono de la sílaba o, al comparar, el ejemplo del tono que elegiste
  const shownTone = intro ? demo : answered ? (drawn ?? r.item.tone) : null;
  const comparing = answered && !!ghost && drawn === ghost;
  const dashed = intro ? null : comparing ? r.item.tone : ghost;
  const rule = answered ? ruleHint(r.item) : undefined;

  const boardH = compact ? 214 : 262;
  const keyH = compact ? 62 : 70;
  const noiSize = Math.min(132, area.h * 1.05 || 120);

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
            {intro ? (
              <View style={{ flex: 1 }}>
                <Text style={styles.introTitle}>Los cinco tonos de Noi</Text>
                {demo ? (
                  <Text style={[styles.introSub, { color: tones[demo].text }]} numberOfLines={1}>
                    {MODEL[demo].th} · {MODEL[demo].rom} · {MODEL[demo].es}
                  </Text>
                ) : (
                  <Text style={styles.introSub}>Toca una tecla para oír su tono</Text>
                )}
              </View>
            ) : hidden ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="speaker" size={22} color={color.laca} />
                <Text style={styles.earOnly}>¡Solo de oído!</Text>
              </View>
            ) : (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Th size={r.item.th.length > 5 ? 30 : 36} bold>
                  {r.item.th}
                </Th>
                <View style={{ flexShrink: 1 }}>
                  {answered ? <Rom rom={r.item.rom} size={17} /> : null}
                  <Text style={styles.es} numberOfLines={2}>
                    {r.item.es}
                  </Text>
                </View>
              </View>
            )}
            {!intro ? (
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
            {area.w > 0 ? (
              <>
                <View style={{ position: 'absolute', left: -12, top: intro && chart ? area.h - noiSize * 0.86 : area.h / 2 - noiSize * 0.56 }}>
                  <Noi pose={intro ? (demo ? 'feliz' : 'hola') : pose} size={intro && chart ? noiSize * 0.78 : noiSize} jump={jump} accessibilityLabel="Noi dibuja con la trompa" />
                </View>
                <View style={{ position: 'absolute', left: intro && chart ? noiSize * 0.6 : noiSize * 0.5, top: 0 }}>
                  {intro && chart ? (
                    <Melody tones={TONE_ORDER} labels={TONE_ORDER.map((t) => MODEL[t].rom)} width={area.w - noiSize * 0.6} height={area.h} progress={draw} axis stroke={compact ? 6 : 7} />
                  ) : shownTone ? (
                    <Melody tones={[shownTone]} ghost={dashed} width={area.w - noiSize * 0.5} height={area.h} progress={draw} axis stroke={compact ? 8 : 10} />
                  ) : (
                    <Melody tones={[]} width={area.w - noiSize * 0.5} height={area.h} progress={draw} axis stroke={compact ? 8 : 10} />
                  )}
                  <MysteryWave active={voice.talking && !answered && !intro} width={area.w - noiSize * 0.5} height={area.h} />
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.boardFoot}>
            {shownTone ? (
              <Animated.View key={`${shownTone}${i}`} entering={FadeIn.duration(220)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ToneGlyph path={tones[shownTone].path} color={tones[shownTone].fill} size={26} />
                <Text style={[styles.toneName, { color: tones[shownTone].text }]} numberOfLines={1}>
                  {intro || comparing ? `Tono ${tones[shownTone].name.toLowerCase()}` : ok ? `¡Tono ${tones[shownTone].name.toLowerCase()}!` : `Era tono ${tones[shownTone].name.toLowerCase()}`}
                </Text>
                <Text style={styles.toneHow} numberOfLines={1}>
                  · {TONE_HOW[shownTone]}
                </Text>
              </Animated.View>
            ) : (
              <Text style={styles.toneHow}>{phase === 'play' ? 'Escucha la melodía y elige su tono' : intro ? 'Los cinco en fila: toca una tecla para oírlo' : ' '}</Text>
            )}
          </View>
        </View>

        {/* comparar y la regla de escritura */}
        <View style={styles.notes}>
          {answered && ghost ? (
            <Press3D onPress={() => sayDrawing(MODEL[ghost], ghost)} style={{ height: 36 }} depth={10} accessibilityLabel={`Escuchar un ejemplo del tono ${tones[ghost].name.toLowerCase()}`}>
              <View style={[styles.compare, { borderColor: tones[ghost].fill }]}>
                <Icon name="speaker" size={16} color={tones[ghost].text} />
                <Text style={[styles.compareText, { color: tones[ghost].text }]} numberOfLines={1}>
                  Elegiste {tones[ghost].name.toLowerCase()}. Suena así: {MODEL[ghost].th}
                </Text>
              </View>
            </Press3D>
          ) : null}
          {rule ? (
            <View style={styles.rule}>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ) : null}
          {!answered && !intro && r.retry ? <Tag text="Otra vez" tint={color.farol} /> : null}
          {!answered && !intro && feria && !r.retry ? <Tag text={level.sub} tint={color.laca} /> : null}
        </View>

        {/* las cinco teclas de tono */}
        <View style={{ gap: 10 }}>
          {[TONE_ORDER.slice(0, 3), TONE_ORDER.slice(3)].map((row, k) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
              {row.map((t) => (
                <ToneKey
                  key={t}
                  tone={t}
                  height={keyH}
                  state={keyState(t)}
                  pulse={intro && demo === t}
                  onPress={(e) => {
                    if (intro) {
                      introOn.current = false;
                      playModel(t);
                    } else answer(t, e);
                  }}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          {intro ? (
            <NextButton label="¡A jugar!" kind="primary" onPress={startGame} />
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
    <View style={{ width: 104, height, opacity: state === 'dim' ? 0.4 : 1 }}>
      {state === 'ok' || pulse ? <Glow size={150} tint={t.fill} strength={0.7} style={{ position: 'absolute', left: -23, top: height / 2 - 75 }} /> : null}
      <Pop trigger={`${state}${pulse ? 1 : 0}`} scale={state === 'ok' || pulse ? 1.12 : 1} style={{ flex: 1 }}>
        <Press3D onPress={onPress} disabled={off || state === 'dim'} style={{ flex: 1 }} depth={14} accessibilityLabel={`Tono ${t.name.toLowerCase()}: ${TONE_HOW[tone]}`}>
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
                {off ? <Icon name="lock" size={20} color={ink} /> : <ToneGlyph path={t.path} color={ink} size={36} />}
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
  introTitle: { fontFamily: font.displayBold, fontSize: 21, color: color.tinta },
  introSub: { fontFamily: font.uiHeavy, fontSize: 14, color: color.tinta3 },
  earOnly: { fontFamily: font.displayBold, fontSize: 21, color: color.laca },
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
