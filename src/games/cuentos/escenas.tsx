// Ilustraciones de los «Cuentos de Yai»: una viñeta por página (cielo según la hora o el tiempo, paisaje del norte,
// Noi, Yai y los objetos del cuento como pegatinas). Cada cuento tiene su guion de escenas; si llega un cuento nuevo
// sin guion, la escena se deduce de sus palabras.
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { NoiPose } from '@/brand/noi-art';
import { Noi } from '@/components/Noi';
import type { Story } from '@/content/types';

import { useSvgId } from '../letras/anim';

export type Sky = 'dawn' | 'day' | 'dusk' | 'night' | 'rain' | 'indoor' | 'dark';
export type Land = 'hills' | 'paddy' | 'river' | 'village' | 'road' | 'floor';
export type SceneSpec = { sky: Sky; land?: Land; fog?: boolean; wind?: boolean; noi?: NoiPose; yai?: boolean | 'girl'; items?: string[] };

/** Guion de escenas de cada cuento (una por página). */
const SCRIPTS: Record<string, SceneSpec[]> = {
  st1: [
    { sky: 'dawn', land: 'hills', noi: 'feliz', items: ['🐓', '🌼'] },
    { sky: 'dawn', land: 'hills', fog: true, noi: 'piensa', items: ['🌫️'] },
    { sky: 'dawn', land: 'hills', fog: true, noi: 'escucha', yai: true, items: ['☀️'] },
    { sky: 'day', land: 'road', noi: 'celebra', items: ['🌸', '🌼'] },
  ],
  st2: [
    { sky: 'day', land: 'village', items: ['🚶', '🚶‍♀️'] },
    { sky: 'dawn', land: 'road', yai: 'girl', items: ['🏫', '🧑‍🤝‍🧑'] },
    { sky: 'rain', land: 'village', yai: 'girl', items: ['🍲'] },
    { sky: 'day', land: 'road', yai: true, items: ['🚗', '💭'] },
  ],
  st3: [
    { sky: 'indoor', land: 'floor', yai: true, items: ['🎂', '🇪🇸'] },
    { sky: 'indoor', land: 'floor', yai: true, items: ['📱', '👧'] },
    { sky: 'indoor', land: 'floor', yai: true, items: ['❓', '📱'] },
    { sky: 'indoor', land: 'floor', yai: true, items: ['📱', '❤️', '📅'] },
  ],
  st4: [
    { sky: 'day', land: 'river', wind: true, noi: 'ups', items: ['🎋'] },
    { sky: 'dusk', land: 'hills', noi: 'ups', items: ['🦋', '🍚'] },
    { sky: 'indoor', land: 'floor', noi: 'escucha', yai: true, items: ['🌼', '🧵'] },
    { sky: 'day', land: 'hills', noi: 'celebra', yai: true, items: ['🦋', '🌈'] },
  ],
  stm3: [
    { sky: 'day', land: 'paddy', items: ['👨‍🌾', '🐃'] },
    { sky: 'rain', land: 'paddy', items: ['🐃', '🛒'] },
    { sky: 'dusk', land: 'paddy', items: ['🐃', '🌿'] },
    { sky: 'day', land: 'paddy', items: ['🚜', '💭'] },
  ],
  stm6: [
    { sky: 'rain', land: 'village', items: ['🌧️'] },
    { sky: 'dark', land: 'floor', yai: true, items: ['🕯️', '🔦'] },
    { sky: 'dark', land: 'floor', items: ['🪔', '👻', '🍚'] },
    { sky: 'indoor', land: 'floor', yai: true, items: ['💡', '😊'] },
  ],
  stm8: [
    { sky: 'indoor', land: 'floor', yai: true, items: ['📔'] },
    { sky: 'indoor', land: 'floor', items: ['🖼️', '🪷'] },
    { sky: 'day', land: 'village', yai: 'girl', items: ['🍃', '🪷'] },
    { sky: 'night', land: 'river', wind: true, yai: 'girl', items: ['🪷'] },
    { sky: 'night', land: 'river', yai: true, items: ['🧒', '🪷', '✨'] },
  ],
  stm10: [
    { sky: 'day', land: 'hills', items: ['🐇', '🐢'] },
    { sky: 'day', land: 'road', items: ['🐇', '🏁', '🐢'] },
    { sky: 'day', land: 'hills', items: ['🌳', '💤', '🐢'] },
    { sky: 'day', land: 'road', items: ['🐢', '🏆', '🐇'] },
    { sky: 'dusk', land: 'hills', noi: 'feliz', items: ['🐢', '✨'] },
  ],
};

