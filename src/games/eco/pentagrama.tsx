// Eco · el pentagrama: la melodía de Noi (el contorno de cada sílaba con el color de su tono) y, ENCIMA y a la
// misma escala, la melodía de tu voz: en directo mientras grabas y, al parar, colocada sílaba a sílaba sobre la
// de Noi. Aquí sí se compara lo mismo con lo mismo: altura de la voz frente a altura de la voz.
// Los contornos de Noi salen del dibujo común de los tonos (`TONE_PATH`, en tonos/curva).
import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, useAnimatedProps, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { font, tones, type ToneId } from '@/brand/tokens';

import { TONE_PATH } from '../tonos/curva';
import { CONTOUR_POINTS, type Grade } from './tono';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Pt = { x: number; y: number };

/** Puntos con los que se traza cada contorno de Noi. */
const K = 24;

/** Altura (0 = lo más grave, 1 = lo más agudo) de un glifo de tono (caja 24×14) en `k` instantes repartidos por igual. */
function heightsOf(path: string, k: number): number[] {
  const tk = path.match(/[MLHVQC]|-?\d*\.?\d+/g) ?? [];
  const fine: Pt[] = [];
  let i = 0;
  let cur: Pt = { x: 0, y: 0 };
  const num = () => Number(tk[i++]);
  const pt = (): Pt => ({ x: num(), y: num() });
  while (i < tk.length) {
    const cmd = tk[i++];
    const a = cur;
    let at: (s: number) => Pt;
    if (cmd === 'M') {
      cur = pt();
      fine.push(cur);
      continue;
    } else if (cmd === 'Q') {
      const c = pt();
      const b = pt();
      at = (s) => ({ x: (1 - s) * (1 - s) * a.x + 2 * (1 - s) * s * c.x + s * s * b.x, y: (1 - s) * (1 - s) * a.y + 2 * (1 - s) * s * c.y + s * s * b.y });
      cur = b;
    } else if (cmd === 'C') {
      const c1 = pt();
      const c2 = pt();
      const b = pt();
      const bez = (s: number, p0: number, p1: number, p2: number, p3: number) => (1 - s) ** 3 * p0 + 3 * (1 - s) ** 2 * s * p1 + 3 * (1 - s) * s * s * p2 + s ** 3 * p3;
      at = (s) => ({ x: bez(s, a.x, c1.x, c2.x, b.x), y: bez(s, a.y, c1.y, c2.y, b.y) });
      cur = b;
    } else if (cmd === 'L' || cmd === 'H' || cmd === 'V') {
      const b: Pt = cmd === 'L' ? pt() : cmd === 'H' ? { x: num(), y: a.y } : { x: a.x, y: num() };
      at = (s) => ({ x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s });
      cur = b;
    } else break;
    for (let s = 1; s <= 32; s++) fine.push(at(s / 32));
  }
  if (fine.length < 2) return new Array<number>(k).fill(0.5);
  const x0 = fine[0].x;
  const x1 = fine[fine.length - 1].x;
  const out: number[] = [];
  let j = 0;
  for (let q = 0; q < k; q++) {
    const x = x0 + ((x1 - x0) * q) / (k - 1);
    while (j < fine.length - 2 && fine[j + 1].x < x) j++;
    const span = fine[j + 1].x - fine[j].x;
    const f = span > 1e-6 ? Math.min(1, Math.max(0, (x - fine[j].x) / span)) : 0;
    out.push(1 - (fine[j].y + (fine[j + 1].y - fine[j].y) * f) / 14);
  }
  return out;
}

const TONE_IDS: ToneId[] = ['M', 'L', 'F', 'H', 'R'];
const shapes = (k: number) => Object.fromEntries(TONE_IDS.map((t) => [t, heightsOf(TONE_PATH[t], k)])) as Record<ToneId, number[]>;
const DRAWN = shapes(K);
/** El contorno de Noi para cada tono en los mismos puntos en que se resume tu voz (para colocar una sobre otra). */
export const IDEAL: Record<ToneId, number[]> = shapes(CONTOUR_POINTS);

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

/** Tu voz en directo como camino SVG: [x, y, x, y…] de 0 a 1 dentro de la caja; y < 0 levanta el lápiz. */
function tracePath(v: number[], left: number, total: number, top: number, h: number): string {
  'worklet';
  let d = '';
  let pen = false;
  for (let q = 0; q + 1 < v.length; q += 2) {
    const y = v[q + 1];
    if (y < 0) {
      pen = false;
      continue;
    }
    const px = Math.round((left + v[q] * total) * 10) / 10;
    const py = Math.round((top + (1 - y) * h) * 10) / 10;
    // un punto suelto también se ve: se dibuja como un trazo de longitud cero con punta redonda
    d += pen ? ` L${px} ${py}` : ` M${px} ${py} L${px} ${py}`;
    pen = true;
  }
  return d || 'M0 0';
}

