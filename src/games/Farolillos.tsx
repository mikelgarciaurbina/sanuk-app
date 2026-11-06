import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Stars } from '@/components/Scenery';
import { Th, Txt } from '@/components/ui';
import { allWords, type Category, type Word } from '@/content';
import { fx } from '@/lib/audio';
import { rand, shuffle } from '@/lib/random';

import { ComboBadge, useScore } from './kit';
import type { GameProps } from './types';

const ROUND_SECONDS = 25;
const LAN_W = 76;
const LAN_H = 88;

const groupOf = (w: Word): string => (w.cat === 'fruta' || w.cat === 'bebida' ? 'comida' : (w.cat ?? ''));
const LABEL: Partial<Record<string, string>> = {
  comida: 'comida y bebida',
  animal: 'animales',
  color: 'colores',
  cuerpo: 'el cuerpo',
  numero: 'números',
  lugar: 'lugares',
  transporte: 'transporte',
  familia: 'la familia',
  naturaleza: 'la naturaleza',
  clima: 'el clima',
  casa: 'la casa',
  verbo: 'verbos',
  adjetivo: 'adjetivos',
  tiempo: 'el tiempo',
  saludo: 'saludos',
  cortesia: 'cortesía',
  pronombre: 'pronombres',
  sentimiento: 'sentimientos',
  cultura: 'cultura',
  cocina: 'cocina',
  dinero: 'dinero',
  norte: 'el norte',
  pregunta: 'preguntas',
  particula: 'partículas',
  conector: 'conectores',
};

type Round = { group: string; label: string; items: { word: Word; good: boolean }[] };

function uniqueBy(list: Word[]): Word[] {
  const seen = new Set<string>();
  return list.filter((w) => !seen.has(w.th) && (seen.add(w.th), true));
}

function buildRounds(words: Word[], focus: Word[], n: number): Round[] {
  let pool = uniqueBy(words.filter((w) => w.cat));
  const count = (p: Word[]) => {
    const m = new Map<string, Word[]>();
    for (const w of p) m.set(groupOf(w), [...(m.get(groupOf(w)) ?? []), w]);
    return [...m.entries()].filter(([, l]) => l.length >= 3);
  };
  if (count(pool).length === 0) pool = uniqueBy(allWords().filter((w) => w.cat));
  const groups = shuffle(count(pool));
  // las categorías con palabras nuevas primero
  groups.sort((a, b) => Number(b[1].some((w) => focus.some((f) => f.id === w.id))) - Number(a[1].some((w) => focus.some((f) => f.id === w.id))));
  const out: Round[] = [];
  for (let k = 0; k < n; k++) {
    const [group, list] = groups[k % groups.length];
    const good = shuffle(list).slice(0, 4);
    const rest = pool.filter((w) => groupOf(w) !== group);
    // los distractores salen de categorías distintas entre sí
    const byCat = new Map<string, Word>();
    for (const w of shuffle(rest)) if (!byCat.has(groupOf(w)) && byCat.size < good.length + 1) byCat.set(groupOf(w), w);
    const bad = [...byCat.values()];
    const cat = (good[0].cat ?? group) as Category;
    out.push({
      group,
      label: LABEL[group] ?? LABEL[cat] ?? group,
      items: shuffle([...good.map((word) => ({ word, good: true })), ...bad.map((word) => ({ word, good: false }))]),
    });
  }
  return out;
}

type LState = 'float' | 'ok' | 'bad';

