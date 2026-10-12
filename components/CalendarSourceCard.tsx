import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { COLORS } from '../constants/colors';
import { CalendarSource } from '../types';

interface Props {
  source: CalendarSource;
  onSync: (source: CalendarSource) => void;
  onToggle: (id: string) => void;
  onDelete: (source: CalendarSource) => void;
}

export function CalendarSourceCard({ source, onSync, onToggle, onDelete }: Props) {
  const { t, locale } = useI18n();

  return (
    <View className="bg-slate-900 rounded-xl px-4 py-3 mb-2">
      <View className="flex-row items-center gap-3">
        {/* Cor da plataforma */}
        <View className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: source.color }} />

        {/* Info */}
        <View className="flex-1 min-w-0">
          <Text className="text-slate-100 text-sm font-semibold">{source.name}</Text>
          <Text className="text-slate-600 text-xs" numberOfLines={1}>{source.url}</Text>
          {source.lastSync ? (
            <Text className="text-slate-700 text-xs mt-0.5">
              {t.calendars.last_sync}: {new Date(source.lastSync).toLocaleString(
                locale === 'pt' ? 'pt-PT' : 'en-GB'
              )}
            </Text>
          ) : null}
        </View>

        {/* Editar */}
        <TouchableOpacity
          onPress={() => router.push(`/calendar/edit?id=${source.id}`)}
          className="p-1.5"
        >
          <Ionicons name="pencil-outline" size={17} color={COLORS.textSubtle} />
        </TouchableOpacity>

        {/* Sync */}
        <TouchableOpacity onPress={() => onSync(source)} className="p-1.5">
          <Ionicons name="sync-outline" size={17} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Activo / inactivo */}
        <Switch
          value={source.active}
          onValueChange={() => onToggle(source.id)}
          trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
          thumbColor={source.active ? COLORS.primary : COLORS.textSubtle}
        />

        {/* Apagar */}
        <TouchableOpacity onPress={() => onDelete(source)} className="p-1.5">
          <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
