import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import { Art, Icon } from '@/components/icons';
import { Th, Txt } from '@/components/ui';
import { currentLesson } from '@/content';
import { Backdrop } from '@/games/Backdrop';
import { Floaty, Press3D, Shine } from '@/games/fx';
import { GAMES } from '@/games/registry';
import type { GameCategory, GameMeta } from '@/games/types';
import { fx } from '@/lib/audio';
import { todayKey } from '@/lib/random';
import { useStore } from '@/lib/store';

const CATS: ('Todos' | GameCategory)[] = ['Todos', 'Palabras', 'Oído y tonos', 'Frases', 'Vida real', 'Letras'];

/** Juego del día: cambia cada día y da ×2 plátanos. */
export function gameOfTheDay(): GameMeta {
  const k = todayKey().split('-').reduce((a, b) => a + Number(b), 0);
  const pool = GAMES.filter((g) => g.unlock <= 2);
  return pool[k % pool.length];
}

/** La feria del templo (งานวัด), de noche y con luces: todos los juegos para jugar libremente. */
export default function Feria() {
  const { p } = useStore();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState<(typeof CATS)[number]>('Todos');
  const reached = Math.max(p.profile.startStop, currentLesson(p).stop.n);
  const daily = gameOfTheDay();
  const list = GAMES.filter((g) => cat === 'Todos' || g.cat === cat);

  return (
    <View style={{ flex: 1, backgroundColor: color.noche }}>
      <Backdrop scene="mercado" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 30, gap: 14 }}>
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h1" style={{ fontSize: 26, color: '#FFFFFF' }}>La feria del templo</Txt>
            <Txt v="small" style={{ color: '#F3D9C2' }}>
              <Th size={13} style={{ color: '#FFE7B0' }}>งานวัด</Th> · ngaan wát · juega con lo que ya sabes
            </Txt>
          </View>
          <View style={styles.chip}>
            <Art name="platano" size={22} />
            <Txt v="bodyStrong" style={{ fontSize: 14, color: '#FFFFFF' }}>{p.bananas}</Txt>
          </View>
        </View>

        <DailyCard daily={daily} best={p.games[daily.id]?.best} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {CATS.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ selected: cat === c }}
              onPress={() => {
                fx.tap();
                setCat(c);
              }}
              style={[styles.filter, cat === c && styles.filterOn]}>
              <Text style={[styles.filterText, cat === c && { color: color.tinta }]}>{c === 'Todos' ? `Todos · ${GAMES.length}` : c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 }}>
          {list.map((g, i) => (
            <Booth key={g.id} g={g} i={i} locked={g.unlock > reached} best={p.games[g.id]?.best} plays={p.games[g.id]?.plays ?? 0} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/** El juego del día: puesto principal con bombillas que parpadean y un brillo que lo recorre. */
function DailyCard({ daily, best }: { daily: GameMeta; best?: number }) {
  const [shine, setShine] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setShine((s) => s + 1), 3800);
    return () => clearInterval(t);
  }, []);
  return (
    <Press3D
      accessibilityLabel={`Juego del día: ${daily.name}`}
      depth={8}
      onPress={() => {
        fx.pop();
        router.push({ pathname: '/juego/[id]', params: { id: daily.id, daily: '1' } });
      }}
      style={{ marginHorizontal: 20 }}>
      <View style={styles.daily}>
        <View style={styles.bulbs}>
          {Array.from({ length: 11 }, (_, i) => (
            <Bulb key={i} tint={i % 3 === 1 ? color.farol : i % 3 === 2 ? '#7FE0C4' : color.buatong} delay={i * 130} />
          ))}
        </View>
        <Floaty amp={4} rotate={6}>
          <Text style={styles.dailyEmoji}>{daily.emoji}</Text>
        </Floaty>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt v="eyebrow" style={{ color: color.buatong, fontSize: 11 }}>Juego del día · ×2 plátanos</Txt>
          <Txt v="h2" style={{ color: '#FFFFFF' }}>{daily.name}</Txt>
          <Txt v="small" style={{ color: '#C9D0EE' }}>{best ? `Tu récord: ${best}` : daily.short}</Txt>
        </View>
        <View style={styles.play}>
          <Icon name="play" size={22} color={color.tinta} />
        </View>
        <Shine trigger={shine} />
      </View>
    </Press3D>
  );
}