function Lantern({
  word,
  x,
  top,
  area,
  dur,
  state,
  onTap,
}: {
  word: Word;
  x: number;
  top: number;
  area: number;
  dur: number;
  state: LState;
  onTap: () => void;
}) {
  const reduced = useReducedMotion();
  const y = useSharedValue(top);
  const glow = useSharedValue(0);
  const sway = useSharedValue(0);
  const op = useSharedValue(1);
  useEffect(() => {
    y.value = withTiming(-LAN_H - 20, { duration: dur * (Math.max(0, top + LAN_H + 20) / (area + LAN_H + 20)) + 1500, easing: Easing.linear });
    if (!reduced) sway.value = withRepeat(withSequence(withTiming(6, { duration: 1500 + rand(0, 600) }), withTiming(-6, { duration: 1500 + rand(0, 600) })), -1, true);
    return () => {
      cancelAnimation(y);
      cancelAnimation(sway);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (state === 'ok') {
      cancelAnimation(y);
      glow.value = withTiming(1, { duration: 200 });
      y.value = withTiming(-LAN_H - 80, { duration: 1500, easing: Easing.in(Easing.quad) });
    } else if (state === 'bad') {
      cancelAnimation(y);
      op.value = withTiming(0.35, { duration: 300 });
      y.value = withTiming(y.value + 90, { duration: 900, easing: Easing.out(Easing.quad) });
    }
  }, [state, glow, y, op]);
  const pos = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: y.value }, { translateX: sway.value }] }));
  const halo = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.9 + glow.value * 0.5 }] }));
  const lit = state === 'ok';
  const dead = state === 'bad';
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: 0, width: LAN_W, height: LAN_H + 10 }, pos]}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -22, top: -18, width: LAN_W + 44, height: LAN_H + 44, borderRadius: 60, backgroundColor: 'rgba(255,160,70,0.35)' }, halo]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Farolillo: ${word.th}`}
        disabled={state !== 'float'}
        onPress={onTap}
        style={{ width: LAN_W, height: LAN_H, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: LAN_W,
            height: LAN_H,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: lit ? '#FFB347' : dead ? '#2E3768' : '#F4C27A',
            borderWidth: lit ? 6 : 2,
            borderColor: lit ? '#FF8A3D' : dead ? '#4A5491' : '#E39A45',
          }}>
          <Th size={21} bold numberOfLines={1} style={{ color: dead ? '#C9D0EE' : '#5A2A00', lineHeight: 30 }}>
            {word.th}
          </Th>
        </View>
        <View style={{ position: 'absolute', bottom: -8, width: 20, height: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: lit ? '#C2410C' : dead ? '#1C2350' : '#B87A2E' }} />
      </Pressable>
    </Animated.View>
  );
}

/** Juego 5 · Noche de farolillos: suelta solo los de la categoría pedida. */
export default function Farolillos({ mode, words, focus, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const total = feria ? 4 : 1;
  const score = useScore(mode);
  const rounds = useMemo(() => buildRounds(words, focus, total), [words, focus, total]);
  const [r, setR] = useState(0);
  const [area, setArea] = useState({ w: 360, h: 520 });
  const [states, setStates] = useState<Record<string, LState>>({});
  const [time, setTime] = useState(ROUND_SECONDS);
  const [jump, setJump] = useState(0);
  const finished = useRef(false);
  const ended = useRef(false);
  const pts = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const round = rounds[r];

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  // posiciones: 4 carriles x 2 alturas, desordenados
  const layout = useMemo(() => {
    if (!round) return [];
    const lanes = Math.max(3, Math.floor((area.w - 16) / (LAN_W + 8)));
    const slots = shuffle(Array.from({ length: lanes * 2 }, (_, i) => i));
    const lane = (area.w - 16 - LAN_W) / Math.max(1, lanes - 1);
    return round.items.map((_, i) => {
      const s = slots[i % slots.length];
      return { x: 8 + (s % lanes) * lane, top: area.h * (0.12 + 0.34 * Math.floor(s / lanes)) + rand(0, 30) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, area.w, area.h]);

  const goodLeft = round ? round.items.filter((it) => it.good && states[it.word.id] !== 'ok').length : 0;
  const endRound = (timeout: boolean) => {
    if (ended.current || !round) return;
    ended.current = true;
    if (timeout) {
      for (const it of round.items) if (it.good && states[it.word.id] !== 'ok') onAnswer(false, it.word.id);
    }
    timers.current.push(
      setTimeout(() => {
        if (r + 1 >= rounds.length) {
          if (!finished.current) {
            finished.current = true;
            fx.done();
            onDone(score.result(pts.current));
          }
        } else {
          ended.current = false;
          setR(r + 1);
          setStates({});
          setTime(ROUND_SECONDS);
        }
      }, timeout ? 600 : 1300),
    );
  };

  useEffect(() => {
    if (ended.current) return;
    const t = setInterval(() => setTime((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [r]);
  useEffect(() => {
    if (time <= 0) endRound(true);
  });
  useEffect(() => {
    if (round && goodLeft === 0) endRound(false);
  });

  if (!round) return null;

  const tap = (it: { word: Word; good: boolean }) => {
    if (ended.current || states[it.word.id]) return;
    if (it.good) {
      fx.bell();
      score.hit(true, false);
      onAnswer(true, it.word.id);
      pts.current += 10;
      setJump((j) => j + 1);
      setStates((s) => ({ ...s, [it.word.id]: 'ok' }));
    } else {
      score.hit(false);
      onAnswer(false, it.word.id);
      setStates((s) => ({ ...s, [it.word.id]: 'bad' }));
    }
  };

  const onLayout = (e: LayoutChangeEvent) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const goodTotal = round.items.filter((it) => it.good).length;

  return (
    <View style={{ flex: 1, backgroundColor: color.noche }}>
      <Stars n={26} />
      <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Txt v="num" style={{ color: '#FFFFFF' }}>{feria ? `${r + 1} / ${total}` : `${goodTotal - goodLeft} / ${goodTotal}`}</Txt>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <ComboBadge combo={score.combo} />
          </View>
          <Txt v="num" style={{ color: time <= 8 ? color.buatong : '#FFFFFF' }}>0:{String(Math.max(0, time)).padStart(2, '0')}</Txt>
        </View>
        <View style={{ backgroundColor: color.noche2, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 2, borderColor: '#3A4580' }}>
          <Txt v="h3" style={{ color: '#FFFFFF', textAlign: 'center' }}>Suelta los farolillos de {round.label}</Txt>
        </View>
      </View>
      <View style={{ flex: 1, overflow: 'hidden' }} onLayout={onLayout}>
        {round.items.map((it, i) => (
          <Lantern
            key={`${r}-${it.word.id}`}
            word={it.word}
            x={layout[i]?.x ?? 0}
            top={layout[i]?.top ?? 0}
            area={area.h}
            dur={26000}
            state={states[it.word.id] ?? 'float'}
            onTap={() => tap(it)}
          />
        ))}
      </View>
      <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 }}>
        <Txt v="small" style={{ color: color.niebla4, flex: 1 }}>Yi Peng · la noche de los farolillos en Chiang Mai</Txt>
        <Noi pose={goodLeft === 0 ? 'celebra' : 'feliz'} size={80} jump={jump} />
      </View>
    </View>
  );
}
