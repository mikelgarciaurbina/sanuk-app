// La familia alrededor de la mesa: Yai (moño gris, gafas y flor), Mae (moño negro y flor de frangipani),
// Pho (camisa mo hom y pañuelo pha khao ma), Nong (coleta con lazo) y Lung (calvo, toalla al hombro).
// Cada uno respira, parpadea, mueve la boca al hablar y cambia de cara: contento, enamorado o con dudas.
import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import type { DialogueLine } from '@/content/types';

export type Who = DialogueLine['who'];
export type Face = 'idle' | 'happy' | 'love' | 'confused';

const VB_W = 120;
const VB_H = 132;
const INK = '#2B1B14';

type Look = { skin: [string, string]; ear: string; shirt: [string, string]; r: number };
const LOOK: Record<Exclude<Who, 'Noi'>, Look> = {
  Yai: { skin: ['#FBD8B8', '#DDA27A'], ear: '#E2A880', shirt: ['#B04468', '#6E2240'], r: 30 },
  Mae: { skin: ['#FFDDC0', '#E9AD84'], ear: '#EDB18A', shirt: ['#2FB0AE', '#146E6E'], r: 30 },
  Pho: { skin: ['#F1C49C', '#C98D60'], ear: '#D49A6C', shirt: ['#4659C4', '#1E2A66'], r: 30 },
  Nong: { skin: ['#FFE3C8', '#EDB892'], ear: '#F0BC96', shirt: ['#FFD95E', '#F0A51C'], r: 29 },
  Lung: { skin: ['#EDBB8E', '#C08254'], ear: '#C98C5E', shirt: ['#5DBB75', '#2E7A45'], r: 31 },
};

/** Rombos rojos y blancos del pañuelo pha khao ma. */
function Checks({ x, y, w, h, a, b }: { x: number; y: number; w: number; h: number; a: string; b: string }) {
  const cells: ReactNode[] = [];
  const s = 4;
  for (let i = 0; i < w / s; i++) for (let j = 0; j < h / s; j++) if ((i + j) % 2 === 0) cells.push(<Rect key={`${i}-${j}`} x={x + i * s} y={y + j * s} width={s} height={s} fill={b} />);
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} fill={a} />
      {cells}
    </G>
  );
}

