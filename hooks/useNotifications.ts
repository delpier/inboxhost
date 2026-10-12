import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { usePro } from '../context/ProContext';
import {
  NotificationPermission,
  getPermissionStatus,
  requestPermission,
  getNotificationsEnabled,
  setNotificationsEnabled,
  reschedule,
} from '../services/notificationService';

export function useNotifications() {
  const { isPro } = usePro();
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');
  const [enabled, setEnabledState]  = useState(true);

  const refresh = useCallback(async () => {
    const [perm, on] = await Promise.all([getPermissionStatus(), getNotificationsEnabled()]);
    setPermission(perm);
    setEnabledState(on);
    return perm;
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Ao voltar das Definições do Android a permissão pode ter mudado
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh().then(() => reschedule());
    });
    return () => sub.remove();
  }, [refresh]);

  const setEnabled = useCallback(async (value: boolean) => {
    if (value && permission !== 'granted') {
      setPermission(await requestPermission());
    }
    await setNotificationsEnabled(value);
    setEnabledState(value);
    await reschedule();
  }, [permission]);

  const openSettings = useCallback(() => Linking.openSettings(), []);

  return {
    isPro,
    permission,
    enabled,
    // Só estão realmente activas com Pro + preferência + permissão
    active: isPro && enabled && permission === 'granted',
    setEnabled,
    openSettings,
    refresh,
  };
}
