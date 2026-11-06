import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Btn, Sheet, Th, Txt, Rom } from '@/components/ui';
import { fx, say } from '@/lib/audio';
import { pick } from '@/lib/random';

export const OK_LINES = ['¡เก่งมาก! ¡Qué crack!', '¡Eso es!', '¡Perfecto!', '¡สุดยอด! ¡Genial!', '¡Bien hecho!', '¡Así se dice!'];
export const BAD_LINES = ['ไม่เป็นไร, casi', 'Uy, por poco', 'ไม่เป็นไร, a la próxima', 'Casi casi'];

export function GameTitle({ title, sub, dark }: { title: string; sub?: string; dark?: boolean }) {
  return (
    <View style={{ gap: 4 }}>
      <Txt v="h2" style={dark ? { color: '#FFFFFF' } : null}>{title}</Txt>
      {sub ? <Txt v="small" style={dark ? { color: '#C9D0EE' } : null}>{sub}</Txt> : null}
    </View>
  );
}

/** Lleva la cuenta de aciertos, combo y plátanos de una partida. */
export function useScore(mode: 'leccion' | 'feria') {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bananas, setBananas] = useState(0);
  const ref = useRef({ correct: 0, total: 0, bananas: 0, combo: 0 });
  const hit = (ok: boolean, sound = true) => {
    const r = ref.current;
    r.total += 1;
    if (ok) {
      r.correct += 1;
      r.combo += 1;
      r.bananas += mode === 'feria' ? 1 + Math.min(4, Math.floor(r.combo / 3)) : 2;
    } else r.combo = 0;
    if (sound) {
      if (ok) fx.ok(r.combo);
      else fx.bad();
    }
    setCorrect(r.correct);
    setTotal(r.total);
    setCombo(r.combo);
    setBananas(r.bananas);
    return r.combo;
  };
  const result = (score?: number) => ({ correct: ref.current.correct, total: ref.current.total, bananas: ref.current.bananas, score });
  return { correct, total, combo, bananas, hit, result };
}

/** Hoja de respuesta con Noi, la frase correcta y su audio. */
export function AnswerSheet({
  ok,
  th,
  rom,
  es,
  note,
  onNext,
}: {
  ok: boolean;
  th?: string;
  rom?: string;
  es?: string;
  note?: string;
  onNext: () => void;
}) {
  const [line] = useState(() => pick(ok ? OK_LINES : BAD_LINES));
  const fg = ok ? color.arrozalHondo : color.lacaHondo;
  return (
    <Sheet
      kind={ok ? 'ok' : 'bad'}
      title={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt v="h2" style={{ color: fg, flex: 1 }}>
            {line}
          </Txt>
          <View style={{ marginTop: -46, marginRight: -8 }}>
            <Noi pose={ok ? 'celebra' : 'ups'} size={92} />
          </View>
        </View>
      }
      action="Continuar"
      onAction={onNext}>
      {th ? (
        <View style={{ gap: 2 }}>
          {!ok ? <Txt v="small" style={{ color: fg }}>La respuesta era:</Txt> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Th size={24} style={{ color: color.tinta }}>
              {th}
            </Th>
            <Btn v="ghost" height={36} style={{ width: 52 }} silent onPress={() => say(th)} accessibilityLabel="Escuchar" icon={<Icon name="speaker" size={20} color={color.cieloHondo} />} />
          </View>
          {rom ? <Rom rom={rom} /> : null}
          {es ? <Txt v="bodyStrong" style={{ color: fg }}>{es}</Txt> : null}
        </View>
      ) : null}
      {note ? <Txt v="body" style={{ color: fg }}>{note}</Txt> : null}
    </Sheet>
  );
}

/** Botón inferior «Comprobar» que se activa al elegir. */
export function CheckBar({ ready, onCheck, label = 'Comprobar' }: { ready: boolean; onCheck: () => void; label?: string }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8 }}>
      <Btn label={ready ? label : 'Elige una respuesta'} disabled={!ready} onPress={onCheck} />
    </View>
  );
}

export function ComboBadge({ combo }: { combo: number }) {
  if (combo < 2) return null;
  return (
    <Animated.View key={combo} entering={ZoomIn.springify().damping(8)}>
      <Txt v="num" style={{ color: color.farol }}>×{combo}</Txt>
    </Animated.View>
  );
}

export function Center({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>{children}</View>;
}
