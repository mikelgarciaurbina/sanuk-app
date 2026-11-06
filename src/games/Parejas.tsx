import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Bar, Th, Tile, Txt, type TileState } from '@/components/ui';
import type { Word } from '@/content/types';
import { say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { ComboBadge, GameTitle, useScore } from './kit';
import type { GameProps } from './types';

const FERIA_SECONDS = 60;

function makeBoard(pool: Word[], focus: Word[], n: number): Word[] {
  const byEs = new Map<string, Word>();
  for (const w of [...shuffle(focus), ...shuffle(pool)]) if (!byEs.has(w.es) && byEs.size < n) byEs.set(w.es, w);
  return [...byEs.values()];
}

/** Juego 1 · Parejas: une thai y español antes de que se consuma la mecha. */
export default function Parejas({ mode, words, focus, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const [board, setBoard] = useState(() => makeBoard(words, focus, 5));
  const [right, setRight] = useState(() => shuffle(board));
  const [state, setState] = useState<Record<string, TileState>>({});
  const [sel, setSel] = useState<{ side: 'th' | 'es'; id: string } | null>(null);
  const [pairs, setPairs] = useState(0);
  const [time, setTime] = useState(FERIA_SECONDS);
  const [jump, setJump] = useState(0);
  const finished = useRef(false);
  const busy = useRef(false);
  const gone = useRef(new Set<string>());

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone(score.result(pairs));
  };

  useEffect(() => {
    if (mode !== 'feria') return;
    const t = setInterval(() => setTime((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [mode]);

  useEffect(() => {
    if (mode === 'feria' && time <= 0) finish();
  });

  const key = (side: 'th' | 'es', id: string) => `${side}:${id}`;
  const st = (side: 'th' | 'es', id: string): TileState => state[key(side, id)] ?? (sel?.side === side && sel.id === id ? 'sel' : 'idle');

  const tap = (side: 'th' | 'es', w: Word) => {
    if (busy.current || finished.current) return;
    if (side === 'th') say(w.th);
    if (!sel || sel.side === side) {
      setSel({ side, id: w.id });
      return;
    }
    const a = sel.id;
    const b = w.id;
    setSel(null);
    if (a === b) {
      score.hit(true);
      onAnswer(true, a);
      setJump((j) => j + 1);
      setState((s) => ({ ...s, [key('th', a)]: 'ok', [key('es', a)]: 'ok' }));
      busy.current = true;
      setTimeout(() => {
        busy.current = false;
        setState((s) => ({ ...s, [key('th', a)]: 'gone', [key('es', a)]: 'gone' }));
        gone.current.add(a);
        const done = board.every((x) => gone.current.has(x.id));
        setPairs((p) => p + 1);
        if (done) {
          if (mode === 'feria' && time > 0) {
            const next = makeBoard(words, [], 5);
            gone.current = new Set();
            setBoard(next);
            setRight(shuffle(next));
            setState({});
          } else finish();
        }
      }, 380);
    } else {
      score.hit(false);
      const thId = sel.side === 'th' ? a : b;
      onAnswer(false, thId);
      const ks = [key(sel.side, a), key(side, b)];
      setState((s) => ({ ...s, [ks[0]]: 'bad', [ks[1]]: 'bad' }));
      busy.current = true;
      setTimeout(() => {
        busy.current = false;
        setState((s) => {
          const n = { ...s };
          delete n[ks[0]];
          delete n[ks[1]];
          return n;
        });
      }, 520);
    }
  };

  const left = useMemo(() => board, [board]);

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <GameTitle title="Empareja" sub={mode === 'feria' ? 'Une todas las parejas que puedas antes de que se consuma la mecha.' : 'Toca una palabra thai y su traducción.'} />
        </View>
        <ComboBadge combo={score.combo} />
      </View>
      {mode === 'feria' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Bar value={time / FERIA_SECONDS} tint={color.farol} track="#F1E4D3" />
          <Txt v="num" style={{ width: 44, textAlign: 'right' }}>{Math.max(0, time)}</Txt>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 12 }}>
          {left.map((w) => (
            <Tile key={`th-${w.id}`} state={st('th', w.id)} onPress={() => tap('th', w)} height={62} accessibilityLabel={`Thai: ${w.th}`}>
              <Th size={23} numberOfLines={1}>
                {w.th}
              </Th>
            </Tile>
          ))}
        </View>
        <View style={{ flex: 1, gap: 12 }}>
          {right.map((w) => (
            <Tile key={`es-${w.id}`} state={st('es', w.id)} onPress={() => tap('es', w)} height={62} accessibilityLabel={w.es}>
              <Txt v="bodyStrong" style={{ textAlign: 'center', fontSize: 15 }} numberOfLines={2}>
                {w.es}
              </Txt>
            </Tile>
          ))}
        </View>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 18 }}>
        <Noi pose={score.combo >= 3 ? 'celebra' : 'feliz'} size={118} jump={jump} />
        <View style={{ alignItems: 'flex-end', paddingBottom: 14 }}>
          <Txt v="num" style={{ fontSize: 28 }}>
            {pairs}
            {mode === 'leccion' ? <Txt v="h3" style={{ color: color.tinta3 }}> / {board.length}</Txt> : null}
          </Txt>
          <Txt v="small">parejas</Txt>
        </View>
      </View>
    </View>
  );
}
