import './globals.css';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nProvider } from '../i18n';
import { ProProvider } from '../context/ProContext';
import * as Notifications from 'expo-notifications';
import { useRef,useEffect } from 'react';

export default function RootLayout() {

  const notifListener    = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Recebeu notificação com a app aberta
    notifListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notification] Received:', notification.request.content.title);
    });

    // Utilizador clicou numa notificação — navega para a reserva
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.reservationId) {
        router.push(`/reservation/${data.reservationId}`);
      }
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <I18nProvider>
      <ProProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </ProProvider>
    </I18nProvider>
  );
}
