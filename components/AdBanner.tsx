import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n';
import { usePro } from '../context/ProContext';
import { BANNER_AD_ID } from '../constants/config';

// Importação condicional — AdMob só está disponível em development builds
// Se a lib não estiver instalada, usa o placeholder
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

try {
  const admob = require('react-native-google-mobile-ads');
  BannerAd     = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
  TestIds      = admob.TestIds;
} catch {
  // react-native-google-mobile-ads não instalado ou Expo Go
  // Usa o placeholder abaixo
}

function AdPlaceholder({ label }: { label: string }) {
  return (
    <View className="mx-3 my-1.5 h-2 bg-slate-800 rounded-lg items-center justify-center border border-slate-700">
      <Text className="text-slate-500 text-xs">
        {BannerAd ? '🔴 AdMob (development build necessário)' : label}
      </Text>
    </View>
  );
}

export function AdBanner() {
  const { t }     = useI18n();
  const { isPro } = usePro();
  const insets    = useSafeAreaInsets();

  // Versão Pro — sem publicidade
  if (isPro) return null;

  return (
    <View
      className="w-full bg-slate-900 border-t border-slate-800 pb-4 "
      //  style={{ paddingBottom: Math.max(insets.bottom, 2) }}
    >
      <Text className="text-slate-600 text-xs text-center pt-1">
        {t.ad.label}
      </Text>

      {BannerAd ? (
        // Banner AdMob real
        <View className="items-center my-1">
          <BannerAd
            unitId={BANNER_AD_ID}
            size={BannerAdSize.BANNER}           // 320x50
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,  // GDPR compliance
            }}
            onAdLoaded={() => console.log('[AdMob] Banner loaded')}
            onAdFailedToLoad={(err: any) => console.warn('[AdMob] Banner failed:', err)}
          />
        </View>
      ) : (
        // Placeholder para Expo Go / sem AdMob instalado
        <AdPlaceholder label="320 × 50 Banner Ad" />
      )}
    </View>
  );
}
