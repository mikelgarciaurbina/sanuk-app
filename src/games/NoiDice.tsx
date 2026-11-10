// Juego 13 · Noi dice. Noi, enorme en lo alto de una colina, pide en thai que le toques una parte del cuerpo:
// «น้อยบอกว่า แตะหู» (Noi dice: toca la oreja). Al acertar, esa parte brilla, salen corazones, suena una nota más
// aguda en cada acierto seguido y aparece la palabra con su traducción. Su izquierda es tu derecha. Si le tocas la
// trompa sin que te lo pida, estornuda. Feria: el giro de «Simón dice»: si no empieza por น้อยบอกว่า, ¡no se toca!;
// órdenes dobles (แตะหู แล้วแตะตา), rondas cada vez más rápidas, combos que multiplican y bonus por rapidez.
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import type { NoiPose } from '@/brand/noi-art';
import { color, font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import { knownForms } from '@/content';
import { BODY_COMMANDS, NOI_ZONES, bodyCommandsFor, type NoiTarget } from '@/content/drills';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { Countdown, Pop, tapPoint, useJuice, type Point } from './fx';
import { DrainBar, GameHud, WORD_BY_TH, clamp, useLater } from './frases/shared';
import { useScore } from './kit';
import type { GameProps } from './types';

type Cmd = (typeof BODY_COMMANDS)[number];
type Kind = 'normal' | 'trick' | 'double';
type Who = { th: string; rom: string; es: string };
type Round = { key: string; cmds: Cmd[]; kind: Kind; level: number; who: Who | null };

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
  hat: 'sombrero',
  handL: 'mano izquierda',
  handR: 'mano derecha',
  legs: 'patas',
  belly: 'barriga',
  mouth: 'boca',
};
const THE: Record<NoiTarget, string> = {
  earL: 'la oreja izquierda',
  earR: 'la oreja derecha',
  eyes: 'los ojos',
  trunk: 'la trompa',
  hat: 'el sombrero',
  handL: 'la mano izquierda',
  handR: 'la mano derecha',
  legs: 'las patas',
  belly: 'la barriga',
  mouth: 'la boca',
};
const MIRROR: Partial<Record<NoiTarget, NoiTarget>> = { earL: 'earR', earR: 'earL', handL: 'handR', handR: 'handL' };
/** Orden de las zonas: las pequeñas encima de las grandes. */
const ORDER: NoiTarget[] = ['hat', 'earL', 'earR', 'legs', 'eyes', 'belly', 'handL', 'handR', 'mouth', 'trunk'];
const TIME = [0, 5200, 4200, 3400, 2700];
const DEBUG_ZONES = false;

/** La palabra del cuerpo de cada orden (แตะหูซ้าย → หู), para el repaso. */
const partOf = (c: Cmd) => c.th.replace(/^แตะ/, '').replace(/(ซ้าย|ขวา)$/, '');
const zoneWord = (z: NoiTarget) => {
  const c = BODY_COMMANDS.find((x) => x.target === z);
  return c ? partOf(c) : '';
};

/**
 * Rondas con las órdenes que ya se entienden enteras (แตะ + la parte del cuerpo). «น้อยบอกว่า» solo se dice
 * cuando บอก ya se ha presentado; las trampas de la familia, con quien ya se conoce, y las dobles, con แล้ว.
 */
