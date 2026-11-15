import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { REMINDER_BODY, REMINDER_ID, REMINDER_TITLE, normalizeReminder, type DailyReminder, type ReminderPermission } from './reminder-config';

export const remindersSupported = true;
let queue = Promise.resolve();

function permissionOf(permission: Notifications.NotificationPermissionsStatus): ReminderPermission {
  if (permission.ios) {
    const status = permission.ios.status;
    if ([IosAuthorizationStatus.AUTHORIZED, IosAuthorizationStatus.PROVISIONAL, IosAuthorizationStatus.EPHEMERAL].includes(status)) return 'allowed';
    return status === IosAuthorizationStatus.NOT_DETERMINED ? 'undetermined' : 'blocked';
  }
  return permission.granted ? 'allowed' : permission.status === 'undetermined' ? 'undetermined' : 'blocked';
}

function matches(request: Notifications.NotificationRequest, reminder: DailyReminder) {
  const trigger = request.trigger;
  if (!trigger || !('type' in trigger)) return false;
  const components = 'dateComponents' in trigger ? trigger.dateComponents : null;
  // En iOS, DAILY se devuelve como un calendario recurrente; Android conserva el tipo daily.
  const sameTime = trigger.type === 'daily'
    ? trigger.hour === reminder.hour && trigger.minute === reminder.minute
    : trigger.type === 'calendar' && trigger.repeats && components !== null && typeof components === 'object'
      && 'hour' in components && 'minute' in components && components.hour === reminder.hour && components.minute === reminder.minute;
  return sameTime && request.content.title === REMINDER_TITLE && request.content.body === REMINDER_BODY;
}

/** Una operación a la vez: una actualización antigua no puede volver a activar un aviso cancelado. */
export function syncDailyReminder(value: DailyReminder, requestPermission = false): Promise<ReminderPermission> {
  const reminder = normalizeReminder(value);
  const run = queue.then(async () => {
    if (!reminder.enabled) {
      // Cancelar no depende de poder consultar o volver a pedir permisos.
      await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
      await Notifications.dismissNotificationAsync(REMINDER_ID);
      return permissionOf(await Notifications.getPermissionsAsync());
    }
    let permission = await Notifications.getPermissionsAsync();
    if (reminder.enabled && requestPermission && permissionOf(permission) !== 'allowed' && permission.canAskAgain) {
      if (Platform.OS === 'android') await ensureChannel();
      permission = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    }
    const status = permissionOf(permission);
    if (status !== 'allowed') {
      await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
      await Notifications.dismissNotificationAsync(REMINDER_ID);
      return status;
    }
    if (Platform.OS === 'android') await ensureChannel();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const current = scheduled.find((item) => item.identifier === REMINDER_ID);
    if (current && matches(current, reminder)) return status;
    const trigger: Notifications.DailyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminder.hour,
      minute: reminder.minute,
      ...(Platform.OS === 'android' ? { channelId: REMINDER_ID } : {}),
    };
    // Sin zona horaria fija: las horas corresponden al reloj local del dispositivo.
    const next = await Notifications.getNextTriggerDateAsync(trigger);
    if (next === null) throw new Error('El recordatorio no tiene una próxima fecha');
    // El identificador estable sustituye la petición anterior en vez de acumular avisos.
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: REMINDER_TITLE,
        body: REMINDER_BODY,
        sound: 'default',
        data: { kind: REMINDER_ID, hour: reminder.hour, minute: reminder.minute },
      },
      trigger,
    });
    return status;
  });
  queue = run.then(() => {}, () => {});
  return run;
}

async function ensureChannel() {
  await Notifications.setNotificationChannelAsync(REMINDER_ID, {
    name: 'Tu ratito de thai con Noi',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

export function prepareReminderNotifications() {
  Notifications.setNotificationHandler({
    // Si la app está abierta, no interrumpir una lección ni la pronunciación thai.
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export function observeReminderTaps(onOpen: () => void): () => void {
  const handled = new Set<string>();
  const open = (response: Notifications.NotificationResponse | null) => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const { notification } = response;
    if (notification.request.identifier !== REMINDER_ID || notification.request.content.data?.kind !== REMINDER_ID) return;
    const key = `${notification.date}:${response.actionIdentifier}`;
    if (handled.has(key)) return;
    handled.add(key);
    Notifications.clearLastNotificationResponse();
    onOpen();
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  open(Notifications.getLastNotificationResponse());
  return () => subscription.remove();
}
