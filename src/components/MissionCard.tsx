import { Pressable, StyleSheet, View } from 'react-native';

import { color, shadow } from '@/brand/tokens';
import { Art, Icon } from '@/components/icons';
import { Btn, Rom, Th, Txt } from '@/components/ui';
import type { Stop } from '@/content';
import { fx, say } from '@/lib/audio';
import { useStore } from '@/lib/store';
import { personalize, personalizeRom } from '@/lib/thai';

/** La misión de un mes de la temporada 2: algo que hacer de verdad, con tu pareja o tu familia, en thai. */
export function MissionCard({ stop, compact }: { stop: Stop; compact?: boolean }) {
  const { p, completeMission } = useStore();
  const m = stop.mission;
  if (!m) return null;
  const done = p.missions.includes(stop.id);
  const th = personalize(m.th, p.profile.gender);
  const rom = personalizeRom(m.rom, p.profile.gender);

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Art name="farol" size={26} />
        <Txt v="eyebrow" style={{ color: done ? color.arrozal : color.farol, flex: 1, fontSize: 11 }}>
          Misión de {stop.month?.toLowerCase()} · en la vida real
        </Txt>
        {done ? <Icon name="check" size={20} color={color.arrozal} stroke={3} /> : null}
      </View>
      <Txt v="bodyStrong" style={{ fontSize: compact ? 14 : 16 }}>{m.es}</Txt>
      <Pressable onPress={() => say(th)} accessibilityRole="button" accessibilityLabel={`Escuchar: ${th}`} style={styles.phrase}>
        <View style={{ flex: 1, gap: 2 }}>
          <Th size={compact ? 18 : 20}>{th}</Th>
          <Rom rom={rom} size={13} />
        </View>
        <Icon name="speaker" size={22} color={color.cieloHondo} />
      </Pressable>
      {m.tip && !compact ? <Txt v="small">{m.tip}</Txt> : null}
      {done ? (
        <Txt v="small" style={{ color: color.arrozal }}>¡Misión cumplida! Ganaste 30 plátanos.</Txt>
      ) : (
        <Btn
          v="ok"
          label="¡Hecha! +30 plátanos"
          onPress={() => {
            fx.coin();
            completeMission(stop.id);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF6EC', borderRadius: 20, padding: 16, gap: 10, borderWidth: 2, borderColor: '#FFD9B8', ...shadow.card },
  cardDone: { backgroundColor: '#F1F8EE', borderColor: '#CFE6C6' },
  phrase: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12 },
});
