// Escenarios de los juegos: fondos por capas con luz y profundidad, y vida ambiente (niebla, nubes, estrellas,
// lluvia, farolillos, luces de feria, polvo de cueva). Ocupan toda la pantalla, también detrás de la cabecera.
// Uso: <Backdrop scene="noche" /> como primer hijo del contenedor del juego.
import { useEffect, useId, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { MistBand } from '@/components/Scenery';

import { useGameFrame } from './fx';

export type Scene = 'amanecer' | 'dia' | 'noche' | 'lluvia' | 'templo' | 'mercado' | 'cueva' | 'arrozal' | 'casa';

/** Escenarios oscuros: textos claros encima. */
export const DARK_SCENES: ReadonlySet<Scene> = new Set(['noche', 'cueva', 'mercado']);

const W = 390;
const H = 844;

export function Backdrop({ scene }: { scene: Scene }) {
  const frame = useGameFrame();
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [size, setSize] = useState({ w: 0, h: 0 });
  const Art = ART[scene];
  return (
    <View
      pointerEvents="none"
      style={[styles.fill, { top: -frame.top, bottom: -frame.bottom }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Art u={u} />
      </Svg>
      {size.w > 0 ? <Ambient scene={scene} w={size.w} h={size.h} /> : null}
    </View>
  );
}

// ——— Dibujos de cada escenario (coordenadas en 390 × 844) ———

function Sky({ id, stops }: { id: string; stops: [number, string][] }) {
  return (
    <>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([o, c]) => (
            <Stop key={o} offset={o} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill={`url(#${id})`} />
    </>
  );
}

function Grad({ id, top, bottom }: { id: string; top: string; bottom: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={top} />
        <Stop offset="1" stopColor={bottom} />
      </LinearGradient>
    </Defs>
  );
}

function Halo({ id, cx, cy, r, tint, strength = 0.85 }: { id: string; cx: number; cy: number; r: number; tint: string; strength?: number }) {
  return (
    <>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={tint} stopOpacity={strength} />
          <Stop offset="0.5" stopColor={tint} stopOpacity={strength * 0.35} />
          <Stop offset="1" stopColor={tint} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </>
  );
}

/** Capa de montaña con degradado (más clara arriba: la luz viene del cielo). */
function Ridge({ id, d, top, bottom, rim }: { id: string; d: string; top: string; bottom: string; rim?: string }) {
  return (
    <>
      <Grad id={id} top={top} bottom={bottom} />
      <Path d={d} fill={`url(#${id})`} />
      {rim ? <Path d={d.split('V')[0]} stroke={rim} strokeWidth={2} strokeOpacity={0.5} fill="none" /> : null}
    </>
  );
}

function Amanecer({ u }: { u: string }) {
  return (
    <>
      <Sky id={`${u}s`} stops={[[0, '#7FA4DE'], [0.42, '#C7B6E2'], [0.7, '#FBC7A4'], [1, '#FFE6BF']]} />
      <Halo id={`${u}h`} cx={285} cy={400} r={210} tint="#FFF3CF" />
      <Circle cx={285} cy={400} r={34} fill="#FFF4D6" />
      <Path d="M58 150 q6 -6 12 0 q6 -6 12 0 M96 128 q5 -5 10 0 q5 -5 10 0 M40 186 q4 -4 8 0 q4 -4 8 0" stroke="#5B6788" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <Ridge id={`${u}a`} d="M0 470 Q40 428 82 452 T164 420 T250 446 T332 408 T390 440 V844 H0 Z" top="#C6D1E8" bottom="#AFC0DC" />
      <Ridge id={`${u}b`} d="M0 528 Q52 476 112 506 T222 474 T322 510 T390 484 V844 H0 Z" top="#AFC6D6" bottom="#93ABC0" />
      <Ridge id={`${u}c`} d="M0 598 Q72 546 142 580 T272 548 T390 586 V844 H0 Z" top="#94BFAE" bottom="#73A28F" rim="#D9F0E2" />
      <Ridge id={`${u}d`} d="M0 678 Q82 626 172 662 T332 634 T390 656 V844 H0 Z" top="#73AB8B" bottom="#4F8B6B" rim="#BDE5C8" />
      <Ridge id={`${u}e`} d="M0 758 Q102 710 204 746 T390 728 V844 H0 Z" top="#4F8C6A" bottom="#356A50" rim="#9FD3AE" />
    </>
  );
}

function Dia({ u }: { u: string }) {
  return (
    <>
      <Sky id={`${u}s`} stops={[[0, '#4C98FF'], [0.55, '#9ACBFF'], [1, '#E2F2FF']]} />
      <Halo id={`${u}h`} cx={322} cy={118} r={150} tint="#FFFBE0" strength={0.95} />
      <Circle cx={322} cy={118} r={38} fill="#FFF8D2" />
      <Ridge id={`${u}a`} d="M0 560 Q60 520 130 540 T260 515 T390 538 V844 H0 Z" top="#BFD9EE" bottom="#A9C8E2" />
      <Ridge id={`${u}b`} d="M0 612 Q98 548 198 590 T390 566 V844 H0 Z" top="#A9DB78" bottom="#76BB5C" rim="#E3F7C4" />
      <Ridge id={`${u}c`} d="M0 692 Q122 628 242 676 T390 656 V844 H0 Z" top="#7CC86B" bottom="#4E9F55" rim="#CDEFA9" />
      <G>
        {[60, 92, 300, 334, 356].map((x, i) => (
          <G key={x} transform={`translate(${x} ${652 + (i % 2) * 10})`}>
            <Ellipse cx={0} cy={22} rx={12} ry={4} fill="#2F7A44" opacity={0.35} />
            <Rect x={-2.5} y={8} width={5} height={14} rx={2} fill="#7A4A2E" />
            <Circle cx={0} cy={2} r={13} fill="#3E9A52" />
            <Circle cx={-4} cy={-2} r={7} fill="#5CB866" />
          </G>
        ))}
      </G>
      <Ridge id={`${u}d`} d="M0 772 Q142 724 284 758 T390 752 V844 H0 Z" top="#5DB05F" bottom="#3B8A4E" rim="#B6E89A" />
    </>
  );
}

function Noche({ u }: { u: string }) {
  return (
    <>
      <Sky id={`${u}s`} stops={[[0, '#080C2A'], [0.5, '#18205A'], [0.82, '#3A2F72'], [1, '#56407E']]} />
      <Halo id={`${u}h`} cx={300} cy={150} r={150} tint="#FFF2CC" strength={0.45} />
      <Circle cx={300} cy={150} r={30} fill="#FFF4D8" />
      <Circle cx={292} cy={143} r={6} fill="#EFE2BC" />
      <Circle cx={309} cy={160} r={4} fill="#EFE2BC" />
      <Halo id={`${u}g`} cx={120} cy={700} r={160} tint="#FF9A4D" strength={0.18} />
      <Ridge id={`${u}a`} d="M0 640 Q62 598 124 624 T246 598 T390 630 V844 H0 Z" top="#232A63" bottom="#1A1F4E" />
      <Ridge id={`${u}b`} d="M0 722 Q92 680 192 710 T390 700 V844 H0 Z" top="#151A43" bottom="#0E1233" rim="#3B4290" />
      <Rect x={0} y={796} width={W} height={48} fill="#0B0E2A" />
    </>
  );
}

function Lluvia({ u }: { u: string }) {
  return (
    <>
      <Sky id={`${u}s`} stops={[[0, '#44536C'], [0.5, '#6C7F9A'], [1, '#A3B3C7']]} />
      <Ridge id={`${u}a`} d="M0 560 Q70 520 140 545 T280 515 T390 548 V844 H0 Z" top="#8597B0" bottom="#7688A2" />
      <Ridge id={`${u}b`} d="M0 640 Q90 590 190 620 T390 600 V844 H0 Z" top="#5F8676" bottom="#4E7464" />
      <Rect x={0} y={690} width={W} height={154} fill="#557E70" />
      {[712, 742, 776, 812].map((y, i) => (
        <Path key={y} d={`M${-10 + i * 12} ${y} Q195 ${y - 10} ${400 - i * 8} ${y}`} stroke="#DDE8F2" strokeWidth={2} strokeOpacity={0.32} fill="none" />
      ))}
      <Path d="M-30 170 Q20 96 96 124 Q150 54 226 108 Q292 66 344 116 Q410 102 420 170 V0 H-30 Z" fill="#33405A" />
      <Path d="M-30 210 Q30 150 100 176 Q170 120 240 160 Q300 128 360 168 Q404 160 420 206 V0 H-30 Z" fill="#3D4B66" opacity={0.75} />
    </>
  );
}

function Templo({ u }: { u: string }) {
  return (
    <>
      <Sky id={`${u}s`} stops={[[0, '#FFE7B3'], [0.5, '#FFC47E'], [1, '#EE9455']]} />
      <Halo id={`${u}h`} cx={195} cy={520} r={260} tint="#FFF6DA" strength={0.7} />
      <Ridge id={`${u}a`} d="M0 610 Q70 570 150 594 T300 570 T390 596 V844 H0 Z" top="#E8A770" bottom="#D88D5A" />
      <G>
        <Rect x={112} y={640} width={166} height={120} fill="#6A2424" />
        <Rect x={150} y={680} width={26} height={80} rx={3} fill="#3E1414" />
        <Rect x={214} y={680} width={26} height={80} rx={3} fill="#3E1414" />
        <Path d="M86 662 L195 572 L304 662 Z" fill="#8D372D" />
        <Path d="M86 662 L195 572 L304 662" stroke="#FFC83D" strokeWidth={3.5} fill="none" strokeLinejoin="round" />
        <Path d="M124 604 L195 534 L266 604 Z" fill="#A2442F" />
        <Path d="M124 604 L195 534 L266 604" stroke="#FFC83D" strokeWidth={3} fill="none" strokeLinejoin="round" />
        <Path d="M152 556 L195 506 L238 556 Z" fill="#B65235" />
        <Path d="M152 556 L195 506 L238 556" stroke="#FFC83D" strokeWidth={2.6} fill="none" strokeLinejoin="round" />
        <Path d="M195 506 q7 -16 -3 -26 M86 662 q-10 -4 -14 -16 M304 662 q10 -4 14 -16" stroke="#FFC83D" strokeWidth={3} fill="none" strokeLinecap="round" />
        <Grad id={`${u}c`} top="#FFE07A" bottom="#D9961E" />
        <Path d="M318 744 Q318 668 346 646 Q374 668 374 744 Z" fill={`url(#${u}c)`} />
        <Path d="M346 646 L346 586" stroke="#E5A92B" strokeWidth={5} strokeLinecap="round" />
        <Rect x={310} y={742} width={72} height={18} rx={3} fill="#C98F2A" />
      </G>
      <Path d="M0 762 Q195 742 390 762 V844 H0 Z" fill="#8B4A2A" />
      <Path d="M0 790 Q195 774 390 790 V844 H0 Z" fill="#743B22" />
    </>
  );
}

function Mercado({ u }: { u: string }) {
  const stall = (x: number, a: string, b: string) => (
    <G key={x} transform={`translate(${x} 0)`}>
      <Rect x={0} y={690} width={120} height={100} fill="#2E1B36" />
      <Rect x={10} y={706} width={100} height={60} rx={6} fill="#FFB86B" opacity={0.55} />
      {Array.from({ length: 6 }, (_, i) => (
        <Rect key={i} x={i * 20 - 6} y={650} width={20} height={42} fill={i % 2 ? b : a} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <Circle key={i} cx={i * 20 + 4} cy={692} r={10} fill={i % 2 ? b : a} />
      ))}
      <Rect x={-6} y={646} width={132} height={8} rx={4} fill="#2E1B36" opacity={0.6} />
    </G>
  );
  return (
    <>
      <Sky id={`${u}s`} stops={[[0, '#251C47'], [0.45, '#633360'], [0.78, '#D46E4B'], [1, '#F4A65C']]} />
      <Halo id={`${u}h`} cx={195} cy={700} r={250} tint="#FFC27A" strength={0.4} />
      <Path d="M-10 120 Q195 220 400 120" stroke="#1A1230" strokeWidth={2} fill="none" />
      <Path d="M-10 200 Q195 300 400 200" stroke="#1A1230" strokeWidth={2} fill="none" />
      {stall(-6, '#E8473F', '#FFF1DE')}
      {stall(136, '#FF8A2B', '#FFF1DE')}
      {stall(278, '#2E9C6A', '#FFF1DE')}
      <Rect x={0} y={788} width={W} height={56} fill="#26162C" />
    </>
  );
}

function Cueva({ u }: { u: string }) {
  return (
    <>
      <Defs>
        <RadialGradient id={`${u}s`} cx="50%" cy="46%" r="70%">
          <Stop offset="0" stopColor="#2E3A78" />
          <Stop offset="0.45" stopColor="#151C42" />
          <Stop offset="1" stopColor="#04050E" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill={`url(#${u}s)`} />
      <Path d="M0 0 H390 V90 L372 150 L356 96 L338 176 L316 104 L296 140 L270 92 L246 128 L222 86 L196 160 L172 94 L150 130 L126 88 L104 168 L84 104 L60 142 L38 92 L18 156 L0 110 Z" fill="#05060F" />
      <Path d="M0 844 V700 Q30 650 60 690 Q90 640 130 700 Q150 760 200 744 Q250 730 270 690 Q310 640 340 690 Q370 650 390 680 V844 Z" fill="#070914" />
      <Path d="M0 0 V844 H26 Q10 700 22 520 Q6 360 24 180 Q14 80 30 0 Z M390 0 V844 H364 Q380 680 366 500 Q384 330 362 160 Q374 70 358 0 Z" fill="#05060F" />
      <Grad id={`${u}c`} top="#7CFFF0" bottom="#178A9A" />
      <Grad id={`${u}p`} top="#D7B0FF" bottom="#6A3FB0" />
      <Path d="M30 770 L46 700 L60 770 Z M52 776 L70 724 L84 776 Z M16 784 L26 744 L38 784 Z" fill={`url(#${u}c)`} opacity={0.9} />
      <Path d="M330 772 L348 706 L362 772 Z M354 780 L370 734 L382 780 Z M312 784 L322 748 L334 784 Z" fill={`url(#${u}p)`} opacity={0.9} />
      <Halo id={`${u}g1`} cx={50} cy={750} r={70} tint="#5FF2E0" strength={0.4} />
      <Halo id={`${u}g2`} cx={348} cy={752} r={70} tint="#B98CFF" strength={0.4} />
    </>
  );
}

function Arrozal({ u }: { u: string }) {
  const bands: [string, string][] = [
    ['M0 560 Q100 540 200 552 T390 546 V844 H0 Z', '#B6DE84'],
    ['M0 612 Q110 586 220 604 T390 596 V844 H0 Z', '#97CD6E'],
    ['M0 672 Q120 642 240 664 T390 652 V844 H0 Z', '#79BC62'],
    ['M0 738 Q130 704 260 730 T390 716 V844 H0 Z', '#5CA859'],
    ['M0 806 Q140 776 280 800 T390 790 V844 H0 Z', '#47934F'],
  ];
  return (
    <>
      <Sky id={`${u}s`} stops={[[0, '#8EC2FF'], [0.55, '#DCEEFF'], [1, '#FFF4DC']]} />
      <Halo id={`${u}h`} cx={90} cy={150} r={130} tint="#FFFBE6" strength={0.9} />
      <Ridge id={`${u}a`} d="M0 470 Q60 420 130 448 T260 418 T390 452 V844 H0 Z" top="#B8CDE2" bottom="#A3BCD5" />
      <Ridge id={`${u}b`} d="M0 528 Q80 482 170 506 T390 498 V844 H0 Z" top="#9DC2AE" bottom="#86AF98" />
      {bands.map(([d, c], i) => (
        <G key={i}>
          <Path d={d} fill={c} />
          <Path d={d.split('V')[0]} stroke="#F4FFE8" strokeWidth={2.5} strokeOpacity={0.55} fill="none" />
        </G>
      ))}
      <G transform="translate(300 560)">
        <Path d="M-26 0 L0 -22 L26 0 Z" fill="#8A4F2B" />
        <Rect x={-20} y={0} width={40} height={20} fill="#B9784A" />
        <Rect x={-6} y={6} width={12} height={14} fill="#5E3519" />
      </G>
    </>
  );
}

function Casa({ u }: { u: string }) {
  return (
    <>
      <Sky id={`${u}s`} stops={[[0, '#A8693D'], [0.6, '#8C5432'], [1, '#6E3F25']]} />
      {Array.from({ length: 9 }, (_, i) => (
        <Rect key={i} x={i * 44 + 20} y={0} width={2} height={H} fill="#5E3519" opacity={0.35} />
      ))}
      <Halo id={`${u}l`} cx={70} cy={210} r={220} tint="#FFD58A" strength={0.55} />
      <Rect x={190} y={120} width={170} height={210} rx={8} fill="#5A331C" />
      <Grad id={`${u}w`} top="#1B2452" bottom="#4A3F82" />
      <Rect x={200} y={130} width={150} height={190} rx={4} fill={`url(#${u}w)`} />
      <Circle cx={316} cy={168} r={14} fill="#FFF2CF" />
      <Path d="M200 280 Q240 246 280 268 T350 254 V320 H200 Z" fill="#141A40" />
      <Rect x={272} y={130} width={6} height={190} fill="#5A331C" />
      <Rect x={200} y={222} width={150} height={6} fill="#5A331C" />
      <Path d="M70 0 V120" stroke="#3E2414" strokeWidth={2} />
      <Path d="M44 120 H96 L84 150 H56 Z" fill="#E9B055" />
      <Ellipse cx={70} cy={152} rx={16} ry={5} fill="#FFE7A6" />
      <Path d="M0 700 Q195 680 390 700 V844 H0 Z" fill="#D7B176" />
      {Array.from({ length: 8 }, (_, i) => (
        <Path key={i} d={`M0 ${716 + i * 16} Q195 ${700 + i * 16} 390 ${716 + i * 16}`} stroke="#B98F55" strokeWidth={2} strokeOpacity={0.5} fill="none" />
      ))}
    </>
  );
}

const ART: Record<Scene, (p: { u: string }) => ReactElement> = {
  amanecer: Amanecer,
  dia: Dia,
  noche: Noche,
  lluvia: Lluvia,
  templo: Templo,
  mercado: Mercado,
  cueva: Cueva,
  arrozal: Arrozal,
  casa: Casa,
};

// ——— Vida ambiente (en píxeles reales del contenedor) ———

function Ambient({ scene, w, h }: { scene: Scene; w: number; h: number }) {
  if (scene === 'amanecer' || scene === 'arrozal')
    return (
      <>
        <MistBand top={h * 0.55} width={w * 0.62} opacity={0.6} />
        <MistBand top={h * 0.68} width={w * 0.58} opacity={0.5} delay={1200} distance={-50} />
        <MistBand top={h * 0.84} width={w * 0.5} opacity={0.4} delay={600} distance={36} />
      </>
    );
  if (scene === 'dia') return <Clouds w={w} h={h} />;
  if (scene === 'noche')
    return (
      <>
        <Twinkles w={w} h={h * 0.62} n={26} tint="#FFFFFF" />
        <RisingLanterns w={w} h={h} />
      </>
    );
  if (scene === 'lluvia') return <Rain w={w} h={h} />;
  if (scene === 'templo') return <Motes w={w} h={h} n={12} tint="#FFF6D8" size={10} glow />;
  if (scene === 'mercado') return <StringLights w={w} h={h} />;
  if (scene === 'cueva') return <Motes w={w} h={h} n={16} tint="#A9C8FF" size={4} />;
  if (scene === 'casa') return <Motes w={w} h={h * 0.6} n={8} tint="#FFE7B0" size={5} />;
  return null;
}

/** Bucle 0→1 que se repite (o 0↔1 si `bounce`). Respeta «reducir movimiento». */
function useLoop(ms: number, delay = 0, bounce = false) {
  const reduced = useReducedMotion();
  const t = useSharedValue(bounce ? 0.5 : 0);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: ms, easing: bounce ? Easing.inOut(Easing.sin) : Easing.linear }), -1, bounce));
  }, [reduced, t, ms, delay, bounce]);
  return t;
}

