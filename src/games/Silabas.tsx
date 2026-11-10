// Bloques de sílabas: escucha una sílaba y constrúyela con bloques de juguete: consonante (su color dice su clase),
// vocal, marca de tono y, en lo más difícil, consonante final. Cada bloque vuela a su sitio y encaja con un clic: la
// vocal sabe ir delante, detrás, encima o debajo. Al acertar, la sílaba se ilumina, suena y se ve la regla del tono:
// clase + viva o muerta + marca = tono. En la feria, tres niveles contrarreloj.
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { color, font, tones, type ToneId } from '@/brand/tokens';
import type { NoiPose } from '@/brand/noi-art';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Bar, Btn, Rom, Th, ToneChip, Txt } from '@/components/ui';
import { COMMON_LETTERS, SYLLABLE_BANK, TONE_MARKS, composeSyllable, consonantOf, lookalikesOf, type SyllableBlock } from '@/content/letters';
import type { Vowel } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { Countdown, Glow, Pop, Press3D, Shine, useJuice, type Point } from './fx';
import { ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

/** Reloj (fuera del componente: el compilador de React no deja llamar a Date.now() en el cuerpo). */
const now = () => Date.now();

type Kind = 'c' | 'v' | 't' | 'f';
type Cls = 'media' | 'alta' | 'baja';
const DOT = '◌';
const KIND_LABEL: Record<Kind, string> = { c: 'Consonante', v: 'Vocal', t: 'Tono', f: 'Final' };

/** Dónde se escribe cada vocal respecto a la consonante. */
const VPOS: Record<string, Vowel['pos']> = { 'า': 'despues', 'อ': 'despues', 'ำ': 'despues', 'ี': 'arriba', 'ิ': 'arriba', 'ู': 'abajo', 'ุ': 'abajo', 'เ': 'antes', 'แ': 'antes', 'โ': 'antes', 'ไ': 'antes', 'ใ': 'antes' };
const VSOUND: Record<string, string> = { 'า': 'aa', 'อ': 'ɔɔ', 'ำ': 'am', 'ี': 'ii', 'ิ': 'i', 'ู': 'uu', 'ุ': 'u', 'เ': 'ee', 'แ': 'ɛɛ', 'โ': 'oo', 'ไ': 'ai', 'ใ': 'ai' };
const V_LIGHT = ['า', 'ี', 'ู', 'ใ', 'ไ', 'โ', 'แ', 'อ', 'ำ'];
const V_FINAL = ['า', 'ี', 'ู', 'ิ', 'ุ', 'อ', 'เ', 'แ', 'โ'];
const FINALS = ['น', 'ง', 'ม', 'ก', 'ด', 'ว', 'ย'];
const POS_ES: Record<Vowel['pos'], string> = { antes: 'delante de', despues: 'detrás de', arriba: 'encima de', abajo: 'debajo de', rodea: 'alrededor de' };
const CLS_ES: Record<Cls, string> = { media: 'media', alta: 'alta', baja: 'baja' };

// ——— La regla del tono ———

const LONG_V = new Set(['า', 'ี', 'ู', 'อ', 'เ', 'แ', 'โ']);
const LIVE_V = new Set(['ไ', 'ใ', 'ำ']);
const SONORANT = new Set(['น', 'ง', 'ม', 'ว', 'ย']);

function toneFor(c: string, v: string, t: string, f: string): { tone: ToneId; live: boolean; cls: Cls } {
  const cls = consonantOf(c)?.cls ?? 'media';
  const long = LONG_V.has(v) && !(v === 'เ' && !!t && !!f);
  const live = f ? SONORANT.has(f) : long || LIVE_V.has(v);
  let tone: ToneId;
  if (t === '่') tone = cls === 'baja' ? 'F' : 'L';
  else if (t === '้') tone = cls === 'baja' ? 'H' : 'F';
  else if (live) tone = cls === 'alta' ? 'R' : 'M';
  else tone = cls === 'baja' ? (long ? 'F' : 'H') : 'L';
  return { tone, live, cls };
}

// ——— Rondas ———

type Round = { id: number; s: SyllableBlock; need: Kind[]; opts: Record<Kind, string[]> };

function makeRound(s: SyllableBlock, nOpts: number): Round {
  const need: Kind[] = s.f ? ['c', 'v', 't', 'f'] : ['c', 'v', 't'];
  const target = consonantOf(s.c);
  const okC = (c: string) => c !== s.c && consonantOf(c)?.sound !== target?.sound;
  const bankC = [...new Set(SYLLABLE_BANK.map((x) => x.c))];
  const cons = [s.c, ...shuffle(lookalikesOf(s.c).filter((c) => COMMON_LETTERS.includes(c) && okC(c))).slice(0, 1)];
  for (const c of shuffle(bankC)) if (cons.length < nOpts && okC(c) && !cons.includes(c)) cons.push(c);
  const vPool = s.f ? V_FINAL : V_LIGHT;
  const vows = [s.v];
  for (const v of shuffle(vPool)) if (vows.length < nOpts && v !== s.v && VSOUND[v] !== VSOUND[s.v]) vows.push(v);
  const want = toneFor(s.c, s.v, s.t, s.f).tone;
  const marks = ['', '่', '้'].filter((t) => t === s.t || toneFor(s.c, s.v, t, s.f).tone !== want);
  const fins = s.f ? [s.f, ...shuffle(FINALS.filter((f) => f !== s.f)).slice(0, Math.max(2, nOpts - 1))] : [];
  return { id: now() + Math.random(), s, need, opts: { c: shuffle(cons), v: shuffle(vows), t: marks, f: shuffle(fins) } };
}

/** Sílabas para una lección: las de las palabras nuevas, luego las que ya conoce. */
function lessonPlan(focusTh: Set<string>, knownTh: Set<string>, n: number): SyllableBlock[] {
  const inFocus = SYLLABLE_BANK.filter((s) => focusTh.has(s.th));
  const maxLevel = inFocus.length ? Math.max(...inFocus.map((s) => s.level)) : 2;
  const known = SYLLABLE_BANK.filter((s) => !focusTh.has(s.th) && knownTh.has(s.th) && s.level <= maxLevel);
  const rest = SYLLABLE_BANK.filter((s) => !focusTh.has(s.th) && !knownTh.has(s.th) && s.level <= maxLevel);
  return [...shuffle(inFocus), ...shuffle(known), ...shuffle(rest)].slice(0, n).sort((a, b) => a.level - b.level);
}

const FERIA_LEVELS: { level: 1 | 2 | 3; n: number; secs: number; name: string }[] = [
  { level: 1, n: 3, secs: 16, name: 'Consonante + vocal' },
  { level: 2, n: 4, secs: 16, name: 'Con marca de tono' },
  { level: 3, n: 3, secs: 22, name: 'Con consonante final' },
];

function feriaPlan(knownTh: Set<string>): SyllableBlock[] {
  return FERIA_LEVELS.flatMap(({ level, n }) => {
    const pool = SYLLABLE_BANK.filter((s) => s.level === level);
    const known = shuffle(pool.filter((s) => knownTh.has(s.th)));
    const other = shuffle(pool.filter((s) => !knownTh.has(s.th)));
    return [...known, ...other].slice(0, n);
  });
}

const levelAt = (k: number) => (k < 3 ? 0 : k < 7 ? 1 : 2);

// ——— Bloques de juguete ———

const BLOCK: Record<Cls | 'v' | 't' | 'f', { hi: string; base: string; deep: string; text: string }> = {
  media: { hi: '#FFE08A', base: '#FFB627', deep: '#C97C00', text: '#5A3300' },
  alta: { hi: '#FFB3B6', base: '#F2545B', deep: '#B8323A', text: '#FFFFFF' },
  baja: { hi: '#B8D3FF', base: '#4C8DFF', deep: '#2B5FC9', text: '#FFFFFF' },
  v: { hi: '#B4F2D2', base: '#2FC487', deep: '#178A5C', text: '#FFFFFF' },
  t: { hi: '#E3D4FF', base: '#9B76FF', deep: '#6A45D1', text: '#FFFFFF' },
  f: { hi: '#B3F1F1', base: '#25B8BE', deep: '#137F86', text: '#FFFFFF' },
};

const paletteOf = (kind: Kind, val: string) => BLOCK[kind === 'c' ? (consonantOf(val)?.cls ?? 'media') : kind];

const glyphOf = (kind: Kind, val: string) => {
  if (kind === 'v') return VPOS[val] === 'antes' ? val + DOT : DOT + val;
  if (kind === 't') return val ? DOT + val : '';
  return val;
};

function Block({ kind, val, size, state = 'idle' }: { kind: Kind; val: string; size: number; state?: 'idle' | 'ok' | 'bad' | 'ghost' }) {
  const p = paletteOf(kind, val);
  const id = `blk${kind}${val.codePointAt(0) ?? 0}${state}`;
  const g = glyphOf(kind, val);
  const ghost = state === 'ghost';
  return (
    <View style={{ width: size, height: size, opacity: ghost ? 0.28 : 1 }}>
      <Svg width={size} height={size} viewBox="0 0 60 60" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}f`} x1="0" y1="0" x2="0.2" y2="1">
            <Stop offset="0" stopColor={p.hi} />
            <Stop offset="0.45" stopColor={p.base} />
            <Stop offset="1" stopColor={p.deep} />
          </LinearGradient>
        </Defs>
        <Ellipse cx={30} cy={57} rx={25} ry={3} fill="#000000" opacity={0.18} />
        <Path d="M3 13 L12 4 L57 4 L48 13 Z" fill={p.hi} />
        <Path d="M48 13 L57 4 L57 47 L48 56 Z" fill={p.deep} />
        <Rect x={3} y={13} width={45} height={43} rx={7} fill={`url(#${id}f)`} stroke={state === 'ok' ? '#FFFFFF' : state === 'bad' ? '#FFE0E0' : p.deep} strokeWidth={state === 'idle' || ghost ? 1.2 : 3} />
        <Rect x={8} y={17} width={18} height={4} rx={2} fill="#FFFFFF" opacity={0.55} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { right: size * 0.17, top: size * 0.22, alignItems: 'center', justifyContent: 'center' }]}>
        {kind === 't' && !val ? (
          <Text style={[styles.sin, { color: p.text, fontSize: size * 0.2 }]}>sin{'\n'}marca</Text>
        ) : (
          <Text style={[styles.blockText, { color: p.text, fontSize: size * (kind === 'c' || kind === 'f' ? 0.52 : kind === 't' ? 0.56 : 0.46), lineHeight: size * 0.76 }]}>{g}</Text>
        )}
      </View>
    </View>
  );
}

