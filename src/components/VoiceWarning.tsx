// Aviso de «no hay voz thai»: todo lo que suena en Sanuk lo dice la voz del sistema y, si el dispositivo no
// tiene ninguna en tailandés, la app entera se queda muda sin que nadie lo diga. Esta tarjeta lo cuenta con
// Noi y explica cómo instalar una voz en iPhone, Android y en el navegador. Si hay voz (o aún no se sabe),
// no pinta nada. Se puede cerrar: no vuelve a salir hasta que se abra la app otra vez.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { color, font, shadow } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Btn } from '@/components/ui';
import { fx, refreshThaiVoice, useThaiVoiceStatus } from '@/lib/audio';

export type VoiceWarningProps = {
  /** estilo del contenedor (márgenes, anchura…) */
  style?: StyleProp<ViewStyle>;
  /** versión de una línea, con «Cómo se arregla» para desplegar los pasos (para el principio de una lección) */
  compact?: boolean;
  /** se llama al cerrar el aviso */
  onDismiss?: () => void;
};

type Device = 'ios' | 'android' | 'web';

const GUIDE: Record<Device, { name: string; path?: string[]; tip: string }> = {
  ios: {
    name: 'iPhone y iPad',
    path: ['Ajustes', 'Accesibilidad', 'Contenido leído', 'Voces', 'Tailandés'],
    tip: 'Descarga una voz (Kanya suena muy bien) y vuelve a Sanuk.',
  },
  android: {
    name: 'Android',
    path: ['Ajustes', 'Idioma', 'Síntesis de voz', 'Instalar datos de voz', 'Tailandés'],
    tip: 'Si no lo encuentras, escribe «síntesis de voz» en el buscador de Ajustes.',
  },
  web: {
    name: 'En el navegador',
    tip: 'El navegador habla con las voces de tu dispositivo: usa Chrome, Edge o Safari, instala la voz tailandesa del sistema y recarga la página. En un Mac: Ajustes del Sistema → Accesibilidad → Contenido leído → Voz del sistema → Gestionar voces. En Windows: Configuración → Hora e idioma → Voz → Agregar voces.',
  },
};

const HERE: Device = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
const ORDER: Device[] = [HERE, ...(['ios', 'android', 'web'] as Device[]).filter((d) => d !== HERE)];

// cerrado para toda la sesión, en todas las pantallas donde esté puesto
let dismissed = false;
const subs = new Set<() => void>();
const subscribe = (fn: () => void) => {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
};
const isDismissed = () => dismissed;
const notDismissed = () => false;

/**
 * Tarjeta que avisa de que el dispositivo no tiene voz en tailandés y cómo conseguirla. No pinta nada si hay voz.
 * Ponla donde quieras con `style`; `compact` la deja en una línea hasta que se toca «Cómo se arregla».
 */
export function VoiceWarning({ style, compact, onDismiss }: VoiceWarningProps) {
  const status = useThaiVoiceStatus();
  const closed = useSyncExternalStore(subscribe, isDismissed, notDismissed);
  const [open, setOpen] = useState(!compact);
  // en el navegador no se sabe si es un móvil o un ordenador: se enseñan todos los caminos
  const [others, setOthers] = useState(HERE === 'web');
  const [checking, setChecking] = useState(false);
  const [still, setStill] = useState(0);
  const nudge = useSharedValue(0);
  const nudgeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }] }));

  if (status !== 'missing' || closed) return null;

  const dismiss = () => {
    dismissed = true;
    subs.forEach((fn) => fn());
    onDismiss?.();
  };

  const recheck = async () => {
    if (checking) return;
    setChecking(true);
    const now = await refreshThaiVoice().catch(() => 'missing' as const);
    setChecking(false);
    if (now === 'ok') {
      // la tarjeta desaparece sola: ya hay voz
      fx.sparkle();
      return;
    }
    setStill((n) => n + 1);
    nudge.set(withSequence(withTiming(-7, { duration: 50 }), withTiming(7, { duration: 70 }), withTiming(-4, { duration: 60 }), withTiming(0, { duration: 60 })));
  };

  const openSettings = () => {
    // la pantalla de «Síntesis de voz» de Android; si el teléfono no la ofrece así, no pasa nada
    Linking.sendIntent('com.android.settings.TTS_SETTINGS').catch(() => {});
  };

  const shown = others ? ORDER : ORDER.slice(0, 1);

  return (
    // la entrada va en la vista de fuera y el meneo en la de dentro: las dos animan `transform`
    <Animated.View entering={FadeInDown.springify().damping(16)} style={style} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Animated.View style={[styles.card, nudgeStyle]}>
      <View style={styles.head}>
        <View style={styles.noi}>
          <Noi pose="ups" size={compact && !open ? 64 : 84} accessibilityLabel="Noi, sin voz" />
          <Muted />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>¡Me he quedado sin voz!</Text>
          <Text style={styles.body}>
            {open
              ? 'Este dispositivo no tiene ninguna voz en tailandés, así que no puedo decirte las palabras. ไม่เป็นไร: se arregla en un minuto.'
              : 'Aquí no hay voz en tailandés: no vas a oír nada.'}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar el aviso" hitSlop={10} onPress={dismiss} style={styles.close}>
          <Icon name="close" size={18} color={color.tinta2} />
        </Pressable>
      </View>

      {open ? (
        <Animated.View entering={compact ? FadeIn.duration(200) : undefined} style={{ gap: 10 }}>
          {shown.map((d) => (
            <Steps key={d} device={d} titled={others} />
          ))}
          {still > 0 ? (
            <Animated.Text key={still} entering={FadeIn.duration(200)} style={styles.still}>
              Todavía no la encuentro. Si acabas de instalarla, cierra Sanuk del todo y vuelve a abrirla.
            </Animated.Text>
          ) : null}
          <View style={styles.actions}>
            <Btn label={checking ? 'Buscando…' : 'Ya la tengo'} v="primary" height={46} disabled={checking} onPress={recheck} style={{ flex: 1 }} />
            {HERE === 'android' ? <Btn label="Abrir ajustes" v="ghost" height={46} onPress={openSettings} style={{ flex: 1 }} /> : null}
          </View>
          <Pressable accessibilityRole="button" onPress={() => setOthers((v) => !v)} hitSlop={8} style={styles.more}>
            <Text style={styles.moreText}>{others ? 'Ver solo este dispositivo' : '¿Juegas en otro dispositivo? Ver todos'}</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <View style={styles.actions}>
          <Btn label="Cómo se arregla" v="primary" height={42} onPress={() => setOpen(true)} style={{ flex: 1 }} />
          <Btn label="Ahora no" v="ghost" height={42} onPress={dismiss} style={{ flex: 1 }} />
        </View>
      )}
      </Animated.View>
    </Animated.View>
  );
}

