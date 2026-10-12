import './globals.css';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { I18nProvider } from '../i18n';
import { ProProvider, usePro } from '../context/ProContext';
import { reschedule } from '../services/notificationService';

function openReservationFrom(response: Notifications.NotificationResponse | null) {
  const id = response?.notification.request.content.data?.reservationId;
  if (typeof id === 'string') router.push(`/reservation/${id}`);
}

// Ao tocar numa notificação abre a reserva; reprograma quando muda o estado Pro
function NotificationObserver() {
  const { isPro, loading } = usePro();

  useEffect(() => {
    let mounted = true;
    // App aberta a partir de uma notificação (estava fechada)
    Notifications.getLastNotificationResponseAsync()
      .then(response => { if (mounted) openReservationFrom(response); })
      .catch(() => {});
    // App já aberta ou em segundo plano
    const sub = Notifications.addNotificationResponseReceivedListener(openReservationFrom);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!loading) reschedule();
  }, [isPro, loading]);

  return null;
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <ProProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
        <NotificationObserver />
      </ProProvider>
    </I18nProvider>
  );
}
