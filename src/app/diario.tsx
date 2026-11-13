import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, shadow } from '@/brand/tokens';
import { Art, Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { stopLook } from '@/components/stopLook';
import { Btn, Rom, Th, Txt } from '@/components/ui';
import { LESSONS, STOPS, currentLesson, seasonOf, type LessonRef, type Stop } from '@/content';
import { Illustration } from '@/games/cuentos/escenas';
import { fx, say } from '@/lib/audio';
import { goBack } from '@/lib/nav';
import { useStore } from '@/lib/store';

type Chapter = {
  stop: Stop;
  /** lecciones cuyo momento ya se puede leer */
  told: LessonRef[];
  /** la parada se saltó con la prueba de nivel: se cuenta entera, para no perder el hilo */
  skipped: boolean;
  /** la siguiente lección está en esta parada */
  next?: LessonRef;
  done: boolean;
};

const whereOf = (s: Stop) => (seasonOf(s) === 2 ? `${s.month} en el pueblo` : `Parada ${s.n} · ${s.place}`);

/**
 * El diario del viaje: la historia que ya has vivido, capítulo a capítulo. Cada lección terminada deja aquí su momento
 * (y cómo acabó), y cada parada sellada, el mensaje que mandó la familia.
 */
export default function Diario() {
  const { p } = useStore();
  const insets = useSafeAreaInsets();
  const cur = currentLesson(p);
  const allDone = !!p.completed[cur.id];

  const chapters = useMemo<Chapter[]>(() => {
    const out: Chapter[] = [];
    for (const stop of STOPS) {
      const lessons = LESSONS.filter((l) => l.stop === stop);
      const finished = lessons.filter((l) => p.completed[l.id]);
      const skipped = !finished.length && seasonOf(stop) === 1 && stop.n < p.profile.startStop;
      const next = !allDone && cur.stop === stop ? cur : undefined;
      if (!finished.length && !skipped && !next) continue;
      out.push({ stop, told: skipped ? lessons : finished, skipped, next, done: p.stamps.includes(stop.id) });
    }
    return out;
  }, [p.completed, p.stamps, p.profile.startStop, cur, allDone]);

  const moments = chapters.reduce((a, c) => a + (c.skipped ? 0 : c.told.length), 0);
  const ahead = STOPS.length - chapters.length;
  // abierto por defecto: el capítulo en el que estás
  const [open, setOpen] = useState<string | null>(() => chapters.find((c) => c.next)?.stop.id ?? chapters[chapters.length - 1]?.stop.id ?? null);

  return (
    <View style={{ flex: 1, backgroundColor: color.niebla }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: insets.bottom + 28, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => goBack('/(tabs)')} accessibilityRole="button" accessibilityLabel="Volver" style={styles.back}>
            <Icon name="back" size={24} />
          </Pressable>
          <Txt v="h2" style={{ flex: 1 }}>Diario del viaje</Txt>
          <View style={styles.count}>
            <Art name="diario" size={20} />
            <Txt v="bodyStrong" style={{ fontSize: 14 }}>{moments}</Txt>
          </View>
        </View>

        <Animated.View entering={FadeIn.duration(300)} style={styles.intro}>
          <Noi pose={moments ? 'feliz' : 'hola'} size={64} still />
          <Txt v="small" style={{ flex: 1, color: color.tinta }}>
            {moments
              ? 'Todo lo que ha pasado en el camino, por si quieres volver a leerlo. Cada lección que terminas escribe aquí una página.'
              : 'Aquí se irá escribiendo tu viaje: cada lección que termines dejará una página. Empieza por la primera.'}
          </Txt>
        </Animated.View>

        {chapters.map((c, i) => (
          <ChapterCard key={c.stop.id} chapter={c} open={open === c.stop.id} delay={Math.min(i, 6) * 50} romanization={p.settings.romanization} onToggle={() => setOpen(open === c.stop.id ? null : c.stop.id)} />
        ))}

        {ahead > 0 ? (
          <View style={styles.fog}>
            <Txt v="small" style={{ textAlign: 'center' }}>
              {ahead === 1 ? 'Queda un capítulo' : `Quedan ${ahead} capítulos`} entre la niebla. Se escriben jugando.
            </Txt>
          </View>
        ) : (
          <View style={styles.fog}>
            <Txt v="small" style={{ textAlign: 'center' }}>Has escrito el diario entero. แล้วพบกันใหม่: hasta el próximo Songkran.</Txt>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ChapterCard({ chapter: c, open, delay, romanization, onToggle }: { chapter: Chapter; open: boolean; delay: number; romanization: boolean; onToggle: () => void }) {
  const { stop } = c;
  const total = stop.lessons.length;
  const status = c.skipped ? 'resumen' : c.done ? 'completo' : `${c.told.length} de ${total}`;
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)} style={styles.card}>
      <Pressable onPress={() => { fx.tap(); onToggle(); }} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${whereOf(stop)}. ${stop.title}`}>
        <Illustration spec={stopLook(stop).vignette} height={open ? 132 : 92} />
        <View style={styles.head}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="eyebrow" style={{ fontSize: 10 }}>{whereOf(stop)}</Txt>
            <Txt v="h3">{stop.title}</Txt>
          </View>
          <View style={[styles.status, c.done && { backgroundColor: color.arrozalSuave }]}>
            <Txt v="small" style={{ fontSize: 12, color: c.done ? color.arrozal : color.tinta2 }}>{status}</Txt>
          </View>
          <View style={{ transform: [{ rotate: open ? '90deg' : '-90deg' }] }}>
            <Icon name="back" size={18} />
          </View>
        </View>
      </Pressable>

      {open ? (
        <View style={styles.pages}>
          {c.skipped ? (
            <Txt v="small" style={{ color: color.tinta2 }}>Empezaste el viaje más arriba. Esto es lo que pasó en este tramo:</Txt>
          ) : null}
          {c.told.map((l, k) => (
            <View key={l.id} style={styles.entry}>
              <View style={styles.rail}>
                <View style={styles.dot}>
                  <Txt v="small" style={{ fontSize: 11, color: '#FFFFFF' }}>{k + 1}</Txt>
                </View>
                {k < c.told.length - 1 || c.next ? <View style={styles.line} /> : null}
              </View>
              <View style={{ flex: 1, gap: 6, paddingBottom: 14 }}>
                <Txt v="bodyStrong" style={{ fontSize: 14, color: color.teca }}>{l.title}</Txt>
                {l.beat ? <Txt v="body" style={{ fontSize: 15, lineHeight: 22, color: color.tinta }}>{l.beat}</Txt> : null}
                {l.after && !c.skipped ? (
                  <View style={styles.after}>
                    <Txt v="small" style={{ color: color.tinta, lineHeight: 19 }}>{l.after}</Txt>
                  </View>
                ) : null}
              </View>
            </View>
          ))}

          {c.done && stop.message ? (
            <Pressable onPress={() => say(stop.message!.th)} accessibilityRole="button" accessibilityLabel={`Mensaje de ${stop.message.from}. Tocar para escuchar`} style={styles.message}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Art name="carta" size={22} />
                <Txt v="eyebrow" style={{ fontSize: 10, flex: 1 }}>Mensaje de {stop.message.from}</Txt>
                <Icon name="speaker" size={18} color={color.teca} />
              </View>
              <Th size={20}>{stop.message.th}</Th>
              {romanization ? <Rom rom={stop.message.rom} size={13} /> : null}
              <Txt v="small">{stop.message.es}</Txt>
            </Pressable>
          ) : null}

          {c.next ? (
            <View style={styles.entry}>
              <View style={styles.rail}>
                <View style={[styles.dot, { backgroundColor: color.buatong }]}>
                  <Icon name="star" size={12} color={color.tinta} />
                </View>
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Txt v="bodyStrong" style={{ fontSize: 14, color: color.tinta2 }}>Continuará… «{c.next.title}»</Txt>
                <Btn label={c.told.length ? 'Seguir el viaje' : 'Empezar el capítulo'} onPress={() => router.push(`/leccion/${c.next!.id}`)} />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 20, backgroundColor: '#FFFDF7', borderWidth: 2, borderColor: '#F0E2C8' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 8, ...shadow.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingTop: 10, paddingBottom: 6 },
  status: { paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: color.niebla2 },
  pages: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8, gap: 0 },
  entry: { flexDirection: 'row', gap: 10 },
  rail: { width: 24, alignItems: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: color.teca, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2.5, borderRadius: 2, backgroundColor: '#EAD9C4', marginVertical: 3 },
  after: { padding: 10, borderRadius: 14, backgroundColor: '#FFF7E6', borderLeftWidth: 4, borderLeftColor: color.buatong },
  message: { gap: 4, padding: 12, borderRadius: 18, backgroundColor: '#FFFDF7', borderWidth: 2, borderColor: '#F0E2C8', marginBottom: 14 },
  fog: { padding: 14, borderRadius: 18, backgroundColor: color.niebla2 },
});