/** Portada de cada cuento en la estantería. */
export const COVERS: Record<string, { emoji: string; tint: string; deep: string }> = {
  st1: { emoji: '🐘', tint: '#7FB6E8', deep: '#3E6FA8' },
  st2: { emoji: '👵', tint: '#E8A06A', deep: '#A85A2E' },
  st3: { emoji: '📱', tint: '#8CC7A1', deep: '#3F8A5E' },
  st4: { emoji: '🦋', tint: '#C79BE8', deep: '#7A4FA8' },
  stm3: { emoji: '🐃', tint: '#A8C77A', deep: '#5E7F2E' },
  stm6: { emoji: '🕯️', tint: '#6E77C9', deep: '#363E86' },
  stm8: { emoji: '🪷', tint: '#F0A0B8', deep: '#B24F72' },
  stm10: { emoji: '🐢', tint: '#7ACBC0', deep: '#2E8A7F' },
};
export const coverOf = (id: string) => COVERS[id] ?? { emoji: '📖', tint: '#E8B86A', deep: '#9A5B32' };

/** Palabras concretas que se pueden dibujar (para cuentos sin guion). */
const DRAWABLE: Record<string, string> = {
  chang: '🐘', khwaai: '🐃', tao: '🐢', fon: '🌧️', mok: '🌫️', baan: '🏠', thanon: '🛣️', naa_field: '🌾', m8_krathong: '🪷', m4_thian: '🕯️',
  phii_ghost: '👻', fai: '💡', m6_faichaai: '🔦', tonmaai: '🌳', aahaan: '🍱', khao: '🍚', maew: '🐈', maa_dog: '🐕', dok_mai: '🌸', lom: '🌬️',
};

function autoScene(story: Story, page: number): SceneSpec {
  const ws = story.pages[page].lines.flat().map((t) => t.w ?? '');
  const has = (...ids: string[]) => ids.some((id) => ws.includes(id));
  const sky: Sky = has('khuennii', 'm6_faidap', 'm8_wanphen') ? 'night' : has('fon') ? 'rain' : has('chao') ? 'dawn' : 'day';
  const items = [...new Set(ws.map((w) => DRAWABLE[w]).filter(Boolean))].slice(0, 3);
  return { sky, land: has('naa_field') ? 'paddy' : has('maenaam') ? 'river' : 'hills', noi: has('chang') ? 'feliz' : undefined, yai: has('yaai'), items };
}

export const sceneOf = (story: Story, page: number): SceneSpec => SCRIPTS[story.id]?.[page] ?? autoScene(story, page);

// ——— Dibujo ———

const W = 340;
const H = 150;

const SKIES: Record<Sky, [string, string, string]> = {
  dawn: ['#8FB4E8', '#F6C6B8', '#FFE7C2'],
  day: ['#5FA8FF', '#A9D4FF', '#E6F4FF'],
  dusk: ['#5B4A9E', '#E88A7A', '#FFD08A'],
  night: ['#0B1236', '#1F2A6B', '#3B3478'],
  rain: ['#5B6B86', '#8797B0', '#B9C6D6'],
  indoor: ['#B5774A', '#9A5F38', '#7E4A2A'],
  dark: ['#3A2618', '#2A1A10', '#1C110A'],
};

