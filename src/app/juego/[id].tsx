import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { color, shadow } from '@/brand/tokens';
import { Art } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Btn, Hud, Txt } from '@/components/ui';
import { DIALOGUES, STORIES, playPool, SENTENCES } from '@/content';
import type { GameId, LessonExtra } from '@/content/types';
import { Backdrop } from '@/games/Backdrop';
import { Floaty, GameFrame, Glow, useJuice } from '@/games/fx';
import { GAME_BG, GAME_COMPONENTS, GAME_DARK, gameMeta } from '@/games/registry';
import type { GameResult } from '@/games/types';
import { fx, stopSpeech } from '@/lib/audio';
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
  const [hudH, setHudH] = useState(0);

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

  if (result)
    return (
      <Results
        name={meta.name}
        result={result}
        prevBest={prevBest}
        daily={!!daily}
        onAgain={() => {
          setResult(null);
          setRun((r) => r + 1);
        }}
        onClose={close}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={styles.hud} onLayout={(e) => setHudH(e.nativeEvent.layout.height)}>
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
      </View>
      <GameFrame.Provider value={{ top: hudH, bottom: insets.bottom }}>
      <View key={run} style={styles.game}>
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
      </GameFrame.Provider>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

/** Fin de partida: marcador que sube, estrellas por precisión y, con récord, fanfarria y fuegos artificiales. */
function Results({ name, result, prevBest, daily, onAgain, onClose }: { name: string; result: GameResult; prevBest: number; daily: boolean; onAgain: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const juice = useJuice();
  const bananas = daily ? result.bananas * 2 : result.bananas;
  const score = result.score ?? result.correct;
  const record = score > prevBest && score > 0;
  const acc = result.total ? result.correct / result.total : 0;
  const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc > 0 ? 1 : 0;
  const title = record ? '¡Nuevo récord!' : stars === 3 ? '¡Partida perfecta!' : stars === 2 ? '¡Buena partida!' : '¡A por la siguiente!';

  const celebrate = useEffectEvent(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < stars; i++) ts.push(setTimeout(() => fx.sparkle(), 700 + i * 280));
    const after = 700 + stars * 280;
    if (record) {
      ts.push(
        setTimeout(() => {
          fx.fanfare();
          juice.banner('¡Nuevo récord!', `${score} puntos`, color.farol);
        }, after),
      );
      for (let k = 0; k < 8; k++)
        ts.push(
          setTimeout(() => {
            fx.boom();
            juice.burst({ x: width * (0.15 + Math.random() * 0.7), y: height * (0.1 + Math.random() * 0.3) }, k % 2 ? 'confeti' : 'estrellas', 26, 150);
          }, after + 400 + k * 420),
        );
    } else ts.push(setTimeout(() => fx.done(), 450));
    return ts;
  });
  useEffect(() => {
    const ts = celebrate();
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene={record ? 'noche' : 'amanecer'} />
      <View style={{ flex: 1, paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 14 }}>
        <Animated.View entering={ZoomIn.springify().damping(9)} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Glow size={250} tint={record ? color.buatong : '#FFFFFF'} style={{ position: 'absolute' }} />
          <Floaty amp={5}>
            <Noi pose={record || stars >= 2 ? 'celebra' : 'feliz'} size={170} />
          </Floaty>
        </Animated.View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Txt v="eyebrow" style={record ? { color: color.buatong } : null}>{name}</Txt>
          <Txt v="h1" style={[{ textAlign: 'center' }, record && { color: '#FFFFFF' }]}>{title}</Txt>
        </View>
        <ResultStars n={stars} dark={record} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Animated.View entering={FadeInDown.delay(250).springify().damping(14)} style={styles.stat}>
            <CountUp to={score} color={record ? color.farol : color.tinta} />
            <Txt v="small">puntos{prevBest ? ` · récord ${Math.max(prevBest, score)}` : ''}</Txt>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(380).springify().damping(14)} style={styles.stat}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Floaty amp={3} rotate={8}>
                <Art name="platano" size={30} />
              </Floaty>
              <Txt v="num" style={{ fontSize: 32 }}>+{bananas}</Txt>
            </View>
            <Txt v="small">{daily ? 'plátanos · ×2 del día' : 'plátanos'}</Txt>
          </Animated.View>
        </View>
        <Txt v="small" style={[{ textAlign: 'center' }, record && { color: '#C9D0EE' }]}>
          {result.correct} aciertos de {result.total}
        </Txt>
        <View style={{ flex: 1 }} />
        <Btn label="Otra partida" onPress={onAgain} />
        <Btn label="Volver a la feria" v="ghost" onPress={onClose} />
      </View>
      {juice.layer}
    </View>
  );
}

/** Número que sube de 0 al resultado. */
function CountUp({ to, color: tint }: { to: number; color: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / 1100);
      setN(Math.round(to * (1 - (1 - k) ** 3)));
      if (k >= 1) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [to]);
  return (
    <Txt v="num" style={{ fontSize: 32, color: tint }}>
      {n}
    </Txt>
  );
}

const STAR = 'M12 1.8l2.9 6.4 7 .7-5.3 4.7 1.6 6.9L12 17l-6.2 3.5 1.6-6.9L2.1 8.9l7-.7z';

/** Tres estrellas (la del centro, más grande) que aparecen de una en una. */
function ResultStars({ n, dark }: { n: number; dark: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 6 }}>
      {[0, 1, 2].map((i) => {
        const on = i < n;
        const size = i === 1 ? 66 : 52;
        return (
          <Animated.View key={i} entering={ZoomIn.delay(700 + i * 280).springify().damping(7)} style={{ marginBottom: i === 1 ? 14 : 0 }}>
            <Svg width={size} height={size} viewBox="0 0 24 24">
              <Path
                d={STAR}
                fill={on ? color.buatong : dark ? 'rgba(255,255,255,0.18)' : 'rgba(29,35,71,0.1)'}
                stroke={on ? color.buatongHondo : dark ? 'rgba(255,255,255,0.35)' : 'rgba(29,35,71,0.2)'}
                strokeWidth={1.2}
                strokeLinejoin="round"
              />
              {on ? <Path d="M8.2 9.2 10.6 9" stroke="#FFF6CF" strokeWidth={1.4} strokeLinecap="round" /> : null}
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { zIndex: 10 },
  game: { flex: 1, zIndex: 1, overflow: 'visible' },
  best: { height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, borderColor: color.niebla3, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 2, padding: 16, borderRadius: 22, backgroundColor: '#FFFFFF', ...shadow.card },
});
