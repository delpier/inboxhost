import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { useNetwork } from '../hooks/useNetwork';

export function OfflineBanner({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  const { isConnected, wasOffline } = useNetwork();

  if (isConnected && !wasOffline) return null;

  if (isConnected && wasOffline) {
    // Connection restored — show brief success
    return (
      <View className="flex-row items-center justify-center gap-2 bg-emerald-900/80 px-4 py-2">
        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
        <Text className="text-emerald-400 text-xs font-medium">
          {t.network.online}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center justify-between gap-2 bg-amber-900/80 px-4 py-2">
      <View className="flex-row items-center gap-2">
        <Ionicons name="cloud-offline-outline" size={14} color="#F59E0B" />
        <View>
          <Text className="text-amber-400 text-xs font-semibold">{t.network.offline}</Text>
          <Text className="text-amber-600 text-xs">{t.network.offline_sub}</Text>
        </View>
      </View>
      {onRetry && (
        <TouchableOpacity onPress={onRetry}>
          <Text className="text-amber-400 text-xs font-semibold underline">
            {t.network.retry}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
