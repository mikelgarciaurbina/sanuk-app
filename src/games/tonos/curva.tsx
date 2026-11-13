// La «melodía» de una palabra: el contorno de cada sílaba con el color de su tono, trazado en grande
// sobre un pentagrama de cinco alturas, con una chispa en la punta mientras suena. Los cinco contornos
// están dibujados aquí (`TONE_PATH`), pensados para no confundirse entre sí ni en pequeño: el alto va
// entero por encima de la línea media y solo se levanta al final; el ascendente baja hasta el fondo
// antes de subir. Lo grande (`Melody`) y lo pequeño (`Contour`) salen del mismo dibujo.
// Lo usan «Trompa de tonos», «¿Tigre o camisa?» y «Eco».
import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';

import { font, tones, type ToneId } from '@/brand/tokens';
import { ToneGlyph } from '@/components/icons';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Pt = { x: number; y: number };

/**
 * Contorno de cada tono en la caja de los glifos de tono (24×14; y = 0 es lo más agudo, 7 la línea media).
 * · medio: plano, justo en la línea media · bajo: empieza algo por debajo y se queda abajo
 * · descendente: arranca alto, sube un poco y cae hasta el fondo · alto: siempre por encima de la media, con
 *   un levantón al final · ascendente: empieza bajo la media, baja al fondo y sube hasta arriba.
 */
export const TONE_PATH: Record<ToneId, string> = {
  M: 'M2 7 H22',
  L: 'M2 8.2 C8 8.6 12 11.6 22 12',
  F: 'M2 5 C6.5 1 10.5 1 13.5 5.2 C16 8.7 18.5 11.8 22 12.4',
  H: 'M2 5.2 C10 5.2 15.5 5 22 1.8',
  R: 'M2 8.4 C6 12.8 11.5 13.4 15 9.2 C17.5 6.2 19.5 3 22 1.8',
};

/** Puntos por contorno (repartidos a igual distancia para que la chispa avance a ritmo constante). */
const K = 28;

/** Tramos de un camino SVG sencillo (M, L, H, V, Q y C absolutos), cada uno como función de 0 a 1. */
function segmentsOf(path: string): ((s: number) => Pt)[] {
  const tk = path.match(/[MLHVQC]|-?\d*\.?\d+/g) ?? [];
  const segs: ((s: number) => Pt)[] = [];
  let i = 0;
  let cur: Pt = { x: 0, y: 0 };
  const num = () => Number(tk[i++]);
  const pt = (): Pt => ({ x: num(), y: num() });
  while (i < tk.length) {
    const cmd = tk[i++];
    const a = cur;
    if (cmd === 'M') cur = pt();
    else if (cmd === 'Q') {
      const c = pt();
      const b = pt();
      segs.push((s) => ({ x: (1 - s) * (1 - s) * a.x + 2 * (1 - s) * s * c.x + s * s * b.x, y: (1 - s) * (1 - s) * a.y + 2 * (1 - s) * s * c.y + s * s * b.y }));
      cur = b;
    } else if (cmd === 'C') {
      const c1 = pt();
      const c2 = pt();
      const b = pt();
      const at = (s: number, p0: number, p1: number, p2: number, p3: number) => (1 - s) ** 3 * p0 + 3 * (1 - s) ** 2 * s * p1 + 3 * (1 - s) * s * s * p2 + s ** 3 * p3;
      segs.push((s) => ({ x: at(s, a.x, c1.x, c2.x, b.x), y: at(s, a.y, c1.y, c2.y, b.y) }));
      cur = b;
    } else if (cmd === 'L' || cmd === 'H' || cmd === 'V') {
      const b: Pt = cmd === 'L' ? pt() : cmd === 'H' ? { x: num(), y: a.y } : { x: a.x, y: num() };
      segs.push((s) => ({ x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s }));
      cur = b;
    } else break;
  }
  return segs;
}

/** Contorno normalizado a 0–1 (y = 0 es lo más agudo), en K puntos a igual distancia. */
function sample(t: ToneId): Pt[] {
  const fine: Pt[] = [];
  for (const seg of segmentsOf(TONE_PATH[t])) for (let i = fine.length ? 1 : 0; i <= 64; i++) fine.push(seg(i / 64));
  const acc = [0];
  for (let i = 1; i < fine.length; i++) acc.push(acc[i - 1] + Math.hypot(fine[i].x - fine[i - 1].x, fine[i].y - fine[i - 1].y));
  const total = acc[acc.length - 1];
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < K; k++) {
    const target = (k / (K - 1)) * total;
    while (j < fine.length - 2 && acc[j + 1] < target) j++;
    const f = Math.min(1, Math.max(0, (target - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j])));
    out.push({ x: (fine[j].x + (fine[j + 1].x - fine[j].x) * f - 2) / 20, y: (fine[j].y + (fine[j + 1].y - fine[j].y) * f) / 14 });
  }
  return out;
}

const SHAPES: Record<ToneId, Pt[]> = { M: sample('M'), L: sample('L'), F: sample('F'), H: sample('H'), R: sample('R') };

/** Orden clásico de los tonos (สามัญ เอก โท ตรี จัตวา). */
export const TONE_ORDER: ToneId[] = ['M', 'L', 'F', 'H', 'R'];
/** Cómo se mueve la voz en cada tono, en dos palabras. */
export const TONE_HOW: Record<ToneId, string> = { M: 'plano', L: 'grave', F: 'sube y cae', H: 'agudo', R: 'baja y sube' };
/** Cada tono, anclado a algo que ya se hace al hablar español. */
export const TONE_ANCHOR: Record<ToneId, string> = {
  M: 'plano, como habla un robot',
  L: 'grave, como un «bueno…» cansado',
  F: 'cae de golpe, como un «¡no!» seco',
  H: 'agudo, como un «¿eh?» de sorpresa',
  R: 'baja y sube, como el final de «¿sí?»',
};

/** El glifo pequeño de un tono (para teclas, chips y etiquetas), con el mismo dibujo que la curva grande. */
export function Contour({ tone, size = 22, color }: { tone: ToneId; size?: number; color?: string }) {
  return <ToneGlyph path={TONE_PATH[tone]} size={size} color={color ?? tones[tone].fill} />;
}

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
