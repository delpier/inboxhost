import { Platform } from 'react-native';

// ─── Limites Free ─────────────────────────────────────────────────────────
export const FREE_CALENDAR_LIMIT = 3;
export const FREE_MESSAGE_LIMIT  = 50;

// ─── AdMob IDs ────────────────────────────────────────────────────────────
// Em desenvolvimento usa os IDs de teste do Google
// Em produção usa as variáveis de ambiente (.env)
const IS_DEV = __DEV__;

export const ADMOB_IDS = {
  android: {
    appId:    IS_DEV
      ? 'ca-app-pub-3940256099942544~3347511713'   // teste
      : (process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ?? ''),
    banner:   IS_DEV
      ? 'ca-app-pub-3940256099942544/6300978111'    // teste
      : (process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID ?? ''),
  },
  ios: {
    appId:    IS_DEV
      ? 'ca-app-pub-3940256099942544~1458002511'   // teste
      : (process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ?? ''),
    banner:   IS_DEV
      ? 'ca-app-pub-3940256099942544/2934735716'   // teste
      : (process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID ?? ''),
  },
};

export const BANNER_AD_ID = Platform.OS === 'ios'
  ? ADMOB_IDS.ios.banner
  : ADMOB_IDS.android.banner;

// ─── In-App Purchases ─────────────────────────────────────────────────────
export const PRO_PRODUCT_ID = process.env.EXPO_PUBLIC_PRO_PRODUCT_ID
  ?? 'com.inboxhost.app.pro';

export const PRO_PRICE = '2,99€';
export const APP_VERSION = '1.0.0';

// ─── Chaves do AsyncStorage partilhadas entre contexts e serviços ─────────
export const PRO_STORAGE_KEY    = 'is_pro_purchased';
export const LOCALE_STORAGE_KEY = 'app_locale';

// ─── Features ─────────────────────────────────────────────────────────────
export const FEATURES = {
  free: {
    maxCalendars:    FREE_CALENDAR_LIMIT,
    maxMessages:     FREE_MESSAGE_LIMIT,
    hasAds:          true,
    hasExport:       false,
    hasStats:        false,
    hasNotifications: false,
    hasAutoSync:     false,
  },
  pro: {
    maxCalendars:    Infinity,
    maxMessages:     Infinity,
    hasAds:          false,
    hasExport:       true,
    hasStats:        true,
    hasNotifications: true,
    hasAutoSync:     true,
  },
} as const;
