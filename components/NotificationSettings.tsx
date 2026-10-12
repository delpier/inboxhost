import { View, Text, Switch, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../hooks/useNotifications';
import { usePro } from '../context/ProContext';
import { router } from 'expo-router';

interface Props {
  locale: string;
}

export function NotificationSettings({ locale }: Props) {
  const { isPro } = usePro();
  const { enabled, permission, loading, count, toggle } = useNotifications(locale);

  const isPt = locale === 'pt';

  const handleToggle = async () => {
    if (!isPro) {
      Alert.alert(
        isPt ? 'Funcionalidade Pro' : 'Pro Feature',
        isPt
          ? 'As notificações de check-in são uma funcionalidade Pro. Faz upgrade para activar.'
          : 'Check-in notifications are a Pro feature. Upgrade to activate.',
        [
          { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
          { text: '⭐ Pro', onPress: () => router.push('/upgrade') },
        ]
      );
      return;
    }

    if (permission === 'denied') {
      Alert.alert(
        isPt ? 'Permissão negada' : 'Permission denied',
        isPt
          ? 'As notificações foram bloqueadas. Activa-as nas definições do sistema.'
          : 'Notifications are blocked. Enable them in system settings.',
        [
          { text: isPt ? 'Cancelar' : 'Cancel', style: 'cancel' },
          {
            text: isPt ? 'Abrir definições' : 'Open settings',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return;
    }

    await toggle();
  };

  return (
    <View className="mx-4 mt-2 mb-1 bg-slate-900 rounded-xl overflow-hidden">
      {/* Header da secção */}
      <View className="flex-row items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-800">
        <Ionicons name="notifications-outline" size={16} color="#64748B" />
        <Text className="text-slate-500 text-xs uppercase tracking-widest flex-1">
          {isPt ? 'Notificações' : 'Notifications'}
        </Text>
        {!isPro && (
          <View className="bg-amber-900/50 border border-amber-700/50 rounded-full px-2 py-0.5">
            <Text className="text-amber-400 text-xs font-semibold">⭐ Pro</Text>
          </View>
        )}
      </View>

      {/* Toggle check-in */}
      <View className="flex-row items-center px-4 py-3">
        <View className="flex-1 pr-4">
          <Text className={`text-sm font-medium ${isPro ? 'text-slate-200' : 'text-slate-500'}`}>
            {isPt ? 'Alertas de check-in e check-out' : 'Check-in & check-out alerts'}
          </Text>
          <Text className="text-slate-600 text-xs mt-0.5">
            {isPt
              ? 'Notificações 2 dias antes, 1 dia antes e no próprio dia'
              : '2 days before, 1 day before, and on the day'}
          </Text>
        </View>
        {loading
          ? <ActivityIndicator size="small" color="#2563EB" />
          : <Switch
              value={enabled && isPro}
              onValueChange={handleToggle}
              disabled={!isPro || loading}
              trackColor={{ false: '#334155', true: '#1d4ed8' }}
              thumbColor={(enabled && isPro) ? '#2563EB' : '#64748B'}
            />
        }
      </View>

      {/* Estado actual */}
      {isPro && enabled && (
        <View className="flex-row items-center gap-2 px-4 pb-3">
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text className="text-emerald-500 text-xs">
            {isPt
              ? `${count} notificação(ões) agendada(s)`
              : `${count} notification(s) scheduled`}
          </Text>
        </View>
      )}

      {/* Aviso permissão negada */}
      {isPro && permission === 'denied' && (
        <TouchableOpacity
          className="flex-row items-center gap-2 px-4 pb-3"
          onPress={() => Linking.openSettings()}
        >
          <Ionicons name="warning-outline" size={14} color="#F59E0B" />
          <Text className="text-amber-500 text-xs flex-1">
            {isPt
              ? 'Notificações bloqueadas. Toca para abrir definições.'
              : 'Notifications blocked. Tap to open settings.'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Tipos de notificação (expandido quando activo) */}
      {isPro && enabled && (
        <View className="border-t border-slate-800 px-4 py-3 gap-2">
          <Text className="text-slate-600 text-xs font-medium mb-1">
            {isPt ? 'Alertas enviados:' : 'Alerts sent:'}
          </Text>
          {[
            { icon: '📅', pt: '2 dias antes — às 9h',     en: '2 days before — at 9am'   },
            { icon: '🔑', pt: '1 dia antes — às 9h',      en: '1 day before — at 9am'    },
            { icon: '🏠', pt: 'Dia do check-in — às 9h',  en: 'Check-in day — at 9am'    },
            { icon: '👋', pt: 'Dia do check-out — às 8h', en: 'Check-out day — at 8am'   },
          ].map(item => (
            <View key={item.icon} className="flex-row items-center gap-2">
              <Text className="text-sm">{item.icon}</Text>
              <Text className="text-slate-500 text-xs">
                {isPt ? item.pt : item.en}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