function Twinkles({ w, h, n, tint }: { w: number; h: number; n: number; tint: string }) {
  const [stars] = useState(() => Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), s: 1.5 + Math.random() * 2.5, ms: 1200 + Math.random() * 2200, d: Math.random() * 2000 })));
  return (
    <>
      {stars.map((s, i) => (
        <Twinkle key={i} x={s.x * w} y={s.y * h} size={s.s} ms={s.ms} delay={s.d} tint={tint} />
      ))}
    </>
  );
}

function Twinkle({ x, y, size, ms, delay, tint }: { x: number; y: number; size: number; ms: number; delay: number; tint: string }) {
  const t = useLoop(ms, delay, true);
  const st = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * t.value, transform: [{ scale: 0.7 + 0.5 * t.value }] }));
  return <Animated.View style={[{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size, backgroundColor: tint, shadowColor: tint, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }, st]} />;
}

function RisingLanterns({ w, h }: { w: number; h: number }) {
  const [list] = useState(() => Array.from({ length: 7 }, (_, i) => ({ x: (i + 0.5) / 7 + (Math.random() - 0.5) * 0.08, s: 0.6 + Math.random() * 0.7, ms: 16000 + Math.random() * 14000, d: Math.random() * 12000 })));
  return (
    <>
      {list.map((l, i) => (
        <RisingLantern key={i} x={l.x * w} h={h} scale={l.s} ms={l.ms} delay={l.d} />
      ))}
    </>
  );
}

