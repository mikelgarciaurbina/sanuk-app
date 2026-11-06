import { RecordingPresets, createAudioPlayer, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, type AudioPlayer } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Btn, Rom, Speech, Th, Txt } from '@/components/ui';
import type { Sentence, Word } from '@/content/types';
import { fx, say, stopSpeech } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { joinThai, personalize, personalizeRom, type Gender } from '@/lib/thai';

import { ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

type Item = { id?: string; th: string; rom: string; es: string };
type Rating = 'otra' | 'casi' | 'igual';

function makeItems(sentences: Sentence[], words: Word[], focus: Word[], gender: Gender, n: number): Item[] {
  const s: Item[] = shuffle(sentences).map((x) => ({ th: joinThai(x.th.map((t) => personalize(t, gender))), rom: personalizeRom(x.rom, gender), es: personalize(x.es, gender) }));
  const w: Item[] = [...shuffle(focus), ...shuffle(words)].map((x) => ({ id: x.id, th: x.th, rom: x.rom, es: x.es }));
  const out: Item[] = [];
  const seen = new Set<string>();
  // mezcla frases y palabras: una palabra, una frase…
  const a = [...s];
  const b = [...w];
  while (out.length < n && (a.length || b.length)) {
    const it = (out.length % 2 === 0 && a.length ? a.shift() : b.shift() ?? a.shift())!;
    if (seen.has(it.th)) continue;
    seen.add(it.th);
    out.push(it);
  }
  return out;
}

function Wave({ active, tint, bars = 26 }: { active: boolean; tint: string; bars?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, flex: 1 }}>
      {Array.from({ length: bars }, (_, i) => (
        <WaveBar key={i} i={i} active={active} tint={tint} />
      ))}
    </View>
  );
}

function WaveBar({ i, active, tint }: { i: number; active: boolean; tint: string }) {
  const reduced = useReducedMotion();
  const h = useSharedValue(0.18);
  useEffect(() => {
    const base = 0.25 + ((i * 37) % 10) / 14;
    if (active && !reduced) {
      h.value = withDelay((i % 6) * 40, withRepeat(withSequence(withTiming(base, { duration: 260 + (i % 5) * 70, easing: Easing.inOut(Easing.quad) }), withTiming(0.15, { duration: 260 + (i % 4) * 90, easing: Easing.inOut(Easing.quad) })), -1, true));
    } else {
      cancelAnimation(h);
      h.value = withTiming(active ? 0.5 : 0.18, { duration: 200 });
    }
  }, [active, reduced, i, h]);
  const s = useAnimatedStyle(() => ({ height: 4 + h.value * 40 }));
  return <Animated.View style={[{ width: 5, borderRadius: 3, backgroundColor: tint, opacity: active ? 1 : 0.45 }, s]} />;
}

