import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { addDays, differenceInDays, parseISO, set } from 'date-fns';
import { getReservations } from './storage';
import { translations, Locale } from '../i18n/translations';
import { LOCALE_STORAGE_KEY, PRO_STORAGE_KEY } from '../constants/config';
import { Reservation } from '../types';

// Notificações locais (Pro) — agendadas no dispositivo, sem servidor.
// Não funcionam no Expo Go: é preciso um development build (EAS).

const CHANNEL_ID  = 'checkins';
const ENABLED_KEY = 'notifications_enabled';
// O Android limita o nº de alarmes por app (~500); agenda só os mais próximos
const MAX_SCHEDULED = 200;

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';
export type ReminderKind = 'checkin_2d' | 'checkin_1d' | 'checkin_today' | 'checkout_today';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

// ─── Permissões ──────────────────────────────────────────────────────────────

async function ensureChannel(locale: Locale): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name:       translations[locale].notifications.channel_name,
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#2563EB',
  });
}

function toPermission(status: Notifications.PermissionStatus): NotificationPermission {
  if (status === Notifications.PermissionStatus.GRANTED) return 'granted';
  if (status === Notifications.PermissionStatus.DENIED)  return 'denied';
  return 'undetermined';
}

export async function getPermissionStatus(): Promise<NotificationPermission> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return toPermission(status);
  } catch {
    return 'undetermined';
  }
}

// Android 13+ (POST_NOTIFICATIONS) só mostra o pedido depois de existir um canal
export async function requestPermission(): Promise<NotificationPermission> {
  try {
    await ensureChannel(await getLocale());
    const { status } = await Notifications.requestPermissionsAsync();
    return toPermission(status);
  } catch {
    return 'denied';
  }
}

// ─── Preferência do utilizador ───────────────────────────────────────────────

export async function getNotificationsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) !== 'false';
}

export async function setNotificationsEnabled(value: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, value ? 'true' : 'false');
}

async function getLocale(): Promise<Locale> {
  return (await AsyncStorage.getItem(LOCALE_STORAGE_KEY)) === 'en' ? 'en' : 'pt';
}

// ─── Agendamento ─────────────────────────────────────────────────────────────

function at(day: Date, hours: number): Date {
  return set(day, { hours, minutes: 0, seconds: 0, milliseconds: 0 });
}

// 2 e 1 dia antes do check-in e no próprio dia às 09:00; check-out às 08:00
export function getReminders(reservation: Reservation): { kind: ReminderKind; date: Date }[] {
  const checkIn  = parseISO(reservation.checkIn);
  const checkOut = parseISO(reservation.checkOut);
  return [
    { kind: 'checkin_2d',     date: at(addDays(checkIn, -2), 9) },
    { kind: 'checkin_1d',     date: at(addDays(checkIn, -1), 9) },
    { kind: 'checkin_today',  date: at(checkIn, 9) },
    { kind: 'checkout_today', date: at(checkOut, 8) },
  ];
}

async function doReschedule(): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const [isPro, enabled, permission] = await Promise.all([
    AsyncStorage.getItem(PRO_STORAGE_KEY).then(v => v === 'true'),
    getNotificationsEnabled(),
    getPermissionStatus(),
  ]);
  if (!isPro || !enabled || permission !== 'granted') return 0;

  const locale = await getLocale();
  const t      = translations[locale];
  await ensureChannel(locale);

  const now     = Date.now();
  const pending = (await getReservations())
    .filter(r => r.status !== 'cancelled')
    .flatMap(r => getReminders(r).map(rem => ({ ...rem, reservation: r })))
    .filter(rem => rem.date.getTime() > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_SCHEDULED);

  for (const { kind, date, reservation: r } of pending) {
    const property = r.property || t.messaging.property_fallback;
    const nights   = differenceInDays(parseISO(r.checkOut), parseISO(r.checkIn));
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t.notifications[kind](r.guestName),
        body:  kind === 'checkout_today'
          ? t.notifications.checkout_body(property)
          : t.notifications.checkin_body(property, t.reservations.nights(nights)),
        data:  { reservationId: r.id },
      },
      trigger: {
        type:      Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: CHANNEL_ID,
      },
    });
  }
  return pending.length;
}

// Serializa as chamadas: duas reprogramações em simultâneo duplicavam alertas
let queue: Promise<unknown> = Promise.resolve();

/**
 * Cancela e volta a agendar todas as notificações a partir das reservas
 * guardadas. Chamar depois de cada sincronização e quando muda o estado Pro,
 * a preferência ou a permissão. Devolve o nº de notificações agendadas.
 */
export function reschedule(): Promise<number> {
  const run = queue.then(doReschedule).catch(err => {
    console.warn('[notifications] reschedule failed', err);
    return 0;
  });
  queue = run;
  return run;
}
