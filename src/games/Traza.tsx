import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Btn, Rom, SpeakBtn, Th, Txt } from '@/components/ui';
import { LETTER_SETS, TRACE } from '@/content/letters';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

type Pt = { x: number; y: number };
const TOL = 0.09;
const LIFT_MS = 1200;

function PulseRing({ size }: { size: number }) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    s.value = withRepeat(withSequence(withTiming(1.5, { duration: 650, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 650 })), -1, false);
  }, [reduced, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: 0.9 - (s.value - 1) * 1.3 }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size, borderWidth: 3, borderColor: color.azafran }, a]} />;
}

const toPath = (pts: Pt[]) => (pts.length ? `M${pts[0].x} ${pts[0].y}` + pts.slice(1).map((p) => ` L${p.x} ${p.y}`).join('') + (pts.length === 1 ? ` L${pts[0].x + 0.1} ${pts[0].y}` : '') : '');

/** Juego «Une los puntos»: traza la letra pasando por los puntos en orden. */
export default function Traza({ mode, extra, rounds, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const { width: winW } = useWindowDimensions();
  const S = Math.min(winW - 40, 340);
  const total = rounds ?? (mode === 'feria' ? 6 : 2);
  const list = useMemo(() => {
    const set = extra?.kind === 'letras' ? LETTER_SETS[extra.set] ?? [] : [];
    const inSet = shuffle(TRACE.filter((t) => set.includes(t.ch)));
    const rest = shuffle(TRACE.filter((t) => !set.includes(t.ch)));
    return [...inSet, ...rest].slice(0, Math.max(1, total));
  }, [extra, total]);

  const [i, setI] = useState(0);
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [next, setNext] = useState(0);
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);
  const [jump, setJump] = useState(0);
  const t = list[i];

  // Estado mutable que usa el PanResponder (se crea una sola vez por letra)
  const live = useRef({ next: 0, misses: 0, done: false, drawing: false, missed: new Set<number>(), timer: null as ReturnType<typeof setTimeout> | null, last: null as Pt | null });
  const boardRef = useRef<ComponentRef<typeof View>>(null);
  const origin = useRef({ x: 0, y: 0 });
  const glyph = useSharedValue(0);

  const reset = () => {
    const L = live.current;
    if (L.timer) clearTimeout(L.timer);
    L.next = 0;
    L.misses = 0;
    L.done = false;
    L.drawing = false;
    L.missed = new Set();
    L.timer = null;
    L.last = null;
    setStrokes([]);
    setNext(0);
    setMisses(0);
    setDone(false);
    glyph.value = 0;
  };

  useEffect(() => {
    reset();
    return () => {
      if (live.current.timer) clearTimeout(live.current.timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const miss = () => {
    const L = live.current;
    L.misses += 1;
    setMisses(L.misses);
    fx.bad();
  };

  const finish = () => {
    const L = live.current;
    L.done = true;
    setDone(true);
    glyph.value = withTiming(1, { duration: 700 });
    const stars = L.misses === 0 ? 3 : L.misses <= 2 ? 2 : 1;
    const ok = stars >= 2;
    score.hit(ok, false);
    fx.done();
    onAnswer(ok);
    setJump((j) => j + 1);
    say(t.name);
  };

  const handle = (p: Pt) => {
    const L = live.current;
    if (L.done) return;
    const tol = TOL * S;
    const dots = t.dots.map(([x, y]) => ({ x: (x / 100) * S, y: (y / 100) * S }));
    const dNext = Math.hypot(dots[L.next].x - p.x, dots[L.next].y - p.y);
    if (dNext < tol) {
      L.next += 1;
      setNext(L.next);
      fx.pop();
      if (L.next >= dots.length) {
        finish();
        return;
      }
    } else {
      // pasar claramente por un punto posterior sin haber llegado al que toca = fallo
      for (let k = L.next + 1; k < dots.length; k++) {
        if (L.missed.has(k)) continue;
        if (Math.hypot(dots[k].x - p.x, dots[k].y - p.y) < tol * 0.7) {
          L.missed.add(k);
          miss();
          break;
        }
      }
    }
  };

  const addPoint = (p: Pt, newStroke: boolean) => {
    const L = live.current;
    if (!newStroke && L.last && Math.hypot(L.last.x - p.x, L.last.y - p.y) < 2) return;
    L.last = p;
    setStrokes((s) => (newStroke ? [...s, [p]] : [...s.slice(0, -1), [...(s[s.length - 1] ?? []), p]]));
    handle(p);
  };

  const rel = (pageX: number, pageY: number): Pt => ({
    x: Math.max(0, Math.min(S, pageX - origin.current.x)),
    y: Math.max(0, Math.min(S, pageY - origin.current.y)),
  });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const L = live.current;
          if (L.timer) clearTimeout(L.timer);
          L.timer = null;
          const { pageX, pageY } = e.nativeEvent;
          boardRef.current?.measure((_x, _y, _w, _h, px, py) => {
            origin.current = { x: px, y: py };
            L.drawing = true;
            if (!L.done) addPoint(rel(pageX, pageY), true);
          });
        },
        onPanResponderMove: (_e, g) => {
          if (live.current.drawing && !live.current.done) addPoint(rel(g.moveX, g.moveY), false);
        },
        onPanResponderRelease: () => {
          const L = live.current;
          L.drawing = false;
          L.last = null;
          if (L.done) return;
          L.timer = setTimeout(() => {
            if (!L.done && !L.drawing) miss();
          }, LIFT_MS);
        },
        onPanResponderTerminate: () => {
          live.current.drawing = false;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i, S],
  );

  const glyphStyle = useAnimatedStyle(() => ({ opacity: glyph.value, transform: [{ scale: 0.92 + glyph.value * 0.08 }] }));

  const advance = () => {
    if (i + 1 >= list.length) {
      onDone(score.result(score.correct));
      return;
    }
    setI(i + 1);
  };

  if (!t) return null;
  const stars = misses === 0 ? 3 : misses <= 2 ? 2 : 1;

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <GameTitle title="Une los puntos" sub={mode === 'feria' ? `Letra ${i + 1} de ${list.length}` : 'Empieza por el bucle y sigue los números.'} />
        </View>
        <ComboBadge combo={score.combo} />
      </View>

      <View style={{ alignItems: 'center' }}>
        <View
          ref={boardRef}
          onLayout={() => boardRef.current?.measure((_x, _y, _w, _h, px, py) => (origin.current = { x: px, y: py }))}
          accessibilityLabel={`Tablero para trazar la letra ${t.meaning}`}
          {...pan.panHandlers}
          style={{ width: S, height: S, borderRadius: 24, backgroundColor: '#FFFDF7', borderWidth: 2, borderColor: '#E7C9A9', overflow: 'hidden' }}>
          <Svg width={S} height={S} pointerEvents="none" style={{ position: 'absolute' }}>
            {[0.25, 0.5, 0.75].map((p) => (
              <Line key={p} x1={0} x2={S} y1={S * p} y2={S * p} stroke={p === 0.5 ? '#F0C9A0' : '#EFDCC4'} strokeWidth={1.5} strokeDasharray={p === 0.5 ? undefined : '6 6'} />
            ))}
            {strokes.map((s, k) => (
              <Path key={k} d={toPath(s)} stroke={color.azafran} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={done ? 0.35 : 1} />
            ))}
          </Svg>
          {t.dots.map(([x, y], k) => {
            const reached = k < next;
            const isNext = k === next && !done;
            return (
              <View key={k} pointerEvents="none" style={{ position: 'absolute', left: (x / 100) * S - 13, top: (y / 100) * S - 13, width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                {isNext && k === 0 ? <PulseRing size={26} /> : null}
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: reached ? color.arrozalVivo : isNext ? color.azafran : '#FFFFFF',
                    borderWidth: 2,
                    borderColor: reached ? color.arrozal : isNext ? color.azafranHondo : color.tinta3,
                    opacity: done ? 0.4 : 1,
                  }}>
                  <Txt v="small" style={{ fontSize: 12, lineHeight: 14, color: reached ? '#FFFFFF' : color.tinta }}>{k + 1}</Txt>
                </View>
              </View>
            );
          })}
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }, glyphStyle]}>
            <Th size={S * 0.62} bold style={{ color: color.tinta }}>
              {t.ch}
            </Th>
          </Animated.View>
        </View>
      </View>

      <View style={{ minHeight: 110, justifyContent: 'center' }}>
        {done ? (
          <Animated.View entering={FadeInDown.springify().damping(14)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Noi pose="celebra" size={84} jump={jump} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {[0, 1, 2].map((k) => (
                  <Icon key={k} name="star" size={26} color={k < stars ? color.buatong : color.niebla3} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Th size={24}>{t.name}</Th>
                <SpeakBtn size={34} onPress={() => say(t.name)} />
              </View>
              <Rom rom={t.rom} />
              <Txt v="small">{t.meaning}</Txt>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Noi pose="piensa" size={72} still />
            <View style={{ flex: 1 }}>
              <Txt v="bodyStrong">{next === 0 ? 'Pon el dedo en el punto 1.' : `Ahora el punto ${next + 1}.`}</Txt>
              <Txt v="small">Fallos: {misses}</Txt>
            </View>
          </Animated.View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 28 }}>
        <Btn v="ghost" label="Borrar" style={{ flex: 1 }} onPress={reset} icon={<Icon name="refresh" size={20} color={color.tinta} />} />
        {done ? <Btn label={i + 1 >= list.length ? 'Terminar' : 'Siguiente'} style={{ flex: 1.4 }} onPress={advance} /> : null}
      </View>
    </View>
  );
}
