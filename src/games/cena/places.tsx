// Dónde ocurre cada conversación (`Dialogue.place`): el escenario de fondo, lo que hay delante de quien habla
// (la mesa khantoke, el mostrador del mercado, la barra del café, la hoguera, el móvil de una llamada…) y cómo se
// llama allí la charla («cena», «llamada», «velada»). Todo dibujado, con algo que se mueve en cada sitio.
import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { DialoguePlace } from '@/content/types';

import type { Scene } from '../Backdrop';
import { Glow } from '../fx';
import { GoodIcon } from '../mercado/goods';
import { Awning, Counter } from '../mercado/stall';
import { Khantoke } from './table';

export type PlaceLook = {
  scene: Scene;
  /** el cielo es claro: hace falta una sombra arriba para que se lea la cabecera */
  light: boolean;
  /** cuánto del frente (de 0 a 1, desde arriba) queda por encima de la superficie que tapa a quien habla */
  lip: number;
  perfect: string;
  good: string;
  /** la ronda de memoria del final («¿qué ha dicho…?») */
  recall: string;
  recallTag: string;
};

export const PLACES: Record<DialoguePlace, PlaceLook> = {
  mesa: { scene: 'casa', light: false, lip: 0.15, perfect: '¡Cena perfecta!', good: '¡Qué buena cena!', recall: '¡Hora del postre!', recallTag: 'postre' },
  calle: { scene: 'dia', light: true, lip: 0.15, perfect: '¡Charla perfecta!', good: '¡Qué buena charla!', recall: '¡A ver esa memoria!', recallTag: 'memoria' },
  mercado: { scene: 'mercado', light: false, lip: 0.28, perfect: '¡Charla perfecta!', good: '¡Qué bien en el mercado!', recall: '¡A ver esa memoria!', recallTag: 'memoria' },
  cafe: { scene: 'amanecer', light: true, lip: 0.2, perfect: '¡Café perfecto!', good: '¡Qué buen café!', recall: '¡El último sorbo!', recallTag: 'sorbo' },
  telefono: { scene: 'noche', light: false, lip: 0.3, perfect: '¡Llamada perfecta!', good: '¡Qué buena llamada!', recall: '¡Antes de colgar!', recallTag: 'memoria' },
  templo: { scene: 'templo', light: true, lip: 0.2, perfect: '¡Visita perfecta!', good: '¡Qué buena visita!', recall: '¡A ver esa memoria!', recallTag: 'memoria' },
  campo: { scene: 'arrozal', light: true, lip: 0.27, perfect: '¡Charla perfecta!', good: '¡Qué buena charla!', recall: '¡A ver esa memoria!', recallTag: 'memoria' },
  cocina: { scene: 'casa', light: false, lip: 0.18, perfect: '¡Charla perfecta!', good: '¡Qué bien en la cocina!', recall: '¡A probar el guiso!', recallTag: 'memoria' },
  fuego: { scene: 'noche', light: false, lip: 0.3, perfect: '¡Velada perfecta!', good: '¡Qué buena velada!', recall: '¡Antes de que se apague!', recallTag: 'memoria' },
  sala: { scene: 'casa', light: false, lip: 0.22, perfect: '¡Charla perfecta!', good: '¡Qué buena charla!', recall: '¡A ver esa memoria!', recallTag: 'memoria' },
};

const uidOf = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '');

/** Sombra suave bajo la cabecera, para los escenarios de cielo claro. */
export function TopShade({ height }: { height: number }) {
  const u = `ts${uidOf(useId())}`;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
        <Defs>
          <LinearGradient id={u} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#141936" stopOpacity={0.62} />
            <Stop offset="0.6" stopColor="#141936" stopOpacity={0.3} />
            <Stop offset="1" stopColor="#141936" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={10} height={10} fill={`url(#${u})`} />
      </Svg>
    </View>
  );
}

// ——— Cosas que se mueven ———

const FLAME = 'M12 1c2 6 8 9 8 17a8 8 0 0 1-16 0c0-4 2-6.2 4-8 0 3 1 5 3 6-1-6 1-11 1-15z';
const FLAME_CORE = 'M12 13c1.6 3 4 4.6 4 8a4 4 0 0 1-8 0c0-2 1-3.2 2-4 .3 1.6 1 2.4 2 3-.4-2.6 0-5 0-7z';

