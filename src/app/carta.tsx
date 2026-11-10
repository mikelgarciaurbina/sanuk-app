import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, font, shadow } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { MistBand } from '@/components/Scenery';
import { Bar, Btn, Rom, Th, Txt } from '@/components/ui';
import { letterProgress } from '@/content';
import { YAI_LETTER, type LetterToken } from '@/content/yai';
import { fx, say, stopSpeech } from '@/lib/audio';
import { useStore } from '@/lib/store';

/** La carta de Yai: cada palabra aprendida despeja su trozo de niebla. */
export default function Carta() {
  const { p } = useStore();
  const insets = useSafeAreaInsets();
  const prog = letterProgress(p);
  const [open, setOpen] = useState<LetterToken | null>(null);
  const [reading, setReading] = useState(false);
  const missing = prog.total - prog.cleared;

  const readAll = () => {
    if (reading) {
      stopSpeech();
      setReading(false);
      return;
    }
    setReading(true);
    say(YAI_LETTER.map((l) => l.tokens.map((t) => t.th).join('')).join(' '), { onDone: () => setReading(false) });
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.niebla }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={24} />
          </Pressable>
          <Txt v="h2" style={{ flex: 1 }}>La carta de Yai</Txt>
          <View style={styles.pct}>
            <Text style={styles.pctText}>{prog.pct} %</Text>
          </View>
        </View>

        <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.paper}>
          {YAI_LETTER.map((line, li) => {
            const lineKnown = line.tokens.every(prog.known);
            return (
              <View key={li} style={{ marginBottom: 6 }}>
                <View style={[styles.line, li >= YAI_LETTER.length - 2 && { justifyContent: 'flex-end' }]}>
                  {line.tokens.map((t, ti) => {
                    const k = prog.known(t);
                    return (
                      <Pressable
                        key={ti}
                        onPress={() => {
                          if (k) {
                            say(t.th);
                            setOpen(t);
                          } else {
                            fx.bad();
                            setOpen(null);
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={k ? `${t.th}: ${t.es}` : 'Palabra cubierta de niebla'}
                        style={styles.word}>
                        <Th size={21} style={k ? null : styles.fog}>
                          {t.th}
                        </Th>
                        <Text style={[styles.gloss, !k && { opacity: 0 }]} numberOfLines={1}>
                          {t.es}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {lineKnown ? (
                  <Animated.View entering={FadeIn}>
                    <Txt v="small" style={{ color: color.arrozalHondo, fontSize: 12 }}>{line.es}</Txt>
                  </Animated.View>
                ) : null}
              </View>
            );
          })}
          {prog.pct < 100 ? (
            <>
              <MistBand top={60} width={340} height={30} opacity={0.35} />
              <MistBand top={200} width={340} height={26} opacity={0.3} delay={700} distance={-30} />
            </>
          ) : null}
        </Animated.View>

        {open ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.pop}>
            <Th size={22} style={{ color: '#FFFFFF' }}>{open.th}</Th>
            <Rom rom={open.rom} mono="#C9D0EE" />
            <Txt v="bodyStrong" style={{ color: '#FFFFFF' }}>{open.es}</Txt>
          </Animated.View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Txt v="small" style={{ width: 92 }}>
            Entiendes el <Txt v="small" style={{ color: color.tinta }}>{prog.pct} %</Txt>
          </Txt>
          <Bar value={prog.pct / 100} tint={color.buatong} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <Noi pose={prog.pct >= 100 ? 'celebra' : 'feliz'} size={84} />
          <View style={[styles.card, { flex: 1, marginBottom: 12 }]}>
            <Txt v="bodyStrong" style={{ fontSize: 14 }}>
              {prog.pct >= 100
                ? p.reply
                  ? 'Yai ya tiene tu carta. Le ha hecho muy feliz.'
                  : '¡La entiendes entera! Ya puedes escribirle tu respuesta.'
                : `La niebla se despeja palabra a palabra. Te faltan ${missing}. Toca las palabras claras para oírlas.`}
            </Txt>
          </View>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 10 }}>
        <Btn v="blue" label={reading ? 'Parar' : 'Escuchar la voz de Yai'} onPress={readAll} silent icon={<Icon name={reading ? 'pause' : 'play'} size={20} color="#FFFFFF" />} />
        <Btn
          label={p.reply ? 'Ver tu respuesta y la de Yai' : prog.pct >= 100 ? 'Escribir a Yai' : 'Escribir a Yai · al 100 %'}
          disabled={prog.pct < 100 && !p.reply}
          onPress={() => router.push('/respuesta')}
          icon={prog.pct >= 100 || p.reply ? undefined : <Icon name="lock" size={18} color={color.tinta3} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pct: { paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: color.arrozalSuave, justifyContent: 'center' },
  pctText: { fontFamily: font.uiHeavy, fontSize: 14, color: color.arrozalHondo },
  paper: { backgroundColor: '#FFFDF7', borderRadius: 10, padding: 18, paddingTop: 20, overflow: 'hidden', transform: [{ rotate: '-1deg' }], ...shadow.card },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2 },
  word: { alignItems: 'center', minWidth: 28, paddingHorizontal: 1 },
  fog: { opacity: 0.18, textShadowColor: 'rgba(29,35,71,0.6)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
  gloss: { fontFamily: font.uiHeavy, fontSize: 10, color: color.arrozal, marginTop: -4, maxWidth: 90 },
  pop: { alignSelf: 'center', backgroundColor: color.tinta, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', gap: 2 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12, ...shadow.card },
});
