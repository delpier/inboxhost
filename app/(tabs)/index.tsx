import { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, Switch } from 'react-native';
import { router, useNavigation, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { useReservations, ReservationFilter } from '../../hooks/useReservations';
import { useI18n } from '../../i18n';
import { useNetwork } from '../../hooks/useNetwork';
import { AdBanner } from '../../components/AdBanner';
import { OfflineBanner } from '../../components/OfflineBanner';
import { HeaderActions } from './_layout';
import { getShowBlocked, setShowBlocked } from '../../services/storage';
import { Reservation, PLATFORM_ICONS } from '../../types';

const BLOCKED_KEYWORDS = [
  'not available', 'closed', 'blocked', 'owner block',
  'unavailable', 'maintenance', 'preparation time', 'buffer', 'hold',
];

function isBlockedSummary(summary: string): boolean {
  const lower = (summary ?? '').toLowerCase();
  return BLOCKED_KEYWORDS.some(k => lower.includes(k));
}

function getStatusClass(checkIn: string, checkOut: string): string {
  if (isPast(parseISO(checkOut)))    return 'bg-slate-600';
  if (isToday(parseISO(checkIn)))    return 'bg-emerald-500';
  if (isTomorrow(parseISO(checkIn))) return 'bg-amber-500';
  return 'bg-blue-600';
}

function ReservationCard({ item }: { item: Reservation }) {
  const { t, locale } = useI18n();
  const past    = isPast(parseISO(item.checkOut));
  const unread  = item.messages.filter(m => !m.read && m.direction === 'received').length;
  const blocked = isBlockedSummary(item.summary);
  const dateFnsLocale = locale === 'pt' ? pt : enUS;

  return (
    <TouchableOpacity
      className={`flex-row rounded-xl overflow-hidden mb-2 bg-slate-900 ${past || blocked ? 'opacity-50' : ''}`}
      onPress={() => router.push(`/reservation/${item.id}`)}
      activeOpacity={0.75}
    >
      <View className={`w-1 ${blocked ? 'bg-slate-700' : getStatusClass(item.checkIn, item.checkOut)}`} />
      <View className="flex-1 px-3 py-3 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base">{PLATFORM_ICONS[item.platform]}</Text>
          <Text className="flex-1 text-slate-100 font-semibold text-sm" numberOfLines={1}>
            {item.guestName}
          </Text>
          {unread > 0 && (
            <View className="bg-blue-600 rounded-full px-2 py-0.5">
              <Text className="text-white text-xs font-bold">{unread}</Text>
            </View>
          )}
          {blocked && (
            <View className="bg-slate-800 rounded-full px-2 py-0.5">
              <Text className="text-slate-500 text-xs">
                {locale === 'pt' ? 'Bloqueado' : 'Blocked'}
              </Text>
            </View>
          )}
          {past && !blocked && (
            <View className="bg-slate-700 rounded-full px-2 py-0.5">
              <Text className="text-slate-400 text-xs">{t.reservations.badge_past}</Text>
            </View>
          )}
        </View>
        <Text className="text-slate-400 text-xs">
          {format(parseISO(item.checkIn), 'dd MMM', { locale: dateFnsLocale })}
          {' → '}
          {format(parseISO(item.checkOut), 'dd MMM yyyy', { locale: dateFnsLocale })}
        </Text>
        <View className="flex-row items-center gap-3 flex-wrap">
          {item.guestEmail   ? <Text className="text-slate-600 text-xs" numberOfLines={1}>{item.guestEmail}</Text>   : null}
          {item.numGuests    ? <Text className="text-slate-600 text-xs">👥 {item.numGuests}</Text>                    : null}
          {item.totalPrice   ? <Text className="text-slate-600 text-xs">{item.totalPrice} {item.currency ?? ''}</Text> : null}
          {item.reservationCode ? <Text className="text-slate-700 text-xs">#{item.reservationCode}</Text>              : null}
        </View>
      </View>
      <View className="justify-center pr-3">
        <Ionicons name="chevron-forward" size={16} color="#475569" />
      </View>
    </TouchableOpacity>
  );
}

const FILTER_KEYS: ReservationFilter[] = ['all', 'upcoming', 'past'];

export default function ReservationsScreen() {
  const { t, locale }       = useI18n();
  const { isConnected }     = useNetwork();
  const navigation          = useNavigation();
  const [filter, setFilter] = useState<ReservationFilter>('all');
  const [showBlocked, setShowBlockedState]       = useState(false);
  const [showFilterPanel, setShowFilterPanel]    = useState(false);
  const { reservations, syncing, sync } = useReservations(filter);

  useEffect(() => { getShowBlocked().then(setShowBlockedState); }, []);

  const handleSync = useCallback(async () => {
    if (!isConnected) { Alert.alert(t.network.offline, t.network.offline_sub); return; }
    await sync();
  }, [isConnected, sync, t]);

  useFocusEffect(useCallback(() => {
    navigation.setOptions({
      headerRight: () => <HeaderActions onSync={handleSync} />,
    });
  }, [handleSync]));

  const toggleShowBlocked = async (value: boolean) => {
    setShowBlockedState(value);
    await setShowBlocked(value);
  };

  const filterLabels: Record<ReservationFilter, string> = {
    all:      t.reservations.filter_all,
    upcoming: t.reservations.filter_upcoming,
    past:     t.reservations.filter_past,
  };

  const visibleReservations = showBlocked
    ? reservations
    : reservations.filter(r => !isBlockedSummary(r.summary));

  const blockedCount = reservations.filter(r => isBlockedSummary(r.summary)).length;

  return (
    <View className="flex-1 bg-slate-950">
      <OfflineBanner onRetry={handleSync} />

      {/* Filter row */}
      <View className="flex-row px-4 pt-3 pb-2 gap-2 items-center">
        {FILTER_KEYS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full ${filter === f ? 'bg-blue-600' : 'bg-slate-900'}`}
          >
            <Text className={`text-sm font-medium ${filter === f ? 'text-white' : 'text-slate-400'}`}>
              {filterLabels[f]}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setShowFilterPanel(!showFilterPanel)}
          className="ml-auto p-2 rounded-full bg-slate-900"
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={showFilterPanel ? '#2563EB' : '#475569'}
          />
        </TouchableOpacity>
      </View>

      {/* Advanced filter panel */}
      {showFilterPanel && (
        <View className="mx-4 mb-2 bg-slate-900 rounded-xl px-4 py-3">
          <Text className="text-slate-500 text-xs uppercase tracking-widest mb-3">
            {locale === 'pt' ? 'Filtros avançados' : 'Advanced filters'}
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-slate-200 text-sm font-medium">
                {locale === 'pt' ? 'Mostrar eventos bloqueados' : 'Show blocked events'}
              </Text>
              <Text className="text-slate-500 text-xs mt-0.5">
                {locale === 'pt'
                  ? `Not available, Closed, Blocked (${blockedCount} no storage)`
                  : `Not available, Closed, Blocked (${blockedCount} in storage)`}
              </Text>
            </View>
            <Switch
              value={showBlocked}
              onValueChange={toggleShowBlocked}
              trackColor={{ false: '#334155', true: '#1d4ed8' }}
              thumbColor={showBlocked ? '#2563EB' : '#64748B'}
            />
          </View>
          {blockedCount > 0 && (
            <View className="mt-3 pt-3 border-t border-slate-800 flex-row items-start gap-2">
              <Ionicons name="information-circle-outline" size={14} color="#475569" style={{ marginTop: 1 }} />
              <Text className="text-slate-600 text-xs flex-1">
                {locale === 'pt'
                  ? 'Faz sync para remover permanentemente os eventos bloqueados.'
                  : 'Sync again to permanently remove blocked events.'}
              </Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={visibleReservations}
        keyExtractor={r => r.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        refreshControl={
          <RefreshControl refreshing={syncing} onRefresh={handleSync} tintColor="#2563EB" />
        }
        ListEmptyComponent={
          <View className="items-center mt-24 gap-3">
            <Ionicons name="calendar-outline" size={52} color="#334155" />
            <Text className="text-slate-400 text-lg font-semibold">{t.reservations.empty_title}</Text>
            <Text className="text-slate-500 text-sm text-center px-8">
              {filter === 'past' ? t.reservations.empty_past : t.reservations.empty_sub}
            </Text>
          </View>
        }
        renderItem={({ item }) => <ReservationCard item={item} />}
      />

      <AdBanner />
    </View>
  );
}
