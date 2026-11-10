// Piezas del puesto del mercado: toldo de rayas, mostrador de teca, etiqueta de pizarra con el precio,
// bocadillos (con el thai que se escribe solo), bandeja de bambú, cartera de cuero y el recibo.
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Rom, Th, Txt } from '@/components/ui';
import { thaiDigits } from '@/lib/thai';

import { Flip3D, Press3D } from '../fx';
import type { Line, Show } from './logic';

const uid = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');

// ——— Toldo y mostrador ———

export function Awning({ width, height = 44 }: { width: number; height?: number }) {
  const u = uid(useId());
  const n = 13;
  const sw = 390 / n;
  return (
    <Svg width={width} height={height} viewBox="0 0 390 48" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`${u}s`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000000" stopOpacity={0.28} />
          <Stop offset="0.45" stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.12} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={390} height={8} fill="#5A331C" />
      {Array.from({ length: n }, (_, i) => (
        <G key={i}>
          <Rect x={i * sw} y={6} width={sw + 0.5} height={30} fill={i % 2 ? '#FFF1DE' : '#E8473F'} />
          <Path d={`M${i * sw} 35 A${sw / 2} ${sw / 2.4} 0 0 0 ${(i + 1) * sw} 35 Z`} fill={i % 2 ? '#FFF1DE' : '#E8473F'} />
        </G>
      ))}
      <Rect x={0} y={6} width={390} height={30} fill={`url(#${u}s)`} />
      <Rect x={0} y={6} width={390} height={2.5} fill="#FFFFFF" opacity={0.25} />
      {Array.from({ length: n }, (_, i) => (
        <Circle key={i} cx={(i + 0.5) * sw} cy={44.5} r={2.4} fill={['#FFD166', '#FFF1C2', '#FF8A5B'][i % 3]} />
      ))}
    </Svg>
  );
}

export function Counter({ width, height }: { width: number; height: number }) {
  const u = uid(useId());
  return (
    <Svg width={width} height={height} viewBox="0 0 390 70" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`${u}t`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F0C489" />
          <Stop offset="1" stopColor="#C68A4C" />
        </LinearGradient>
        <LinearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8E5230" />
          <Stop offset="1" stopColor="#5C3119" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={12} width={390} height={58} fill={`url(#${u}f)`} />
      {[56, 128, 200, 272, 344].map((x) => (
        <Rect key={x} x={x} y={14} width={2} height={56} fill="#3E2010" opacity={0.35} />
      ))}
      <Path d="M10 34 C60 30 90 40 140 35 M210 30 C260 26 300 38 380 33 M30 54 C80 50 140 58 190 52 M230 56 C280 52 330 60 385 55" stroke="#B57A4C" strokeWidth={1.3} fill="none" opacity={0.45} />
      <Rect x={120} y={12} width={150} height={40} fill="#D93A3F" />
      <Path d="M120 22 L135 32 L150 22 L165 32 L180 22 L195 32 L210 22 L225 32 L240 22 L255 32 L270 22" stroke="#FFC83D" strokeWidth={3} fill="none" />
      <Path d="M120 40 H270" stroke="#FFC83D" strokeWidth={2} />
      <Path d="M120 52 L127 60 L134 52 L141 60 L148 52 L155 60 L162 52 L169 60 L176 52 L183 60 L190 52 L197 60 L204 52 L211 60 L218 52 L225 60 L232 52 L239 60 L246 52 L253 60 L260 52 L267 60 L270 56 V52 Z" fill="#D93A3F" />
      <Rect x={0} y={0} width={390} height={14} rx={3} fill={`url(#${u}t)`} />
      <Rect x={0} y={0} width={390} height={2.5} fill="#FFE9C2" opacity={0.8} />
      <Rect x={0} y={13} width={390} height={3} fill="#000000" opacity={0.25} />
    </Svg>
  );
}

// ——— Etiqueta del precio (pizarra con «45.-», como en los mercados thai) ———

const priceText = (n: number, show: Show) => `${show === 'thai' ? thaiDigits(n) : n}.-`;

function Board({ children, w, h }: { children: ReactNode; w: number; h: number }) {
  const u = uid(useId());
  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h} viewBox="0 0 84 56" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${u}b`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#36584A" />
            <Stop offset="1" stopColor="#1F3A2E" />
          </LinearGradient>
          <LinearGradient id={`${u}w`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#D9A066" />
            <Stop offset="1" stopColor="#99602F" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={84} height={56} rx={7} fill={`url(#${u}w)`} />
        <Rect x={5} y={5} width={74} height={46} rx={4} fill={`url(#${u}b)`} />
        <Ellipse cx={30} cy={20} rx={20} ry={8} fill="#FFFFFF" opacity={0.07} />
        <Path d="M10 46 C30 43 50 47 72 44" stroke="#FFFFFF" strokeWidth={1} opacity={0.12} fill="none" />
        <Rect x={0} y={0} width={84} height={2} rx={1} fill="#FFE2B8" opacity={0.6} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }]}>{children}</View>
    </View>
  );
}

