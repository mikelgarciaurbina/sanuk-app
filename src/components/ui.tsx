import { useEffect, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, font, shadow, tones, type ToneId } from '@/brand/tokens';
import { Art, Icon, ToneGlyph, type ArtIcon } from '@/components/icons';
import { fx } from '@/lib/audio';
import { useStore } from '@/lib/store';
import { syllables, toneOfSyllable } from '@/lib/thai';

// ——— Texto ———

type TxtVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'small' | 'eyebrow' | 'num';
const TXT: Record<TxtVariant, TextStyle> = {
  display: { fontFamily: font.displayBold, fontSize: 34, lineHeight: 38, color: color.tinta },
  h1: { fontFamily: font.displayBold, fontSize: 28, lineHeight: 32, color: color.tinta },
  h2: { fontFamily: font.display, fontSize: 23, lineHeight: 27, color: color.tinta },
  h3: { fontFamily: font.display, fontSize: 18, lineHeight: 22, color: color.tinta },
  body: { fontFamily: font.ui, fontSize: 16, lineHeight: 23, color: color.tinta2 },
  bodyStrong: { fontFamily: font.uiBold, fontSize: 16, lineHeight: 23, color: color.tinta },
  small: { fontFamily: font.uiBold, fontSize: 13, lineHeight: 18, color: color.tinta3 },
  eyebrow: { fontFamily: font.uiHeavy, fontSize: 12, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase', color: color.tinta3 },
  num: { fontFamily: font.displayBold, fontSize: 22, lineHeight: 26, color: color.tinta },
};

export function Txt({ v = 'body', style, children, ...rest }: { v?: TxtVariant; style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number }) {
  return (
    <Text style={[TXT[v], style]} {...rest}>
      {children}
    </Text>
  );
}

/** Texto thai con tipografía de bucles y altura de línea generosa (marcas de tono arriba y abajo). */
export function Th({ children, size = 22, style, bold, numberOfLines }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle>; bold?: boolean; numberOfLines?: number }) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontFamily: bold ? font.thaiBold : font.thai, fontSize: size, lineHeight: Math.round(size * 1.55), color: color.tinta },
        Platform.OS === 'android' ? { includeFontPadding: false } : null,
        style,
      ]}>
      {children}
    </Text>
  );
}

/** Transcripción con cada sílaba coloreada según su tono. */
export function Rom({ rom, size = 15, style, mono }: { rom: string; size?: number; style?: StyleProp<TextStyle>; mono?: string }) {
  const { p } = useStore();
  if (!p.settings.romanization) return null;
  const parts = rom.split(/([-\s·]+)/);
  return (
    <Text style={[{ fontFamily: font.uiBold, fontSize: size, lineHeight: size * 1.3 }, style]}>
      {parts.map((part, i) =>
        /^[-\s·]+$/.test(part) ? (
          <Text key={i} style={{ color: color.niebla4 }}>
            {part.includes(' ') ? ' ' : '·'}
          </Text>
        ) : (
          <Text key={i} style={{ color: mono ?? tones[toneOfSyllable(part)].text }}>
            {part}
          </Text>
        ),
      )}
    </Text>
  );
}

export function ToneChip({ tone, label, small }: { tone: ToneId; label?: string; small?: boolean }) {
  const t = tones[tone];
  return (
    <View style={[styles.tone, { backgroundColor: t.fill, height: small ? 24 : 28 }]}>
      <ToneGlyph path={t.path} color={t.on} size={small ? 18 : 22} />
      <Text style={{ fontFamily: font.uiHeavy, fontSize: small ? 11 : 12, color: t.on }}>{label ?? t.name}</Text>
    </View>
  );
}

/** Tono dominante de una palabra (para el chip de las tarjetas). */
export const mainTone = (rom: string): ToneId => toneOfSyllable(syllables(rom).slice(-1)[0] ?? '');

// ——— Botón con profundidad ———

type BtnVariant = 'primary' | 'ok' | 'bad' | 'ghost' | 'off' | 'blue' | 'dark';
const BTN: Record<BtnVariant, { face: string; depth: string; text: string; border?: string }> = {
  primary: { face: color.azafran, depth: color.azafranHondo, text: color.tinta },
  ok: { face: color.arrozal, depth: color.arrozalHondo, text: '#FFFFFF' },
  bad: { face: color.laca, depth: color.lacaHondo, text: '#FFFFFF' },
  ghost: { face: '#FFFFFF', depth: color.niebla3, text: color.tinta, border: color.niebla3 },
  off: { face: color.niebla2, depth: color.niebla3, text: color.tinta3 },
  blue: { face: color.cielo, depth: color.cieloHondo, text: '#FFFFFF' },
  dark: { face: color.tinta, depth: '#0B0F26', text: '#FFFFFF' },
};

