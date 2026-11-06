import { useEffect, type ComponentRef, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, SlideInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Bar, Btn, Rom, Speech, Th, Tile, Txt } from '@/components/ui';
import { DIALOGUES } from '@/content';
import type { Dialogue, DialogueLine } from '@/content/types';
import { say } from '@/lib/audio';
import { pick, shuffle } from '@/lib/random';
import { personalize, personalizeRom } from '@/lib/thai';

import { useScore } from './kit';
import type { GameProps } from './types';

type Who = DialogueLine['who'];
type Option = NonNullable<DialogueLine['options']>[number];
type Msg = { key: number; who: Who | 'me'; th: string; rom: string; es: string };

const FAMILY: Record<Who, { th: string; bg: string; name: string }> = {
  Mae: { th: 'แม่', bg: '#9A5B32', name: 'Mae' },
  Pho: { th: 'พ่อ', bg: '#2B3A86', name: 'Pho' },
  Yai: { th: 'ยาย', bg: '#13854F', name: 'Yai' },
  Nong: { th: 'น้อง', bg: '#FF6A3D', name: 'Nong' },
  Lung: { th: 'ลุง', bg: '#7B4FC4', name: 'Lung' },
  Noi: { th: 'น้อย', bg: '#3D7BFF', name: 'Noi' },
};
const ROLE: Record<Who, string> = { Mae: 'mamá', Pho: 'papá', Yai: 'abuela', Nong: 'hermana', Lung: 'tío', Noi: 'Noi' };

function Avatar({ who, size = 36, ring }: { who: Who; size?: number; ring?: boolean }) {
  const f = FAMILY[who];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: f.bg, alignItems: 'center', justifyContent: 'center', borderWidth: ring ? 2 : 0, borderColor: '#FFFFFF' }}>
      <Th size={size * 0.38} bold style={{ color: '#FFFFFF' }}>{f.th}</Th>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const o = useSharedValue(0.35);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    o.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 350 }), withTiming(0.35, { duration: 350 })), -1));
  }, [delay, o, reduced]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 7, backgroundColor: '#8E98B1' }, st]} />;
}