/** Pizarra con el precio. Oculta (solo de oído) se voltea al tocarla para ver la pista. */
export function PriceTag({ price, deal, show, revealed, onReveal, w = 84 }: { price: number; deal?: number; show: Show; revealed: boolean; onReveal?: () => void; w?: number }) {
  const h = w * 0.66;
  const swing = useSharedValue(0);
  useEffect(() => {
    swing.value = withSequence(withTiming(-9, { duration: 160 }), withTiming(7, { duration: 220 }), withTiming(-4, { duration: 220 }), withSpring(0, { damping: 6 }));
  }, [swing, price, deal, revealed]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${swing.value}deg` }] }));
  const mode: Show = show === 'oculto' && revealed ? 'thai' : show;
  const shown = (n: number, big: boolean) => (
    <Text style={[styles.chalk, { fontSize: (big ? w * 0.3 : w * 0.17) * (String(n).length > 3 ? 0.82 : 1) }]} numberOfLines={1} adjustsFontSizeToFit>
      {priceText(n, mode === 'oculto' ? 'num' : mode)}
    </Text>
  );
  const face = (
    <Board w={w} h={h}>
      {deal !== undefined ? (
        <>
          <View>
            {shown(price, false)}
            <View style={styles.strike} />
          </View>
          {shown(deal, true)}
        </>
      ) : (
        shown(price, true)
      )}
      {revealed && show !== 'num' ? <Text style={styles.chalkSmall}>{deal ?? price} ฿</Text> : null}
    </Board>
  );
  const hidden = (
    <Board w={w} h={h}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name="speaker" size={w * 0.2} color="#FFF6DA" />
        <Text style={[styles.chalk, { fontSize: w * 0.3 }]}>?</Text>
      </View>
      <Text style={styles.chalkSmall}>{onReveal ? 'toca: pista' : '¡escucha!'}</Text>
    </Board>
  );
  return (
    <Animated.View style={[{ width: w, alignItems: 'center', transformOrigin: `${w / 2}px ${h + w * 0.3}px` }, st]}>
      {show === 'oculto' ? (
        <Press3D onPress={onReveal} disabled={!onReveal || revealed} accessibilityLabel={revealed ? `Precio: ${deal ?? price} baht` : 'Precio oculto. Toca para ver una pista'} style={{ width: w, height: h }}>
          <Flip3D flipped={revealed} front={hidden} back={face} style={{ width: w, height: h }} />
        </Press3D>
      ) : (
        <View accessible accessibilityLabel={`Precio: ${deal ?? price} baht`}>{face}</View>
      )}
      <View style={{ width: w * 0.08, height: w * 0.3, backgroundColor: '#8A5A2E', borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
    </Animated.View>
  );
}

// ——— Bocadillos ———

const CLUSTER = /[\s\S][ัิ-ฺ็-๎]*/g;

/** Texto thai que se escribe solo, sílaba a sílaba (la caja ya ocupa su tamaño final). */
export function Typed({ text, size, color: c = color.tinta }: { text: string; size: number; color?: string }) {
  const parts = text.match(CLUSTER) ?? [];
  const total = parts.length;
  const [n, setN] = useState(0);
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= total) clearInterval(t);
    }, 42);
    return () => clearInterval(t);
  }, [total]);
  return (
    <View>
      <Th size={size} bold style={{ opacity: 0 }}>
        {text}
      </Th>
      <View style={StyleSheet.absoluteFill}>
        <Th size={size} bold style={{ color: c }}>
          {parts.slice(0, n).join('')}
        </Th>
      </View>
    </View>
  );
}

/** Bocadillo de la vendedora, con el pico hacia ella. */
export function Bubble({ label, line, typedKey, showEs, onSpeak, style, tailTop = 22 }: { label: string; line: Line | null; typedKey: string | number; showEs?: boolean; onSpeak?: () => void; style?: StyleProp<ViewStyle>; tailTop?: number }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(13)} style={[styles.bubble, style]}>
      <View style={[styles.tail, { top: tailTop }]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Txt v="small" style={{ fontSize: 11, color: color.teca, flex: 1 }}>{label}</Txt>
        {line && onSpeak ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Escuchar otra vez" hitSlop={10} onPress={onSpeak} style={styles.spk}>
            <Icon name="speaker" size={15} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
      {line ? (
        <>
          <Typed key={`${typedKey}-${line.th}`} text={line.th} size={17} />
          <Rom rom={line.rom} size={12} />
          {showEs ? (
            <Animated.View entering={ZoomIn.duration(220)} style={styles.es}>
              <Text style={styles.esText}>{line.es}</Text>
            </Animated.View>
          ) : null}
        </>
      ) : (
        <Dots />
      )}
    </Animated.View>
  );
}

function Dot({ delay }: { delay: number }) {
  const o = useSharedValue(0.3);
  useEffect(() => {
    o.value = withDelay(delay, withSequence(withTiming(1, { duration: 300 }), withTiming(0.3, { duration: 300 }), withTiming(1, { duration: 300 }), withTiming(0.3, { duration: 300 }), withTiming(1, { duration: 300 })));
  }, [o, delay]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: (1 - o.value) * 2 }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 7, backgroundColor: '#9AA4BE' }, st]} />;
}

function Dots() {
  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 8 }}>
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
}

/** Lo que dices tú (bocadillo azafrán, pico abajo a la derecha). */
export function MeBubble({ line, style }: { line: Line; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(12)} pointerEvents="none" style={[styles.me, style]}>
      <View style={styles.meTail} />
      <Text style={styles.meLabel}>Tú</Text>
      <Th size={16} bold>{line.th}</Th>
      <Rom rom={line.rom} size={11} />
    </Animated.View>
  );
}

// ——— Bandeja de bambú y cartera ———

export function TrayBase({ width, height }: { width: number; height: number }) {
  const u = uid(useId());
  return (
    <Svg width={width} height={height} viewBox="0 0 360 90" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={`${u}i`} cx="50%" cy="40%" r="60%">
          <Stop offset="0" stopColor="#F6D9A0" />
          <Stop offset="1" stopColor="#D5A55C" />
        </RadialGradient>
        <LinearGradient id={`${u}r`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E9BC73" />
          <Stop offset="1" stopColor="#9C6A2C" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={180} cy={52} rx={176} ry={36} fill="#000000" opacity={0.28} />
      <Ellipse cx={180} cy={45} rx={176} ry={42} fill={`url(#${u}r)`} />
      <Ellipse cx={180} cy={44} rx={164} ry={35} fill={`url(#${u}i)`} />
      <G opacity={0.3} stroke="#9C6A2C" fill="none">
        <Ellipse cx={180} cy={44} rx={130} ry={27} strokeWidth={1.2} />
        <Ellipse cx={180} cy={44} rx={95} ry={19.5} strokeWidth={1.2} />
        <Ellipse cx={180} cy={44} rx={58} ry={12} strokeWidth={1.2} />
        <Path d="M180 9 V79 M70 18 L290 70 M290 18 L70 70 M20 44 H340" strokeWidth={0.9} />
      </G>
      <Path d="M30 30 C80 8 280 8 330 30" stroke="#FFF1CF" strokeWidth={2.5} fill="none" opacity={0.6} />
    </Svg>
  );
}

export function WalletBase() {
  const u = uid(useId());
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 360 150" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${u}l`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9A6440" />
          <Stop offset="1" stopColor="#5E351F" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={360} height={150} rx={22} fill={`url(#${u}l)`} />
      <Rect x={7} y={7} width={346} height={136} rx={17} fill="none" stroke="#E8C08E" strokeWidth={1.6} strokeDasharray="5 4" opacity={0.75} />
      <Rect x={0} y={0} width={360} height={3} rx={1.5} fill="#FFFFFF" opacity={0.18} />
      <Path d="M20 76 H340" stroke="#000000" strokeWidth={1.5} opacity={0.18} />
    </Svg>
  );
}