function Bulb({ tint, delay }: { tint: string; delay: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced, t, delay]);
  const st = useAnimatedStyle(() => ({ opacity: t.value }));
  return <Animated.View style={[styles.bulb, { backgroundColor: tint, shadowColor: tint }, st]} />;
}

/** Toldo de rayas con el borde festoneado, como los puestos de la feria. */
function Awning({ tint }: { tint: string }) {
  return (
    <Svg width="100%" height={24} viewBox="0 0 160 24" preserveAspectRatio="none">
      {Array.from({ length: 8 }, (_, k) => (
        <Rect key={`r${k}`} x={k * 20} y={0} width={20} height={14} fill={k % 2 === 0 ? tint : '#FFFFFF'} />
      ))}
      {Array.from({ length: 8 }, (_, k) => (
        <Circle key={`c${k}`} cx={k * 20 + 10} cy={14} r={10} fill={k % 2 === 0 ? tint : '#FFFFFF'} />
      ))}
      <Rect x={0} y={0} width={160} height={3} fill="#000000" opacity={0.12} />
    </Svg>
  );
}

function Booth({ g, i, locked, best, plays }: { g: GameMeta; i: number; locked: boolean; best?: number; plays: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(i * 40).springify().damping(15)} style={{ width: '47.5%' }}>
      <Press3D
        accessibilityLabel={locked ? `${g.name}, se abre en la parada ${g.unlock}` : g.name}
        onPress={() => {
          if (locked) {
            fx.bad();
            return;
          }
          fx.pop();
          router.push({ pathname: '/juego/[id]', params: { id: g.id } });
        }}>
        <View style={[styles.booth, { shadowColor: locked ? '#000000' : g.tint }, locked && { backgroundColor: '#C9CFDD' }]}>
          <Awning tint={locked ? color.niebla4 : g.tint} />
          <View style={[{ paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2, gap: 4 }, locked && { opacity: 0.6 }]}>
            <Floaty amp={locked ? 0 : 3} delay={(i % 5) * 240} style={{ alignSelf: 'flex-start' }}>
              <View style={[styles.icon, { backgroundColor: locked ? color.niebla2 : g.tint }]}>
                <View style={styles.iconShine} />
                {locked ? <Icon name="lock" size={22} /> : <Text style={{ fontSize: 26 }}>{g.emoji}</Text>}
              </View>
            </Floaty>
            <Txt v="h3" style={{ fontSize: 16 }} numberOfLines={2}>
              {g.name}
            </Txt>
            {best && !locked ? (
              <View style={styles.record}>
                <Text style={styles.recordText}>🏆 Récord {best}</Text>
              </View>
            ) : (
              <Txt v="small" style={{ fontSize: 12 }} numberOfLines={2}>
                {locked ? `Se abre en la parada ${g.unlock}` : plays ? `${plays} partidas` : g.trains}
              </Txt>
            )}
          </View>
        </View>
      </Press3D>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingLeft: 8, paddingRight: 12, borderRadius: 999, backgroundColor: 'rgba(14,17,36,0.55)', borderWidth: 2, borderColor: 'rgba(255,200,61,0.6)' },
  daily: {
    borderRadius: 24,
    backgroundColor: 'rgba(14,17,36,0.82)',
    borderWidth: 2,
    borderColor: 'rgba(255,200,61,0.75)',
    padding: 16,
    paddingTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    shadowColor: color.buatong,
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  bulbs: { position: 'absolute', left: 14, right: 14, top: 8, height: 12, flexDirection: 'row', justifyContent: 'space-between' },
  bulb: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  dailyEmoji: { fontSize: 42 },
  play: { width: 52, height: 52, borderRadius: 18, backgroundColor: color.azafran, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: color.azafranHondo },
  filter: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)', justifyContent: 'center' },
  filterOn: { backgroundColor: color.buatong, borderColor: color.buatong },
  filterText: { fontFamily: font.uiHeavy, fontSize: 13, color: '#F2E6FF' },
  booth: { borderRadius: 20, backgroundColor: '#FFFFFF', overflow: 'hidden', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  icon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', marginBottom: 2, overflow: 'hidden' },
  iconShine: { position: 'absolute', left: 6, top: 4, width: 22, height: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.4)', transform: [{ rotate: '-20deg' }] },
  record: { alignSelf: 'flex-start', paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: color.buatong, justifyContent: 'center' },
  recordText: { fontFamily: font.uiHeavy, fontSize: 11, color: color.tinta },
});
