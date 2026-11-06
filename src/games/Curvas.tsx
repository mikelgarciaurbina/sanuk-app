import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { MistBand } from '@/components/Scenery';
import { Art, Icon } from '@/components/icons';
import { Btn, Th, Txt } from '@/components/ui';
import type { Word } from '@/content/types';
import { MINIMAL_SETS } from '@/content/drills';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { ComboBadge, useScore } from './kit';
import type { GameProps } from './types';

type Q = { target: Word; options: [Word, Word]; correct: 0 | 1; minimal: boolean };
type Fb = { side: 0 | 1; ok: boolean };

const SIGN = 124;
const TRUCK_W = 132;
const TRUCK_H = 170;
const KMH_TO_PX = 3.4;

/** Tile de carretera que encaja consigo mismo en vertical: dos curvas por tile. */
function useTile(w: number, tile: number) {
  return useMemo(() => {
    const amp = w * 0.14;
    const roadW = w * 0.46;
    const cx = (y: number) => w / 2 + amp * Math.sin((4 * Math.PI * y) / tile);
    // el trazo es muy ancho: hay que prolongar la curva lo bastante para que no se corte en la unión entre tramos
    const PAD = Math.ceil(roadW) + 24;
    const pts: [number, number][] = [];
    for (let y = -PAD; y <= tile + PAD; y += 12) pts.push([cx(y), y]);
    const d = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y}`).join(' L')}`;
    const lenOf = (a: number, b: number) => {
      let l = 0;
      for (let k = 1; k < pts.length; k++) {
        const [x0, y0] = pts[k - 1];
        const [x1, y1] = pts[k];
        if (y1 > a && y0 < b) l += Math.hypot(x1 - x0, y1 - y0);
      }
      return l;
    };
    const full = lenOf(0, tile);
    const period = full / Math.max(1, Math.round(full / 42));
    const pre = lenOf(-PAD, 0);
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const bushes: { x: number; y: number; r: number; light: boolean }[] = [];
    const n = Math.round(tile / 60);
    for (let k = 0; k < n; k++) {
      const y = 36 + (k * (tile - 72)) / n + rnd() * 20;
      const r = 14 + rnd() * 14;
      const edge = roadW / 2 + 22 + r;
      bushes.push({ x: Math.max(-6, cx(y) - edge - rnd() * 40), y, r, light: rnd() > 0.5 });
      bushes.push({ x: Math.min(w + 6, cx(y + 30) + edge + rnd() * 40), y: y + 30, r: r * 0.9, light: rnd() > 0.5 });
    }
    const mist = [0.18, 0.52, 0.83].map((f, k) => ({ y: f * tile, x: k % 2 ? w * 0.45 : -w * 0.1 }));
    return { d, roadW, period, pre, bushes, mist };
  }, [w, tile]);
}

function RoadTile({ w, tile }: { w: number; tile: number }) {
  const t = useTile(w, tile);
  return (
    <Svg width={w} height={tile}>
      <Rect width={w} height={tile} fill="#8FC28A" />
      {t.bushes.map((b, k) => (
        <Circle key={k} cx={b.x} cy={b.y} r={b.r} fill={b.light ? '#6FA587' : '#4F8B6B'} />
      ))}
      <Path d={t.d} stroke="#EFE8D6" strokeWidth={t.roadW + 12} fill="none" strokeLinejoin="round" />
      <Path d={t.d} stroke="#6B7380" strokeWidth={t.roadW} fill="none" strokeLinejoin="round" />
      <Path d={t.d} stroke="#FFFFFF" strokeWidth={4} fill="none" strokeDasharray={`${t.period * 0.45} ${t.period * 0.55}`} strokeDashoffset={-t.pre} />
      {t.mist.map((m, k) => (
        <Rect key={k} x={m.x} y={m.y} width={w * 0.65} height={20} rx={10} fill="#FFFFFF" opacity={0.35} />
      ))}
    </Svg>
  );
}

