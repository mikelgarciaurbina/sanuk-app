// Eco · las piezas del valle: Noi cogiendo aire, las dos montañas, el eco que rebota, la cordillera del volumen,
// los botones redondos, el gran micro, la barra de rondas y los botones de abajo.
import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import type { NoiPose } from '@/brand/noi-art';
import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { fx } from '@/lib/audio';

import { Glow, Pop, Press3D } from '../fx';
import { ComboBadge } from '../kit';
import { Waves } from '../tonos/piezas';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const idOf = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');

/** Noi coge aire antes de gritar. */
export function InhaleNoi({ scale, pose, size, jump }: { scale: SharedValue<number>; pose: NoiPose; size: number; jump: number }) {
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[{ transformOrigin: `${size / 2}px ${size}px` }, st]}>
      <Glow size={size * 1.3} tint="#FFE9B8" strength={0.35} style={{ position: 'absolute', left: -size * 0.15, top: -size * 0.15 }} />
      <Noi pose={pose} size={size} jump={jump} accessibilityLabel="Noi grita para hacer eco" />
    </Animated.View>
  );
}

/** Las dos montañas del valle, con luz de luna en el borde, nieve y pinos, y la roca de Noi. */
export function Valley({ w, h }: { w: number; h: number }) {
  const u = idOf(useId());
  const L = `M-10 ${h} L${w * 0.02} ${h * 0.5} L${w * 0.12} ${h * 0.12} L${w * 0.2} ${h * 0.3} L${w * 0.27} ${h * 0.22} L${w * 0.42} ${h} Z`;
  const R = `M${w * 0.58} ${h} L${w * 0.72} ${h * 0.2} L${w * 0.8} ${h * 0.04} L${w * 0.9} ${h * 0.26} L${w + 10} ${h * 0.34} L${w + 10} ${h} Z`;
  const snowL = `M${w * 0.085} ${h * 0.24} L${w * 0.12} ${h * 0.12} L${w * 0.165} ${h * 0.23} L${w * 0.14} ${h * 0.2} L${w * 0.12} ${h * 0.26} L${w * 0.1} ${h * 0.21} Z`;
  const snowR = `M${w * 0.755} ${h * 0.13} L${w * 0.8} ${h * 0.04} L${w * 0.845} ${h * 0.14} L${w * 0.82} ${h * 0.12} L${w * 0.8} ${h * 0.17} L${w * 0.775} ${h * 0.12} Z`;
  const pine = (x: number, y: number, s: number) => `M${x} ${y - 16 * s} L${x + 7 * s} ${y} L${x - 7 * s} ${y} Z`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${u}m`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3B3F86" />
          <Stop offset="1" stopColor="#151937" />
        </LinearGradient>
        <LinearGradient id={`${u}r`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4A3F8C" />
          <Stop offset="1" stopColor="#1A1B40" />
        </LinearGradient>
        <RadialGradient id={`${u}g`} cx="50%" cy="100%" r="60%">
          <Stop offset="0" stopColor="#FFB86B" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#FFB86B" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={w / 2} cy={h} r={w * 0.4} fill={`url(#${u}g)`} />
      <Path d={L} fill={`url(#${u}m)`} />
      <Path d={`M${w * 0.12} ${h * 0.12} L${w * 0.2} ${h * 0.3} L${w * 0.27} ${h * 0.22} L${w * 0.42} ${h}`} stroke="#B9C2FF" strokeOpacity={0.45} strokeWidth={2} fill="none" />
      <Path d={snowL} fill="#EEF2FF" opacity={0.9} />
      <Path d={R} fill={`url(#${u}r)`} />
      <Path d={`M${w * 0.58} ${h} L${w * 0.72} ${h * 0.2} L${w * 0.8} ${h * 0.04}`} stroke="#C9C2FF" strokeOpacity={0.5} strokeWidth={2} fill="none" />
      <Path d={snowR} fill="#EEF2FF" opacity={0.9} />
      <G opacity={0.85}>
        {[0.06, 0.1, 0.16, 0.31, 0.36].map((x, k) => (
          <Path key={`l${k}`} d={pine(w * x, h - 4 - (k % 2) * 8, 0.9 + (k % 3) * 0.2)} fill="#0F1330" />
        ))}
        {[0.66, 0.7, 0.86, 0.92, 0.96].map((x, k) => (
          <Path key={`r${k}`} d={pine(w * x, h - 4 - (k % 2) * 8, 0.9 + (k % 3) * 0.2)} fill="#0F1330" />
        ))}
      </G>
      <Path d={`M${w * 0.32} ${h} Q${w * 0.36} ${h - 22} ${w * 0.5} ${h - 24} Q${w * 0.64} ${h - 22} ${w * 0.68} ${h} Z`} fill="#26294F" />
      <Path d={`M${w * 0.34} ${h - 8} Q${w * 0.4} ${h - 22} ${w * 0.5} ${h - 23} Q${w * 0.6} ${h - 22} ${w * 0.66} ${h - 8}`} stroke="#8F97E8" strokeOpacity={0.5} strokeWidth={2} fill="none" />
    </Svg>
  );
}

