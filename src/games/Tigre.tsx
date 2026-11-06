import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { color, tones } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Rom, SpeakBtn, Sticker, Th, Tile, ToneChip, Txt, mainTone, type TileState } from '@/components/ui';
import { MINIMAL_SETS, type MiniWord } from '@/content/drills';
import { say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { AnswerSheet, CheckBar, ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

type Round = { set: (typeof MINIMAL_SETS)[number]; items: MiniWord[]; target: number };

function makeRounds(n: number): Round[] {
  const out: Round[] = [];
  let bag: (typeof MINIMAL_SETS)[number][] = [];
  while (out.length < n) {
    if (bag.length === 0) bag = shuffle(MINIMAL_SETS);
    const set = bag.pop()!;
    const items = shuffle(set.items);
    out.push({ set, items, target: Math.floor(Math.random() * items.length) });
  }
  return out;
}

/** Juego 8 · ¿Tigre o camisa?: mismo sonido, distinto tono. */
export default function Tigre({ mode, rounds, onAnswer, onDone }: GameProps) {
  const n = rounds ?? (mode === 'feria' ? 10 : 4);
  const score = useScore(mode);
  const list = useMemo(() => makeRounds(n), [n]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [talking, setTalking] = useState(false);
  const r = list[i];

  const play = (slow = false) => {
    if (!r) return;
    setTalking(true);
    say(r.items[r.target].th, { slow, onDone: () => setTalking(false) });
  };
  useEffect(() => {
    const t = setTimeout(() => play(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!r) return null;

  const stateOf = (k: number): TileState => {
    if (checked === null) return pick === k ? 'sel' : 'idle';
    if (k === r.target) return 'ok';
    if (k === pick) return 'bad';
    return 'gone';
  };

  const check = () => {
    const ok = pick === r.target;
    score.hit(ok);
    onAnswer(ok);
    setChecked(ok);
  };
  const next = () => {
    if (i + 1 >= list.length) {
      onDone(score.result(score.correct * 10));
      return;
    }
    setI(i + 1);
    setPick(null);
    setChecked(null);
  };

  const target = r.items[r.target];
  const summary = [...r.items]
    .sort((a, b) => a.es.localeCompare(b.es))
    .map((w) => `con tono ${tones[mainTone(w.rom)].name.toLowerCase()} es ${w.es.split(';')[0]}`)
    .join('; ');
  const note = `${summary.charAt(0).toUpperCase()}${summary.slice(1)}.${checked === false && r.set.joke ? ` ${r.set.joke}` : ''}`;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <GameTitle title={r.set.title} sub={`Mismo sonido, distinto tono. ${i + 1} / ${list.length}`} />
          </View>
          <ComboBadge combo={score.combo} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Noi pose="escucha" size={104} still={!talking} />
          <SpeakBtn onPress={() => play(false)} size={64} />
          <SpeakBtn slow onPress={() => play(true)} size={40} />
        </View>
        <View style={{ gap: 10 }}>
          {r.items.map((w, k) => (
            <Animated.View key={`${i}-${w.th}`} entering={FadeInDown.delay(k * 70).springify().damping(14)}>
              <Tile state={stateOf(k)} height={84} disabled={checked !== null} onPress={() => setPick(k)} accessibilityLabel={`${w.th}, ${w.es}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' }}>
                  <Sticker emoji={w.emoji} size={54} bg={color.niebla} />
                  <View style={{ flex: 1 }}>
                    <Th size={30} bold>{w.th}</Th>
                    <Rom rom={w.rom} />
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4, maxWidth: 140 }}>
                    <ToneChip tone={mainTone(w.rom)} small />
                    <Txt v="bodyStrong" numberOfLines={2} style={{ textAlign: 'right', fontSize: 15, lineHeight: 18 }}>{w.es}</Txt>
                  </View>
                </View>
              </Tile>
            </Animated.View>
          ))}
        </View>
      </View>
      {checked === null ? <CheckBar ready={pick !== null} onCheck={check} /> : null}
      {checked !== null ? (
        <AnswerSheet
          ok={checked}
          th={target.th}
          rom={target.rom}
          es={target.es}
          note={note}
          onNext={next}
        />
      ) : null}
    </View>
  );
}