function Hair({ who }: { who: Exclude<Who, 'Noi'> }) {
  switch (who) {
    case 'Yai':
      return (
        <>
          <Circle cx={60} cy={23} r={12} fill="#CDD2DB" />
          <Path d="M53 18 C57 14 64 14 67 17" stroke="#FFFFFF" strokeWidth={2} fill="none" opacity={0.7} />
          <Path d="M30 57 C29 35 44 25 60 25 C76 25 91 35 90 57 C86 45 76 39 60 39 C44 39 34 45 30 57 Z" fill="#DCE0E7" />
          <Path d="M40 34 C48 30 54 32 58 38 M62 38 C66 32 74 30 82 35" stroke="#A9AFBC" strokeWidth={1.4} fill="none" />
          {[0, 72, 144, 216, 288].map((a) => (
            <Ellipse key={a} cx={74} cy={17} rx={2.6} ry={4.4} fill="#FF8A3D" transform={`rotate(${a} 74 21)`} />
          ))}
          <Circle cx={74} cy={21} r={2} fill="#FFD166" />
        </>
      );
    case 'Mae':
      return (
        <>
          <Circle cx={60} cy={24} r={13} fill="#241510" />
          <Path d="M50 18 L70 26" stroke="#FFC83D" strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M30 59 C28 33 44 23 60 23 C78 23 93 35 90 60 C86 47 77 41 65 41 C57 41 49 46 43 40 C38 46 33 52 30 59 Z" fill={INK} />
          <Path d="M45 30 C50 27 56 26 62 27" stroke="#5A4034" strokeWidth={2} fill="none" strokeLinecap="round" />
          {[0, 72, 144, 216, 288].map((a) => (
            <Ellipse key={a} cx={86} cy={33} rx={3.2} ry={5.4} fill="#FFFFFF" transform={`rotate(${a} 86 38)`} />
          ))}
          <Circle cx={86} cy={38} r={2.6} fill="#FFD166" />
        </>
      );
    case 'Pho':
      return (
        <>
          <Path d="M31 53 C30 34 44 26 60 26 C76 26 90 34 89 53 C84 44 74 40 60 41 C46 40 36 44 31 53 Z" fill={INK} />
          <Path d="M42 31 L46 23 L50 30 L55 21 L59 29 L64 21 L68 29 L73 23 L77 31" fill={INK} />
          <Path d="M49 70 C53 66.5 57 67 60 69 C63 67 67 66.5 71 70 C67 72.5 63 72 60 71 C57 72 53 72.5 49 70 Z" fill={INK} />
        </>
      );
    case 'Nong':
      return (
        <>
          <Path d="M85 34 C101 27 110 44 105 62 C103 71 97 78 92 82 C96 70 96 57 89 48 Z" fill={INK} />
          <Circle cx={87} cy={36} r={5.5} fill="#E8473F" />
          <Circle cx={85.5} cy={34.5} r={1.8} fill="#FF9A92" />
          <Path d="M30 61 C28 35 44 25 60 25 C78 25 92 37 90 61 L86 53 C84 47 80 45 76 47 L74 41 C70 47 62 45 58 41 C54 47 46 47 42 43 C38 49 34 55 30 61 Z" fill={INK} />
          <Path d="M44 31 C50 28 57 28 62 29" stroke="#5A4034" strokeWidth={2} fill="none" strokeLinecap="round" />
        </>
      );
    case 'Lung':
      return (
        <>
          <Path d="M29 62 C28 52 30 45 35 40 L38 56 Z M91 62 C92 52 90 45 85 40 L82 56 Z" fill="#3B302A" />
          <Path d="M50 30 C54 27 60 27 64 29 M55 28 C58 25 62 25 66 27" stroke="#3B302A" strokeWidth={1.4} fill="none" strokeLinecap="round" />
          <Path d="M42 36 C48 31 56 30 62 31" stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.35} />
          {[
            [48, 80],
            [53, 83],
            [60, 84],
            [67, 83],
            [72, 80],
            [45, 75],
            [75, 75],
          ].map(([x, y]) => (
            <Circle key={`${x}${y}`} cx={x} cy={y} r={0.9} fill="#6E4A33" opacity={0.45} />
          ))}
        </>
      );
  }
}

function Clothes({ who, u }: { who: Exclude<Who, 'Noi'>; u: string }) {
  const body = 'M8 132 C10 106 30 94 60 94 C90 94 110 106 112 132 Z';
  return (
    <>
      <Path d={body} fill={`url(#${u}sh)`} />
      {who === 'Yai' ? <Path d="M44 96 C47 101 51 101 52 97 C54 102 58 102 60 98 C62 102 66 102 68 97 C69 101 73 101 76 96" stroke="#FFF4E8" strokeWidth={3} fill="none" strokeLinecap="round" /> : null}
      {who === 'Mae' ? (
        <>
          <Path d="M50 95 C53 99 67 99 70 95" stroke="#0E5454" strokeWidth={3} fill="none" />
          <Circle cx={60} cy={108} r={2.2} fill="#FFC83D" />
          <Circle cx={60} cy={120} r={2.2} fill="#FFC83D" />
        </>
      ) : null}
      {who === 'Pho' ? (
        <G>
          <Path d="M36 98 C46 106 74 106 84 98 L86 106 C74 114 46 114 34 106 Z" fill="#E8473F" />
          <Path d="M38 100 L42 108 M46 103 L48 111 M54 104 L55 112 M62 104 L62 112 M70 103 L69 111 M78 101 L76 109" stroke="#FFFFFF" strokeWidth={1.6} />
          <Path d="M36 104 C48 110 72 110 84 104" stroke="#FFFFFF" strokeWidth={1.2} fill="none" />
        </G>
      ) : null}
      {who === 'Nong' ? (
        <>
          <Path d="M50 95 C53 101 67 101 70 95" stroke="#E79A10" strokeWidth={3} fill="none" />
          <Path d="M60 122 C56 118 52 116 53 113 C54 110 58 111 60 113 C62 111 66 110 67 113 C68 116 64 118 60 122 Z" fill="#FF5D8F" />
        </>
      ) : null}
      {who === 'Lung' ? (
        <>
          <Rect x={70} y={108} width={14} height={11} rx={2} fill="#2E7A45" opacity={0.55} />
          <G transform="rotate(-24 30 108)">
            <Checks x={18} y={96} w={24} h={36} a="#3D6FD8" b="#FFFFFF" />
          </G>
        </>
      ) : null}
    </>
  );
}