function RisingLantern({ x, h, scale, ms, delay }: { x: number; h: number; scale: number; ms: number; delay: number }) {
  const t = useLoop(ms, delay);
  const st = useAnimatedStyle(() => ({
    opacity: t.value < 0.1 ? t.value * 10 : t.value > 0.8 ? (1 - t.value) * 5 : 1,
    transform: [{ translateY: h * 0.82 - t.value * h * 0.8 }, { translateX: Math.sin(t.value * Math.PI * 4) * 10 }, { scale: scale * (1 - t.value * 0.45) }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 8, top: 0, width: 16, height: 20, borderRadius: 7, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: '#FFB25C', shadowColor: '#FF9A3D', shadowOpacity: 0.95, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } }, st]}>
      <View style={{ position: 'absolute', left: 4, right: 4, bottom: 3, height: 6, borderRadius: 3, backgroundColor: '#FFF1C2' }} />
    </Animated.View>
  );
}

function Clouds({ w, h }: { w: number; h: number }) {
  return (
    <>
      <Cloud y={h * 0.1} w={w} scale={1.1} ms={70000} delay={0} />
      <Cloud y={h * 0.22} w={w} scale={0.75} ms={90000} delay={25000} />
      <Cloud y={h * 0.32} w={w} scale={0.9} ms={80000} delay={50000} />
    </>
  );
}

