import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Rom, Sticker, Th, Txt } from '@/components/ui';
import { WORDS } from '@/content';
import { CLASSIFIERS, CLASSIFIER_ITEMS } from '@/content/drills';
import { say } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { thaiNumber, thaiNumberRom } from '@/lib/thai';

import { AnswerSheet, ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

type Item = (typeof CLASSIFIER_ITEMS)[number];
type Clf = (typeof CLASSIFIERS)[number];
type Round = { item: Item; n: number; baskets: Clf[] };

const NUM_ES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco'];
const FLY = 56;

function plural(es: string): string {
  const [first, ...rest] = es.split(' ');
  const p = /s$/.test(first) ? first : /[aeiouáéíóú]$/.test(first) ? `${first}s` : `${first}es`;
  return [p, ...rest].join(' ');
}

function makeRounds(n: number): Round[] {
  const items = shuffle(CLASSIFIER_ITEMS);
  return Array.from({ length: n }, (_, i) => {
    const item = items[i % items.length];
    const right = CLASSIFIERS.find((c) => c.clf === item.clf)!;
    const others = shuffle(CLASSIFIERS.filter((c) => c.clf !== item.clf)).slice(0, 5);
    return { item, n: 2 + Math.floor(Math.random() * 4), baskets: shuffle([right, ...others]) };
  });
}

function Basket({ clf, hint, wiggle, state, disabled, onPress, onLayout }: { clf: string; hint: string; wiggle: number; state: 'idle' | 'ok' | 'bad'; disabled: boolean; onPress: () => void; onLayout: (l: { x: number; y: number; width: number; height: number }) => void }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    if (wiggle > 0) rot.value = withSequence(withTiming(-9, { duration: 70 }), withTiming(9, { duration: 90 }), withTiming(-6, { duration: 80 }), withTiming(5, { duration: 80 }), withTiming(0, { duration: 70 }));
  }, [wiggle, rot]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const fill = state === 'ok' ? '#9BDDB8' : state === 'bad' ? '#F2A5A8' : '#E2BE7A';
  const dark = state === 'ok' ? color.arrozal : state === 'bad' ? color.laca : '#C99A4B';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Cesta ${clf}: ${hint}`}
      disabled={disabled}
      onPress={onPress}
      onLayout={(e) => onLayout(e.nativeEvent.layout)}
      style={{ width: '31.5%', alignItems: 'center', gap: 4, minHeight: 44 }}>
      <Animated.View style={[{ width: '100%', height: 74, alignItems: 'center', justifyContent: 'center' }, st]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 74" style={{ position: 'absolute' }}>
          <Path d="M10 20 L90 20 L82 68 Q50 76 18 68 Z" fill={fill} />
          <Path d="M14 36 H86 M16 50 H84 M30 20 L26 70 M50 20 V74 M70 20 L74 70" stroke={dark} strokeWidth={3} strokeLinecap="round" opacity={0.55} />
          <Rect x={6} y={14} width={88} height={10} rx={5} fill={dark} />
        </Svg>
        <Th size={26} bold style={{ color: '#4A3210', marginTop: 12 }}>{clf}</Th>
      </Animated.View>
      <Txt v="small" style={{ textAlign: 'center', fontSize: 12, lineHeight: 15 }} numberOfLines={2}>{hint}</Txt>
    </Pressable>
  );
}

/** Juego 12 · Cestas del mercado: cada cosa va en la cesta de su clasificador. */
export default function Cestas({ mode, rounds, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const total = mode === 'feria' ? 10 : rounds ?? 5;
  const list = useMemo(() => makeRounds(total), [total]);
  const [i, setI] = useState(0);
  const [pickIdx, setPickIdx] = useState<number | null>(null);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [flying, setFlying] = useState(false);
  const [wiggle, setWiggle] = useState<Record<number, number>>({});
  const busy = useRef(false);
  const cardL = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const gridL = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const cells = useRef<Record<number, { x: number; y: number; width: number; height: number }>>({});
  const fx_ = useSharedValue(0);
  const fy_ = useSharedValue(0);
  const fs_ = useSharedValue(1);
  const fo_ = useSharedValue(0);
  const r = list[i];

  const flyStyle = useAnimatedStyle(() => ({
    opacity: fo_.value,
    transform: [{ translateX: fx_.value }, { translateY: fy_.value }, { scale: fs_.value }],
  }));

  if (!r) return null;
  const { item, n } = r;
  const numTh = thaiNumber(n);
  const phrase = `${item.th} ${numTh} ${item.clf}`;
  const esPhrase = `${NUM_ES[n]} ${plural(item.es)}`;
  const clfInfo = CLASSIFIERS.find((c) => c.clf === item.clf)!;
  const wordId = Object.values(WORDS).find((w) => w.th === item.th)?.id;

  const tap = (k: number) => {
    if (busy.current || checked !== null) return;
    busy.current = true;
    const ok = r.baskets[k].clf === item.clf;
    const sx = cardL.current.x + 16 + 36 - FLY / 2;
    const sy = cardL.current.y + 16 + 36 - FLY / 2;
    const c = cells.current[k] ?? { x: 0, y: 0, width: 80, height: 70 };
    const tx = gridL.current.x + c.x + c.width / 2 - FLY / 2;
    const ty = gridL.current.y + c.y + 30 - FLY / 2;
    setPickIdx(k);
    say(item.th);
    fx_.value = sx;
    fy_.value = sy;
    fs_.value = 1;
    fo_.value = 1;
    setFlying(true);
    const ease = Easing.out(Easing.cubic);
    fx_.value = withTiming(tx, { duration: 420, easing: ease });
    fy_.value = withSequence(withTiming(Math.min(sy, ty) - 40, { duration: 200, easing: Easing.out(Easing.quad) }), withTiming(ty, { duration: 220, easing: Easing.in(Easing.quad) }));
    setTimeout(() => {
      if (ok) {
        fs_.value = withTiming(0.3, { duration: 200 });
        fo_.value = withTiming(0, { duration: 200 });
        setWiggle((w) => ({ ...w, [k]: (w[k] ?? 0) + 1 }));
      } else {
        fx_.value = withSpring(sx, { damping: 8, stiffness: 140 });
        fy_.value = withSpring(sy, { damping: 8, stiffness: 140 });
      }
      score.hit(ok);
      onAnswer(ok, wordId);
      setTimeout(() => {
        setFlying(false);
        fo_.value = 0;
        setChecked(ok);
      }, ok ? 320 : 650);
    }, 440);
  };

  const next = () => {
    if (i + 1 >= list.length) {
      onDone(score.result(score.correct));
      return;
    }
    setI(i + 1);
    setPickIdx(null);
    setChecked(null);
    setWiggle({});
    cells.current = {};
    busy.current = false;
  };

  const basketState = (k: number): 'idle' | 'ok' | 'bad' => {
    if (checked === null) return 'idle';
    if (r.baskets[k].clf === item.clf) return 'ok';
    return k === pickIdx ? 'bad' : 'idle';
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <GameTitle title="Cestas del mercado" sub="En thai, las cosas se cuentan con su clasificador. ¿En qué cesta va?" />
          </View>
          <ComboBadge combo={score.combo} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 6 }}>
          <Txt v="small">{i + 1} / {list.length}</Txt>
        </View>

        <View
          onLayout={(e) => (cardL.current = e.nativeEvent.layout)}
          style={{ marginHorizontal: 20, marginTop: 4, padding: 16, borderRadius: 24, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ opacity: flying ? 0 : 1 }}>
            <Sticker emoji={item.emoji} size={72} bg={color.niebla} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Th size={30}>{`${item.th} ${numTh}`}</Th>
              <View style={{ minWidth: 56, height: 38, borderRadius: 10, borderWidth: 2.5, borderStyle: checked !== null ? 'solid' : 'dashed', borderColor: checked === null ? color.niebla4 : checked ? color.arrozalVivo : color.laca, alignItems: 'center', justifyContent: 'center', backgroundColor: checked === null ? 'transparent' : checked ? color.arrozalSuave : color.lacaSuave }}>
                {checked !== null ? <Th size={24} bold>{item.clf}</Th> : null}
              </View>
            </View>
            <Rom rom={`${item.rom} ${thaiNumberRom(n)} ${checked !== null ? clfInfo.rom : '…'}`} />
            <Txt v="bodyStrong">{esPhrase}</Txt>
          </View>
        </View>

        <View
          onLayout={(e) => (gridL.current = e.nativeEvent.layout)}
          style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingHorizontal: 20, marginTop: 26 }}>
          {r.baskets.map((b, k) => (
            <Animated.View key={`${i}-${b.clf}`} entering={FadeInDown.delay(k * 50).springify().damping(13)} style={{ width: '31.5%' }}>
              <Basket
                clf={b.clf}
                hint={b.es}
                wiggle={wiggle[k] ?? 0}
                state={basketState(k)}
                disabled={checked !== null || flying}
                onPress={() => tap(k)}
                onLayout={(l) => (cells.current[k] = l)}
              />
            </Animated.View>
          ))}
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 28 }}>
          <Noi pose={checked === false ? 'ups' : checked ? 'celebra' : 'piensa'} size={64} />
          <Txt v="small" style={{ flex: 1 }}>Pista: piensa en qué tipo de cosa es, un animal, una persona, una fruta…</Txt>
        </View>

        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, zIndex: 5 }, flyStyle]}>
          <Sticker emoji={item.emoji} size={FLY} bg={color.niebla} />
        </Animated.View>
      </View>
      {checked !== null ? (
        <AnswerSheet
          ok={checked}
          th={phrase}
          rom={`${item.rom} ${thaiNumberRom(n)} ${clfInfo.rom}`}
          es={esPhrase}
          note={`Este objeto se cuenta con el clasificador de: ${clfInfo.es}.`}
          onNext={next}
        />
      ) : null}
    </View>
  );
}
