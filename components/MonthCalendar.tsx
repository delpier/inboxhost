import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { COLORS } from '../constants/colors';
import { Reservation } from '../types';

export const toKey = (d: Date) => format(d, 'yyyy-MM-dd');

// Cores dos dias (tema escuro da app)
const BOOKED_BG   = 'rgba(37, 99, 235, 0.28)'; // primary com transparência
const BOOKED_TEXT = '#93C5FD';                 // blue-300
const SELECTED_BG = COLORS.pro;                // amber-400
const SELECTED_TX = COLORS.background;

// Noites ocupadas: do check-in até à véspera do check-out
// (o dia do check-out fica livre para uma nova entrada)
function bookedNights(reservations: Reservation[]): Set<string> {
  const nights = new Set<string>();
  reservations.forEach(r => {
    if (r.checkOut <= r.checkIn) {
      nights.add(r.checkIn);
      return;
    }
    eachDayOfInterval({
      start: parseISO(r.checkIn),
      end:   addDays(parseISO(r.checkOut), -1),
    }).forEach(d => nights.add(toKey(d)));
  });
  return nights;
}

function NavButton({ icon, onPress, label }: {
  icon: 'chevron-back' | 'chevron-forward';
  onPress: () => void;
  label: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={label}
      className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800/60 items-center justify-center"
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color={COLORS.text} />
    </TouchableOpacity>
  );
}

function LegendItem({ label, style }: { label: string; style: object }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={[{ width: 10, height: 10, borderRadius: 5 }, style]} />
      <Text className="text-slate-400 text-xs">{label}</Text>
    </View>
  );
}

interface Props {
  reservations: Reservation[];
  selected: string | null;               // yyyy-MM-dd
  onSelect: (day: string | null) => void;
}

// Calendário mensal com as noites reservadas. Tocar num dia selecciona-o;
// tocar outra vez no mesmo dia limpa a selecção.
export function MonthCalendar({ reservations, selected, onSelect }: Props) {
  const { t, locale } = useI18n();
  const dfLocale = locale === 'pt' ? pt : enUS;
  const today    = toKey(new Date());

  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const booked = useMemo(() => bookedNights(reservations), [reservations]);

  // Semanas a começar à segunda; dias de outros meses ficam em branco
  const weeks = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfWeek(month, { weekStartsOn: 1 }),
      end:   endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
    });
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [month]);

  const weekdayLabels = weeks[0].map(d =>
    format(d, 'EEE', { locale: dfLocale }).replace('.', '').toUpperCase()
  );
  const monthTitle = format(month, 'LLLL yyyy', { locale: dfLocale });

  const goToToday = () => setMonth(startOfMonth(new Date()));

  return (
    <View className="bg-slate-900 rounded-2xl px-3 pt-4 pb-4">
      {/* Mês + navegação */}
      <View className="flex-row items-center justify-between px-1 mb-4">
        <NavButton
          icon="chevron-back"
          label={t.reservations.prev_month}
          onPress={() => setMonth(m => addMonths(m, -1))}
        />
        <TouchableOpacity onPress={goToToday} accessibilityLabel={t.reservations.today}>
          <Text className="text-slate-100 text-xl font-bold">
            {monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)}
          </Text>
        </TouchableOpacity>
        <NavButton
          icon="chevron-forward"
          label={t.reservations.next_month}
          onPress={() => setMonth(m => addMonths(m, 1))}
        />
      </View>

      {/* Dias da semana */}
      <View className="flex-row mb-1">
        {weekdayLabels.map(label => (
          <Text
            key={label}
            className="flex-1 text-center text-slate-500 text-xs font-semibold tracking-wider"
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Grelha do mês */}
      {weeks.map(week => (
        <View key={toKey(week[0])} className="flex-row">
          {week.map(day => {
            const key = toKey(day);
            if (!isSameMonth(day, month)) {
              return <View key={key} style={{ flex: 1, aspectRatio: 1 }} />;
            }
            const isSelected = key === selected;
            const isBooked   = booked.has(key);
            const isToday    = key === today;
            const isPast     = key < today;

            const bg = isSelected ? SELECTED_BG : isBooked ? BOOKED_BG : 'transparent';
            const color = isSelected
              ? SELECTED_TX
              : isBooked
                ? BOOKED_TEXT
                : isToday
                  ? COLORS.primary
                  : COLORS.text;

            return (
              <TouchableOpacity
                key={key}
                onPress={() => onSelect(isSelected ? null : key)}
                style={{ flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: '86%',
                    height: '86%',
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: bg,
                    borderWidth: isToday && !isSelected ? 1 : 0,
                    borderColor: COLORS.primary,
                    opacity: isPast && !isSelected ? 0.5 : 1,
                  }}
                >
                  <Text
                    style={{ color }}
                    className={`text-sm ${isToday || isSelected ? 'font-bold' : 'font-medium'}`}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Legenda */}
      <View className="flex-row gap-4 px-1 mt-3">
        <LegendItem
          label={t.reservations.legend_available}
          style={{ borderWidth: 1, borderColor: COLORS.textSubtle }}
        />
        <LegendItem label={t.reservations.legend_booked} style={{ backgroundColor: BOOKED_BG }} />
        <LegendItem label={t.reservations.legend_selected} style={{ backgroundColor: SELECTED_BG }} />
      </View>
    </View>
  );
}