function Sign({ th, label, state, onPress, left }: { th: string; label: string; state: 'idle' | 'ok' | 'bad' | 'dim'; onPress: () => void; left: boolean }) {
  const bg = state === 'ok' ? '#2DBE78' : state === 'bad' ? '#D93A3F' : '#FFC83D';
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = state === 'ok' ? withSequence(withTiming(1.18, { duration: 120 }), withSpring(1.08, { damping: 8 })) : withSpring(state === 'dim' ? 0.94 : 1);
  }, [state, scale]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const size = th.length > 5 ? 17 : th.length > 3 ? 22 : 28;
  return (
    <Animated.View entering={ZoomIn.springify().damping(11)} style={[{ position: 'absolute', top: 0, [left ? 'left' : 'right']: 12 }, st]}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: SIGN, height: SIGN, alignItems: 'center', justifyContent: 'center', opacity: state === 'dim' ? 0.7 : 1 }}>
        <View style={{ width: 4, height: 30, backgroundColor: '#5E6672', position: 'absolute', bottom: -4 }} />
        <View style={{ width: 86, height: 86, borderRadius: 14, backgroundColor: bg, transform: [{ rotate: '45deg' }], borderWidth: 3, borderColor: color.tinta, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 72, height: 72, borderRadius: 9, borderWidth: 2, borderColor: color.tinta, opacity: 0.35 }} />
        </View>
        <View style={{ position: 'absolute', maxWidth: 96, alignItems: 'center' }}>
          <Th size={size} bold numberOfLines={1} style={{ color: state === 'idle' || state === 'dim' ? color.tinta : '#FFFFFF' }}>{th}</Th>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Juego 16 · 1.864 curvas: la carretera serpentea, tocas la señal correcta y la camioneta toma la curva. */
