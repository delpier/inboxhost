import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { useI18n } from '../i18n';
import { isBlockedEvent } from '../services/icalParser';
import { getReservationPhase, ReservationPhase } from '../utils/reservation';
import { COLORS } from '../constants/colors';
import { Reservation, PLATFORM_ICONS } from '../types';

const PHASE_CLASS: Record<ReservationPhase, string> = {
  past:     'bg-slate-600',
  today:    'bg-emerald-500',
  tomorrow: 'bg-amber-500',
  upcoming: 'bg-blue-600',
  active:   'bg-blue-600',
};

export function ReservationCard({ item }: { item: Reservation }) {
  const { t, locale } = useI18n();
  const phase   = getReservationPhase(item);
  const past    = phase === 'past';
  const unread  = item.messages.filter(m => !m.read && m.direction === 'received').length;
  const blocked = isBlockedEvent(item.summary, item.platform);
  const dateFnsLocale = locale === 'pt' ? pt : enUS;

  return (
    <TouchableOpacity
      className={`flex-row rounded-xl overflow-hidden mb-2 bg-slate-900 ${past || blocked ? 'opacity-50' : ''}`}
      onPress={() => router.push(`/reservation/${item.id}`)}
      activeOpacity={0.75}
    >
      <View className={`w-1 ${blocked ? 'bg-slate-700' : PHASE_CLASS[phase]}`} />
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
          {item.property ? `  ·  ${item.property}` : ''}
        </Text>
        <View className="flex-row items-center gap-3 flex-wrap">
          {item.guestPhone   ? <Text className="text-slate-600 text-xs" numberOfLines={1}>{item.guestPhone}</Text>   : null}
          {item.guestEmail   ? <Text className="text-slate-600 text-xs" numberOfLines={1}>{item.guestEmail}</Text>   : null}
          {item.numGuests    ? <Text className="text-slate-600 text-xs">👥 {item.numGuests}</Text>                    : null}
          {item.totalPrice   ? <Text className="text-slate-600 text-xs">{item.totalPrice} {item.currency ?? ''}</Text> : null}
          {item.reservationCode ? <Text className="text-slate-700 text-xs">#{item.reservationCode}</Text>              : null}
        </View>
      </View>
      <View className="justify-center pr-3">
        <Ionicons name="chevron-forward" size={16} color={COLORS.textFaint} />
      </View>
    </TouchableOpacity>
  );
}
