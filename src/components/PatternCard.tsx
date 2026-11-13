import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { color, shadow } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Btn, Rom, Speech, Th, Txt } from '@/components/ui';
import { SENTENCES } from '@/content';
import type { Pattern } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { joinThai, personalize, personalizeRom, type Gender } from '@/lib/thai';

const THAI = /[฀-๿]/;

/**
 * Gramática en un minuto: la fórmula del patrón, la regla en una frase, dos o tres ejemplos que se oyen al tocarlos
 * y la trampa típica de quien viene del español. Va justo antes de los juegos de frases que lo practican.
 */
export function PatternCard({ pattern, gender, onNext }: { pattern: Pattern; gender: Gender; onNext: () => void }) {
  const examples = pattern.examples.map((id) => SENTENCES[id]).filter(Boolean);
  const [heard, setHeard] = useState<string | null>(null);
  const mark = new Set(pattern.mark ?? []);
  const pieces = pattern.formula?.split(/\s*\+\s*/).filter(Boolean) ?? [];

  const play = (id: string) => {
    const s = SENTENCES[id];
    if (!s) return;
    fx.tap();
    setHeard(id);
    say(joinThai(s.th.map((t) => personalize(t, gender))), { onDone: () => setHeard((h) => (h === id ? null : h)) });
  };

  // el primer ejemplo suena solo, para que la regla entre también por el oído
  const first = examples[0]?.id;
  useEffect(() => {
    if (!first) return;
    const s = SENTENCES[first];
    const t = setTimeout(() => say(joinThai(s.th.map((x) => personalize(x, gender)))), 700);
    return () => clearTimeout(t);
  }, [first, gender]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 14 }}>
        <View style={{ gap: 2 }}>
          <Txt v="eyebrow" style={{ color: color.cieloHondo }}>Gramática en un minuto</Txt>
          <Txt v="h1" style={{ fontSize: 26 }}>{pattern.title}</Txt>
        </View>

        {pieces.length ? (
          <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.formula}>
            {pieces.map((piece, i) => {
              const thai = THAI.test(piece);
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {i > 0 ? <Txt v="h2" style={{ color: color.tinta3 }}>+</Txt> : null}
                  <View style={[styles.piece, thai ? styles.pieceThai : null]}>
                    {thai ? <Th size={22} bold style={{ color: color.tinta }}>{piece}</Th> : <Txt v="bodyStrong" style={{ fontSize: 15, color: color.tinta }}>{piece}</Txt>}
                  </View>
                </View>
              );
            })}
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(120)} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          <Noi pose="piensa" size={88} />
          <Speech tail="left" style={{ flex: 1, marginBottom: 20 }}>
            <Txt v="bodyStrong" style={{ fontSize: 15, lineHeight: 21, color: color.tinta }}>{pattern.rule}</Txt>
          </Speech>
        </Animated.View>

        {examples.length ? (
          <Animated.View entering={FadeInDown.delay(220)} style={{ gap: 8 }}>
            <Txt v="eyebrow">Así suena · toca para oírlo</Txt>
            {examples.map((s) => {
              const on = heard === s.id;
              return (
                <Pressable key={s.id} onPress={() => play(s.id)} accessibilityRole="button" accessibilityLabel={`Escuchar: ${s.es}`} style={[styles.example, on && styles.exampleOn]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 5 }}>
                      {s.th.map((raw, i) => {
                        const th = personalize(raw, gender);
                        const hit = mark.has(raw) || mark.has(th);
                        return (
                          <View key={i} style={hit ? styles.hit : null}>
                            <Th size={22} bold={hit} style={{ color: hit ? color.lacaHondo : color.tinta }}>{th}</Th>
                          </View>
                        );
                      })}
                    </View>
                    <Rom rom={personalizeRom(s.rom, gender)} size={13} />
                    <Txt v="small" style={{ color: color.tinta2 }}>{s.es}</Txt>
                  </View>
                  <Icon name="speaker" size={22} color={on ? color.laca : color.cieloHondo} />
                </Pressable>
              );
            })}
          </Animated.View>
        ) : null}

        {pattern.trap ? (
          <Animated.View entering={FadeInDown.delay(320)} style={styles.trap}>
            <Txt v="eyebrow" style={{ color: color.lacaHondo, fontSize: 10 }}>Ojo</Txt>
            <Txt v="body" style={{ fontSize: 14, lineHeight: 20, color: color.tinta }}>{pattern.trap}</Txt>
          </Animated.View>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 }}>
        <Btn label="¡Entendido! A practicarlo" onPress={onNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formula: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 14, borderRadius: 22, backgroundColor: '#FFFFFF', ...shadow.card },
  piece: { paddingHorizontal: 12, minHeight: 40, borderRadius: 14, backgroundColor: color.niebla2, alignItems: 'center', justifyContent: 'center' },
  pieceThai: { backgroundColor: '#FFE9B8', borderWidth: 2, borderColor: color.azafran },
  example: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: 'transparent', ...shadow.card },
  exampleOn: { borderColor: color.cielo },
  hit: { borderBottomWidth: 3, borderBottomColor: color.laca, borderRadius: 2 },
  trap: { gap: 4, padding: 14, borderRadius: 18, backgroundColor: color.lacaSuave, borderWidth: 2, borderColor: '#F6C7BE' },
});
