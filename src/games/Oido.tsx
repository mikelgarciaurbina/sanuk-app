import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { SpeakBtn, Sticker, Tile, Txt, type TileState } from '@/components/ui';
import type { Word } from '@/content/types';
import { say } from '@/lib/audio';
import { distractors, shuffle } from '@/lib/random';

import { AnswerSheet, CheckBar, ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

type Round = { target: Word; options: Word[] };

function makeRounds(words: Word[], focus: Word[], n: number): Round[] {
  const order = [...shuffle(focus), ...shuffle(words.filter((w) => !focus.some((f) => f.id === w.id)))];
  const targets = order.slice(0, n);
  return targets.map((target) => ({ target, options: shuffle([target, ...distractors(words, target, 3, (w) => w.es)]) }));
}

/** Juego 6 · Oído de elefante: escucha y elige lo que has oído. */
export default function Oido({ mode, words, focus, rounds = 4, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const list = useMemo(() => makeRounds(words, focus, rounds), [words, focus, rounds]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [talking, setTalking] = useState(false);
  const r = list[i];

  const play = (slow = false) => {
    if (!r) return;
    setTalking(true);
    say(r.target.th, { slow, onDone: () => setTalking(false) });
  };

  useEffect(() => {
    const t = setTimeout(() => play(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!r) return null;

  const stateOf = (w: Word): TileState => {
    if (checked === null) return pick === w.id ? 'sel' : 'idle';
    if (w.id === r.target.id) return 'ok';
    if (w.id === pick) return 'bad';
    return 'gone';
  };

  const check = () => {
    const ok = pick === r.target.id;
    score.hit(ok);
    onAnswer(ok, r.target.id);
    setChecked(ok);
  };

  const next = () => {
    if (i + 1 >= list.length) {
      onDone(score.result(score.correct));
      return;
    }
    setI(i + 1);
    setPick(null);
    setChecked(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <GameTitle title="¿Qué has oído?" sub={mode === 'feria' ? `Ronda ${i + 1} de ${list.length}` : undefined} />
          </View>
          <ComboBadge combo={score.combo} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Noi pose="escucha" size={140} still={!talking} />
          <View style={{ gap: 10 }}>
            <SpeakBtn onPress={() => play(false)} size={76} />
            <SpeakBtn slow onPress={() => play(true)} size={40} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {r.options.map((w, k) => (
            <Animated.View key={`${i}-${w.id}`} entering={FadeInDown.delay(k * 60).springify().damping(14)} style={{ width: '47.8%' }}>
              <Tile state={stateOf(w)} height={138} disabled={checked !== null} onPress={() => setPick(w.id)} accessibilityLabel={w.es}>
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Sticker emoji={w.emoji} size={64} bg={color.niebla} />
                  <Txt v="bodyStrong" style={{ textAlign: 'center' }} numberOfLines={2}>
                    {w.es}
                  </Txt>
                </View>
              </Tile>
            </Animated.View>
          ))}
        </View>
      </View>
      {checked === null ? <CheckBar ready={!!pick} onCheck={check} /> : null}
      {checked !== null ? <AnswerSheet ok={checked} th={r.target.th} rom={r.target.rom} es={r.target.es} note={r.target.note} onNext={next} /> : null}
    </View>
  );
}