function Cloud({ y, w, scale, ms, delay }: { y: number; w: number; scale: number; ms: number; delay: number }) {
  const t = useLoop(ms, 0);
  const off = delay / ms;
  const st = useAnimatedStyle(() => {
    const v = (t.value + off) % 1;
    return { transform: [{ translateX: -170 * scale + v * (w + 340 * scale) }, { scale }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: y, width: 170, height: 70 }, st]}>
      <Svg width={170} height={70} viewBox="0 0 170 70">
        <Ellipse cx={85} cy={52} rx={78} ry={16} fill="#D9E9FF" />
        <Circle cx={52} cy={40} r={24} fill="#FFFFFF" />
        <Circle cx={88} cy={30} r={30} fill="#FFFFFF" />
        <Circle cx={124} cy={42} r={22} fill="#FFFFFF" />
        <Ellipse cx={86} cy={50} rx={70} ry={12} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

function Rain({ w, h }: { w: number; h: number }) {
  const [drops] = useState(() => Array.from({ length: 30 }, () => ({ x: Math.random() * 1.2 - 0.1, ms: 650 + Math.random() * 500, d: Math.random() * 1200, len: 14 + Math.random() * 14 })));
  return (
    <>
      {drops.map((d, i) => (
        <RainDrop key={i} x={d.x * w} h={h} ms={d.ms} delay={d.d} len={d.len} />
      ))}
    </>
  );
}

function RainDrop({ x, h, ms, delay, len }: { x: number; h: number; ms: number; delay: number; len: number }) {
  const t = useLoop(ms, delay);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: -40 + t.value * (h + 80) }, { translateX: -t.value * 40 }, { rotate: '12deg' }] }));
  return <Animated.View style={[{ position: 'absolute', left: x, top: 0, width: 2, height: len, borderRadius: 2, backgroundColor: 'rgba(235,244,255,0.55)' }, st]} />;
}

