import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Btn, Sheet, Th, Txt, Rom } from '@/components/ui';
import { fx, say } from '@/lib/audio';
import { pick } from '@/lib/random';

import { Pop } from './fx';

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

/** Calor de la llama según la racha: naranja → rojo → magenta → fuego azul. */
const HEAT = [
  { at: 20, outer: '#4F7BFF', inner: '#DCE7FF', text: '#2F55D6' },
  { at: 10, outer: '#E63E8C', inner: '#FFC8E3', text: '#B81E72' },
  { at: 5, outer: '#FF4F33', inner: '#FFC14D', text: '#D2381A' },
  { at: 0, outer: '#FF9A3D', inner: '#FFE07A', text: '#D9541C' },
];
const FLAME = 'M12 1c2 6 8 9 8 17a8 8 0 0 1-16 0c0-4 2-6.2 4-8 0 3 1 5 3 6-1-6 1-11 1-15z';
const FLAME_CORE = 'M12 13c1.6 3 4 4.6 4 8a4 4 0 0 1-8 0c0-2 1-3.2 2-4 .3 1.6 1 2.4 2 3-.4-2.6 0-5 0-7z';

/** Racha de aciertos: una llama que crece, tiembla y cambia de color; salta más fuerte cada 5. */
export function ComboBadge({ combo }: { combo: number }) {
  if (combo < 2) return null;
  return <ComboFlame combo={combo} />;
}

function ComboFlame({ combo }: { combo: number }) {
  const heat = HEAT.find((h) => combo >= h.at) ?? HEAT[HEAT.length - 1];
  const reduced = useReducedMotion();
  const f = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    f.value = withRepeat(withTiming(1, { duration: 170, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduced, f]);
  const flicker = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.92 + 0.14 * f.value }, { rotate: `${-3 + 6 * f.value}deg` }] }));
  const size = 30 + Math.min(combo, 20) * 1.1;
  return (
    <Pop trigger={combo} scale={combo % 5 === 0 ? 1.5 : 1.22} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Animated.View style={[{ width: size * 0.8, height: size }, flicker]}>
        <Svg width="100%" height="100%" viewBox="0 0 24 30">
          <Path d={FLAME} fill={heat.outer} />
          <Path d={FLAME_CORE} fill={heat.inner} />
        </Svg>
      </Animated.View>
      <Txt v="num" style={{ color: heat.text, fontSize: 18 + Math.min(combo, 20) * 0.5 }}>
        ×{combo}
      </Txt>
    </Pop>
  );
}

export function Center({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>{children}</View>;
}
