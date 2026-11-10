// La «melodía» de una palabra: el contorno de cada sílaba con el color de su tono, trazado en grande
// sobre un pentagrama de cinco alturas, con una chispa en la punta mientras suena. Los contornos salen
// de los mismos glifos de tono de toda la app (`tones[t].path`), así que lo grande y lo pequeño coinciden.
// Lo usan «Trompa de tonos», «¿Tigre o camisa?» y «Eco».
import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { font, tones, type ToneId } from '@/brand/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Pt = { x: number; y: number };

/** Puntos por contorno (repartidos a igual distancia para que la chispa avance a ritmo constante). */
const K = 22;

/** Curva cuadrática de un glifo de tono (viewBox 24×14) normalizada a 0–1 (y = 0 es lo más agudo). */
function quadOf(path: string): [Pt, Pt, Pt] {
  const n = (path.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const norm = (x: number, y: number): Pt => ({ x: (x - 2) / 20, y: y / 14 });
  if (path.includes('Q')) return [norm(n[0], n[1]), norm(n[2], n[3]), norm(n[4], n[5])];
  const a = norm(n[0], n[1]);
  const b = path.includes('H') ? norm(n[2], n[1]) : norm(n[2], n[3]);
  return [a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, b];
}

function sample(t: ToneId): Pt[] {
  const [a, c, b] = quadOf(tones[t].path);
  const at = (s: number): Pt => ({
    x: (1 - s) * (1 - s) * a.x + 2 * (1 - s) * s * c.x + s * s * b.x,
    y: (1 - s) * (1 - s) * a.y + 2 * (1 - s) * s * c.y + s * s * b.y,
  });
  const fine = Array.from({ length: 97 }, (_, i) => at(i / 96));
  const acc = [0];
  for (let i = 1; i < fine.length; i++) acc.push(acc[i - 1] + Math.hypot((fine[i].x - fine[i - 1].x) * 20, (fine[i].y - fine[i - 1].y) * 14));
  const total = acc[acc.length - 1];
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < K; k++) {
    const target = (k / (K - 1)) * total;
    while (j < fine.length - 2 && acc[j + 1] < target) j++;
    const f = Math.min(1, Math.max(0, (target - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j])));
    out.push({ x: fine[j].x + (fine[j + 1].x - fine[j].x) * f, y: fine[j].y + (fine[j + 1].y - fine[j].y) * f });
  }
  return out;
}

const SHAPES: Record<ToneId, Pt[]> = { M: sample('M'), L: sample('L'), F: sample('F'), H: sample('H'), R: sample('R') };

/** Orden clásico de los tonos (สามัญ เอก โท ตรี จัตวา). */
export const TONE_ORDER: ToneId[] = ['M', 'L', 'F', 'H', 'R'];
/** Cómo se mueve la voz en cada tono, en dos palabras. */
export const TONE_HOW: Record<ToneId, string> = { M: 'plano', L: 'grave', F: 'sube y cae', H: 'agudo', R: 'baja y sube' };

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Trozo de contorno ya trazado (0–1) como camino SVG. */
function partial(xs: number[], ys: number[], t: number): string {
  'worklet';
  const last = xs.length - 1;
  let d = `M${xs[0]} ${ys[0]}`;
  if (t <= 0) return d;
  const m = Math.min(1, t) * last;
  const i = Math.floor(m);
  for (let j = 1; j <= i; j++) d += ` L${xs[j]} ${ys[j]}`;
  if (i < last) {
    const f = m - i;
    d += ` L${Math.round((xs[i] + (xs[i + 1] - xs[i]) * f) * 10) / 10} ${Math.round((ys[i] + (ys[i + 1] - ys[i]) * f) * 10) / 10}`;
  }
  return d;
}

export type MelodyProps = {
  tones: ToneId[];
  width: number;
  height: number;
  /** 0 = nada trazado · 1 = todo trazado */
  progress: SharedValue<number>;
  /** contorno de comparación, discontinuo (p. ej. el tono que se eligió por error) */
  ghost?: ToneId | null;
  /** texto bajo cada sílaba (su transcripción) */
  labels?: string[];
  /** las cinco alturas de fondo */
  staff?: boolean;
  /** «agudo» y «grave» al lado del pentagrama */
  axis?: boolean;
  stroke?: number;
  dark?: boolean;
};