function Motes({ w, h, n, tint, size, glow }: { w: number; h: number; n: number; tint: string; size: number; glow?: boolean }) {
  const [list] = useState(() => Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), ms: 5000 + Math.random() * 6000, d: Math.random() * 4000, s: size * (0.5 + Math.random()) })));
  return (
    <>
      {list.map((m, i) => (
        <Mote key={i} x={m.x * w} y={m.y * h} size={m.s} ms={m.ms} delay={m.d} tint={tint} glow={glow} />
      ))}
    </>
  );
}

function Mote({ x, y, size, ms, delay, tint, glow }: { x: number; y: number; size: number; ms: number; delay: number; tint: string; glow?: boolean }) {
  const t = useLoop(ms, delay, true);
  const st = useAnimatedStyle(() => ({ opacity: 0.2 + 0.6 * t.value, transform: [{ translateY: -24 * t.value }, { translateX: 10 * Math.sin(t.value * Math.PI) }] }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size, backgroundColor: tint },
        glow ? { shadowColor: tint, shadowOpacity: 1, shadowRadius: size, shadowOffset: { width: 0, height: 0 }, opacity: 0.5 } : null,
        st,
      ]}
    />
  );
}

/** Guirnaldas de bombillas de la feria (siguen las curvas dibujadas en el escenario «mercado»). */
function StringLights({ w, h }: { w: number; h: number }) {
  const sx = w / W;
  const sy = h / H;
  const s = Math.max(sx, sy);
  const ox = (w - W * s) / 2;
  const oy = (h - H * s) / 2;
  const bulbs: { x: number; y: number; c: string; d: number }[] = [];
  const COLORS = ['#FFD166', '#FF8A5B', '#FFF1C2', '#7FE0C4', '#FF6FA0'];
  for (const [y0, sag] of [
    [120, 100],
    [200, 100],
  ] as const) {
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const px = -10 + t * 410;
      const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag) + t * t * y0;
      bulbs.push({ x: ox + px * s, y: oy + py * s + 6, c: COLORS[(i + (y0 === 120 ? 0 : 2)) % COLORS.length], d: (i * 173) % 1400 });
    }
  }
  return (
    <>
      {bulbs.map((b, i) => (
        <Twinkle key={i} x={b.x - 4} y={b.y} size={8} ms={1400} delay={b.d} tint={b.c} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
});
