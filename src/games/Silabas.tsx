// Bloques de sílabas: el juego que enseña a leer. Dos maneras de jugar con sílabas que son palabras de verdad:
// · Construir: se oye la sílaba y se monta con bloques de juguete: consonante (su color dice su clase), vocal (sabe
//   ir delante, detrás, encima, debajo o alrededor), marca de tono cuando ya se han estudiado y consonante final.
// · Descifrar: la sílaba llega escrita en una cometa, sin audio: hay que decir su tono en el ranat de cinco teclas
//   (y, en lo difícil, cómo suena). Luego suena, la cometa dibuja el tono en el aire y la regla se arma en tres
//   pasos: clase + viva o muerta + marca = tono. Si se falla, se ve qué paso era.
// En la feria, niveles contrarreloj; con las reglas ya estudiadas, el último es de lectura relámpago.
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { color, font, tones, type ToneId } from '@/brand/tokens';
import type { NoiPose } from '@/brand/noi-art';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Bar, Btn, Rom, Th, ToneChip, Txt } from '@/components/ui';
import { composeSyllable, consonantOf, vowelOf, vowelParts, type Syllable, type VowelSet } from '@/content/letters';
import type { LetterSet } from '@/content/types';
import { fx, say } from '@/lib/audio';

import { Backdrop } from './Backdrop';
import { Countdown, Glow, Pop, Press3D, Shine, tapPoint, useJuice, type Juice, type Point } from './fx';
import { ComboBadge, GameTitle, useScore } from './kit';
import { Kite } from './letras/Cometa';
import { DOT, buildOptions, makePlan, ruleSteps, soundOptions, whereVowel, whyWrong, type Kind, type Plan, type PlanItem, type StepKey } from './letras/silabas';
import { CLASS_TINT, RuleSteps, ToneKeys, playTone } from './letras/tono';
import type { GameProps } from './types';

/** Reloj (fuera del componente: el compilador de React no deja llamar a Date.now() en el cuerpo). */
const now = () => Date.now();

type Score = ReturnType<typeof useScore>;
const KIND_LABEL: Record<Kind, string> = { c: 'Consonante', v: 'Vocal', t: 'Tono', f: 'Final' };

/** Lo que el juego presta a cada ronda. */
type RoundCtx = {
  feria: boolean;
  /** segundos de la ronda (feria) */
  secs: number;
  score: Score;
  juice: Juice;
  points: number;
  winW: number;
  winH: number;
  /** dibujo de la palabra, si quien juega ya la conoce */
  emoji?: string;
  /** primera respuesta de la ronda: cuenta para el marcador; devuelve la racha */
  answer: (ok: boolean) => number;
  gain: (g: number) => void;
  requeue: () => void;
  next: () => void;
};

/** Temporizadores de una ronda, que se limpian solos al desmontarla. */
function useLater() {
  const ref = useRef({ dead: false, timers: [] as ReturnType<typeof setTimeout>[] });
  useEffect(() => {
    const L = ref.current;
    L.dead = false;
    return () => {
      L.dead = true;
      L.timers.forEach(clearTimeout);
    };
  }, []);
  return (fn: () => void, ms: number) => {
    const L = ref.current;
    L.timers.push(
      setTimeout(() => {
        if (!L.dead) fn();
      }, ms),
    );
  };
}

// ——— Bloques de juguete ———

type Tint = { hi: string; base: string; deep: string; text: string };
const BLOCK: Record<'v' | 't' | 'f', Tint> = {
  v: { hi: '#B4F2D2', base: '#2FC487', deep: '#178A5C', text: '#FFFFFF' },
  t: { hi: '#E3D4FF', base: '#9B76FF', deep: '#6A45D1', text: '#FFFFFF' },
  f: { hi: '#B3F1F1', base: '#25B8BE', deep: '#137F86', text: '#FFFFFF' },
};

type Face = { tint: Tint; text: string; scale: number; label?: boolean };

/** Lo que lleva pintado un bloque de la bandeja. */
function faceOf(kind: Kind, val: string): Face {
  if (kind === 'c') return { tint: CLASS_TINT[consonantOf(val)?.cls ?? 'media'], text: val, scale: 0.52 };
  if (kind === 'f') return { tint: BLOCK.f, text: val, scale: 0.52 };
  if (kind === 't') return val ? { tint: BLOCK.t, text: DOT + val, scale: 0.56 } : { tint: BLOCK.t, text: 'sin\nmarca', scale: 0.2, label: true };
  const ch = vowelOf(val)?.ch ?? DOT;
  if (ch === DOT) return { tint: BLOCK.v, text: 'sin\nvocal', scale: 0.2, label: true };
  const cols = [...ch].filter((x) => !'ัิีึืุู็'.includes(x)).length;
  return { tint: BLOCK.v, text: ch, scale: cols >= 4 ? 0.3 : cols === 3 ? 0.36 : 0.46 };
}