/** Contornos de tono trazándose al ritmo de `progress`, uno por sílaba y con el color de su tono. */
export function Melody({ tones: list, width, height, progress, ghost, labels, staff = true, axis, stroke = 8, dark }: MelodyProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const n = Math.max(1, list.length);
  const labelH = labels ? 22 : 0;
  const padL = stroke * 1.5 + 4;
  const padR = stroke * 1.5 + 4 + (axis ? 36 : 0);
  const padY = stroke * 1.4 + 4;
  const gap = n > 1 ? Math.min(14, (width - padL - padR) * 0.05) : 0;
  const segW = Math.max(4, (width - padL - padR - gap * (n - 1)) / n);
  const h = Math.max(10, height - labelH - padY * 2);
  const segs = list.map((t, k) => {
    const x0 = padL + k * (segW + gap);
    const pts = SHAPES[t].map((p) => ({ x: r1(x0 + p.x * segW), y: r1(padY + p.y * h) }));
    return { t, x0, xs: pts.map((p) => p.x), ys: pts.map((p) => p.y) };
  });
  const hx = segs.flatMap((s) => s.xs);
  const hy = segs.flatMap((s) => s.ys);
  const line = dark ? 'rgba(255,255,255,0.2)' : 'rgba(29,35,71,0.16)';
  const ghostPts = ghost ? SHAPES[ghost].map((p) => `${r1(padL + p.x * segW)} ${r1(padY + p.y * h)}`) : null;
  const head = Math.max(16, stroke * 3.4);

  return (
    <View style={{ width, height }} pointerEvents="none">
      <Svg width={width} height={height}>
        {staff
          ? [0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
              <Line
                key={v}
                x1={padL - stroke}
                x2={width - padR + stroke}
                y1={padY + v * h}
                y2={padY + v * h}
                stroke={line}
                strokeWidth={i === 2 ? 2 : 1.5}
                strokeDasharray={i === 2 ? undefined : '3 6'}
              />
            ))
          : null}
        {ghostPts && ghost ? (
          <Path d={`M${ghostPts.join(' L')}`} stroke={tones[ghost].fill} strokeOpacity={0.85} strokeWidth={stroke * 0.7} strokeDasharray={`0.1 ${stroke * 1.5}`} strokeLinecap="round" fill="none" />
        ) : null}
        {segs.map((s, k) => (
          <Seg key={`${k}${s.t}`} k={k} n={n} xs={s.xs} ys={s.ys} tint={tones[s.t].fill} progress={progress} stroke={stroke} dark={dark} />
        ))}
      </Svg>
      {axis ? (
        <>
          <Text style={[styles.axis, { top: padY + 0.1 * h - 9, color: dark ? '#E9ECFA' : '#5F6988' }]}>↑ agudo</Text>
          <Text style={[styles.axis, { top: padY + 0.9 * h - 9, color: dark ? '#E9ECFA' : '#5F6988' }]}>↓ grave</Text>
        </>
      ) : null}
      {labels
        ? segs.map((s, k) => (
            <Text
              key={k}
              numberOfLines={1}
              style={[styles.label, { left: s.x0 - gap / 2, width: segW + gap, top: height - labelH, color: dark ? tones[s.t].fill : tones[s.t].text, fontSize: segW < 34 ? 11 : 13 }]}>
              {labels[k] ?? ''}
            </Text>
          ))
        : null}
      {segs.length ? <Head uid={uid} hx={hx} hy={hy} n={n} progress={progress} size={head} /> : null}
    </View>
  );
}

function Seg({ k, n, xs, ys, tint, progress, stroke, dark }: { k: number; n: number; xs: number[]; ys: number[]; tint: string; progress: SharedValue<number>; stroke: number; dark?: boolean }) {
  const glow = useAnimatedProps(() => ({ d: partial(xs, ys, progress.value * n - k) }));
  const main = useAnimatedProps(() => ({ d: partial(xs, ys, progress.value * n - k) }));
  const hi = useAnimatedProps(() => ({ d: partial(xs, ys, progress.value * n - k) }));
  return (
    <>
      <AnimatedPath animatedProps={glow} stroke={tint} strokeOpacity={dark ? 0.38 : 0.24} strokeWidth={stroke * 2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <AnimatedPath animatedProps={main} stroke={tint} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <AnimatedPath
        animatedProps={hi}
        stroke="#FFFFFF"
        strokeOpacity={0.6}
        strokeWidth={Math.max(1.4, stroke * 0.26)}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        transform={`translate(0 ${-r1(stroke * 0.2)})`}
      />
    </>
  );
}

/** La chispa que va dibujando (la punta de la trompa de Noi). */
function Head({ uid, hx, hy, n, progress, size }: { uid: string; hx: number[]; hy: number[]; n: number; progress: SharedValue<number>; size: number }) {
  const st = useAnimatedStyle(() => {
    const p = progress.value;
    if (p <= 0.002 || p >= 0.998) return { opacity: 0, transform: [{ translateX: hx[0] - size / 2 }, { translateY: hy[0] - size / 2 }, { scale: 0.4 }] };
    const g = Math.min(n - 0.0001, p * n);
    const seg = Math.floor(g);
    const m = (g - seg) * (K - 1);
    const i = Math.min(K - 2, Math.floor(m));
    const f = m - i;
    const j = seg * K + i;
    const x = hx[j] + (hx[j + 1] - hx[j]) * f;
    const y = hy[j] + (hy[j + 1] - hy[j]) * f;
    return { opacity: 1, transform: [{ translateX: x - size / 2 }, { translateY: y - size / 2 }, { scale: 1 }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, st]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`${uid}h`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
            <Stop offset="0.35" stopColor="#FFF4C8" stopOpacity={0.95} />
            <Stop offset="1" stopColor="#FFC83D" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${uid}h)`} />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.14} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  axis: { position: 'absolute', right: 0, width: 48, textAlign: 'right', fontFamily: font.uiHeavy, fontSize: 10.5 },
  label: { position: 'absolute', textAlign: 'center', fontFamily: font.uiBold },
});
