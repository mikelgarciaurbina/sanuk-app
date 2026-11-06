import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Bar, Th, Txt } from '@/components/ui';
import { CONSONANTS, LETTER_SETS } from '@/content/letters';
import { fx, say } from '@/lib/audio';
import { clamp, rand, shuffle } from '@/lib/random';

import { ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

const FERIA_SECONDS = 90;
const BOARD_H = 380;
const LIGHT_R = 118;
const ROCK = 58;

/** Grupos de letras que se confunden a primera vista. */
const LOOKALIKES = ['กถภ', 'บปษ', 'ดคต', 'มนห', 'ชซ', 'ผฝพฟ', 'ขฃ', 'ฎฏ', 'ฉฐ', 'ยธ', 'วอ', 'รธ'];

type Round = { target: string; letters: { ch: string; x: number; y: number }[] };

function makeRound(target: string, pool: string[]): Round {
  const chosen = new Set<string>([target]);
  const similar = LOOKALIKES.filter((g) => g.includes(target))
    .flatMap((g) => [...g])
    .filter((c) => c !== target);
  for (const c of shuffle(similar)) if (chosen.size < 4) chosen.add(c);
  const want = 7 + Math.floor(Math.random() * 3);
  for (const c of shuffle(pool)) if (chosen.size < want) chosen.add(c);
  const all = CONSONANTS.map((c) => c.ch);
  for (const c of shuffle(all)) if (chosen.size < want) chosen.add(c);
  // 3 × 3 casillas con holgura: ninguna roca se solapa con otra
  const cells = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, chosen.size);
  const list = shuffle([...chosen]);
  return {
    target,
    letters: list.map((ch, k) => {
      const col = cells[k] % 3;
      const row = Math.floor(cells[k] / 3);
      return { ch, x: (col + rand(0.3, 0.7)) / 3, y: (row + rand(0.32, 0.68)) / 3 };
    }),
  };
}

function Rock({ ch, x, y, light, state, onPress }: { ch: string; x: number; y: number; light: number; state: 'idle' | 'ok' | 'bad'; onPress: () => void }) {
  const reduced = useReducedMotion();
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);
  useEffect(() => {
    if (state === 'bad') {
      shake.value = reduced
        ? 0
        : withSequence(withTiming(-7, { duration: 50 }), withTiming(7, { duration: 60 }), withTiming(-5, { duration: 60 }), withTiming(0, { duration: 60 }));
    }
    if (state === 'ok') pop.value = reduced ? 1 : withSequence(withTiming(1.25, { duration: 120 }), withSpring(1.12, { damping: 8, stiffness: 240 }));
  }, [state, shake, pop, reduced]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }, { scale: pop.value }] }));
  const lit = state === 'ok' ? 1 : state === 'bad' ? 0.9 : light;
  return (
    <Animated.View style={[{ position: 'absolute', left: x - ROCK / 2, top: y - ROCK / 2, width: ROCK, height: ROCK }, anim]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Letra tallada en la roca"
        onPress={onPress}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: ROCK * 0.42,
          backgroundColor: state === 'ok' ? '#2F6E4E' : state === 'bad' ? '#6B2B3A' : '#4B4F73',
          borderWidth: 2,
          borderColor: state === 'ok' ? color.arrozalVivo : state === 'bad' ? color.laca : '#5E6390',
          opacity: 0.35 + lit * 0.65,
          shadowColor: state === 'ok' ? color.arrozalVivo : color.buatong,
          shadowOpacity: state === 'ok' ? 0.9 : lit * 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
        }}>
        <Th size={30} style={{ color: state === 'ok' ? '#FFFFFF' : `rgba(255, 233, 190, ${0.25 + lit * 0.75})` }}>
          {ch}
        </Th>
      </Pressable>
    </Animated.View>
  );
}

