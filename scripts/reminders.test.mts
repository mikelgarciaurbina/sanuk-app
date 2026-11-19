import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as config from '../src/lib/reminder-config.ts';
import { nativeModule } from './testing/native-module.mts';

const createService = nativeModule<typeof import('../src/lib/reminders.ts')>('lib/reminders.ts');
const ID = config.REMINDER_ID;
const on = { enabled: true, hour: 19, minute: 15 };
const off = { ...on, enabled: false };
const allowed = { granted: true, status: 'granted', canAskAgain: false, ios: { status: 2 } };
const blocked = { granted: false, status: 'denied', canAskAgain: false, ios: { status: 1 } };
const undetermined = { granted: false, status: 'undetermined', canAskAgain: true, ios: { status: 0 } };

function fixture(platform = 'ios') {
  const state = { permission: { ...allowed }, requests: 0, schedules: 0, cancels: [] as string[], response: null as any, callback: null as any, cleared: 0, handler: null as any, channels: 0 };
  const pending = new Map<string, any>();
  const api = {
    IosAuthorizationStatus: { NOT_DETERMINED: 0, DENIED: 1, AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 },
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { DAILY: 'daily' },
    DEFAULT_ACTION_IDENTIFIER: 'default',
    getPermissionsAsync: async () => state.permission,
    requestPermissionsAsync: async () => { state.requests += 1; return state.permission = { ...allowed }; },
    setNotificationChannelAsync: async () => { state.channels += 1; },
    getAllScheduledNotificationsAsync: async () => [...pending.values()],
    getNextTriggerDateAsync: async (_trigger: any): Promise<number | null> => Date.now() + 60000,
    scheduleNotificationAsync: async (request: any) => {
      state.schedules += 1;
      const trigger = platform === 'ios'
        ? { type: 'calendar', repeats: true, dateComponents: { hour: request.trigger.hour, minute: request.trigger.minute } }
        : request.trigger;
      pending.set(request.identifier, { ...request, trigger });
      return request.identifier;
    },
    cancelScheduledNotificationAsync: async (id: string) => { state.cancels.push(id); pending.delete(id); },
    dismissNotificationAsync: async (_id: string) => {},
    setNotificationHandler: (handler: any) => { state.handler = handler; },
    addNotificationResponseReceivedListener: (callback: any) => { state.callback = callback; return { remove: () => { state.callback = null; } }; },
    getLastNotificationResponse: () => state.response,
    clearLastNotificationResponse: () => { state.cleared += 1; state.response = null; },
  };
  const service = createService({
    'expo-notifications': api,
    'react-native': { Platform: { OS: platform } },
    './reminder-config': config,
  });
  return { service, api, state, pending };
}

test('los perfiles antiguos reciben el recordatorio apagado a las 19:00', () => {
  assert.deepEqual(config.normalizeReminder(), { enabled: false, hour: 19, minute: 0 });
  assert.deepEqual(config.normalizeReminder({ enabled: true, hour: 99, minute: -1 }), { enabled: true, hour: 19, minute: 0 });
  assert.equal(config.reminderTime(config.normalizeReminder({ hour: 0, minute: 5 })), '00:05');
});

test('arrancar y cambiar la hora con el recordatorio apagado no solicita permiso', async () => {
  const { service, state, pending } = fixture();
  state.permission = undetermined;
  await service.syncDailyReminder(off);
  await service.syncDailyReminder({ ...off, hour: 8, minute: 30 }, false);
  assert.equal(state.requests, 0);
  assert.equal(pending.size, 0);
});

test('activar pide permiso y programa el aviso diario una sola vez, incluso al volver a abrir la app', async () => {
  const { service, state, pending } = fixture();
  state.permission = undetermined;
  assert.equal(await service.syncDailyReminder(on, true), 'allowed');
  await service.syncDailyReminder(on);
  assert.equal(state.requests, 1);
  assert.equal(state.schedules, 1);
  assert.equal(pending.size, 1);
  const notification = pending.get(ID);
  assert.equal(notification.content.title, 'Noi 🐘');
  assert.equal(notification.content.body, config.REMINDER_BODY);
  assert.equal(notification.trigger.repeats, true);
  assert.equal(notification.trigger.dateComponents.hour, 19);
  assert.equal(notification.trigger.dateComponents.minute, 15);
  assert.equal(notification.trigger.dateComponents.timeZone, undefined);
});