function Head({ who, u }: { who: Exclude<Who, 'Noi'>; u: string }) {
  const c = LOOK[who];
  return (
    <>
      <Defs>
        <RadialGradient id={`${u}sk`} cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor={c.skin[0]} />
          <Stop offset="1" stopColor={c.skin[1]} />
        </RadialGradient>
        <LinearGradient id={`${u}sh`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.shirt[0]} />
          <Stop offset="1" stopColor={c.shirt[1]} />
        </LinearGradient>
      </Defs>
      <Path d="M51 80 H69 V98 C65 102 55 102 51 98 Z" fill={c.ear} />
      <Clothes who={who} u={u} />
      <Ellipse cx={30} cy={60} rx={6} ry={8} fill={c.ear} />
      <Ellipse cx={90} cy={60} rx={6} ry={8} fill={c.ear} />
      {who === 'Yai' || who === 'Mae' ? (
        <>
          <Circle cx={29} cy={70} r={2.4} fill="#FFC83D" />
          <Circle cx={91} cy={70} r={2.4} fill="#FFC83D" />
        </>
      ) : null}
      <Circle cx={60} cy={57} r={c.r} fill={`url(#${u}sk)`} />
      <Ellipse cx={43} cy={67} rx={6} ry={3.8} fill="#FF7F95" opacity={0.45} />
      <Ellipse cx={77} cy={67} rx={6} ry={3.8} fill="#FF7F95" opacity={0.45} />
      <Path d="M57.5 64 Q60 66.5 62.5 64" stroke="#B9774E" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      {who === 'Yai' ? <Path d="M38 66 C39 70 41 72 44 73 M82 66 C81 70 79 72 76 73" stroke="#C98A63" strokeWidth={1.2} fill="none" /> : null}
      <Hair who={who} />
    </>
  );
}

function Brows({ who, face }: { who: Exclude<Who, 'Noi'>; face: Face }) {
  const w = who === 'Pho' || who === 'Lung' ? 3.4 : 2.4;
  const col = who === 'Yai' ? '#9AA0AD' : INK;
  if (face === 'confused')
    return (
      <>
        <Path d="M42 47 Q49 43 55 46" stroke={col} strokeWidth={w} fill="none" strokeLinecap="round" />
        <Path d="M65 50 Q72 49 78 51" stroke={col} strokeWidth={w} fill="none" strokeLinecap="round" />
      </>
    );
  return (
    <>
      <Path d="M42 49 Q49 45 55 48" stroke={col} strokeWidth={w} fill="none" strokeLinecap="round" />
      <Path d="M65 48 Q71 45 78 49" stroke={col} strokeWidth={w} fill="none" strokeLinecap="round" />
    </>
  );
}

const heart = (cx: number, cy: number) => `M${cx} ${cy + 6} C${cx - 5} ${cy + 2} ${cx - 6.5} ${cy - 1} ${cx - 5} ${cy - 3.4} C${cx - 3.5} ${cy - 5.6} ${cx - 0.8} ${cy - 5} ${cx} ${cy - 2.6} C${cx + 0.8} ${cy - 5} ${cx + 3.5} ${cy - 5.6} ${cx + 5} ${cy - 3.4} C${cx + 6.5} ${cy - 1} ${cx + 5} ${cy + 2} ${cx} ${cy + 6} Z`;

