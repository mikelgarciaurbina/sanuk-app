import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Rom, Speech, Th, Txt } from '@/components/ui';
import type { Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

type Card = { key: string; pair: string; side: 'th' | 'es'; word: Word };

function makeCards(words: Word[], focus: Word[], pairs: number): Card[] {
  const byEs = new Map<string, Word>();
  for (const w of [...shuffle(focus), ...shuffle(words)]) if (!byEs.has(w.es) && byEs.size < pairs) byEs.set(w.es, w);
  const chosen = [...byEs.values()];
  return shuffle(
    chosen.flatMap((w) => [
      { key: `${w.id}-th`, pair: w.id, side: 'th' as const, word: w },
      { key: `${w.id}-es`, pair: w.id, side: 'es' as const, word: w },
    ]),
  );
}

function Flip({
  open,
  matched,
  w,
  h,
  card,
  onPress,
}: {
  open: boolean;
  matched: boolean;
  w: number;
  h: number;
  card: Card;
  onPress: () => void;
}) {
  const p = useSharedValue(0);
  const glow = useSharedValue(1);
  useEffect(() => {
    p.value = withTiming(open || matched ? 1 : 0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [open, matched, p]);
  useEffect(() => {
    if (matched) glow.value = withSequence(withTiming(1.06, { duration: 160 }), withTiming(1, { duration: 200 }));
  }, [matched, glow]);
  // Dos caras que se alternan a mitad del giro: funciona aunque backfaceVisibility falle en web.
  const back = useAnimatedStyle(() => ({
    opacity: p.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 700 }, { rotateY: `${p.value * 180}deg` }, { scale: glow.value }],
  }));
  const front = useAnimatedStyle(() => ({
    opacity: p.value < 0.5 ? 0 : 1,
    transform: [{ perspective: 700 }, { rotateY: `${p.value * 180 - 180}deg` }, { scale: glow.value }],
  }));
  const small = h < 90;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open || matched ? (card.side === 'th' ? `Thai: ${card.word.th}` : card.word.es) : 'Carta boca abajo'}
      disabled={open || matched}
      onPress={onPress}
      style={{ width: w, height: h + 4 }}>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: 16, backgroundColor: color.mohom, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderColor: '#1C2766', overflow: 'hidden' },
          back,
        ]}>
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <View key={f} style={{ position: 'absolute', left: -10, right: -10, top: h * f, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', transform: [{ rotate: '-8deg' }] }} />
        ))}
        <View style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: color.azafran, transform: [{ rotate: '45deg' }], borderWidth: 5, borderColor: 'rgba(255,255,255,0.18)' }} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: w,
            height: h,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
            backgroundColor: matched ? '#FFF7DD' : '#FFFFFF',
            borderWidth: 2.5,
            borderColor: matched ? color.buatong : color.niebla3,
            borderBottomWidth: 4,
            borderBottomColor: matched ? color.buatongHondo : color.niebla3,
            shadowColor: color.buatong,
            shadowOpacity: matched ? 0.7 : 0,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 0 },
          },
          front,
        ]}>
        {card.side === 'th' ? (
          <Th size={small ? 20 : 26} numberOfLines={1}>
            {card.word.th}
          </Th>
        ) : (
          <Txt v="bodyStrong" style={{ textAlign: 'center', fontSize: small ? 13 : 16, lineHeight: small ? 16 : 20 }} numberOfLines={3}>
            {card.word.es}
          </Txt>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Juego 2 · Memoria del templo: encuentra las parejas thai y español. */
export default function Memoria({ mode, words, focus, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const { width } = useWindowDimensions();
  const pairsTotal = mode === 'feria' ? 8 : 3;
  const cards = useMemo(() => makeCards(words, focus, pairsTotal), [words, focus, pairsTotal]);
  const cols = mode === 'feria' ? 4 : 3;
  const gap = 10;
  const cw = Math.min(120, (Math.min(width, 520) - 40 - gap * (cols - 1)) / cols);
  const ch = mode === 'feria' ? Math.min(84, cw * 1.1) : cw * 1.15;

  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [jump, setJump] = useState(0);
  const [hint, setHint] = useState<Word | null>(null);
  const busy = useRef(false);
  const finished = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const tap = (c: Card) => {
    if (busy.current || open.includes(c.key) || matched.includes(c.pair)) return;
    fx.flip();
    if (c.side === 'th') say(c.word.th);
    if (open.length === 0) {
      setOpen([c.key]);
      return;
    }
    const first = cards.find((x) => x.key === open[0])!;
    setOpen([open[0], c.key]);
    setAttempts((a) => a + 1);
    busy.current = true;
    if (first.pair === c.pair) {
      score.hit(true);
      onAnswer(true, c.pair);
      setJump((j) => j + 1);
      setHint(null);
      later(() => {
        fx.coin();
        const nm = [...matched, c.pair];
        setMatched(nm);
        setOpen([]);
        busy.current = false;
        if (nm.length >= pairsTotal && !finished.current) {
          finished.current = true;
          later(() => onDone(score.result(Math.max(0, nm.length * 100 - (attempts + 1) * 5))), 700);
        }
      }, 320);
    } else {
      score.hit(false, false);
      onAnswer(false, first.side === 'th' ? first.pair : c.pair);
      setHint(first.side === 'th' ? first.word : c.side === 'th' ? c.word : null);
      later(() => {
        setOpen([]);
        busy.current = false;
      }, 760);
    }
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <GameTitle title="Memoria del templo" sub="Voltea dos cartas: una en thai y su traducción." />
        </View>
        <ComboBadge combo={score.combo} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Txt v="num">
          {matched.length}
          <Txt v="h3" style={{ color: color.tinta3 }}> / {pairsTotal}</Txt>
        </Txt>
        <View style={{ flex: 1 }} />
        <Txt v="small">Intentos {attempts}</Txt>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, justifyContent: 'center' }}>
        {cards.map((c) => (
          <Flip key={c.key} card={c} w={cw} h={ch} open={open.includes(c.key)} matched={matched.includes(c.pair)} onPress={() => tap(c)} />
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingBottom: 18 }}>
        <Noi pose={matched.length >= pairsTotal ? 'celebra' : 'piensa'} size={110} jump={jump} />
        <Speech tail="left" style={{ flex: 1, marginBottom: 34 }}>
          {hint ? (
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Th size={20}>{hint.th}</Th>
                <Rom rom={hint.rom} />
              </View>
              <Txt v="small" style={{ color: color.tinta2 }}>
                es «{hint.es}»… ¿dónde estaba?
              </Txt>
            </View>
          ) : (
            <Txt v="bodyStrong">{matched.length === 0 && open.length === 0 ? 'Hmm… ¿dónde estará la pareja?' : '¡Sigue así!'}</Txt>
          )}
        </Speech>
      </View>
    </View>
  );
}
