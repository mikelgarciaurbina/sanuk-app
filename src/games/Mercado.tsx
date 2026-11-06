import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { color } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Btn, Rom, Speech, SpeakBtn, Sticker, Th, Txt } from '@/components/ui';
import { BAHT, MARKET_ITEMS } from '@/content/drills';
import { fx, say } from '@/lib/audio';
import { randInt, shuffle } from '@/lib/random';
import { thaiDigits, thaiNumber, thaiNumberRom } from '@/lib/thai';

import { AnswerSheet, ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

type Item = (typeof MARKET_ITEMS)[number];
type Round = { item: Item; qty: number; price: number };
type Money = { id: number; v: number; kind: 'note' | 'coin'; color: string };

const CLF_ROM: Record<string, string> = { ลูก: 'lûuk', หวี: 'wǐi', แก้ว: 'gɛ̂ɛo', ชาม: 'chaam', ฟอง: 'fɔɔng' };
const WALLET = BAHT.filter((b) => b.v <= 500);

function plural(es: string): string {
  if (es === 'khao soi') return es;
  const [first, ...rest] = es.split(' ');
  const p = /s$/.test(first) ? first : /[aeiouáéíóú]$/.test(first) ? `${first}s` : `${first}es`;
  return [p, ...rest].join(' ');
}

function makeRounds(n: number): Round[] {
  const items = shuffle(MARKET_ITEMS);
  return Array.from({ length: n }, (_, i) => {
    const item = items[i % items.length];
    const qty = randInt(1, 3);
    return { item, qty, price: randInt(item.unit[0], item.unit[1]) * qty };
  });
}

function useRolling(target: number) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    const t = setInterval(() => {
      const d = target - cur.current;
      if (d === 0) return clearInterval(t);
      cur.current += Math.abs(d) <= 2 ? d : Math.round(d / 3);
      setV(cur.current);
    }, 35);
    return () => clearInterval(t);
  }, [target]);
  return v;
}