function Block({ face, size, state = 'idle' }: { face: Face; size: number; state?: 'idle' | 'ok' | 'bad' | 'ghost' }) {
  const p = face.tint;
  const id = `blk${p.base.slice(1)}${state}`;
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
        {face.label ? (
          <Text style={[styles.sin, { color: p.text, fontSize: size * face.scale, lineHeight: size * face.scale * 1.15 }]}>{face.text}</Text>
        ) : (
          <Text style={[styles.blockText, { color: p.text, fontSize: size * face.scale, lineHeight: size * 0.76 }]}>{face.text}</Text>
        )}
      </View>
    </View>
  );
}

function Flyer({ face, from, to, size }: { face: Face; from: Point; to: Point; size: number }) {
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
      <Block face={face} size={size} />
    </Animated.View>
  );
}

/** Bloque ya colocado: cae con un rebote y tiembla si está mal. */
function Placed({ face, x, y, size, state, shake }: { face: Face; x: number; y: number; size: number; state: 'idle' | 'ok' | 'bad' | 'ghost'; shake: number }) {
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
      <Block face={face} size={size} state={state} />
    </Animated.View>
  );
}

/** Las piezas de una vocal ya colocada: cada una en su sitio alrededor de la consonante. */
type Piece = { key: string; face: Face; col: number; row: number; ghost?: boolean };
function vowelPieces(v: string | undefined): { pieces: Piece[]; after: boolean; above: boolean } {
  const form = v === undefined ? undefined : vowelOf(v);
  if (!form) return { pieces: [], after: false, above: false };
  const p = vowelParts(form.ch);
  const below = !!p.on && 'ุู'.includes(p.on);
  const piece = (key: string, text: string, col: number, row: number, ghost = false): Piece => ({ key, face: { tint: BLOCK.v, text, scale: [...text].length > 2 ? 0.34 : 0.48 }, col, row, ghost });
  const pieces: Piece[] = [];
  if (p.pre) pieces.push(piece('pre', p.pre, -1, 0));
  if (p.on) pieces.push(piece('on', DOT + p.on, 0, below ? 1 : -1));
  if (p.post) pieces.push(piece('post', p.post === 'ำ' ? DOT + p.post : p.post, 1, 0));
  // la «o» que no se escribe (คน, นก): un bloque de cristal entre las dos consonantes
  if (!pieces.length) pieces.push(piece('post', '(o)', 1, 0, true));
  return { pieces, after: pieces.some((x) => x.key === 'post'), above: !!p.on && !below };
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

/** Reloj de la ronda, puntos y racha (feria). */
function TimerRow({ left, running, points, combo }: { left: number; running: boolean; points: number; combo: number }) {
  return (
    <View style={styles.timer}>
      <Icon name="bulb" size={16} color={left < 0.3 ? color.laca : color.azafranHondo} />
      <Bar value={running ? left : 0} tint={left < 0.3 ? color.laca : color.azafran} height={10} track="rgba(255,255,255,0.7)" />
      <Pop trigger={points}>
        <View style={styles.points}>
          <Icon name="star" size={16} color={color.buatongHondo} />
          <Txt v="num" style={{ fontSize: 18 }}>
            {points}
          </Txt>
        </View>
      </Pop>
      <ComboBadge combo={combo} />
    </View>
  );
}

/** La palabra, su lectura y su audio: cabecera de la tarjeta de respuesta. */
function WordRow({ s, ok, emoji, onSpeak }: { s: Syllable; ok: boolean; emoji?: string; onSpeak: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Th size={34} bold style={{ color: color.tinta }}>
        {s.th}
      </Th>
      <View style={{ flex: 1 }}>
        <Rom rom={s.rom} size={17} />
        <Txt v="bodyStrong" style={{ color: ok ? color.arrozalHondo : color.lacaHondo }} numberOfLines={2}>
          {emoji ? `${emoji} ` : ''}
          {s.es}
        </Txt>
      </View>
      <Press3D onPress={onSpeak} style={styles.cardSpeak} accessibilityLabel="Escuchar">
        <View style={styles.cardSpeakFace}>
          <Icon name="speaker" size={20} color="#FFFFFF" />
        </View>
      </Press3D>
    </View>
  );
}

// ——— Construir: se oye la sílaba y se monta con bloques ———

type Fly = { id: number; face: Face; from: Point; to: Point };

function BuildRound({ item, sets, ctx }: { item: PlanItem; sets: VowelSet[]; ctx: RoundCtx }) {
  const { feria, score, juice, winW, winH } = ctx;
  const s = item.s;
  const later = useLater();
  const [round] = useState(() => buildOptions(s, item.marks, feria && item.lv > 0 ? 4 : 3, sets));
  const [steps] = useState(() => ruleSteps(s));
  const [placed, setPlaced] = useState<Partial<Record<Kind, string>>>({});
  const [locked, setLocked] = useState<Partial<Record<Kind, boolean>>>({});
  const [bad, setBad] = useState<Kind[]>([]);
  const [shake, setShake] = useState(0);
  const [phase, setPhase] = useState<'build' | 'ok' | 'reveal'>('build');
  const [fly, setFly] = useState<Fly | null>(null);
  const [left, setLeft] = useState(1);
  const [pose, setPose] = useState<NoiPose>('escucha');
  const [jump, setJump] = useState(0);
  const [shine, setShine] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  // bloques de la obra (fijos) y de la bandeja (caben todos en una fila)
  const B = winH >= 760 ? 56 : winH >= 700 ? 50 : 44;
  const STEP = B + 8;
  const nOpts = Math.max(...round.need.map((k) => round.opts[k].length));
  const TB = Math.max(38, Math.min(B, Math.floor((Math.min(winW, 480) - 28 - 22 - 80) / nOpts) - 8));

  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const buildRef = useRef<ComponentRef<typeof View>>(null);
  const live = useRef({ root: { x: 0, y: 0 }, build: { x: 0, y: 0 }, attempts: 0, answered: false, deadline: 0, busy: false, over: false });

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
  const at = (col: number, row: number): Point => ({ x: STEP * (col + 1) + STEP / 2, y: STEP * (row + 1) + STEP / 2 + 6 });
  const slot = (kind: Kind, pl: Partial<Record<Kind, string>>): Point => {
    const v = vowelPieces(pl.v);
    if (kind === 't') return v.above ? at(0.62, -1.25) : at(0, -1);
    if (kind === 'f') return at(v.after ? 2 : 1, 0);
    return at(0, 0);
  };

  const play = (slow = false) => {
    say(s.th, { slow });
    setPose('escucha');
    later(() => setPose((p) => (p === 'escucha' ? 'piensa' : p)), 1500);
  };

  const start = useEffectEvent(() => {
    measure();
    live.current.deadline = now() + ctx.secs * 1000;
    play();
  });
  useEffect(() => {
    const t = setTimeout(start, 420);
    return () => clearTimeout(t);
  }, []);

  /** Se acaba el tiempo o el segundo intento: se monta la sílaba buena y se explica. */
  const reveal = (timeout: boolean) => {
    const L = live.current;
    if (L.over || (L.busy && !timeout)) return;
    L.busy = true;
    L.over = true;
    if (!L.answered) {
      L.answered = true;
      ctx.answer(false);
      ctx.requeue();
    }
    if (timeout) {
      fx.bad();
      juice.float(undefined, '¡Tiempo!', color.laca, 34);
    }
    setPhase('reveal');
    setPlaced({ c: s.c, v: s.v, t: item.marks ? s.t : undefined, f: s.f || undefined });
    setLocked({});
    setBad([]);
    setPose('ups');
    later(() => say(s.th, { slow: true }), 300);
    if (feria) later(ctx.next, 2800);
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
      combo = ctx.answer(ok);
    }
    const center = { x: L.build.x + AREA_W / 2, y: L.build.y + AREA_H / 2 };
    if (ok) {
      L.busy = true;
      L.over = true;
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
        ctx.gain(gain);
      }
      juice.celebrate(center, feria ? `+${gain}` : '¡Bien!');
      if (first && combo > 0 && combo % 5 === 0) juice.banner(`¡Combo ×${combo}!`, undefined, color.farol);
      if (feria) later(ctx.next, 2200);
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
    if (first) ctx.requeue();
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
    // de dónde sale volando: el centro del bloque tocado (en la web el toque no dice en qué punto del bloque ha sido)
    const { pageX, pageY, locationX, locationY } = e.nativeEvent;
    const inside = Number.isFinite(locationX) && Number.isFinite(locationY);
    const from = { x: pageX - (inside ? locationX - TB / 2 : 0) - L.root.x, y: pageY - (inside ? locationY - TB / 2 : 0) - L.root.y };
    const next = { ...placed, [kind]: val };
    const sp = slot(kind, next);
    const to = { x: L.build.x - L.root.x + sp.x, y: L.build.y - L.root.y + sp.y };
    fx.swish();
    setFly({ id: now(), face: faceOf(kind, val), from, to });
    L.busy = true;
    later(() => {
      setFly(null);
      fx.pop();
      setPlaced(next);
      juice.burst({ x: L.build.x + sp.x, y: L.build.y + sp.y }, 'chispas', 6, 50);
      if (!round.need.every((k) => next[k] !== undefined)) {
        L.busy = false;
        return;
      }
      // sílaba completa: hasta comprobarla no se cuela ni el reloj («¡Tiempo!» con la respuesta ya puesta) ni otro toque
      later(() => {
        L.busy = false;
        check(next);
      }, 260);
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
    if (L.over || L.busy || !L.deadline) return;
    const ms = L.deadline - now();
    setLeft(Math.max(0, ms / (ctx.secs * 1000)));
    if (ms <= 0) reveal(true);
  });
  useEffect(() => {
    if (!feria || phase !== 'build') return;
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, [feria, phase]);

  // ——— lo que se ve ———
  const built = placed.c ? composeSyllable(placed.c, placed.v ?? '', placed.t ?? '', placed.f ?? '') : '';
  const done = phase === 'ok' || phase === 'reveal';
  const stateOf = (kind: Kind) => (bad.includes(kind) ? 'bad' : locked[kind] || phase === 'ok' ? 'ok' : 'idle');
  const ghostSlots: Point[] = [at(-1, 0), at(1, 0), at(0, -1), at(0, 1)];
  const vowel = vowelPieces(placed.v);

  return (
    <View ref={rootRef} style={{ flex: 1 }} onLayout={measure}>
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
      {feria ? <TimerRow left={left} running={phase === 'build'} points={ctx.points} combo={score.combo} /> : null}

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
          {placed.v === undefined ? ghostSlots.map((g, k) => <View key={k} style={[styles.ghostDot, { left: g.x - 9, top: g.y - 9 }]} />) : null}
          {round.need.map((kind) => {
            const val = placed[kind];
            if (val === undefined) return null;
            const st = stateOf(kind);
            const free = phase === 'build' && !locked[kind];
            const cells = kind === 'v' ? vowel.pieces.map((pc) => ({ key: pc.key, face: pc.face, p: at(pc.col, pc.row), ghost: pc.ghost })) : [{ key: kind, face: faceOf(kind, val), p: slot(kind, placed), ghost: false }];
            return (
              <View key={`${kind}-${val}`} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {cells.map((cell) => (
                  <View key={cell.key} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    <Placed face={cell.face} x={cell.p.x} y={cell.p.y} size={B} state={cell.ghost && st === 'idle' ? 'ghost' : st} shake={bad.includes(kind) ? shake : 0} />
                    {free ? (
                      <View
                        style={{ position: 'absolute', left: cell.p.x - B / 2, top: cell.p.y - B / 2, width: B, height: B }}
                        onStartShouldSetResponder={() => true}
                        onResponderRelease={() => unplace(kind)}
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar ${KIND_LABEL[kind].toLowerCase()}`}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </View>

      {/* bandeja de bloques o explicación */}
      <View style={styles.bottom}>
        {done ? (
          <Animated.View entering={FadeInDown.springify().damping(15)} style={[styles.card, phase === 'ok' ? styles.cardOk : styles.cardBad]}>
            <WordRow s={s} ok={phase === 'ok'} emoji={ctx.emoji} onSpeak={() => play(false)} />
            {item.marks ? <RuleSteps steps={steps} cls={s.cls} live={s.live} tone={s.tone} stagger /> : null}
            <Txt v="small">
              La vocal <Text style={styles.inlineThai}>{s.form.ch === DOT ? '«o»' : s.form.ch}</Text> {whereVowel(s.form)}
              {item.marks ? ` · ${steps[2].detail}` : `: «${s.rom}».`}
            </Txt>
            {!feria ? <Btn label="Continuar" v={phase === 'ok' ? 'ok' : 'primary'} onPress={ctx.next} /> : null}
          </Animated.View>
        ) : (
          <View style={styles.tray}>
            {round.need.map((kind) => (
              <View key={kind} style={styles.trayRow}>
                <View style={styles.trayLabel}>
                  <Txt v="eyebrow" style={{ fontSize: 10, letterSpacing: 0.4 }}>
                    {KIND_LABEL[kind]}
                  </Txt>
                  {kind === 'c' ? (
                    <View style={{ flexDirection: 'row', gap: 3, marginTop: 3 }}>
                      {(['media', 'alta', 'baja'] as const).map((c) => (
                        <View key={c} style={[styles.legend, { backgroundColor: CLASS_TINT[c].base }]} />
                      ))}
                    </View>
                  ) : null}
                </View>
                {round.opts[kind].map((val, n) => {
                  const used = placed[kind] === val;
                  const fixed = !!locked[kind];
                  const face = faceOf(kind, val);
                  return (
                    <Animated.View key={`${kind}-${val}`} entering={ZoomIn.delay(n * 60 + (kind === 'c' ? 0 : kind === 'v' ? 80 : 160)).springify().damping(12)}>
                      <Press3D onPress={(e) => pick(kind, val, e)} disabled={fixed || phase !== 'build'} style={{ width: TB, height: TB }} accessibilityLabel={`${KIND_LABEL[kind]} ${face.label ? face.text.replace('\n', ' ') : face.text}`}>
                        <Block face={face} size={TB} state={used || (fixed && placed[kind] !== val) ? 'ghost' : 'idle'} />
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

      {fly ? <Flyer key={fly.id} face={fly.face} from={fly.from} to={fly.to} size={B} /> : null}
    </View>
  );
}

// ——— Descifrar: se lee la sílaba y se dice su tono ———

function DecodeRound({ item, ctx, ribbons, onRibbon }: { item: PlanItem; ctx: RoundCtx; ribbons: ToneId[]; onRibbon: (t: ToneId) => void }) {
  const { feria, score, juice, winW, winH } = ctx;
  const s = item.s;
  const later = useLater();
  const [steps] = useState(() => ruleSteps(s));
  const [sounds] = useState(() => (item.sound ? soundOptions(s) : []));
  const [stage, setStage] = useState<'tone' | 'sound' | 'done'>('tone');
  const [picked, setPicked] = useState<ToneId | null>(null);
  const [sound, setSound] = useState<number | null>(null);
  const [ok, setOk] = useState(false);
  const [why, setWhy] = useState<{ step: StepKey | null; text: string } | null>(null);
  const [hints, setHints] = useState(0);
  const [count, setCount] = useState(0);
  const [card, setCard] = useState(false);
  const [left, setLeft] = useState(1);
  const [pose, setPose] = useState<NoiPose>('piensa');
  const [jump, setJump] = useState(0);
  const [fly, setFly] = useState(0);
  const [nod, setNod] = useState(0);
  const live = useRef({ deadline: 0, over: false, hints: 0, tone: false });

  const start = useEffectEvent(() => {
    live.current.deadline = now() + ctx.secs * 1000;
  });
  useEffect(() => {
    const t = setTimeout(start, 300);
    return () => clearTimeout(t);
  }, []);

  const speak = (slow = false) => say(s.th, { slow });

  /** La ronda termina: suena la sílaba, la cometa responde y la regla se arma paso a paso. */
  const finish = (toneOk: boolean, soundOk: boolean, tone: ToneId | null, e?: GestureResponderEvent, timeout = false) => {
    const L = live.current;
    if (L.over) return;
    L.over = true;
    const good = toneOk && soundOk;
    const combo = ctx.answer(good);
    setOk(good);
    setStage('done');
    later(() => (good ? fx.ok(combo) : fx.bad()), timeout ? 0 : 260);
    later(() => speak(), 560);
    // un momento para ver qué tecla era; luego, la tarjeta con la regla
    later(() => setCard(true), timeout ? 0 : 750);
    if (good) {
      setPose('celebra');
      setJump((j) => j + 1);
      setFly((n) => n + 1);
      onRibbon(s.tone);
      let gain = 0;
      if (feria) {
        const secsLeft = Math.max(0, (L.deadline - now()) / 1000);
        gain = Math.round(((item.sound ? 150 : 100) + secsLeft * 8) * (1 + 0.2 * Math.min(10, Math.max(0, combo - 1))) * Math.pow(0.6, L.hints));
        ctx.gain(gain);
      }
      juice.celebrate(e ? tapPoint(e) : undefined, feria ? `+${gain}` : '¡Leído!');
      if (combo > 0 && combo % 5 === 0) juice.banner(`¡Combo ×${combo}!`, undefined, color.farol);
    } else {
      setPose('ups');
      setNod((n) => n + 1);
      juice.shake(5);
      if (timeout) juice.float(undefined, '¡Tiempo!', color.laca, 34);
      ctx.requeue();
      if (!toneOk) setWhy(tone ? whyWrong(s, tone) : { step: null, text: steps[2].detail });
      else setWhy({ step: null, text: `El tono, perfecto. Pero se lee «${s.rom}»: ${s.form.ch === DOT ? 'sin vocal escrita suena una «o» corta' : `${s.form.ch} suena «${s.form.rom}»`}.` });
    }
    // la regla, de uno en uno: clase, cómo acaba, marca… y el tono
    [0, 1, 2].forEach((k) =>
      later(
        () => {
          setCount(k + 1);
          if (k < 2) fx.pop();
          else fx.sparkle();
        },
        (timeout ? 350 : 1100) + k * 340,
      ),
    );
    if (feria) later(ctx.next, good ? 3300 : 5000);
  };

  const pickTone = (t: ToneId, e: GestureResponderEvent) => {
    if (stage !== 'tone' || live.current.over || live.current.tone) return;
    live.current.tone = true;
    playTone(t);
    setPicked(t);
    const right = t === s.tone;
    if (right && item.sound) {
      // tono acertado: ahora, ¿cómo suena?
      juice.ring(tapPoint(e), tones[t].fill, 80);
      setJump((j) => j + 1);
      later(() => setStage('sound'), 420);
      return;
    }
    finish(right, true, t, e);
  };

  const pickSound = (k: number, e: GestureResponderEvent) => {
    if (stage !== 'sound' || live.current.over) return;
    fx.tap();
    setSound(k);
    finish(true, sounds[k] === s.rom, s.tone, e);
  };

  const askHint = () => {
    const L = live.current;
    if (stage !== 'tone' || L.over || L.hints >= 2) return;
    L.hints += 1;
    setHints(L.hints);
    fx.pop();
  };

  // ——— contrarreloj (feria) ———
  const tick = useEffectEvent(() => {
    const L = live.current;
    if (L.over || !L.deadline) return;
    const ms = L.deadline - now();
    setLeft(Math.max(0, ms / (ctx.secs * 1000)));
    // sin tiempo: si el tono ya estaba acertado, lo que faltaba era el sonido
    if (ms <= 0) finish(stage === 'sound', stage !== 'sound', stage === 'sound' ? s.tone : null, undefined, true);
  });
  useEffect(() => {
    if (!feria || stage === 'done') return;
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, [feria, stage]);

  const done = stage === 'done';
  const size = Math.round(Math.max(120, Math.min(210, winW * 0.52, (winH - 380) * 0.62)));
  const keysW = Math.min(winW, 480) - 28;
  const detail = why?.text ?? steps[2].detail;

  return (
    <View style={{ flex: 1 }}>
      {feria ? <TimerRow left={left} running={!done} points={ctx.points} combo={score.combo} /> : null}

      {/* el cielo: la cometa con la sílaba, Noi mirando y la pista */}
      <View style={styles.sky}>
        <Kite th={s.th} size={size} ribbons={ribbons} fly={fly ? { tone: s.tone, n: fly } : null} nod={nod} lit={done && ok} />
        <View style={styles.skyNoi} pointerEvents="none">
          <Noi pose={pose} size={winH >= 700 ? 78 : 64} jump={jump} />
        </View>
        {!done && hints < 2 ? (
          <Press3D onPress={askHint} style={styles.hintBtn} accessibilityLabel="Pedir una pista">
            <View style={styles.hintFace}>
              <Icon name="bulb" size={20} color={color.azafranHondo} />
              <Text style={styles.hintText}>Pista</Text>
            </View>
          </Press3D>
        ) : null}
      </View>

      <View style={styles.bottom}>
        {done && card ? (
          <Animated.View entering={FadeInDown.springify().damping(15)} style={[styles.card, ok ? styles.cardOk : styles.cardBad]}>
            <WordRow s={s} ok={ok} emoji={ctx.emoji} onSpeak={() => speak()} />
            <RuleSteps steps={steps} cls={s.cls} live={s.live} count={Math.max(count, hints)} tone={s.tone} wrong={why?.step} />
            <Animated.View key={count >= 3 ? 'why' : 'wait'} entering={FadeIn.duration(220)} style={{ minHeight: 36, justifyContent: 'center' }}>
              <Txt v="small" style={{ color: ok ? color.tinta2 : color.lacaHondo }}>
                {count >= 3 ? detail : steps[Math.max(0, count - 1)].detail}
              </Txt>
            </Animated.View>
            {!feria ? <Btn label="Continuar" v={ok ? 'ok' : 'primary'} onPress={ctx.next} /> : null}
          </Animated.View>
        ) : stage === 'sound' || sound !== null ? (
          <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.ask}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <ToneChip tone={s.tone} small />
              <Txt v="h3">¡Ese es el tono! ¿Y cómo suena?</Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {sounds.map((r, k) => (
                <Animated.View key={r} entering={ZoomIn.delay(k * 70).springify().damping(12)} style={{ flex: 1 }}>
                  <Press3D onPress={(e) => pickSound(k, e)} disabled={done} style={{ height: 62 }} accessibilityLabel={`Suena ${r}`}>
                    <View style={[styles.sound, done && r === s.rom ? styles.soundOk : sound === k ? styles.soundBad : null]}>
                      <Text style={[styles.soundText, { color: tones[s.tone].text }]}>{r}</Text>
                    </View>
                  </Press3D>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ) : (
          <View style={styles.ask}>
            {hints ? (
              <View style={{ alignItems: 'center', gap: 2 }}>
                <RuleSteps steps={steps} cls={s.cls} live={s.live} count={hints} />
                <Txt v="small" style={{ textAlign: 'center' }}>
                  {steps[hints - 1].detail}
                </Txt>
              </View>
            ) : (
              <Txt v="h3" style={{ textAlign: 'center' }}>
                Lee la cometa: ¿qué tono tiene?
              </Txt>
            )}
            <ToneKeys width={keysW} picked={picked} answer={done ? s.tone : null} disabled={stage !== 'tone'} onPick={pickTone} />
          </View>
        )}
      </View>
    </View>
  );
}

// ——— El juego ———

export default function Silabas({ mode, rounds, words, focus, extra, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const later = useLater();
  const { width: winW, height: winH } = useWindowDimensions();
  const set: LetterSet = extra?.kind === 'letras' ? extra.set : 'silabas';

  const [plan, setPlan] = useState<Plan>(() =>
    makePlan({ feria, set, pool: extra?.kind === 'letras' ? (extra.pool ?? []) : [], rounds: rounds ?? 3, focus: focus.map((w) => w.th), known: words.map((w) => w.th) }),
  );
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'count' | 'play' | 'end'>(feria ? 'count' : 'play');
  const [points, setPoints] = useState(0);
  const [ribbons, setRibbons] = useState<ToneId[]>([]);
  const live = useRef({ points: 0, requeued: 0, ended: false });

  const item = plan.items[Math.min(i, plan.items.length - 1)];
  const level = plan.levels[item.lv] ?? plan.levels[0];

  const next = () => {
    const L = live.current;
    if (L.ended) return;
    const n = i + 1;
    if (n >= plan.items.length) {
      L.ended = true;
      setPhase('end');
      fx.fanfare();
      const read = plan.items.some((x) => x.task === 'decode');
      juice.banner(feria ? '¡Obra maestra!' : read ? '¡Ya lees los tonos!' : '¡Sílabas listas!', feria ? `${L.points} puntos` : read && ribbons.length ? `${ribbons.length} ${ribbons.length === 1 ? 'lazo' : 'lazos'} en la cometa` : undefined, color.cieloHondo);
      juice.burst(undefined, 'confeti', 30, 190);
      later(() => onDone(score.result(feria ? L.points : undefined)), 1600);
      return;
    }
    if (feria && plan.items[n].lv !== item.lv) {
      fx.levelup();
      juice.banner(`¡Nivel ${plan.items[n].lv + 1}!`, plan.levels[plan.items[n].lv]?.name, color.cielo);
      later(() => setI(n), 1100);
    } else setI(n);
  };

  /** Lo que se falla vuelve más tarde: al final de la lección o, en la feria, dos sílabas después (si sigue el nivel). */
  const requeue = () => {
    const L = live.current;
    if (!feria) {
      if (L.requeued >= 1) return;
      L.requeued += 1;
      setPlan((p) => ({ ...p, items: [...p.items, item] }));
    } else if (i + 2 < plan.items.length && plan.items[i + 2].lv === item.lv) {
      setPlan((p) => ({ ...p, items: p.items.map((x, n) => (n === i + 2 ? item : x)) }));
    }
  };

  const ctx: RoundCtx = {
    feria,
    secs: level.secs + (item.sound ? 6 : 0),
    score,
    juice,
    points,
    winW,
    winH,
    // el dibujo de la palabra con ese significado: ตา es «ojo» y también «abuelo», cada una con el suyo
    emoji: (words.find((w) => w.th === item.s.th && w.es.toLowerCase().includes(item.s.es.toLowerCase().split(/[,;(]/)[0].trim())) ?? words.find((w) => w.th === item.s.th))?.emoji,
    answer: (ok) => {
      onAnswer(ok);
      return score.hit(ok, false);
    },
    gain: (g) => {
      live.current.points += g;
      setPoints(live.current.points);
    },
    requeue,
    next,
  };

  const decode = item.task === 'decode';
  return (
    <View style={styles.root}>
      <Backdrop scene="dia" />
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <GameTitle
            title="Bloques de sílabas"
            sub={feria ? `Sílaba ${Math.min(i + 1, plan.items.length)} de ${plan.items.length} · ${level.name}` : decode ? 'Lee la cometa y toca su tono.' : 'Escucha y construye la sílaba.'}
          />
        </View>
        {!feria ? <ComboBadge combo={score.combo} /> : null}
      </View>
      {phase === 'count' ? null : decode ? (
        <DecodeRound key={i} item={item} ctx={ctx} ribbons={ribbons} onRibbon={(t) => setRibbons((r) => [...r, t])} />
      ) : (
        <BuildRound key={i} item={item} sets={plan.sets} ctx={ctx} />
      )}
      {phase === 'count' ? <Countdown onDone={() => setPhase('play')} /> : null}
      {juice.layer}
    </View>
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
  timer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, marginTop: 6 },
  socket: { position: 'absolute', borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(29,35,71,0.35)', backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  ghostDot: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(47,196,135,0.7)', backgroundColor: 'rgba(255,255,255,0.4)' },
  bottom: { paddingHorizontal: 14, paddingBottom: 16 },
  tray: { gap: 6, padding: 10, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.95)' },
  trayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trayLabel: { width: 80 },
  legend: { width: 10, height: 10, borderRadius: 3 },
  hint: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: color.lacaSuave },
  blockText: { fontFamily: font.thaiBold, textAlign: 'center', includeFontPadding: false },
  sin: { fontFamily: font.uiHeavy, textAlign: 'center' },
  inlineThai: { fontFamily: font.thaiBold, color: color.tinta },
  card: { gap: 10, padding: 14, borderRadius: 22, borderWidth: 2 },
  cardOk: { backgroundColor: '#F2FFF7', borderColor: color.arrozalVivo },
  cardBad: { backgroundColor: '#FFF6F2', borderColor: color.farol },
  cardSpeak: { width: 48, height: 48 },
  cardSpeakFace: { flex: 1, borderRadius: 16, backgroundColor: color.cielo, borderBottomWidth: 4, borderBottomColor: color.cieloHondo, alignItems: 'center', justifyContent: 'center' },
  sky: { flex: 1, alignItems: 'center', paddingTop: 8, overflow: 'visible' },
  skyNoi: { position: 'absolute', left: 10, bottom: 0 },
  hintBtn: { position: 'absolute', right: 14, bottom: 8, width: 92, height: 44 },
  hintFace: { flex: 1, flexDirection: 'row', gap: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 2, borderColor: color.azafran, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  hintText: { fontFamily: font.display, fontSize: 15, color: color.tinta },
  ask: { gap: 10, padding: 10, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.95)' },
  sound: { flex: 1, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3, borderBottomWidth: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  soundOk: { borderColor: color.arrozalVivo, backgroundColor: color.arrozalSuave },
  soundBad: { borderColor: color.laca, backgroundColor: color.lacaSuave },
  soundText: { fontFamily: font.uiHeavy, fontSize: 20, textAlign: 'center' },
});
