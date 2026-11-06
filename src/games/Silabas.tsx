import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { color, tones } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { SpeakBtn, Th, Tile, Txt, type TileState } from '@/components/ui';
import { CONSONANTS, SYLLABLES } from '@/content/letters';
import { say } from '@/lib/audio';
import { shuffle } from '@/lib/random';
import { toneOfSyllable } from '@/lib/thai';

import { AnswerSheet, CheckBar, ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

type Syl = (typeof SYLLABLES)[number];
type Kind = 'v' | 'c' | 't';
type Round = { syl: Syl; cons: string[]; vows: string[]; tonesList: string[] };

const DOT = '◌';
const LOOKALIKES = ['กถภ', 'บปษ', 'ดคต', 'มนห', 'ชซ', 'ผฝพฟ', 'ขฃ', 'ยธ'];
const VPOS: Record<string, Syl['vpos']> = Object.fromEntries(SYLLABLES.map((s) => [s.v, s.vpos]));
const KIND_LABEL: Record<Kind, string> = { v: 'vocal', c: 'consonante', t: 'tono' };
const TONE_NAME: Record<string, string> = { '': 'sin marca', '่': 'mai èek', '้': 'mai thoo' };

/** Orden de escritura (el mismo que el del texto Unicode). */
const orderOf = (pos: Syl['vpos']): Kind[] => (pos === 'antes' ? ['v', 'c', 't'] : pos === 'despues' ? ['c', 't', 'v'] : ['c', 'v', 't']);

function compose(c: string, v: string, t: string): string {
  const pos = VPOS[v] ?? 'despues';
  return orderOf(pos).map((k) => (k === 'c' ? c : k === 'v' ? v : t)).join('');
}

const showVowel = (v: string) => (VPOS[v] === 'antes' ? v + DOT : DOT + v);

function makeRound(syl: Syl): Round {
  const similar = LOOKALIKES.filter((g) => g.includes(syl.c)).flatMap((g) => [...g]).filter((c) => c !== syl.c);
  const others = shuffle(SYLLABLES.map((s) => s.c).filter((c) => c !== syl.c && !similar.includes(c)));
  const cons = [syl.c, ...shuffle(similar).slice(0, 1), ...others].filter((c, i, a) => a.indexOf(c) === i).slice(0, 3);
  const vows = [syl.v, ...shuffle([...new Set(SYLLABLES.map((s) => s.v))].filter((v) => v !== syl.v))].slice(0, 3);
  return { syl, cons: shuffle(cons), vows: shuffle(vows), tonesList: ['', '่', '้'] };
}

function explain(s: Syl): string {
  const cons = CONSONANTS.find((c) => c.ch === s.c);
  const pos =
    s.vpos === 'antes'
      ? 'Esta vocal se escribe delante de la consonante, aunque se pronuncia después.'
      : s.vpos === 'arriba'
        ? 'Esta vocal se escribe encima de la consonante.'
        : s.vpos === 'abajo'
          ? 'Esta vocal se escribe debajo de la consonante.'
          : 'Esta vocal se escribe después de la consonante.';
  const cls = cons ? `La consonante es de clase ${cons.cls}` : 'La consonante';
  const tone = tones[toneOfSyllable(s.rom)].name.toLowerCase();
  const mark = s.t ? `; con ${TONE_NAME[s.t]} el tono es ${tone}.` : `; sin marca el tono es ${tone}.`;
  return `${pos} ${cls}${mark}`;
}

/** Juego «Bloques de sílabas»: construye la sílaba que oyes con consonante, vocal y tono. */
export default function Silabas({ mode, rounds, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const total = mode === 'feria' ? 10 : (rounds ?? 4);
  const list = useMemo(() => {
    const order: Syl[] = [];
    while (order.length < total) order.push(...shuffle(SYLLABLES));
    return order.slice(0, total).map(makeRound);
  }, [total]);

  const [i, setI] = useState(0);
  const [sel, setSel] = useState<Record<Kind, string | null>>({ c: null, v: null, t: null });
  const [checked, setChecked] = useState<null | boolean>(null);
  const [talking, setTalking] = useState(false);
  const r = list[i];

  const play = (slow = false) => {
    if (!r) return;
    setTalking(true);
    say(r.syl.th, { slow, onDone: () => setTalking(false) });
  };
  useEffect(() => {
    const t = setTimeout(() => play(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!r) return null;
  const s = r.syl;
  const order = orderOf(s.vpos);
  const ready = sel.c !== null && sel.v !== null && sel.t !== null;
  const built = ready ? compose(sel.c!, sel.v!, sel.t!) : [...order].map((k) => sel[k] ?? '').join('');

  const put = (k: Kind, val: string) => {
    if (checked !== null) return;
    setSel((x) => ({ ...x, [k]: x[k] === val ? null : val }));
  };

  const check = () => {
    const ok = compose(sel.c!, sel.v!, sel.t!) === s.th;
    score.hit(ok);
    onAnswer(ok);
    setChecked(ok);
  };

  const next = () => {
    if (i + 1 >= list.length) {
      onDone(score.result(score.correct));
      return;
    }
    setI(i + 1);
    setSel({ c: null, v: null, t: null });
    setChecked(null);
  };

  const state = (k: Kind, val: string): TileState => {
    if (checked !== null) {
      const right = k === 'c' ? s.c : k === 'v' ? s.v : s.t;
      if (val === right) return 'ok';
      if (sel[k] === val) return 'bad';
      return 'gone';
    }
    return sel[k] === val ? 'sel' : 'idle';
  };

  const group = (k: Kind, items: string[]) => (
    <View style={{ gap: 6 }}>
      <Txt v="eyebrow">{KIND_LABEL[k] === 'tono' ? 'Tono' : k === 'c' ? 'Consonantes' : 'Vocales'}</Txt>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {items.map((val) => (
          <Tile
            key={`${i}-${k}-${val}`}
            style={{ flex: 1 }}
            height={k === 't' ? 64 : 58}
            state={state(k, val)}
            disabled={checked !== null}
            onPress={() => put(k, val)}
            accessibilityLabel={`${KIND_LABEL[k]} ${k === 't' ? TONE_NAME[val] : ''}`.trim()}>
            {k === 'c' ? (
              <Th size={30}>{val}</Th>
            ) : k === 'v' ? (
              <Th size={28}>{showVowel(val)}</Th>
            ) : val === '' ? (
              <Txt v="small" style={{ color: color.tinta2 }}>sin marca</Txt>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Th size={26}>{DOT + val}</Th>
                <Txt v="small" style={{ fontSize: 11, lineHeight: 13 }}>{TONE_NAME[val]}</Txt>
              </View>
            )}
          </Tile>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <GameTitle title="Bloques de sílabas" sub={mode === 'feria' ? `Sílaba ${i + 1} de ${list.length}` : 'Construye la sílaba que oyes.'} />
          </View>
          <ComboBadge combo={score.combo} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Noi pose="escucha" size={88} still={!talking} />
          <SpeakBtn onPress={() => play(false)} size={52} />
          <SpeakBtn slow onPress={() => play(true)} size={40} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Th size={54}>{built || ' '}</Th>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
          {order.map((k) => (
            <Animated.View key={`${i}-${k}`} entering={FadeInDown.springify().damping(14)} style={{ alignItems: 'center', gap: 4 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Hueco de ${KIND_LABEL[k]}${sel[k] !== null ? ', toca para vaciarlo' : ''}`}
                onPress={() => sel[k] !== null && put(k, sel[k]!)}
                style={{
                  width: 86,
                  height: 74,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderStyle: sel[k] === null ? 'dashed' : 'solid',
                  borderColor: sel[k] === null ? color.niebla4 : color.cielo,
                  backgroundColor: sel[k] === null ? color.niebla2 : color.cieloSuave,
                }}>
                {sel[k] === null ? null : k === 'c' ? (
                  <Th size={32}>{sel[k]!}</Th>
                ) : k === 'v' ? (
                  <Th size={30}>{showVowel(sel[k]!)}</Th>
                ) : sel[k] === '' ? (
                  <Txt v="small">sin marca</Txt>
                ) : (
                  <Th size={30}>{DOT + sel[k]!}</Th>
                )}
              </Pressable>
              <Txt v="small">{KIND_LABEL[k]}</Txt>
            </Animated.View>
          ))}
        </View>

        {group('c', r.cons)}
        {group('v', r.vows)}
        {group('t', r.tonesList)}
      </View>
      {checked === null ? <CheckBar ready={ready} onCheck={check} label="Comprobar" /> : null}
      {checked !== null ? <AnswerSheet ok={checked} th={s.th} rom={s.rom} es={s.es} note={explain(s)} onNext={next} /> : null}
    </View>
  );
}
