import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useFrameCallback, useSharedValue, withDelay, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';

import { color, font } from '@/brand/tokens';
import type { NoiPose } from '@/brand/noi-art';
import { Art, Icon } from '@/components/icons';
import { Btn, Rom, Th, Txt } from '@/components/ui';
import { TOTAL_CURVES } from '@/content';
import { MINIMAL_SETS } from '@/content/drills';
import type { Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { Dashes, Ground, Mist, Ranges, Road, RoadsideProps, Sky, Z_FAR, makeGeo, type Geo } from './curvas/road';
import { RoadSign, type SignState } from './curvas/sign';
import { Beams, Puff, Speedometer, Truck } from './curvas/truck';
import { Countdown, Pop, tapPoint, useGameFrame, useJuice } from './fx';
import { ComboBadge, useScore } from './kit';
import type { GameProps } from './types';

/** es: «¿cuál es…?» (español → thai) · oido: solo audio → thai · th: thai → español. */
type Ask = 'es' | 'oido' | 'th';
type Q = { target: Word; options: [Word, Word]; correct: 0 | 1; minimal: boolean; ask: Ask; dir: -1 | 1 };
type Fb = { side: 0 | 1 | -1; ok: boolean };
type PuffSpec = { id: number; x: number; y: number; dx: number; dy: number; size: number; tint: string };

const KMH = 9;
const Z_STOP = 2.6;
const LEVEL_EVERY = 8;
const LEVEL_TEXT = ['', '', 'Cae la tarde: más deprisa', 'Atardecer en la montaña', 'De noche: ¡luces largas!'];
/** 1864 → «1.864» (separador de miles español también con cuatro cifras). */
const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
/** Lo corto de una traducción: «tío/a (hermano menor de mamá)» → «tío/a». */
const shortEs = (es: string) => es.split(/[;(]/)[0].trim();

/** Juego 16 · 1.864 curvas: la carretera de Mae Hong Son en 3D; toca la señal correcta para tomar cada curva. */
export default function Curvas({ mode, words, focus, rounds, onAnswer, onDone }: GameProps) {
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
  const byTh = new Map(pool.map((x) => [x.th, x]));
  const queue = useRef<Word[]>([]);
  const met = useRef(new Set<string>());

  const makeQ = (): Q | null => {
    if (pool.length < 2) return null;
    if (queue.current.length === 0) {
      const f = shuffle(focus.filter((x) => byTh.has(x.th)));
      queue.current = [...f, ...shuffle(pool.filter((x) => !f.includes(x)))];
    }
    const target = queue.current.shift()!;
    const set = MINIMAL_SETS.find((s) => s.items.some((it) => it.th === target.th));
    const partners = set ? set.items.map((it) => byTh.get(it.th)).filter((x): x is Word => !!x && x.th !== target.th && x.es !== target.es) : [];
    let other: Word | undefined = partners.length ? shuffle(partners)[0] : undefined;
    const minimal = !!other;
    if (!other) other = shuffle(pool.filter((x) => x.th !== target.th && shortEs(x.es) !== shortEs(target.es)))[0];
    if (!other) return null;
    const first = !met.current.has(target.th);
    met.current.add(target.th);
    const r = Math.random();
    // lo nuevo se reconoce primero (thai → español); luego se recuerda; los pares de tono, de oído
    const ask: Ask = !feria && first ? 'th' : minimal ? (r < 0.6 ? 'oido' : 'es') : r < 0.5 ? 'es' : r < 0.75 ? 'th' : 'oido';
    const correct: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
    return { target, options: correct === 0 ? [target, other] : [other, target], correct, minimal, ask, dir: Math.random() < 0.5 ? -1 : 1 };
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

  const dist = useSharedValue(0);
  const speed = useSharedValue(0);
  const curve = useSharedValue(0);
  const bgX = useSharedValue(0);
  const tod = useSharedValue(0);
  const signZ = useSharedValue(Z_FAR + 2);
  const steer = useSharedValue(0);
  const roll = useSharedValue(0);
  const brake = useSharedValue(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const st = useRef({ curves: 0, lives: 3, points: 0, level: 1, base: feria ? 5.8 : 5.5, busy: true, over: false, qid: 0, puff: 0, q: null as Q | null });
  const self = useRef<{ start: () => void } | null>(null);

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

  const ask = () => {
    const s = st.current;
    if (s.over) return;
    const nq = makeQ();
    if (!nq) {
      finish();
      return;
    }
    s.q = nq;
    s.qid += 1;
    const my = s.qid;
    s.busy = false;
    setQ(nq);
    setQn(my);
    setFb(null);
    setPose('feliz');
    const v = s.base + Math.min(2.5, s.curves * 0.04);
    const approach = feria ? ((Z_FAR - 0.95) / v) * 1000 : 2600;
    cancelAnimation(signZ);
    signZ.set(Z_FAR);
    curve.set(withTiming(nq.dir * (0.05 + Math.min(0.04, s.level * 0.008)), { duration: approach * 0.7, easing: Easing.inOut(Easing.sin) }));
    if (feria) {
      setSpeed(v, 500);
      signZ.set(withTiming(0.95, { duration: approach, easing: Easing.linear }));
      later(() => {
        if (st.current.qid === my && !st.current.busy) miss();
      }, approach - 150);
    } else {
      setKmh(Math.round(v * KMH));
      speed.set(withSequence(withTiming(v, { duration: 300 }), withTiming(0.25, { duration: approach, easing: Easing.out(Easing.cubic) })));
      signZ.set(withTiming(Z_STOP, { duration: approach, easing: Easing.out(Easing.cubic) }));
      later(() => {
        if (st.current.qid === my) setKmh(2);
      }, approach);
    }
    if (nq.ask !== 'es') later(() => say(nq.target.th), 450);
  };

  const next = (ms: number) =>
    later(() => {
      const s = st.current;
      if (s.over) return;
      if ((feria && s.lives <= 0) || s.curves >= goal) finish();
      else ask();
    }, ms);

  const fail = (cur: Q, side: 0 | 1 | -1, late: boolean) => {
    const s = st.current;
    s.busy = true;
    cancelAnimation(signZ);
    setFb({ side, ok: false });
    juice.shake(12);
    if (late) {
      score.hit(false);
      onAnswer(false, cur.target.id);
      juice.float(undefined, '¡Demasiado tarde!', color.lacaHondo, 26);
    }
    const sk = cur.dir;
    roll.set(withSequence(withTiming(sk * 22, { duration: 110 }), withTiming(-sk * 16, { duration: 150 }), withTiming(sk * 8, { duration: 130 }), withSpring(0, { damping: 9 })));
    steer.set(withSequence(withTiming(-sk * 46, { duration: 260, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 11, stiffness: 90 })));
    brake.set(withSequence(withTiming(1, { duration: 80 }), withDelay(800, withTiming(0, { duration: 300 }))));
    setSpeed(s.base * 0.35, 300);
    later(() => setSpeed(s.base, 1200), 700);
    dust(8, 'rgba(176,150,110,0.85)', 70);
    setPose('ups');
    later(() => say(cur.target.th), 350);
    signZ.set(withDelay(1100, withTiming(0.9, { duration: 500, easing: Easing.in(Easing.quad) })));
    queue.current.splice(2, 0, cur.target);
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
    onAnswer(ok, cur.target.id);
    if (!ok) {
      fail(cur, side, false);
      return;
    }
    cancelAnimation(signZ);
    setFb({ side, ok: true });
    s.curves += 1;
    setCurves(s.curves);
    let gain = 0;
    if (feria) {
      const early = Math.max(0, Math.min(1, (signZ.value - 2) / (Z_FAR - 2)));
      gain = Math.round((10 + early * 15) * (1 + Math.min(10, combo - 1) * 0.1));
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
      later(() => {
        fx.levelup();
        juice.banner(`¡Nivel ${s.level}!`, LEVEL_TEXT[Math.min(4, s.level)] || '¡Más curvas, más deprisa!', color.farol);
      }, 300);
    }
    const boost = s.base + Math.min(2.5, s.curves * 0.04);
    speed.set(withSequence(withTiming(boost * 1.35, { duration: 220 }), withTiming(boost, { duration: 1100 })));
    setKmh(Math.round(boost * KMH));
    next(feria ? 1000 : 1350);
  };

  const begin = () => {
    st.current.busy = false;
    setPhase('drive');
    setSpeed(st.current.base, 900);
    later(() => ask(), 500);
  };

  useEffect(() => {
    self.current = { start: begin };
  });
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
                  <Rom rom={q.target.rom} size={13} />
                  <Text style={styles.askSmall}>¿Qué significa?</Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.askBig}>Escucha y elige</Text>
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
