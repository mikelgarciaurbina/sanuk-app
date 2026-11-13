// La regla del tono, a la vista: las cinco teclas de tono (un ranat de cinco láminas lacadas, cada una con el color
// y el dibujo de su tono: al tocarla suena su melodía), la regla en tres pasos (clase + viva o muerta + marca = tono)
// y su versión de una línea para las fichas de palabra.
import { useEffect } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color, font, tones, type ToneId } from '@/brand/tokens';
import { ToneGlyph } from '@/components/icons';
import { ToneChip } from '@/components/ui';
import type { LetterClass } from '@/content/letters';
import { sfx, type Sfx } from '@/lib/audio';

import { Glow, Press3D } from '../fx';
import { useSvgId } from './anim';
import type { RuleStep, StepKey } from './silabas';

/** El color de cada clase de consonante (el mismo en los bloques, las fichas y la regla). */
export const CLASS_TINT: Record<LetterClass, { hi: string; base: string; deep: string; text: string }> = {
  media: { hi: '#FFE08A', base: '#FFB627', deep: '#C97C00', text: '#5A3300' },
  alta: { hi: '#FFB3B6', base: '#F2545B', deep: '#B8323A', text: '#FFFFFF' },
  baja: { hi: '#B8D3FF', base: '#4C8DFF', deep: '#2B5FC9', text: '#FFFFFF' },
};

/** El orden de siempre: สามัญ · เอก · โท · ตรี · จัตวา. */
export const TONE_ORDER: ToneId[] = ['M', 'L', 'F', 'H', 'R'];

/** La melodía de cada tono con las notas de la escala. */
const MELODY: Record<ToneId, Sfx[]> = { M: ['n4'], L: ['n2'], F: ['n7', 'n3'], H: ['n7'], R: ['n2', 'n6'] };

export function playTone(tone: ToneId) {
  const [a, b] = MELODY[tone];
  sfx(a);
  if (b) setTimeout(() => sfx(b), 130);
}

// ——— Las teclas ———

type KeyState = 'idle' | 'ok' | 'bad' | 'dim';

function ToneKey({ tone, k, w, state, disabled, onPress }: { tone: ToneId; k: number; w: number; state: KeyState; disabled?: boolean; onPress: (e: GestureResponderEvent) => void }) {
  const t = tones[tone];
  const id = useSvgId('key');
  const h = 96 - k * 4;
  const dx = useSharedValue(0);
  const sc = useSharedValue(1);
  useEffect(() => {
    if (state === 'bad') dx.value = withSequence(withTiming(-6, { duration: 50 }), withTiming(6, { duration: 60 }), withTiming(-4, { duration: 60 }), withTiming(0, { duration: 60 }));
    if (state === 'ok') sc.value = withSequence(withTiming(1.12, { duration: 120 }), withSpring(1, { damping: 7, stiffness: 220 }));
  }, [state, dx, sc]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }, { scale: sc.value }] }));
  return (
    <Animated.View style={[{ width: w, height: 100, justifyContent: 'center', opacity: state === 'dim' ? 0.42 : 1 }, st]}>
      {state === 'ok' ? <Glow size={w * 2} tint="#FFE27A" strength={0.8} style={{ position: 'absolute', left: -w / 2, top: 50 - w }} /> : null}
      <Press3D onPress={onPress} disabled={disabled} style={{ width: w, height: h }} accessibilityLabel={`Tono ${t.name.toLowerCase()}`}>
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.42} />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.16} />
            </LinearGradient>
          </Defs>
          {/* canto de la lámina */}
          <Rect x={0} y={5} width={w} height={h - 5} rx={13} fill="#3A2412" opacity={0.55} />
          <Rect x={0} y={0} width={w} height={h - 5} rx={13} fill={t.fill} />
          <Rect x={0} y={0} width={w} height={h - 5} rx={13} fill={`url(#${id})`} />
          <Rect x={5} y={4} width={w - 10} height={3} rx={1.5} fill="#FFFFFF" opacity={0.55} />
          {/* por aquí pasa el cordón que sujeta las láminas */}
          <Circle cx={w / 2} cy={11} r={2.6} fill="#3A2412" opacity={0.45} />
          <Circle cx={w / 2} cy={h - 15} r={2.6} fill="#3A2412" opacity={0.45} />
          <Rect x={1.5} y={1.5} width={w - 3} height={h - 8} rx={12} fill="none" stroke={state === 'ok' ? '#FFFFFF' : state === 'bad' ? '#FFD0D0' : '#000000'} strokeOpacity={state === 'ok' || state === 'bad' ? 1 : 0.14} strokeWidth={state === 'ok' || state === 'bad' ? 3 : 1.5} />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.keyFace, { paddingBottom: 9 }]}>
          <ToneGlyph path={t.path} color={t.on} size={Math.min(40, w * 0.62)} />
          {/* el nombre cabe siempre: «Descendente» es largo y `adjustsFontSizeToFit` no existe en la web */}
          <Text numberOfLines={1} style={[styles.keyName, { color: t.on, fontSize: Math.min(10.5, (w - 6) / (t.name.length * 0.58)) }]}>
            {t.name}
          </Text>
        </View>
      </Press3D>
    </Animated.View>
  );
}

