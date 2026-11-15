import type { DailyReminder, ReminderPermission } from './reminder-config';

export const remindersSupported = false;
export const syncDailyReminder = async (_reminder: DailyReminder, _requestPermission = false): Promise<ReminderPermission> => 'unsupported';
export const prepareReminderNotifications = () => {};
export const observeReminderTaps = (_onOpen: () => void) => () => {};