// ——— Barra de rapidez (feria) ———

export function SpeedBar({ run, ms }: { run: number; ms: number }) {
  const p = useSharedValue(1);
  useEffect(() => {
    if (!run) return;
    p.value = withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: ms, easing: Easing.linear }));
  }, [run, ms, p]);
  const st = useAnimatedStyle(() => ({ width: `${p.value * 100}%`, backgroundColor: p.value > 0.5 ? '#2DBE78' : p.value > 0.2 ? '#FFC83D' : '#FF6A3D' }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name="sparkle" size={14} color="#FFE7A6" />
      <View style={{ flex: 1, height: 7, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', borderRadius: 7 }, st]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chalk: { fontFamily: font.displayBold, color: '#FFF6DA', textShadowColor: 'rgba(255,255,255,0.35)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 3 },
  chalkSmall: { fontFamily: font.uiHeavy, fontSize: 10, color: '#D6E8DC', marginTop: -2 },
  strike: { position: 'absolute', left: -3, right: -3, top: '50%', height: 3, borderRadius: 2, backgroundColor: '#FF6A6A', transform: [{ rotate: '-12deg' }] },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 9,
    borderBottomWidth: 4,
    borderBottomColor: '#E2D6C4',
    shadowColor: '#1D2347',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tail: { position: 'absolute', left: -7, width: 16, height: 16, backgroundColor: '#FFFFFF', borderRadius: 3, transform: [{ rotate: '45deg' }] },
  spk: { width: 28, height: 28, borderRadius: 10, backgroundColor: color.cielo, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: color.cieloHondo },
  es: { alignSelf: 'flex-start', marginTop: 4, backgroundColor: color.cieloSuave, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  esText: { fontFamily: font.uiBold, fontSize: 12, color: color.cieloHondo },
  me: {
    backgroundColor: color.azafranSuave,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: color.azafran,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  meTail: { position: 'absolute', right: 18, bottom: -7, width: 13, height: 13, backgroundColor: color.azafranSuave, borderRightWidth: 2, borderBottomWidth: 2, borderColor: color.azafran, transform: [{ rotate: '45deg' }] },
  meLabel: { fontFamily: font.uiHeavy, fontSize: 10, color: color.azafranHondo, letterSpacing: 1 },
});