/** Llama que tiembla (la hoguera, las velas del templo). `x` es su centro; `y`, su base. */
function Flame({ x, y, size, delay = 0 }: { x: number; y: number; size: number; delay?: number }) {
  const reduced = useReducedMotion();
  const f = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    f.value = withDelay(delay, withRepeat(withTiming(1, { duration: 190, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced, f, delay]);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.9 + 0.18 * f.value }, { rotate: `${-4 + 8 * f.value}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - size * 0.4, top: y - size, width: size * 0.8, height: size, transformOrigin: `${size * 0.4}px ${size}px` }, st]}>
      <Svg width="100%" height="100%" viewBox="0 0 24 30">
        <Path d={FLAME} fill="#FF7A2B" />
        <Path d={FLAME_CORE} fill="#FFE07A" />
      </Svg>
    </Animated.View>
  );
}

/** Voluta de vapor o de humo que sube y se deshace. */
function Wisp({ x, y, size, delay, tint = '#FFFFFF' }: { x: number; y: number; size: number; delay: number; tint?: string }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false));
  }, [reduced, t, delay]);
  const st = useAnimatedStyle(() => ({
    opacity: (t.value < 0.25 ? t.value * 4 : (1 - t.value) / 0.75) * 0.5,
    transform: [{ translateY: -t.value * size * 2.2 }, { translateX: Math.sin(t.value * Math.PI * 2) * size * 0.25 }, { scale: 0.6 + t.value * 1.1 }],
  }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - size * 0.25, top: y - size * 0.4, width: size * 0.5, height: size * 0.8, borderRadius: size, backgroundColor: tint }, st]} />;
}

// ——— Lo que hay delante de quien habla ———
// Cada frente se dibuja en píxeles reales (ancho `w` × alto `h`), con los detalles centrados y a escala `k`
// en unidades de diseño: x de −d a d (d = medio ancho) e y de 0 a 110.

type FrontProps = { w: number; h: number };
type Draw = { k: number; d: number; u: string };

function Band({ w, h, children }: FrontProps & { children: (p: Draw) => ReactNode }) {
  const u = `pf${uidOf(useId())}`;
  const k = h / 110;
  const d = w / k / 2;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={StyleSheet.absoluteFill}>
      <G transform={`translate(${w / 2} 0) scale(${k})`}>{children({ k, d, u })}</G>
    </Svg>
  );
}

const Fill = ({ id, a, b }: { id: string; a: string; b: string }) => (
  <Defs>
    <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor={a} />
      <Stop offset="1" stopColor={b} />
    </LinearGradient>
  </Defs>
);

const range = (from: number, to: number, step: number) => Array.from({ length: Math.max(0, Math.ceil((to - from) / step)) }, (_, i) => from + i * step);

/** La calle: una jardinera de ladrillo con buganvillas, y la acera. */
function Calle({ w, h }: FrontProps) {
  return (
    <Band w={w} h={h}>
      {({ d, u }) => (
        <>
          <Fill id={`${u}b`} a="#D08A5E" b="#9A4F2E" />
          <Rect x={-d} y={84} width={2 * d} height={30} fill="#CDBFA8" />
          <Rect x={-d} y={84} width={2 * d} height={4} fill="#EFE5D2" />
          <Rect x={-d} y={22} width={2 * d} height={64} fill={`url(#${u}b)`} />
          <Path d={`M${-d} 43 H${d} M${-d} 64 H${d}`} stroke="#F0C3A0" strokeWidth={1.6} opacity={0.5} />
          {range(-d, d, 34).map((x, i) => (
            <Path key={i} d={`M${x + 8} 24 V43 M${x + 25} 43 V64 M${x + 8} 64 V85`} stroke="#F0C3A0" strokeWidth={1.4} opacity={0.45} />
          ))}
          <Rect x={-d} y={15} width={2 * d} height={10} rx={3} fill="#E8B58C" />
          <Rect x={-d} y={15} width={2 * d} height={2.5} fill="#FFE8D0" opacity={0.85} />
          <Rect x={-d} y={24} width={2 * d} height={3} fill="#000000" opacity={0.18} />
          {range(-d + 14, d, 52).map((x, i) => (
            <G key={i}>
              <Circle cx={x} cy={13} r={15} fill="#3E9A52" />
              <Circle cx={x + 11} cy={8} r={11} fill="#5CB866" />
              <Circle cx={x - 12} cy={11} r={9} fill="#4FA85A" />
              {[
                [-8, 6],
                [4, 2],
                [13, 10],
                [-2, 14],
                [-15, 13],
              ].map(([dx, dy], j) => (
                <Circle key={j} cx={x + dx} cy={dy} r={2.8} fill={['#FF6FA0', '#FFD166', '#FFFFFF'][(i + j) % 3]} />
              ))}
            </G>
          ))}
        </>
      )}
    </Band>
  );
}