function makeRounds(mode: GameProps['mode'], n: number, known: Set<string>): Round[] {
  const cmds = bodyCommandsFor(known);
  if (cmds.length < 2) return [];
  const says = known.has('บอก') && known.has('ว่า');
  const others = OTHERS.filter((o) => known.has(o.th.replace('บอกว่า', '')));
  const deck: Cmd[] = [];
  while (deck.length < n * 2 + 2) deck.push(...shuffle(cmds).filter((c) => c.target !== deck[deck.length - 1]?.target));
  let d = 0;
  const take = () => deck[d++];
  if (mode === 'leccion' || !says) return Array.from({ length: n }, (_, i) => ({ key: `r${i}`, cmds: [take()], kind: 'normal', level: 1, who: says ? NOI_SAYS : null }));
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
  return levels.map((lv, i) => {
    const first = take();
    if (kinds[i] === 'trick') return { key: `r${i}`, cmds: [first], kind: 'trick', level: lv, who: !others.length || Math.random() < 0.5 ? null : others[Math.floor(Math.random() * others.length)] };
    if (kinds[i] !== 'double') return { key: `r${i}`, cmds: [first], kind: kinds[i], level: lv, who: NOI_SAYS };
    let second = take();
    if (second.target === first.target) second = take();
    return { key: `r${i}`, cmds: [first, second], kind: 'double', level: lv, who: NOI_SAYS };
  });
}

const sayRound = (r: Round) => {
  const body = r.cmds.map((c) => c.th).join(` ${AND_THEN.th}`);
  say(r.who ? `${r.who.th} ${body}` : body);
};

type Clock = { start: number; ms: number };
const clockFrom = (delay: number, ms: number): Clock => ({ start: Date.now() + delay, ms });
const left = (c: Clock) => clamp(1 - (Date.now() - c.start) / c.ms, 0, 1);

type Phase = 'intro' | 'play' | 'wait';
type Flash = { key: number; zone: NoiTarget; ok: boolean };

/** Juego · Noi dice. Sin órdenes que ya se entiendan no hay partida (nunca se adelantan palabras). */
export default function NoiDice(props: GameProps) {
  const { mode, rounds: n, words, focus, onDone } = props;
  const [rounds] = useState(() => makeRounds(mode, n ?? (mode === 'feria' ? 15 : 5), knownForms([...words, ...focus])));
  const bail = useEffectEvent(() => onDone({ correct: 0, total: 0, bananas: 0 }));
  useEffect(() => {
    if (!rounds.length) bail();
  }, [rounds]);
  return rounds.length ? <NoiDiceGame {...props} plan={rounds} /> : null;
}