/** Las cinco teclas de tono. Tras contestar: `answer` se ilumina y `picked`, si no era, tiembla. */
export function ToneKeys({ width, picked, answer, disabled, onPick }: { width: number; picked: ToneId | null; answer: ToneId | null; disabled?: boolean; onPick: (t: ToneId, e: GestureResponderEvent) => void }) {
  const gap = 6;
  const w = Math.floor((width - 20 - gap * 4) / 5);
  return (
    <View style={[styles.ranat, { width }]}>
      {/* la caja de teca del ranat */}
      <View style={styles.ranatRail} />
      <View style={[styles.ranatRail, { top: undefined, bottom: 20 }]} />
      <View style={{ flexDirection: 'row', gap, alignItems: 'center' }}>
        {TONE_ORDER.map((t, k) => (
          <ToneKey key={t} tone={t} k={k} w={w} disabled={disabled} state={answer ? (t === answer ? 'ok' : t === picked ? 'bad' : 'dim') : t === picked ? 'ok' : 'idle'} onPress={(e) => onPick(t, e)} />
        ))}
      </View>
    </View>
  );
}

// ——— La regla en tres pasos ———

const STEP_TINT: Record<StepKey, { bg: string; text: string }> = {
  clase: { bg: color.buatong, text: color.tinta },
  final: { bg: color.arrozalSuave, text: color.arrozalHondo },
  marca: { bg: '#E3D4FF', text: '#5B38C4' },
};

function StepChip({ step, cls, live, wrong, small }: { step: RuleStep; cls: LetterClass; live: boolean; wrong?: boolean; small?: boolean }) {
  const tint = step.key === 'clase' ? { bg: CLASS_TINT[cls].base, text: CLASS_TINT[cls].text } : step.key === 'final' && !live ? { bg: color.niebla2, text: color.tinta2 } : STEP_TINT[step.key];
  return (
    <View style={[styles.chip, small && styles.chipSmall, { backgroundColor: tint.bg }, wrong ? styles.chipWrong : null]}>
      {step.th ? <Text style={[styles.chipThai, small && { fontSize: 15, lineHeight: 22 }, { color: tint.text }]}>{step.th}</Text> : null}
      <Text style={[styles.chipText, small && { fontSize: 12 }, { color: tint.text }]}>{step.label}</Text>
    </View>
  );
}

/**
 * La regla del tono como una suma: [clase] + [viva o muerta] + [marca] = [tono]. Se enseñan los `count` primeros
 * pasos (cada uno entra con un saltito) y, con `tone`, el resultado. `wrong` marca el paso que ha fallado.
 */
export function RuleSteps({ steps, cls, live, count = 3, tone, wrong, stagger }: { steps: RuleStep[]; cls: LetterClass; live: boolean; count?: number; tone?: ToneId | null; wrong?: StepKey | null; stagger?: boolean }) {
  return (
    <View style={styles.rule}>
      {steps.slice(0, count).map((step, k) => (
        <Animated.View key={step.key} entering={ZoomIn.delay(stagger ? 200 + k * 200 : 0).springify().damping(11).stiffness(240)} style={styles.ruleItem}>
          {k > 0 ? <Text style={styles.plus}>+</Text> : null}
          <StepChip step={step} cls={cls} live={live} wrong={wrong === step.key} />
        </Animated.View>
      ))}
      {tone && count >= steps.length ? (
        <Animated.View entering={ZoomIn.delay(stagger ? 200 + steps.length * 200 : 0).springify().damping(8).stiffness(220)} style={styles.ruleItem}>
          <Text style={styles.plus}>=</Text>
          <ToneChip tone={tone} small />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** La regla en una línea, para la ficha de una palabra de una sílaba: «ม baja + ◌้ = tono alto». */
export function ToneRuleLine({ letter, cls, silent, ending, mark, tone }: { letter: string; cls: LetterClass; silent?: boolean; ending: string; mark?: { ch: string; rom: string }; tone: ToneId }) {
  const steps: RuleStep[] = [
    { key: 'clase', th: letter, label: silent ? `muda · ${cls}` : cls, detail: '' },
    mark ? { key: 'marca', th: `◌${mark.ch}`, label: mark.rom, detail: '' } : { key: 'final', label: ending, detail: '' },
  ];
  return (
    <View style={styles.rule}>
      {steps.map((step, k) => (
        <View key={step.key} style={styles.ruleItem}>
          {k > 0 ? <Text style={styles.plus}>+</Text> : null}
          <StepChip step={step} cls={cls} live={ending === 'viva'} small />
        </View>
      ))}
      <View style={styles.ruleItem}>
        <Text style={styles.plus}>=</Text>
        <ToneChip tone={tone} small />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ranat: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', height: 112, paddingHorizontal: 10, borderRadius: 22, backgroundColor: '#B9773F', borderWidth: 2, borderColor: '#7A4A22', borderBottomWidth: 6 },
  ranatRail: { position: 'absolute', left: 6, right: 6, top: 18, height: 4, borderRadius: 2, backgroundColor: '#7A4A22', opacity: 0.55 },
  keyFace: { alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 2 },
  keyName: { fontFamily: font.uiHeavy, fontSize: 10.5, textAlign: 'center' },
  rule: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 5, rowGap: 6 },
  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 10, borderRadius: 15 },
  chipSmall: { height: 26, paddingHorizontal: 9, borderRadius: 13 },
  chipWrong: { borderWidth: 2.5, borderColor: color.laca },
  chipThai: { fontFamily: font.thaiBold, fontSize: 17, lineHeight: 25, includeFontPadding: false },
  chipText: { fontFamily: font.uiHeavy, fontSize: 13 },
  plus: { fontFamily: font.displayBold, fontSize: 18, color: color.tinta2 },
});