/** El campo: el ribazo del arrozal, con las espigas delante y un sombrero ngop olvidado. */
function Campo({ w, h }: FrontProps) {
  return (
    <Band w={w} h={h}>
      {({ d, u }) => (
        <>
          <Fill id={`${u}a`} a="#9AD676" b="#58A85A" />
          <Fill id={`${u}c`} a="#5DB05F" b="#2F7A44" />
          <Path d={`M${-d} 30 Q${-d / 2} 8 0 26 T${d} 22 V112 H${-d} Z`} fill={`url(#${u}a)`} />
          <Path d={`M${-d} 30 Q${-d / 2} 8 0 26 T${d} 22`} stroke="#E3F7C4" strokeWidth={2.5} strokeOpacity={0.6} fill="none" />
          {range(-d + 4, d, 11).map((x, i) => {
            const y = 34 + (i % 3) * 3;
            return <Path key={i} d={`M${x} ${y} q-2 -11 -6 -17 M${x} ${y} q1 -12 0 -21 M${x} ${y} q3 -10 7 -15`} stroke={i % 2 ? '#D9F2A4' : '#F4E38A'} strokeWidth={1.7} strokeLinecap="round" fill="none" />;
          })}
          <Path d={`M${-d} 70 Q${-d / 3} 52 ${d / 4} 66 T${d} 60 V112 H${-d} Z`} fill={`url(#${u}c)`} />
          <Path d={`M${-d} 70 Q${-d / 3} 52 ${d / 4} 66 T${d} 60`} stroke="#B6E89A" strokeWidth={2} strokeOpacity={0.5} fill="none" />
          <G transform={`translate(${Math.min(d - 46, 118)} 62)`}>
            <Ellipse cx={0} cy={14} rx={32} ry={8} fill="#000000" opacity={0.18} />
            <Ellipse cx={0} cy={10} rx={30} ry={8} fill="#D9A84E" />
            <Path d="M-20 9 L0 -14 L20 9 Z" fill="#F2CC7A" />
            <Path d="M-20 9 L0 -14 L20 9 M-10 9 L0 -14 L10 9" stroke="#B5812E" strokeWidth={1.2} fill="none" />
            <Ellipse cx={0} cy={9} rx={20} ry={4} fill="#E3B55C" />
          </G>
        </>
      )}
    </Band>
  );
}

