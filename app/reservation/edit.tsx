import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';
import { getReservations, updateGuestDetails } from '../../services/storage';
import { reschedule } from '../../services/notificationService';
import { Reservation } from '../../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({
  label, value, onChangeText, placeholder, keyboardType, hint, autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
  hint?: string;
  autoCapitalize?: 'none' | 'words';
}) {
  return (
    <View>
      <Text className="text-slate-500 text-xs uppercase tracking-widest mb-2">{label}</Text>
      <TextInput
        className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
      {hint ? <Text className="text-slate-600 text-xs mt-1">{hint}</Text> : null}
    </View>
  );
}

export default function EditGuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t }  = useI18n();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [email, setEmail]         = useState('');
  const [numGuests, setNumGuests] = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    getReservations().then(all => {
      const found = all.find(r => r.id === id);
      if (found) {
        setReservation(found);
        setName(found.guestName);
        setPhone(found.guestPhone ?? '');
        setEmail(found.guestEmail ?? '');
        setNumGuests(found.numGuests ? String(found.numGuests) : '');
      }
    });
  }, [id]);

  const handleSave = async () => {
    if (!reservation) return;
    if (!name.trim()) return Alert.alert(t.calendars.attention, t.edit_guest.error_name);
    if (email.trim() && !EMAIL_REGEX.test(email.trim()))
      return Alert.alert(t.calendars.attention, t.edit_guest.error_email);
    if (phone.trim() && phone.replace(/\D/g, '').length < 6)
      return Alert.alert(t.calendars.attention, t.edit_guest.error_phone);

    setSaving(true);
    try {
      const guests = parseInt(numGuests, 10);
      await updateGuestDetails(reservation.id, {
        guestName:  name.trim(),
        guestPhone: phone.trim(),
        guestEmail: email.trim(),
        numGuests:  Number.isFinite(guests) && guests > 0 ? guests : undefined,
      });
      reschedule(); // o nome do hóspede aparece nas notificações
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (!reservation) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-14 pb-4 bg-slate-900">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F1F5F9" />
        </TouchableOpacity>
        <Text className="flex-1 text-slate-100 text-lg font-bold">{t.edit_guest.title}</Text>
      </View>

      <View className="px-4 pt-6 gap-4">
        <Field
          label={t.edit_guest.name}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <Field
          label={t.edit_guest.phone}
          value={phone}
          onChangeText={setPhone}
          placeholder="+351 912 345 678"
          keyboardType="phone-pad"
          hint={
            reservation.phoneLast4 && !reservation.guestPhone
              ? `${t.edit_guest.phone_last4(reservation.phoneLast4)}\n${t.edit_guest.phone_hint}`
              : t.edit_guest.phone_hint
          }
        />
        <Field
          label={t.edit_guest.email}
          value={email}
          onChangeText={setEmail}
          placeholder="guest@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label={t.edit_guest.num_guests}
          value={numGuests}
          onChangeText={v => setNumGuests(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
        />

        <View className="bg-slate-900 rounded-xl px-4 py-3 flex-row items-center gap-3">
          <Ionicons name="information-circle-outline" size={16} color="#64748B" />
          <Text className="flex-1 text-slate-500 text-xs">{t.edit_guest.info}</Text>
        </View>

        <View className="flex-row gap-3 mt-4">
          <TouchableOpacity
            className="flex-1 bg-slate-800 rounded-xl py-3.5 items-center"
            onPress={() => router.back()}
          >
            <Text className="text-slate-400 font-semibold">{t.edit_guest.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 rounded-xl py-3.5 items-center ${saving ? 'bg-blue-800' : 'bg-blue-600'}`}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text className="text-white font-bold">{t.edit_guest.save}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
