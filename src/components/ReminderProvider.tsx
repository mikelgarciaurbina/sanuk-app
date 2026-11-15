import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { type DailyReminder, type ReminderPermission } from '@/lib/reminder-config';
import { prepareReminderNotifications, remindersSupported, syncDailyReminder } from '@/lib/reminders';
import { useStore } from '@/lib/store';

type ReminderContextValue = {
  supported: boolean;
  busy: boolean;
  permission: ReminderPermission;
  error: string | null;
  change: (next: DailyReminder) => Promise<void>;
};
const ReminderContext = createContext<ReminderContextValue | null>(null);
const SAVE_ERROR = 'No he podido guardar el recordatorio. Vuelve a intentarlo.';

export function ReminderProvider({ children }: { children: ReactNode }) {
  const { p, ready, setSetting } = useStore();
  const reminder = p.settings.reminder;
  const current = useRef(reminder);
  const saveSetting = useRef(setSetting);
  const actionBusy = useRef(false);
  const seq = useRef(0);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<ReminderPermission>(remindersSupported ? 'unknown' : 'unsupported');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    current.current = reminder;
    saveSetting.current = setSetting;
  }, [reminder, setSetting]);
  useEffect(() => { prepareReminderNotifications(); }, []);
  useEffect(() => {
    if (!ready) return;
    let live = true;
    const refresh = async () => {
      // Cerrar el diálogo de permiso también activa AppState: no pisar esa operación del usuario.
      if (actionBusy.current) return;
      const id = ++seq.current;
      const value = current.current;
      try {
        const status = await syncDailyReminder(value);
        if (!live || id !== seq.current) return;
        setPermission(status);
        if (value.enabled && status !== 'allowed') saveSetting.current('reminder', { ...value, enabled: false });
      } catch {
        if (!live || id !== seq.current) return;
        setError(SAVE_ERROR);
      }
    };
    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => { live = false; subscription.remove(); };
  }, [ready, reminder]);

  const change = async (next: DailyReminder) => {
    if (actionBusy.current) return;
    actionBusy.current = true;
    seq.current += 1;
    setBusy(true);
    setError(null);
    try {
      const status = await syncDailyReminder(next, next.enabled);
      setPermission(status);
      const saved = { ...next, enabled: next.enabled && status === 'allowed' };
      current.current = saved;
      setSetting('reminder', saved);
    } catch {
      setError(SAVE_ERROR);
    } finally {
      actionBusy.current = false;
      setBusy(false);
    }
  };

  return <ReminderContext.Provider value={{ supported: remindersSupported, busy, permission, error, change }}>{children}</ReminderContext.Provider>;
}

export function useReminder() {
  const context = useContext(ReminderContext);
  if (!context) throw new Error('useReminder fuera de ReminderProvider');
  return context;
}
