import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { color } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Bar, Rom, Speech, Th, Txt } from '@/components/ui';
import { BODY_COMMANDS, NOI_ZONES, type NoiTarget } from '@/content/drills';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { ComboBadge, useScore } from './kit';
import type { GameProps } from './types';

type Pose = 'feliz' | 'celebra' | 'ups';

const MIRROR: Partial<Record<NoiTarget, NoiTarget>> = { earL: 'earR', earR: 'earL', handL: 'handR', handR: 'handL' };
const LABEL: Record<NoiTarget, string> = {
  earL: 'oreja izquierda',
  earR: 'oreja derecha',
  eyes: 'ojos',
  trunk: 'trompa',
  hat: 'sombrero',
  handL: 'mano izquierda',
  handR: 'mano derecha',
  legs: 'patas',
  belly: 'barriga',
  mouth: 'boca',
};
/** orden de pintado: las zonas pequeñas encima de las grandes */
const ORDER: NoiTarget[] = ['hat', 'earL', 'earR', 'legs', 'eyes', 'belly', 'handL', 'handR', 'mouth', 'trunk'];

/** Juego 13 · Noi dice: toca la parte del cuerpo que te piden en thai. */
export default function NoiDice({ mode, rounds, onAnswer, onDone }: GameProps) {
  const score = useScore(mode);
  const total = mode === 'feria' ? 15 : rounds ?? 5;
  const { width } = useWindowDimensions();
  const size = Math.min(320, Math.max(220, width - 40));
  const k = size / 240;
  const list = useMemo(() => {
    const out: typeof BODY_COMMANDS = [];
    while (out.length < total) out.push(...shuffle(BODY_COMMANDS).filter((c) => c.target !== out[out.length - 1]?.target));
    return out.slice(0, total);
  }, [total]);
  const [i, setI] = useState(0);
  const [pose, setPose] = useState<Pose>('feliz');
  const [jump, setJump] = useState(0);
  const [missed, setMissed] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cmd = list[i];

  useEffect(() => {
    const t = setTimeout(() => cmd && say(cmd.th), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!cmd) return null;

  const flash = (p: Pose, ms: number, after?: () => void) => {
    setPose(p);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPose('feliz');
      after?.();
    }, ms);
  };

  const tap = (z: NoiTarget) => {
    if (busy.current) return;
    if (z === cmd.target) {
      busy.current = true;
      const combo = missed ? 0 : score.hit(true);
      if (missed) fx.ok();
      else onAnswer(true);
      if (!missed) setPoints((p) => p + Math.max(1, combo));
      setJump((j) => j + 1);
      setHint(null);
      flash('celebra', 750, () => {
        busy.current = false;
        setMissed(false);
        if (i + 1 >= list.length) {
          const r = score.result(points + (missed ? 0 : Math.max(1, combo)));
          onDone(r);
        } else setI(i + 1);
      });
      return;
    }
    if (z === 'trunk') {
      fx.bad();
      flash('ups', 900);
      return;
    }
    if (!missed) {
      score.hit(false);
      onAnswer(false);
    } else fx.bad();
    setMissed(true);
    setHint(MIRROR[cmd.target] === z ? 'Ojo: su izquierda es tu derecha' : `Eso era ${LABEL[z]}. ¡Prueba otra vez!`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#EEF4EC' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 10, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 10 }}>
          <Bar value={i / list.length} tint={color.arrozalVivo} track="#D7E6D4" />
          <ComboBadge combo={score.combo} />
          <Txt v="small">{i + 1} / {list.length}</Txt>
        </View>
        <Txt v="eyebrow">Noi dice…</Txt>
        <Speech style={{ alignItems: 'center', paddingHorizontal: 22 }}>
          <Th size={34}>{cmd.th}</Th>
          <Rom rom={cmd.rom} />
        </Speech>
        {missed ? (
          <Animated.View entering={FadeIn}>
            <Txt v="small" style={{ textAlign: 'center' }}>
              Toca <Txt v="bodyStrong">{cmd.es.replace('toca ', '')}</Txt>. {hint}
            </Txt>
          </Animated.View>
        ) : (
          <Txt v="small" style={{ textAlign: 'center' }}>Escucha y toca la parte de Noi. Su izquierda es tu derecha.</Txt>
        )}
      </View>

      <View style={{ width: size, height: size, alignSelf: 'center', marginTop: 12 }}>
        <Noi pose={pose} size={size} jump={jump} />
        {ORDER.map((z) => {
          const r = NOI_ZONES[z];
          return (
            <Pressable
              key={z}
              accessibilityRole="button"
              accessibilityLabel={`Noi: ${LABEL[z]}`}
              onPress={() => tap(z)}
              style={{ position: 'absolute', left: r.x * k, top: r.y * k, width: Math.max(44, r.w * k), height: Math.max(44, r.h * k) }}
            />
          );
        })}
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 30, paddingHorizontal: 20 }}>
        <Icon name="bulb" size={18} color={color.tinta3} />
        <Txt v="small">Si le tocas la trompa sin que te lo pida, estornuda.</Txt>
      </View>
    </View>
  );
}
