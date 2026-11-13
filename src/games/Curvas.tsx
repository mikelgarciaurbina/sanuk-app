import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useFrameCallback, useSharedValue, withDelay, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';

import { color, font } from '@/brand/tokens';
import type { NoiPose } from '@/brand/noi-art';
import { Noi } from '@/components/Noi';
import { Art, Icon } from '@/components/icons';
import { Btn, Rom, Th, Txt } from '@/components/ui';
import { TOTAL_CURVES } from '@/content';
import type { Word } from '@/content/types';
import { fx, say, stopSpeech } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { lessonItems, rivalOf, shortEs, tonePairs, type Ask, type Item } from './curvas/plan';
import { Dashes, Ground, Mist, Ranges, Road, RoadsideProps, Sky, Z_FAR, makeGeo, type Geo } from './curvas/road';
import { RoadSign, type SignState } from './curvas/sign';
import { Beams, Puff, Speedometer, Truck } from './curvas/truck';
import { Countdown, Pop, tapPoint, useGameFrame, useJuice } from './fx';
import { ComboBadge, useScore } from './kit';
import type { GameProps } from './types';

type Q = { item: Item; target: Word; options: [Word, Word]; correct: 0 | 1; minimal: boolean; ask: Ask; dir: -1 | 1 };
type Fb = { side: 0 | 1 | -1; ok: boolean };
type PuffSpec = { id: number; x: number; y: number; dx: number; dy: number; size: number; tint: string };

const KMH = 9;
/** Lección: la señal se queda aquí esperando, sin prisa. */
const Z_STOP = 2.6;
/** Feria: la señal llega aquí en medio segundo (ya se lee bien) y se acerca despacio hasta Z_END mientras corre el tiempo. */
const Z_HOLD = 2.7;
const Z_END = 2.05;
const ARRIVE_MS = 520;
const LEVEL_EVERY = 8;
/** En la feria, una de cada cuatro curvas es de tono. */
const TONE_EVERY = 4;
/** Tiempo para decidir en cada nivel de la feria: la dificultad sube acortándolo, no encogiendo la letra. */
const decideMs = (level: number) => Math.max(2400, 6500 - (level - 1) * 650);
const LEVEL_TEXT = ['', '', 'Cae la tarde: menos tiempo', 'Atardecer en la montaña', 'De noche: ¡luces largas!'];
/** 1864 → «1.864» (separador de miles español también con cuatro cifras). */
const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
/** ¿La app está en segundo plano (o a medio salir)? */
const away = () => AppState.currentState === 'background' || AppState.currentState === 'inactive';

/**
 * Juego 16 · 1.864 curvas: la carretera de Mae Hong Son en 3D; toca la señal correcta para tomar cada curva.
 * Las señales se plantan enseguida a una distancia a la que se leen y el reto es el tiempo. En la feria, una de
 * cada cuatro curvas es de tono (dos palabras que solo cambian de tono, de oído). En la lección cada palabra pasa
 * dos veces: primero se reconoce, luego se recuerda.
 */
