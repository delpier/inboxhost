import { useMemo, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { addDays, eachDayOfInterval, format, parseISO } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { COLORS } from '../constants/colors';
import { ReservationCard } from './ReservationCard';
import { Platform, Reservation, PLATFORM_COLORS } from '../types';

LocaleConfig.locales.pt = {
  monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
    'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje',
};
LocaleConfig.locales.en = {
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today',
};

// O azul escuro da Booking quase não se vê no fundo escuro
const BAR_COLORS: Record<Platform, string> = { ...PLATFORM_COLORS, booking: '#3B82F6' };
// Nº máximo de barras (reservas sobrepostas) por dia
const MAX_SLOTS = 3;

type Period = { color: string; startingDay?: boolean; endingDay?: boolean };
type DayMarking = { periods: Period[]; selected?: boolean };

const toKey = (d: Date) => format(d, 'yyyy-MM-dd');

// Uma barra por reserva, nas noites ocupadas (check-in até à véspera do check-out).
// Cada reserva fica numa "linha" fixa para as barras não saltarem entre dias.
function buildMarkings(reservations: Reservation[]): Record<string, DayMarking> {
  const marks: Record<string, DayMarking> = {};
  const slotEnds: string[] = [];

  [...reservations]
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .forEach(r => {
      const start = parseISO(r.checkIn);
      const end   = r.checkOut > r.checkIn ? addDays(parseISO(r.checkOut), -1) : start;
      const days  = eachDayOfInterval({ start, end }).map(toKey);

      let slot = slotEnds.findIndex(last => last < days[0]);
      if (slot < 0) slot = slotEnds.length;
      if (slot >= MAX_SLOTS) return;
      slotEnds[slot] = days[days.length - 1];

      days.forEach((day, i) => {
        const periods = marks[day]?.periods ?? [];
        while (periods.length < slot) periods.push({ color: 'transparent' });
        periods[slot] = {
          color:       BAR_COLORS[r.platform],
          startingDay: i === 0,
          endingDay:   i === days.length - 1,
        };
        marks[day] = { periods };
      });
    });

  return marks;
}

export function ReservationsCalendar({ reservations }: { reservations: Reservation[] }) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState(toKey(new Date()));
  LocaleConfig.defaultLocale = locale;

  const markings = useMemo(() => buildMarkings(reservations), [reservations]);
  const markedDates = useMemo(
    () => ({ ...markings, [selected]: { ...(markings[selected] ?? { periods: [] }), selected: true } }),
    [markings, selected]
  );

  // Reservas com estadia nesse dia, incluindo chegadas e saídas
  const dayReservations = reservations
    .filter(r => r.checkIn <= selected && r.checkOut >= selected)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return (
    <FlatList
      data={dayReservations}
      keyExtractor={r => r.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      ListHeaderComponent={
        <View>
          <Calendar
            key={locale}
            current={selected}
            firstDay={1}
            markingType="multi-period"
            markedDates={markedDates}
            onDayPress={day => setSelected(day.dateString)}
            enableSwipeMonths
            style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}
            theme={{
              calendarBackground:          COLORS.surface,
              textSectionTitleColor:       COLORS.textSubtle,
              dayTextColor:                COLORS.text,
              textDisabledColor:           COLORS.textFaint,
              monthTextColor:              COLORS.text,
              todayTextColor:              COLORS.primary,
              arrowColor:                  COLORS.primary,
              selectedDayBackgroundColor:  COLORS.primary,
              selectedDayTextColor:        '#FFFFFF',
              textMonthFontWeight:         '700',
            }}
          />
          <Text className="text-slate-500 text-xs uppercase tracking-widest mb-2">
            {format(parseISO(selected), 'EEEE, d MMMM', { locale: locale === 'pt' ? pt : enUS })}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View className="flex-row items-center gap-2 py-4">
          <Ionicons name="calendar-clear-outline" size={16} color={COLORS.textFaint} />
          <Text className="text-slate-500 text-sm">{t.reservations.day_empty}</Text>
        </View>
      }
      renderItem={({ item }) => <ReservationCard item={item} />}
    />
  );
}
