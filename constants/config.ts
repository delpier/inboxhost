// ─── Limites da versão gratuita ───────────────────────────────────────────
export const FREE_CALENDAR_LIMIT = 3;   // máximo de calendários na versão free
export const FREE_MESSAGE_LIMIT  = 50;  // máximo de mensagens guardadas (free)

// ─── Feature flags ────────────────────────────────────────────────────────
export const FEATURES = {
  // Versão Free
  free: {
    maxCalendars:    FREE_CALENDAR_LIMIT,
    maxMessages:     FREE_MESSAGE_LIMIT,
    hasAds:          true,
    hasExport:       false,
    hasStats:        false,
    hasMultiProperty: false,
  },
  // Versão Pro
  pro: {
    maxCalendars:    Infinity,
    maxMessages:     Infinity,
    hasAds:          false,
    hasExport:       true,
    hasStats:        true,
    hasMultiProperty: true,
  },
} as const;

// ─── Chaves do AsyncStorage partilhadas entre contexts e serviços ─────────
export const PRO_STORAGE_KEY    = 'is_pro_purchased';
export const LOCALE_STORAGE_KEY = 'app_locale';

export const PRO_PRODUCT_ID = 'com.inboxhost.app.pro';
export const PRO_PRICE      = '2,99€';
export const APP_VERSION    = '1.0.0';
