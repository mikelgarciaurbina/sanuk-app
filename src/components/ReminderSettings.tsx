import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { color } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { useReminder } from '@/components/ReminderProvider';
import { ReminderTimePicker } from '@/components/ReminderTimePicker';
import { Btn, Txt } from '@/components/ui';
import { REMINDER_BODY, reminderTime } from '@/lib/reminder-config';
import { useStore } from '@/lib/store';

export function ReminderSettings() {
  const { p } = useStore();
  const reminder = p.settings.reminder;
  const { supported, busy, permission, error, change } = useReminder();
  const [picking, setPicking] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const blocked = permission === 'blocked';
  const enabled = reminder.enabled && !blocked;
  const time = reminderTime(reminder);
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Txt v="bodyStrong" style={{ flex: 1, fontSize: 15 }}>Recordatorio diario</Txt>
        <Switch value={enabled} disabled={!supported || busy} onValueChange={(value) => { void change({ ...reminder, enabled: value }); }} trackColor={{ true: color.arrozalVivo, false: color.niebla3 }} thumbColor="#FFFFFF" accessibilityLabel="Recordatorio diario" accessibilityState={{ busy }} />
      </View>
      <Pressable disabled={!supported || busy} onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={`Hora del recordatorio, ${time}. Cambiar hora`} accessibilityState={{ disabled: !supported || busy }} style={[styles.row, styles.time]}>
        <Txt v="bodyStrong" style={{ flex: 1, fontSize: 15 }}>Hora</Txt>
        <Txt v="h3" style={{ color: color.cieloHondo }}>{time}</Txt>
        <Icon name="arrow" size={18} color={color.cieloHondo} />
      </Pressable>
      <View style={styles.preview}>
        <Noi pose="hola" size={56} still />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="bodyStrong" style={{ fontSize: 14 }}>Noi 🐘</Txt>
          <Txt v="small">{REMINDER_BODY}</Txt>
        </View>
      </View>
      <View accessible accessibilityLiveRegion="polite"><Txt v="small">
        {!supported ? 'Los recordatorios están disponibles en la app de iPhone, iPad y Android.'
          : busy ? 'Guardando tu recordatorio…'
            : blocked ? 'Las notificaciones de Sanuk están desactivadas en los ajustes del dispositivo.'
              : enabled ? `Noi te avisará cada día a las ${time}, según la hora de tu dispositivo.`
                : 'Actívalo cuando quieras que Noi te recuerde practicar.'}
      </Txt></View>
      {blocked && supported ? <Btn label="Abrir ajustes" v="ghost" height={44} onPress={() => {
        setSettingsError(false);
        Linking.openSettings().catch(() => setSettingsError(true));
      }} /> : null}
      {error || settingsError ? <View accessible accessibilityRole="alert"><Txt v="small" style={{ color: color.lacaHondo }}>{settingsError ? 'No he podido abrir Ajustes. Busca Sanuk en los ajustes del dispositivo.' : error}</Txt></View> : null}
      {picking ? <ReminderTimePicker value={reminder} onCancel={() => setPicking(false)} onConfirm={(hour, minute) => {
        setPicking(false);
        void change({ ...reminder, hour, minute });
      }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.niebla3, gap: 10 },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  time: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: color.cieloSuave },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 16, backgroundColor: '#FFF6DF' },
});