/** Juego «Cueva de las letras»: busca con la linterna la letra que te piden. */
export default function Cueva({ mode, extra, rounds = 5, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const { width: winW } = useWindowDimensions();
  const set = extra?.kind === 'letras' && LETTER_SETS[extra.set] ? extra.set : 'media';
  const pool = LETTER_SETS[set];
  const total = mode === 'feria' ? 12 : rounds;
  const list = useMemo(() => {
    const order: string[] = [];
    while (order.length < total) order.push(...shuffle(pool));
    return order.slice(0, total).map((t) => makeRound(t, pool));
  }, [pool, total]);

  const [i, setI] = useState(0);
  const [W, setW] = useState(Math.min(winW - 40, 520));
  const [light, setLight] = useState({ x: W / 2, y: BOARD_H / 2 });
  const [marks, setMarks] = useState<Record<string, 'ok' | 'bad'>>({});
  const [time, setTime] = useState(FERIA_SECONDS);
  const [jump, setJump] = useState(0);
  const answered = useRef(false);
  const locked = useRef(false);
  const finished = useRef(false);
  const boardRef = useRef<ComponentRef<typeof View>>(null);
  const origin = useRef({ x: 0, y: 0 });

  const r = list[i];
  const consonant = CONSONANTS.find((c) => c.ch === r?.target);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone(score.result(score.correct));
  };

  useEffect(() => {
    if (mode !== 'feria') return;
    const t = setInterval(() => setTime((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [mode]);
  useEffect(() => {
    if (mode === 'feria' && time <= 0) finish();
  });

  const measure = () => {
    boardRef.current?.measure((_x, _y, _w, _h, px, py) => {
      origin.current = { x: px, y: py };
    });
  };
  const onLayout = (e: LayoutChangeEvent) => {
    setW(e.nativeEvent.layout.width);
    measure();
  };

  const moveTo = (pageX: number, pageY: number) => {
    setLight({ x: clamp(pageX - origin.current.x, 0, W), y: clamp(pageY - origin.current.y, 0, BOARD_H) });
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 5,
        onPanResponderGrant: (e) => {
          const { pageX, pageY } = e.nativeEvent;
          boardRef.current?.measure((_x, _y, _w, _h, px, py) => {
            origin.current = { x: px, y: py };
            moveTo(pageX, pageY);
          });
        },
        onPanResponderMove: (_e, g) => moveTo(g.moveX, g.moveY),
        onPanResponderTerminationRequest: () => false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [W],
  );

  const tapLetter = (ch: string) => {
    if (!r || locked.current || finished.current) return;
    const ok = ch === r.target;
    if (!answered.current) {
      answered.current = true;
      score.hit(ok, false);
      onAnswer(ok, undefined);
    }
    if (!ok) {
      fx.bad();
      setMarks((m) => ({ ...m, [ch]: 'bad' }));
      return;
    }
    locked.current = true;
    fx.ok(score.combo);
    const name = CONSONANTS.find((c) => c.ch === ch)?.name;
    if (name) say(name);
    setMarks((m) => ({ ...m, [ch]: 'ok' }));
    setJump((j) => j + 1);
    setTimeout(() => {
      if (i + 1 >= list.length) {
        finish();
        return;
      }
      setI(i + 1);
      setMarks({});
      answered.current = false;
      locked.current = false;
      setLight({ x: W / 2, y: BOARD_H / 2 });
    }, 1100);
  };

  if (!r || !consonant) return null;
  const sound = consonant.sound === '(muda)' ? 'ɔɔ' : consonant.sound;

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <GameTitle dark title="Cueva de las letras" sub={mode === 'feria' ? `Letra ${i + 1} de ${list.length}` : 'Arrastra la linterna y toca la letra.'} />
        </View>
        <ComboBadge combo={score.combo} />
      </View>
      {mode === 'feria' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Bar value={time / FERIA_SECONDS} tint={color.farol} track="#F1E4D3" />
          <Txt v="num" style={{ width: 44, textAlign: 'right' }}>{Math.max(0, time)}</Txt>
        </View>
      ) : null}

      <View
        accessible
        accessibilityLabel={`Busca la letra ${sound} de ${consonant.meaning}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: color.niebla3 }}>
        <Noi pose={locked.current ? 'celebra' : 'piensa'} size={56} jump={jump} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="bodyStrong">Busca la «{sound}» de</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Th size={26}>{consonant.name}</Th>
            <Txt v="small">({consonant.meaning})</Txt>
          </View>
        </View>
      </View>

      <View
        ref={boardRef}
        onLayout={onLayout}
        {...pan.panHandlers}
        style={{ height: BOARD_H, borderRadius: 24, overflow: 'hidden', backgroundColor: color.noche, borderWidth: 2, borderColor: color.noche2 }}>
        <Svg width="100%" height="100%" style={{ position: 'absolute' }} pointerEvents="none">
          <Defs>
            <RadialGradient id="beam" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFE9A8" stopOpacity="0.55" />
              <Stop offset="0.6" stopColor="#FFC83D" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#FFC83D" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill={color.noche} />
          {[0.04, 0.2, 0.37, 0.55, 0.72, 0.9].map((p, k) => {
            const x = p * W;
            const hgt = 36 + ((k * 37) % 46);
            return <Path key={k} d={`M${x - 20} 0 L${x + 20} 0 L${x + 4 * (k % 2 ? 1 : -1)} ${hgt} Z`} fill={color.noche2} />;
          })}
          {[0.12, 0.46, 0.82].map((p, k) => (
            <Path key={`b${k}`} d={`M${p * W - 30} ${BOARD_H} L${p * W} ${BOARD_H - 30 - k * 8} L${p * W + 30} ${BOARD_H} Z`} fill={color.noche2} />
          ))}
          <Circle cx={light.x} cy={light.y} r={LIGHT_R} fill="url(#beam)" />
        </Svg>
        {r.letters.map((l) => {
          const px = l.x * W;
          const py = l.y * BOARD_H;
          const d = Math.hypot(px - light.x, py - light.y);
          const lit = clamp(1 - d / LIGHT_R, 0, 1);
          return <Rock key={`${i}-${l.ch}`} ch={l.ch} x={px} y={py} light={lit} state={marks[l.ch] ?? 'idle'} onPress={() => tapLetter(l.ch)} />;
        })}
        <View pointerEvents="none" style={{ position: 'absolute', left: light.x - 10, top: light.y - 10, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,233,168,0.9)' }} />
      </View>
    </View>
  );
}
