import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { Art } from '@/components/icons';
import { Th, Txt } from '@/components/ui';
import type { Word } from '@/content/types';
import { fx } from '@/lib/audio';
import { rand, shuffle } from '@/lib/random';

import { ComboBadge, useScore } from './kit';
import type { GameProps } from './types';

const DROP_W = 78;
const DROP_H = 94;
const FIELD_H = 104;
const SKY = '#5C7399';

type Drop = { id: number; word: Word; x: number; dur: number; t: number; bad?: boolean };
type Splash = { id: number; x: number; y: number };

function TearDrop({ tint = '#CFE6FF' }: { tint?: string }) {
  return (
    <Svg width={DROP_W} height={DROP_H} viewBox="0 0 78 94" style={StyleSheet.absoluteFill}>
      <Path d="M39 3 C39 3 8 40 8 62 C8 80 22 91 39 91 C56 91 70 80 70 62 C70 40 39 3 39 3 Z" fill={tint} stroke="#FFFFFF" strokeWidth={3} />
      <Path d="M22 58 C22 66 27 74 34 77" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.7} />
    </Svg>
  );
}

function FallingDrop({
  drop,
  fall,
  onTap,
  onLand,
}: {
  drop: Drop;
  fall: number;
  onTap: (d: Drop, y: number) => void;
  onLand: (d: Drop) => void;
}) {
  const y = useSharedValue(-DROP_H);
  const shake = useSharedValue(0);
  useEffect(() => {
    y.value = withTiming(fall, { duration: drop.dur, easing: Easing.linear });
    const t = setTimeout(() => onLand(drop), drop.dur);
    return () => {
      clearTimeout(t);
      cancelAnimation(y);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (drop.bad) {
      cancelAnimation(y);
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 60 }), withTiming(-6, { duration: 60 }), withTiming(0, { duration: 60 }));
    }
  }, [drop.bad, shake, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }, { translateY: y.value }] }));
  return (
    <Animated.View exiting={FadeOut.duration(160)} style={[{ position: 'absolute', left: drop.x, top: 0, width: DROP_W, height: DROP_H }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Gota: ${drop.word.th}`}
        disabled={drop.bad}
        onPress={() => onTap(drop, y.value)}
        style={{ width: DROP_W, height: DROP_H, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 22, opacity: drop.bad ? 0.5 : 1 }}>
        <TearDrop tint={drop.bad ? '#F4B7B7' : undefined} />
        <Th size={22} bold numberOfLines={1} style={{ lineHeight: 30 }}>
          {drop.word.th}
        </Th>
      </Pressable>
    </Animated.View>
  );
}

function SplashRings({ x, y }: { x: number; y: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
  }, [t]);
  const r1 = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ scale: 0.3 + t.value * 1.4 }] }));
  const r2 = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ scale: 0.3 + t.value * 2 }] }));
  const plus = useAnimatedStyle(() => ({ opacity: 1 - t.value * t.value, transform: [{ translateY: -60 * t.value }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x + DROP_W / 2 - 40, top: y + DROP_H - 40, width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#FFFFFF' }, r1]} />
      <Animated.View style={[{ position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#BFE3FF' }, r2]} />
      <Animated.View style={plus}>
        <Txt v="num" style={{ color: '#FFFFFF' }}>+10</Txt>
      </Animated.View>
    </View>
  );
}

function Streak({ x, delay, h }: { x: number; delay: number; h: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false));
  }, [t, delay]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: t.value * (h + 40) - 30 }] }));
  return <Animated.View style={[{ position: 'absolute', left: x, top: 0, width: 2, height: 22, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)' }, s]} />;
}

function Rain({ w, h }: { w: number; h: number }) {
  const reduced = useReducedMotion();
  const streaks = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ x: rand(0, w), delay: rand(0, 900), i })), [w]);
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {streaks.map((s) => (
        <Streak key={s.i} x={s.x} delay={s.delay} h={h} />
      ))}
    </View>
  );
}

function Terraces({ w, grow }: { w: number; grow: number }) {
  const g = Math.min(1, grow);
  return (
    <Svg width={w} height={FIELD_H} viewBox={`0 0 ${w} ${FIELD_H}`} style={{ position: 'absolute', left: 0, bottom: 0 }} pointerEvents="none">
      <Path d={`M0 30 Q${w * 0.3} 6 ${w * 0.6} 22 T${w} 14 V${FIELD_H} H0 Z`} fill="#4F8B6B" />
      <Path d={`M0 56 Q${w * 0.35} 36 ${w * 0.7} 50 T${w} 42 V${FIELD_H} H0 Z`} fill={g > 0.5 ? '#6FA587' : '#7FA392'} />
      <Path d={`M0 80 Q${w * 0.4} 66 ${w * 0.75} 78 T${w} 70 V${FIELD_H} H0 Z`} fill={g > 0.2 ? '#8CC58F' : '#9CBFB3'} />
      {Array.from({ length: Math.round(2 + g * 10) }, (_, i) => (
        <Ellipse key={i} cx={20 + ((i * 53) % Math.max(60, w - 40))} cy={70 + ((i * 17) % 22)} rx={5} ry={9} fill="#2DBE78" />
      ))}
    </Svg>
  );
}

function buildPrompts(words: Word[], focus: Word[], n: number): Word[] {
  const seen = new Set<string>();
  const list: Word[] = [];
  for (const w of [...shuffle(focus), ...shuffle(words)]) {
    if (seen.has(w.es) || seen.has(w.th)) continue;
    seen.add(w.es);
    seen.add(w.th);
    list.push(w);
    if (list.length >= n) break;
  }
  return list;
}

/** Juego 3 · Monzón: toca la gota con la palabra que te piden antes de que riegue el arrozal. */
export default function Monzon({ mode, words, focus, rounds = 8, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const [size, setSize] = useState({ w: 360, h: 560 });
  const [drops, setDropsState] = useState<Drop[]>([]);
  const [splashes, setSplashes] = useState<Splash[]>([]);
  const [lives, setLives] = useState(3);
  const [points, setPoints] = useState(0);
  const [n, setN] = useState(0);
  const [prompt, setPrompt] = useState<Word | null>(null);

  const dropsRef = useRef<Drop[]>([]);
  const g = useRef({ id: 0, n: 0, lives: 3, done: false, points: 0, size: { w: 360, h: 560 }, prompt: null as Word | null });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prompts = useMemo(() => (feria ? [] : buildPrompts(words, focus, rounds)), [feria, words, focus, rounds]);
  const pool = useMemo(() => {
    const seen = new Set<string>();
    return words.filter((w) => !seen.has(w.es) && (seen.add(w.es), true));
  }, [words]);

  const setDrops = (fn: (d: Drop[]) => Drop[]) => {
    dropsRef.current = fn(dropsRef.current);
    setDropsState(dropsRef.current);
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const durFor = (k: number) => (feria ? Math.max(2800, 6800 - k * 170) : 7600);
  const speed = feria ? (6800 / durFor(n)).toFixed(1).replace('.', ',') : null;

  const spawn = (word: Word) => {
    const s = g.current;
    const lane = Math.floor(rand(0, Math.max(1, (s.size.w - DROP_W) / (DROP_W * 0.7))));
    const x = Math.min(s.size.w - DROP_W - 6, 6 + lane * DROP_W * 0.7 + rand(0, 10));
    // evita encimar gotas recién nacidas
    const clash = dropsRef.current.some((d) => Math.abs(d.x - x) < DROP_W * 0.7 && Date.now() - d.t < 1400);
    const drop: Drop = { id: ++s.id, word, x: clash ? (x + DROP_W * 1.4) % (s.size.w - DROP_W) : x, dur: durFor(s.n) * rand(0.92, 1.08), t: Date.now() };
    setDrops((d) => [...d, drop]);
  };

  const nextPrompt = () => {
    const s = g.current;
    if (s.done) return;
    let word: Word | undefined;
    if (feria) word = pool[Math.floor(Math.random() * pool.length)];
    else {
      if (s.n >= prompts.length) {
        s.done = true;
        later(() => onDone(score.result(s.points)), 500);
        return;
      }
      word = prompts[s.n];
    }
    if (!word) return;
    s.prompt = word;
    setPrompt(word);
    setN(s.n);
    if (!dropsRef.current.some((d) => d.word.es === word!.es && !d.bad)) spawn(word);
  };

  const finish = () => {
    const s = g.current;
    if (s.done) return;
    s.done = true;
    later(() => onDone(score.result(s.points)), 600);
  };

  useEffect(() => {
    if (pool.length === 0) return;
    nextPrompt();
    let alive = true;
    const loop = () => {
      if (!alive || g.current.done) return;
      const s = g.current;
      const target = s.prompt;
      const others = pool.filter((w) => w.es !== target?.es);
      const pickTarget = target && Math.random() < 0.3;
      const w = pickTarget ? target! : others[Math.floor(Math.random() * others.length)] ?? target;
      if (w) spawn(w);
      const gap = feria ? Math.max(650, 1500 - s.n * 40) : 1800;
      timers.current.push(setTimeout(loop, gap));
    };
    timers.current.push(setTimeout(loop, 900));
    const list = timers.current;
    return () => {
      alive = false;
      list.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  const loseLife = () => {
    const s = g.current;
    s.lives -= 1;
    setLives(s.lives);
    if (feria && s.lives <= 0) finish();
  };

  const advance = () => {
    const s = g.current;
    s.n += 1;
    nextPrompt();
  };

  const tap = (d: Drop, y: number) => {
    const s = g.current;
    if (s.done || !s.prompt) return;
    if (d.word.es === s.prompt.es) {
      score.hit(true);
      onAnswer(true, d.word.id);
      fx.pop();
      s.points += 10;
      setPoints(s.points);
      setDrops((l) => l.filter((x) => x.id !== d.id));
      const sp = { id: d.id, x: d.x, y: Math.min(y, s.size.h - FIELD_H - DROP_H) };
      setSplashes((l) => [...l, sp]);
      later(() => setSplashes((l) => l.filter((x) => x.id !== sp.id)), 800);
      advance();
    } else {
      score.hit(false);
      onAnswer(false, s.prompt.id);
      setDrops((l) => l.map((x) => (x.id === d.id ? { ...x, bad: true } : x)));
      later(() => setDrops((l) => l.filter((x) => x.id !== d.id)), 450);
      if (feria) loseLife();
    }
  };

  const land = (d: Drop) => {
    const s = g.current;
    if (s.done) return;
    setDrops((l) => l.filter((x) => x.id !== d.id));
    if (s.prompt && d.word.es === s.prompt.es && !d.bad) {
      score.hit(false);
      onAnswer(false, d.word.id);
      if (feria) {
        loseLife();
        if (s.lives > 0) advance();
      } else {
        // en la lección la gota vuelve a caer, más despacio, hasta que la toques
        spawn(d.word);
      }
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    g.current.size = { w: width, h: height };
    setSize({ w: width, h: height });
  };

  const fall = size.h - FIELD_H - DROP_H + 30;

  return (
    <View style={{ flex: 1, backgroundColor: SKY }} onLayout={onLayout}>
      <Rain w={size.w} h={size.h} />
      <Terraces w={size.w} grow={feria ? points / 300 : n / Math.max(1, prompts.length)} />
      {drops.map((d) => (
        <FallingDrop key={d.id} drop={d} fall={fall} onTap={tap} onLand={land} />
      ))}
      {splashes.map((s) => (
        <SplashRings key={s.id} x={s.x} y={s.y} />
      ))}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, top: 8, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 4, minWidth: 100 }}>
            {feria
              ? [0, 1, 2].map((i) => (
                  <View key={i} style={{ opacity: i < lives ? 1 : 0.22 }}>
                    <Art name="paraguas" size={30} />
                  </View>
                ))
              : (
                <Txt v="num" style={{ color: '#FFFFFF' }}>
                  {Math.min(n + 1, prompts.length)} / {prompts.length}
                </Txt>
              )}
          </View>
          <ComboBadge combo={score.combo} />
          <Txt v="num" style={{ color: '#FFFFFF', minWidth: 100, textAlign: 'right' }}>{points}</Txt>
        </View>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }}>
          <Txt v="h2">
            Toca: «{prompt?.es ?? '…'}»
          </Txt>
        </View>
      </View>
      {feria ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt v="small" style={{ color: '#FFFFFF' }}>Velocidad ×{speed}</Txt>
          <Txt v="small" style={{ color: '#FFFFFF' }}>Racha {score.combo}</Txt>
        </View>
      ) : null}
    </View>
  );
}
