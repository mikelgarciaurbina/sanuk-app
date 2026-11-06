import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, font, shadow } from '@/brand/tokens';
import { Art, Icon } from '@/components/icons';
import { Th, Txt } from '@/components/ui';
import { currentLesson } from '@/content';
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

/** La feria del templo (งานวัด): todos los juegos para jugar libremente. */
export default function Feria() {
  const { p } = useStore();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState<(typeof CATS)[number]>('Todos');
  const reached = Math.max(p.profile.startStop, currentLesson(p).stop.n);
  const daily = gameOfTheDay();
  const list = GAMES.filter((g) => cat === 'Todos' || g.cat === cat);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.niebla }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 30, gap: 14 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="h1" style={{ fontSize: 26 }}>La feria del templo</Txt>
          <Txt v="small">
            <Th size={13}>งานวัด</Th> · ngaan wát · juega con lo que ya sabes
          </Txt>
        </View>
        <View style={styles.chip}>
          <Art name="platano" size={22} />
          <Txt v="bodyStrong" style={{ fontSize: 14 }}>{p.bananas}</Txt>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Juego del día: ${daily.name}`}
        onPress={() => {
          fx.pop();
          router.push({ pathname: '/juego/[id]', params: { id: daily.id, daily: '1' } });
        }}
        style={styles.daily}>
        <View style={styles.bulbs}>
          {Array.from({ length: 9 }, (_, i) => (
            <View key={i} style={[styles.bulb, { backgroundColor: i % 3 === 1 ? color.farol : color.buatong, top: 6 + Math.sin(i) * 4 }]} />
          ))}
        </View>
        <Text style={styles.dailyEmoji}>{daily.emoji}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt v="eyebrow" style={{ color: color.buatong, fontSize: 11 }}>Juego del día · ×2 plátanos</Txt>
          <Txt v="h2" style={{ color: '#FFFFFF' }}>{daily.name}</Txt>
          <Txt v="small" style={{ color: '#C9D0EE' }}>
            {p.games[daily.id]?.best ? `Tu récord: ${p.games[daily.id]!.best}` : daily.short}
          </Txt>
        </View>
        <View style={styles.play}>
          <Icon name="play" size={22} color={color.tinta} />
        </View>
      </Pressable>

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
            <Text style={[styles.filterText, cat === c && { color: '#FFFFFF' }]}>{c === 'Todos' ? `Todos · ${GAMES.length}` : c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 }}>
        {list.map((g, i) => (
          <Booth key={g.id} g={g} i={i} locked={g.unlock > reached} best={p.games[g.id]?.best} plays={p.games[g.id]?.plays ?? 0} />
        ))}
      </View>
    </ScrollView>
  );
}

function Booth({ g, i, locked, best, plays }: { g: GameMeta; i: number; locked: boolean; best?: number; plays: number }) {
  const press = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ perspective: 600 }, { rotateX: `${press.value * 8}deg` }, { scale: 1 - press.value * 0.03 }] }));
  return (
    <Animated.View entering={FadeInDown.delay(i * 40).springify().damping(15)} style={{ width: '47.5%' }}>
      <Animated.View style={a}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={locked ? `${g.name}, se abre en la parada ${g.unlock}` : g.name}
        onPressIn={() => {
          press.value = withTiming(1, { duration: 90 });
        }}
        onPressOut={() => {
          press.value = withSpring(0, { damping: 10 });
        }}
        onPress={() => {
          if (locked) {
            fx.bad();
            return;
          }
          fx.pop();
          router.push({ pathname: '/juego/[id]', params: { id: g.id } });
        }}
        style={[styles.booth, locked && { opacity: 0.6 }]}>
        <View style={styles.awning}>
          {Array.from({ length: 8 }, (_, k) => (
            <View key={k} style={{ flex: 1, backgroundColor: k % 2 === 0 ? (locked ? color.niebla3 : g.tint) : '#FFFFFF' }} />
          ))}
        </View>
        <View style={{ padding: 12, gap: 4 }}>
          <View style={[styles.icon, { backgroundColor: locked ? color.niebla2 : '#FFFFFF' }]}>
            {locked ? <Icon name="lock" size={22} /> : <Text style={{ fontSize: 26 }}>{g.emoji}</Text>}
          </View>
          <Txt v="h3" style={{ fontSize: 16 }} numberOfLines={2}>
            {g.name}
          </Txt>
          <Txt v="small" style={{ fontSize: 12 }} numberOfLines={2}>
            {locked ? `Se abre en la parada ${g.unlock}` : best ? `Récord ${best}` : plays ? `${plays} partidas` : g.trains}
          </Txt>
        </View>
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingLeft: 8, paddingRight: 12, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3 },
  daily: { marginHorizontal: 20, borderRadius: 24, backgroundColor: color.noche, padding: 16, paddingTop: 26, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  bulbs: { position: 'absolute', left: 14, right: 14, top: 0, height: 20, flexDirection: 'row', justifyContent: 'space-between' },
  bulb: { width: 7, height: 7, borderRadius: 4 },
  dailyEmoji: { fontSize: 40 },
  play: { width: 52, height: 52, borderRadius: 18, backgroundColor: color.azafran, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: color.azafranHondo },
  filter: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3, justifyContent: 'center' },
  filterOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  filterText: { fontFamily: font.uiHeavy, fontSize: 13, color: color.tinta2 },
  booth: { borderRadius: 20, backgroundColor: '#FFFFFF', overflow: 'hidden', ...shadow.card },
  awning: { height: 14, flexDirection: 'row' },
  icon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...shadow.card, marginBottom: 2 },
});
