import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Btn, SpeakBtn, Th, Tile, Txt } from '@/components/ui';
import type { Sentence, Word } from '@/content/types';
import { say } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { joinThai, personalize, personalizeRom, type Gender } from '@/lib/thai';

import { AnswerSheet, ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

type Item = { id: string; th: string };
type Round = { tokens: string[]; rom: string; es: string; bank: Item[] };

const NOI_SIZE = 84;

function fromTokens(tokens: string[], rom: string, es: string, extras: string[]): Round {
  const own = new Set(tokens);
  const dis = shuffle(extras.filter((t) => !own.has(t)));
  const uniq = [...new Set(dis)].slice(0, tokens.length <= 3 ? 1 : 2);
  const bank = shuffle<Item>([...tokens.map((th, i) => ({ id: `t${i}`, th })), ...uniq.map((th, i) => ({ id: `d${i}`, th }))]);
  return { tokens, rom, es, bank };
}

function makeRounds(sentences: Sentence[], words: Word[], focus: Word[], g: Gender, n: number): Round[] {
  const usable = sentences.filter((s) => s.th.length >= 2);
  const out: Round[] = [];
  if (usable.length) {
    const order = shuffle(usable);
    for (let i = 0; i < n; i++) {
      const s = order[i % order.length];
      const extras = usable.filter((o) => o.id !== s.id).flatMap((o) => o.th.map((t) => personalize(t, g)));
      const fallback = words.map((w) => w.th);
      out.push(fromTokens(s.th.map((t) => personalize(t, g)), personalizeRom(s.rom, g), s.es, extras.length ? extras : fallback));
    }
    return out;
  }
  const pool = [...shuffle(focus), ...shuffle(words)];
  const uniq = pool.filter((w, i) => pool.findIndex((x) => x.id === w.id) === i);
  for (let i = 0; i < n; i++) {
    const size = i % 2 === 0 ? 2 : 3;
    const ws = shuffle(uniq).slice(0, size);
    out.push(fromTokens(ws.map((w) => w.th), ws.map((w) => w.rom).join(' '), ws.map((w) => w.es).join(' + '), words.map((w) => w.th)));
  }
  return out;
}

function Plank({ th, onPress, disabled }: { th: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(9).stiffness(220)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${th}`}
        disabled={disabled}
        onPress={onPress}
        style={{ backgroundColor: '#9C7432', borderRadius: 10, paddingBottom: 3 }}>
        <View style={{ minHeight: 52, minWidth: 54, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#E2BE7A', borderBottomWidth: 5, borderBottomColor: '#C99A4B', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', left: 6, top: 8, bottom: 10, width: 3, borderRadius: 3, backgroundColor: '#C99A4B' }} />
          <View style={{ position: 'absolute', right: 6, top: 8, bottom: 10, width: 3, borderRadius: 3, backgroundColor: '#C99A4B' }} />
          <Th size={20} bold style={{ color: '#4A3210' }}>
            {th}
          </Th>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Seg({ listen, onChange }: { listen: boolean; onChange: (v: boolean) => void }) {
  const opt = (label: string, v: boolean) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: listen === v }}
      onPress={() => onChange(v)}
      style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: listen === v ? color.tinta : 'transparent' }}>
      <Txt v="small" style={{ color: listen === v ? '#FFFFFF' : color.tinta2 }}>{label}</Txt>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 999, borderWidth: 2, borderColor: color.niebla3, padding: 0 }}>
      {opt('Leer', false)}
      {opt('Escuchar', true)}
    </View>
  );
}

/** Juego 10 · Puente de bambú: ordena las palabras para que Noi cruce el río. */
export default function Puente({ mode, words, focus, sentences, rounds, gender, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const total = mode === 'feria' ? 8 : rounds ?? 4;
  const list = useMemo(() => makeRounds(sentences, words, focus, gender, total), [sentences, words, focus, gender, total]);
  const [i, setI] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [listen, setListen] = useState(false);
  const [jump, setJump] = useState(0);
  const [width, setWidth] = useState(390);
  const walk = useSharedValue(0);
  const r = list[i];

  const noiStyle = useAnimatedStyle(() => ({ transform: [{ translateX: walk.value }] }));
  const phrase = r ? joinThai(r.tokens) : '';

  useEffect(() => {
    walk.value = 0;
    setPlaced([]);
    setChecked(null);
    if (listen && r) {
      const t = setTimeout(() => say(joinThai(r.tokens)), 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!r) return null;

  const byId = (id: string) => r.bank.find((b) => b.id === id)!;
  const ready = placed.length === r.tokens.length;

  const place = (id: string) => {
    if (checked !== null || placed.includes(id) || placed.length >= r.tokens.length) return;
    setPlaced((p) => [...p, id]);
  };
  const remove = (id: string) => {
    if (checked !== null) return;
    setPlaced((p) => p.filter((x) => x !== id));
  };

  const check = () => {
    const ok = joinThai(placed.map((id) => byId(id).th)) === phrase;
    score.hit(ok);
    onAnswer(ok);
    setChecked(ok);
    if (ok) {
      walk.value = withTiming(-(width - NOI_SIZE + 6), { duration: 1300, easing: Easing.inOut(Easing.quad) });
      setTimeout(() => setJump((j) => j + 1), 1300);
      say(phrase);
    }
  };

  const next = () => {
    if (i + 1 >= list.length) {
      onDone(score.result(score.correct));
      return;
    }
    setI(i + 1);
  };

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <GameTitle title="Construye el puente" sub={mode === 'feria' ? `Ronda ${i + 1} de ${list.length}` : undefined} />
        </View>
        <ComboBadge combo={score.combo} />
        <Seg listen={listen} onChange={(v) => { setListen(v); if (v) say(phrase); }} />
      </View>

      <View style={{ marginHorizontal: 20, marginTop: 12, minHeight: 64, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {listen ? (
          <>
            <SpeakBtn size={44} onPress={() => say(phrase)} />
            <SpeakBtn slow size={44} onPress={() => say(phrase, { slow: true })} />
            <Txt v="small" style={{ flex: 1 }}>Escucha y ordena lo que oyes</Txt>
          </>
        ) : (
          <>
            <Txt v="small">Traduce</Txt>
            <Txt v="h3" style={{ flex: 1, fontSize: 20 }}>{r.es}</Txt>
          </>
        )}
      </View>

      <View style={{ marginTop: 14, height: 250 }}>
        <Svg width="100%" height={250} viewBox="0 0 390 250" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute' }}>
          <Rect y={40} width={390} height={210} fill="#7FC1E8" />
          <Path d="M40 210 q16 -8 32 0 M150 236 q16 -8 32 0 M260 214 q16 -8 32 0 M320 246 q16 -8 32 0 M120 70 q16 -8 32 0 M230 60 q16 -8 32 0" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.6} fill="none" />
          <Path d="M0 20 C30 20 46 50 40 250 L0 250 Z" fill="#6FA587" />
          <Path d="M390 20 C360 20 344 50 350 250 L390 250 Z" fill="#6FA587" />
          <Path d="M0 20 C30 20 46 50 40 80 L0 80 Z" fill="#8CC09A" />
          <Path d="M390 20 C360 20 344 50 350 80 L390 80 Z" fill="#8CC09A" />
        </Svg>
        <Animated.View style={[{ position: 'absolute', right: -6, top: 34, zIndex: 3 }, noiStyle]}>
          <Noi pose={checked ? 'celebra' : 'feliz'} size={NOI_SIZE} jump={jump} accessibilityLabel="Noi" />
        </Animated.View>
        <View style={{ ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const), justifyContent: 'center', paddingHorizontal: 30 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 6, borderTopWidth: 4, borderBottomWidth: 4, borderColor: '#9C7432' }}>
            {placed.map((id) => (
              <Plank key={id} th={byId(id).th} onPress={() => remove(id)} disabled={checked !== null} />
            ))}
            {Array.from({ length: r.tokens.length - placed.length }).map((_, k) => (
              <View key={`s${k}`} style={{ height: 52, width: 62, borderRadius: 10, borderWidth: 2.5, borderStyle: 'dashed', borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.18)' }} />
            ))}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, paddingTop: 16 }}>
        {r.bank.map((b) => (
          <Tile key={b.id} state={placed.includes(b.id) ? 'gone' : 'idle'} height={50} disabled={checked !== null} onPress={() => place(b.id)} accessibilityLabel={b.th}>
            <Th size={21}>{b.th}</Th>
          </Tile>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      {checked === null ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 }}>
          <Btn label={ready ? 'Comprobar' : 'Coloca una tabla más'} disabled={!ready} onPress={check} />
        </View>
      ) : (
        <AnswerSheet ok={checked} th={phrase} rom={r.rom} es={r.es} onNext={next} />
      )}
    </View>
  );
}