function Yai({ girl, size }: { girl?: boolean; size: number }) {
  const id = useSvgId('yai');
  const hair = girl ? '#2B2230' : '#D9DCE6';
  return (
    <Svg width={size * 0.66} height={size} viewBox="0 0 60 90">
      <Defs>
        <LinearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={girl ? '#E2557A' : '#7A5CC0'} />
          <Stop offset="1" stopColor={girl ? '#B23A5C' : '#4E3A8A'} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={30} cy={87} rx={20} ry={3} fill="#000000" opacity={0.18} />
      {/* falda pha sin con franjas */}
      <Path d="M16 52 L44 52 L48 85 L12 85 Z" fill={`url(#${id}s)`} />
      <Path d="M14 70 L46 70 M13 77 L47 77" stroke="#FFD36A" strokeWidth={2} opacity={0.85} />
      {/* blusa */}
      <Path d="M14 54 Q14 36 30 36 Q46 36 46 54 Z" fill={girl ? '#FFF4D6' : '#F4EEE2'} />
      <Path d="M22 40 Q30 46 38 40" stroke="#E0C9A6" strokeWidth={1.5} fill="none" />
      {/* brazos */}
      <Path d="M15 45 Q8 54 14 60" stroke="#F2C9A5" strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M45 45 Q52 54 46 60" stroke="#F2C9A5" strokeWidth={5} strokeLinecap="round" fill="none" />
      {/* cabeza */}
      {girl ? <Path d="M14 22 Q14 4 30 4 Q46 4 46 22 L46 34 L14 34 Z" fill={hair} /> : <Circle cx={30} cy={7} r={7} fill={hair} />}
      <Circle cx={30} cy={22} r={13} fill="#F5CFAE" />
      {girl ? <Path d="M17 18 Q30 6 43 18 L43 12 Q30 2 17 12 Z" fill={hair} /> : <Path d="M17 20 Q18 8 30 8 Q42 8 43 20 Q38 13 30 13 Q22 13 17 20 Z" fill={hair} />}
      {!girl ? (
        <G stroke="#5B4636" strokeWidth={1.4} fill="none">
          <Circle cx={25} cy={22} r={3.6} />
          <Circle cx={35} cy={22} r={3.6} />
          <Path d="M28.6 22 L31.4 22" />
        </G>
      ) : (
        <G fill="#3A2A20">
          <Circle cx={25} cy={22} r={1.6} />
          <Circle cx={35} cy={22} r={1.6} />
        </G>
      )}
      <Circle cx={21.5} cy={27} r={2.4} fill="#FF9AA8" opacity={0.6} />
      <Circle cx={38.5} cy={27} r={2.4} fill="#FF9AA8" opacity={0.6} />
      <Path d="M26 29 Q30 32.5 34 29" stroke="#8A4A3A" strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Circle cx={girl ? 41 : 36} cy={girl ? 9 : 4} r={2.6} fill="#FFFFFF" />
      <Circle cx={girl ? 41 : 36} cy={girl ? 9 : 4} r={1.2} fill="#FFC83D" />
    </Svg>
  );
}

