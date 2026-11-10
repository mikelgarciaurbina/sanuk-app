import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color } from '@/brand/tokens';
import { Art } from '@/components/icons';
import { LessonDone } from '@/components/LessonDone';
import { Hud, Txt } from '@/components/ui';
import { WordIntro } from '@/components/WordIntro';
import { curvesFor, dueWords, lessonById, letterProgress, stopDone } from '@/content';
import { GameFrame } from '@/games/fx';
import { GAME_BG, GAME_COMPONENTS, GAME_DARK } from '@/games/registry';
import type { GameResult } from '@/games/types';
import { fx, stopSpeech } from '@/lib/audio';
import { buildLesson, buildReview } from '@/lib/lesson';
import { useStore } from '@/lib/store';

/** Una lección = una curva: tarjetas de palabras nuevas y minijuegos encadenados (~4 min). */
export default function Leccion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const { p } = store;
  const insets = useSafeAreaInsets();
  const lesson = id === 'repaso' ? undefined : lessonById(id);

  // la lección se construye una vez con el progreso de entrada
  const [built] = useState(() => (lesson ? buildLesson(lesson, p) : buildReview(dueWords(p), p)));
  const [letterBefore] = useState(() => letterProgress(p).pct);
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [hudH, setHudH] = useState(0);
  const [total, setTotal] = useState<GameResult>({ correct: 0, total: 0, bananas: 0 });
  const [started] = useState(Date.now);
  const [elapsed, setElapsed] = useState(0);

  const steps = built.steps;
  const step = steps[i];
  const introTotal = steps.filter((s) => s.kind === 'intro').length;
  const introN = steps.slice(0, i + 1).filter((s) => s.kind === 'intro').length;

  const advance = (sum: GameResult = total) => {
    if (i + 1 >= steps.length) {
      finish(sum);
      return;
    }
    setI(i + 1);
  };

  const finish = (r: GameResult) => {
    stopSpeech();
    if (lesson) {
      const sDone = stopDone(p, lesson.stop, lesson.id);
      store.completeLesson(lesson.id, r, curvesFor(lesson), sDone ? lesson.stop.id : undefined);
    } else {
      store.addBananas(r.bananas);
    }
    fx.done();
    setElapsed(Math.round((Date.now() - started) / 1000));
    setDone(true);
  };

  const close = () => {
    stopSpeech();
    router.back();
  };

  const example = useMemo(() => {
    if (step?.kind !== 'intro') return undefined;
    return built.sentences.find((s) => s.th.includes(step.word.th));
  }, [step, built.sentences]);

  if (done) {
    return <LessonDone result={total} seconds={elapsed} letterBefore={letterBefore} lessonId={lesson?.id} />;
  }
  if (!step) return null;

  const Game = step.kind === 'game' ? GAME_COMPONENTS[step.game] : null;
  const bg = step.kind === 'game' ? (GAME_BG[step.game] ?? color.niebla) : color.niebla;
  const dark = step.kind === 'game' && !!GAME_DARK[step.game];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ zIndex: 10 }} onLayout={(e) => setHudH(e.nativeEvent.layout.height)}>
        <Hud
          onClose={close}
          dark={dark}
          progress={i / steps.length}
          right={
            <View style={styles.bananas}>
              <Art name="platano" size={20} />
              <Txt v="bodyStrong" style={{ fontSize: 14 }}>{total.bananas}</Txt>
            </View>
          }
        />
      </View>
      <GameFrame.Provider value={{ top: hudH, bottom: insets.bottom }}>
      <Animated.View key={i} entering={FadeInRight.springify().damping(18)} style={{ flex: 1, zIndex: 1, overflow: 'visible' }}>
        {step.kind === 'intro' ? (
          <WordIntro
            word={step.word}
            example={example}
            gender={p.profile.gender}
            n={introN}
            total={introTotal}
            writing={!built.firstCurve}
            onNext={() => {
              store.seeWords([step.word.id]);
              advance();
            }}
          />
        ) : Game ? (
          <Game
            mode="leccion"
            words={step.words ?? built.words}
            focus={step.focus ?? built.focus}
            sentences={built.sentences}
            extra={lesson?.extra}
            rounds={step.rounds}
            gender={p.profile.gender}
            onAnswer={(ok, wordId) => {
              if (wordId) store.answer(wordId, ok);
            }}
            onDone={(r) => {
              const sum = { correct: total.correct + r.correct, total: total.total + r.total, bananas: total.bananas + r.bananas };
              setTotal(sum);
              advance(sum);
            }}
          />
        ) : null}
      </Animated.View>
      </GameFrame.Provider>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bananas: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3 },
});