export function Btn({
  label,
  onPress,
  v = 'primary',
  icon,
  disabled,
  height = 56,
  style,
  silent,
  accessibilityLabel,
}: {
  label?: string;
  onPress?: () => void;
  v?: BtnVariant;
  icon?: ReactNode;
  disabled?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
  silent?: boolean;
  accessibilityLabel?: string;
}) {
  const s = BTN[disabled ? 'off' : v];
  const press = useSharedValue(0);
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * 4 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 70 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 12, stiffness: 320 });
      }}
      onPress={() => {
        if (!silent) fx.tap();
        onPress?.();
      }}
      style={[{ height: height + 5, borderRadius: 18, backgroundColor: s.depth }, style]}>
      <Animated.View
        style={[
          styles.btnFace,
          { height, backgroundColor: s.face, borderColor: s.border ?? s.face, borderWidth: s.border ? 2 : 0 },
          face,
        ]}>
        {icon}
        {label ? <Text style={[styles.btnText, { color: s.text }]}>{label}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

// ——— Ficha de juego ———

export type TileState = 'idle' | 'sel' | 'ok' | 'bad' | 'gone' | 'hint';
const TILE: Record<TileState, { bg: string; border: string; depth: string; text: string }> = {
  idle: { bg: '#FFFFFF', border: color.niebla3, depth: color.niebla3, text: color.tinta },
  sel: { bg: color.cieloSuave, border: color.cielo, depth: color.cielo, text: color.cieloHondo },
  ok: { bg: color.arrozalSuave, border: color.arrozalVivo, depth: color.arrozal, text: color.arrozalHondo },
  bad: { bg: color.lacaSuave, border: color.laca, depth: color.lacaHondo, text: color.lacaHondo },
  gone: { bg: '#FFFFFF', border: color.niebla2, depth: color.niebla2, text: color.niebla4 },
  hint: { bg: color.azafranSuave, border: color.azafran, depth: color.azafranHondo, text: color.tinta },
};

export function Tile({
  children,
  state = 'idle',
  onPress,
  style,
  height = 64,
  disabled,
  accessibilityLabel,
}: {
  children: ReactNode;
  state?: TileState;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  height?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const t = TILE[state];
  const press = useSharedValue(0);
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);
  useEffect(() => {
    if (state === 'bad') {
      shake.value = withSequence(
        withTiming(-7, { duration: 50 }),
        withTiming(7, { duration: 60 }),
        withTiming(-5, { duration: 60 }),
        withTiming(4, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
    if (state === 'ok') pop.value = withSequence(withTiming(1.08, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 260 }));
  }, [state, shake, pop]);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { translateY: press.value * 3 }, { scale: pop.value }],
  }));
  return (
    <Animated.View style={[{ opacity: state === 'gone' ? 0.45 : 1 }, anim, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: state === 'sel', disabled: disabled || state === 'gone' }}
        disabled={disabled || state === 'gone'}
        onPressIn={() => {
          press.value = withTiming(1, { duration: 60 });
        }}
        onPressOut={() => {
          press.value = withSpring(0, { damping: 12, stiffness: 320 });
        }}
        onPress={onPress}
        style={{ borderRadius: 16, backgroundColor: t.depth, paddingBottom: state === 'gone' ? 0 : 4 }}>
        <View style={[styles.tile, { minHeight: height, backgroundColor: t.bg, borderColor: t.border }]}>{children}</View>
      </Pressable>
    </Animated.View>
  );
}

export const tileTextColor = (s: TileState) => TILE[s].text;

// ——— Chips, barras, burbujas ———

export function Chip({ icon, label, style, tint }: { icon?: ArtIcon; label: string | number; style?: StyleProp<ViewStyle>; tint?: string }) {
  return (
    <View style={[styles.chip, tint ? { backgroundColor: tint, borderColor: tint } : null, style]}>
      {icon ? <Art name={icon} size={22} /> : null}
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function Bar({ value, tint = color.arrozalVivo, height = 14, track = color.niebla3 }: { value: number; tint?: string; height?: number; track?: string }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withSpring(Math.max(0, Math.min(1, value)), { damping: 16, stiffness: 120 });
  }, [value, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={[styles.bar, { height, backgroundColor: track }]}>
      <Animated.View style={[styles.barFill, { backgroundColor: tint, minWidth: value > 0 ? 14 : 0 }, fill]}>
        <View style={styles.barShine} />
      </Animated.View>
    </View>
  );
}

export function Speech({ children, tail = 'bottom', style }: { children: ReactNode; tail?: 'bottom' | 'left' | 'none'; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.speech, style]}>
      {tail !== 'none' ? <View style={[styles.speechTail, tail === 'left' ? styles.tailLeft : styles.tailBottom]} /> : null}
      {children}
    </View>
  );
}