test('el permiso bloqueado mantiene el recordatorio sin programar y no repite la solicitud', async () => {
  const { service, state, pending } = fixture();
  state.permission = blocked;
  assert.equal(await service.syncDailyReminder(on, true), 'blocked');
  assert.equal(state.requests, 0);
  assert.equal(pending.size, 0);
});

test('se interpreta la autorización granular de iOS, incluida la provisional', async () => {
  const { service, state, pending } = fixture();
  state.permission = { ...allowed, ios: { status: 1 } };
  assert.equal(await service.syncDailyReminder(on), 'blocked');
  assert.equal(pending.size, 0);
  state.permission = { ...blocked, ios: { status: 3 } };
  assert.equal(await service.syncDailyReminder(on), 'allowed');
  assert.equal(pending.size, 1);
});

test('cambiar la hora sustituye el aviso y admite medianoche y las 23:59', async () => {
  const { service, pending } = fixture();
  await service.syncDailyReminder(on);
  await service.syncDailyReminder({ ...on, hour: 0, minute: 0 });
  assert.equal(pending.size, 1);
  assert.equal(pending.get(ID).trigger.dateComponents.hour, 0);
  await service.syncDailyReminder({ ...on, hour: 23, minute: 59 });
  assert.equal(pending.size, 1);
  assert.equal(pending.get(ID).trigger.dateComponents.minute, 59);
});

test('desactivar cancela solo el recordatorio de Noi', async () => {
  const { service, pending } = fixture();
  pending.set('otro-aviso', { identifier: 'otro-aviso' });
  await service.syncDailyReminder(on);
  await service.syncDailyReminder(off);
  assert.equal(pending.has(ID), false);
  assert.equal(pending.has('otro-aviso'), true);
});

test('revocar el permiso desde Ajustes retira la notificación pendiente', async () => {
  const { service, state, pending } = fixture();
  await service.syncDailyReminder(on);
  state.permission = blocked;
  assert.equal(await service.syncDailyReminder(on), 'blocked');
  assert.equal(pending.size, 0);
});

test('activar y desactivar durante una programación lenta termina sin avisos pendientes', async () => {
  const { service, api, pending } = fixture();
  const original = api.scheduleNotificationAsync;
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  api.scheduleNotificationAsync = async (request) => { await wait; return original(request); };
  const enable = service.syncDailyReminder(on);
  const disable = service.syncDailyReminder(off);
  release();
  await Promise.all([enable, disable]);
  assert.equal(pending.size, 0);
});

test('un fallo del sistema no envenena la cola y no confirma una programación imposible', async () => {
  const { service, api, pending } = fixture();
  api.getNextTriggerDateAsync = async () => null;
  await assert.rejects(service.syncDailyReminder(on));
  await service.syncDailyReminder(off);
  assert.equal(pending.size, 0);
});

test('en Android crea un canal y conserva el disparador diario sin pedir alarmas exactas', async () => {
  const { service, state, pending } = fixture('android');
  await service.syncDailyReminder(on);
  assert.equal(state.channels, 1);
  assert.equal(pending.get(ID).trigger.type, 'daily');
  assert.equal(pending.get(ID).trigger.channelId, ID);
  assert.equal(pending.get(ID).trigger.delivery, undefined);
});

test('en primer plano el recordatorio no interrumpe una lección ni su audio', async () => {
  const { service, state } = fixture();
  service.prepareReminderNotifications();
  const behavior = await state.handler.handleNotification();
  assert.equal(behavior.shouldShowBanner, false);
  assert.equal(behavior.shouldPlaySound, false);
});

test('el toque abre el camino una sola vez; ignora otros avisos y admite el del día siguiente', () => {
  const { service, state } = fixture();
  const response = (date: number, identifier = ID) => ({ actionIdentifier: 'default', notification: { date, request: { identifier, content: { data: { kind: ID } } } } });
  state.response = response(1);
  let opens = 0;
  const unsubscribe = service.observeReminderTaps(() => { opens += 1; });
  state.callback(response(1));
  state.callback(response(2, 'otro-aviso'));
  state.callback(response(2));
  assert.equal(opens, 2);
  assert.equal(state.cleared, 2);
  unsubscribe();
  assert.equal(state.callback, null);
});
