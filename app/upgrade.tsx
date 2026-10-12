import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePro } from '../context/ProContext';
import { useI18n } from '../i18n';
import { getProProduct, IAPProduct } from '../services/iapService';
import { PRO_PRICE } from '../constants/config';

const FEATURES = [
  { icon: 'ban-outline',           pt: 'Sem publicidade',            en: 'No advertisements'       },
  { icon: 'link-outline',          pt: 'Calendários ilimitados',     en: 'Unlimited calendars'     },
  { icon: 'notifications-outline', pt: 'Notificações de check-in',   en: 'Check-in notifications'  },
  { icon: 'sync-outline',          pt: 'Sincronização automática',   en: 'Automatic sync'          },
  { icon: 'document-text-outline', pt: 'Exportar relatórios',        en: 'Export reports'          },
  { icon: 'heart-outline',         pt: 'Suporte ao desenvolvimento', en: 'Support development'     },
];

export default function UpgradeScreen() {
  const { isPro, purchasePro, restorePurchases, activatePro } = usePro();
  const { locale } = useI18n();

  const [product,   setProduct]   = useState<IAPProduct | null>(null);
  const [buying,    setBuying]    = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Tenta obter o preço real da Play Store
  useEffect(() => {
    getProProduct().then(setProduct);
  }, []);

  const displayPrice = product?.localizedPrice ?? PRO_PRICE;

  const handlePurchase = async () => {
    setBuying(true);
    try {
      if (!product) {
        // IAP não disponível — modo desenvolvimento
        Alert.alert(
          'InboxHost Pro',
          locale === 'pt'
            ? 'IAP não disponível neste build.\nActivar modo Pro para teste?'
            : 'IAP not available in this build.\nActivate Pro mode for testing?',
          [
            { text: locale === 'pt' ? 'Cancelar' : 'Cancel', style: 'cancel' },
            {
              text: locale === 'pt' ? 'Activar (teste)' : 'Activate (test)',
              onPress: async () => {
                await activatePro();
                Alert.alert('⭐ Pro', locale === 'pt' ? 'Activado!' : 'Activated!',
                  [{ text: 'OK', onPress: () => router.back() }]);
              },
            },
          ]
        );
        return;
      }

      const success = await purchasePro();
      if (success) {
        // O listener no usePro já actualizou isPro — navega de volta
        router.back();
      }
    } catch {
      Alert.alert(
        locale === 'pt' ? 'Erro' : 'Error',
        locale === 'pt' ? 'Não foi possível completar a compra.' : 'Could not complete the purchase.'
      );
    } finally {
      setBuying(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      Alert.alert(
        restored
          ? (locale === 'pt' ? 'Compra restaurada!' : 'Purchase restored!')
          : (locale === 'pt' ? 'Sem compras anteriores' : 'No previous purchases'),
        restored
          ? (locale === 'pt' ? 'InboxHost Pro activado.' : 'InboxHost Pro activated.')
          : (locale === 'pt' ? 'Nenhuma compra encontrada para esta conta.' : 'No purchase found for this account.')
      );
      if (restored) router.back();
    } catch {
      Alert.alert(
        locale === 'pt' ? 'Erro' : 'Error',
        locale === 'pt' ? 'Não foi possível restaurar.' : 'Could not restore.'
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ paddingBottom: 48 }}>
      <View className="px-6 pt-16 pb-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-8 self-start">
          <Ionicons name="arrow-back" size={24} color="#94A3B8" />
        </TouchableOpacity>

        {/* Hero */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-blue-950 rounded-full items-center justify-center mb-4">
            <Text className="text-4xl">⭐</Text>
          </View>
          <Text className="text-slate-100 text-3xl font-bold">InboxHost Pro</Text>
          <Text className="text-slate-400 text-sm mt-2 text-center px-4">
            {locale === 'pt'
              ? 'Remove os anúncios e desbloqueia todas as funcionalidades'
              : 'Remove ads and unlock all features'}
          </Text>
        </View>

        {/* Já é Pro */}
        {isPro && (
          <View className="bg-emerald-900/50 border border-emerald-700 rounded-xl px-4 py-3 mb-6 flex-row items-center gap-3">
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text className="text-emerald-400 font-semibold">
              {locale === 'pt' ? 'Pro activo — obrigado!' : 'Pro active — thank you!'}
            </Text>
          </View>
        )}

        {/* Features */}
        <View className="bg-slate-900 rounded-2xl px-4 py-2 mb-8">
          {FEATURES.map((f, i) => (
            <View
              key={f.icon}
              className={`flex-row items-center gap-3 py-3 ${i < FEATURES.length - 1 ? 'border-b border-slate-800' : ''}`}
            >
              <View className="w-8 h-8 bg-blue-950 rounded-full items-center justify-center">
                <Ionicons name={f.icon as any} size={16} color="#2563EB" />
              </View>
              <Text className="text-slate-200 text-sm flex-1">
                {locale === 'pt' ? f.pt : f.en}
              </Text>
              <Ionicons name="checkmark" size={16} color="#10B981" />
            </View>
          ))}
        </View>

        {/* Preço — vem da Play Store ou do fallback */}
        <View className="items-center mb-6">
          <Text className="text-slate-500 text-sm">
            {locale === 'pt' ? 'Pagamento único · Sem subscrição' : 'One-time payment · No subscription'}
          </Text>
          <Text className="text-slate-100 text-4xl font-bold mt-1">{displayPrice}</Text>
        </View>

        {/* CTA */}
        {!isPro ? (
          <>
            <TouchableOpacity
              className={`rounded-xl py-4 items-center mb-3 ${buying ? 'bg-blue-800' : 'bg-blue-600'}`}
              onPress={handlePurchase}
              disabled={buying}
              activeOpacity={0.8}
            >
              {buying
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white font-bold text-base">
                    {locale === 'pt' ? `Comprar — ${displayPrice}` : `Buy — ${displayPrice}`}
                  </Text>}
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 items-center"
              onPress={handleRestore}
              disabled={restoring}
            >
              {restoring
                ? <ActivityIndicator size="small" color="#64748B" />
                : <Text className="text-slate-500 text-sm">
                    {locale === 'pt' ? 'Restaurar compra anterior' : 'Restore previous purchase'}
                  </Text>}
            </TouchableOpacity>
          </>
        ) : (
          <View className="bg-slate-900 rounded-xl py-4 items-center">
            <Text className="text-slate-400 text-sm">
              {locale === 'pt' ? 'Já és utilizador Pro ⭐' : 'You are already a Pro user ⭐'}
            </Text>
          </View>
        )}

        <Text className="text-slate-700 text-xs text-center mt-6 px-4">
          {locale === 'pt'
            ? 'Compra processada pela Google Play. Sujeito aos Termos de Serviço.'
            : 'Purchase processed by Google Play. Subject to Terms of Service.'}
        </Text>
      </View>
    </ScrollView>
  );
}