/** El templo: el muro blanco y dorado con la ofrenda de lotos; las velas se ponen encima (ver `PlaceFront`). */
function Templo({ w, h }: FrontProps) {
  return (
    <Band w={w} h={h}>
      {({ d, u }) => (
        <>
          <Fill id={`${u}w`} a="#FFF8EA" b="#E4D3B4" />
          <Fill id={`${u}g`} a="#FFE08A" b="#D9961E" />
          <Rect x={-d} y={24} width={2 * d} height={90} fill={`url(#${u}w)`} />
          <Rect x={-d} y={16} width={2 * d} height={11} fill={`url(#${u}g)`} />
          <Rect x={-d} y={16} width={2 * d} height={2.5} fill="#FFF6CF" opacity={0.9} />
          <Rect x={-d} y={27} width={2 * d} height={6} fill="#B4392F" />
          {range(-d + 10, d, 40).map((x, i) => (
            <Path key={i} d={`M${x} 60 q10 -18 20 0 q-10 18 -20 0 Z`} fill="none" stroke="#E5A92B" strokeWidth={1.6} opacity={0.55} />
          ))}
          <Rect x={-d} y={88} width={2 * d} height={5} fill="#E5A92B" opacity={0.6} />
          <Ellipse cx={0} cy={24} rx={34} ry={7} fill="#000000" opacity={0.18} />
          <Path d="M-30 14 C-30 30 30 30 30 14 Z" fill={`url(#${u}g)`} />
          <Ellipse cx={0} cy={14} rx={30} ry={6} fill="#B5781A" />
          {[-16, 0, 16].map((x, i) => (
            <G key={x}>
              <Path d={`M${x} 14 V${i === 1 ? -6 : 0}`} stroke="#4FA36A" strokeWidth={2.4} strokeLinecap="round" />
              <Path d={`M${x} ${i === 1 ? -24 : -17} C${x + 9} ${i === 1 ? -14 : -8} ${x + 6} ${i === 1 ? -2 : 3} ${x} ${i === 1 ? -2 : 3} C${x - 6} ${i === 1 ? -2 : 3} ${x - 9} ${i === 1 ? -14 : -8} ${x} ${i === 1 ? -24 : -17} Z`} fill={i === 1 ? '#FF8FB1' : '#FFB3C7'} />
              <Path d={`M${x} ${i === 1 ? -20 : -13} V${i === 1 ? -5 : 0}`} stroke="#FFFFFF" strokeWidth={1.2} opacity={0.6} />
            </G>
          ))}
          {[-62, 62].map((x) => (
            <G key={x}>
              <Rect x={x - 4} y={-4} width={8} height={24} rx={2} fill="#FFF4D0" />
              <Rect x={x - 7} y={18} width={14} height={5} rx={2} fill="#C98F2A" />
            </G>
          ))}
        </>
      )}
    </Band>
  );
}

/** La cocina: la encimera de azulejos con el wok humeando y el mortero. */
function Cocina({ w, h }: FrontProps) {
  return (
    <Band w={w} h={h}>
      {({ d, u }) => (
        <>
          <Fill id={`${u}t`} a="#F2CC96" b="#C48E52" />
          <Fill id={`${u}p`} a="#4A4F5E" b="#1E2230" />
          <Rect x={-d} y={30} width={2 * d} height={84} fill="#F4EFE2" />
          {range(-d, d, 24).map((x, i) => (
            <Path key={i} d={`M${x} 30 V112`} stroke="#C9D6E4" strokeWidth={1.4} />
          ))}
          <Path d={`M${-d} 56 H${d} M${-d} 82 H${d}`} stroke="#C9D6E4" strokeWidth={1.4} />
          {range(-d + 12, d, 48).map((x, i) => (
            <Path key={i} d={`M${x} 43 l4 -4 l4 4 l-4 4 Z`} fill="#3D7BFF" opacity={0.45} />
          ))}
          <Rect x={-d} y={18} width={2 * d} height={14} fill={`url(#${u}t)`} />
          <Rect x={-d} y={18} width={2 * d} height={2.5} fill="#FFEFD2" opacity={0.85} />
          <Rect x={-d} y={31} width={2 * d} height={3} fill="#000000" opacity={0.2} />
          <Ellipse cx={0} cy={24} rx={48} ry={7} fill="#000000" opacity={0.22} />
          <Path d="M-46 2 C-46 30 46 30 46 2 Z" fill={`url(#${u}p)`} />
          <Ellipse cx={0} cy={2} rx={46} ry={10} fill="#2B2F3A" />
          <Ellipse cx={0} cy={3} rx={40} ry={7.5} fill="#E5862A" />
          <Circle cx={-14} cy={2} r={3} fill="#8E2A10" />
          <Circle cx={8} cy={4} r={2.6} fill="#7BC67E" />
          <Circle cx={20} cy={1} r={2.2} fill="#FFE08A" />
          <Path d="M44 0 L74 -12" stroke="#6E4A2E" strokeWidth={5} strokeLinecap="round" />
          <Path d="M-38 12 C-30 20 -16 22 -6 22" stroke="#FFFFFF" strokeWidth={2} fill="none" opacity={0.25} strokeLinecap="round" />
          <G transform="translate(-104 0)">
            <Ellipse cx={0} cy={26} rx={24} ry={5} fill="#000000" opacity={0.2} />
            <Path d="M-20 2 C-20 28 20 28 20 2 Z" fill="#9AA3AE" />
            <Ellipse cx={0} cy={2} rx={20} ry={6} fill="#6E7682" />
            <Ellipse cx={0} cy={3} rx={15} ry={4} fill="#D9532C" />
            <Path d="M6 0 L22 -22" stroke="#B9824F" strokeWidth={6} strokeLinecap="round" />
            <Path d="M-14 12 C-10 18 -2 20 4 20" stroke="#FFFFFF" strokeWidth={1.6} fill="none" opacity={0.35} strokeLinecap="round" />
          </G>
        </>
      )}
    </Band>
  );
}

