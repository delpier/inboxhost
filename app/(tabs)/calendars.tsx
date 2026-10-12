import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCalendarSources } from '../../hooks/useCalendarSources';
import { useI18n } from '../../i18n';
import { AdBanner } from '../../components/AdBanner';
import { OfflineBanner } from '../../components/OfflineBanner';
import { NotificationSettings } from '../../components/NotificationSettings';
import { useNetwork } from '../../hooks/useNetwork';
import { usePro } from '../../context/ProContext';
import { useNotifications } from '../../hooks/useNotifications';
import { HeaderActions } from './_layout';
import { CalendarSource, Platform, PLATFORM_COLORS } from '../../types';
import { FREE_CALENDAR_LIMIT } from '../../constants/config';

const PLATFORM_VALUES: Platform[] = ['airbnb', 'booking', 'vrbo', 'other'];
const PLATFORM_EMOJI: Record<Platform, string> = {
  airbnb:  '🏠 Airbnb',
  booking: '🔵 Booking.com',
  vrbo:    '🌴 VRBO',
  other:   '📅 Outro',
};

export default function CalendarsScreen() {
  const { t, locale }   = useI18n();
  const { isConnected } = useNetwork();
  const { isPro }       = usePro();
  const navigation      = useNavigation();
  const { reschedule }  = useNotifications(locale);
  const { sources, addSource, removeSource, toggle, syncSource } = useCalendarSources();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName]         = useState('');
  const [url, setUrl]           = useState('');
  const [platform, setPlatform] = useState<Platform>('airbnb');
  const [saving, setSaving]     = useState(false);

  const calendarLimit  = isPro ? Infinity : FREE_CALENDAR_LIMIT;
  const atLimit        = sources.length >= calendarLimit;
  const slotsRemaining = isPro ? null : Math.max(0, FREE_CALENDAR_LIMIT - sources.length);

  const openAddModal = () => {
    if (atLimit) {
      Alert.alert(
        locale === 'pt' ? 'Limite atingido' : 'Limit reached',
        locale === 'pt'
          ? `A versão gratuita permite até ${FREE_CALENDAR_LIMIT} calendários.`
          : `The free version allows up to ${FREE_CALENDAR_LIMIT} calendars.`,
        [
          { text: locale === 'pt' ? 'Cancelar' : 'Cancel', style: 'cancel' },
          { text: '⭐ Pro', onPress: () => router.push('/upgrade') },
        ]
      );
      return;
    }
    setModalVisible(true);
  };

  useFocusEffect(useCallback(() => {
    navigation.setOptions({
      headerRight: () => <HeaderActions onAdd={openAddModal} />,
    });
  }, [sources.length, isPro]));

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert(t.calendars.attention, t.calendars.error_name);
    if (!url.trim() || !url.startsWith('http'))
      return Alert.alert(t.calendars.attention, t.calendars.error_url);
    if (!isConnected) return Alert.alert(t.network.offline, t.network.offline_sub);

    setSaving(true);
    try {
      const source: CalendarSource = {
        id: Date.now().toString(), name: name.trim(),
        url: url.trim(), platform, color: PLATFORM_COLORS[platform], active: true,
      };
      const count = await addSource(source);
      setModalVisible(false);
      resetForm();
      Alert.alert(t.calendars.success_added, t.calendars.success_msg(source.name, count));
      // Reagenda notificações com as novas reservas
      await reschedule();
    } catch {
      Alert.alert(t.calendars.attention, t.calendars.error_sync);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => { setName(''); setUrl(''); setPlatform('airbnb'); };

  const handleDelete = (src: CalendarSource) => {
    Alert.alert(t.calendars.delete_title, t.calendars.delete_msg(src.name), [
      { text: t.calendars.cancel, style: 'cancel' },
      { text: t.calendars.delete_confirm, style: 'destructive',
        onPress: async () => { await removeSource(src.id); await reschedule(); } },
    ]);
  };

  const handleSync = async (src: CalendarSource) => {
    if (!isConnected) return Alert.alert(t.network.offline, t.network.offline_sub);
    try {
      const count = await syncSource(src);
      Alert.alert(t.calendars.success_added, t.calendars.success_msg(src.name, count));
      // Reagenda notificações com dados actualizados
      await reschedule();
    } catch {
      Alert.alert(t.calendars.attention, t.calendars.error_sync);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <OfflineBanner />

      <FlatList
        data={sources}
        keyExtractor={s => s.id}
        contentContainerStyle={{ paddingBottom: 8 }}
        ListHeaderComponent={
          <>
            {/* Barra de limite (versão free) */}
            {!isPro && (
              <View className="mx-4 mt-3 mb-1 bg-slate-900 rounded-xl px-4 py-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-slate-400 text-xs font-medium">
                    {locale === 'pt'
                      ? `Calendários: ${sources.length} / ${FREE_CALENDAR_LIMIT}`
                      : `Calendars: ${sources.length} / ${FREE_CALENDAR_LIMIT}`}
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/upgrade')}>
                    <Text className="text-amber-400 text-xs font-semibold">⭐ Pro — ilimitado</Text>
                  </TouchableOpacity>
                </View>
                <View className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${atLimit ? 'bg-red-500' : 'bg-blue-600'}`}
                    style={{ width: `${Math.min((sources.length / FREE_CALENDAR_LIMIT) * 100, 100)}%` }}
                  />
                </View>
                {atLimit && (
                  <Text className="text-red-400 text-xs mt-1">
                    {locale === 'pt' ? 'Limite atingido.' : 'Limit reached.'}
                  </Text>
                )}
              </View>
            )}

            {/* Painel de notificações */}
            <NotificationSettings locale={locale} />

            {/* Label da lista */}
            {sources.length > 0 && (
              <Text className="text-slate-500 text-xs uppercase tracking-widest px-4 pt-4 pb-2">
                {locale === 'pt' ? 'Calendários activos' : 'Active calendars'}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View className="items-center mt-16 gap-3">
            <Ionicons name="link-outline" size={52} color="#334155" />
            <Text className="text-slate-400 text-lg font-semibold">{t.calendars.empty_title}</Text>
            <Text className="text-slate-500 text-sm text-center px-8">{t.calendars.empty_sub}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-slate-900 rounded-xl px-4 py-3 mb-2 mx-4">
            <View className="flex-row items-center gap-3">
              <View className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }} />
              <View className="flex-1 min-w-0">
                <Text className="text-slate-100 text-sm font-semibold">{item.name}</Text>
                <Text className="text-slate-600 text-xs" numberOfLines={1}>{item.url}</Text>
                {item.lastSync && (
                  <Text className="text-slate-700 text-xs mt-0.5">
                    {t.calendars.last_sync}: {new Date(item.lastSync).toLocaleString(
                      locale === 'pt' ? 'pt-PT' : 'en-GB'
                    )}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => router.push(`/calendar/edit?id=${item.id}`)}
                className="p-1.5"
              >
                <Ionicons name="pencil-outline" size={17} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSync(item)} className="p-1.5">
                <Ionicons name="sync-outline" size={17} color="#2563EB" />
              </TouchableOpacity>
              <Switch
                value={item.active}
                onValueChange={() => toggle(item.id)}
                trackColor={{ false: '#334155', true: '#1d4ed8' }}
                thumbColor={item.active ? '#2563EB' : '#64748B'}
              />
              <TouchableOpacity onPress={() => handleDelete(item)} className="p-1.5">
                <Ionicons name="trash-outline" size={17} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal adicionar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-slate-900 rounded-t-3xl px-6 pt-6 pb-10 gap-2">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-slate-100 text-xl font-bold">{t.calendars.add_title}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-500 text-xs uppercase tracking-widest mt-2">
              {t.calendars.platform}
            </Text>
            <View className="flex-row flex-wrap gap-2 mt-1">
              {PLATFORM_VALUES.map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg border ${
                    platform === p ? 'border-blue-500 bg-blue-950' : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  <Text className="text-slate-200 text-xs">{PLATFORM_EMOJI[p]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-slate-500 text-xs uppercase tracking-widest mt-3">
              {t.calendars.name}
            </Text>
            <TextInput
              className="bg-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm mt-1"
              value={name} onChangeText={setName}
              placeholder={t.calendars.name_placeholder} placeholderTextColor="#475569"
            />

            <Text className="text-slate-500 text-xs uppercase tracking-widest mt-3">
              {t.calendars.url}
            </Text>
            <TextInput
              className="bg-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm mt-1"
              value={url} onChangeText={setUrl}
              placeholder={t.calendars.url_placeholder} placeholderTextColor="#475569"
              autoCapitalize="none" keyboardType="url" autoCorrect={false}
            />

            <View className="flex-row gap-3 mt-5">
              <TouchableOpacity
                className="flex-1 bg-slate-700 rounded-xl py-3.5 items-center"
                onPress={() => { setModalVisible(false); resetForm(); }}
              >
                <Text className="text-slate-400 font-semibold">{t.calendars.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-xl py-3.5 items-center ${saving ? 'bg-blue-800' : 'bg-blue-600'}`}
                onPress={handleAdd} disabled={saving}
              >
                <Text className="text-white font-bold">
                  {saving ? t.calendars.adding : t.calendars.add}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AdBanner />
    </View>
  );
}