function Backdrop({ sky, land, fog, wind }: SceneSpec) {
  const id = useSvgId('scn');
  const [a, b, c] = SKIES[sky];
  const inside = sky === 'indoor' || sky === 'dark';
  const night = sky === 'night' || sky === 'dark';
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={a} />
          <Stop offset="0.6" stopColor={b} />
          <Stop offset="1" stopColor={c} />
        </LinearGradient>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={night ? '#2E4A5E' : '#8FD07A'} />
          <Stop offset="1" stopColor={night ? '#1A2A38' : '#4E9F55'} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill={`url(#${id}s)`} />
      {inside ? (
        <>
          {/* pared de teca y ventana */}
          {Array.from({ length: 8 }, (_, i) => (
            <Rect key={i} x={i * 44 + 18} y={0} width={2} height={H} fill="#5E3519" opacity={0.3} />
          ))}
          <Rect x={226} y={18} width={84} height={64} rx={4} fill="#5A331C" />
          <Rect x={231} y={23} width={74} height={54} rx={2} fill={sky === 'dark' ? '#0E1330' : '#1B2452'} />
          <Circle cx={286} cy={38} r={8} fill="#FFF2CF" opacity={sky === 'dark' ? 0.5 : 1} />
          <Rect x={266} y={23} width={4} height={54} fill="#5A331C" />
          <Path d="M40 0 V26" stroke="#3E2414" strokeWidth={1.5} />
          <Path d="M26 26 H54 L48 40 H32 Z" fill={sky === 'dark' ? '#6A4A22' : '#E9B055'} />
          {sky !== 'dark' ? <Ellipse cx={40} cy={44} rx={30} ry={14} fill="#FFE7A6" opacity={0.35} /> : null}
          <Path d={`M0 118 Q170 108 ${W} 118 V${H} H0 Z`} fill={sky === 'dark' ? '#3A2414' : '#D7B176'} />
          {[124, 133, 142].map((y) => (
            <Path key={y} d={`M0 ${y} Q170 ${y - 8} ${W} ${y}`} stroke={sky === 'dark' ? '#2A1A0E' : '#B98F55'} strokeWidth={1.5} strokeOpacity={0.6} fill="none" />
          ))}
          {sky === 'dark' ? <Rect x={0} y={0} width={W} height={H} fill="#000000" opacity={0.25} /> : null}
        </>
      ) : (
        <>
          {sky === 'night' ? (
            <>
              {[
                [30, 20],
                [80, 40],
                [130, 14],
                [170, 34],
                [210, 18],
                [250, 46],
                [300, 26],
                [60, 60],
              ].map(([x, y], i) => (
                <Circle key={i} cx={x} cy={y} r={1.4} fill="#FFFFFF" opacity={0.85} />
              ))}
              <Circle cx={280} cy={34} r={18} fill="#FFF4D8" />
              <Circle cx={280} cy={34} r={28} fill="#FFF4D8" opacity={0.18} />
            </>
          ) : sky === 'rain' ? (
            <>
              <Path d="M-10 40 Q30 10 80 28 Q120 0 180 22 Q230 4 280 24 Q330 10 350 34 V0 H-10 Z" fill="#46546E" />
              {Array.from({ length: 22 }, (_, i) => (
                <Path key={i} d={`M${(i * 17) % W} ${20 + ((i * 37) % 90)} l-4 10`} stroke="#E2ECF6" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
              ))}
            </>
          ) : (
            <>
              <Circle cx={sky === 'dawn' ? 270 : sky === 'dusk' ? 64 : 286} cy={sky === 'dawn' ? 84 : sky === 'dusk' ? 78 : 30} r={sky === 'day' ? 16 : 20} fill={sky === 'dusk' ? '#FFD08A' : '#FFF4C8'} />
              <Circle cx={sky === 'dawn' ? 270 : sky === 'dusk' ? 64 : 286} cy={sky === 'dawn' ? 84 : sky === 'dusk' ? 78 : 30} r={34} fill="#FFF4C8" opacity={0.25} />
              <G opacity={0.95}>
                <Ellipse cx={70} cy={30} rx={26} ry={9} fill="#FFFFFF" />
                <Circle cx={60} cy={25} r={10} fill="#FFFFFF" />
                <Circle cx={76} cy={22} r={12} fill="#FFFFFF" />
              </G>
            </>
          )}
          {/* montañas del norte */}
          <Path d="M0 92 Q40 58 84 80 T170 66 T250 82 T340 64 V150 H0 Z" fill={night ? '#22305E' : sky === 'rain' ? '#7487A2' : '#A9BEDA'} />
          <Path d="M0 108 Q60 80 120 100 T240 92 T340 104 V150 H0 Z" fill={night ? '#1B2650' : sky === 'rain' ? '#5F7A6E' : '#88B79A'} />
          {land === 'paddy' ? (
            <>
              <Path d="M0 116 Q170 104 340 116 V150 H0 Z" fill={night ? '#22402E' : '#9ED36A'} />
              {[122, 131, 140].map((y) => (
                <Path key={y} d={`M0 ${y} Q170 ${y - 9} 340 ${y}`} stroke="#F4FFE8" strokeWidth={1.6} strokeOpacity={0.6} fill="none" />
              ))}
            </>
          ) : land === 'river' ? (
            <>
              <Path d="M0 118 Q170 108 340 118 V150 H0 Z" fill={`url(#${id}g)`} />
              <Path d="M0 128 Q90 120 170 130 T340 126 V150 H0 Z" fill={night ? '#2A3F7A' : '#5FA8E8'} />
              <Path d="M30 138 h22 M120 134 h30 M230 140 h26" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.5} strokeLinecap="round" />
            </>
          ) : (
            <>
              <Path d="M0 118 Q170 104 340 118 V150 H0 Z" fill={`url(#${id}g)`} />
              {land === 'road' ? <Path d="M150 150 Q170 132 210 124 Q250 116 300 118" stroke="#D9B98A" strokeWidth={12} fill="none" strokeLinecap="round" /> : null}
              {land === 'village' ? (
                <>
                  {[
                    [36, 104],
                    [250, 100],
                    [300, 108],
                  ].map(([x, y], i) => (
                    <G key={i} transform={`translate(${x} ${y})`}>
                      <Path d="M-16 0 L0 -14 L16 0 Z" fill={night ? '#3A2A40' : '#8A4F2B'} />
                      <Rect x={-12} y={0} width={24} height={14} fill={night ? '#2A2030' : '#B9784A'} />
                      <Rect x={-4} y={4} width={8} height={10} fill={night ? '#FFC86A' : '#5E3519'} opacity={night ? 0.6 : 1} />
                    </G>
                  ))}
                </>
              ) : null}
            </>
          )}
          {fog ? (
            <>
              <Rect x={-20} y={60} width={380} height={26} rx={13} fill="#FFFFFF" opacity={0.55} />
              <Rect x={20} y={88} width={300} height={20} rx={10} fill="#FFFFFF" opacity={0.5} />
              <Rect x={-30} y={34} width={260} height={18} rx={9} fill="#FFFFFF" opacity={0.4} />
            </>
          ) : null}
          {wind ? <Path d="M40 50 q20 -10 40 0 t40 0 M180 40 q16 -8 32 0 t30 -2 M90 70 q14 -6 28 0" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.8} /> : null}
        </>
      )}
    </Svg>
  );
}