/** El café de Pai: la barra de madera con una jarrita de flores. */
function Cafe({ w, h }: FrontProps) {
  return (
    <Band w={w} h={h}>
      {({ d, u }) => (
        <>
          <Fill id={`${u}t`} a="#E0A869" b="#B57A40" />
          <Fill id={`${u}f`} a="#8E5530" b="#5C3119" />
          <Rect x={-d} y={34} width={2 * d} height={80} fill={`url(#${u}f)`} />
          {range(-d + 6, d, 36).map((x, i) => (
            <Rect key={i} x={x} y={36} width={2} height={78} fill="#3E2010" opacity={0.3} />
          ))}
          <Path d={`M${-d + 10} 58 C${-d / 2} 52 ${-d / 4} 64 0 58 S${d / 2} 52 ${d - 10} 60`} stroke="#B57A4C" strokeWidth={1.4} fill="none" opacity={0.4} />
          <Rect x={-d} y={21} width={2 * d} height={15} rx={3} fill={`url(#${u}t)`} />
          <Rect x={-d} y={21} width={2 * d} height={2.5} fill="#FFE9C2" opacity={0.85} />
          <Rect x={-d} y={35} width={2 * d} height={3} fill="#000000" opacity={0.22} />
          <Rect x={-46} y={52} width={92} height={40} rx={6} fill="#2F4B3E" stroke="#D9A066" strokeWidth={3} />
          <Path d="M-30 66 H30 M-30 78 H12" stroke="#FFF6DA" strokeWidth={3} strokeLinecap="round" opacity={0.75} />
          <G transform="translate(0 0)">
            <Ellipse cx={0} cy={24} rx={12} ry={3} fill="#000000" opacity={0.2} />
            <Path d="M-8 6 H8 L6 24 H-6 Z" fill="#7FB6FF" opacity={0.85} />
            <Path d="M-6 8 L-5 22" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.7} />
            <Path d="M0 8 C-4 -4 -10 -8 -12 -16 M0 8 C1 -6 0 -12 2 -22 M0 8 C5 -2 10 -6 13 -14" stroke="#4FA36A" strokeWidth={1.8} fill="none" strokeLinecap="round" />
            <Circle cx={-12} cy={-17} r={4.5} fill="#FFC83D" />
            <Circle cx={2} cy={-23} r={5} fill="#FF8A5B" />
            <Circle cx={13} cy={-15} r={4.5} fill="#FFFFFF" />
            <Circle cx={2} cy={-23} r={1.8} fill="#7A3A10" />
          </G>
        </>
      )}
    </Band>
  );
}