/** El camino por los ajustes de un dispositivo, paso a paso. */
function Steps({ device, titled }: { device: Device; titled: boolean }) {
  const g = GUIDE[device];
  return (
    <View style={styles.steps}>
      {titled || !g.path ? <Text style={styles.device}>{g.name}</Text> : null}
      {g.path ? (
        <View style={styles.path}>
          {g.path.map((step, k) => {
            const last = k === g.path!.length - 1;
            return (
              <View key={step} style={styles.hop}>
                <Animated.View entering={FadeIn.delay(120 + k * 90).duration(220)} style={[styles.pill, last && styles.pillLast]}>
                  <View style={[styles.num, last && { backgroundColor: color.azafran }]}>
                    <Text style={[styles.numText, last && { color: color.tinta }]}>{k + 1}</Text>
                  </View>
                  <Text style={styles.pillText}>{step}</Text>
                </Animated.View>
                {!last ? <Icon name="arrow" size={14} color={color.niebla4} stroke={3} /> : null}
              </View>
            );
          })}
        </View>
      ) : null}
      <Text style={styles.tip}>{g.tip}</Text>
    </View>
  );
}

/** Altavoz tachado que se menea en la esquina de Noi. */
function Muted() {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withSequence(
        withDelay(1600, withTiming(1, { duration: 110, easing: Easing.inOut(Easing.quad) })),
        withTiming(-1, { duration: 160 }),
        withTiming(0.6, { duration: 130 }),
        withTiming(0, { duration: 120 }),
      ),
      -1,
      false,
    );
  }, [reduced, t]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 12}deg` }, { scale: 1 + Math.abs(t.value) * 0.08 }] }));
  return (
    <Animated.View style={[styles.muted, st]}>
      <Icon name="speaker" size={17} color="#FFFFFF" />
      <Svg width={26} height={26} viewBox="0 0 26 26" style={StyleSheet.absoluteFill}>
        <Path d="M6 6 L20 20" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />
        <Path d="M6 6 L20 20" stroke={color.lacaHondo} strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFAF0',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: color.azafran,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
    ...shadow.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noi: { marginLeft: -6, marginVertical: -6 },
  muted: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.laca,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: { fontFamily: font.displayBold, fontSize: 19, lineHeight: 23, color: color.tinta },
  body: { fontFamily: font.uiBold, fontSize: 14, lineHeight: 19, color: color.tinta2 },
  close: { alignSelf: 'flex-start', width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(29,35,71,0.07)', alignItems: 'center', justifyContent: 'center' },
  steps: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: color.niebla3, padding: 10, gap: 8 },
  device: { fontFamily: font.uiHeavy, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: color.tinta3 },
  path: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 6, columnGap: 4 },
  hop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingLeft: 4, paddingRight: 10, borderRadius: 15, backgroundColor: color.niebla, borderWidth: 1.5, borderColor: color.niebla3 },
  pillLast: { backgroundColor: color.azafranSuave, borderColor: color.azafran },
  num: { width: 20, height: 20, borderRadius: 10, backgroundColor: color.niebla3, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: font.uiHeavy, fontSize: 11.5, color: color.tinta2 },
  pillText: { fontFamily: font.uiHeavy, fontSize: 13, color: color.tinta },
  tip: { fontFamily: font.uiBold, fontSize: 13, lineHeight: 18, color: color.tinta3 },
  still: { fontFamily: font.uiBold, fontSize: 13, lineHeight: 18, color: color.lacaHondo },
  actions: { flexDirection: 'row', gap: 10 },
  more: { alignSelf: 'center', paddingVertical: 2 },
  moreText: { fontFamily: font.uiHeavy, fontSize: 13, color: color.cieloHondo },
});