function Eyes({ face }: { face: Face }) {
  if (face === 'happy')
    return (
      <>
        <Path d="M44 59 Q49 53 54 59" stroke={INK} strokeWidth={2.8} fill="none" strokeLinecap="round" />
        <Path d="M66 59 Q71 53 76 59" stroke={INK} strokeWidth={2.8} fill="none" strokeLinecap="round" />
      </>
    );
  if (face === 'love')
    return (
      <>
        <Path d={heart(49, 57)} fill="#E8365E" />
        <Path d={heart(71, 57)} fill="#E8365E" />
      </>
    );
  return (
    <>
      <Ellipse cx={49} cy={57} rx={3.9} ry={face === 'confused' ? 3.6 : 4.8} fill={INK} />
      <Ellipse cx={71} cy={57} rx={3.9} ry={4.8} fill={INK} />
      <Circle cx={50.4} cy={55.2} r={1.4} fill="#FFFFFF" />
      <Circle cx={72.4} cy={55.2} r={1.4} fill="#FFFFFF" />
    </>
  );
}

function Mouth({ face, open, low }: { face: Face; open: boolean; low: boolean }) {
  const y = low ? 3 : 0;
  if (open)
    return (
      <>
        <Ellipse cx={60} cy={75 + y} rx={5.8} ry={5} fill="#7E2626" />
        <Ellipse cx={60} cy={77.5 + y} rx={3.6} ry={2} fill="#FF7A8A" />
      </>
    );
  if (face === 'happy' || face === 'love')
    return (
      <>
        <Path d={`M51 ${72 + y} Q60 ${86 + y} 69 ${72 + y} Q60 ${75 + y} 51 ${72 + y} Z`} fill="#7E2626" />
        <Path d={`M55 ${78 + y} Q60 ${82 + y} 65 ${78 + y} Q60 ${76.5 + y} 55 ${78 + y} Z`} fill="#FF7A8A" />
      </>
    );
  if (face === 'confused') return <Path d={`M53 ${76 + y} Q56.5 ${73 + y} 60 ${76 + y} Q63.5 ${79 + y} 67 ${76 + y}`} stroke="#8A3B2A" strokeWidth={2.4} fill="none" strokeLinecap="round" />;
  return <Path d={`M52 ${73 + y} Q60 ${80 + y} 68 ${73 + y}`} stroke="#8A3B2A" strokeWidth={2.6} fill="none" strokeLinecap="round" />;
}

function Glasses() {
  return (
    <G>
      <Circle cx={49} cy={57} r={8.5} fill="#FFFFFF" fillOpacity={0.14} stroke="#7A5230" strokeWidth={2} />
      <Circle cx={71} cy={57} r={8.5} fill="#FFFFFF" fillOpacity={0.14} stroke="#7A5230" strokeWidth={2} />
      <Path d="M57.5 56 Q60 54 62.5 56" stroke="#7A5230" strokeWidth={2} fill="none" />
      <Path d="M44 52 L47 50" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
    </G>
  );
}

const NOI_POSE: Record<Face, 'feliz' | 'celebra' | 'ups'> = { idle: 'feliz', happy: 'celebra', love: 'celebra', confused: 'ups' };

/**
 * Un miembro de la familia sentado a la mesa. `active` lo adelanta (es quien habla), `talking` mueve la boca,
 * `thinking` le pone una nube de puntos encima y `jump` le hace dar un saltito.
 */