/** La sala: el respaldo de teca, la mesita baja con la tetera y los cojines triangulares (หมอนขวาน). */
function Sala({ w, h }: FrontProps) {
  return (
    <Band w={w} h={h}>
      {({ d, u }) => (
        <>
          <Fill id={`${u}t`} a="#B77946" b="#6E3F25" />
          <Fill id={`${u}m`} a="#D2413A" b="#8E211E" />
          <Rect x={-d} y={24} width={2 * d} height={90} fill={`url(#${u}t)`} />
          <Rect x={-d} y={24} width={2 * d} height={3} fill="#F0C489" opacity={0.7} />
          {range(-d + 8, d, 30).map((x, i) => (
            <Rect key={i} x={x} y={30} width={2} height={40} fill="#3E2010" opacity={0.28} />
          ))}
          <Rect x={-d} y={72} width={2 * d} height={42} fill={`url(#${u}m)`} />
          <Path d={range(-d, d, 16).map((x, i) => `${i ? 'L' : 'M'}${x} ${i % 2 ? 80 : 88}`).join(' ')} stroke="#FFC83D" strokeWidth={2.4} fill="none" />
          <Path d={`M${-d} 98 H${d}`} stroke="#FFC83D" strokeWidth={2} opacity={0.8} />
          <Ellipse cx={0} cy={66} rx={104} ry={12} fill="#000000" opacity={0.25} />
          <Path d="M-80 44 H80 L74 66 H-74 Z" fill="#5C3119" />
          <Ellipse cx={0} cy={42} rx={96} ry={17} fill="#E0A869" />
          <Ellipse cx={0} cy={40} rx={96} ry={17} fill="#C48E52" />
          <Ellipse cx={0} cy={39} rx={86} ry={13} fill="none" stroke="#FFE2B8" strokeWidth={1.2} strokeDasharray="3 5" opacity={0.6} />
          <Path d="M-14 36 C-14 20 14 20 14 36 C14 44 -14 44 -14 36 Z" fill="#F4F7FC" />
          <Path d="M14 30 C24 28 26 22 30 22" stroke="#F4F7FC" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d="M-14 28 C-26 26 -26 40 -13 38" stroke="#F4F7FC" strokeWidth={3} fill="none" />
          <Ellipse cx={0} cy={22} rx={8} ry={2.4} fill="#3D7BFF" />
          <Circle cx={0} cy={18.5} r={2.4} fill="#3D7BFF" />
          <Path d="M-10 32 C-4 36 4 36 10 32" stroke="#3D7BFF" strokeWidth={1.6} fill="none" opacity={0.6} />
          {[-48, 48].map((x) => (
            <G key={x}>
              <Path d={`M${x - 9} 34 H${x + 9} L${x + 7} 44 H${x - 7} Z`} fill="#F4F7FC" />
              <Ellipse cx={x} cy={34} rx={9} ry={2.6} fill="#B8823C" />
            </G>
          ))}
          {[-1, 1].map((s) => {
            const x = s * Math.min(d - 30, 150);
            return (
              <G key={s}>
                <Path d={`M${x - 26} 72 L${x} 28 L${x + 26} 72 Z`} fill="#3E9A6A" />
                <Path d={`M${x - 17} 57 H${x + 17} M${x - 9} 43 H${x + 9}`} stroke="#FFC83D" strokeWidth={3} />
                <Path d={`M${x - 26} 72 L${x} 28 L${x + 26} 72`} stroke="#1F5A3C" strokeWidth={1.6} fill="none" />
              </G>
            );
          })}
        </>
      )}
    </Band>
  );
}

/** La hoguera: la tierra, el corro de piedras y los troncos (las llamas van encima, animadas). */
function Fuego({ w, h }: FrontProps) {
  return (
    <Band w={w} h={h}>
      {({ d, u }) => (
        <>
          <Fill id={`${u}e`} a="#3A2C4E" b="#17122A" />
          <Path d={`M${-d} 36 Q${-d / 2} 24 0 32 T${d} 30 V112 H${-d} Z`} fill={`url(#${u}e)`} />
          <Path d={`M${-d} 36 Q${-d / 2} 24 0 32 T${d} 30`} stroke="#FF9A4D" strokeWidth={2} strokeOpacity={0.35} fill="none" />
          <Ellipse cx={0} cy={66} rx={92} ry={20} fill="#FF8A2B" opacity={0.16} />
          {[-58, -36, -12, 12, 36, 58].map((x, i) => (
            <Ellipse key={x} cx={x} cy={64 + Math.abs(i - 2.5) * 1.6} rx={13} ry={8} fill={i % 2 ? '#6B6478' : '#857D92'} />
          ))}
          <Path d="M-44 60 L40 44" stroke="#5A331C" strokeWidth={11} strokeLinecap="round" />
          <Path d="M44 60 L-40 44" stroke="#7A4A2E" strokeWidth={11} strokeLinecap="round" />
          <Path d="M-40 57 L30 44" stroke="#A8693D" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
          <Circle cx={-44} cy={60} r={5.5} fill="#C9935A" />
          <Circle cx={44} cy={60} r={5.5} fill="#C9935A" />
        </>
      )}
    </Band>
  );
}

