import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, font, shadow } from '@/brand/tokens';
import { GrammarList } from '@/components/GrammarList';
import { Btn, Rom, Th, Txt } from '@/components/ui';
import { MIN_REVIEW_WORDS, STOPS, canReview, dueWords, introducedIds, wordsOf } from '@/content';
import type { Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { useStore, type WordStat } from '@/lib/store';

/** El palabrario: todas las palabras del camino; cada una «crece» con el repaso. */
export default function Palabras() {
  const { p } = useStore();
  const insets = useSafeAreaInsets();
  const [stop, setStop] = useState<string>('todas');
  const [tab, setTab] = useState<'palabras' | 'gramatica'>('palabras');
  const due = dueWords(p);
  const learned = introducedIds(p).size;
  const open = canReview(p);
  // con muy pocas palabras presentadas, los juegos del repaso no tendrían opciones que dar
  const few = learned < MIN_REVIEW_WORDS;

  const words = useMemo(() => {
    const stops = stop === 'todas' ? STOPS : STOPS.filter((s) => s.id === stop);
    const seen = new Set<string>();
    const out: Word[] = [];
    for (const s of stops) for (const l of s.lessons) for (const w of wordsOf(l.words))
          if (!seen.has(w.id)) {
            seen.add(w.id);
            out.push(w);
          }
    return out;
  }, [stop]);

  /** Palabras o chuletas de gramática: lo que ya has visto en el camino. */
  const tabs = (
    <View style={styles.tabs}>
      {(['palabras', 'gramatica'] as const).map((t) => (
        <Pressable
          key={t}
          accessibilityRole="button"
          accessibilityState={{ selected: tab === t }}
          onPress={() => {
            fx.tap();
            setTab(t);
          }}
          style={[styles.tab, tab === t && styles.tabOn]}>
          <Text style={[styles.tabText, tab === t && { color: color.tinta }]}>{t === 'palabras' ? 'Palabras' : 'Gramática'}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (tab === 'gramatica')
    return (
      <View style={{ flex: 1, backgroundColor: color.niebla }}>
        <GrammarList
          top={insets.top}
          header={
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Txt v="h1" style={{ fontSize: 26 }}>Tus chuletas</Txt>
                <Txt v="small">Gramática en un minuto: cómo se montan las frases en thai</Txt>
              </View>
              {tabs}
            </View>
          }
        />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: color.niebla }}>
      <FlatList
        data={words}
        keyExtractor={(w) => w.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 30, gap: 12 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 2 }}>
            <View style={{ paddingHorizontal: 20, gap: 4 }}>
              <Txt v="h1" style={{ fontSize: 26 }}>Tu palabrario</Txt>
              <Txt v="small">
                {learned} palabras vistas · cada palabra crece de semilla a flor con el repaso
              </Txt>
            </View>
            <View style={{ paddingHorizontal: 20 }}>{tabs}</View>
            <View style={[styles.review, { marginHorizontal: 20 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="h3">{few ? 'El repaso se abre pronto' : due.length ? `${due.length} ${due.length === 1 ? 'palabra pide' : 'palabras piden'} repaso` : 'Todo al día'}</Txt>
                <Txt v="small">
                  {few ? 'Aprende unas palabras más en el camino y aquí podrás repasarlas.' : due.length ? 'Cinco minutos y vuelven a florecer.' : 'Vuelve mañana: el repaso espaciado hace el resto.'}
                </Txt>
              </View>
              <Btn label="Repasar" v={open ? 'primary' : 'off'} disabled={!open} onPress={() => router.push('/leccion/repaso')} style={{ width: 120 }} height={48} />
            </View>
            <FlatList
              horizontal
              data={['todas', ...STOPS.map((s) => s.id)]}
              keyExtractor={(x) => x}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
              renderItem={({ item }) => {
                const s = STOPS.find((x) => x.id === item);
                const on = stop === item;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      fx.tap();
                      setStop(item);
                    }}
                    style={[styles.filter, on && styles.filterOn]}>
                    <Text style={[styles.filterText, on && { color: '#FFFFFF' }]}>{s ? `${s.n} · ${s.place.split(' · ')[0]}` : 'Todas'}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        }
        renderItem={({ item }) => <WordCard w={item} st={p.words[item.id]} />}
      />
    </View>
  );
}

const STAGES = ['Semilla', 'Brote', 'Hojas', 'Capullo', 'Flor', 'Bua tong'];

function WordCard({ w, st }: { w: Word; st?: WordStat }) {
  const known = !!st;
  const s = st?.s ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={known ? `${w.th}, ${w.es}` : 'Palabra por descubrir'}
      onPress={() => known && say(w.th)}
      style={[styles.card, !known && { opacity: 0.55 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 26 }}>{known ? (w.emoji ?? '✨') : '🌫️'}</Text>
        <View style={{ flexDirection: 'row', gap: 3 }} accessibilityLabel={`Nivel ${STAGES[s]}`}>
          {[1, 2, 3, 4, 5].map((k) => (
            <View key={k} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: k <= s ? color.arrozalVivo : color.niebla3 }} />
          ))}
        </View>
      </View>
      <Th size={24} numberOfLines={1} style={!known ? { opacity: 0.35 } : null}>
        {w.th}
      </Th>
      {known ? <Rom rom={w.rom} size={13} /> : null}
      <Txt v="small" numberOfLines={2} style={{ color: known ? color.tinta2 : color.tinta3 }}>
        {known ? w.es : 'Aún entre la niebla'}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: color.niebla3 },
  tab: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: '#FFFFFF', ...shadow.card },
  tabText: { fontFamily: font.uiHeavy, fontSize: 14, color: color.tinta2 },
  review: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: '#FFFFFF', ...shadow.card },
  filter: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3, justifyContent: 'center' },
  filterOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  filterText: { fontFamily: font.uiHeavy, fontSize: 13, color: color.tinta2 },
  card: { flex: 1, padding: 12, gap: 2, borderRadius: 18, backgroundColor: '#FFFFFF', ...shadow.card },
});
