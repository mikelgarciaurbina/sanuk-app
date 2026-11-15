import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { color, shadow } from '@/brand/tokens';
import { Btn, Txt } from '@/components/ui';
import type { DailyReminder } from '@/lib/reminder-config';

export type ReminderTimePickerProps = {
  value: DailyReminder;
  onCancel: () => void;
  onConfirm: (hour: number, minute: number) => void;
};

export function ReminderTimePicker({ value, onCancel, onConfirm }: ReminderTimePickerProps) {
  const [date, setDate] = useState(() => {
    const time = new Date();
    time.setHours(value.hour, value.minute, 0, 0);
    return time;
  });
  if (Platform.OS === 'android') {
    return <DateTimePicker value={date} mode="time" is24Hour onChange={(event, selected) => {
      if (event.type === 'set' && selected) onConfirm(selected.getHours(), selected.getMinutes());
      else onCancel();
    }} />;
  }
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <SafeAreaProvider>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Txt v="h2">Tu ratito de thai</Txt>
          <Txt v="small">¿A qué hora quieres que te avise Noi?</Txt>
          <DateTimePicker value={date} mode="time" display="spinner" locale="es-ES" themeVariant="light" textColor={color.tinta} style={{ width: '100%', height: 190 }} onChange={(_, selected) => { if (selected) setDate(selected); }} />
          <Btn label="Guardar hora" onPress={() => onConfirm(date.getHours(), date.getMinutes())} />
          <Btn v="ghost" label="Cancelar" height={44} onPress={onCancel} />
        </View>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(29,35,71,0.4)', padding: 16 },
  card: { width: '100%', maxWidth: 380, padding: 16, borderRadius: 24, backgroundColor: color.niebla, gap: 12, ...shadow.card },
});
