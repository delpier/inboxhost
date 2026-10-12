import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getReservations } from './storage';
import { addDays, parseISO, isFuture, isToday, isTomorrow, format } from 'date-fns';
import { pt } from 'date-fns/locale';

// ─── Configuração de como as notificações aparecem ────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ─── Pedir permissão ─────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13+ requer permissão explícita
    await Notifications.setNotificationChannelAsync('checkin', {
      name:             'Check-ins',
      importance:       Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#2563EB',
      sound:            'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// ─── Agendar notificações de check-in ────────────────────────────────────

export async function scheduleCheckinNotifications(locale: string = 'pt'): Promise<number> {
  // Cancela todas as notificações de check-in agendadas
  await cancelAllCheckinNotifications();

  const reservations = await getReservations();
  let scheduled = 0;

  for (const res of reservations) {
    const checkInDate = parseISO(res.checkIn);

    // Não agenda para reservas passadas
    if (!isFuture(checkInDate) && !isToday(checkInDate)) continue;

    // ── Notificação 2 dias antes ────────────────────────────────────────
    const twoDaysBefore = addDays(checkInDate, -2);
    twoDaysBefore.setHours(9, 0, 0, 0);

    if (isFuture(twoDaysBefore)) {
      await Notifications.scheduleNotificationAsync({
        identifier: `checkin-2d-${res.id}`,
        content: {
          title: locale === 'pt'
            ? `📅 Check-in em 2 dias`
            : `📅 Check-in in 2 days`,
          body: locale === 'pt'
            ? `${res.guestName} chega ${format(checkInDate, "EEEE, dd 'de' MMMM", { locale: pt })}. Prepara o alojamento!`
            : `${res.guestName} arrives ${format(checkInDate, 'EEEE, MMMM dd')}.`,
          data: { reservationId: res.id, type: 'checkin_2d' },
          sound: 'default',
        },
        trigger: {
          type:  Notifications.SchedulableTriggerInputTypes.DATE,
          date:  twoDaysBefore,
          channelId: 'checkin',
        },
      });
      scheduled++;
    }

    // ── Notificação 1 dia antes (amanhã) ────────────────────────────────
    const oneDayBefore = addDays(checkInDate, -1);
    oneDayBefore.setHours(9, 0, 0, 0);

    if (isFuture(oneDayBefore)) {
      await Notifications.scheduleNotificationAsync({
        identifier: `checkin-1d-${res.id}`,
        content: {
          title: locale === 'pt'
            ? `🔑 Check-in amanhã`
            : `🔑 Check-in tomorrow`,
          body: locale === 'pt'
            ? `${res.guestName} faz check-in amanhã. Confirma que está tudo pronto!`
            : `${res.guestName} checks in tomorrow. Make sure everything is ready!`,
          data: { reservationId: res.id, type: 'checkin_1d' },
          sound: 'default',
        },
        trigger: {
          type:  Notifications.SchedulableTriggerInputTypes.DATE,
          date:  oneDayBefore,
          channelId: 'checkin',
        },
      });
      scheduled++;
    }

    // ── Notificação no próprio dia às 9h ────────────────────────────────
    const checkInDay = new Date(checkInDate);
    checkInDay.setHours(9, 0, 0, 0);

    if (isFuture(checkInDay)) {
      await Notifications.scheduleNotificationAsync({
        identifier: `checkin-day-${res.id}`,
        content: {
          title: locale === 'pt'
            ? `🏠 Check-in hoje!`
            : `🏠 Check-in today!`,
          body: locale === 'pt'
            ? `${res.guestName} faz check-in hoje. Boa estadia!`
            : `${res.guestName} checks in today. Have a great stay!`,
          data: { reservationId: res.id, type: 'checkin_day' },
          sound: 'default',
        },
        trigger: {
          type:  Notifications.SchedulableTriggerInputTypes.DATE,
          date:  checkInDay,
          channelId: 'checkin',
        },
      });
      scheduled++;
    }

    // ── Notificação de check-out ─────────────────────────────────────────
    const checkOutDate = parseISO(res.checkOut);
    const checkOutDay  = new Date(checkOutDate);
    checkOutDay.setHours(8, 0, 0, 0);

    if (isFuture(checkOutDay)) {
      await Notifications.scheduleNotificationAsync({
        identifier: `checkout-day-${res.id}`,
        content: {
          title: locale === 'pt'
            ? `👋 Check-out hoje`
            : `👋 Check-out today`,
          body: locale === 'pt'
            ? `${res.guestName} faz check-out hoje. Não te esqueças de verificar o alojamento!`
            : `${res.guestName} checks out today. Remember to inspect the property!`,
          data: { reservationId: res.id, type: 'checkout_day' },
          sound: 'default',
        },
        trigger: {
          type:  Notifications.SchedulableTriggerInputTypes.DATE,
          date:  checkOutDay,
          channelId: 'checkin',
        },
      });
      scheduled++;
    }
  }

  console.log(`[Notifications] Agendadas ${scheduled} notificações`);
  return scheduled;
}

// ─── Cancelar notificações de uma reserva ────────────────────────────────

export async function cancelNotificationsForReservation(reservationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`checkin-2d-${reservationId}`);
  await Notifications.cancelScheduledNotificationAsync(`checkin-1d-${reservationId}`);
  await Notifications.cancelScheduledNotificationAsync(`checkin-day-${reservationId}`);
  await Notifications.cancelScheduledNotificationAsync(`checkout-day-${reservationId}`);
}

// ─── Cancelar todas as notificações de check-in ──────────────────────────

export async function cancelAllCheckinNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const checkinIds = scheduled
    .filter(n => n.identifier.startsWith('checkin-') || n.identifier.startsWith('checkout-'))
    .map(n => n.identifier);

  for (const id of checkinIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

// ─── Listar notificações agendadas (debug) ────────────────────────────────

export async function getScheduledCount(): Promise<number> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter(n =>
    n.identifier.startsWith('checkin-') || n.identifier.startsWith('checkout-')
  ).length;
}
