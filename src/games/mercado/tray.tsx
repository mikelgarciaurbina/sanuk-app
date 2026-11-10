// La bandeja donde pagas: cada billete o moneda vuela desde la cartera en arco (las monedas giran),
// rebota al caer y se apila con las de su valor («×3»). Al pagar, todo vuela hacia la vendedora.
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { font, motion } from '@/brand/tokens';

import { Pop, type Point } from '../fx';
import { Money, pieceSize } from './money';

export type TrayItem = { id: number; v: number; from: Point | null; delay?: number };
export type Slot = { x: number; y: number; r: number };
export type Area = { x: number; y: number; w: number; h: number };

export type Badge = { key: string; x: number; y: number; n: number };

const OFF = 3;

/** Coloca las piezas en montoncitos por valor (billetes arriba, monedas abajo) para contarlas de un vistazo;
 *  cada montón de más de una pieza lleva su «×n». */
export function arrange(items: TrayItem[], area: Area, noteW: number, coinK: number): { slots: Record<number, Slot>; badges: Badge[] } {
  const slots: Record<number, Slot> = {};
  const badges: Badge[] = [];
  const groups = new Map<number, TrayItem[]>();
  for (const it of items) groups.set(it.v, [...(groups.get(it.v) ?? []), it]);
  const notes = [...groups.keys()].filter((v) => v >= 20).sort((a, b) => b - a);
  const coins = [...groups.keys()].filter((v) => v < 20).sort((a, b) => b - a);
  const nh = noteW / 2;
  const ch = noteW * coinK * 1.08;
  const rowsH = (notes.length ? nh : 0) + (coins.length ? ch : 0);
  const gapY = notes.length && coins.length ? Math.max(0, (area.h - rowsH) / 3) : 0;
  let y = notes.length && coins.length ? area.y + gapY : area.y + (area.h - rowsH) / 2;
  const row = (vals: number[], rowH: number) => {
    const widths = vals.map((v) => pieceSize(v, noteW, coinK).w + OFF * Math.min(4, groups.get(v)!.length - 1));
    const total = widths.reduce((a, b) => a + b, 0);
    const gap = vals.length > 1 ? Math.max(-12, Math.min(14, (area.w - total) / (vals.length - 1))) : 0;
    let x = area.x + Math.max(0, (area.w - total - gap * (vals.length - 1)) / 2);
    vals.forEach((v, gi) => {
      const list = groups.get(v)!;
      const { w, h } = pieceSize(v, noteW, coinK);
      const top = y + (rowH - h) / 2;
      list.forEach((it, k) => {
        const kk = Math.min(k, 4);
        slots[it.id] = { x: x + kk * OFF, y: top - kk * OFF, r: ((it.id * 37) % 7) - 3 };
      });
      const kk = Math.min(4, list.length - 1);
      if (list.length > 1) badges.push({ key: `${v}`, x: x + w + kk * OFF - 14, y: top - kk * OFF - 9, n: list.length });
      x += widths[gi] + gap;
    });
  };
  if (notes.length) {
    row(notes, nh);
    y += nh + gapY;
  }
  if (coins.length) row(coins, ch);
  return { slots, badges };
}

/** Un solo montón ladeado (el dinero con el que has pagado, en las rondas de cambio). */
export function pile(items: TrayItem[], area: Area, noteW: number, coinK: number): Record<number, Slot> {
  const slots: Record<number, Slot> = {};
  items.forEach((it, k) => {
    const { h } = pieceSize(it.v, noteW, coinK);
    slots[it.id] = { x: area.x + k * 7, y: area.y + (area.h - h) / 2 - k * 6, r: -6 + k * 5 };
  });
  return slots;
}

/** «×3» sobre un montón. */
export function StackBadge({ b }: { b: Badge }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: b.x, top: b.y, zIndex: 40 }}>
      <Pop trigger={b.n} scale={1.4}>
        <View style={{ minWidth: 26, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: '#1D2347', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: font.uiBlack, fontSize: 12, color: '#FFFFFF' }}>×{b.n}</Text>
        </View>
      </Pop>
    </View>
  );
}

/** Una pieza de la bandeja: vuela desde `from`, cae con rebote y, si `leaving`, se va hacia `leaveTo`. */
export function TrayPiece({ item, slot, noteW, coinK, onPress, leaving, leaveTo, order = 0, label }: { item: TrayItem; slot: Slot; noteW: number; coinK: number; onPress?: () => void; leaving?: boolean; leaveTo?: Point; order?: number; label?: string }) {
  const { w, h } = pieceSize(item.v, noteW, coinK);
  const coin = item.v < 20;
  const p = useSharedValue(item.from ? 0 : 1);
  const land = useSharedValue(1);
  const sx = useSharedValue(slot.x);
  const sy = useSharedValue(slot.y);
  const sr = useSharedValue(slot.r);
  const go = useSharedValue(0);
  const fx0 = item.from ? item.from.x - w / 2 : slot.x;
  const fy0 = item.from ? item.from.y - h / 2 : slot.y;
  const dist = Math.hypot(slot.x - fx0, slot.y - fy0);
  const arc = Math.min(90, 20 + dist * 0.35);
  const dur = Math.min(520, 260 + dist * 0.9);
  const lx = leaveTo ? leaveTo.x - w / 2 : slot.x;
  const ly = leaveTo ? leaveTo.y - h / 2 : slot.y - 200;

  useEffect(() => {
    const d = item.delay ?? 0;
    p.value = withDelay(d, withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) }));
    land.value = withDelay(d + dur - 30, withSequence(withTiming(coin ? 1.2 : 1.1, { duration: 70 }), withSpring(1, { damping: 6, stiffness: 260 })));
  }, [p, land, item.delay, dur, coin]);

  useEffect(() => {
    sx.value = withSpring(slot.x, motion.suave);
    sy.value = withSpring(slot.y, motion.suave);
    sr.value = withSpring(slot.r, motion.suave);
  }, [slot.x, slot.y, slot.r, sx, sy, sr]);

  useEffect(() => {
    if (leaving) go.value = withDelay(order * 45, withTiming(1, { duration: 480, easing: Easing.in(Easing.cubic) }));
  }, [leaving, go, order]);

  const st = useAnimatedStyle(() => {
    const t = p.value;
    const g = go.value;
    const bx = fx0 + (sx.value - fx0) * t;
    const by = fy0 + (sy.value - fy0) * t - Math.sin(t * Math.PI) * arc;
    const x = bx + (lx - bx) * g;
    const y = by + (ly - by) * g - Math.sin(g * Math.PI) * 40;
    const spin = coin && t < 1 ? 0.25 + 0.75 * Math.abs(Math.cos(t * Math.PI * 3)) : 1;
    return {
      opacity: (t > 0 || !item.from ? 1 : 0) * (1 - g * g),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${sr.value + (1 - t) * (coin ? 0 : -50) + g * 30}deg` },
        { scaleX: spin },
        { scale: land.value * (1 + 0.28 * Math.sin(t * Math.PI)) * (1 - g * 0.5) },
      ],
    };
  });
  return (
    <Animated.View exiting={FadeOut.duration(140)} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
      <Animated.View style={[{ width: w, height: h }, st]}>
        <Pressable disabled={!onPress} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}>
          <Money v={item.v} noteW={noteW} coinK={coinK} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
