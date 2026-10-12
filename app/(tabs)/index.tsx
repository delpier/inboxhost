import { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, Switch } from 'react-native';
import { useNavigation, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReservations, ReservationFilter } from '../../hooks/useReservations';
import { useI18n } from '../../i18n';
import { useNetwork } from '../../hooks/useNetwork';
import { AdBanner } from '../../components/AdBanner';
import { OfflineBanner } from '../../components/OfflineBanner';
import { ReservationCard } from '../../components/ReservationCard';
import { ReservationsCalendar } from '../../components/ReservationsCalendar';
import { HeaderActions } from './_layout';
import { getShowBlocked, setShowBlocked } from '../../services/storage';
import { isBlockedEvent as isBlockedSummary } from '../../services/icalParser';
import { COLORS } from '../../constants/colors';

type ViewMode = 'list' | 'calendar';

const FILTER_KEYS: ReservationFilter[] = ['all', 'upcoming', 'past'];

export default function ReservationsScreen() {
  const { t, locale }       = useI18n();
  const { isConnected }     = useNetwork();
  const navigation          = useNavigation();
  const [filter, setFilter] = useState<ReservationFilter>('all');
  const [showBlocked, setShowBlockedState]       = useState(false);
  const [showFilterPanel, setShowFilterPanel]    = useState(false);
  const [viewMode, setViewMode]                  = useState<ViewMode>('list');
  const { reservations, allReservations, syncing, sync } = useReservations(filter);

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

  // O calendário mostra sempre todas as reservas (passadas e futuras)
  const calendarReservations = allReservations.filter(
    r => r.status !== 'cancelled' && (showBlocked || !isBlockedSummary(r.summary))
  );

  return (
    <View className="flex-1 bg-slate-950">
      <OfflineBanner onRetry={handleSync} />

      {/* Filter row */}
      <View className="flex-row px-4 pt-3 pb-2 gap-2 items-center">
        {viewMode === 'list' && FILTER_KEYS.map(f => (
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
          onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
          className="ml-auto flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900"
          accessibilityLabel={viewMode === 'list' ? t.reservations.view_calendar : t.reservations.view_list}
        >
          <Ionicons
            name={viewMode === 'list' ? 'calendar-outline' : 'list-outline'}
            size={16}
            color={COLORS.primary}
          />
          <Text className="text-slate-300 text-xs font-medium">
            {viewMode === 'list' ? t.reservations.view_calendar : t.reservations.view_list}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowFilterPanel(!showFilterPanel)}
          className="p-2 rounded-full bg-slate-900"
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

      {viewMode === 'calendar' ? (
        <ReservationsCalendar reservations={calendarReservations} />
      ) : (
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
      )}

      <AdBanner />
    </View>
  );
}
