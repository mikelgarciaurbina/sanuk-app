import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { color, tones, type ToneId } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { ToneGlyph } from '@/components/icons';
import { SpeakBtn, Th, Tile, Txt, type TileState } from '@/components/ui';
import { TONE_BANK } from '@/content/drills';
import { CONSONANTS } from '@/content/letters';
import { say } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { tonesOf } from '@/lib/thai';
import type { Word } from '@/content/types';

import { AnswerSheet, CheckBar, ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const ORDER: ToneId[] = ['M', 'L', 'F', 'H', 'R'];
const DESC: Record<ToneId, string> = { M: 'plano', L: 'grave', F: 'sube y cae', H: 'agudo', R: 'baja y sube' };
const MAI: Record<string, string> = { '่': 'mai ek', '้': 'mai tho' };

type Item = { id?: string; th: string; rom: string; es: string; emoji?: string; tone: ToneId };

function makeItems(words: Word[], focus: Word[], n: number): Item[] {
  const single = (w: Word) => tonesOf(w.rom).length === 1;
  const fromWords = (list: Word[]): Item[] => list.filter(single).map((w) => ({ id: w.id, th: w.th, rom: w.rom, es: w.es, emoji: w.emoji, tone: tonesOf(w.rom)[0] }));
  const bank: Item[] = TONE_BANK.map((w) => ({ th: w.th, rom: w.rom, es: w.es, emoji: w.emoji, tone: tonesOf(w.rom)[0] }));
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const it of [...shuffle(fromWords(focus)), ...shuffle([...fromWords(words), ...bank])]) {
    if (seen.has(it.th)) continue;
    seen.add(it.th);
    out.push(it);
    if (out.length >= n) break;
  }
  return out;
}

/** Regla de tono solo cuando se puede deducir con seguridad: consonante inicial + una marca (mai ek / mai tho). */
function ruleHint(item: Item): string | undefined {
  const m = item.th.match(/^[เแโไใ]?([ก-ฮ])[ะาิีึืุูัำ็ๅ]*([่้])/);
  if (!m) return undefined;
  // un segundo consonante antes de la marca (grupos, ห/อ guía) no se puede deducir con seguridad
  const cls = CONSONANTS.find((c) => c.ch === m[1])?.cls;
  if (!cls) return undefined;
  const ek = m[2] === '่';
  const derived: ToneId = ek ? (cls === 'baja' ? 'F' : 'L') : cls === 'baja' ? 'H' : 'F';
  if (derived !== item.tone) return undefined;
  const clsName = cls === 'baja' ? 'baja' : cls === 'alta' ? 'alta' : 'media';
  return `${m[1]} (consonante ${clsName}) + ${MAI[m[2]]} ${m[2]} = tono ${tones[derived].name.toLowerCase()}.`;
}

function Contour({ tone, run }: { tone: ToneId; run: number }) {
  const t = tones[tone];
  const p = useSharedValue(1);
  useEffect(() => {
    p.value = 1;
    p.value = withDelay(120, withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [run, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: p.value * 40 }));
  return (
    <Svg width={132} height={77} viewBox="0 0 24 14">
      <Path d={t.path} stroke={color.niebla3} strokeWidth={2.8} strokeLinecap="round" fill="none" />
      <AnimatedPath d={t.path} stroke={t.fill} strokeWidth={2.8} strokeLinecap="round" fill="none" strokeDasharray="40" animatedProps={props} />
    </Svg>
  );
}

/** Juego 7 · Trompa de tonos: escucha una sílaba y elige su tono. */
export default function Tonos({ mode, words, focus, rounds, onAnswer, onDone }: GameProps) {
  const n = rounds ?? (mode === 'feria' ? 10 : 6);
  const score = useScore(mode);
  const list = useMemo(() => makeItems(words, focus, n), [words, focus, n]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<ToneId | null>(null);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [talking, setTalking] = useState(false);
  const it = list[i];

  const play = (slow = false) => {
    if (!it) return;
    setTalking(true);
    say(it.th, { slow, onDone: () => setTalking(false) });
  };
  useEffect(() => {
    const t = setTimeout(() => play(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!it) return null;

  const stateOf = (t: ToneId): TileState => {
    if (checked === null) return pick === t ? 'sel' : 'idle';
    if (t === it.tone) return 'ok';
    if (t === pick) return 'bad';
    return 'gone';
  };

  const check = () => {
    const ok = pick === it.tone;
    score.hit(ok);
    onAnswer(ok, it.id);
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

  const rule = checked !== null ? ruleHint(it) : undefined;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <GameTitle title="¿Qué tono tiene?" sub={mode === 'feria' ? `Ronda ${i + 1} de ${list.length}` : undefined} />
          </View>
          <ComboBadge combo={score.combo} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Noi pose={checked === true ? 'celebra' : checked === false ? 'ups' : 'escucha'} size={checked === null ? 96 : 84} still={!talking && checked === null} />
          {checked === null ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <SpeakBtn onPress={() => play(false)} size={56} />
              <View style={{ flex: 1 }}>
                <Th size={44} bold>{it.th}</Th>
                <Txt v="bodyStrong">{it.es}</Txt>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Contour tone={it.tone} run={i} />
              <View style={{ flex: 1 }}>
                <Th size={34} bold>{it.th}</Th>
                <Txt v="small">{it.es}</Txt>
              </View>
            </View>
          )}
        </View>
        <View style={{ gap: 8 }}>
          {ORDER.map((t, k) => {
            const tn = tones[t];
            return (
              <Animated.View key={`${i}-${t}`} entering={FadeInDown.delay(k * 50).springify().damping(14)}>
                <Tile state={stateOf(t)} height={54} disabled={checked !== null} onPress={() => setPick(t)} accessibilityLabel={`${tn.name}, ${DESC[t]}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' }}>
                    <View style={{ width: 52, height: 34, borderRadius: 10, backgroundColor: tn.fill, alignItems: 'center', justifyContent: 'center' }}>
                      <ToneGlyph path={tn.path} color={tn.on} size={32} />
                    </View>
                    <Txt v="bodyStrong" style={{ flex: 1 }}>{tn.name}</Txt>
                    <Txt v="small">{DESC[t]}</Txt>
                  </View>
                </Tile>
              </Animated.View>
            );
          })}
        </View>
      </View>
      {checked === null ? <CheckBar ready={!!pick} onCheck={check} /> : null}
      {checked !== null ? (
        <AnswerSheet
          ok={checked}
          th={it.th}
          rom={it.rom}
          es={it.es}
          note={[`Tono ${tones[it.tone].name.toLowerCase()} (${DESC[it.tone]}).`, rule].filter(Boolean).join(' ')}
          onNext={next}
        />
      ) : null}
    </View>
  );
}