export default function Curvas({ mode, words, focus, rounds, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const reduced = useReducedMotion();
  const dims = useWindowDimensions();
  const [size, setSize] = useState({ w: dims.width, h: dims.height });
  const w = size.w;
  const h = size.h;
  const horizon = Math.round(h * 0.26);
  const tile = Math.max(720, Math.ceil(h - horizon) + 40);
  const goal = mode === 'feria' ? Infinity : rounds ?? 8;

  const pool = useMemo(() => {
    const m = new Map<string, Word>();
    for (const x of [...focus, ...words]) if (x.th && !m.has(x.th)) m.set(x.th, x);
    return [...m.values()];
  }, [words, focus]);
  const byTh = useMemo(() => new Map(pool.map((x) => [x.th, x])), [pool]);
  const queue = useRef<Word[]>([]);
  const state = useRef({ curves: 0, lives: 3, over: false });

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
    if (!other) other = shuffle(pool.filter((x) => x.th !== target.th && x.es !== target.es))[0];
    if (!other) return null;
    const correct: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
    return { target, options: correct === 0 ? [target, other] : [other, target], correct, minimal };
  };

  const [q, setQ] = useState<Q | null>(() => makeQ());
  const [curves, setCurves] = useState(0);
  const [lives, setLives] = useState(3);
  const [fb, setFb] = useState<Fb | null>(null);
  const [locked, setLocked] = useState(false);
  const [kmh, setKmh] = useState(40);
  const [qKey, setQKey] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const all = timers.current;
    return () => all.forEach(clearTimeout);
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const offset = useSharedValue(0);
  const speedPx = useSharedValue(0);
  const tileSv = useSharedValue(tile);
  const ampSv = useSharedValue(w * 0.14);
  const wSv = useSharedValue(w);
  const steerX = useSharedValue(0);
  const steerRot = useSharedValue(0);
  const jit = useSharedValue(0);
  const truckY = h - 80 - TRUCK_H / 2 - horizon;
  const truckYSv = useSharedValue(truckY);

  useEffect(() => {
    tileSv.value = tile;
    ampSv.value = w * 0.14;
    wSv.value = w;
    truckYSv.value = truckY;
  }, [tile, w, truckY, tileSv, ampSv, wSv, truckYSv]);

  useEffect(() => {
    speedPx.value = reduced ? 0 : withTiming(kmh * KMH_TO_PX, { duration: 700 });
  }, [kmh, reduced, speedPx]);

  useFrameCallback((f) => {
    const dt = (f.timeSincePreviousFrame ?? 16) / 1000;
    offset.value = (offset.value + speedPx.value * dt) % tileSv.value;
  });

  const roadStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const sceneStyle = useAnimatedStyle(() => ({ transform: [{ translateX: jit.value }] }));
  const truckStyle = useAnimatedStyle(() => {
    const arg = (4 * Math.PI * (truckYSv.value - offset.value)) / tileSv.value;
    const follow = ampSv.value * Math.sin(arg);
    const slope = ampSv.value * ((4 * Math.PI) / tileSv.value) * Math.cos(arg);
    const deg = -Math.atan(slope) * (180 / Math.PI) * 0.35;
    return { transform: [{ translateX: follow + steerX.value }, { rotate: `${deg + steerRot.value}deg` }] };
  });

  const finish = () => {
    state.current.over = true;
    const r = score.result(state.current.curves);
    onDone({ ...r, score: state.current.curves });
  };

  const answer = (side: 0 | 1) => {
    if (locked || !q || state.current.over) return;
    setLocked(true);
    const ok = side === q.correct;
    const lane = w * 0.15;
    setFb({ side, ok });
    score.hit(ok);
    onAnswer(ok, q.target.id);
    steerX.value = withSpring(side === 0 ? -lane : lane, { damping: 14, stiffness: 120 });
    steerRot.value = withSpring(side === 0 ? -9 : 9, { damping: 12 });
    const s = state.current;
    if (ok) {
      s.curves += 1;
      setCurves(s.curves);
      setKmh(Math.min(120, 40 + s.curves * 4));
      say(q.target.th);
    } else {
      fx.bad();
      speedPx.value = withSequence(withTiming(30, { duration: 160 }), withTiming(kmh * KMH_TO_PX, { duration: 800 }));
      steerRot.value = withSequence(withTiming(side === 0 ? -24 : 24, { duration: 110 }), withTiming(side === 0 ? 20 : -20, { duration: 130 }), withTiming(0, { duration: 160 }));
      jit.value = withSequence(withTiming(-7, { duration: 50 }), withTiming(7, { duration: 60 }), withTiming(-5, { duration: 60 }), withTiming(4, { duration: 60 }), withTiming(0, { duration: 60 }));
      if (mode === 'feria') {
        s.lives -= 1;
        setLives(s.lives);
      } else queue.current.splice(2, 0, q.target);
    }
    const end = (mode === 'feria' && s.lives <= 0) || (ok && s.curves >= goal);
    later(() => {
      steerX.value = withSpring(0, { damping: 14 });
      steerRot.value = withSpring(0, { damping: 14 });
    }, ok ? 650 : 800);
    later(() => {
      if (end) {
        finish();
        return;
      }
      setFb(null);
      setQ(makeQ());
      setQKey((k) => k + 1);
      setLocked(false);
    }, ok ? 1050 : 1250);
  };

  if (!q) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Txt v="h2">Aún faltan palabras</Txt>
        <Btn label="Continuar" onPress={() => onDone(score.result(0))} />
      </View>
    );
  }

  const signState = (side: 0 | 1): 'idle' | 'ok' | 'bad' | 'dim' => {
    if (!fb) return 'idle';
    if (side === q.correct) return 'ok';
    return fb.side === side ? 'bad' : 'dim';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#8FC28A', overflow: 'hidden' }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, sceneStyle]}>
        <Svg width={w} height={horizon + 30} viewBox="0 0 390 300" preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', top: 0 }}>
          <Rect width={390} height={300} fill="#DCE8F2" />
          <Path d="M0 210 L70 160 L140 196 L220 140 L300 186 L390 150 L390 300 L0 300 Z" fill="#B9CCDE" />
          <Path d="M0 270 L90 220 L180 256 L270 214 L390 250 L390 300 L0 300 Z" fill="#7FB487" />
        </Svg>
        <View style={{ position: 'absolute', top: horizon, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: tile * 2 }, roadStyle]}>
            <View style={{ position: 'absolute', top: 0 }}>
              <RoadTile w={w} tile={tile} />
            </View>
            <View style={{ position: 'absolute', top: -tile }}>
              <RoadTile w={w} tile={tile} />
            </View>
          </Animated.View>
        </View>
        <MistBand top={horizon - 8} width={w} height={22} opacity={0.6} />

        <View style={{ position: 'absolute', left: 0, right: 0, top: horizon + 20, bottom: 0, flexDirection: 'row' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Girar a la izquierda" onPress={() => answer(0)} style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Girar a la derecha" onPress={() => answer(1)} style={{ flex: 1 }} />
        </View>

        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: (w - TRUCK_W) / 2, top: h - 80 - TRUCK_H, width: TRUCK_W, height: TRUCK_H }, truckStyle]}>
          <View style={{ position: 'absolute', left: 26, top: -6 }}>
            <Noi pose="hola" size={84} still={reduced ?? false} />
          </View>
          <View style={{ position: 'absolute', left: 6, top: 56, width: 120, height: 92, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: '#D9453F', borderBottomWidth: 10, borderBottomColor: '#B2332E' }} />
          <View style={{ position: 'absolute', left: 0, top: 50, width: 132, height: 12, borderRadius: 6, backgroundColor: '#9E2B27' }} />
          <View style={{ position: 'absolute', left: 22, top: 88, width: 88, height: 22, borderRadius: 6, backgroundColor: '#F6E8CC', alignItems: 'center', justifyContent: 'center' }}>
            <Th size={11} bold style={{ color: '#9E2B27', lineHeight: 14 }} numberOfLines={1}>แม่ฮ่องสอน</Th>
          </View>
          <View style={{ position: 'absolute', left: 10, top: 140, width: 26, height: 22, borderRadius: 6, backgroundColor: color.tinta }} />
          <View style={{ position: 'absolute', right: 10, top: 140, width: 26, height: 22, borderRadius: 6, backgroundColor: color.tinta }} />
          <View style={{ position: 'absolute', left: 14, top: 122, width: 14, height: 10, borderRadius: 4, backgroundColor: '#FFC83D' }} />
          <View style={{ position: 'absolute', right: 14, top: 122, width: 14, height: 10, borderRadius: 4, backgroundColor: '#FFC83D' }} />
        </Animated.View>

        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#FFFFFF' }}>
              <Art name="curva" size={26} />
              <Txt v="num" style={{ fontSize: 20 }}>{curves}</Txt>
            </View>
            <View style={{ flex: 1 }} />
            {mode === 'feria' ? (
              <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={`${lives} vidas`}>
                {[0, 1, 2].map((k) => (
                  <Icon key={k} name="heart" size={22} color={k < lives ? color.laca : color.niebla4} />
                ))}
              </View>
            ) : (
              <Txt v="small" style={{ color: color.tinta }}>{curves} / {goal}</Txt>
            )}
            <View style={{ height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: color.tinta, justifyContent: 'center' }}>
              <Txt v="small" style={{ color: '#FFFFFF' }}>{kmh} km/h</Txt>
            </View>
            {score.combo >= 2 ? (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <ComboBadge combo={score.combo} />
              </View>
            ) : null}
          </View>

          <View style={{ marginHorizontal: 20, marginTop: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt v="small">¿Cuál es…</Txt>
            <Txt v="h2" style={{ fontSize: 24, flexShrink: 1 }} numberOfLines={1}>«{q.target.es}»?</Txt>
            {q.minimal ? (
              <View style={{ marginLeft: 'auto', backgroundColor: color.niebla2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Txt v="small" style={{ fontSize: 12, color: color.tinta2 }}>ojo al tono</Txt>
              </View>
            ) : null}
          </View>

          <View pointerEvents="box-none" style={{ marginTop: 22, height: SIGN + 10 }}>
            <Sign key={`l${qKey}`} left th={q.options[0].th} label={`Señal izquierda: ${q.options[0].th}`} state={signState(0)} onPress={() => answer(0)} />
            <Sign key={`r${qKey}`} left={false} th={q.options[1].th} label={`Señal derecha: ${q.options[1].th}`} state={signState(1)} onPress={() => answer(1)} />
          </View>

          {fb?.ok ? (
            <Animated.View key={curves} entering={ZoomIn.springify().damping(9)} exiting={FadeOut} style={{ alignSelf: 'center', marginTop: 40, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
              <Art name="curva" size={30} />
              <Txt v="h3">Curva {curves}</Txt>
            </Animated.View>
          ) : null}
        </View>

        <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: 26, alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 14, height: 34, justifyContent: 'center' }}>
            <Txt v="small" style={{ color: color.tinta2 }}>Toca la señal correcta para tomar la curva</Txt>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
