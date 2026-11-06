import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, shadow } from '@/brand/tokens';
import { Art } from '@/components/icons';
import { MissionCard } from '@/components/MissionCard';
import { Noi } from '@/components/Noi';
import { Confetti } from '@/components/Scenery';
import { Btn, Chip, Rom, Th, Txt } from '@/components/ui';
import { SEASON_2_STOPS, curvesFor, lessonById, letterProgress, moonOf, moonsDone, seasonOf } from '@/content';
import type { GameResult } from '@/games/types';
import { fx } from '@/lib/audio';
import { useStore } from '@/lib/store';

/** Número que cuenta desde 0 (funciona igual en web y en móvil). */
function AnimatedNumber({ value, suffix = '', style }: { value: number; suffix?: string; style?: object }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / 900);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <Txt v="num" style={style}>
      {n}
      {suffix}
    </Txt>
  );
}

/** Pantalla de fin de lección: plátanos, curvas o lunas, precisión, sellos, mensaje de la familia y misión del mes. */
export function LessonDone({ result, seconds, letterBefore, lessonId }: { result: GameResult; seconds: number; letterBefore: number; lessonId?: string }) {
  const { p } = useStore();
  const insets = useSafeAreaInsets();
  const lesson = lessonId ? lessonById(lessonId) : undefined;
  const letter = letterProgress(p);
  const acc = result.total ? Math.round((result.correct / result.total) * 100) : 100;
  const stamped = lesson && p.stamps.includes(lesson.stop.id) && lesson.last;
  const message = stamped ? lesson.stop.message : undefined;
  const mm = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const gained = letter.pct - letterBefore;
  const s2 = !!lesson && seasonOf(lesson.stop) === 2;
  const moons = moonsDone(p);

  return (
    <View style={{ flex: 1, backgroundColor: color.niebla }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 20, gap: 14 }}>
        <Animated.View entering={ZoomIn.springify().damping(9)} style={{ alignItems: 'center' }}>
          <Noi pose="celebra" size={190} />
        </Animated.View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Txt v="eyebrow" style={{ color: color.arrozal }}>{lesson ? lesson.title : 'Repaso'}</Txt>
          <Txt v="h1">{lesson ? (s2 ? '¡Lección superada!' : '¡Curva superada!') : '¡Repaso hecho!'}</Txt>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Stat icon={<Art name="platano" size={34} />} value={<AnimatedNumber value={result.bananas} />} label="plátanos" />
          {s2 ? (
            <Stat icon={<Art name="luna" size={34} />} value={<AnimatedNumber value={Object.keys(p.words).length} />} label="palabras" />
          ) : (
            <Stat icon={<Art name="curva" size={34} />} value={<AnimatedNumber value={lesson ? curvesFor(lesson) : 0} />} label={`curvas · ${p.curves}`} />
          )}
          <Stat icon={<View style={[styles.dot, { backgroundColor: color.arrozalSuave }]}><View style={[styles.dotIn, { backgroundColor: color.arrozal }]} /></View>} value={<AnimatedNumber value={acc} suffix=" %" style={{ color: color.arrozal }} />} label="precisión" />
          <Stat icon={<View style={[styles.dot, { backgroundColor: color.cieloSuave }]}><View style={[styles.dotIn, { backgroundColor: color.cieloHondo }]} /></View>} value={<Txt v="num">{mm}</Txt>} label="minutos" />
        </View>
        {s2 ? (
          <Animated.View entering={FadeInDown.delay(300)} style={[styles.card, { backgroundColor: '#FFFBEA', flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <Art name="luna" size={36} />
            <View style={{ flex: 1, gap: 6 }}>
              <Txt v="small">
                <Txt v="small" style={{ color: color.tinta }}>Un año en el pueblo</Txt> · {lesson?.stop.month}
              </Txt>
              <View style={{ height: 10, borderRadius: 10, backgroundColor: color.niebla3, overflow: 'hidden' }}>
                <View style={{ width: `${(moons / Math.max(1, SEASON_2_STOPS.length)) * 100}%`, height: '100%', backgroundColor: color.buatong }} />
              </View>
            </View>
            <Txt v="num" style={{ fontSize: 18 }}>
              {moons}/{SEASON_2_STOPS.length}
            </Txt>
          </Animated.View>
        ) : (
        <Animated.View entering={FadeInDown.delay(300)} style={[styles.card, { backgroundColor: '#FFFDF7', flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Art name="carta" size={36} />
          <View style={{ flex: 1, gap: 6 }}>
            <Txt v="small">
              <Txt v="small" style={{ color: color.tinta }}>La carta de Yai</Txt>
              {gained > 0 ? ` · +${gained} % sin niebla` : ''}
            </Txt>
            <View style={{ height: 10, borderRadius: 10, backgroundColor: color.niebla3, overflow: 'hidden' }}>
              <View style={{ width: `${letter.pct}%`, height: '100%', backgroundColor: color.buatong }} />
            </View>
          </View>
          <Txt v="num" style={{ fontSize: 18 }}>{letter.pct} %</Txt>
        </Animated.View>
        )}
        {stamped && lesson ? (
          <Animated.View entering={ZoomIn.delay(600).springify().damping(8)} style={[styles.card, { alignItems: 'center', gap: 6 }]} onLayout={() => fx.stamp()}>
            <Art name={s2 ? 'luna' : 'sello'} size={64} />
            <Txt v="h3">{s2 ? `¡${lesson.stop.month} completado!` : `Sello de ${lesson.stop.place}`}</Txt>
            <Txt v="small" style={{ textAlign: 'center' }}>
              {s2 ? `Luna ${moonOf(lesson.stop)} de ${SEASON_2_STOPS.length}. ¡Tu pasaporte tiene una luna nueva!` : `Parada ${lesson.stop.n} completada. ¡Tu pasaporte tiene un sello nuevo!`}
            </Txt>
          </Animated.View>
        ) : null}
        {message ? (
          <Animated.View entering={FadeIn.delay(900)} style={[styles.card, { gap: 4 }]}>
            <Txt v="eyebrow" style={{ fontSize: 10 }}>Mensaje de {message.from}</Txt>
            <Th size={22}>{message.th}</Th>
            <Rom rom={message.rom} size={13} />
            <Txt v="small">{message.es}</Txt>
          </Animated.View>
        ) : null}
        {stamped && lesson?.stop.mission ? (
          <Animated.View entering={FadeInDown.delay(1200)}>
            <MissionCard stop={lesson.stop} />
          </Animated.View>
        ) : null}
        <Chip label={`Racha de ${p.streak.count} ${p.streak.count === 1 ? 'día' : 'días'}`} icon="farol" style={{ alignSelf: 'center' }} />
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <Btn label="Continuar" onPress={() => router.back()} />
      </View>
      <Confetti run={1} />
    </View>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <Animated.View entering={FadeInDown.springify()} style={[styles.card, { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }]}>
      {icon}
      <View>
        {value}
        <Txt v="small" style={{ fontSize: 12 }}>{label}</Txt>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, ...shadow.card },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dotIn: { width: 12, height: 12, borderRadius: 6 },
});