function Typing({ who }: { who: Who }) {
  return (
    <Animated.View entering={FadeInUp.duration(180)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Avatar who={who} />
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', gap: 4 }}>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
      <Txt v="small" style={{ fontSize: 11 }}>{FAMILY[who].name} está escribiendo…</Txt>
    </Animated.View>
  );
}

/** Juego 15 · Cena familiar: conversa con la familia eligiendo qué contestar. */
export default function Cena({ mode, extra, gender, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const [dlg] = useState<Dialogue>(() => (extra?.kind === 'dialogo' && DIALOGUES[extra.id]) || pick(Object.values(DIALOGUES)));
  const lines = dlg.lines;
  const asked = useMemo(() => Math.max(1, lines.filter((l) => l.options?.length).length), [lines]);
  const people = useMemo(() => [...new Set(lines.map((l) => l.who))].slice(0, 4), [lines]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState<Who | null>(null);
  const [idx, setIdx] = useState(0);
  const [options, setOptions] = useState<Option[] | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [okCount, setOkCount] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const key = useRef(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const P = (s: string) => personalize(s, gender);
  const PR = (s: string) => personalizeRom(s, gender);
  const push = (m: Omit<Msg, 'key'>) => setMsgs((a) => [...a, { ...m, key: ++key.current }]);

  const showLine = (n: number) => {
    const line = lines[n];
    if (!line) {
      setEnded(true);
      return;
    }
    setTyping(line.who);
    later(() => {
      setTyping(null);
      push({ who: line.who, th: P(line.th), rom: PR(line.rom), es: line.es });
      say(P(line.th));
      setIdx(n);
      if (line.options?.length) later(() => setOptions(shuffle(line.options!)), 350);
      else later(() => showLine(n + 1), 900);
    }, 900);
  };

  useEffect(() => {
    const t = setTimeout(() => showLine(0), 400);
    const all = timers.current;
    return () => {
      clearTimeout(t);
      all.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (o: Option) => {
    const line = lines[idx];
    if (!options) return;
    if (!o.ok) {
      score.hit(false);
      onAnswer(false);
      setWrong((w) => [...w, o.th]);
      setHint(`Mmm, esa no encaja. ${FAMILY[line.who].name} ha dicho: «${line.es}»`);
      return;
    }
    score.hit(true);
    onAnswer(true);
    setHint(null);
    setOptions(null);
    setWrong([]);
    setOkCount((c) => c + 1);
    push({ who: 'me', th: P(o.th), rom: PR(o.rom), es: o.es });
    say(P(o.th));
    const nextLine = lines[idx + 1];
    const r = o.reply;
    if (r && !(nextLine && P(nextLine.th) === P(r.th))) {
      later(() => {
        setTyping(line.who);
        later(() => {
          setTyping(null);
          push({ who: line.who, th: P(r.th), rom: PR(r.rom), es: r.es });
          say(P(r.th));
          later(() => showLine(idx + 1), 800);
        }, 900);
      }, 700);
    } else later(() => showLine(idx + 1), 800);
  };

  const finish = () => {
    const res = score.result();
    onDone({ ...res, score: res.correct });
  };

  const cur = lines[idx];
  const reveal = (k: number) => setRevealed((r) => (r.includes(k) ? r : [...r, k]));

  return (
    <View style={{ flex: 1, backgroundColor: '#F6EFE6' }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flexDirection: 'row' }}>
          {people.map((w, k) => (
            <View key={w} style={{ marginLeft: k ? -10 : 0 }}>
              <Avatar who={w} ring />
            </View>
          ))}
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Txt v="h3" style={{ fontSize: 16, lineHeight: 20 }} numberOfLines={1}>{dlg.title}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Bar value={Math.max(0.06, okCount / asked)} tint={color.farol} track="#F1E4D3" height={8} />
            <Icon name="heart" size={14} color={color.farol} />
            <Txt v="small" style={{ fontSize: 11 }}>cariño</Txt>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}>
        {msgs.length === 0 ? <Txt v="small" style={{ textAlign: 'center' }}>{dlg.scene}</Txt> : null}
        {msgs.map((m) =>
          m.who === 'me' ? (
            <Animated.View key={m.key} entering={FadeInDown.springify().damping(14)} style={{ alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: color.azafranSuave, borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: color.azafran }}>
              <Th size={18}>{m.th}</Th>
              <Rom rom={m.rom} size={13} />
            </Animated.View>
          ) : (
            <Animated.View key={m.key} entering={FadeInDown.springify().damping(14)} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '88%' }}>
              <Avatar who={m.who} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${FAMILY[m.who].name} dice: ${m.th}. Toca para ver la traducción`}
                onPress={() => { reveal(m.key); say(m.th); }}
                style={{ flexShrink: 1, backgroundColor: '#FFFFFF', borderRadius: 18, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10, gap: 2, minHeight: 44 }}>
                <Txt v="small" style={{ fontSize: 11, color: FAMILY[m.who].bg }}>{FAMILY[m.who].name} · {ROLE[m.who]}</Txt>
                <Th size={19}>{m.th}</Th>
                <Rom rom={m.rom} size={13} />
                {revealed.includes(m.key) ? (
                  <Animated.View entering={FadeInDown} style={{ alignSelf: 'flex-start', marginTop: 4, backgroundColor: color.cieloSuave, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Txt v="small" style={{ fontSize: 12, lineHeight: 14, color: color.cieloHondo }}>{m.es}</Txt>
                  </Animated.View>
                ) : null}
              </Pressable>
            </Animated.View>
          ),
        )}
        {typing ? <Typing who={typing} /> : null}
      </ScrollView>

      {hint ? (
        <Animated.View entering={SlideInDown.springify().damping(14)} style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, gap: 4 }}>
          <Noi pose="ups" size={64} />
          <Speech tail="left" style={{ flex: 1, marginBottom: 10 }}>
            <Txt v="small" style={{ color: color.tinta2 }}>{hint}</Txt>
          </Speech>
        </Animated.View>
      ) : null}

      <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30, gap: 10, minHeight: 110 }}>
        {ended ? (
          <>
            <Txt v="h3">¡Qué buena cena! La familia está encantada.</Txt>
            <Btn label="Continuar" onPress={finish} />
          </>
        ) : options && cur ? (
          <>
            <Txt v="eyebrow">¿Qué le contestas a {FAMILY[cur.who].name}?</Txt>
            {options.map((o) => (
              <Animated.View key={o.th} entering={FadeInDown.springify().damping(14)}>
                <Tile state={wrong.includes(o.th) ? 'bad' : 'idle'} height={56} disabled={wrong.includes(o.th)} onPress={() => choose(o)} accessibilityLabel={`${P(o.th)}, ${o.es}`}>
                  <View style={{ alignSelf: 'stretch', alignItems: 'flex-start' }}>
                    <Th size={19}>{P(o.th)}</Th>
                    <Txt v="small" style={{ fontSize: 12 }}>{o.es}</Txt>
                  </View>
                </Tile>
              </Animated.View>
            ))}
          </>
        ) : (
          <Txt v="small" style={{ textAlign: 'center' }}>Escucha a la familia…</Txt>
        )}
      </View>
    </View>
  );
}