function Flyer({ kind, val, from, to, size }: { kind: Kind; val: string; from: Point; to: Point; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) });
  }, [p]);
  const st = useAnimatedStyle(() => {
    const t = p.value;
    return {
      transform: [
        { translateX: from.x + (to.x - from.x) * t - size / 2 },
        { translateY: from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 60 - size / 2 },
        { rotate: `${Math.sin(t * Math.PI) * -14}deg` },
        { scale: 1 + Math.sin(t * Math.PI) * 0.18 },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, st]}>
      <Block kind={kind} val={val} size={size} />
    </Animated.View>
  );
}

/** Bloque ya colocado: cae con un rebote y tiembla si está mal. */
function Placed({ kind, val, x, y, size, state, shake }: { kind: Kind; val: string; x: number; y: number; size: number; state: 'idle' | 'ok' | 'bad'; shake: number }) {
  const dx = useSharedValue(0);
  const s = useSharedValue(1);
  useEffect(() => {
    if (!shake) return;
    dx.value = withSequence(withTiming(-7, { duration: 50 }), withTiming(7, { duration: 60 }), withTiming(-5, { duration: 60 }), withTiming(4, { duration: 60 }), withTiming(0, { duration: 60 }));
  }, [shake, dx]);
  useEffect(() => {
    if (state === 'ok') s.value = withSequence(withTiming(1.12, { duration: 120 }), withSpring(1, { damping: 7, stiffness: 220 }));
  }, [state, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }, { scale: s.value }] }));
  return (
    <Animated.View entering={ZoomIn.springify().damping(10).stiffness(260)} exiting={FadeOut.duration(220)} style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2 }, st]}>
      <Block kind={kind} val={val} size={size} state={state} />
    </Animated.View>
  );
}