/** Viñeta de una página: fondo, personajes y objetos. */
export function Illustration({ spec, height = 150 }: { spec: SceneSpec; height?: number }) {
  const items = spec.items ?? [];
  const hasNoi = !!spec.noi;
  const hasYai = !!spec.yai;
  const slots = items.map((_, k) => {
    // reparte los objetos por el hueco libre
    const from = hasNoi ? 0.36 : 0.08;
    const to = hasYai ? 0.66 : 0.92;
    return from + ((to - from) * (k + 0.5)) / items.length;
  });
  return (
    <View style={[styles.box, { height }]}>
      <Backdrop {...spec} />
      {items.map((e, k) => (
        <Text key={`${e}${k}`} style={[styles.item, { left: `${slots[k] * 100}%`, bottom: height * (0.13 + (k % 2) * 0.1), fontSize: height * 0.2 }]}>
          {e}
        </Text>
      ))}
      {hasNoi ? (
        <View style={[styles.char, { left: '2%', bottom: -height * 0.06 }]}>
          <Noi pose={spec.noi} size={height * 0.72} />
        </View>
      ) : null}
      {hasYai ? (
        <View style={[styles.char, { right: '6%', bottom: height * 0.04 }]}>
          <Yai girl={spec.yai === 'girl'} size={height * (spec.yai === 'girl' ? 0.5 : 0.62)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden', borderRadius: 16 },
  item: { position: 'absolute', marginLeft: -18, textAlign: 'center', textShadowColor: 'rgba(255,255,255,0.95)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
  char: { position: 'absolute' },
});
