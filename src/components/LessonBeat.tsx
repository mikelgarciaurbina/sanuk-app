import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { color, shadow } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { stopLightInk, stopLook } from '@/components/stopLook';
import { Btn, Speech, Txt } from '@/components/ui';
import { VoiceWarning } from '@/components/VoiceWarning';
import { seasonOf, type LessonRef } from '@/content';
import { Backdrop } from '@/games/Backdrop';

/**
 * El momento de la historia con el que empieza cada lección: dónde estás, qué pasa y qué vas a aprender hoy.
 * Lo cuenta Noi, con el escenario de la parada detrás: el mercado, las curvas, la cueva, la casa de teca…
 */
export function LessonBeat({ lesson, newWords, onNext }: { lesson: LessonRef; newWords: number; onNext: () => void }) {
  const { height } = useWindowDimensions();
  const s2 = seasonOf(lesson.stop) === 2;
  const where = s2 ? `${lesson.stop.month} · ${lesson.stop.title}` : `Parada ${lesson.stop.n} · ${lesson.stop.place}`;
  const noi = Math.round(Math.max(110, Math.min(170, height * 0.19)));
  const grammar = lesson.patterns?.length ?? 0;
  const dark = stopLightInk(lesson.stop);
  const ink = dark ? '#FFFFFF' : color.tinta;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene={stopLook(lesson.stop).scene} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 12 }}>
        <Animated.View entering={FadeIn.duration(300)} style={{ gap: 2 }}>
          <Txt v="eyebrow" style={[styles.lit, { color: dark ? '#FFE9A8' : color.tinta2 }, dark && styles.litDark]}>{where}</Txt>
          <Txt v="h1" style={[styles.lit, { fontSize: 28, color: ink }, dark && styles.litDark]}>{lesson.title}</Txt>
        </Animated.View>

        <Animated.View entering={ZoomIn.delay(120).springify().damping(13)}>
          <Speech tail="bottom" style={{ marginTop: 6 }}>
            <Txt v="bodyStrong" style={{ fontSize: 16, lineHeight: 23, color: color.tinta }}>{lesson.beat}</Txt>
          </Speech>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(260).springify().damping(12)} style={{ alignItems: 'center', marginTop: -2 }}>
          <Noi pose="hola" size={noi} />
        </Animated.View>

        <View style={{ flex: 1 }} />

        {/* sin voz thai instalada la lección sería muda: se avisa antes de empezar */}
        <VoiceWarning compact />
        <Animated.View entering={FadeInDown.delay(420).springify().damping(14)} style={styles.today}>
          <View style={styles.target}>
            <Icon name="check" size={18} color="#FFFFFF" stroke={3} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt v="eyebrow" style={{ fontSize: 10 }}>Hoy</Txt>
            <Txt v="bodyStrong" style={{ fontSize: 15, color: color.tinta }}>{lesson.goal}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {newWords > 0 ? <Tag label={`${newWords} ${newWords === 1 ? 'palabra nueva' : 'palabras nuevas'}`} /> : <Tag label="repaso" />}
              {lesson.sentences?.length ? <Tag label={`${lesson.sentences.length} ${lesson.sentences.length === 1 ? 'frase' : 'frases'}`} /> : null}
              {grammar ? <Tag label="gramática" tint={color.cieloSuave} ink={color.cieloHondo} /> : null}
              {lesson.extra?.kind === 'dialogo' ? <Tag label="conversación" tint={color.lacaSuave} ink={color.laca} /> : null}
              {lesson.extra?.kind === 'cuento' ? <Tag label="cuento de Yai" tint={color.tecaSuave} ink={color.teca} /> : null}
              {lesson.extra?.kind === 'letras' ? <Tag label="escritura" tint={color.arrozalSuave} ink={color.arrozal} /> : null}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 }}>
        <Btn label="¡Vamos!" onPress={onNext} />
      </View>
    </View>
  );
}

function Tag({ label, tint = color.niebla2, ink = color.tinta2 }: { label: string; tint?: string; ink?: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: tint }]}>
      <Txt v="small" style={{ fontSize: 12, color: ink }}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  // el título va sobre el cielo del escenario: un halo lo separa de nubes, luces y montañas
  lit: { textShadowColor: 'rgba(255,255,255,0.85)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  litDark: { textShadowColor: 'rgba(8,10,40,0.7)' },
  today: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 22, backgroundColor: '#FFFFFF', ...shadow.card },
  target: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.arrozalVivo, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  tag: { paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center' },
});