export default function Curvas({ mode, words, focus, rounds, reads = false, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const frame = useGameFrame();
  const goal = feria ? (rounds ?? 60) : (rounds ?? 8);

  const [pool] = useState(() => {
    const m = new Map<string, Word>();
    for (const x of [...focus, ...words]) if (x.th && !m.has(x.th)) m.set(x.th, x);
    return [...m.values()];
  });
  /** parejas ya presentadas que solo cambian de tono (para las curvas de tono) */
  const [tones] = useState(() => shuffle(tonePairs(pool)));
  const queue = useRef<Item[]>([]);
  const asked = useRef(0);
  const refills = useRef(0);

  const nextItem = (): Item | null => {
    asked.current += 1;
    // con una o dos parejas conocidas, las curvas de tono salen la mitad de veces para no repetirse
    const every = tones.length >= 3 ? TONE_EVERY : TONE_EVERY * 2;
    if (feria && tones.length && asked.current % every === 0) {
      const [a, b] = tones[(asked.current / every - 1) % tones.length];
      const flip = Math.random() < 0.5;
      return { word: flip ? a : b, rival: flip ? b : a, ask: 'oido', tone: true };
    }
    if (queue.current.length === 0) {
      refills.current += 1;
      // lección: dos pasadas por las palabras nuevas; si aún faltan curvas, más palabras ya en forma de recordar
      if (!feria && refills.current === 1) queue.current = lessonItems(focus.filter((x) => pool.some((w) => w.th === x.th)), pool, goal);
      else queue.current = shuffle(pool).map((word, i) => ({ word, ask: i % 2 ? 'oido' : 'es', any: feria }));
    }
    return queue.current.shift() ?? null;
  };

  const makeQ = (): Q | null => {
    if (pool.length < 2) return null;
    const item = nextItem();
    const rv = item ? rivalOf(item, pool) : null;
    if (!item || !rv) return null;
    const r = Math.random();
    // en la feria la forma se sortea al llegar: los pares de tono, casi siempre de oído
    const ask: Ask = item.any ? (rv.minimal ? (r < 0.6 ? 'oido' : 'es') : r < 0.5 ? 'es' : r < 0.75 ? 'th' : 'oido') : item.ask;
    const correct: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
    return { item: { ...item, ask, any: false }, target: item.word, options: correct === 0 ? [item.word, rv.rival] : [rv.rival, item.word], correct, minimal: rv.minimal, ask, dir: Math.random() < 0.5 ? -1 : 1 };
  };

  const [measured, setGeo] = useState<Geo | null>(null);
  // hasta que llega la medida real (onLayout), la escena se dibuja con el tamaño de la ventana:
  // así nunca queda un cielo vacío si la medida tarda o no llega
  const win = useWindowDimensions();
  const geo = measured ?? makeGeo(win.width, win.height, frame.top);
  const [phase, setPhase] = useState<'ready' | 'drive' | 'over'>(feria ? 'ready' : 'drive');
  const [q, setQ] = useState<Q | null>(null);
  const [qn, setQn] = useState(0);
  const [fb, setFb] = useState<Fb | null>(null);
  const [curves, setCurves] = useState(0);
  const [lives, setLives] = useState(3);
  const [kmh, setKmh] = useState(0);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [pose, setPose] = useState<NoiPose>('hola');
  const [jump, setJump] = useState(0);
  const [puffs, setPuffs] = useState<PuffSpec[]>([]);
  const [noWords] = useState(() => pool.length < 2);
  const [paused, setPaused] = useState(false);

  const dist = useSharedValue(0);
  const speed = useSharedValue(0);
  const curve = useSharedValue(0);
  const bgX = useSharedValue(0);
  const tod = useSharedValue(0);
  const signZ = useSharedValue(Z_FAR + 2);
  const steer = useSharedValue(0);
  const roll = useSharedValue(0);
  const brake = useSharedValue(0);
  /** tiempo que queda para decidir en la curva en curso (1 → 0), solo en la feria */
  const fuse = useSharedValue(1);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // `open`: hay una curva a la vista sin contestar · `driving`: ya ha arrancado · `paused`: la app se fue a segundo plano
  const st = useRef({ curves: 0, lives: 3, points: 0, level: 1, base: feria ? 5.8 : 5.5, busy: true, over: false, qid: 0, puff: 0, q: null as Q | null, open: false, driving: false, paused: false, turn: 0 });
  const self = useRef<{ start: () => void; pause: () => void } | null>(null);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useFrameCallback((f) => {
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    dist.value = dist.value + speed.value * dt;
    bgX.value = bgX.value - curve.value * speed.value * dt * 90;
  });

  const dust = (n: number, tint: string, spread: number) => {
    if (!geo) return;
    const tw = Math.min(170, geo.W * 0.44);
    const list: PuffSpec[] = Array.from({ length: n }, (_, i) => {
      st.current.puff += 1;
      const side = i % 2 ? 1 : -1;
      return { id: st.current.puff, x: geo.W / 2 + side * tw * 0.34, y: geo.H - frame.bottom - 26, dx: side * (20 + Math.random() * spread), dy: -10 - Math.random() * 30, size: 26 + Math.random() * 22, tint };
    });
    setPuffs((p) => [...p.slice(-10), ...list]);
    const ids = new Set(list.map((p) => p.id));
    later(() => setPuffs((p) => p.filter((x) => !ids.has(x.id))), 900);
  };

  const setSpeed = (v: number, ms = 700) => {
    speed.set(withTiming(v, { duration: ms, easing: Easing.inOut(Easing.quad) }));
    setKmh(Math.round(v * KMH));
  };

  const finish = () => {
    const s = st.current;
    if (s.over) return;
    s.over = true;
    s.busy = true;
    setPhase('over');
    setSpeed(0, 1600);
    brake.set(withTiming(1, { duration: 200 }));
    curve.set(withTiming(0, { duration: 900 }));
    if (feria) {
      fx.fanfare();
      juice.banner('¡Fin del trayecto!', `${s.curves} curvas · ${s.points} puntos`, color.farol);
    } else {
      fx.done();
      juice.banner('¡Has llegado!', `${s.curves} curvas de la 1095`, color.arrozalVivo);
    }
    juice.burst(undefined, 'confeti', 30, 190);
    setPose('celebra');
    setJump((j) => j + 1);
    later(() => onDone(score.result(feria ? s.points : s.curves)), 1900);
  };

  /** La app se va a segundo plano en plena carretera: la camioneta para en el arcén y el reloj de la curva no corre. */
  const pause = () => {
    const s = st.current;
    if (!feria || s.over || s.paused || !s.driving) return;
    s.paused = true;
    s.busy = true;
    s.qid += 1;
    cancelAnimation(signZ);
    cancelAnimation(fuse);
    speed.set(withTiming(0, { duration: 400 }));
    setKmh(0);
    stopSpeech();
    setPaused(true);
  };

  /** `again`: la misma curva otra vez desde el principio (al volver de una pausa), sin penalización. */
  const ask = (again?: Q) => {
    const s = st.current;
    if (s.over || s.paused) return;
    if (feria && away()) {
      pause();
      return;
    }
    const nq = again ?? makeQ();
    if (!nq) {
      finish();
      return;
    }
    s.q = nq;
    s.qid += 1;
    const my = s.qid;
    s.busy = false;
    s.open = true;
    setQ(nq);
    setQn(my);
    setFb(null);
    setPose('feliz');
    const v = s.base + Math.min(2.5, s.curves * 0.04);
    cancelAnimation(signZ);
    signZ.set(Z_FAR);
    curve.set(withTiming(nq.dir * (0.05 + Math.min(0.04, s.level * 0.008)), { duration: 1100, easing: Easing.inOut(Easing.sin) }));
    if (feria) {
      // la señal se planta en medio segundo donde ya se lee; desde ahí corre el tiempo para decidir
      const time = decideMs(s.level);
      setSpeed(v, 500);
      signZ.set(withSequence(withTiming(Z_HOLD, { duration: ARRIVE_MS, easing: Easing.out(Easing.cubic) }), withTiming(Z_END, { duration: time, easing: Easing.linear })));
      cancelAnimation(fuse);
      fuse.set(1);
      fuse.set(withDelay(ARRIVE_MS, withTiming(0, { duration: time, easing: Easing.linear })));
      later(() => {
        if (st.current.qid === my && !st.current.busy) miss();
      }, ARRIVE_MS + time);
    } else {
      const approach = 2600;
      setKmh(Math.round(v * KMH));
      speed.set(withSequence(withTiming(v, { duration: 300 }), withTiming(0.25, { duration: approach, easing: Easing.out(Easing.cubic) })));
      signZ.set(withTiming(Z_STOP, { duration: approach, easing: Easing.out(Easing.cubic) }));
      later(() => {
        if (st.current.qid === my) setKmh(2);
      }, approach);
    }
    if (nq.ask !== 'es')
      later(() => {
        if (st.current.qid === my) say(nq.target.th);
      }, 450);
  };

  /** Lo que toca ahora: la curva que quedó a medias (tras una pausa), la siguiente o el final. */
  const proceed = () => {
    const s = st.current;
    if (s.over || s.paused) return;
    if (s.open && s.q) ask(s.q);
    else if ((feria && s.lives <= 0) || s.curves >= goal) finish();
    else ask();
  };

  const next = (ms: number) => {
    // solo cuenta el último aviso: una pausa a destiempo no hace que la misma curva empiece dos veces
    st.current.turn += 1;
    const my = st.current.turn;
    later(() => {
      if (st.current.turn === my) proceed();
    }, ms);
  };

  const resume = () => {
    const s = st.current;
    if (!s.paused) return;
    s.paused = false;
    setPaused(false);
    if (s.over) return;
    setSpeed(s.base, 700);
    next(500);
  };

  /** La palabra que cuenta para el repaso espaciado: en la primera pasada de la lección (reconocer entre dos, con
   *  todo el apoyo) aún no cuenta; un acierto ahí puede ser pura suerte. */
  const feed = (cur: Q) => (cur.item.first ? undefined : cur.target.id);

  const fail = (cur: Q, side: 0 | 1 | -1, late: boolean) => {
    const s = st.current;
    s.busy = true;
    s.open = false;
    cancelAnimation(signZ);
    cancelAnimation(fuse);
    setFb({ side, ok: false });
    juice.shake(12);
    if (late) {
      score.hit(false);
      onAnswer(false, feed(cur));
      juice.float(undefined, '¡Demasiado tarde!', color.lacaHondo, 26);
    }
    const sk = cur.dir;
    roll.set(withSequence(withTiming(sk * 22, { duration: 110 }), withTiming(-sk * 16, { duration: 150 }), withTiming(sk * 8, { duration: 130 }), withSpring(0, { damping: 9 })));
    steer.set(withSequence(withTiming(-sk * 46, { duration: 260, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 11, stiffness: 90 })));
    brake.set(withSequence(withTiming(1, { duration: 80 }), withDelay(800, withTiming(0, { duration: 300 }))));
    setSpeed(s.base * 0.35, 300);
    later(() => {
      if (!st.current.paused && !st.current.over) setSpeed(s.base, 1200);
    }, 700);
    dust(8, 'rgba(176,150,110,0.85)', 70);
    setPose('ups');
    later(() => {
      if (!st.current.paused) say(cur.target.th);
    }, 350);
    signZ.set(withDelay(1100, withTiming(0.9, { duration: 500, easing: Easing.in(Easing.quad) })));
    // lo fallado vuelve dos curvas después, igual que se preguntó
    queue.current.splice(2, 0, { ...cur.item, rival: undefined, tone: false });
    if (feria) {
      s.lives -= 1;
      setLives(s.lives);
    }
    next(1900);
  };

  const miss = () => {
    const cur = st.current.q;
    if (!cur || st.current.busy) return;
    fail(cur, -1, true);
  };

  const answer = (side: 0 | 1, e?: GestureResponderEvent) => {
    if (phase !== 'drive' || !q) return;
    const s = st.current;
    const cur = s.q;
    if (!cur || s.busy || s.over) return;
    s.busy = true;
    const ok = side === cur.correct;
    const combo = score.hit(ok);
    onAnswer(ok, feed(cur));
    if (!ok) {
      fail(cur, side, false);
      return;
    }
    s.open = false;
    cancelAnimation(signZ);
    cancelAnimation(fuse);
    setFb({ side, ok: true });
    s.curves += 1;
    setCurves(s.curves);
    let gain = 0;
    if (feria) {
      // cuanto antes se decide, más puntos; las curvas de tono valen el doble
      const early = Math.max(0, Math.min(1, fuse.value));
      gain = Math.round((10 + early * 15) * (cur.item.tone ? 2 : 1) * (1 + Math.min(10, combo - 1) * 0.1));
      s.points += gain;
      setPoints(s.points);
    }
    const at = e ? tapPoint(e) : undefined;
    juice.celebrate(at, feria ? `+${gain}` : `Curva ${s.curves}`, 'estrellas');
    if (cur.ask === 'es') say(cur.target.th);
    setPose('celebra');
    setJump((j) => j + 1);
    // derrape limpio hacia dentro de la curva, polvo y acelerón
    steer.set(withSequence(withTiming(cur.dir * 34, { duration: 260, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 12, stiffness: 80 })));
    roll.set(withSequence(withTiming(cur.dir * 7, { duration: 220 }), withSpring(0, { damping: 9 })));
    dust(5, 'rgba(214,196,160,0.75)', 40);
    signZ.set(withTiming(0.9, { duration: 650, easing: Easing.in(Easing.quad) }));
    later(() => {
      curve.set(withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }));
    }, 700);
    if (feria && s.curves % LEVEL_EVERY === 0) {
      s.level += 1;
      s.base += 1.2;
      setLevel(s.level);
      tod.set(withTiming(Math.min(3, s.level - 1), { duration: 2600 }));
      // cada nivel devuelve una vida: así las sesenta curvas están al alcance
      const extra = s.lives < 3;
      if (extra) {
        s.lives += 1;
        setLives(s.lives);
      }
      later(() => {
        fx.levelup();
        juice.banner(`¡Nivel ${s.level}!`, extra ? '¡Vida extra! Y menos tiempo en cada curva' : LEVEL_TEXT[Math.min(4, s.level)] || 'Menos tiempo en cada curva', color.farol);
        if (extra) juice.burst(undefined, 'corazones', 12, 120);
      }, 300);
    }
    const boost = s.base + Math.min(2.5, s.curves * 0.04);
    speed.set(withSequence(withTiming(boost * 1.35, { duration: 220 }), withTiming(boost, { duration: 1100 })));
    setKmh(Math.round(boost * KMH));
    next(feria ? 1000 : 1350);
  };

  const begin = () => {
    st.current.busy = false;
    st.current.driving = true;
    setPhase('drive');
    setSpeed(st.current.base, 900);
    later(() => ask(), 500);
  };

  useEffect(() => {
    self.current = { start: begin, pause };
  });
  useEffect(() => {
    if (!feria) return;
    // si la app pasa a segundo plano, la partida se para sola: no se pierde una vida por contestar al teléfono
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') self.current?.pause();
    });
    return () => sub.remove();
  }, [feria]);
  useEffect(() => {
    const all = timers.current;
    const t = setTimeout(() => {
      if (!feria) self.current?.start();
    }, 500);
    return () => {
      clearTimeout(t);
      all.forEach(clearTimeout);
    };
  }, [feria]);

  const headlights = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, tod.value - 1.6)) }));
  const fuseStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, fuse.value)) * 100}%`, backgroundColor: fuse.value > 0.5 ? '#2DBE78' : fuse.value > 0.22 ? '#FFC83D' : '#FF6A3D' }));

  if (noWords) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Txt v="h2">Aún faltan palabras</Txt>
        <Btn label="Continuar" onPress={() => onDone(score.result(0))} />
      </View>
    );
  }

  const signState = (side: 0 | 1): SignState => {
    if (!fb || !q) return 'idle';
    if (side === q.correct) return fb.ok ? 'ok' : 'hint';
    return fb.side === side ? 'bad' : 'dim';
  };
  const signText = (w: Word) => (q?.ask === 'th' ? shortEs(w.es) : w.th);
  // mientras no se sabe leer, el thai de las señales lleva su transcripción; después, se lee de verdad
  const signRom = (w: Word) => (q && q.ask !== 'th' && !reads ? w.rom : undefined);
  const truckW = geo ? Math.min(170, geo.W * 0.44) : 150;

  return (
    <View style={{ flex: 1 }}>
      {/* la escena sube por detrás de la cabecera y baja hasta el borde de la pantalla */}
      <View
        style={{ position: 'absolute', left: 0, right: 0, top: -frame.top, bottom: -frame.bottom, overflow: 'hidden', backgroundColor: '#7FB8F5' }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setGeo((g0) => (g0 && g0.W === width && g0.H === height ? g0 : makeGeo(width, height, frame.top)));
        }}>
        <Animated.View style={[StyleSheet.absoluteFill, juice.shakeStyle]}>
          {geo ? (
            <View key={`${geo.W}x${geo.H}`} style={StyleSheet.absoluteFill}>
              <Sky g={geo} tod={tod} />
              <Ranges g={geo} bgX={bgX} tod={tod} />
              <Ground g={geo} tod={tod} />
              <Road g={geo} curve={curve} />
              <Dashes g={geo} dist={dist} curve={curve} />
              <RoadsideProps g={geo} dist={dist} curve={curve} />
              <Mist g={geo} />
              <View style={{ position: 'absolute', left: 0, right: 0, top: geo.hz, bottom: 0, flexDirection: 'row' }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Elegir la señal de la izquierda" onPress={(e) => answer(0, e)} style={{ flex: 1 }} />
                <Pressable accessibilityRole="button" accessibilityLabel="Elegir la señal de la derecha" onPress={(e) => answer(1, e)} style={{ flex: 1 }} />
              </View>
              <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: geo.hz + geo.gh * 0.22, bottom: 0 }, headlights]}>
                <Beams />
              </Animated.View>
              {q
                ? ([0, 1] as const).map((side) => (
                    <RoadSign
                      key={`${qn}-${side}`}
                      g={geo}
                      side={side === 0 ? -1 : 1}
                      z={signZ}
                      curve={curve}
                      dir={q.dir}
                      text={signText(q.options[side])}
                      rom={signRom(q.options[side])}
                      latin={q.ask === 'th'}
                      state={signState(side)}
                      label={`Señal ${side === 0 ? 'izquierda' : 'derecha'}: ${signText(q.options[side])}`}
                      onChoose={answer}
                    />
                  ))
                : null}
              <View pointerEvents="none" style={{ position: 'absolute', left: geo.W / 2 - truckW / 2, top: geo.H - frame.bottom - truckW * (130 / 160) - 10 }}>
                <Truck width={truckW} curve={curve} steer={steer} roll={roll} dist={dist} speed={speed} brake={brake} pose={pose} jump={jump} />
              </View>
              {puffs.map((p) => (
                <Puff key={p.id} {...p} />
              ))}
            </View>
          ) : null}
        </Animated.View>
      </View>

      {/* Marcador */}
      <View pointerEvents="box-none" style={styles.hud}>
        <Pop trigger={curves} style={styles.pill}>
          <Art name="curva" size={24} />
          <Text style={styles.pillNum}>{curves}</Text>
          <Text style={styles.pillSub}>{feria ? `de ${fmt(TOTAL_CURVES)}` : `/ ${goal}`}</Text>
        </Pop>
        {feria ? (
          <View style={[styles.pill, { gap: 1 }]} accessibilityLabel={`${lives} vidas`}>
            {[0, 1, 2].map((k) => (
              <Icon key={k} name="heart" size={18} color={k < lives ? color.laca : color.niebla3} />
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        {score.combo >= 2 ? (
          <View style={styles.pill}>
            <ComboBadge combo={score.combo} />
          </View>
        ) : null}
        {feria ? (
          <Pop trigger={points} style={styles.pill}>
            <Text style={styles.pillNum}>{points}</Text>
          </Pop>
        ) : null}
        <Speedometer speed={speed} kmh={kmh} perKmh={KMH} size={64} />
      </View>

      {/* La pregunta */}
      {q && phase !== 'over' ? (
        <Animated.View key={qn} entering={ZoomIn.springify().damping(13)} pointerEvents="box-none" style={styles.askWrap}>
          <View style={styles.ask}>
            {fb && !fb.ok ? (
              <Animated.View entering={FadeIn.duration(160)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Th size={24} bold>{q.target.th}</Th>
                <View style={{ flexShrink: 1 }}>
                  <Rom rom={q.target.rom} size={13} />
                  <Text style={styles.askEs} numberOfLines={1}>= {shortEs(q.target.es)}</Text>
                </View>
              </Animated.View>
            ) : q.ask === 'es' ? (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexShrink: 1 }}>
                <Text style={styles.askSmall}>¿Cuál es</Text>
                <Text style={styles.askBig} numberOfLines={1}>«{shortEs(q.target.es)}»?</Text>
              </View>
            ) : q.ask === 'th' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <Th size={26} bold>{q.target.th}</Th>
                <View style={{ flexShrink: 1 }}>
                  {reads ? null : <Rom rom={q.target.rom} size={13} />}
                  <Text style={styles.askSmall}>¿Qué significa?</Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.askBig}>{q.item.tone ? 'Escucha: ¿cuál suena?' : 'Escucha y elige'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            {q.minimal && (!fb || fb.ok) ? (
              <View style={styles.tone}>
                <Text style={styles.toneText}>ojo al tono</Text>
              </View>
            ) : null}
            {q.ask !== 'es' || (fb && !fb.ok) ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Escuchar otra vez" hitSlop={10} onPress={() => say(q.target.th)} style={styles.spk}>
                <Icon name="speaker" size={18} color="#FFFFFF" />
              </Pressable>
            ) : null}
            {feria && !fb ? (
              <View pointerEvents="none" style={styles.fuse}>
                <Animated.View style={[styles.fuseFill, fuseStyle]} />
              </View>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      {phase === 'ready' ? <Countdown onDone={begin} go="¡Arranca!" /> : null}
      {!feria && phase === 'drive' && curves === 0 && !fb ? (
        <View pointerEvents="none" style={styles.tipWrap}>
          <View style={styles.tip}>
            <Text style={styles.tipText}>Toca la señal correcta para tomar la curva</Text>
          </View>
        </View>
      ) : null}
      {feria && level > 1 ? (
        <View pointerEvents="none" style={styles.levelWrap}>
          <View style={styles.level}>
            <Text style={styles.levelText}>Nivel {level}</Text>
          </View>
        </View>
      ) : null}
      {paused ? (
        <View style={[StyleSheet.absoluteFill, styles.pause]}>
          <Noi pose="duerme" size={132} />
          <Txt v="h1" style={{ color: '#FFFFFF' }}>En pausa</Txt>
          <Txt v="small" style={{ color: '#C9D0EE', textAlign: 'center' }}>
            La camioneta te espera en el arcén. La curva vuelve a empezar: no has perdido nada.
          </Txt>
          <Btn label="Seguir conduciendo" onPress={resume} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : null}
      {juice.layer}
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { position: 'absolute', left: 12, right: 12, top: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.94)' },
  pillNum: { fontFamily: font.displayBold, fontSize: 18, color: color.tinta },
  pillSub: { fontFamily: font.uiHeavy, fontSize: 11, color: color.tinta3 },
  askWrap: { position: 'absolute', left: 14, right: 14, top: 76 },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#D5DEEA',
    shadowColor: '#1D2347',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  askSmall: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta3 },
  askBig: { fontFamily: font.display, fontSize: 23, color: color.tinta, flexShrink: 1 },
  askEs: { fontFamily: font.uiHeavy, fontSize: 14, color: color.arrozalHondo },
  fuse: { position: 'absolute', left: 18, right: 18, bottom: 3, height: 5, borderRadius: 5, backgroundColor: color.niebla2, overflow: 'hidden' },
  fuseFill: { height: '100%', borderRadius: 5 },
  pause: { backgroundColor: 'rgba(20,25,54,0.86)', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 28, zIndex: 50 },
  tone: { backgroundColor: color.niebla2, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  toneText: { fontFamily: font.uiHeavy, fontSize: 11, color: color.tinta2 },
  spk: { width: 40, height: 40, borderRadius: 14, backgroundColor: color.cielo, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: color.cieloHondo },
  tipWrap: { position: 'absolute', left: 20, right: 20, bottom: 14, alignItems: 'center' },
  tip: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 14, height: 32, justifyContent: 'center' },
  tipText: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta2 },
  levelWrap: { position: 'absolute', left: 14, top: 46 },
  level: { height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: color.farol, justifyContent: 'center' },
  levelText: { fontFamily: font.uiHeavy, fontSize: 11, color: '#FFFFFF' },
});