export type StaffProps = {
  tones: ToneId[];
  /** la transcripción de cada sílaba, debajo (sin ella, solo los contornos) */
  labels?: string[];
  width: number;
  height: number;
  /** cuánto lleva trazado Noi: 0 = nada · 1 = todo */
  progress: SharedValue<number>;
  /** tu voz mientras grabas: [x, y, x, y…] de 0 a 1 (x = tiempo, y = altura; y < 0 = silencio) */
  trace?: SharedValue<number[]>;
  /** tu voz ya medida y colocada: alturas 0–1 de cada sílaba (null = esa no se oyó) */
  mine?: (number[] | null)[] | null;
  /** la nota de cada sílaba; solo se pinta cuando llega */
  grades?: Grade[] | null;
  /** deja sitio para las notas aunque aún no estén (para que nada salte) */
  scored?: boolean;
  /** sílaba de la que habla la pista: se le enciende el fondo */
  focus?: number;
  /** al volver a oírte: una línea recorre el pentagrama */
  head?: SharedValue<number>;
  playing?: boolean;
};

/** El pentagrama de Eco: Noi en colores, tú en blanco, y una nota por sílaba. */
export function Staff({ tones: list, labels, width, height, progress, trace, mine, grades, scored, focus, head, playing }: StaffProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const n = Math.max(1, list.length);
  const stroke = n > 4 ? 4.5 : 6;
  const labelH = labels ? 18 : 0;
  const badgeH = scored ? 22 : 0;
  const padY = stroke * 1.2 + 3;
  const padX = stroke * 1.5 + 4;
  const gap = n > 1 ? Math.min(12, (width - padX * 2) * 0.045) : 0;
  // una sílaba sola no se estira de lado a lado: se queda en el centro, con forma de tono
  const segW = Math.max(4, Math.min(150, (width - padX * 2 - gap * (n - 1)) / n));
  const total = segW * n + gap * (n - 1);
  const left = (width - total) / 2;
  const H = Math.max(10, height - labelH - badgeH - padY * 2);
  const yOf = (h: number) => r1(padY + (1 - Math.min(1.04, Math.max(-0.04, h))) * H);
  const segs = list.map((t, k) => {
    const x0 = left + k * (segW + gap);
    return { t, x0, xs: DRAWN[t].map((_, q) => r1(x0 + (q / (K - 1)) * segW)), ys: DRAWN[t].map(yOf) };
  });
  const hx = segs.flatMap((s) => s.xs);
  const hy = segs.flatMap((s) => s.ys);
  const spark = Math.max(16, stroke * 3.4);
  const fontSize = segW < 34 ? 10.5 : segW < 48 ? 11.5 : 13;

  const live = useAnimatedProps(() => ({ d: tracePath(trace ? trace.value : [], left, total, padY, H) }));
  const liveGlow = useAnimatedProps(() => ({ d: tracePath(trace ? trace.value : [], left, total, padY, H) }));
  const headStyle = useAnimatedStyle(() => ({ opacity: playing && head ? 1 : 0, transform: [{ translateX: left + (head ? head.value : 0) * total - 1.5 }] }));

  const voice = mine
    ? mine.map((pts, k) => {
        if (!pts || !segs[k]) return null;
        const xy = pts.map((h, q) => ({ x: r1(segs[k].x0 + (q / (pts.length - 1)) * segW), y: yOf(h) }));
        return { d: `M${xy.map((p) => `${p.x} ${p.y}`).join(' L')}`, b: xy[xy.length - 1] };
      })
    : null;

  return (
    <View style={{ width, height }} pointerEvents="none">
      <Svg width={width} height={height}>
        {focus !== undefined && segs[focus] ? (
          <Rect x={segs[focus].x0 - gap / 2} y={1} width={segW + gap} height={padY * 2 + H - 2} rx={12} fill={tones[segs[focus].t].fill} fillOpacity={0.16} stroke={tones[segs[focus].t].fill} strokeOpacity={0.5} strokeWidth={1.5} />
        ) : null}
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, q) => (
          <Line key={v} x1={Math.max(2, left - stroke)} x2={Math.min(width - 2, left + total + stroke)} y1={padY + v * H} y2={padY + v * H} stroke="rgba(255,255,255,0.2)" strokeWidth={q === 2 ? 2 : 1.5} strokeDasharray={q === 2 ? undefined : '3 6'} />
        ))}
        {segs.map((s, k) => (
          <NoiCurve key={`${k}${s.t}`} k={k} n={n} xs={s.xs} ys={s.ys} tint={tones[s.t].fill} progress={progress} stroke={stroke} />
        ))}
        {/* tu voz mientras grabas */}
        <AnimatedPath animatedProps={liveGlow} stroke="#FFB98A" strokeOpacity={0.45} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <AnimatedPath animatedProps={live} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>

      {/* tu voz, ya colocada sobre la de Noi */}
      {voice ? (
        <Animated.View entering={FadeIn.duration(420)} style={StyleSheet.absoluteFill}>
          <Svg width={width} height={height}>
            {voice.map((v, k) =>
              v ? (
                <Path key={`g${k}`} d={v.d} stroke="#FFB98A" strokeOpacity={0.5} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              ) : null,
            )}
            {voice.map((v, k) =>
              v ? (
                <Path key={`o${k}`} d={v.d} stroke="#141936" strokeOpacity={0.55} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              ) : null,
            )}
            {voice.map((v, k) =>
              v ? (
                <Path key={`w${k}`} d={v.d} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              ) : null,
            )}
            {voice.map((v, k) =>
              v ? <Circle key={`e${k}`} cx={v.b.x} cy={v.b.y} r={3.6} fill="#FFFFFF" stroke="#141936" strokeOpacity={0.5} strokeWidth={1} /> : null,
            )}
          </Svg>
        </Animated.View>
      ) : null}

      {labels
        ? segs.map((s, k) => (
            <Text key={k} numberOfLines={1} style={[styles.label, { left: s.x0 - gap / 2, width: segW + gap, top: padY * 2 + H, color: tones[s.t].fill, fontSize }]}>
              {labels[k] ?? ''}
            </Text>
          ))
        : null}

      {grades
        ? segs.map((s, k) => (
            <Animated.View key={`b${k}`} entering={ZoomIn.delay(k * 150).springify().damping(9)} style={[styles.badge, { left: s.x0 + segW / 2 - 11, top: padY * 2 + H + labelH }]}>
              <Badge grade={grades[k] ?? 'mudo'} />
            </Animated.View>
          ))
        : null}

      {segs.length ? <Spark uid={uid} hx={hx} hy={hy} n={n} progress={progress} size={spark} /> : null}
      <Animated.View style={[styles.head, { top: 2, height: padY * 2 + H - 4 }, headStyle]} />
    </View>
  );
}