/** La parte de abajo del móvil en una llamada: micrófono, colgar y altavoz. */
function Telefono({ w, h, pw }: FrontProps & { pw: number }) {
  return (
    <Band w={w} h={h}>
      {({ k, u }) => {
        const half = pw / k / 2;
        return (
          <>
            <Fill id={`${u}b`} a="#2B3466" b="#11163A" />
            <Path d={`M${-half} 30 H${half} V112 H${-half} Z`} fill={`url(#${u}b)`} />
            <Rect x={-half} y={30} width={2 * half} height={3} fill="#7FE0C4" opacity={0.5} />
            <Circle cx={0} cy={68} r={22} fill="#E8473F" />
            <Circle cx={0} cy={66} r={22} fill="#FF5D54" />
            <Path d="M-11 70 C-6 60 6 60 11 70 L7 73 L4 68 C1 67 -1 67 -4 68 L-7 73 Z" fill="#FFFFFF" />
            {[-1, 1].map((s) => (
              <G key={s}>
                <Circle cx={s * Math.min(half - 26, 62)} cy={68} r={15} fill="#FFFFFF" opacity={0.14} />
                <Path
                  d={s < 0 ? `M${-Math.min(half - 26, 62) - 3} 60 v9 a3 3 0 0 0 6 0 v-9 a3 3 0 0 0 -6 0 M${-Math.min(half - 26, 62) - 7} 68 a7 7 0 0 0 14 0 M${-Math.min(half - 26, 62)} 75 v4` : `M${Math.min(half - 26, 62) - 7} 65 v6 h4 l5 4 v-14 l-5 4 Z M${Math.min(half - 26, 62) + 5} 64 a6 6 0 0 1 0 8`}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </G>
            ))}
          </>
        );
      }}
    </Band>
  );
}

/** Ancho del móvil de una llamada según cuántos hablan y su tamaño. */
export const phoneWidth = (sw: number, n: number, size: number) => Math.min(sw - 20, Math.max(170, n * size * 1.12 + 44));

/** Lo que va detrás de quien habla: el móvil de la llamada, el toldo del mercado, el resplandor de la hoguera. */
export function PlaceBack({ place, w, h, top, size, n }: { place: DialoguePlace; w: number; h: number; top: number; size: number; n: number }) {
  const u = `pb${uidOf(useId())}`;
  if (place === 'mercado')
    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
        <Awning width={w} height={Math.min(44, h * 0.16)} />
      </View>
    );
  if (place === 'fuego') return <Glow size={Math.min(w * 1.2, 460)} tint="#FF9A4D" strength={0.5} style={{ position: 'absolute', left: w / 2 - Math.min(w * 1.2, 460) / 2, top: h - Math.min(w * 1.2, 460) * 0.62 }} />;
  if (place !== 'telefono') return null;
  const pw = phoneWidth(w, n, size);
  const y0 = Math.max(4, top - size * 0.34);
  const ph = h - y0 + 40;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: (w - pw) / 2, top: y0, width: pw, height: ph }}>
      <Svg width={pw} height={ph} viewBox={`0 0 ${pw} ${ph}`}>
        <Defs>
          <LinearGradient id={u} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3FB5A8" />
            <Stop offset="0.55" stopColor="#3D6FD8" />
            <Stop offset="1" stopColor="#2B3A86" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={pw} height={ph} rx={30} fill="#11163A" />
        <Rect x={2} y={2} width={pw - 4} height={ph} rx={28} fill="none" stroke="#5F6FD0" strokeWidth={2} opacity={0.6} />
        <Rect x={8} y={8} width={pw - 16} height={ph} rx={23} fill={`url(#${u})`} />
        <Rect x={pw / 2 - 26} y={14} width={52} height={9} rx={4.5} fill="#11163A" />
        <Path d={`M22 ${ph * 0.2} C${pw * 0.3} ${ph * 0.08} ${pw * 0.5} ${ph * 0.06} ${pw * 0.62} ${ph * 0.1}`} stroke="#FFFFFF" strokeWidth={3} fill="none" opacity={0.16} strokeLinecap="round" />
      </Svg>
      <Glow size={size * 2.1} tint="#B8F5E6" strength={0.55} style={{ position: 'absolute', left: pw / 2 - size * 1.05, top: top - y0 + size * 0.5 - size * 1.05 }} />
    </View>
  );
}

