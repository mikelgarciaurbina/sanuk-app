import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, shadow } from '@/brand/tokens';
import { Art } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Confetti } from '@/components/Scenery';
import { Btn, Hud, Txt } from '@/components/ui';
import { DIALOGUES, STORIES, playPool, SENTENCES } from '@/content';
import type { GameId, LessonExtra } from '@/content/types';
import { GAME_BG, GAME_COMPONENTS, GAME_DARK, gameMeta } from '@/games/registry';
import type { GameResult } from '@/games/types';
import { stopSpeech } from '@/lib/audio';
import { pick, shuffle } from '@/lib/random';
import { useStore } from '@/lib/store';


/** Una partida completa de la feria, con récord y plátanos. */
export default function Juego() {
  const { id, daily } = useLocalSearchParams<{ id: GameId; daily?: string }>();
  const { p, recordGame, answer } = useStore();
  const insets = useSafeAreaInsets();
  const meta = gameMeta(id);
  const Game = GAME_COMPONENTS[id];
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [prevBest] = useState(() => p.games[id]?.best ?? 0);

  const [setup] = useState(() => {
    const words = shuffle(playPool(p, 16));
    const learnedSentences = Object.values(SENTENCES).filter((s) => s.th.every((t) => t.startsWith('{') || words.some((w) => w.th === t) || t.length <= 3));
    const sentences = shuffle(learnedSentences.length >= 4 ? learnedSentences : Object.values(SENTENCES)).slice(0, 12);
    let extra: LessonExtra | undefined;
    if (id === 'cena') extra = { kind: 'dialogo', id: pick(Object.keys(DIALOGUES)) };
    if (id === 'cuentos' && STORIES.length) extra = { kind: 'cuento', id: pick(STORIES).id };
    if (id === 'cueva' || id === 'traza') extra = { kind: 'letras', set: pick(['media', 'baja', 'alta']) };
    return { words, sentences, extra };
  });

  const close = () => {
    stopSpeech();
    router.back();
  };

  if (!meta || !Game) return null;
  const bg = GAME_BG[id] ?? color.niebla;
  const dark = !!GAME_DARK[id];

  if (result) {
    const bananas = daily ? result.bananas * 2 : result.bananas;
    const score = result.score ?? result.correct;
    const record = score > prevBest;
    return (
      <View style={{ flex: 1, backgroundColor: color.niebla, paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 16 }}>
        <Animated.View entering={ZoomIn.springify().damping(9)} style={{ alignItems: 'center' }}>
          <Noi pose={record ? 'celebra' : 'feliz'} size={180} />
        </Animated.View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Txt v="eyebrow">{meta.name}</Txt>
          <Txt v="h1">{record ? '¡Nuevo récord!' : '¡Buena partida!'}</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Animated.View entering={FadeInDown.delay(150)} style={styles.stat}>
            <Txt v="num" style={{ fontSize: 30, color: record ? color.farol : color.tinta }}>{score}</Txt>
            <Txt v="small">puntos{prevBest ? ` · récord ${Math.max(prevBest, score)}` : ''}</Txt>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(250)} style={styles.stat}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Art name="platano" size={28} />
              <Txt v="num" style={{ fontSize: 30 }}>+{bananas}</Txt>
            </View>
            <Txt v="small">{daily ? 'plátanos · ×2 del día' : 'plátanos'}</Txt>
          </Animated.View>
        </View>
        <Txt v="small" style={{ textAlign: 'center' }}>
          {result.correct} aciertos de {result.total}
        </Txt>
        <View style={{ flex: 1 }} />
        <Btn
          label="Otra partida"
          onPress={() => {
            setResult(null);
            setRun((r) => r + 1);
          }}
        />
        <Btn label="Volver a la feria" v="ghost" onPress={close} />
        {record ? <Confetti run={1} /> : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Hud
        onClose={close}
        dark={dark}
        right={
          prevBest ? (
            <View style={[styles.best, dark && { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'transparent' }]}>
              <Txt v="small" style={{ color: dark ? '#FFFFFF' : color.tinta }}>Récord {prevBest}</Txt>
            </View>
          ) : null
        }
      />
      <View key={run} style={{ flex: 1 }}>
        <Game
          mode="feria"
          words={setup.words}
          focus={[]}
          sentences={setup.sentences}
          extra={setup.extra}
          rounds={meta.rounds.feria}
          gender={p.profile.gender}
          onAnswer={(ok, wordId) => {
            if (wordId) answer(wordId, ok);
          }}
          onDone={(r) => {
            const bananas = daily ? r.bananas * 2 : r.bananas;
            recordGame(id, r.score ?? r.correct, bananas);
            setResult(r);
          }}
        />
      </View>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  best: { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, borderColor: color.niebla3, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 2, padding: 16, borderRadius: 22, backgroundColor: '#FFFFFF', ...shadow.card },
});
