import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';
import { useNetwork } from '../../hooks/useNetwork';
import { getCalendarSources, saveCalendarSource } from '../../services/storage';
import { syncCalendar } from '../../services/syncService';
import { CalendarSource, Platform, PLATFORM_COLORS } from '../../types';

const PLATFORM_VALUES: Platform[] = ['airbnb', 'booking', 'vrbo', 'other'];
const PLATFORM_EMOJI: Record<Platform, string> = {
  airbnb:  '🏠 Airbnb',
  booking: '🔵 Booking.com',
  vrbo:    '🌴 VRBO',
  other:   '📅 Outro',
};

export default function EditCalendarScreen() {
  const { id }          = useLocalSearchParams<{ id: string }>();
  const { locale }      = useI18n();
  const { isConnected } = useNetwork();

  const [source, setSource]     = useState<CalendarSource | null>(null);
  const [name, setName]         = useState('');
  const [url, setUrl]           = useState('');
  const [platform, setPlatform] = useState<Platform>('airbnb');
  const [saving, setSaving]     = useState(false);
  const [syncing, setSyncing]   = useState(false);

  useEffect(() => {
    getCalendarSources().then(sources => {
      const found = sources.find(s => s.id === id);
      if (found) {
        setSource(found);
        setName(found.name);
        setUrl(found.url);
        setPlatform(found.platform);
      }
    });
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(
        locale === 'pt' ? 'Atenção' : 'Attention',
        locale === 'pt' ? 'Indica um nome.' : 'Please enter a name.'
      );
      return;
    }
    if (!url.trim() || !url.startsWith('http')) {
      Alert.alert(
        locale === 'pt' ? 'Atenção' : 'Attention',
        locale === 'pt' ? 'URL iCal inválido.' : 'Invalid iCal URL.'
      );
      return;
    }

    setSaving(true);
    try {
      const updated: CalendarSource = {
        ...source!,
        name:     name.trim(),
        url:      url.trim(),
        platform,
        color:    PLATFORM_COLORS[platform],
      };
      await saveCalendarSource(updated);

      // Re-sincroniza se a URL mudou e há ligação
      if (url.trim() !== source!.url && isConnected) {
        setSyncing(true);
        await syncCalendar(updated);
        setSyncing(false);
      }

      Alert.alert(
        locale === 'pt' ? 'Guardado!' : 'Saved!',
        locale === 'pt' ? 'Calendário actualizado.' : 'Calendar updated.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert(
        locale === 'pt' ? 'Erro' : 'Error',
        locale === 'pt' ? 'Não foi possível guardar.' : 'Could not save.'
      );
    } finally {
      setSaving(false);
      setSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    if (!isConnected) {
      Alert.alert(
        locale === 'pt' ? 'Sem ligação' : 'No connection',
        locale === 'pt' ? 'Verifica a tua ligação à internet.' : 'Check your internet connection.'
      );
      return;
    }
    setSyncing(true);
    try {
      const count = await syncCalendar({ ...source!, name, url, platform, color: PLATFORM_COLORS[platform] });
      Alert.alert(
        locale === 'pt' ? 'Sincronizado!' : 'Synced!',
        locale === 'pt' ? `${count} reserva(s) importada(s).` : `${count} reservation(s) imported.`
      );
    } catch {
      Alert.alert(
        locale === 'pt' ? 'Erro' : 'Error',
        locale === 'pt' ? 'Falha ao sincronizar.' : 'Sync failed.'
      );
    } finally {
      setSyncing(false);
    }
  };

  if (!source) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-14 pb-4 bg-slate-900">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F1F5F9" />
        </TouchableOpacity>
        <Text className="flex-1 text-slate-100 text-lg font-bold">
          {locale === 'pt' ? 'Editar Calendário' : 'Edit Calendar'}
        </Text>
        {/* Sync agora */}
        <TouchableOpacity
          onPress={handleSyncNow}
          disabled={syncing}
          className="p-2 rounded-full bg-slate-800"
        >
          {syncing
            ? <ActivityIndicator size="small" color="#2563EB" />
            : <Ionicons name="sync-outline" size={20} color="#2563EB" />}
        </TouchableOpacity>
      </View>

      <View className="px-4 pt-6 gap-4">
        {/* Plataforma */}
        <View>
          <Text className="text-slate-500 text-xs uppercase tracking-widest mb-2">
            {locale === 'pt' ? 'Plataforma' : 'Platform'}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PLATFORM_VALUES.map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setPlatform(p)}
                className={`px-3 py-2 rounded-xl border ${
                  platform === p
                    ? 'border-blue-500 bg-blue-950'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                <Text className="text-slate-200 text-sm">{PLATFORM_EMOJI[p]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nome */}
        <View>
          <Text className="text-slate-500 text-xs uppercase tracking-widest mb-2">
            {locale === 'pt' ? 'Nome' : 'Name'}
          </Text>
          <TextInput
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm"
            value={name}
            onChangeText={setName}
            placeholder={locale === 'pt' ? 'Ex: Apartamento Lisboa' : 'E.g. Lisbon Apartment'}
            placeholderTextColor="#475569"
          />
        </View>

        {/* URL iCal */}
        <View>
          <Text className="text-slate-500 text-xs uppercase tracking-widest mb-2">
            URL iCal
          </Text>
          <TextInput
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm"
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            placeholderTextColor="#475569"
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
            multiline
          />
          {url !== source.url && (
            <View className="flex-row items-center gap-1 mt-1">
              <Ionicons name="information-circle-outline" size={12} color="#F59E0B" />
              <Text className="text-amber-600 text-xs">
                {locale === 'pt'
                  ? 'URL alterado — será sincronizado ao guardar'
                  : 'URL changed — will sync on save'}
              </Text>
            </View>
          )}
        </View>

        {/* Info última sync */}
        {source.lastSync && (
          <View className="bg-slate-900 rounded-xl px-4 py-3 flex-row items-center gap-3">
            <Ionicons name="time-outline" size={16} color="#64748B" />
            <View>
              <Text className="text-slate-500 text-xs">
                {locale === 'pt' ? 'Última sincronização' : 'Last sync'}
              </Text>
              <Text className="text-slate-300 text-sm">
                {new Date(source.lastSync).toLocaleString(locale === 'pt' ? 'pt-PT' : 'en-GB')}
              </Text>
            </View>
          </View>
        )}

        {/* Botões */}
        <View className="flex-row gap-3 mt-4">
          <TouchableOpacity
            className="flex-1 bg-slate-800 rounded-xl py-3.5 items-center"
            onPress={() => router.back()}
          >
            <Text className="text-slate-400 font-semibold">
              {locale === 'pt' ? 'Cancelar' : 'Cancel'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 rounded-xl py-3.5 items-center ${saving ? 'bg-blue-800' : 'bg-blue-600'}`}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text className="text-white font-bold">
                  {locale === 'pt' ? 'Guardar' : 'Save'}
                </Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