/**
 * Lo que va delante de quien habla y le tapa de cintura para abajo. `w` × `h` es todo el ancho del escenario por
 * el alto del frente; en la mesa, el khantoke va centrado con su propio ancho (`tableW`).
 */
export function PlaceFront({ place, w, h, tableW, size, n }: { place: DialoguePlace; w: number; h: number; tableW: number; size: number; n: number }) {
  const k = h / 110;
  const cx = w / 2;
  if (place === 'mesa')
    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: (w - tableW) / 2, bottom: 0 }}>
        <Khantoke width={tableW} />
      </View>
    );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0, width: w, height: h }}>
      {place === 'calle' ? <Calle w={w} h={h} /> : null}
      {place === 'campo' ? <Campo w={w} h={h} /> : null}
      {place === 'sala' ? <Sala w={w} h={h} /> : null}
      {place === 'telefono' ? <Telefono w={w} h={h} pw={phoneWidth(w, n, size)} /> : null}
      {place === 'cafe' ? (
        <>
          <Cafe w={w} h={h} />
          {[-1, 1].map((s) => (
            <View key={s} style={{ position: 'absolute', left: cx + s * Math.min(w * 0.3, 112 * k) - 22 * k, top: -14 * k }}>
              <GoodIcon art="cafe" size={44 * k} />
            </View>
          ))}
        </>
      ) : null}
      {place === 'templo' ? (
        <>
          <Templo w={w} h={h} />
          <Glow size={70 * k} tint="#FFE08A" strength={0.6} style={{ position: 'absolute', left: cx - 62 * k - 35 * k, top: -46 * k }} />
          <Glow size={70 * k} tint="#FFE08A" strength={0.6} style={{ position: 'absolute', left: cx + 62 * k - 35 * k, top: -46 * k }} />
          <Flame x={cx - 62 * k} y={-3 * k} size={20 * k} />
          <Flame x={cx + 62 * k} y={-3 * k} size={20 * k} delay={90} />
        </>
      ) : null}
      {place === 'cocina' ? (
        <>
          <Cocina w={w} h={h} />
          <Wisp x={cx - 12 * k} y={-6 * k} size={24 * k} delay={0} />
          <Wisp x={cx + 4 * k} y={-8 * k} size={22 * k} delay={850} />
          <Wisp x={cx + 18 * k} y={-4 * k} size={20 * k} delay={1700} />
          <View style={{ position: 'absolute', left: cx + Math.min(w * 0.3, 96 * k) - 14 * k, top: -6 * k, flexDirection: 'row' }}>
            <GoodIcon art="lima" size={30 * k} />
            <View style={{ marginLeft: -8 * k, marginTop: 4 * k }}>
              <GoodIcon art="guindilla" size={30 * k} />
            </View>
          </View>
        </>
      ) : null}
      {place === 'fuego' ? (
        <>
          <Fuego w={w} h={h} />
          <Flame x={cx - 16 * k} y={54 * k} size={46 * k} delay={60} />
          <Flame x={cx + 16 * k} y={54 * k} size={42 * k} delay={130} />
          <Flame x={cx} y={56 * k} size={66 * k} />
          <Wisp x={cx - 6 * k} y={-10 * k} size={20 * k} delay={300} tint="#FFD9A8" />
          <Wisp x={cx + 12 * k} y={-16 * k} size={16 * k} delay={1500} tint="#FFD9A8" />
        </>
      ) : null}
      {place === 'mercado' ? (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.72 }}>
            <Counter width={w} height={h * 0.72} />
          </View>
          {(
            [
              ['mango', -1, 0],
              ['naranja', -1, 1],
              ['coco', 1, 0],
              ['sandia', 1, 1],
            ] as const
          ).map(([art, s, j]) => (
            <View key={art} style={{ position: 'absolute', left: cx + s * (w / 2 - 26 * k - j * 30 * k) - 19 * k, top: h * 0.28 - 30 * k + j * 2 * k }}>
              <GoodIcon art={art} size={38 * k} />
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}
