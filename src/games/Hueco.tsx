import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { color } from '@/brand/tokens';
import { Rom, Th, Tile, Txt, type TileState } from '@/components/ui';
import { WORDS } from '@/content';
import type { Sentence, Word } from '@/content/types';
import { say } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { joinThai, personalize, personalizeRom, type Gender } from '@/lib/thai';

import { AnswerSheet, CheckBar, ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

type Round = {
  tokens: string[];
  /** transcripción por token (si la frase se puede alinear) */
  roms: string[] | null;
  rom: string;
  es: string;
  gap: number;
  options: string[];
};

const wordByTh = (() => {
  const m = new Map<string, Word>();
  for (const w of Object.values(WORDS)) if (!m.has(w.th)) m.set(w.th, w);
  return m;
})();

function gapIndex(raw: string[], tokens: string[]): number {
  const score = (i: number) => {
    if (/\{PQ?\}/.test(raw[i])) return -5;
    const c = wordByTh.get(tokens[i])?.cat;
    if (c === 'pregunta') return 4;
    if (c === 'particula' || c === 'verbo') return 3;
    if (raw[i].includes('{I}')) return 0;
    return 1;
  };
  const idx = tokens.map((_, i) => i);
  const best = Math.max(...idx.map(score));
  return shuffle(idx.filter((i) => score(i) === best))[0];
}

function build(tokens: string[], raw: string[], rom: string, es: string, extras: string[]): Round {
  const gap = gapIndex(raw, tokens);
  const right = tokens[gap];
  const cat = wordByTh.get(right)?.cat;
  const used = new Set([right]);
  const cands = shuffle([...new Set(extras)]).filter((t) => !used.has(t));
  const sameCat = cands.filter((t) => cat && wordByTh.get(t)?.cat === cat);
  const rest = cands.filter((t) => !sameCat.includes(t));
  const options = shuffle([right, ...[...sameCat, ...rest].slice(0, 3)]);
  const parts = rom.split(/\s+/).filter(Boolean);
  return { tokens, roms: parts.length === tokens.length ? parts : null, rom, es, gap, options };
}

function makeRounds(sentences: Sentence[], words: Word[], focus: Word[], g: Gender, n: number): Round[] {
  const usable = sentences.filter((s) => s.th.length >= 2);
  const out: Round[] = [];
  if (usable.length) {
    const order = shuffle(usable);
    for (let i = 0; i < n; i++) {
      const s = order[i % order.length];
      const extras = [...usable.filter((o) => o.id !== s.id).flatMap((o) => o.th.map((t) => personalize(t, g))), ...words.map((w) => w.th)];
      out.push(build(s.th.map((t) => personalize(t, g)), s.th, personalizeRom(s.rom, g), s.es, extras));
    }
    return out;
  }
  const pool = [...shuffle(focus), ...shuffle(words)];
  const uniq = pool.filter((w, i) => pool.findIndex((x) => x.id === w.id) === i);
  for (let i = 0; i < n; i++) {
    const ws = shuffle(uniq).slice(0, 3);
    out.push(build(ws.map((w) => w.th), ws.map((w) => w.th), ws.map((w) => w.rom).join(' '), ws.map((w) => w.es).join(' + '), words.map((w) => w.th)));
  }
  return out;
}

function FlyIn({ children }: { children: React.ReactNode }) {
  const y = useSharedValue(110);
  const s = useSharedValue(0.7);
  useEffect(() => {
    y.value = withSpring(0, { damping: 11, stiffness: 150 });
    s.value = withSpring(1, { damping: 9, stiffness: 180 });
  }, [y, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: s.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/** Juego 11 · La palabra perdida: completa el hueco de la frase. */
export default function Hueco({ mode, words, focus, sentences, rounds, gender, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const total = mode === 'feria' ? 8 : rounds ?? 5;
  const list = useMemo(() => makeRounds(sentences, words, focus, gender, total), [sentences, words, focus, gender, total]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [checked, setChecked] = useState<null | boolean>(null);
  const r = list[i];
  if (!r) return null;

  const right = r.tokens[r.gap];
  const phrase = joinThai(r.tokens);
  const stateOf = (t: string): TileState => {
    if (checked === null) return pick === t ? 'sel' : 'idle';
    if (t === right) return 'ok';
    if (t === pick) return 'bad';
    return 'gone';
  };

  const check = () => {
    const ok = pick === right;
    score.hit(ok);
    onAnswer(ok, wordByTh.get(right)?.id);
    setChecked(ok);
    setTimeout(() => say(phrase), 450);
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

  const romText = (r.roms ?? []).map((p, k) => (k === r.gap ? (checked !== null ? wordByTh.get(right)?.rom ?? '…' : pick ? wordByTh.get(pick)?.rom ?? '…' : '___') : personalizeRom(p, gender))).join(' ');
  const showRom = r.roms ? romText : checked !== null ? r.rom : '';
  const gapTone = checked !== null ? { bg: color.arrozalSuave, border: color.arrozalVivo, fg: color.arrozalHondo } : pick ? { bg: color.cieloSuave, border: color.cielo, fg: color.cieloHondo } : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <GameTitle title="La palabra perdida" sub={mode === 'feria' ? `Ronda ${i + 1} de ${list.length}` : 'Completa la frase.'} />
          </View>
          <ComboBadge combo={score.combo} />
        </View>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {r.tokens.map((t, k) =>
              k === r.gap ? (
                <View
                  key={k}
                  style={{
                    minWidth: 72,
                    minHeight: 50,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2.5,
                    borderStyle: gapTone ? 'solid' : 'dashed',
                    borderColor: gapTone?.border ?? color.niebla4,
                    backgroundColor: gapTone?.bg ?? 'transparent',
                    overflow: 'hidden',
                  }}>
                  {checked !== null ? (
                    <FlyIn key="fly">
                      <Th size={28} style={{ color: gapTone?.fg }}>{right}</Th>
                    </FlyIn>
                  ) : pick ? (
                    <Th size={28} style={{ color: gapTone?.fg }}>{pick}</Th>
                  ) : null}
                </View>
              ) : (
                <Th key={k} size={30}>{t}</Th>
              ),
            )}
          </View>
          {showRom ? <Rom rom={showRom} /> : null}
          <Txt v="h3" style={{ fontSize: 18 }}>{r.es}</Txt>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {r.options.map((t, k) => {
            const w = wordByTh.get(t);
            return (
              <Animated.View key={`${i}-${t}`} entering={FadeInDown.delay(k * 60).springify().damping(14)} style={{ width: '47.8%' }}>
                <Tile state={stateOf(t)} height={78} disabled={checked !== null} onPress={() => { setPick(t); say(t); }} accessibilityLabel={w ? `${t}, ${w.es}` : t}>
                  <View style={{ alignItems: 'center' }}>
                    <Th size={24}>{t}</Th>
                    {w ? <Txt v="small" numberOfLines={1}>{w.es}</Txt> : null}
                  </View>
                </Tile>
              </Animated.View>
            );
          })}
        </View>
      </View>
      {checked === null ? <CheckBar ready={!!pick} onCheck={check} /> : null}
      {checked !== null ? <AnswerSheet ok={checked} th={phrase} rom={personalizeRom(r.rom, gender)} es={r.es} onNext={next} /> : null}
    </View>
  );
}
