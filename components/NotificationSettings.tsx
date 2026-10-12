import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationSettings() {
  const { t } = useI18n();
  const { isPro, permission, enabled, active, setEnabled, openSettings } = useNotifications();

  // Versão free: painel com badge Pro que leva ao ecrã de upgrade
  if (!isPro) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/upgrade')}
        activeOpacity={0.8}
        className="mx-4 mt-3 mb-1 bg-slate-900 rounded-xl px-4 py-3 flex-row items-center gap-3"
      >
        <Ionicons name="notifications-outline" size={18} color="#64748B" />
        <View className="flex-1">
          <Text className="text-slate-300 text-sm font-medium">{t.notifications.title}</Text>
          <Text className="text-slate-500 text-xs mt-0.5">{t.notifications.pro_only}</Text>
        </View>
        <View className="bg-amber-500/20 rounded-full px-2 py-0.5">
          <Text className="text-amber-400 text-xs font-semibold">⭐ Pro</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View className="mx-4 mt-3 mb-1 bg-slate-900 rounded-xl px-4 py-3">
      <View className="flex-row items-center gap-3">
        <Ionicons
          name={active ? 'notifications' : 'notifications-outline'}
          size={18}
          color={active ? '#2563EB' : '#64748B'}
        />
        <View className="flex-1">
          <Text className="text-slate-200 text-sm font-medium">{t.notifications.title}</Text>
          <Text className="text-slate-500 text-xs mt-0.5">{t.notifications.subtitle}</Text>
        </View>
        <Switch
          value={active}
          onValueChange={setEnabled}
          trackColor={{ false: '#334155', true: '#1d4ed8' }}
          thumbColor={active ? '#2563EB' : '#64748B'}
        />
      </View>

      {/* Android 13+: permissão POST_NOTIFICATIONS negada */}
      {enabled && permission === 'denied' && (
        <View className="mt-3 pt-3 border-t border-slate-800 gap-2">
          <Text className="text-amber-500 text-xs">{t.notifications.denied}</Text>
          <TouchableOpacity
            onPress={openSettings}
            className="self-start flex-row items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5"
          >
            <Ionicons name="settings-outline" size={14} color="#F59E0B" />
            <Text className="text-amber-400 text-xs font-semibold">{t.notifications.open_settings}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
