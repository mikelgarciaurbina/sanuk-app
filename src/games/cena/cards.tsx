// Piezas de «Cena familiar»: el bocadillo de quien habla (primero se oye; el thai se escribe solo y se traduce al
// tocarlo), tu bocadillo, las cartas de respuesta (cada una con su altavoz) y el «calor familiar».
import { useEffect, useId } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Rom, Th } from '@/components/ui';
import { useStore } from '@/lib/store';

import { Glow, Pop, Press3D } from '../fx';
import { SoundWave, Typed } from '../mercado/stall';

export type Said = { th: string; rom: string; es: string };

/**
 * Bocadillo de quien habla, con el pico hacia su cabeza.
 * `veil`: aún solo se oye (onda de sonido; al tocar se ve la frase) · `showRom`: con transcripción (se quita cuando
 * ya se lee) · `oral`: primera lección, la transcripción manda y el thai va pequeño debajo.
 */
export function SpeakerBubble({ name, tint, line, typedKey, showEs, showRom = true, veil, oral, tailX, onReveal, onSpeak, hint = 'toca para traducir' }: { name: string; tint: string; line: Said; typedKey: number; showEs: boolean; showRom?: boolean; veil?: boolean; oral?: boolean; tailX: number; onReveal: () => void; onSpeak: () => void; hint?: string }) {
  return (
    <Animated.View key={typedKey} entering={ZoomIn.springify().damping(14)} style={styles.bubble}>
      <View style={[styles.tail, { left: Math.max(16, tailX - 9) }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={veil ? `${name} está hablando. Toca para ver la frase` : `${name} dice: ${line.th}. Toca para ver la traducción`} onPress={onReveal} style={{ paddingRight: 34 }}>
        <Text style={[styles.name, { color: tint }]}>{name}</Text>
        {veil ? (
          <SoundWave tint={tint} height={24} label="escucha…" />
        ) : oral ? (
          <>
            <Rom rom={line.rom} size={19} />
            <Th size={14} style={{ color: color.tinta3, lineHeight: 21 }}>
              {line.th}
            </Th>
          </>
        ) : (
          <>
            <Typed key={`${typedKey}-${line.th}`} text={line.th} size={18} />
            {showRom ? <Rom rom={line.rom} size={12} /> : null}
          </>
        )}
        {showEs && !veil ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.es}>
            <Text style={styles.esText}>{line.es}</Text>
          </Animated.View>
        ) : hint ? (
          <Text style={styles.tap}>{hint}</Text>
        ) : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Escuchar otra vez" hitSlop={10} onPress={onSpeak} style={[styles.spk, { position: 'absolute', right: 10, top: 8 }]}>
        <Icon name="speaker" size={15} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

/** Lo que has dicho tú. */
export function MyBubble({ line }: { line: Said }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.me} pointerEvents="none">
      <View style={styles.meTail} />
      <Text style={styles.meLabel}>TÚ</Text>
      <Th size={17} bold>{line.th}</Th>
      <Rom rom={line.rom} size={11} />
      <Text style={styles.meEs}>{line.es}</Text>
    </Animated.View>
  );
}

export type CardState = 'idle' | 'wrong' | 'right' | 'dim';

/**
 * Carta de respuesta: se reparte volteándose desde abajo, se inclina al tocarla y tiembla si no encaja.
 * `rom` y `es` solo se pintan si llegan (en la feria el español se esconde; quien ya lee no lleva transcripción).
 * `onHear`: altavoz a su lado para oírla sin elegirla · `selected`: elegida para oírla, a falta de confirmar (de oído)
 * · `oral`: primera lección, manda la transcripción.
 */
export function AnswerCard({ th, rom, es, state, index, onPress, onHear, label, latin, selected, oral }: { th: string; rom?: string; es?: string; state: CardState; index: number; onPress: (e: GestureResponderEvent) => void; onHear?: () => void; label: string; latin?: boolean; selected?: boolean; oral?: boolean }) {
  const { p } = useStore();
  const romOn = !!rom && p.settings.romanization;
  const deal = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    deal.value = withDelay(80 + index * 120, withSpring(1, { damping: 13, stiffness: 130 }));
  }, [deal, index]);
  useEffect(() => {
    if (state === 'wrong') shake.value = withSequence(withTiming(-9, { duration: 50 }), withTiming(9, { duration: 60 }), withTiming(-6, { duration: 60 }), withTiming(4, { duration: 60 }), withTiming(0, { duration: 60 }));
  }, [state, shake]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.min(1, deal.value * 1.6),
    transform: [{ perspective: 800 }, { translateY: (1 - deal.value) * 70 }, { rotateX: `${(1 - deal.value) * 85}deg` }, { translateX: shake.value }],
  }));
  const tone =
    state === 'wrong'
      ? { bg: color.lacaSuave, border: color.laca, depth: color.lacaHondo }
      : state === 'right'
        ? { bg: color.arrozalSuave, border: color.arrozalVivo, depth: color.arrozal }
        : selected
          ? { bg: color.cieloSuave, border: color.cielo, depth: color.cieloHondo }
          : { bg: '#FFFDF7', border: '#E8C98E', depth: '#C99A4E' };
  const ink = state === 'wrong' ? color.lacaHondo : color.tinta;
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'stretch', gap: 6 }, st]}>
      <View style={{ flex: 1, opacity: state === 'dim' ? 0.45 : 1 }}>
        {state === 'right' ? <Glow size={260} tint={color.arrozalVivo} strength={0.35} style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -130, marginTop: -130 }} /> : null}
        <Press3D onPress={onPress} disabled={state !== 'idle'} accessibilityLabel={label} depth={10}>
          <View style={[styles.cardDepth, { backgroundColor: tone.depth }]}>
            <View style={[styles.card, { backgroundColor: tone.bg, borderColor: tone.border }]}>
              <View style={[styles.cardStripe, selected && state === 'idle' ? { backgroundColor: color.cielo } : null]} />
              <View style={{ flex: 1, gap: 1 }}>
                {latin ? (
                  <Text style={[styles.cardLatin, { color: ink }]}>{th}</Text>
                ) : oral && romOn ? (
                  <>
                    <Rom rom={rom ?? ''} size={18} />
                    <Th size={13} style={{ color: color.tinta3, lineHeight: 19 }}>
                      {th}
                    </Th>
                    {es ? <Text style={styles.cardEs}>{es}</Text> : null}
                  </>
                ) : (
                  <>
                    <Th size={18} bold style={{ color: ink }}>
                      {th}
                    </Th>
                    {romOn || es ? (
                      <Text style={styles.cardSub}>
                        {romOn ? <Rom rom={rom ?? ''} size={12} /> : null}
                        {es ? <Text style={styles.cardEs}>{romOn ? `  ·  ${es}` : es}</Text> : null}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
              {state === 'wrong' || state === 'right' ? (
                <View style={[styles.badge, { backgroundColor: state === 'right' ? color.arrozalVivo : color.laca }]}>
                  <Icon name={state === 'right' ? 'check' : 'x'} size={16} color="#FFFFFF" stroke={3.2} />
                </View>
              ) : null}
            </View>
          </View>
        </Press3D>
      </View>
      {onHear ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Escuchar: ${th}`} onPress={onHear} style={[styles.hear, { opacity: state === 'dim' ? 0.45 : 1 }]}>
          <Icon name="speaker" size={19} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z';

/** «Calor familiar» (o la alegría de Noi, la confianza de Yai…): un corazón que late y una barra que se llena con cada buena respuesta. */
export function Warmth({ value, dark, label = 'Calor familiar' }: { value: number; dark?: boolean; label?: string }) {
  const u = `w${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const w = useSharedValue(value);
  useEffect(() => {
    w.value = withSpring(Math.max(0.04, Math.min(1, value)), { damping: 15, stiffness: 110 });
  }, [value, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  const size = 26 + Math.min(1, value) * 8;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }} accessibilityLabel={`${label}: ${Math.round(value * 100)} %`}>
      <Pop trigger={Math.round(value * 100)} scale={1.4}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Defs>
            <LinearGradient id={u} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FF8FB1" />
              <Stop offset="1" stopColor="#E8365E" />
            </LinearGradient>
          </Defs>
          <Path d={HEART} fill={`url(#${u})`} />
          <Path d="M6.5 7.5c-1 .4-1.8 1.4-1.8 2.8" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.8} />
        </Svg>
      </Pop>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.warmLabel, dark ? { color: '#FFE7C2' } : null]} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.warmTrack}>
          <Animated.View style={[styles.warmFill, fill]}>
            <View style={styles.warmShine} />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 4,
    borderBottomColor: '#E7DCCB',
    shadowColor: '#2B1B14',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tail: { position: 'absolute', bottom: -9, width: 18, height: 18, backgroundColor: '#FFFFFF', borderRadius: 3, transform: [{ rotate: '45deg' }], borderRightWidth: 4, borderBottomWidth: 4, borderColor: '#E7DCCB' },
  name: { fontFamily: font.uiHeavy, fontSize: 12, letterSpacing: 0.4 },
  spk: { width: 30, height: 30, borderRadius: 10, backgroundColor: color.cielo, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: color.cieloHondo },
  es: { alignSelf: 'flex-start', marginTop: 5, backgroundColor: color.cieloSuave, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  esText: { fontFamily: font.uiBold, fontSize: 13, color: color.cieloHondo },
  tap: { fontFamily: font.uiBold, fontSize: 11, color: color.niebla4, marginTop: 3 },
  me: {
    alignSelf: 'flex-end',
    maxWidth: '86%',
    backgroundColor: color.azafranSuave,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: color.azafran,
    paddingHorizontal: 13,
    paddingVertical: 7,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  meTail: { position: 'absolute', right: 22, bottom: -8, width: 14, height: 14, backgroundColor: color.azafranSuave, borderRightWidth: 2, borderBottomWidth: 2, borderColor: color.azafran, transform: [{ rotate: '45deg' }] },
  meLabel: { fontFamily: font.uiHeavy, fontSize: 10, color: color.azafranHondo, letterSpacing: 1.2 },
  meEs: { fontFamily: font.uiBold, fontSize: 12, color: color.tinta2 },
  cardDepth: { borderRadius: 18, paddingBottom: 5 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, borderWidth: 2, paddingLeft: 14, paddingRight: 10, paddingVertical: 7, minHeight: 58, overflow: 'hidden' },
  cardStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: '#D93A3F' },
  cardSub: { flexWrap: 'wrap' },
  cardEs: { fontFamily: font.uiBold, fontSize: 12, color: color.tinta3 },
  cardLatin: { fontFamily: font.uiHeavy, fontSize: 15, lineHeight: 20 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  hear: { width: 44, marginBottom: 5, borderRadius: 16, backgroundColor: color.cielo, borderBottomWidth: 4, borderBottomColor: color.cieloHondo, alignItems: 'center', justifyContent: 'center' },
  warmLabel: { fontFamily: font.uiHeavy, fontSize: 10, letterSpacing: 1, color: color.tinta3, textTransform: 'uppercase' },
  warmTrack: { height: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  warmFill: { height: '100%', borderRadius: 10, backgroundColor: '#FF6A8A' },
  warmShine: { position: 'absolute', left: 4, right: 4, top: 2, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.55)' },
});
