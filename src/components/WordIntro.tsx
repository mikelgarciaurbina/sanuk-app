import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { color, shadow } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Btn, Rom, Speech, Sticker, Th, ToneChip, Txt, mainTone } from '@/components/ui';
import type { Sentence, Word } from '@/content/types';
import { say } from '@/lib/audio';
import { firstLetterNote, spell } from '@/lib/spell';
import { personalize, personalizeRom, syllables, joinThai, type Gender } from '@/lib/thai';

/** Tarjeta de «Palabra nueva»: imagen, thai grande, tono, audio, cómo se escribe y un ejemplo.
 *  `writing = false` en la primera curva: allí se aprende de oído y la escritura llega después. */
export function WordIntro({ word, example, gender, n, total, writing = true, onNext }: { word: Word; example?: Sentence; gender: Gender; n: number; total: number; writing?: boolean; onNext: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => say(word.th), 380);
    return () => clearTimeout(t);
  }, [word.th]);
  const ex = example ? joinThai(example.th.map((t) => personalize(t, gender))) : null;
  const oneSyllable = syllables(word.rom).length === 1;
  const glyphs = writing ? spell(word.th, word.rom) : null;
  const letterNote = writing ? firstLetterNote(word.th) : null;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 14 }}>
      <Txt v="eyebrow">
        Palabra nueva · {n} de {total}
      </Txt>
      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Sticker emoji={word.emoji} size={96} bg={color.niebla} rotate={-4} />
          <View style={{ flex: 1, gap: 2 }}>
            <Th size={52} bold numberOfLines={1} style={{ lineHeight: 74 }}>
              {word.th}
            </Th>
            <Rom rom={word.rom} size={20} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Txt v="h2" style={{ flex: 1 }}>{word.es}</Txt>
          {oneSyllable ? <ToneChip tone={mainTone(word.rom)} label={`tono ${mainToneName(word.rom)}`} /> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn v="blue" label="Escuchar" height={48} style={{ flex: 1 }} silent onPress={() => say(word.th)} icon={<Icon name="speaker" size={22} color="#FFFFFF" />} />
          <Btn v="ghost" label="Lento" height={48} style={{ flex: 1 }} silent onPress={() => say(word.th, { slow: true })} icon={<Icon name="turtle" size={22} color={color.cieloHondo} />} />
        </View>
      </Animated.View>
      {glyphs ? (
        <Animated.View entering={FadeInDown.delay(140)} style={{ gap: 6 }}>
          <Txt v="eyebrow">Cómo se escribe</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 16, rowGap: 6 }}>
            {glyphs.map((g, k) => (
              <View key={k} style={{ alignItems: 'center', minWidth: 28 }}>
                <Th size={30} style={{ lineHeight: 46, color: g.kind === 'tono' ? color.farol : g.label === 'muda' ? color.tinta3 : color.tinta }}>
                  {g.ch}
                </Th>
                <Txt v="small" style={{ fontSize: 12 }}>{g.label}</Txt>
              </View>
            ))}
          </View>
          {letterNote ? <Txt v="small" style={{ fontSize: 13 }}>{letterNote}</Txt> : null}
        </Animated.View>
      ) : null}
      {ex && example ? (
        <Animated.View entering={FadeInDown.delay(200)} style={[styles.card, { gap: 2, padding: 14 }]}>
          <Txt v="eyebrow" style={{ fontSize: 10 }}>En una frase</Txt>
          <Th size={20}>{ex}</Th>
          <Rom rom={personalizeRom(example.rom, gender)} size={13} />
          <Txt v="small">{example.es}</Txt>
        </Animated.View>
      ) : null}
      {word.note ? (
        <Animated.View entering={FadeInDown.delay(320)} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          <Noi pose="piensa" size={92} />
          <Speech tail="left" style={{ flex: 1, marginBottom: 22 }}>
            <Txt v="bodyStrong" style={{ fontSize: 14 }}>{word.note}</Txt>
          </Speech>
        </Animated.View>
      ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 }}>
        <Btn label="¡Entendido!" onPress={onNext} />
      </View>
    </View>
  );
}

function mainToneName(rom: string) {
  const t = mainTone(rom);
  return { M: 'medio', L: 'bajo', F: 'descendente', H: 'alto', R: 'ascendente' }[t];
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, gap: 14, ...shadow.card },
});