function NoiDiceGame({ mode, plan, onAnswer, onDone }: GameProps & { plan: Round[] }) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const later = useLater();
  const { width, height } = useWindowDimensions();
  const rounds = plan;
  // al tocar una parte que aún no se ha enseñado (el sombrero, la barriga…) solo se dice en español
  const [inPlay] = useState(() => new Set(plan.flatMap((r) => r.cmds.map((c) => c.target))));
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
  const game = useRef({ points: 0, finished: false, token: 0, clock: { start: 0, ms: 1 } as Clock, tried: false, flashes: 0 });
  const api = useRef({ timeout: () => {}, next: () => {}, begin: () => {} });
  const [onCountdown] = useState(() => () => api.current.begin());
  const bar = useSharedValue(1);

  const r = rounds[i];
  const cmd = r.cmds[Math.min(step, r.cmds.length - 1)];
  const size = Math.round(Math.min(330, width - 40, Math.max(220, height - 360)));
  const k = size / 240;

  // ——— Rondas ———

  const startRound = (idx: number, delay: number) => {
    const rr = rounds[idx];
    const g = game.current;
    g.token += 1;
    g.tried = false;
    const token = g.token;
    later(() => sayRound(rr), delay + 250);
    if (!feria) return;
    const ms = TIME[rr.level] * (rr.kind === 'double' ? 1.7 : 1);
    g.clock = clockFrom(delay, ms);
    bar.set(1);
    bar.set(withDelay(delay, withTiming(0, { duration: ms, easing: Easing.linear })));
    later(() => {
      if (token === game.current.token) api.current.timeout();
    }, delay + ms);
  };

  const begin = () => {
    setPhase('play');
    startRound(0, 0);
  };

  // la primera orden de la lección suena al empezar
  useEffect(() => {
    if (feria) return;
    const t = setTimeout(() => sayRound(rounds[0]), 450);
    return () => clearTimeout(t);
  }, [feria, rounds]);

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
    setPose('feliz');
    setPhase('play');
    let delay = 0;
    if (feria && nr.level > r.level) {
      const sub = nr.level === 2 ? `Solo si dice «${NOI_SAYS.th}»` : nr.level === 3 ? 'Órdenes dobles: una y luego otra' : '¡Más rápido!';
      juice.banner(`¡Nivel ${nr.level}!`, sub, color.farol);
      fx.levelup();
      delay = 1400;
    }
    startRound(i + 1, delay);
  };

  const gain = (base: number, combo: number, at?: Point) => {
    const mult = Math.min(4, 1 + Math.floor(combo / 4));
    const rem = feria ? left(game.current.clock) : 0;
    const pts = Math.round((base + rem * 10) * mult);
    game.current.points += pts;
    setPoints(game.current.points);
    if (feria) juice.float(at ? { x: at.x, y: at.y - 40 } : undefined, `+${pts}`, color.azafranHondo, 24);
    return pts;
  };

  const flashZone = (zone: NoiTarget, ok: boolean) => {
    game.current.flashes += 1;
    setFlash({ key: game.current.flashes, zone, ok });
  };

  /** Bien: brilla la parte, corazones, la palabra y su traducción, y risitas. */
  const good = (z: NoiTarget, at: Point) => {
    const g = game.current;
    if (!g.tried) onAnswer(true, WORD_BY_TH.get(partOf(cmd))?.id);
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
    juice.float({ x: at.x, y: at.y - 8 }, named(z), color.mohom, 22);
    setJump((j) => j + 1);
    setPose('celebra');
    if (combo && combo % 3 === 0) later(() => say(GIGGLE), 350);
    if (combo === 5 || combo === 10) {
      juice.banner(`¡Racha ×${combo}!`, 'Noi está encantada', color.farol);
      fx.sparkle();
    }
    if (r.kind === 'double' && step === 0) {
      // primera mitad de la orden doble: a por la segunda
      setStep(1);
      setMissed(false);
      setHint(null);
      later(() => setPose('feliz'), 600);
      return;
    }
    g.token += 1;
    setPhase('wait');
    setResult({ ok: true, text: `${cmd.th} = ${cmd.es}` });
    later(() => api.current.next(), feria ? 900 : 1300);
  };

  /** Mal: la parte tocada se marca, se dice qué era y (en la lección) se puede volver a probar. */
  const bad = (z: NoiTarget, at: Point) => {
    const g = game.current;
    if (!g.tried && !missed) {
      onAnswer(false, WORD_BY_TH.get(partOf(cmd))?.id);
      score.hit(false);
    } else fx.bad();
    g.tried = true;
    flashZone(z, false);
    juice.shake(5);
    if (z === 'trunk') {
      juice.burst(at, 'gotas', 16, 120);
      juice.float({ x: at.x, y: at.y - 10 }, '¡ฮัดชิ่ว! ¡Achís!', color.cieloHondo, 24);
      fx.boom();
    } else juice.float({ x: at.x, y: at.y - 8 }, named(z), color.lacaHondo, 20);
    setPose('ups');
    later(() => setPose((p) => (p === 'ups' ? 'feliz' : p)), 900);
    setMissed(true);
    setHint(MIRROR[cmd.target] === z ? 'Ojo: su izquierda es tu derecha' : `Has tocado ${THE[z]}.`);
    if (feria) {
      // en la feria se pierde la orden: se ve cuál era y se sigue
      g.token += 1;
      setPhase('wait');
      flashZone(cmd.target, true);
      setResult({ ok: false, text: `${cmd.th} = ${cmd.es}` });
      later(() => api.current.next(), 1500);
    }
  };

  const tap = (z: NoiTarget, e: GestureResponderEvent) => {
    if (phase !== 'play') return;
    const at = tapPoint(e);
    if (r.kind === 'trick') {
      // ¡no lo dijo Noi!
      const g = game.current;
      g.token += 1;
      setPhase('wait');
      onAnswer(false);
      score.hit(false);
      juice.shake(8);
      juice.float({ x: at.x, y: at.y - 10 }, '¡Te pillé!', color.lacaHondo, 26);
      setPose('celebra');
      setResult({ ok: false, text: r.who ? `Lo dijo ${r.who.es.replace(' dice', '')}, no Noi: ¡no se tocaba!` : `No dijo «${NOI_SAYS.th}»: ¡no se tocaba!` });
      later(() => api.current.next(), 1700);
      return;
    }
    if (z === cmd.target) good(z, at);
    else bad(z, at);
  };

  /** Se acabó el tiempo: en una trampa es un acierto; si no, se ve cuál era. */
  const timeout = () => {
    const g = game.current;
    g.token += 1;
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
      onAnswer(false, WORD_BY_TH.get(partOf(cmd))?.id);
      score.hit(false);
    }
    flashZone(cmd.target, true);
    setPose('ups');
    juice.float(undefined, '¡Tiempo!', color.farol, 28);
    setResult({ ok: false, text: `${cmd.th} = ${cmd.es}` });
    later(() => api.current.next(), 1600);
  };

  useEffect(() => {
    api.current = { timeout, next, begin };
  });

  const showEs = !feria ? missed || phase === 'wait' : phase === 'wait';
  const who = r.who;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="dia" />
      <Animated.View style={[{ flex: 1 }, juice.shakeStyle]}>
        <GameHud label="NOI DICE" i={i + 1} n={rounds.length} points={feria ? points : undefined} combo={score.combo} />

        {/* lo que pide Noi */}
        <View style={styles.bubbleWrap}>
          <Pop trigger={`${r.key}-${step}`} scale={1.06} style={styles.bubble}>
            {who ? (
              <View style={styles.prefix}>
                <Th size={15} bold style={{ color: '#FFFFFF', lineHeight: 22 }}>
                  {who.th}
                </Th>
                <Text style={styles.prefixRom}>{who.rom}</Text>
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
            <Rom rom={r.cmds.map((c) => c.rom).join(` ${AND_THEN.rom} `)} style={{ textAlign: 'center' }} />
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
            <Pressable accessibilityRole="button" accessibilityLabel="Repetir la orden" onPress={() => sayRound(r)} style={styles.replay} hitSlop={8}>
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
          <View style={{ width: size, height: size }}>
            <Hill size={size} />
            <Noi pose={pose} size={size} jump={jump} />
            {flash ? <ZoneFlash key={flash.key} zone={flash.zone} ok={flash.ok} k={k} /> : null}
            {ORDER.map((z) => {
              const zr = NOI_ZONES[z];
              return (
                <Pressable
                  key={z}
                  accessibilityRole="button"
                  accessibilityLabel={`Noi: ${LABEL[z]}`}
                  onPress={(e) => tap(z, e)}
                  style={[
                    { position: 'absolute', left: zr.x * k, top: zr.y * k, width: Math.max(44, zr.w * k), height: Math.max(44, zr.h * k) },
                    DEBUG_ZONES ? { borderWidth: 1, borderColor: 'red' } : null,
                  ]}
                />
              );
            })}
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
function ZoneFlash({ zone, ok, k }: { zone: NoiTarget; ok: boolean; k: number }) {
  const reduced = useReducedMotion();
  const zr = NOI_ZONES[zone];
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
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: zr.x * k - 6,
          top: zr.y * k - 6,
          width: zr.w * k + 12,
          height: zr.h * k + 12,
          borderRadius: Math.min(zr.w, zr.h) * k,
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
  replay: { position: 'absolute', right: 10, top: 10, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: color.cieloSuave },
  footer: { minHeight: 64, paddingHorizontal: 20, paddingBottom: 18, alignItems: 'center', justifyContent: 'center' },
  result: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, borderWidth: 2 },
  resultText: { fontFamily: font.uiHeavy, fontSize: 15, textAlign: 'center' },
  hint: { fontFamily: font.uiHeavy, fontSize: 15, color: color.lacaHondo, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, overflow: 'hidden' },
  tip: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta2, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
});
