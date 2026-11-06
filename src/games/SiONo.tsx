import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { Extrapolation, FadeIn, ZoomIn, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Rom, Sticker, Th, Txt } from '@/components/ui';
import type { Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

const FERIA_SECONDS = 45;
const THRESHOLD = 110;

type Deal = { word: Word; shown: string; truth: boolean };

function deal(pool: Word[], focus: Word[], i: number): Deal {
  const base = focus.length && Math.random() < 0.6 ? focus : pool;
  const word = base[Math.floor(Math.random() * base.length)] ?? pool[0];
  const others = pool.filter((w) => w.es !== word.es);
  const truth = others.length === 0 || Math.random() < 0.5;
  const shown = truth ? word.es : others[Math.floor(Math.random() * others.length)].es;
  void i;
  return { word, shown, truth };
}

function TimerRing({ left, total }: { left: number; total: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: 54, height: 54, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={54} height={54} viewBox="0 0 54 54" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={27} cy={27} r={r} stroke={color.niebla3} strokeWidth={6} fill="none" />
        <Circle cx={27} cy={27} r={r} stroke={left <= 10 ? color.laca : color.farol} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={c * (1 - Math.max(0, left) / total)} />
      </Svg>
      <Txt v="num" style={{ fontSize: 17 }}>{Math.max(0, left)}</Txt>
    </View>
  );
}

function SwipeCard({ d, onDecide, registerFly }: { d: Deal; onDecide: (yes: boolean) => void; registerFly: (fn: (yes: boolean) => void) => void }) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const gone = useRef(false);
  const decide = useRef(onDecide);
  useEffect(() => {
    decide.current = onDecide;
  });

  const fly = (yes: boolean) => {
    if (gone.current) return;
    gone.current = true;
    fx.whoosh();
    x.value = withTiming((yes ? 1 : -1) * (width + 200), { duration: 240 });
    setTimeout(() => decide.current(yes), 200);
  };
  useEffect(() => {
    registerFly(fly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
        onPanResponderMove: (_, g) => {
          if (gone.current) return;
          x.value = g.dx;
          y.value = g.dy * 0.25;
        },
        onPanResponderRelease: (_, g) => {
          if (gone.current) return;
          if (Math.abs(g.dx) > THRESHOLD || Math.abs(g.vx) > 0.9) fly(g.dx > 0);
          else {
            x.value = withSpring(0, { damping: 12, stiffness: 180 });
            y.value = withSpring(0, { damping: 12, stiffness: 180 });
          }
        },
        onPanResponderTerminate: () => {
          x.value = withSpring(0);
          y.value = withSpring(0);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const card = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${interpolate(x.value, [-220, 0, 220], [-14, 0, 14], Extrapolation.CLAMP)}deg` }],
  }));
  const yes = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [30, THRESHOLD], [0, 1], Extrapolation.CLAMP), transform: [{ rotate: '-12deg' }, { scale: interpolate(x.value, [30, THRESHOLD], [0.7, 1], Extrapolation.CLAMP) }] }));
  const no = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-THRESHOLD, -30], [1, 0], Extrapolation.CLAMP), transform: [{ rotate: '12deg' }, { scale: interpolate(x.value, [-THRESHOLD, -30], [1, 0.7], Extrapolation.CLAMP) }] }));

  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={[{ width: '100%', maxWidth: 360 }, card]} {...pan.panHandlers}>
      <View
        accessible
        accessibilityLabel={`${d.word.th}, ${d.word.rom}, igual a ${d.shown}. Desliza a la derecha si es correcto, a la izquierda si no.`}
        style={{ backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 2, borderColor: color.niebla3, borderBottomWidth: 6, paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center', gap: 6, minHeight: 300, justifyContent: 'center' }}>
        <Sticker emoji={d.word.emoji} size={84} bg={color.niebla} />
        <Th size={44} bold>{d.word.th}</Th>
        <Rom rom={d.word.rom} size={18} />
        <Txt v="h2" style={{ marginTop: 8, textAlign: 'center' }}>= {d.shown}</Txt>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 22, left: 18, borderWidth: 4, borderColor: color.arrozalVivo, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2 }, yes]}>
          <Th size={30} bold style={{ color: color.arrozalVivo }}>ใช่</Th>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 22, right: 18, borderWidth: 4, borderColor: color.laca, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2 }, no]}>
          <Th size={30} bold style={{ color: color.laca }}>บ่</Th>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** Juego 4 · ¿Sí o บ่?: desliza la tarjeta según sea correcta la traducción. */
export default function SiONo({ mode, words, focus, rounds = 8, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const [cards, setCards] = useState<Deal[]>(() => Array.from({ length: feria ? 2 : rounds }, (_, i) => deal(words, focus, i)));
  const [i, setI] = useState(0);
  const [time, setTime] = useState(FERIA_SECONDS);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const [jump, setJump] = useState(0);
  const flyRef = useRef<(yes: boolean) => void>(() => {});
  const finished = useRef(false);
  const pts = useRef(0);
  const fbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone(score.result(pts.current));
  };

  useEffect(() => {
    if (!feria) return;
    const t = setInterval(() => setTime((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [feria]);
  useEffect(() => {
    if (feria && time <= 0) finish();
  });
  useEffect(
    () => () => {
      if (fbTimer.current) clearTimeout(fbTimer.current);
    },
    [],
  );

  const d = cards[i];
  if (!d) return null;

  const decide = (yes: boolean) => {
    if (finished.current) return;
    const ok = yes === d.truth;
    score.hit(ok);
    onAnswer(ok, d.word.id);
    if (ok) {
      pts.current += 10;
      setJump((j) => j + 1);
    }
    say(d.word.th);
    setFb({ ok, text: d.truth ? `Sí: ${d.word.th} = ${d.word.es}` : `บ่: ${d.word.th} es «${d.word.es}»` });
    if (fbTimer.current) clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFb(null), 1500);
    if (feria) {
      setCards((c) => [...c, deal(words, focus, c.length)]);
      setI(i + 1);
    } else if (i + 1 >= cards.length) {
      finish();
    } else setI(i + 1);
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <GameTitle title="¿Sí o บ่?" sub="บ่ (bɔ̀ɔ) es «no» en el norte. ¿La traducción es correcta?" />
        </View>
        <ComboBadge combo={score.combo} />
        {feria ? <TimerRing left={time} total={FERIA_SECONDS} /> : null}
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <SwipeCard key={i} d={d} onDecide={decide} registerFly={(fn) => (flyRef.current = fn)} />
        {fb ? (
          <Animated.View key={`${i}-${fb.text}`} entering={FadeIn.duration(120)} style={{ position: 'absolute', bottom: 0, backgroundColor: fb.ok ? color.arrozalSuave : color.lacaSuave, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Th size={16} style={{ color: fb.ok ? color.arrozalHondo : color.lacaHondo, lineHeight: 24 }}>{fb.text}</Th>
          </Animated.View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 22 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="บ่, no" onPress={() => flyRef.current(false)} style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: color.laca, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={30} color={color.laca} stroke={3.4} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Noi pose={score.combo >= 3 ? 'celebra' : 'feliz'} size={92} jump={jump} />
          <Txt v="small">{feria ? `${score.correct} aciertos` : `${i + 1} / ${cards.length}`}</Txt>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="ใช่, sí" onPress={() => flyRef.current(true)} style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: color.arrozalVivo, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={32} color="#FFFFFF" stroke={3.4} />
        </Pressable>
      </View>
    </View>
  );
}
