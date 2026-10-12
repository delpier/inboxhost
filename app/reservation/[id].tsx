import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInDays } from 'date-fns';
import { getReservationPhase } from '../../utils/reservation';
import { pt, enUS } from 'date-fns/locale';
import {
  getReservations,
  getCalendarSources,
  addMessageToReservation,
  markMessagesAsRead,
} from '../../services/storage';
import { useI18n } from '../../i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdBanner } from '../../components/AdBanner';
import { MessageBubble, CHANNEL_ICONS, NOTE_ICON } from '../../components/MessageBubble';
import {
  CHANNELS,
  TEMPLATE_KEYS,
  TemplateKey,
  canUseChannel,
  fillTemplate,
  openMessageChannel,
} from '../../services/messageService';
import { Reservation, Message, MessageChannel, PLATFORM_ICONS, PLATFORM_LABELS } from '../../types';

function getStatusInfo(checkIn: string, checkOut: string, t: any) {
  switch (getReservationPhase({ checkIn, checkOut })) {
    case 'past':     return { label: t.detail.status_past,     color: 'bg-slate-700',   text: 'text-slate-300' };
    case 'today':    return { label: t.detail.status_today,    color: 'bg-emerald-900', text: 'text-emerald-400' };
    case 'tomorrow': return { label: t.detail.status_tomorrow, color: 'bg-amber-900',   text: 'text-amber-400' };
    case 'upcoming': return { label: t.detail.status_upcoming, color: 'bg-blue-900',    text: 'text-blue-400' };
    default:         return { label: t.detail.status_active,   color: 'bg-emerald-900', text: 'text-emerald-400' };
  }
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
  const [sourceName, setSourceName]   = useState<string | null>(null);
  const [input, setInput]             = useState('');
  const [sending, setSending]         = useState(false);
  const [showInfo, setShowInfo]       = useState(true);
  const listRef = useRef<FlatList>(null);
  const dateFnsLocale = locale === 'pt' ? pt : enUS;
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    const [all, sources] = await Promise.all([getReservations(), getCalendarSources()]);
    const res = all.find(r => r.id === id) ?? null;
    setReservation(res);
    setSourceName(sources.find(s => s.id === res?.sourceId)?.name ?? null);
    if (res) await markMessagesAsRead(res.id);
  }, [id]);

  // Recarrega ao voltar do ecrã de edição
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const applyTemplate = (key: TemplateKey) => {
    if (!reservation) return;
    setInput(fillTemplate(t.templates[key].text, reservation, t, locale));
  };

  // Abre a app escolhida com o texto pré-preenchido e regista a mensagem
  const sendVia = async (channel: MessageChannel) => {
    if (!reservation || sending) return;
    const text = input.trim();
    if (!text) return Alert.alert(t.calendars.attention, t.messaging.empty_text);

    if (!canUseChannel(channel, reservation)) {
      Alert.alert(
        t.calendars.attention,
        channel === 'email' ? t.messaging.no_email : t.messaging.no_phone,
        [
          { text: t.calendars.cancel, style: 'cancel' },
          { text: t.messaging.add_contact, onPress: goToEdit },
        ]
      );
      return;
    }

    setSending(true);
    try {
      const subject = t.messaging.subject(reservation.property || t.messaging.property_fallback);
      const opened  = await openMessageChannel(channel, reservation, text, subject);
      if (!opened) {
        Alert.alert(t.calendars.attention, t.messaging.open_failed(t.messaging[channel]));
        return;
      }
      const msg: Message = {
        id:            Date.now().toString(),
        reservationId: reservation.id,
        text,
        direction:     'sent',
        channel,
        timestamp:     new Date().toISOString(),
        read:          true,
      };
      await addMessageToReservation(reservation.id, msg);
      setInput('');
      await load();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } finally {
      setSending(false);
    }
  };

  // Nota interna: fica só no telemóvel, não é enviada ao hóspede
  const saveNote = async () => {
    if (!reservation || sending) return;
    const text = input.trim();
    if (!text) return Alert.alert(t.calendars.attention, t.messaging.empty_text);
    setSending(true);
    try {
      await addMessageToReservation(reservation.id, {
        id:            Date.now().toString(),
        reservationId: reservation.id,
        text,
        direction:     'sent',
        timestamp:     new Date().toISOString(),
        read:          true,
      });
      setInput('');
      await load();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } finally {
      setSending(false);
    }
  };

  const goToEdit = () => {
    if (reservation) router.push(`/reservation/edit?id=${encodeURIComponent(reservation.id)}`);
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
)}
          {reservation.guestPhone ? (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${reservation.guestPhone}`)} className="p-1">
              <Ionicons name="call-outline" size={22} color="#10B981" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={goToEdit}
            className="p-1"
            accessibilityLabel={t.detail.edit}
          >
            <Ionicons name="pencil-outline" size={20} color="#94A3B8" />
          </TouchableOpacity>
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
          {reservation.guestPhone ? (
            <InfoRow label={t.detail.phone} value={reservation.guestPhone} icon="call-outline" />
          ) : reservation.phoneLast4 ? (
            <InfoRow label={t.detail.phone} value={`••• ${reservation.phoneLast4}`} icon="call-outline" />
          ) : null}
          {reservation.numGuests ? (
            <InfoRow label={t.edit_guest.num_guests} value={String(reservation.numGuests)} icon="people-outline" />
          ) : null}
          <InfoRow label={t.detail.platform} value={`${PLATFORM_ICONS[reservation.platform]} ${PLATFORM_LABELS[reservation.platform]}`} icon="globe-outline" />
          <InfoRow label={t.detail.source} value={sourceName ?? reservation.property ?? reservation.sourceId} icon="link-outline" />
          {reservation.notes ? (
            <View className="py-2">
              <Text className="text-slate-500 text-xs mb-1">{t.detail.notes}</Text>
              <Text className="text-slate-300 text-sm">{reservation.notes}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Messages */}
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
        renderItem={({ item }) => <MessageBubble message={item} />}
      />

      {/* Publicidade + composer; o padding inferior evita os botões de navegação do Android */}
      <View style={{ paddingBottom: insets.bottom }} className="bg-slate-900">
      <AdBanner />

      {/* Composer: modelos + texto + canal de envio ou nota interna */}
      <View className="px-3 pt-2 pb-3 bg-slate-900 border-t border-slate-800 gap-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 6 }}
        >
          {TEMPLATE_KEYS.map(key => (
            <TouchableOpacity
              key={key}
              onPress={() => applyTemplate(key)}
              className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700"
            >
              <Text className="text-slate-300 text-xs">{t.templates[key].label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          className="bg-slate-800 rounded-2xl px-4 py-2.5 text-slate-100 text-sm max-h-32"
          value={input}
          onChangeText={setInput}
          placeholder={t.detail.placeholder}
          placeholderTextColor="#475569"
          multiline
        />

        <View className="flex-row items-center gap-2">
          {CHANNELS.map(channel => {
            const available = canUseChannel(channel, reservation);
            const active    = available && !!input.trim() && !sending;
            return (
              <TouchableOpacity
                key={channel}
                onPress={() => sendVia(channel)}
                disabled={sending}
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
                  active ? 'bg-blue-600' : 'bg-slate-800'
                } ${available ? '' : 'opacity-50'}`}
              >
                <Ionicons
                  name={CHANNEL_ICONS[channel]}
                  size={16}
                  color={active ? '#fff' : '#64748B'}
                />
                <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-500'}`}>
                  {t.messaging[channel]}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={saveNote}
            disabled={sending}
            accessibilityLabel={t.detail.internal_notes_title}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
              input.trim() && !sending ? 'bg-amber-400' : 'bg-slate-800'
            }`}
          >
            <Ionicons
              name={NOTE_ICON}
              size={16}
              color={input.trim() && !sending ? '#020617' : '#64748B'}
            />
            <Text className={`text-xs font-semibold ${input.trim() && !sending ? 'text-slate-950' : 'text-slate-500'}`}>
              {t.messaging.note}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}
