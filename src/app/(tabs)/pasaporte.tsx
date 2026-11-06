import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, font, shadow } from '@/brand/tokens';
import { Art, Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { MissionCard } from '@/components/MissionCard';
import { Btn, Th, Txt } from '@/components/ui';
import { HAS_SEASON_2, SEASON_2_STOPS, STOPS, TOTAL_CURVES, letterProgress, moonsDone, seasonOf } from '@/content';
import { fx } from '@/lib/audio';
import { fmt } from '@/lib/format';
import { todayKey } from '@/lib/random';
import { streakStatus, useStore } from '@/lib/store';

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const STAMP_COLORS = [color.laca, color.mohom, color.arrozal, color.azafranHondo, color.cieloHondo, color.teca];
const ROAD_STOPS = STOPS.filter((s) => seasonOf(s) === 1);

/** El pasaporte: sellos de cada parada, la racha de farolillos y los ajustes. */
export default function Pasaporte() {
  const { p, setSetting, setProfile, reset } = useStore();
  const insets = useSafeAreaInsets();
  const streak = streakStatus(p);
  const letter = letterProgress(p);
  const [confirm, setConfirm] = useState(false);
  const words = Object.keys(p.words).length;
  const lessons = Object.keys(p.completed).length;
  const answered = Object.values(p.words).reduce((a, w) => a + w.ok + w.bad, 0);
  const ok = Object.values(p.words).reduce((a, w) => a + w.ok, 0);

  // semana actual (lunes → domingo)
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const week = DAYS.map((d, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const k = todayKey(day);
    return { d, lit: p.streak.days.includes(k), today: k === todayKey() };
  });

  const doReset = () => {
    if (Platform.OS === 'web') {
      if (confirm) {
        reset();
        router.replace('/onboarding');
      } else setConfirm(true);
      return;
    }
    Alert.alert('¿Empezar de cero?', 'Se borrará todo tu progreso en este dispositivo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          reset();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.niebla }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40, paddingHorizontal: 20, gap: 14 }}>
      <Txt v="h1" style={{ fontSize: 26 }}>Pasaporte</Txt>

      <View style={styles.passport}>
        <View style={styles.lanna} />
        <View style={styles.avatar}>
          <Noi pose="feliz" size={72} still />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt v="eyebrow" style={{ color: color.buatong, fontSize: 11 }}>
            Viajero · <Th size={11} style={{ color: color.buatong, lineHeight: 16 }}>{p.profile.gender === 'm' ? 'ครับ' : 'ค่ะ'}</Th>
          </Txt>
          <Txt v="h2" style={{ color: '#FFFFFF' }}>Curva {fmt(p.curves)}</Txt>
          <Txt v="small" style={{ color: '#C9D0EE' }}>de {fmt(TOTAL_CURVES)} hasta la casa de Yai</Txt>
        </View>
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt v="h3">Racha: {streak.count} {streak.count === 1 ? 'farolillo' : 'farolillos'}</Txt>
          <View style={styles.chip}>
            <Art name="paraguas" size={18} />
            <Txt v="small" style={{ color: color.tinta }}>{p.streak.umbrellas} paraguas</Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {week.map((w) => (
            <View key={w.d} style={{ alignItems: 'center', gap: 4 }}>
              {w.lit ? (
                <Animated.View entering={ZoomIn.springify()}>
                  <Art name="farol" size={32} />
                </Animated.View>
              ) : (
                <View style={[styles.dayEmpty, w.today && { borderColor: color.farol }]} />
              )}
              <Txt v="small" style={{ fontSize: 11, color: w.today ? color.tinta : color.tinta3 }}>{w.today ? 'Hoy' : w.d}</Txt>
            </View>
          ))}
        </View>
        {streak.atRisk ? <Txt v="small" style={{ color: color.farol }}>Tu farolillo de hoy aún está apagado. Una lección corta y vuelve a brillar.</Txt> : null}
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Txt v="h3">Sellos de las paradas</Txt>
          <Txt v="small">
            {ROAD_STOPS.filter((s) => p.stamps.includes(s.id)).length} de {ROAD_STOPS.length}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {ROAD_STOPS.map((s, i) => {
            const got = p.stamps.includes(s.id);
            const c = STAMP_COLORS[i % STAMP_COLORS.length];
            return (
              <View
                key={s.id}
                accessibilityLabel={got ? `Sello de ${s.place}` : `Parada ${s.n} sin sellar`}
                style={[styles.stamp, got ? { borderColor: c, borderStyle: 'dashed', transform: [{ rotate: `${((i * 37) % 17) - 8}deg` }] } : null]}>
                <Text style={[styles.stampText, { color: got ? c : color.tinta3 }]} numberOfLines={3}>
                  {got ? s.stamp : s.n}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {HAS_SEASON_2 ? (
        <View style={[styles.card, { backgroundColor: '#FFFBEA' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Txt v="h3">Las lunas del pueblo</Txt>
            <Txt v="small">
              {moonsDone(p)} de {SEASON_2_STOPS.length}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {SEASON_2_STOPS.map((s, i) => {
              const got = p.stamps.includes(s.id);
              return (
                <View
                  key={s.id}
                  accessibilityLabel={got ? `Luna de ${s.month}` : `${s.month}, sin completar`}
                  style={[styles.stamp, styles.moon, got ? { borderColor: '#E8A600', backgroundColor: '#FFF3C4', transform: [{ rotate: `${((i * 41) % 13) - 6}deg` }] } : null]}>
                  {got ? <Art name="luna" size={26} /> : null}
                  <Text style={[styles.stampText, { color: got ? '#8A5A00' : color.tinta3 }]} numberOfLines={1}>
                    {s.month}
                  </Text>
                </View>
              );
            })}
          </View>
          {SEASON_2_STOPS.filter((s) => p.stamps.includes(s.id) && s.mission).length ? (
            <View style={{ gap: 10 }}>
              <Txt v="eyebrow" style={{ color: color.farol }}>Misiones en la vida real</Txt>
              {SEASON_2_STOPS.filter((s) => p.stamps.includes(s.id) && s.mission).map((s) => (
                <MissionCard key={s.id} stop={s} compact />
              ))}
            </View>
          ) : (
            <Txt v="small">Cada mes que completes trae una misión para practicar con tu pareja o tu familia.</Txt>
          )}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat v={words} l="palabras" />
        <Stat v={lessons} l="lecciones" />
        <Stat v={answered ? `${Math.round((ok / answered) * 100)} %` : '—'} l="precisión" tint={color.arrozal} />
      </View>

      <Pressable onPress={() => router.push('/carta')} accessibilityRole="button" style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFDF7' }]}>
        <Art name="carta" size={40} />
        <View style={{ flex: 1 }}>
          <Txt v="h3">La carta de Yai</Txt>
          <Txt v="small">Ya entiendes el {letter.pct} %</Txt>
        </View>
        <Icon name="arrow" size={22} />
      </Pressable>

      <View style={styles.card}>
        <Txt v="h3">Ajustes</Txt>
        <Setting label="Sonidos" value={p.settings.sound} onChange={(v) => setSetting('sound', v)} />
        <Setting label="Vibración" value={p.settings.haptics} onChange={(v) => setSetting('haptics', v)} />
        <Setting label="Transcripción con tonos" value={p.settings.romanization} onChange={(v) => setSetting('romanization', v)} />
        <Setting label="Voz thai más lenta" value={p.settings.voiceRate < 0.8} onChange={(v) => setSetting('voiceRate', v ? 0.7 : 0.85)} />
        <Row label="Partícula">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['m', 'f'] as const).map((g) => (
              <Pressable
                key={g}
                accessibilityRole="button"
                accessibilityState={{ selected: p.profile.gender === g }}
                onPress={() => {
                  fx.tap();
                  setProfile({ gender: g });
                }}
                style={[styles.seg, p.profile.gender === g && styles.segOn]}>
                <Th size={16} style={{ color: p.profile.gender === g ? '#FFFFFF' : color.tinta }}>
                  {g === 'm' ? 'ครับ' : 'ค่ะ'}
                </Th>
              </Pressable>
            ))}
          </View>
        </Row>
        <Row label="Meta diaria">
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[30, 60, 90, 120].map((g) => (
              <Pressable key={g} accessibilityRole="button" accessibilityState={{ selected: p.profile.goal === g }} onPress={() => setProfile({ goal: g })} style={[styles.seg, p.profile.goal === g && styles.segOn]}>
                <Text style={{ fontFamily: font.uiHeavy, fontSize: 12, color: p.profile.goal === g ? '#FFFFFF' : color.tinta }}>{g}</Text>
              </Pressable>
            ))}
          </View>
        </Row>
      </View>

      <Btn label={confirm ? 'Toca otra vez para borrar todo' : 'Empezar de cero'} v="ghost" onPress={doReset} />
      <Txt v="small" style={{ textAlign: 'center' }}>Sanuk · Thai, curva a curva</Txt>
    </ScrollView>
  );
}

function Stat({ v, l, tint }: { v: string | number; l: string; tint?: string }) {
  return (
    <View style={[styles.card, { flex: 1, alignItems: 'center', gap: 2, padding: 12 }]}>
      <Txt v="num" style={{ color: tint ?? color.tinta }}>{v}</Txt>
      <Txt v="small" style={{ fontSize: 12 }}>{l}</Txt>
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
      <Txt v="bodyStrong" style={{ fontSize: 15 }}>{label}</Txt>
      {children}
    </View>
  );
}

function Setting({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row label={label}>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color.arrozalVivo, false: color.niebla3 }} thumbColor="#FFFFFF" accessibilityLabel={label} />
    </Row>
  );
}

const styles = StyleSheet.create({
  passport: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: color.mohom, overflow: 'hidden' },
  lanna: { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, borderWidth: 14, borderColor: '#33449A' },
  avatar: { width: 76, height: 76, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, gap: 12, ...shadow.card },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 999, borderWidth: 2, borderColor: color.niebla3 },
  dayEmpty: { width: 30, height: 32, borderRadius: 15, borderWidth: 2.5, borderStyle: 'dashed', borderColor: color.niebla3 },
  stamp: { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, borderColor: color.niebla3, alignItems: 'center', justifyContent: 'center', backgroundColor: color.niebla },
  stampText: { fontFamily: font.uiBlack, fontSize: 9, textAlign: 'center', paddingHorizontal: 4 },
  moon: { width: 64, height: 64, borderRadius: 32, gap: 0 },
  seg: { minWidth: 44, height: 36, paddingHorizontal: 10, borderRadius: 12, borderWidth: 2, borderColor: color.niebla3, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: color.tinta, borderColor: color.tinta },
});