const ECHO = {
  /** el grito de Noi: ámbar */
  noi: { text: '#FFF6DE', glow: 'rgba(255,180,70,1)', halo: 'rgba(255,205,120,0.16)', shadow: '#FFC56B', ring: '#FFD592' },
  /** tu eco, cuando sale igualito: verde menta */
  tuyo: { text: '#F1FFF7', glow: 'rgba(70,230,160,1)', halo: 'rgba(120,255,190,0.18)', shadow: '#5CF0B0', ring: '#9DFFD2' },
};
export type EchoVoice = keyof typeof ECHO;

/** El eco: lo dicho sale de un punto y rebota de montaña en montaña, cada vez más pequeño y lejano. */
export function Echo({ run, text, w, h, from, voice = 'noi', bounces = 3 }: { run: number; text: string; w: number; h: number; from: { x: number; y: number }; voice?: EchoVoice; bounces?: number }) {
  if (!run) return null;
  const pts = [from, { x: w * 0.2, y: h * 0.36 }, { x: w * 0.78, y: h * 0.28 }, { x: w * 0.3, y: h * 0.5 }, { x: w * 0.74, y: h * 0.52 }, { x: w * 0.24, y: h * 0.24 }];
  return (
    <View key={run} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: Math.min(bounces, pts.length - 1) }, (_, k) => (
        <Bounce key={k} k={k} text={text} a={pts[k]} b={pts[k + 1]} voice={voice} />
      ))}
    </View>
  );
}