function Bill({ m, small, onPress, label }: { m: { v: number; kind: 'note' | 'coin'; color: string }; small?: boolean; onPress: () => void; label: string }) {
  const note = m.kind === 'note';
  const light = m.color === '#CFD6DE' || m.color === '#E9C46A' || m.color === '#E3C27A';
  const w = note ? (small ? 74 : undefined) : small ? 40 : 48;
  const h = note ? (small ? 38 : 52) : small ? 40 : 48;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={small ? 4 : 0}
      style={{ width: w, flex: note && !small ? 1 : undefined, height: Math.max(h, small ? 44 : h), alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: '100%',
          height: h,
          borderRadius: note ? 8 : 999,
          backgroundColor: m.color,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: note ? 0 : 3,
          borderColor: note ? 'transparent' : 'rgba(29,35,71,0.18)',
          borderBottomWidth: note ? 4 : 3,
          borderBottomColor: 'rgba(0,0,0,0.22)',
        }}>
        {note ? <View style={{ position: 'absolute', left: 5, top: 5, bottom: 5, right: 5, borderRadius: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' }} /> : null}
        <Txt v="num" style={{ fontSize: small ? 15 : 18, color: light ? color.tinta : '#FFFFFF' }}>{m.v}</Txt>
      </View>
    </Pressable>
  );
}

/** Juego 14 · Paga justo: paga con billetes y monedas lo que pide Mae. */
export default function Mercado({ mode, rounds, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const total = mode === 'feria' ? 8 : rounds ?? 3;
  const list = useMemo(() => makeRounds(total), [total]);
  const [i, setI] = useState(0);
  const [tray, setTray] = useState<Money[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);
  const [stars, setStars] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const uid = useRef(0);
  const shake = useSharedValue(0);
  const r = list[i];
  const sum = tray.reduce((a, m) => a + m.v, 0);
  const rolled = useRolling(sum);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const phrase = r ? `${r.item.th}${thaiNumber(r.qty)}${r.item.clf} ${thaiNumber(r.price)}บาทจ้ะ` : '';
  useEffect(() => {
    if (!r) return;
    const t = setTimeout(() => say(phrase), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!r) return null;
  const { item, qty, price } = r;
  const rom = `${item.rom} ${thaiNumberRom(qty)} ${CLF_ROM[item.clf] ?? ''}, ${thaiNumberRom(price)} bàat jâ`;
  const es = `${qty} ${qty > 1 ? plural(item.es) : item.es}, ${price} baht, cielo.`;
  const starsNow = Math.max(1, 3 - mistakes);

  const add = (b: (typeof WALLET)[number]) => {
    if (done) return;
    fx.coin();
    setMsg(null);
    setTray((t) => [...t, { ...b, id: ++uid.current }]);
  };
  const remove = (id: number) => {
    if (done) return;
    fx.tap();
    setTray((t) => t.filter((m) => m.id !== id));
  };

  const pay = () => {
    const ok = sum === price;
    score.hit(ok);
    onAnswer(ok);
    if (ok) {
      setStars(starsNow);
      setPoints((p) => p + starsNow);
      setDone(true);
      setMsg(null);
      setTimeout(() => say('ขอบคุณจ้ะ'), 300);
    } else {
      setMistakes((m) => m + 1);
      setMsg(sum > price ? 'Te has pasado: Mae no quiere tanto.' : 'Todavía te falta para pagar lo justo.');
      shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 60 }), withTiming(-5, { duration: 60 }), withTiming(0, { duration: 60 }));
    }
  };

  const next = () => {
    if (i + 1 >= list.length) {
      onDone(score.result(points));
      return;
    }
    setI(i + 1);
    setTray([]);
    setMistakes(0);
    setDone(false);
    setMsg(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FBF3E6' }}>
      <View style={{ height: 30, flexDirection: 'row', overflow: 'hidden' }}>
        {Array.from({ length: 14 }).map((_, k) => (
          <View key={k} style={{ flex: 1, backgroundColor: k % 2 ? '#FFFFFF' : color.azafran }} />
        ))}
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <GameTitle title="Paga justo" sub={mode === 'feria' ? `Ronda ${i + 1} de ${list.length}` : 'Paga exactamente lo que pide Mae.'} />
          </View>
          <ComboBadge combo={score.combo} />
          <View style={{ flexDirection: 'row' }} accessibilityLabel={`${starsNow} estrellas`}>
            {[1, 2, 3].map((s) => (
              <Icon key={s} name="star" size={22} color={s <= starsNow ? color.buatongHondo : color.niebla4} />
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: color.teca, alignItems: 'center', justifyContent: 'center' }}>
            <Th size={18} bold style={{ color: '#FFFFFF' }}>แม่</Th>
          </View>
          <Speech tail="left" style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Th size={19}>{phrase}</Th>
              </View>
              <SpeakBtn size={36} onPress={() => say(phrase)} />
            </View>
            <Rom rom={rom} size={13} />
            <Txt v="small" style={{ fontSize: 12 }}>{es}</Txt>
          </Speech>
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 14, height: 112, borderRadius: 24, backgroundColor: '#E9D2AE', borderBottomWidth: 8, borderBottomColor: '#D4B58A', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}>
          {Array.from({ length: qty }).map((_, k) => (
            <Sticker key={`${i}-${k}`} emoji={item.emoji} size={qty === 3 ? 62 : 70} rotate={[-10, 0, 12][k]} bg="#FFF8EA" />
          ))}
          {mistakes > 0 ? (
            <Animated.View entering={ZoomIn} style={{ position: 'absolute', right: 10, top: 10, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 12, height: 34, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Txt v="small">฿</Txt>
              <Th size={16} bold>{thaiDigits(price)}</Th>
            </Animated.View>
          ) : null}
        </View>

        <Animated.View style={[{ marginHorizontal: 20, marginTop: 14, padding: 12, borderRadius: 24, backgroundColor: '#FFFFFF', gap: 8 }, shakeStyle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Txt v="small">Tu pago</Txt>
            <Txt v="num" style={{ color: done ? color.arrozal : color.tinta }}>{rolled} <Txt v="body" style={{ color: color.tinta3 }}>฿</Txt></Txt>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 46, alignItems: 'center' }}>
            {tray.length === 0 ? <Txt v="small">Toca billetes y monedas de tu cartera</Txt> : null}
            {tray.map((m) => (
              <Animated.View key={m.id} entering={ZoomIn.springify().damping(10)}>
                <Bill m={m} small label={`Quitar ${m.v} baht`} onPress={() => remove(m.id)} />
              </Animated.View>
            ))}
          </View>
          {msg ? (
            <Animated.View entering={FadeIn}>
              <Txt v="small" style={{ color: color.lacaHondo }}>{msg} Pista: mira el precio en cifras thai.</Txt>
            </Animated.View>
          ) : null}
        </Animated.View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 8 }}>
          <Txt v="eyebrow">Tu cartera</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {WALLET.filter((b) => b.kind === 'note').map((b) => (
              <Bill key={b.v} m={b} label={`Billete de ${b.v} baht`} onPress={() => add(b)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {WALLET.filter((b) => b.kind === 'coin').reverse().map((b) => (
              <Bill key={b.v} m={b} label={`Moneda de ${b.v} baht`} onPress={() => add(b)} />
            ))}
          </View>
        </View>
      </ScrollView>
      {!done ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 }}>
          <Btn v="ok" label={sum > 0 ? `Pagar ${sum} ฿` : 'Elige con qué pagar'} disabled={sum === 0} onPress={pay} />
        </View>
      ) : (
        <AnswerSheet ok th="ขอบคุณจ้ะ" rom="khɔ̀ɔp-khun jâ" es={`Gracias, cielo. ${stars} ${stars === 1 ? 'estrella' : 'estrellas'}.`} onNext={next} />
      )}
    </View>
  );
}
