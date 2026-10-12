import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  scheduleCheckinNotifications,
  cancelAllCheckinNotifications,
  getScheduledCount,
} from '../services/notificationService';

const NOTIF_ENABLED_KEY = 'notifications_enabled';

export function useNotifications(locale: string = 'pt') {
  const [enabled,     setEnabled]     = useState(false);
  const [permission,  setPermission]  = useState<string>('undetermined');
  const [loading,     setLoading]     = useState(false);
  const [count,       setCount]       = useState(0);

  // Carrega estado guardado
  useEffect(() => {
    const init = async () => {
      const [saved, status, scheduled] = await Promise.all([
        AsyncStorage.getItem(NOTIF_ENABLED_KEY),
        getNotificationPermissionStatus(),
        getScheduledCount(),
      ]);
      setEnabled(saved === 'true');
      setPermission(status);
      setCount(scheduled);
    };
    init();
  }, []);

  // Activar notificações
  const enable = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const granted = await requestNotificationPermission();
      setPermission(granted ? 'granted' : 'denied');

      if (!granted) {
        setLoading(false);
        return false;
      }

      const scheduled = await scheduleCheckinNotifications(locale);
      await AsyncStorage.setItem(NOTIF_ENABLED_KEY, 'true');
      setEnabled(true);
      setCount(scheduled);
      return true;
    } finally {
      setLoading(false);
    }
  }, [locale]);

  // Desactivar notificações
  const disable = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await cancelAllCheckinNotifications();
      await AsyncStorage.setItem(NOTIF_ENABLED_KEY, 'false');
      setEnabled(false);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle
  const toggle = useCallback(async (): Promise<void> => {
    if (enabled) {
      await disable();
    } else {
      await enable();
    }
  }, [enabled, enable, disable]);

  // Reagendar (chamar após sync de calendários)
  const reschedule = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    const scheduled = await scheduleCheckinNotifications(locale);
    setCount(scheduled);
  }, [enabled, locale]);

  return {
    enabled,
    permission,
    loading,
    count,
    enable,
    disable,
    toggle,
    reschedule,
  };
}
