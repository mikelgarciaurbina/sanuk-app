import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { color, shadow } from '@/brand/tokens';
import { Art, Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { MistBand } from '@/components/Scenery';
import { Bar, Speech, Txt } from '@/components/ui';
import { VoiceWarning } from '@/components/VoiceWarning';
import { HAS_SEASON_2, LESSONS, SEASON_2_STOPS, currentLesson, isUnlocked, letterProgress, moonOf, moonsDone, seasonOf, TOTAL_CURVES, type LessonRef, type Stop } from '@/content';
import { fx } from '@/lib/audio';
import { fmt } from '@/lib/format';
import { streakStatus, useStore } from '@/lib/store';

const STEP = 112;
/** Aire entre la cabecera y la última curva: ahí caben el bocadillo de «Empezar» y el cartel del final del camino. */
const HEAD_ROOM = 150;

/** Paisaje de cada temporada: la carretera entre montañas verdes y el año en el pueblo, entre arrozales. */
const LOOK = {
  1: { bg: '#E9F1EA', hills: ['#D3E6D7', '#C9DFCF'], trees: ['#8CC09A', '#7FB487', '#A5CFAE'] },
  2: { bg: '#F4EFD9', hills: ['#E9DFB4', '#DED29F'], trees: ['#C9B458', '#B5A246', '#DACB78'] },
} as const;

const stopLabel = (s: Stop) => (seasonOf(s) === 2 ? `Luna ${moonOf(s)} · ${s.month}` : `Parada ${s.n}`);

/** El camino: en la temporada 1 cada lección es una curva de la carretera; en la 2, un paso del año en el pueblo. */
export default function Camino() {
  const { p, dismissNews } = useStore();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scroll = useRef<ScrollViewInstance>(null);
  const [hint, setHint] = useState<string | null>(null);
  // la cabecera flota sobre el mapa y su alto cambia (avisos, textos en dos líneas): el camino empieza por debajo de ella,
  // para que las últimas curvas de cada temporada no queden tapadas
  const [headH, setHeadH] = useState(insets.top + 240);
  const TOP = headH + HEAD_ROOM;

  const cur = currentLesson(p);
  const curSeason = seasonOf(cur.stop);
  const [picked, setPicked] = useState<1 | 2 | null>(null);
  const season = HAS_SEASON_2 ? (picked ?? curSeason) : 1;
  const look = LOOK[season];
  const streak = streakStatus(p);
  const letter = letterProgress(p);

  // el React Compiler ya memoiza: no hace falta useMemo
  const list = LESSONS.filter((l) => seasonOf(l.stop) === season);
  const N = list.length;
  const W = Math.min(width, 520);
  const amp = (W - 150) / 2;
  const cx = W / 2;
  const contentH = TOP + N * STEP + 140;
  const curK = list.findIndex((l) => l.id === cur.id);
  const seasonPassed = season < curSeason;
  const seasonLocked = season > curSeason;

  const pos = list.map((_, k) => ({ x: cx + Math.sin(k * 1.1) * amp, y: TOP + (N - 1 - k) * STEP }));

  const roadPath = (from: number, to: number) => {
    let d = '';
    for (let i = from; i <= to; i++) {
      const pt = pos[i];
      if (i === from) d += `M${pt.x} ${pt.y + (from === 0 ? 90 : 0)}`;
      else {
        const prev = pos[i - 1];
        d += ` C${prev.x} ${prev.y - STEP / 2} ${pt.x} ${pt.y + STEP / 2} ${pt.x} ${pt.y}`;
      }
    }
    if (to === N - 1) d += ` L${pos[N - 1].x} ${pos[N - 1].y - 80}`;
    return d;
  };
  const doneTo = curK >= 0 ? curK : seasonPassed ? N - 1 : -1;

  // al abrir (o cambiar de temporada) se centra en la lección actual; solo depende de números
  useEffect(() => {
    const k = curK >= 0 ? curK : seasonPassed ? N - 1 : 0;
    const y = TOP + (N - 1 - k) * STEP;
    const t = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, y - height * 0.45), animated: false }), 60);
    return () => clearTimeout(t);
  }, [curK, seasonPassed, N, height, season, TOP]);

  const trees = useMemo(() => {
    const out: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < N; i += 1) {
      const side = Math.sin(i * 1.1) > 0 ? -1 : 1;
      out.push({ x: cx + side * (amp + 34 + ((i * 37) % 30)), y: TOP + (N - 1 - i) * STEP + ((i * 53) % 60) - 30, r: 12 + ((i * 7) % 8) });
    }
    return out;
  }, [N, cx, amp, TOP]);

  const open = (l: LessonRef) => {
    if (!isUnlocked(p, l)) {
      fx.bad();
      setHint(l.id);
      setTimeout(() => setHint((h) => (h === l.id ? null : h)), 1800);
      return;
    }
    fx.pop();
    router.push(`/leccion/${l.id}`);
  };

  const pick = (n: 1 | 2) => {
    if (n === season) return;
    fx.tap();
    setPicked(n);
  };

  const doneInStop = cur.stop.lessons.filter((l) => p.completed[l.id]).length;
  const first = list[0];
  const last = list[N - 1];

  return (
    <View style={{ flex: 1, backgroundColor: look.bg }}>
      <ScrollView key={season} ref={scroll} contentContainerStyle={{ height: contentH, width: W, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        <Svg width={W} height={contentH} style={StyleSheet.absoluteFill}>
          {list.map((l, k) => {
            if (l.inStop !== 0) return null;
            const y = pos[k].y + 40;
            const d =
              season === 1
                ? `M0 ${y} L${W * 0.18} ${y - 70} L${W * 0.34} ${y - 30} L${W * 0.55} ${y - 96} L${W * 0.74} ${y - 40} L${W * 0.88} ${y - 78} L${W} ${y - 30} L${W} ${y + 60} L0 ${y + 60} Z`
                : `M0 ${y - 20} C${W * 0.25} ${y - 54} ${W * 0.5} ${y - 6} ${W * 0.75} ${y - 40} S${W} ${y - 30} ${W} ${y - 30} L${W} ${y + 60} L0 ${y + 60} Z`;
            return <Path key={`m-${l.id}`} d={d} fill={l.stop.n % 2 ? look.hills[0] : look.hills[1]} opacity={0.9} />;
          })}
          {trees.map((t, i) => (
            <Circle key={i} cx={t.x} cy={t.y} r={season === 1 ? t.r : t.r * 0.8} fill={look.trees[i % 3]} />
          ))}
          <Path d={roadPath(0, N - 1)} stroke="#FBF6EE" strokeWidth={34} fill="none" strokeLinecap="round" />
          <Path d={roadPath(0, N - 1)} stroke={color.niebla3} strokeWidth={3} strokeDasharray="10 9" fill="none" />
          {doneTo > 0 ? <Path d={roadPath(0, doneTo)} stroke={color.buatong} strokeWidth={3.5} strokeDasharray="10 9" fill="none" /> : null}
        </Svg>
        {season === 1
          ? list.map((l, k) => (k % 9 === 4 ? <MistBand key={l.id} top={pos[k].y - 30} width={W * 0.7} height={26} opacity={0.55} distance={30} /> : null))
          : null}
        {list.map((l, k) => {
          const pt = pos[k];
          const done = !!p.completed[l.id];
          const unlocked = isUnlocked(p, l);
          const isCur = l.id === cur.id;
          const firstInStop = l.inStop === 0;
          const stopSide = Math.sin(k * 1.1) > 0 ? -1 : 1;
          // Noi acompaña a la curva actual por fuera del camino; si ahí no cabe entera, se pone por dentro
          // (y, si en ese lado está el cartel de la parada, un poco más abajo)
          const outer = stopSide > 0 ? pt.x - 150 : pt.x + 46;
          const fits = outer >= 0 && outer + 104 <= W;
          const noi = { left: fits ? outer : stopSide > 0 ? pt.x + 46 : pt.x - 150, top: !fits && firstInStop ? pt.y + 26 : pt.y - 64 };
          return (
            <View key={l.id}>
              {firstInStop ? (
                <View style={[styles.stopTag, { top: pt.y - 28, left: stopSide > 0 ? Math.min(pt.x + 44, W - 158) : Math.max(8, pt.x - 44 - 150) }]}>
                  {p.stamps.includes(l.stop.id) ? <Art name={season === 2 ? 'luna' : 'sello'} size={26} /> : null}
                  <View style={{ flex: 1 }}>
                    <Txt v="eyebrow" style={{ fontSize: 10 }}>{stopLabel(l.stop)}</Txt>
                    <Txt v="h3" style={{ fontSize: 14 }} numberOfLines={2}>
                      {season === 2 ? l.stop.title : l.stop.place}
                    </Txt>
                  </View>
                </View>
              ) : null}
              {isCur ? <PulseRing x={pt.x} y={pt.y} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${l.title}. ${done ? 'Completada' : unlocked ? 'Disponible' : 'Bloqueada'}`}
                onPress={() => open(l)}
                style={[
                  styles.node,
                  isCur ? styles.nodeCur : null,
                  { left: pt.x - (isCur ? 40 : 30), top: pt.y - (isCur ? 40 : 30) },
                  done ? styles.nodeDone : unlocked ? styles.nodeOpen : styles.nodeLocked,
                ]}>
                {done ? (
                  <Icon name="check" size={28} color="#FFFFFF" stroke={3.2} />
                ) : unlocked ? (
                  l.last ? <Art name={season === 2 ? 'luna' : 'cofre'} size={isCur ? 44 : 34} /> : <Icon name="star" size={isCur ? 36 : 26} color={color.tinta} />
                ) : (
                  <Icon name="lock" size={22} color={color.tinta3} />
                )}
              </Pressable>
              {isCur ? (
                <>
                  <Animated.View entering={ZoomIn.delay(300).springify().damping(10)} style={[styles.bubble, { left: pt.x - 80, top: pt.y - 96 }]}>
                    <Speech tail="bottom" style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Txt v="eyebrow" style={{ color: color.tinta, letterSpacing: 1 }}>Empezar</Txt>
                      <Txt v="small" numberOfLines={1}>{l.title}</Txt>
                    </Speech>
                  </Animated.View>
                  <View pointerEvents="none" style={{ position: 'absolute', left: noi.left, top: noi.top }}>
                    <Noi pose="feliz" size={104} />
                  </View>
                </>
              ) : null}
              {hint === l.id ? (
                <Animated.View entering={FadeIn} style={[styles.bubble, { left: pt.x - 90, top: pt.y - 84, width: 180 }]}>
                  <Speech tail="bottom" style={{ paddingVertical: 8 }}>
                    <Txt v="small" style={{ textAlign: 'center' }}>{seasonLocked ? 'Se abre al terminar la carretera.' : 'Primero, la lección anterior.'}</Txt>
                  </Speech>
                </Animated.View>
              ) : null}
            </View>
          );
        })}
        {/* el cartel del final del camino cede el sitio al bocadillo de «Empezar» cuando toca la última curva */}
        {curK === N - 1 ? null : (
          <View style={[styles.village, { top: TOP - 110, left: pos[N - 1].x - 70 }]}>
            <Art name={season === 2 ? 'farol' : 'carta'} size={34} />
            <Txt v="small" style={{ textAlign: 'center' }}>
              {season === 2 ? `${last.stop.month} · ${last.stop.title}` : 'Tu carta a Yai · fin de la temporada 1'}
            </Txt>
          </View>
        )}
        <View style={[styles.startSign, { top: pos[0].y + 46, left: pos[0].x - 70 }]}>
          <Txt v="small" style={{ textAlign: 'center' }}>{season === 2 ? `${first.stop.month} · ${first.stop.title}` : 'Chiang Mai · curva 0'}</Txt>
        </View>
      </ScrollView>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none" onLayout={(e) => setHeadH(Math.round(e.nativeEvent.layout.height))}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <HudChip icon={streak.litToday ? 'farol' : 'farolOff'} label={String(streak.count)} warn={streak.atRisk} />
          <HudChip icon="platano" label={String(p.bananas)} />
          <HudChip icon="paraguas" label={String(p.streak.umbrellas)} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.push('/diario')} accessibilityRole="button" accessibilityLabel="Diario del viaje" style={[styles.chip, { backgroundColor: '#FFFDF7', paddingHorizontal: 8 }]}>
            <Art name="diario" size={22} />
          </Pressable>
          <Pressable onPress={() => router.push('/carta')} accessibilityRole="button" accessibilityLabel={`La carta de Yai, ${letter.pct} por ciento`} style={[styles.chip, { backgroundColor: '#FFFDF7' }]}>
            <Art name="carta" size={22} />
            <Txt v="bodyStrong" style={{ fontSize: 14 }}>{letter.pct} %</Txt>
          </Pressable>
        </View>
        <Pressable onPress={() => open(cur)} accessibilityRole="button" style={[styles.stopCard, curSeason === 2 && styles.stopCard2]}>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt v="eyebrow" style={{ color: '#5A3A00', fontSize: 11 }}>
              {stopLabel(cur.stop)} · {cur.stop.place}
            </Txt>
            <Txt v="h2" style={{ fontSize: 20 }}>{cur.stop.title}</Txt>
            <Txt v="small" style={{ color: '#5A3A00' }}>
              {cur.stop.theme} · {doneInStop} de {cur.stop.lessons.length}
            </Txt>
          </View>
          <View style={{ width: 70, gap: 4, alignItems: 'flex-end' }}>
            <Txt v="small" style={{ color: '#5A3A00', fontSize: 11 }}>hoy</Txt>
            {/* la barra crece a lo ancho de una fila: suelta en esta columna, en iOS y Android se estiraba hacia abajo */}
            <View style={{ flexDirection: 'row', alignSelf: 'stretch' }}>
              <Bar value={p.today.bananas / Math.max(1, p.profile.goal)} tint={color.arrozal} track="rgba(255,255,255,.5)" height={10} />
            </View>
            <Txt v="small" style={{ color: '#5A3A00', fontSize: 11 }}>
              {Math.min(p.today.bananas, p.profile.goal)}/{p.profile.goal}
            </Txt>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {season === 1 ? (
            <View style={styles.curves}>
              <Art name="curva" size={20} />
              <Txt v="small" style={{ color: color.tinta }}>
                Curva {fmt(p.curves)} de {fmt(TOTAL_CURVES)}
              </Txt>
            </View>
          ) : (
            <View style={styles.curves}>
              <Art name="luna" size={20} />
              <Txt v="small" style={{ color: color.tinta }}>
                Luna {moonsDone(p)} de {SEASON_2_STOPS.length}
              </Txt>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {HAS_SEASON_2 ? <SeasonTabs season={season} locked2={curSeason === 1} onPick={pick} /> : null}
        </View>
        {p.news ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <Pressable onPress={dismissNews} accessibilityRole="button" accessibilityLabel="Entendido" style={styles.news}>
              <Noi pose="celebra" size={54} still />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="bodyStrong" style={{ fontSize: 14, color: color.tinta }}>¡El camino ha crecido!</Txt>
                <Txt v="small" style={{ color: color.tinta }}>
                  Hay {p.news} {p.news === 1 ? 'lección nueva' : 'lecciones nuevas'} en tramos que ya recorriste. Te llevo a la primera; tus sellos, tus plátanos y tus palabras siguen contigo.
                </Txt>
              </View>
              <Icon name="close" size={18} />
            </Pressable>
          </Animated.View>
        ) : null}
        {/* si el dispositivo no tiene voz thai, toda la app sería muda: se avisa aquí, con cómo instalarla */}
        <VoiceWarning compact />
      </View>

      {seasonLocked ? (
        <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.lockCard} pointerEvents="none">
          <Art name="luna" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="eyebrow" style={{ color: color.arrozal }}>Temporada 2</Txt>
            <Txt v="h3">Un año en el pueblo</Txt>
            <Txt v="small">Doce lunas de vida en Mae Hong Son, hasta el B1. Se abre cuando llegas al pueblo y terminas el epílogo.</Txt>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function SeasonTabs({ season, locked2, onPick }: { season: 1 | 2; locked2: boolean; onPick: (n: 1 | 2) => void }) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {([1, 2] as const).map((n) => {
        const on = season === n;
        return (
          <Pressable key={n} onPress={() => onPick(n)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={n === 1 ? 'Temporada 1, la carretera' : 'Temporada 2, el pueblo'} style={[styles.tab, on && styles.tabOn]}>
            {n === 2 && locked2 ? <Icon name="lock" size={12} color={on ? color.tinta : color.tinta3} /> : null}
            <Txt v="bodyStrong" style={{ fontSize: 13, color: on ? color.tinta : color.tinta3 }}>{n === 1 ? 'Carretera' : 'El pueblo'}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function HudChip({ icon, label, warn }: { icon: 'farol' | 'farolOff' | 'platano' | 'paraguas'; label: string; warn?: boolean }) {
  return (
    <View style={[styles.chip, warn ? { borderColor: color.farol } : null]}>
      <Art name={icon} size={22} />
      <Txt v="bodyStrong" style={{ fontSize: 14, color: color.tinta }}>{label}</Txt>
    </View>
  );
}

function PulseRing({ x, y }: { x: number; y: number }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(withSequence(withTiming(1.18, { duration: 900 }), withTiming(1, { duration: 900 })), -1, false);
  }, [s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: 2 - s.value * 1.2 }));
  return <Animated.View pointerEvents="none" style={[styles.ring, { left: x - 56, top: y - 56 }, a]} />;
}

const styles = StyleSheet.create({
  header: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 16, gap: 10 },
  news: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, backgroundColor: '#FFFDF7', borderWidth: 2, borderColor: color.buatong, ...shadow.card },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingLeft: 8, paddingRight: 12, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3 },
  stopCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: color.azafran, borderBottomWidth: 5, borderBottomColor: color.azafranHondo },
  stopCard2: { backgroundColor: '#F6D77A', borderBottomColor: '#C9A43A' },
  curves: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,.85)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  tabs: { flexDirection: 'row', padding: 3, gap: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.7)', borderWidth: 1.5, borderColor: color.niebla3 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 999 },
  tabOn: { backgroundColor: '#FFFFFF', ...shadow.card },
  node: { position: 'absolute', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5 },
  nodeCur: { width: 80, height: 80, borderRadius: 40, backgroundColor: color.azafran, borderBottomColor: color.azafranHondo },
  nodeDone: { backgroundColor: color.arrozalVivo, borderBottomColor: color.arrozal },
  nodeOpen: { backgroundColor: color.azafran, borderBottomColor: color.azafranHondo },
  nodeLocked: { backgroundColor: color.niebla3, borderBottomColor: color.niebla4 },
  ring: { position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderStyle: 'dashed', borderColor: color.azafran },
  bubble: { position: 'absolute', width: 160, alignItems: 'center' },
  stopTag: { position: 'absolute', width: 150, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,.9)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, ...shadow.card },
  village: { position: 'absolute', width: 140, alignItems: 'center', gap: 4 },
  startSign: { position: 'absolute', width: 140, backgroundColor: 'rgba(255,255,255,.9)', borderRadius: 12, padding: 6 },
  lockCard: { position: 'absolute', left: 16, right: 16, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: '#FFFDF7', ...shadow.card },
});