// ——— El juego ———

type Fly = { id: number; kind: Kind; val: string; from: Point; to: Point };
type Phase = 'count' | 'build' | 'ok' | 'reveal' | 'end';

export default function Silabas({ mode, rounds, words, focus, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();

  const [plan, setPlan] = useState<SyllableBlock[]>(() => {
    const known = new Set(words.map((w) => w.th));
    if (feria) return feriaPlan(known);
    return lessonPlan(new Set(focus.map((w) => w.th)), known, Math.max(1, rounds ?? 3));
  });
  const [i, setI] = useState(0);
  const [round, setRound] = useState<Round>(() => makeRound(plan[0], feria ? 3 : 3));
  const [placed, setPlaced] = useState<Partial<Record<Kind, string>>>({});
  const [locked, setLocked] = useState<Partial<Record<Kind, boolean>>>({});
  const [bad, setBad] = useState<Kind[]>([]);
  const [shake, setShake] = useState(0);
  const [phase, setPhase] = useState<Phase>(feria ? 'count' : 'build');
  const [fly, setFly] = useState<Fly | null>(null);
  const [points, setPoints] = useState(0);
  const [left, setLeft] = useState(1);
  const [pose, setPose] = useState<NoiPose>('escucha');
  const [jump, setJump] = useState(0);
  const [shine, setShine] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  const s = round.s;
  const lvl = feria ? FERIA_LEVELS[levelAt(i)] : null;
  const { width: winW, height: winH } = useWindowDimensions();
  // bloques de la obra (fijos) y de la bandeja (caben 4 por fila)
  const B = winH >= 760 ? 56 : winH >= 700 ? 50 : 44;
  const STEP = B + 8;
  const nOpts = Math.max(...round.need.map((k) => round.opts[k].length));
  const TB = Math.max(42, Math.min(B, Math.floor((Math.min(winW, 480) - 28 - 22 - 88) / nOpts) - 8));

  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const buildRef = useRef<ComponentRef<typeof View>>(null);
  const live = useRef({
    root: { x: 0, y: 0 },
    build: { x: 0, y: 0 },
    attempts: 0,
    answered: false,
    deadline: 0,
    total: 0,
    points: 0,
    requeued: 0,
    busy: false,
    ended: false,
    dead: false,
    timers: [] as ReturnType<typeof setTimeout>[],
  });

  const later = (fn: () => void, ms: number) => {
    const L = live.current;
    L.timers.push(
      setTimeout(() => {
        if (!L.dead) fn();
      }, ms),
    );
  };
  useEffect(() => {
    const L = live.current;
    L.dead = false;
    return () => {
      L.dead = true;
      L.timers.forEach(clearTimeout);
    };
  }, []);

  const measure = () => {
    rootRef.current?.measureInWindow((x, y) => {
      live.current.root = { x, y };
    });
    buildRef.current?.measureInWindow((x, y) => {
      live.current.build = { x, y };
    });
  };

  // ——— geometría de la obra (columnas −1…2, filas −1…1) ———
  const AREA_W = STEP * 4;
  const AREA_H = STEP * 3 + 6;
  const vposOf = (v?: string): Vowel['pos'] | undefined => (v ? VPOS[v] : undefined);
  const slot = (kind: Kind, pl: Partial<Record<Kind, string>>): Point => {
    const vp = vposOf(pl.v);
    let col = 0;
    let row = 0;
    if (kind === 'v') {
      const p = vposOf(pl.v) ?? 'despues';
      col = p === 'antes' ? -1 : p === 'despues' ? 1 : 0;
      row = p === 'arriba' ? -1 : p === 'abajo' ? 1 : 0;
    } else if (kind === 't') {
      col = vp === 'arriba' ? 0.62 : 0;
      row = vp === 'arriba' ? -1.25 : -1;
    } else if (kind === 'f') {
      col = vp === 'despues' ? 2 : 1;
    }
    return { x: STEP * (col + 1) + STEP / 2, y: STEP * (row + 1) + STEP / 2 + 6 };
  };

  // ——— sonido de la ronda ———
  const play = (slow = false) => {
    say(s.th, { slow });
    setPose('escucha');
    later(() => setPose((p) => (p === 'escucha' ? 'piensa' : p)), 1500);
  };

  const startRound = (r: Round, k: number) => {
    const L = live.current;
    L.attempts = 0;
    L.answered = false;
    L.busy = false;
    setRound(r);
    setPlaced({});
    setLocked({});
    setBad([]);
    setHint(null);
    setPhase('build');
    if (feria) {
      const secs = FERIA_LEVELS[levelAt(k)].secs;
      L.deadline = now() + secs * 1000;
      L.total = secs * 1000;
      setLeft(1);
    }
    later(() => {
      say(r.s.th);
      setPose('escucha');
      later(() => setPose((p) => (p === 'escucha' ? 'piensa' : p)), 1500);
    }, 420);
  };

  const intro = useEffectEvent(() => {
    measure();
    if (!feria) play();
  });
  useEffect(() => {
    const t = setTimeout(intro, 500);
    return () => clearTimeout(t);
  }, []);

  const go = () => {
    const L = live.current;
    const secs = FERIA_LEVELS[0].secs;
    L.deadline = now() + secs * 1000;
    L.total = secs * 1000;
    setPhase('build');
    measure();
    play();
  };

  const next = () => {
    const L = live.current;
    if (L.ended) return;
    const n = i + 1;
    if (n >= plan.length) {
      L.ended = true;
      setPhase('end');
      fx.fanfare();
      juice.banner(feria ? '¡Obra maestra!' : '¡Sílabas listas!', feria ? `${L.points} puntos` : undefined, color.cieloHondo);
      juice.burst(undefined, 'confeti', 30, 190);
      later(() => onDone(score.result(feria ? L.points : undefined)), 1600);
      return;
    }
    if (feria && levelAt(n) !== levelAt(i)) {
      fx.levelup();
      juice.banner(`¡Nivel ${levelAt(n) + 1}!`, FERIA_LEVELS[levelAt(n)].name, color.cielo);
    }
    setI(n);
    const r = makeRound(plan[n], feria ? (levelAt(n) === 0 ? 3 : 4) : 3);
    if (feria && levelAt(n) !== levelAt(i)) later(() => startRound(r, n), 1100);
    else startRound(r, n);
  };

  /** Lo que se falla vuelve más tarde: al final de la lección o, en la feria, dos sílabas después. */
  const requeue = () => {
    const L = live.current;
    if (!feria) {
      if (L.requeued < 1) {
        L.requeued += 1;
        setPlan((p) => [...p, s]);
      }
    } else if (i + 2 < plan.length) {
      setPlan((p) => p.map((x, n) => (n === i + 2 ? s : x)));
    }
  };

  /** Se acaba el tiempo o el segundo intento: se monta la sílaba buena y se explica. */
  const reveal = (timeout: boolean) => {
    const L = live.current;
    if (L.busy && !timeout) return;
    L.busy = true;
    if (!L.answered) {
      L.answered = true;
      score.hit(false, false);
      onAnswer(false);
      requeue();
    }
    if (timeout) {
      fx.bad();
      juice.float(undefined, '¡Tiempo!', color.laca, 34);
    }
    setPhase('reveal');
    setPlaced({ c: s.c, v: s.v, t: s.t, f: s.f || undefined });
    setLocked({});
    setBad([]);
    setPose('ups');
    later(() => say(s.th, { slow: true }), 300);
    if (feria) later(next, 2600);
  };

  const check = (pl: Partial<Record<Kind, string>>) => {
    const L = live.current;
    const want: Record<Kind, string> = { c: s.c, v: s.v, t: s.t, f: s.f };
    const wrong = round.need.filter((k) => pl[k] !== want[k]);
    const ok = wrong.length === 0;
    const first = !L.answered;
    let combo = score.combo;
    if (first) {
      L.answered = true;
      combo = score.hit(ok, false);
      onAnswer(ok);
    }
    const center = { x: L.build.x + AREA_W / 2, y: L.build.y + AREA_H / 2 };
    if (ok) {
      L.busy = true;
      setPhase('ok');
      if (first) fx.ok(combo);
      else fx.sparkle();
      later(() => say(s.th), 250);
      setShine((x) => x + 1);
      setPose('celebra');
      setJump((j) => j + 1);
      let gain = 0;
      if (feria) {
        const secsLeft = Math.max(0, (L.deadline - now()) / 1000);
        gain = first ? Math.round((100 + secsLeft * 8) * (1 + 0.2 * Math.min(10, Math.max(0, combo - 1)))) : 30;
        L.points += gain;
        setPoints(L.points);
      }
      juice.celebrate(center, feria ? `+${gain}` : '¡Bien!');
      if (first && combo > 0 && combo % 5 === 0) juice.banner(`¡Combo ×${combo}!`, undefined, color.farol);
      if (feria) later(next, 2200);
      return;
    }
    // mal: tiemblan los que no van y vuelven a la bandeja; los buenos se quedan fijos
    L.attempts += 1;
    fx.bad();
    juice.shake(6);
    setPose('ups');
    setBad(wrong);
    setShake((x) => x + 1);
    const good = round.need.filter((k) => !wrong.includes(k));
    setLocked((lk) => ({ ...lk, ...Object.fromEntries(good.map((k) => [k, true])) }));
    setHint(`Revisa: ${wrong.map((k) => KIND_LABEL[k].toLowerCase()).join(', ')}`);
    if (first) requeue();
    later(() => {
      setBad([]);
      setPlaced((p) => ({ ...p, ...Object.fromEntries(wrong.map((k) => [k, undefined])) }));
      setPose('piensa');
      if (!feria && L.attempts >= 2) reveal(false);
    }, 650);
  };

  // ——— colocar bloques ———
  const pick = (kind: Kind, val: string, e: GestureResponderEvent) => {
    const L = live.current;
    if (phase !== 'build' || L.busy || locked[kind]) return;
    if (placed[kind] === val) {
      // tocar el bloque usado lo devuelve
      fx.tap();
      setPlaced((p) => ({ ...p, [kind]: undefined }));
      return;
    }
    measure();
    const { pageX, pageY, locationX, locationY } = e.nativeEvent;
    const from = { x: pageX - locationX + TB / 2 - L.root.x, y: pageY - locationY + TB / 2 - L.root.y };
    const next = { ...placed, [kind]: val };
    const sp = slot(kind, next);
    const to = { x: L.build.x - L.root.x + sp.x, y: L.build.y - L.root.y + sp.y };
    fx.swish();
    setFly({ id: now(), kind, val, from, to });
    L.busy = true;
    later(() => {
      setFly(null);
      fx.pop();
      setPlaced(next);
      juice.burst({ x: L.build.x + sp.x, y: L.build.y + sp.y }, 'chispas', 6, 50);
      L.busy = false;
      if (round.need.every((k) => next[k] !== undefined)) later(() => check(next), 260);
    }, 300);
  };

  const unplace = (kind: Kind) => {
    if (phase !== 'build' || locked[kind] || live.current.busy) return;
    fx.tap();
    setPlaced((p) => ({ ...p, [kind]: undefined }));
  };

  // ——— contrarreloj (feria) ———
  const tick = useEffectEvent(() => {
    const L = live.current;
    if (L.ended || L.busy) return;
    const ms = L.deadline - now();
    setLeft(Math.max(0, ms / L.total));
    if (ms <= 0) reveal(true);
  });
  useEffect(() => {
    if (!feria || phase !== 'build') return;
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, [feria, phase]);

  // ——— lo que se ve ———
  const built = placed.c ? composeSyllable(placed.c, placed.v ?? '', placed.t ?? '', placed.f ?? '', vposOf(placed.v) ?? 'despues') : '';
  const rule = toneFor(s.c, s.v, s.t, s.f);
  const done = phase === 'ok' || phase === 'reveal';
  const markName = s.t ? TONE_MARKS.find((m) => m.ch === s.t) : undefined;

  const ghostSlots: Point[] = [slot('v', { v: 'เ' }), slot('v', { v: 'า' }), slot('v', { v: 'ี' }), slot('v', { v: 'ู' })];

  return (
    <View ref={rootRef} style={styles.root} onLayout={measure}>
      <Backdrop scene="dia" />
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <GameTitle title="Bloques de sílabas" sub={feria ? `Sílaba ${i + 1} de ${plan.length} · ${lvl?.name}` : 'Escucha y construye la sílaba.'} />
        </View>
        {!feria ? <ComboBadge combo={score.combo} /> : null}
      </View>

      {/* escuchar */}
      <View style={styles.listen}>
        <Noi pose={pose} size={winH >= 700 ? 72 : 60} jump={jump} />
        <Press3D onPress={() => play(false)} style={styles.bigSpeak} accessibilityLabel="Escuchar la sílaba">
          <View style={styles.bigSpeakFace}>
            <Icon name="speaker" size={30} color="#FFFFFF" />
          </View>
        </Press3D>
        <Press3D onPress={() => play(true)} style={styles.slowSpeak} accessibilityLabel="Escuchar más lento">
          <View style={styles.slowFace}>
            <Icon name="turtle" size={24} color={color.cieloHondo} />
          </View>
        </Press3D>
        <View style={{ flex: 1, alignItems: 'center', minHeight: 64, justifyContent: 'center' }}>
          {built ? (
            <Animated.View key={built} entering={FadeIn.duration(160)} style={{ alignItems: 'center' }}>
              <View style={{ overflow: 'hidden', borderRadius: 14, paddingHorizontal: 8 }}>
                <Th size={done ? 46 : 40} bold style={{ color: phase === 'ok' ? color.arrozalHondo : color.tinta }}>
                  {built}
                </Th>
                {phase === 'ok' ? <Shine trigger={shine} /> : null}
              </View>
            </Animated.View>
          ) : (
            <Txt v="small" style={{ textAlign: 'center' }}>
              Toca los bloques{'\n'}para construirla
            </Txt>
          )}
        </View>
      </View>
      {feria ? (
        <View style={styles.timer}>
          <Icon name="bulb" size={16} color={left < 0.3 ? color.laca : color.azafranHondo} />
          <Bar value={phase === 'build' ? left : phase === 'count' ? 1 : 0} tint={left < 0.3 ? color.laca : color.azafran} height={10} track="rgba(255,255,255,0.7)" />
          <Pop trigger={points}>
            <View style={styles.points}>
              <Icon name="star" size={16} color={color.buatongHondo} />
              <Txt v="num" style={{ fontSize: 18 }}>
                {points}
              </Txt>
            </View>
          </Pop>
          <ComboBadge combo={score.combo} />
        </View>
      ) : null}

      {/* la obra */}
      <View style={styles.middle}>
        <View ref={buildRef} onLayout={measure} style={{ width: AREA_W, height: AREA_H }}>
          <Plinth w={AREA_W} y={STEP * 2 + 6 + B / 2 + 4} />
          {phase === 'ok' ? <Glow size={AREA_W} tint="#FFE27A" strength={0.5} style={{ position: 'absolute', left: 0, top: (AREA_H - AREA_W) / 2 }} /> : null}
          {/* huecos: la consonante en el centro y los cuatro sitios de la vocal */}
          <View style={[styles.socket, { left: STEP + STEP / 2 - B / 2, top: STEP + 6 + STEP / 2 - B / 2, width: B, height: B }]}>
            <Txt v="small" style={{ fontSize: 10, color: color.tinta3 }}>
              C
            </Txt>
          </View>
          {!placed.v
            ? ghostSlots.map((g, k) => <View key={k} style={[styles.ghostDot, { left: g.x - 9, top: g.y - 9 }]} />)
            : null}
          {round.need.map((kind) => {
            const val = placed[kind];
            if (val === undefined) return null;
            const p = slot(kind, placed);
            const st = bad.includes(kind) ? 'bad' : locked[kind] || phase === 'ok' ? 'ok' : 'idle';
            return (
              <View key={`${round.id}-${kind}`} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <Placed kind={kind} val={val} x={p.x} y={p.y} size={B} state={st} shake={bad.includes(kind) ? shake : 0} />
                {phase === 'build' && !locked[kind] ? (
                  <View
                    style={{ position: 'absolute', left: p.x - B / 2, top: p.y - B / 2, width: B, height: B }}
                    onStartShouldSetResponder={() => true}
                    onResponderRelease={() => unplace(kind)}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${KIND_LABEL[kind].toLowerCase()}`}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      {/* bandeja de bloques o explicación */}
      <View style={styles.bottom}>
        {done ? (
          <Animated.View entering={FadeInDown.springify().damping(15)} style={[styles.card, phase === 'ok' ? styles.cardOk : styles.cardBad]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Th size={34} bold style={{ color: color.tinta }}>
                {s.th}
              </Th>
              <View style={{ flex: 1 }}>
                <Rom rom={s.rom} size={17} />
                <Txt v="bodyStrong" style={{ color: phase === 'ok' ? color.arrozalHondo : color.lacaHondo }}>
                  {s.es}
                </Txt>
              </View>
              <Press3D onPress={() => play(false)} style={styles.cardSpeak} accessibilityLabel="Escuchar">
                <View style={styles.cardSpeakFace}>
                  <Icon name="speaker" size={20} color="#FFFFFF" />
                </View>
              </Press3D>
            </View>
            {/* la regla del tono: clase + viva/muerta + marca = tono */}
            <View style={styles.rule}>
              <View style={[styles.ruleChip, { backgroundColor: BLOCK[rule.cls].base }]}>
                <Text style={[styles.ruleText, { color: BLOCK[rule.cls].text }]}>
                  {s.c} {CLS_ES[rule.cls]}
                </Text>
              </View>
              <Text style={styles.plus}>+</Text>
              <View style={[styles.ruleChip, { backgroundColor: rule.live ? color.arrozalSuave : color.niebla2 }]}>
                <Text style={[styles.ruleText, { color: rule.live ? color.arrozalHondo : color.tinta2 }]}>{rule.live ? 'viva' : 'muerta'}</Text>
              </View>
              <Text style={styles.plus}>+</Text>
              <View style={[styles.ruleChip, { backgroundColor: BLOCK.t.hi }]}>
                <Text style={[styles.ruleText, { color: BLOCK.t.deep }]}>
                  {markName ? <Text style={styles.inlineThai}>{DOT + s.t} </Text> : null}
                  {markName ? markName.rom : 'sin marca'}
                </Text>
              </View>
              <Text style={styles.plus}>=</Text>
              <ToneChip tone={rule.tone} small />
            </View>
            <Txt v="small">
              La vocal <Text style={styles.inlineThai}>{glyphOf('v', s.v)}</Text> se escribe {POS_ES[VPOS[s.v] ?? 'despues']} la consonante · tono {tones[rule.tone].name.toLowerCase()}: «{s.rom}».
            </Txt>
            {!feria ? <Btn label="Continuar" v={phase === 'ok' ? 'ok' : 'primary'} onPress={next} /> : null}
          </Animated.View>
        ) : (
          <View style={styles.tray}>
            {round.need.map((kind) => (
              <View key={`${round.id}-${kind}`} style={styles.trayRow}>
                <View style={styles.trayLabel}>
                  <Txt v="eyebrow" style={{ fontSize: 10, letterSpacing: 0.4 }}>
                    {KIND_LABEL[kind]}
                  </Txt>
                  {kind === 'c' ? (
                    <View style={{ flexDirection: 'row', gap: 3, marginTop: 3 }}>
                      {(['media', 'alta', 'baja'] as Cls[]).map((c) => (
                        <View key={c} style={[styles.legend, { backgroundColor: BLOCK[c].base }]} />
                      ))}
                    </View>
                  ) : null}
                </View>
                {round.opts[kind].map((val, n) => {
                  const used = placed[kind] === val;
                  const fixed = !!locked[kind];
                  return (
                    <Animated.View key={`${kind}-${val}`} entering={ZoomIn.delay(n * 60 + (kind === 'c' ? 0 : kind === 'v' ? 80 : 160)).springify().damping(12)}>
                      <Press3D
                        onPress={(e) => pick(kind, val, e)}
                        disabled={fixed || phase !== 'build'}
                        style={{ width: TB, height: TB }}
                        accessibilityLabel={`${KIND_LABEL[kind]} ${kind === 't' && !val ? 'sin marca' : val}`}>
                        <Block kind={kind} val={val} size={TB} state={used || (fixed && placed[kind] !== val) ? 'ghost' : 'idle'} />
                      </Press3D>
                    </Animated.View>
                  );
                })}
              </View>
            ))}
            {hint ? (
              <Animated.View entering={FadeIn} style={styles.hint}>
                <Txt v="small" style={{ color: color.lacaHondo }}>
                  {hint}
                </Txt>
              </Animated.View>
            ) : null}
          </View>
        )}
      </View>

      {fly ? <Flyer key={fly.id} kind={fly.kind} val={fly.val} from={fly.from} to={fly.to} size={B} /> : null}
      {phase === 'count' ? <Countdown onDone={go} /> : null}
      {juice.layer}
    </View>
  );
}

/** Peana de madera de la obra. */
function Plinth({ w, y }: { w: number; y: number }) {
  return (
    <Svg width={w + 24} height={40} style={{ position: 'absolute', left: -12, top: y }}>
      <Defs>
        <LinearGradient id="plinthTop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E9B77A" />
          <Stop offset="1" stopColor="#C98A4B" />
        </LinearGradient>
        <LinearGradient id="plinthSide" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A86A34" />
          <Stop offset="1" stopColor="#7A4A22" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={(w + 24) / 2} cy={34} rx={(w + 24) / 2 - 4} ry={6} fill="#000000" opacity={0.15} />
      <Path d={`M10 8 L${w + 14} 8 L${w + 22} 16 L2 16 Z`} fill="url(#plinthTop)" />
      <Rect x={2} y={16} width={w + 20} height={14} rx={3} fill="url(#plinthSide)" />
      <Path d={`M14 21 H${w * 0.4} M${w * 0.55} 25 H${w}`} stroke="#5E3519" strokeOpacity={0.35} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'visible' },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 6 },
  points: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 2, borderColor: color.buatong },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, marginTop: 10 },
  bigSpeak: { width: 66, height: 66 },
  bigSpeakFace: { flex: 1, borderRadius: 22, backgroundColor: color.cielo, borderBottomWidth: 5, borderBottomColor: color.cieloHondo, alignItems: 'center', justifyContent: 'center' },
  slowSpeak: { width: 50, height: 50 },
  slowFace: { flex: 1, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, marginTop: 4 },
  socket: { position: 'absolute', borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(29,35,71,0.35)', backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  ghostDot: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(47,196,135,0.7)', backgroundColor: 'rgba(255,255,255,0.4)' },
  bottom: { paddingHorizontal: 14, paddingBottom: 16 },
  tray: { gap: 6, padding: 10, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.95)' },
  trayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trayLabel: { width: 88 },
  legend: { width: 10, height: 10, borderRadius: 3 },
  hint: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: color.lacaSuave },
  blockText: { fontFamily: font.thaiBold, textAlign: 'center', includeFontPadding: false },
  sin: { fontFamily: font.uiHeavy, textAlign: 'center', lineHeight: 13 },
  inlineThai: { fontFamily: font.thaiBold, color: color.tinta },
  card: { gap: 10, padding: 14, borderRadius: 22, borderWidth: 2 },
  cardOk: { backgroundColor: '#F2FFF7', borderColor: color.arrozalVivo },
  cardBad: { backgroundColor: '#FFF6F2', borderColor: color.farol },
  cardSpeak: { width: 48, height: 48 },
  cardSpeakFace: { flex: 1, borderRadius: 16, backgroundColor: color.cielo, borderBottomWidth: 4, borderBottomColor: color.cieloHondo, alignItems: 'center', justifyContent: 'center' },
  rule: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  ruleChip: { height: 28, paddingHorizontal: 9, borderRadius: 14, justifyContent: 'center' },
  ruleText: { fontFamily: font.uiHeavy, fontSize: 13 },
  plus: { fontFamily: font.displayBold, fontSize: 18, color: color.tinta2 },
});
