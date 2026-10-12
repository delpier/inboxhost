import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, Linking, ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInDays, isToday, isTomorrow, isPast } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import {
  getReservations,
  addMessageToReservation,
  markMessagesAsRead,
} from '../../services/storage';
import { useI18n } from '../../i18n';
import { AdBanner } from '../../components/AdBanner';
import { Reservation, Message, PLATFORM_ICONS, PLATFORM_LABELS } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


function getStatusInfo(checkIn: string, checkOut: string, t: any) {
  if (isPast(parseISO(checkOut)))    return { label: t.detail.status_past,     color: 'bg-slate-700',   text: 'text-slate-300' };
  if (isToday(parseISO(checkIn)))    return { label: t.detail.status_today,    color: 'bg-emerald-900', text: 'text-emerald-400' };
  if (isTomorrow(parseISO(checkIn))) return { label: t.detail.status_tomorrow, color: 'bg-amber-900',   text: 'text-amber-400' };
  if (!isPast(parseISO(checkIn)))    return { label: t.detail.status_upcoming,  color: 'bg-blue-900',    text: 'text-blue-400' };
  return                                    { label: t.detail.status_active,    color: 'bg-emerald-900', text: 'text-emerald-400' };
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <View className="flex-row items-start gap-3 py-2 border-b border-slate-800">
      {icon ? <Ionicons name={icon as any} size={16} color="#64748B" style={{ marginTop: 2 }} /> : <View className="w-4" />}
      <View className="flex-1">
        <Text className="text-slate-500 text-xs mb-0.5">{label}</Text>
        <Text className="text-slate-200 text-sm">{value}</Text>
      </View>
    </View>
  );
}

export default function ReservationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [input, setInput]             = useState('');
  const [sending, setSending]         = useState(false);
  const [showInfo, setShowInfo]       = useState(true);
  const listRef = useRef<FlatList>(null);
  const dateFnsLocale = locale === 'pt' ? pt : enUS;