function Bounce({ k, text, a, b, voice }: { k: number; text: string; a: { x: number; y: number }; b: { x: number; y: number }; voice: EchoVoice }) {
  const t = useSharedValue(0);
  const ring = useSharedValue(0);
  const c = ECHO[voice];
  useEffect(() => {
    t.value = withDelay(k * 470, withTiming(1, { duration: 560, easing: Easing.inOut(Easing.quad) }));
    ring.value = withDelay(k * 470 + 500, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
    const swish = k === 0 ? setTimeout(() => fx.swish(), 480) : undefined;
    return () => clearTimeout(swish);
  }, [k, t, ring]);
  const s = Math.max(0.3, 1 - k * 0.2);
  const st = useAnimatedStyle(() => {
    const v = t.value;
    const x = a.x + (b.x - a.x) * v;
    const y = a.y + (b.y - a.y) * v - Math.sin(v * Math.PI) * 26;
    const o = v <= 0 ? 0 : v < 0.15 ? v / 0.15 : v > 0.78 ? Math.max(0, (1 - v) / 0.22) : 1;
    return { opacity: o * Math.max(0.3, 0.95 - k * 0.18), transform: [{ translateX: x - 110 }, { translateY: y - 26 }, { scale: s * (0.7 + 0.3 * Math.sin(v * Math.PI * 0.5 + 0.5)) }] };
  });
  const rs = useAnimatedStyle(() => ({ opacity: ring.value <= 0 ? 0 : (1 - ring.value) * 0.8, transform: [{ translateX: b.x - 30 }, { translateY: b.y - 30 }, { scale: 0.3 + ring.value * 1.4 }] }));
  const long = text.length > 14;
  const mid = text.length > 6;
  return (
    <>
      <Animated.View style={[styles.ring, { borderColor: c.ring }, rs]} />
      <Animated.View style={[styles.echo, st]}>
        <View style={[styles.echoHalo, { backgroundColor: c.halo, shadowColor: c.shadow }]}>
          <Text style={[styles.echoText, { color: c.text, textShadowColor: c.glow, fontSize: long ? 19 : mid ? 26 : 34, lineHeight: long ? 30 : mid ? 40 : 52 }]} numberOfLines={1}>
            {text}
          </Text>
        </View>
      </Animated.View>
    </>
  );
}

/** Ticks de volumen que caben en la grabación más larga (8 s a 70 ms). */
const RIDGE_SPAN = 115;

/**
 * El VOLUMEN de tu voz como una cordillera de luz que crece mientras grabas; al escucharte, una línea la recorre.
 * No es tu tono: por eso va en su propia franja, con su nombre, y no encima de la melodía de Noi.
 */
export function Ridge({ levels, live, head, playing, width, height, hint }: { levels: SharedValue<number[]>; live: SharedValue<number>; head: SharedValue<number>; playing: boolean; width: number; height: number; hint?: string }) {
  const u = idOf(useId());
  const props = useAnimatedProps(() => {
    const v = levels.value;
    const n = v.length;
    if (n < 2) return { d: `M0 ${height} L${width} ${height} Z` };
    const span = live.value ? Math.max(n, RIDGE_SPAN) : n;
    let d = `M0 ${height}`;
    for (let k = 0; k < n; k++) {
      const x = (k / (span - 1)) * width;
      const y = height - 2 - v[k] * (height - 6);
      d += ` L${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
    }
    d += ` L${Math.round(((n - 1) / (span - 1)) * width * 10) / 10} ${height} Z`;
    return { d };
  });
  const hs = useAnimatedStyle(() => ({ opacity: playing ? 1 : 0, transform: [{ translateX: head.value * width - 1 }] }));
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`${u}f`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFD089" />
            <Stop offset="0.5" stopColor="#FF8A5B" />
            <Stop offset="1" stopColor="#B83A7A" stopOpacity={0.6} />
          </LinearGradient>
        </Defs>
        <Path d={`M0 ${height - 1} L${width} ${height - 1}`} stroke="rgba(255,255,255,0.18)" strokeWidth={2} strokeDasharray="4 6" />
        <AnimatedPath animatedProps={props} fill={`url(#${u}f)`} stroke="#FFE3B0" strokeWidth={1.5} />
      </Svg>
      {hint ? (
        <Text style={styles.ridgeHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
      <Animated.View style={[styles.head, { height }, hs]} />
    </View>
  );
}

/** Botón redondo con relieve: escuchar a Noi, más lento, comparar. */
export function RoundBtn({ icon, label, hint, tint, deep, onPress, disabled, small, active }: { icon: 'speaker' | 'play' | 'turtle'; label: string; hint: string; tint: string; deep: string; onPress: () => void; disabled?: boolean; small?: boolean; active?: boolean }) {
  const w = small ? 48 : 56;
  return (
    <View style={{ alignItems: 'center', gap: 4, opacity: disabled ? 0.4 : 1 }}>
      <View style={{ width: w, height: w + 4, alignItems: 'center', justifyContent: 'center' }}>
        <Waves active={!!active} size={w * 1.7} tint={tint} width={2.5} />
        <Press3D onPress={onPress} disabled={disabled} style={{ width: w, height: w + 4 }} depth={14} accessibilityLabel={hint}>
          <View style={[styles.roundEdge, { backgroundColor: deep }]}>
            <View style={[styles.roundFace, { backgroundColor: tint }]}>
              <View style={styles.roundShine} />
              <Icon name={icon} size={icon === 'turtle' ? 28 : 25} color="#FFFFFF" />
            </View>
          </View>
        </Press3D>
      </View>
      <Text style={styles.roundLabel}>{label}</Text>
    </View>
  );
}

/** El gran micro: dorado y latiendo cuando es tu turno; rojo con ondas mientras graba. */
export function Mic({ recording, ready, label, onPress, small, disabled }: { recording: boolean; ready: boolean; label: string; onPress: () => void; small?: boolean; disabled?: boolean }) {
  const size = small ? 70 : 84;
  return (
    <View style={{ alignItems: 'center', gap: 4, opacity: disabled ? 0.45 : 1 }}>
      <View style={{ width: size, height: size + 6, alignItems: 'center', justifyContent: 'center' }}>
        {(ready || recording) && !disabled ? <Glow size={size * 1.8} tint={recording ? '#FF5D5D' : '#FFD166'} strength={0.6} style={{ position: 'absolute' }} /> : null}
        <Waves active={recording} size={size * 1.9} tint="#FFB3B3" />
        <Pop trigger={`${recording}${ready}`} scale={1.12}>
          <Press3D onPress={onPress} disabled={disabled} style={{ width: size, height: size + 6 }} depth={18} accessibilityLabel={recording ? 'Parar la grabación' : 'Grabar tu voz'}>
            <View style={[styles.micEdge, { borderRadius: size / 2, backgroundColor: recording ? color.lacaHondo : color.azafranHondo }]}>
              <View style={[styles.micFace, { borderRadius: size / 2, backgroundColor: recording ? color.laca : color.azafran }]}>
                <View style={styles.roundShine} />
                {recording ? <View style={styles.stop} /> : <Icon name="mic" size={size * 0.45} color={color.tinta} />}
              </View>
            </View>
          </Press3D>
        </Pop>
      </View>
      <Text style={[styles.roundLabel, { color: '#FFFFFF' }]}>{label}</Text>
    </View>
  );
}

// ——— Barra de arriba ———

/**
 * Cómo quedó cada palabra o frase: `tres`, `dos` y `una` son estrellas MEDIDAS en tu voz; `libre` es lo que se
 * dijo sin medir (de oído, o sin micro). Ninguna es un fallo: aquí no se suspende.
 */
export type EcoMark = 'tres' | 'dos' | 'una' | 'libre';
const MARK: Record<EcoMark, string> = { tres: color.arrozalVivo, dos: color.buatong, una: '#8FA2FF', libre: '#C6B8F5' };

/** Bolitas de las rondas, puntos de la feria y la llama de la racha. */
export function EcoBar({ marks, total, points, combo }: { marks: EcoMark[]; total: number; points?: number; combo: number }) {
  const dots = Array.from({ length: Math.max(total, marks.length) }, (_, i) => (i < marks.length ? marks[i] : i === marks.length ? 'now' : 'todo'));
  return (
    <View style={styles.top}>
      <View style={[styles.glass, styles.dots]}>
        {dots.map((d, i) => (
          <View key={i} style={[styles.dot, d === 'now' ? styles.dotNow : { backgroundColor: d === 'todo' ? 'rgba(255,255,255,0.28)' : MARK[d] }]} />
        ))}
      </View>
      <View style={{ flex: 1 }} />
      {points !== undefined ? (
        <Pop trigger={points} style={[styles.glass, styles.points]}>
          <Icon name="star" size={18} color={color.buatong} />
          <Text style={styles.pointsText}>{points}</Text>
        </Pop>
      ) : null}
      <ComboBadge combo={combo} />
    </View>
  );
}

// ——— Botones de abajo ———

const SKIN = {
  azul: { face: '#5B6BCF', edge: '#3C4AA8', ink: '#FFFFFF' },
  ambar: { face: color.azafran, edge: color.azafranHondo, ink: color.tinta },
  verde: { face: color.arrozal, edge: color.arrozalHondo, ink: '#FFFFFF' },
};

/** Botón ancho con relieve para decidir qué viene ahora: otra vez, casi, igualito, siguiente. */
export function BigBtn({ label, emoji, icon, skin, onPress, flex = 1, small, disabled }: { label: string; emoji?: string; icon?: ReactNode; skin: keyof typeof SKIN; onPress: (e: GestureResponderEvent) => void; flex?: number; small?: boolean; disabled?: boolean }) {
  const c = SKIN[skin];
  return (
    <Animated.View entering={FadeIn.duration(180)} style={{ flex, height: small ? 48 : 56, opacity: disabled ? 0.4 : 1 }}>
      <Press3D onPress={onPress} disabled={disabled} style={{ flex: 1 }} depth={10} accessibilityLabel={label}>
        <View style={[styles.bigEdge, { backgroundColor: c.edge }]}>
          <View style={[styles.bigFace, { backgroundColor: c.face }]}>
            <View style={styles.bigShine} />
            {emoji ? <Text style={styles.bigEmoji}>{emoji}</Text> : null}
            <Text style={[styles.bigText, { color: c.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {label}
            </Text>
            {icon}
          </View>
        </View>
      </Press3D>
    </Animated.View>
  );
}

/** «Ahora no puedo hablar»: salir de este paso sin grabar nada y sin que cuente. Discreto, pero siempre a mano. */
export function QuietLink({ onPress, small }: { onPress: () => void; small?: boolean }) {
  return (
    <Press3D onPress={onPress} style={{ alignSelf: 'center', height: small ? 36 : 40 }} depth={6} accessibilityLabel="Ahora no puedo hablar: saltar este paso">
      <View style={styles.quiet}>
        <Text style={styles.quietEmoji}>🤫</Text>
        <Text style={styles.quietText}>Ahora no puedo hablar</Text>
      </View>
    </Press3D>
  );
}

const styles = StyleSheet.create({
  echo: { position: 'absolute', left: 0, top: 0, width: 220, alignItems: 'center' },
  echoHalo: { paddingHorizontal: 14, borderRadius: 30, shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  echoText: { fontFamily: font.thaiBold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  ring: { position: 'absolute', left: 0, top: 0, width: 60, height: 60, borderRadius: 30, borderWidth: 4 },
  ridgeHint: { position: 'absolute', left: 0, right: 0, top: '26%', textAlign: 'center', fontFamily: font.uiBold, fontSize: 12.5, color: 'rgba(255,255,255,0.5)' },
  head: { position: 'absolute', left: 0, top: 0, width: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },
  roundEdge: { flex: 1, borderRadius: 30, paddingBottom: 4 },
  roundFace: { flex: 1, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  roundShine: { position: 'absolute', left: 10, right: 10, top: 4, height: '32%', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.32)' },
  roundLabel: { fontFamily: font.uiHeavy, fontSize: 13, color: '#C9D0EE' },
  micEdge: { flex: 1, borderRadius: 42, paddingBottom: 6, shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  micFace: { flex: 1, borderRadius: 42, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stop: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#FFFFFF' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  glass: { height: 32, borderRadius: 16, backgroundColor: 'rgba(14,17,40,0.5)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 5, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotNow: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: color.cielo },
  points: { flexDirection: 'row', gap: 5, paddingHorizontal: 12 },
  pointsText: { fontFamily: font.displayBold, fontSize: 18, color: '#FFFFFF' },
  bigEdge: { flex: 1, borderRadius: 18, paddingBottom: 5 },
  bigFace: { flex: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden', paddingHorizontal: 8 },
  bigShine: { position: 'absolute', left: 8, right: 8, top: 4, height: '30%', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.28)' },
  bigEmoji: { fontSize: 18 },
  bigText: { fontFamily: font.displayBold, fontSize: 15.5, flexShrink: 1 },
  quiet: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(14,17,40,0.55)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)' },
  quietEmoji: { fontSize: 15 },
  quietText: { fontFamily: font.uiHeavy, fontSize: 13.5, color: '#DCE2FA' },
});