export function Sticker({ emoji, size = 76, rotate = 0, bg = '#FFFFFF' }: { emoji?: string; size?: number; rotate?: number; bg?: string }) {
  return (
    <View style={[styles.sticker, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, transform: [{ rotate: `${rotate}deg` }] }]}>
      <Text style={{ fontSize: size * 0.56, lineHeight: size * 0.72, textAlign: 'center' }}>{emoji ?? '✨'}</Text>
    </View>
  );
}

/** Botón redondo de audio (azul con profundidad). */
export function SpeakBtn({ onPress, size = 64, slow, label }: { onPress: () => void; size?: number; slow?: boolean; label?: string }) {
  return (
    <Btn
      v={slow ? 'ghost' : 'blue'}
      height={size}
      style={{ width: slow ? undefined : size + 8, borderRadius: size * 0.34 }}
      onPress={onPress}
      silent
      accessibilityLabel={label ?? (slow ? 'Escuchar más lento' : 'Escuchar')}
      icon={<Icon name={slow ? 'turtle' : 'speaker'} size={slow ? 22 : size * 0.46} color={slow ? color.cieloHondo : '#FFFFFF'} />}
      label={slow ? '60 %' : undefined}
    />
  );
}

// ——— Cabecera de juego y hoja de respuesta ———

export function Hud({ onClose, progress, right, dark }: { onClose: () => void; progress?: number; right?: ReactNode; dark?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Salir"
        onPress={onClose}
        hitSlop={10}
        style={[styles.x, { backgroundColor: dark ? 'rgba(14,17,36,0.42)' : 'rgba(255,255,255,0.78)' }]}>
        <Icon name="close" size={22} color={dark ? '#E4E8FA' : color.tinta2} />
      </Pressable>
      {progress !== undefined ? <Bar value={progress} track={dark ? 'rgba(255,255,255,0.18)' : color.niebla3} /> : <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

export function Sheet({
  kind,
  title,
  children,
  action,
  onAction,
}: {
  kind: 'ok' | 'bad' | 'info';
  title: ReactNode;
  children?: ReactNode;
  action: string;
  onAction: () => void;
}) {
  const insets = useSafeAreaInsets();
  const bg = kind === 'ok' ? color.arrozalSuave : kind === 'bad' ? color.lacaSuave : '#FFFFFF';
  const fg = kind === 'ok' ? color.arrozalHondo : kind === 'bad' ? color.lacaHondo : color.tinta;
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(16).stiffness(170)}
      style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.sheetBadge, { backgroundColor: kind === 'ok' ? color.arrozalVivo : kind === 'bad' ? color.laca : color.cielo }]}>
          <Icon name={kind === 'bad' ? 'refresh' : 'check'} size={20} color="#FFFFFF" stroke={3} />
        </View>
        <View style={{ flex: 1 }}>{typeof title === 'string' ? <Txt v="h2" style={{ color: fg }}>{title}</Txt> : title}</View>
      </View>
      {children}
      <Btn label={action} v={kind === 'bad' ? 'bad' : kind === 'ok' ? 'ok' : 'primary'} onPress={onAction} />
    </Animated.View>
  );
}

/** Contador que sube de 0 al valor. */
export function useCountUp(target: number, duration = 900) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = 0;
    v.value = withTiming(target, { duration, easing: Easing.out(Easing.cubic) });
  }, [target, duration, v]);
  return v;
}

export function Screen({ children, bg = color.niebla, style }: { children: ReactNode; bg?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flex: 1, backgroundColor: bg }, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  btnFace: { borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  btnText: { fontFamily: font.display, fontSize: 18, letterSpacing: 0.2 },
  tile: { borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: color.niebla3,
  },
  chipText: { fontFamily: font.uiHeavy, fontSize: 14, color: color.tinta },
  bar: { flex: 1, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  barShine: { position: 'absolute', left: 6, right: 6, top: 3, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  speech: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, ...shadow.card },
  speechTail: { position: 'absolute', width: 16, height: 16, backgroundColor: '#FFFFFF', transform: [{ rotate: '45deg' }], borderRadius: 3 },
  tailBottom: { left: 34, bottom: -6 },
  tailLeft: { left: -6, top: 18 },
  sticker: { alignItems: 'center', justifyContent: 'center', ...shadow.card },
  tone: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'flex-start' },
  hud: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 6 },
  x: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 20, gap: 14, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetBadge: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