function NoiCurve({ k, n, xs, ys, tint, progress, stroke }: { k: number; n: number; xs: number[]; ys: number[]; tint: string; progress: SharedValue<number>; stroke: number }) {
  const glow = useAnimatedProps(() => ({ d: partial(xs, ys, progress.value * n - k) }));
  const main = useAnimatedProps(() => ({ d: partial(xs, ys, progress.value * n - k) }));
  const hi = useAnimatedProps(() => ({ d: partial(xs, ys, progress.value * n - k) }));
  return (
    <>
      <AnimatedPath animatedProps={glow} stroke={tint} strokeOpacity={0.36} strokeWidth={stroke * 2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <AnimatedPath animatedProps={main} stroke={tint} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <AnimatedPath animatedProps={hi} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={Math.max(1.4, stroke * 0.26)} strokeLinecap="round" strokeLinejoin="round" fill="none" transform={`translate(0 ${-r1(stroke * 0.2)})`} />
    </>
  );
}

/** La chispa que va dibujando (la punta de la trompa de Noi). */
function Spark({ uid, hx, hy, n, progress, size }: { uid: string; hx: number[]; hy: number[]; n: number; progress: SharedValue<number>; size: number }) {
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

const STAR = 'M12 1.8l2.9 6.4 7 .7-5.3 4.7 1.6 6.9L12 17l-6.2 3.5 1.6-6.9L2.1 8.9l7-.7z';

/** La nota de una sílaba: estrella llena = igualito · estrella hueca = casi · aro = aún no · raya = no se oyó. */
export function Badge({ grade, size = 22 }: { grade: Grade; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {grade === 'bien' ? (
        <>
          <Path d={STAR} fill="#FFC83D" stroke="#FFF3C4" strokeWidth={1.6} strokeLinejoin="round" />
          <Path d="M9.4 7.6l1.6-3" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={1.6} strokeLinecap="round" />
        </>
      ) : grade === 'casi' ? (
        <Path d={STAR} fill="#FFC83D" fillOpacity={0.22} stroke="#FFC83D" strokeWidth={2} strokeLinejoin="round" />
      ) : grade === 'otra' ? (
        <Circle cx={12} cy={12} r={6.5} fill="none" stroke="#8FA2FF" strokeWidth={2.6} strokeDasharray="5 3.4" strokeLinecap="round" />
      ) : (
        <Path d="M7 12h10" stroke="rgba(255,255,255,0.45)" strokeWidth={2.6} strokeLinecap="round" />
      )}
    </Svg>
  );
}

/** Estrella del veredicto: encendida si se ha ganado. */
export function Star({ on, size = 24 }: { on: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR} fill={on ? '#FFC83D' : 'rgba(255,255,255,0.08)'} stroke={on ? '#FFF3C4' : 'rgba(255,255,255,0.38)'} strokeWidth={1.6} strokeLinejoin="round" />
      {on ? <Path d="M9.4 7.6l1.6-3" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={1.6} strokeLinecap="round" /> : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', textAlign: 'center', fontFamily: font.uiBold, lineHeight: 17 },
  badge: { position: 'absolute', width: 22, height: 22 },
  head: { position: 'absolute', left: 0, width: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },
});
