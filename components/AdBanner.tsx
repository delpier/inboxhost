import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n';
import { usePro } from '../context/ProContext';

/**
 * AdBanner — placeholder para publicidade.
 * Usa useSafeAreaInsets para não ser tapado pelos botões de navegação do Android.
 * Substitui o interior por <BannerAd /> do react-native-google-mobile-ads quando pronto.
 */
export function AdBanner() {
  const { t }        = useI18n();
  const { isPro }    = usePro();
  const insets       = useSafeAreaInsets();

  // Versão Pro — sem publicidade
  if (isPro) return null;

  return (
    <View
      className="w-full bg-slate-900 border-t border-slate-800"
      style={{ paddingBottom: insets.bottom }}   // ← respeita a safe area do Android
    >
      <Text className="text-slate-600 text-xs text-center pt-1">
        {t.ad.label}
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        className="mx-3 my-1.5 h-12 bg-slate-800 rounded-lg items-center justify-center border border-slate-700"
      >
        <Text className="text-slate-500 text-xs">320 × 50 Banner Ad</Text>
      </TouchableOpacity>
    </View>
  );
}
