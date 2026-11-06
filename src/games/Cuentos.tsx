import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming, cancelAnimation } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Btn, Chip, Rom, Tile, Th, Txt, type TileState } from '@/components/ui';
import { STORIES, type Story, type StoryToken } from '@/content';
import { say, stopSpeech } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { useStore } from '@/lib/store';
import { joinThai, personalize, personalizeRom } from '@/lib/thai';

import { AnswerSheet, CheckBar, ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

function Illustration({ page, total, speaking }: { page: number; total: number; speaking: boolean }) {
  // el sol sube a medida que avanza el cuento
  const sunY = 70 - (page / Math.max(1, total - 1)) * 40;
  return (
    <View style={{ height: 124, borderRadius: 22, overflow: 'hidden', backgroundColor: color.cieloSuave }}>
      <Svg width="100%" height="100%" viewBox="0 0 340 124" preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute' }}>
        <Circle cx={270} cy={sunY} r={22} fill={color.alba} />
        <Path d="M0 124 L0 70 L60 30 L120 74 L170 44 L240 90 L300 56 L340 80 L340 124 Z" fill={color.monte1} />
        <Path d="M0 124 L0 92 L70 62 L140 100 L210 70 L280 104 L340 90 L340 124 Z" fill={color.monte3} />
        <Path d="M0 124 L0 108 L90 92 L180 112 L260 98 L340 110 L340 124 Z" fill={color.monte4} />
      </Svg>
      <View style={{ position: 'absolute', left: 14, bottom: -6 }}>
        <Noi pose={speaking ? 'hola' : 'feliz'} size={96} still={!speaking} />
      </View>
    </View>
  );
}

/** Juego «Cuentos de Yai»: lee con audio, toca para traducir y responde las preguntas. */
export default function Cuentos({ mode, extra, gender, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const { p } = useStore();
  const lessonStory = extra?.kind === 'cuento' ? STORIES.find((s) => s.id === extra.id) : undefined;
  const [story, setStory] = useState<Story | null>(mode === 'feria' ? null : (lessonStory ?? STORIES[0] ?? null));
  const [stage, setStage] = useState<'read' | 'quiz'>('read');
  const [page, setPage] = useState(0);
  const [tok, setTok] = useState<StoryToken | null>(null);
  const [trans, setTrans] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const progress = useSharedValue(0);
  const runId = useRef(0);

  const [q, setQ] = useState(0);
  const [pickIx, setPickIx] = useState<number | null>(null);
  const [checked, setChecked] = useState<null | boolean>(null);

  const questions = useMemo(
    () => (story ? story.questions.map((qq) => ({ q: qq.q, opts: shuffle(qq.options.map((text, k) => ({ text, ok: k === qq.answer }))) })) : []),
    [story],
  );

  const stop = () => {
    runId.current += 1;
    stopSpeech();
    cancelAnimation(progress);
    progress.value = 0;
    setPlaying(false);
  };
  useEffect(() => () => stopSpeech(), []);

  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  if (!story) {
    return (
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <GameTitle title="Cuentos de Yai" sub="Elige un cuento para leer." />
        {STORIES.map((s, k) => (
          <Animated.View key={s.id} entering={FadeInDown.delay(k * 70).springify().damping(14)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Leer el cuento ${s.title}`}
              onPress={() => setStory(s)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 2, borderColor: color.niebla3, minHeight: 84 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: color.tecaSuave, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="book" size={28} color={color.teca} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="bodyStrong">{s.title}</Txt>
                <Th size={18}>{s.titleTh}</Th>
                <Txt v="small">{s.pages.length} páginas · {s.questions.length} preguntas</Txt>
              </View>
              <Icon name="arrow" size={22} color={color.tinta3} />
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    );
  }

  const pg = story.pages[page];
  const lastPage = page === story.pages.length - 1;
  const thLines = pg.lines.map((l) => joinThai(l.map((t) => personalize(t.th, gender))));

  const play = () => {
    if (playing) {
      stop();
      return;
    }
    const id = ++runId.current;
    const text = thLines.join(' ');
    const dur = Math.max(1800, text.length * 120) / (slow ? 0.6 : 1);
    setPlaying(true);
    progress.value = 0;
    progress.value = withTiming(1, { duration: dur, easing: Easing.linear });
    say(text, {
      slow,
      onDone: () => {
        if (runId.current !== id) return;
        setPlaying(false);
        progress.value = withTiming(0, { duration: 500 });
      },
    });
  };

  const go = (to: number) => {
    stop();
    setTok(null);
    setTrans(false);
    setPage(to);
  };

  const finishRead = () => {
    stop();
    setTok(null);
    if (!questions.length) {
      onDone(score.result(score.correct));
      return;
    }
    setStage('quiz');
  };

  if (stage === 'quiz') {
    const cur = questions[q];
    if (!cur) return null;
    const st = (k: number): TileState => {
      if (checked === null) return pickIx === k ? 'sel' : 'idle';
      if (cur.opts[k].ok) return 'ok';
      if (k === pickIx) return 'bad';
      return 'gone';
    };
    const check = () => {
      const ok = pickIx !== null && cur.opts[pickIx].ok;
      score.hit(ok);
      onAnswer(ok);
      setChecked(ok);
    };
    const next = () => {
      if (q + 1 >= questions.length) {
        onDone(score.result(score.correct));
        return;
      }
      setQ(q + 1);
      setPickIx(null);
      setChecked(null);
    };
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <GameTitle title="¿Qué has entendido?" sub={`Pregunta ${q + 1} de ${questions.length}`} />
            </View>
            <ComboBadge combo={score.combo} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Noi pose="piensa" size={84} still />
            <Txt v="h3" style={{ flex: 1 }}>{cur.q}</Txt>
          </View>
          <View style={{ gap: 12 }}>
            {cur.opts.map((o, k) => (
              <Animated.View key={`${q}-${k}`} entering={FadeInDown.delay(k * 60).springify().damping(14)}>
                <Tile state={st(k)} height={60} disabled={checked !== null} onPress={() => setPickIx(k)} accessibilityLabel={o.text}>
                  <Txt v="bodyStrong" style={{ textAlign: 'center' }}>{o.text}</Txt>
                </Tile>
              </Animated.View>
            ))}
          </View>
        </View>
        {checked === null ? <CheckBar ready={pickIx !== null} onCheck={check} /> : null}
        {checked !== null ? <AnswerSheet ok={checked} note={checked ? undefined : `La respuesta era: ${cur.opts.find((o) => o.ok)?.text}.`} onNext={next} /> : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <GameTitle title={story.title} sub={`Página ${page + 1} de ${story.pages.length}`} />
          </View>
          <Chip label={`${page + 1}/${story.pages.length}`} />
        </View>

        <Illustration page={page} total={story.pages.length} speaking={playing} />

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, gap: 10, borderWidth: 2, borderColor: color.niebla3 }}>
          {pg.lines.map((line, li) => (
            <View key={`${page}-${li}`} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
              {line.map((t, ti) => {
                const known = !!t.w && !!p.words[t.w];
                const active = tok === t;
                const th = personalize(t.th, gender);
                return (
                  <Pressable
                    key={ti}
                    accessibilityRole="button"
                    accessibilityLabel={`${th}${t.es ? `: ${t.es}` : ''}`}
                    hitSlop={4}
                    onPress={() => {
                      setTok(active ? null : t);
                      if (!active) say(th);
                    }}
                    style={{
                      minHeight: 44,
                      paddingHorizontal: 4,
                      justifyContent: 'center',
                      borderRadius: 10,
                      backgroundColor: active ? color.cieloSuave : 'transparent',
                      borderBottomWidth: 3,
                      borderBottomColor: known ? color.arrozalVivo : 'transparent',
                    }}>
                    <Th size={26}>{th}</Th>
                  </Pressable>
                );
              })}
            </View>
          ))}
          {tok ? (
            <Animated.View entering={FadeIn.duration(160)} style={{ backgroundColor: color.noche, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Th size={26} style={{ color: '#FFFFFF' }}>{personalize(tok.th, gender)}</Th>
                {tok.rom ? <Rom rom={personalizeRom(tok.rom, gender)} mono={color.alba} /> : null}
                {tok.es ? <Txt v="bodyStrong" style={{ color: '#FFFFFF' }}>{tok.es}</Txt> : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Escuchar palabra"
                onPress={() => say(personalize(tok.th, gender))}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.cielo, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="speaker" size={22} color="#FFFFFF" />
              </Pressable>
            </Animated.View>
          ) : (
            <Txt v="small">Toca una palabra para traducirla. Subrayadas en verde: las que ya conoces.</Txt>
          )}
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: color.niebla3 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pausar' : 'Escuchar la página'}
            onPress={play}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: color.cielo, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={playing ? 'pause' : 'play'} size={22} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: color.niebla3, overflow: 'hidden' }}>
            <Animated.View style={[{ height: '100%', borderRadius: 5, backgroundColor: color.cielo }, bar]} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={slow ? 'Velocidad lenta, cambiar a normal' : 'Velocidad normal, cambiar a lenta'}
            onPress={() => {
              stop();
              setSlow((s) => !s);
            }}
            style={{ minWidth: 56, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: color.cieloSuave }}>
            <Txt v="small" style={{ color: color.cieloHondo }}>{slow ? '0,6×' : '1×'}</Txt>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: trans }}
          accessibilityLabel="Traducción"
          onPress={() => setTrans((t) => !t)}
          style={{ minHeight: 48, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: trans ? color.azafranSuave : '#FFFFFF', borderWidth: 2, borderColor: trans ? color.azafran : color.niebla3, gap: 4 }}>
          <Txt v="bodyStrong">Traducción {trans ? '▴' : '▾'}</Txt>
          {trans ? <Txt v="body">{pg.es}</Txt> : null}
        </Pressable>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 }}>
        <Btn v="ghost" label="Atrás" style={{ flex: 1 }} disabled={page === 0} onPress={() => go(page - 1)} />
        {lastPage ? (
          <Btn label="Preguntas" style={{ flex: 1.6 }} onPress={finishRead} />
        ) : (
          <Btn label="Siguiente página" style={{ flex: 1.6 }} onPress={() => go(page + 1)} />
        )}
      </View>
    </View>
  );
}
