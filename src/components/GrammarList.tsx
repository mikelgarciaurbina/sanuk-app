import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { color, shadow } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Rom, Th, Txt } from '@/components/ui';
import { LESSONS, PATTERNS, SENTENCES, seasonOf, type LessonRef } from '@/content';
import type { Pattern } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { useStore } from '@/lib/store';
import { joinThai, personalize, personalizeRom } from '@/lib/thai';

const THAI = /[฀-๿]/;

/** Las chuletas de gramática: cada patrón que ya ha salido en el camino, para repasarlo cuando haga falta. */
export function GrammarList({ header, top }: { header: React.ReactNode; top: number }) {
  const { p } = useStore();
  const [open, setOpen] = useState<string | null>(null);

  const { seen, total } = useMemo(() => {
    const out: { pattern: Pattern; lesson: LessonRef }[] = [];
    let n = 0;
    for (const l of LESSONS)
      for (const id of l.patterns ?? []) {
        const pattern = PATTERNS[id];
        if (!pattern) continue;
        n += 1;
        if (p.completed[l.id] || l.stop.n < p.profile.startStop) out.push({ pattern, lesson: l });
      }
    return { seen: out, total: n };
  }, [p.completed, p.profile.startStop]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: top + 12, paddingBottom: 30, gap: 12 }}>
      {header}
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {seen.length === 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Noi pose="piensa" size={96} />
            <View style={[styles.card, { flex: 1 }]}>
              <Txt v="bodyStrong" style={{ fontSize: 14, color: color.tinta }}>Aquí se guardan las chuletas de gramática.</Txt>
              <Txt v="small">Cada vez que el camino te explique cómo se monta una frase, la tendrás aquí para volver a mirarla.</Txt>
            </View>
          </View>
        ) : (
          <Txt v="small">
            {seen.length} de {total} chuletas · toca una para abrirla y oír sus ejemplos
          </Txt>
        )}
        {seen.map(({ pattern, lesson }, i) => {
          const on = open === pattern.id;
          const mark = new Set(pattern.mark ?? []);
          return (
            <Animated.View key={pattern.id} entering={FadeInDown.delay(Math.min(i, 8) * 40)}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                onPress={() => {
                  fx.tap();
                  setOpen(on ? null : pattern.id);
                }}
                style={[styles.card, on && styles.cardOn]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt v="eyebrow" style={{ fontSize: 10 }}>
                      {seasonOf(lesson.stop) === 2 ? lesson.stop.month : `Parada ${lesson.stop.n}`} · {lesson.title}
                    </Txt>
                    <Txt v="h3" style={{ fontSize: 17 }}>{pattern.title}</Txt>
                  </View>
                  <Icon name={on ? 'check' : 'back'} size={18} color={color.tinta3} />
                </View>
                {pattern.formula ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    {pattern.formula.split(/\s*\+\s*/).map((piece, k) => (
                      <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {k > 0 ? <Txt v="bodyStrong" style={{ color: color.tinta3 }}>+</Txt> : null}
                        <View style={[styles.piece, THAI.test(piece) ? styles.pieceThai : null]}>
                          {THAI.test(piece) ? <Th size={17} bold>{piece}</Th> : <Txt v="small" style={{ color: color.tinta }}>{piece}</Txt>}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
                {on ? (
                  <View style={{ gap: 8, marginTop: 10 }}>
                    <Txt v="body" style={{ fontSize: 14, lineHeight: 20, color: color.tinta }}>{pattern.rule}</Txt>
                    {pattern.examples.map((id) => {
                      const s = SENTENCES[id];
                      if (!s) return null;
                      const g = p.profile.gender;
                      return (
                        <Pressable key={id} onPress={() => say(joinThai(s.th.map((t) => personalize(t, g))))} accessibilityRole="button" accessibilityLabel={`Escuchar: ${s.es}`} style={styles.example}>
                          <View style={{ flex: 1, gap: 1 }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 4 }}>
                              {s.th.map((raw, k) => {
                                const th = personalize(raw, g);
                                const hit = mark.has(raw) || mark.has(th);
                                return (
                                  <Th key={k} size={19} bold={hit} style={{ color: hit ? color.lacaHondo : color.tinta }}>
                                    {th}
                                  </Th>
                                );
                              })}
                            </View>
                            <Rom rom={personalizeRom(s.rom, g)} size={12} />
                            <Txt v="small" style={{ fontSize: 12 }}>{s.es}</Txt>
                          </View>
                          <Icon name="speaker" size={20} color={color.cieloHondo} />
                        </Pressable>
                      );
                    })}
                    {pattern.trap ? (
                      <View style={styles.trap}>
                        <Txt v="small" style={{ color: color.tinta }}>
                          <Txt v="small" style={{ color: color.lacaHondo }}>Ojo: </Txt>
                          {pattern.trap}
                        </Txt>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 20, backgroundColor: '#FFFFFF', gap: 2, borderWidth: 2, borderColor: 'transparent', ...shadow.card },
  cardOn: { borderColor: color.cielo },
  piece: { paddingHorizontal: 9, minHeight: 28, borderRadius: 10, backgroundColor: color.niebla2, alignItems: 'center', justifyContent: 'center' },
  pieceThai: { backgroundColor: '#FFE9B8' },
  example: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: color.niebla },
  trap: { padding: 10, borderRadius: 14, backgroundColor: color.lacaSuave },
});