const insets = useSafeAreaInsets();

  const load = async () => {
    const all = await getReservations();
    const res = all.find(r => r.id === id) ?? null;
    setReservation(res);
    if (res) await markMessagesAsRead(res.id);
  };

  useEffect(() => { load(); }, [id]);

  const sendMessage = async () => {
    if (!input.trim() || !reservation || sending) return;
    setSending(true);
    const msg: Message = {
      id:            Date.now().toString(),
      reservationId: reservation.id,
      text:          input.trim(),
      direction:     'sent',
      timestamp:     new Date().toISOString(),
      read:          true,
    };
    await addMessageToReservation(reservation.id, msg);
    setInput('');
    await load();
    setSending(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (!reservation) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-slate-500">{t.detail.not_found}</Text>
      </View>
    );
  }

  const nights = differenceInDays(parseISO(reservation.checkOut), parseISO(reservation.checkIn));
  const status = getStatusInfo(reservation.checkIn, reservation.checkOut, t);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View className="bg-slate-900 px-4 pt-14 pb-3">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#F1F5F9" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-slate-100 text-lg font-bold" numberOfLines={1}>
              {reservation.guestName}
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-slate-500 text-xs">{PLATFORM_ICONS[reservation.platform]} {PLATFORM_LABELS[reservation.platform]}</Text>
              <View className={`px-2 py-0.5 rounded-full ${status.color}`}>
                <Text className={`text-xs font-medium ${status.text}`}>{status.label}</Text>
              </View>
            </View> 
          </View>
		  {reservation.reservationUrl && (
  <TouchableOpacity
    onPress={() => Linking.openURL(reservation.reservationUrl!)}
    className="flex-row items-center gap-2 bg-slate-800 rounded-xl px-2 py-3 mx-2 mt-2"
  >
    <Ionicons name="open-outline" size={16} color="#2563EB" />
    <Text className="text-blue-400 text-sm">Abrir reserva
      {/* {reservation.reservationCode
        ? `Abrir reserva ${reservation.reservationCode}`
        : 'Abrir no Airbnb'} */}
    </Text>
  </TouchableOpacity>
 
)

}
          {reservation.guestEmail ? (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${reservation.guestEmail}`)} className="p-1">
              <Ionicons name="mail-outline" size={22} color="#2563EB" />
            </TouchableOpacity>
          ) : null}
          {reservation.guestPhone ? (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${reservation.guestPhone}`)} className="p-1">
              <Ionicons name="call-outline" size={22} color="#10B981" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Dates summary bar */}
      <View className="flex-row bg-slate-900 border-t border-slate-800">
        <View className="flex-1 px-4 py-2.5 border-r border-slate-800">
          <Text className="text-slate-500 text-xs">{t.detail.checkin}</Text>
          <Text className="text-slate-100 text-sm font-semibold">
            {format(parseISO(reservation.checkIn), 'EEE dd MMM yyyy', { locale: dateFnsLocale })}
          </Text>
        </View>
        <View className="flex-1 px-4 py-2.5 border-r border-slate-800">
          <Text className="text-slate-500 text-xs">{t.detail.checkout}</Text>
          <Text className="text-slate-100 text-sm font-semibold">
            {format(parseISO(reservation.checkOut), 'EEE dd MMM yyyy', { locale: dateFnsLocale })}
          </Text>
        </View>
        <View className="px-4 py-2.5 items-center justify-center">
          <Text className="text-blue-400 text-xl font-bold">{nights}</Text>
          <Text className="text-slate-500 text-xs">{t.reservations.nights(nights)}</Text>
        </View>
      </View>

      {/* Collapsible info section */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-2 bg-slate-900/50 border-t border-slate-800"
        onPress={() => setShowInfo(!showInfo)}
      >
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
          {t.detail.guest}
        </Text>
        <Ionicons name={showInfo ? 'chevron-up' : 'chevron-down'} size={16} color="#475569" />
      </TouchableOpacity>

      {showInfo && (
        <View className="mx-4 mb-2 bg-slate-900 rounded-xl px-4 overflow-hidden">
          {reservation.guestEmail && (
            <InfoRow label={t.detail.email} value={reservation.guestEmail} icon="mail-outline" />
          )}
          {reservation.guestPhone && (
            <InfoRow label={t.detail.phone} value={reservation.guestPhone} icon="call-outline" />
          )}
          <InfoRow label={t.detail.platform} value={`${PLATFORM_ICONS[reservation.platform]} ${PLATFORM_LABELS[reservation.platform]}`} icon="globe-outline" />
          <InfoRow label={t.detail.source} value={reservation.sourceId} icon="link-outline" />
          {reservation.notes ? (
            <View className="py-2">
              <Text className="text-slate-500 text-xs mb-1">{t.detail.notes}</Text>
              <Text className="text-slate-300 text-sm">{reservation.notes}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Messages */} 
      <View className="mx-4 mb-2 bg-slate-900 rounded-xl px-4 overflow-hidden">
        <InfoRow label={t.detail.internal_notes_title} value={locale === 'pt'
            ? 'Notas privadas sobre esta reserva. As mensagens do Airbnb estão na plataforma original.'
            : 'Private notes about this reservation. Airbnb messages are on the original platform.'} icon="globe-outline" />
        {/* <View className="py-1">
          <Text className="text-slate-300 text-sm">{locale === 'pt'
            ? 'Notas privadas sobre esta reserva. As mensagens do Airbnb estão na plataforma original.'
            : 'Private notes about this reservation. Airbnb messages are on the original platform.'}</Text>
        </View> */}

      </View>
      <FlatList
        ref={listRef}
        data={reservation.messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View className="items-center mt-8 gap-2">
            <Ionicons name="chatbubble-outline" size={32} color="#334155" />
            <Text className="text-slate-600 text-sm">{t.detail.no_messages}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className={`mb-2 max-w-xs ${item.direction === 'sent' ? 'self-end' : 'self-start'}`}>
            <View className={`rounded-2xl px-3.5 py-2.5 ${
              item.direction === 'sent' ? 'bg-blue-600 rounded-br-sm' : 'bg-slate-800 rounded-bl-sm'
            }`}>
              <Text className="text-slate-100 text-sm leading-5">{item.text}</Text>
            </View>
            <Text className={`text-slate-600 text-xs mt-0.5 ${
              item.direction === 'sent' ? 'text-right' : 'text-left'
            }`}>
              {format(parseISO(item.timestamp), 'HH:mm')}
            </Text>
          </View>
        )}
      />

      {/* Input */}
       <View  style={{ paddingBottom: insets.bottom}}>
        <AdBanner /> 
      
      <View className="flex-row items-end gap-2 px-3 py-3 bg-slate-900 border-t border-slate-800">
        <TextInput
          className="flex-1 bg-slate-800 rounded-2xl px-4 py-2.5 text-slate-100 text-sm max-h-24"
          value={input}
          onChangeText={setInput}
          placeholder={t.detail.placeholder}
          placeholderTextColor="#475569"
          multiline
          blurOnSubmit={false}
        />
        <TouchableOpacity
          className={`w-11 h-11 rounded-full items-center justify-center ${
            input.trim() ? 'bg-blue-600' : 'bg-slate-800'
          }`}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
        >
          <Ionicons name="send" size={18} color={input.trim() ? '#fff' : '#475569'} />
        </TouchableOpacity>
      </View>

     </View> 
    </KeyboardAvoidingView>
  );
}
