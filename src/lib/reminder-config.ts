export type DailyReminder = { enabled: boolean; hour: number; minute: number };
export type ReminderPermission = 'unknown' | 'undetermined' | 'allowed' | 'blocked' | 'unsupported';

export const DEFAULT_REMINDER: DailyReminder = { enabled: false, hour: 19, minute: 0 };
export const REMINDER_ID = 'sanuk-daily-reminder';
export const REMINDER_TITLE = 'Noi 🐘';
export const REMINDER_BODY = '¿Hacemos una curva más? Tu ratito de thai te espera.';

/** También hidrata perfiles guardados antes de que existieran los recordatorios. */
export function normalizeReminder(value?: Partial<DailyReminder> | null): DailyReminder {
  const hour = value?.hour;
  const minute = value?.minute;
  return {
    enabled: value?.enabled === true,
    hour: typeof hour === 'number' && Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_REMINDER.hour,
    minute: typeof minute === 'number' && Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : DEFAULT_REMINDER.minute,
  };
}

export const reminderTime = ({ hour, minute }: DailyReminder) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