export function Person({ who, size, face, talking, active, thinking, jump }: { who: Who; size: number; face: Face; talking: boolean; active: boolean; thinking: boolean; jump: number }) {
  const u = `p${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const reduced = useReducedMotion();
  const k = size / VB_W;
  const h = VB_H * k;
  const breathe = useSharedValue(0);
  const blink = useSharedValue(1);
  const talk = useSharedValue(1);
  const lean = useSharedValue(active ? 1 : 0);
  const hop = useSharedValue(0);
  const q = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    breathe.value = withDelay(Math.random() * 900, withRepeat(withTiming(1, { duration: 2300, easing: Easing.inOut(Easing.sin) }), -1, true));
    blink.value = withRepeat(withSequence(withDelay(2200 + Math.random() * 2400, withTiming(0.08, { duration: 80 })), withTiming(1, { duration: 120 })), -1, false);
  }, [reduced, breathe, blink]);
  useEffect(() => {
    if (talking && !reduced) talk.value = withRepeat(withSequence(withTiming(0.25, { duration: 100 }), withTiming(1, { duration: 120 })), -1, false);
    else talk.value = withTiming(1, { duration: 80 });
  }, [talking, reduced, talk]);
  useEffect(() => {
    lean.value = withSpring(active ? 1 : 0, { damping: 12, stiffness: 150 });
  }, [active, lean]);
  useEffect(() => {
    if (!jump) return;
    hop.value = withSequence(withTiming(-16 * k, { duration: 150, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 8, stiffness: 200 }));
  }, [jump, hop, k]);
  useEffect(() => {
    q.value = face === 'confused' ? withSpring(1, { damping: 7 }) : withTiming(0, { duration: 150 });
  }, [face, q]);

  const sWrap = useAnimatedStyle(() => ({
    transform: [{ translateY: hop.value - lean.value * 8 * k }, { scale: 1 + lean.value * 0.08 }, { scaleY: 1 + breathe.value * 0.014 }],
  }));
  const sEyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const sMouth = useAnimatedStyle(() => ({ transform: [{ scaleY: talk.value }] }));
  const sQ = useAnimatedStyle(() => ({ opacity: q.value, transform: [{ scale: q.value }, { rotate: `${(1 - q.value) * -40 + 12}deg` }] }));

  const svg = (children: ReactNode) => (
    <Svg width={size} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {children}
    </Svg>
  );

  return (
    <Animated.View style={[{ width: size, height: h, transformOrigin: `${size / 2}px ${h}px` }, sWrap]}>
      {who === 'Noi' ? (
        <View style={{ position: 'absolute', left: -size * 0.12, top: -size * 0.1 }}>
          <Noi pose={talking ? 'hola' : NOI_POSE[face]} size={size * 1.24} />
        </View>
      ) : (
        <>
          <View style={StyleSheet.absoluteFill}>{svg(<Head who={who} u={u} />)}</View>
          <View style={StyleSheet.absoluteFill}>{svg(<Brows who={who} face={face} />)}</View>
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `${60 * k}px ${57 * k}px` }, face === 'idle' || face === 'confused' ? sEyes : null]}>{svg(<Eyes face={face} />)}</Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `${60 * k}px ${75 * k}px` }, talking ? sMouth : null]}>{svg(<Mouth face={face} open={talking} low={who === 'Pho'} />)}</Animated.View>
          {who === 'Yai' ? <View style={StyleSheet.absoluteFill}>{svg(<Glasses />)}</View> : null}
        </>
      )}
      <Animated.View pointerEvents="none" style={[styles.q, { right: -size * 0.02, top: size * 0.02, width: size * 0.3, height: size * 0.3, borderRadius: size }, sQ]}>
        <Text style={[styles.qText, { fontSize: size * 0.22 }]}>?</Text>
      </Animated.View>
      {thinking ? <Thinking size={size} /> : null}
    </Animated.View>
  );
}

function ThinkDot({ delay, size }: { delay: number; size: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(0, { duration: 300 })), -1, false));
  }, [t, delay]);
  const st = useAnimatedStyle(() => ({ opacity: 0.35 + t.value * 0.65, transform: [{ translateY: -t.value * 3 }] }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size, backgroundColor: '#8E98B1' }, st]} />;
}

/** Nube con tres puntos: está pensando qué decir. */
function Thinking({ size }: { size: number }) {
  const d = Math.max(6, size * 0.065);
  return (
    <View pointerEvents="none" style={[styles.think, { top: -size * 0.12, left: size * 0.5 - d * 3.3 }]}>
      <ThinkDot delay={0} size={d} />
      <ThinkDot delay={150} size={d} />
      <ThinkDot delay={300} size={d} />
    </View>
  );
}

const styles = StyleSheet.create({
  q: { position: 'absolute', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  qText: { fontFamily: font.displayBold, color: '#D93A3F' },
  think: { position: 'absolute', flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
});
