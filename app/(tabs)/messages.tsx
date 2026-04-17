import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { useReservations } from '../../hooks/useReservations';
import { useI18n } from '../../i18n';
import { AdBanner } from '../../components/AdBanner';
import { Reservation, PLATFORM_ICONS } from '../../types';

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

function ThreadItem({ item }: { item: Reservation }) {
  const { t, locale } = useI18n();
  const lastMsg  = item.messages[item.messages.length - 1];
  const unread   = item.messages.filter(m => !m.read && m.direction === 'received').length;
  const dateFnsLocale = locale === 'pt' ? pt : enUS;

  return (
    <TouchableOpacity
      className="flex-row items-center bg-slate-900 rounded-xl px-4 py-3 mb-2 gap-3"
      onPress={() => router.push(`/reservation/${item.id}`)}
      activeOpacity={0.75}
    >
      <View className="w-11 h-11 rounded-full bg-blue-950 items-center justify-center">
        <Text className="text-blue-400 text-sm font-bold">{getInitials(item.guestName)}</Text>
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1">
          <Text className="text-xs">{PLATFORM_ICONS[item.platform]}</Text>
          <Text
            className={`flex-1 text-sm ${unread > 0 ? 'text-slate-100 font-semibold' : 'text-slate-300 font-medium'}`}
            numberOfLines={1}
          >
            {item.guestName}
          </Text>
          {lastMsg ? (
            <Text className="text-slate-600 text-xs">
              {format(parseISO(lastMsg.timestamp), 'dd MMM', { locale: dateFnsLocale })}
            </Text>
          ) : null}
        </View>
        <Text className={`text-xs mt-0.5 ${unread > 0 ? 'text-slate-300' : 'text-slate-500'}`} numberOfLines={1}>
          {lastMsg
            ? `${lastMsg.direction === 'sent' ? `${t.messages.you}: ` : ''}${lastMsg.text}`
            : t.messages.no_messages}
        </Text>
      </View>
      {unread > 0 ? (
        <View className="w-5 h-5 bg-blue-600 rounded-full items-center justify-center">
          <Text className="text-white text-xs font-bold">{unread}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={14} color="#334155" />
      )}
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const { t } = useI18n();
  const { allReservations } = useReservations('all');

  const withMessages = allReservations
    .filter(r => r.messages.length > 0)
    .sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.timestamp ?? '';
      const bLast = b.messages[b.messages.length - 1]?.timestamp ?? '';
      return bLast.localeCompare(aLast);
    });

  const totalUnread = withMessages.reduce(
    (acc, r) => acc + r.messages.filter(m => !m.read && m.direction === 'received').length,
    0
  );

  return (
    <View className="flex-1 bg-slate-950">
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-3">
        <Text className="text-3xl font-bold text-slate-100">{t.messages.title}</Text>
        {totalUnread > 0 && (
          <View className="bg-blue-600 rounded-full px-2.5 py-0.5">
            <Text className="text-white text-xs font-bold">{totalUnread}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={withMessages}
        keyExtractor={r => r.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        ListEmptyComponent={
          <View className="items-center mt-24 gap-3">
            <Ionicons name="chatbubbles-outline" size={52} color="#334155" />
            <Text className="text-slate-400 text-lg font-semibold">{t.messages.empty_title}</Text>
            <Text className="text-slate-500 text-sm text-center px-8">{t.messages.empty_sub}</Text>
          </View>
        }
        renderItem={({ item }) => <ThreadItem item={item} />}
      />

      <AdBanner />
    </View>
  );
}