/** Juego 9 · Eco: escucha, repite y compárate con Noi. */
export default function Eco({ mode, words, focus, sentences, rounds, gender, onAnswer, onDone }: GameProps) {
  const n = rounds ?? (mode === 'feria' ? 8 : 3);
  const score = useScore(mode);
  const list = useMemo(() => makeItems(sentences, words, focus, gender, n), [sentences, words, focus, gender, n]);
  const [i, setI] = useState(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<'idle' | 'rec' | 'has'>('idle');
  const [noMic, setNoMic] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [noiTalking, setNoiTalking] = useState(false);
  const [meTalking, setMeTalking] = useState(false);
  const [jump, setJump] = useState(0);
  const [missed, setMissed] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const it = list[i];

  const dropPlayer = () => {
    try {
      playerRef.current?.remove();
    } catch {}
    playerRef.current = null;
  };
  useEffect(
    () => () => {
      dropPlayer();
      stopSpeech();
    },
    [],
  );

  const listen = (slow = false) => {
    if (!it) return;
    setNoiTalking(true);
    say(it.th, { slow, onDone: () => setNoiTalking(false) });
  };
  useEffect(() => {
    const t = setTimeout(() => listen(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const startRec = async () => {
    stopSpeech();
    setNoiTalking(false);
    dropPlayer();
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setNoMic(true);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      fx.tap();
      setPhase('rec');
    } catch {
      setNoMic(true);
      setPhase('idle');
    }
  };

  const stopRec = async () => {
    try {
      await recorder.stop();
      setUri(recorder.uri ?? null);
      setPhase('has');
    } catch {
      setNoMic(true);
      setPhase('idle');
    }
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {}
  };

  const playMine = () => {
    if (!uri) return;
    stopSpeech();
    dropPlayer();
    try {
      const p = createAudioPlayer(uri);
      playerRef.current = p;
      setMeTalking(true);
      p.addListener('playbackStatusUpdate', (st) => {
        if (st.didJustFinish) setMeTalking(false);
      });
      p.play();
    } catch {
      setMeTalking(false);
    }
  };

  const rate = (r: Rating) => {
    if (!it) return;
    const ok = r !== 'otra';
    score.hit(ok);
    onAnswer(ok, it.id);
    dropPlayer();
    setMeTalking(false);
    if (!ok) {
      // otra vez: se repite la misma frase una vez
      setMissed(true);
      setPhase('idle');
      setUri(null);
      listen();
      return;
    }
    if (ok) setJump((j) => j + 1);
    if (i + 1 >= list.length) {
      onDone(score.result(score.correct * 10));
      return;
    }
    setI(i + 1);
    setPhase('idle');
    setUri(null);
    setMissed(false);
  };

  if (!it) return null;

  const canRate = phase === 'has' || noMic;

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <GameTitle title="Repite con Noi" sub={`${i + 1} / ${list.length}`} />
        </View>
        <ComboBadge combo={score.combo} />
      </View>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 2, borderColor: color.niebla3, borderBottomWidth: 5, padding: 18, alignItems: 'center', gap: 4 }}>
        <Th size={it.th.length > 10 ? 30 : 40} bold style={{ textAlign: 'center' }}>{it.th}</Th>
        <Rom rom={it.rom} size={17} style={{ textAlign: 'center' }} />
        <Txt v="h3" style={{ color: color.tinta2, textAlign: 'center' }}>{it.es}</Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Btn v="blue" height={56} style={{ flex: 1 }} onPress={() => listen(false)} silent icon={<Icon name="speaker" size={24} color="#FFFFFF" />} label="Escuchar" accessibilityLabel="Escuchar a Noi" />
        {!noMic ? (
          <Btn
            v={phase === 'rec' ? 'bad' : 'primary'}
            height={56}
            style={{ flex: 1 }}
            onPress={phase === 'rec' ? stopRec : startRec}
            silent
            icon={phase === 'rec' ? <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: '#FFFFFF' }} /> : <Icon name="mic" size={24} color={color.tinta} />}
            label={phase === 'rec' ? 'Parar' : phase === 'has' ? 'Repetir' : 'Grabar'}
            accessibilityLabel={phase === 'rec' ? 'Parar grabación' : 'Grabar tu voz'}
          />
        ) : null}
        {phase === 'has' ? (
          <Btn v="ghost" height={56} style={{ width: 64 }} onPress={playMine} silent icon={<Icon name="play" size={24} color={color.cieloHondo} />} accessibilityLabel="Escucharte" />
        ) : null}
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt v="small" style={{ width: 34 }}>Noi</Txt>
          <Wave active={noiTalking} tint={color.cielo} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt v="small" style={{ width: 34 }}>Tú</Txt>
          <Wave active={phase === 'rec' || meTalking} tint={color.farol} />
        </View>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <Noi pose={phase === 'rec' ? 'escucha' : missed ? 'piensa' : 'feliz'} size={96} jump={jump} still={phase !== 'rec' && !noiTalking} />
        <Speech tail="left" style={{ flex: 1, marginBottom: 26 }}>
          <Txt v="bodyStrong">
            {noMic
              ? 'Dilo en voz alta y compáralo con Noi.'
              : phase === 'rec'
                ? 'Te escucho… ¡adelante!'
                : phase === 'has'
                  ? 'Escúchate y compara. ¿Cómo te ha salido?'
                  : 'Escucha, graba y compara.'}
          </Txt>
        </Speech>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 26 }}>
        <Btn v="ghost" height={52} style={{ flex: 1 }} label="Otra vez" onPress={() => rate('otra')} disabled={!canRate} />
        <Btn v="primary" height={52} style={{ flex: 1 }} label="Casi" onPress={() => rate('casi')} disabled={!canRate} />
        <Btn v="ok" height={52} style={{ flex: 1.2 }} label="¡Igualito!" onPress={() => rate('igual')} disabled={!canRate} />
      </View>
    </View>
  );
}
