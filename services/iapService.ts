/**
 * In-App Purchases Service
 * Usa react-native-iap — compatível com Google Play e App Store
 *
 * Setup necessário:
 * 1. npx expo install react-native-iap
 * 2. Criar produto na Google Play Console (ver abaixo)
 * 3. Publicar pelo menos uma versão na Play Store (internal testing)
 * 4. Adicionar conta de teste nas Play Console → Setup → License Testing
 */

import { PRO_PRODUCT_ID } from '../constants/config';

// Importação condicional — react-native-iap requer development build
let IAP: any = null;
try {
  IAP = require('react-native-iap');
} catch {
  console.warn('[IAP] react-native-iap não disponível. Instala com: npx expo install react-native-iap');
}

export interface IAPProduct {
  productId:    string;
  title:        string;
  description:  string;
  localizedPrice: string;
  currency:     string;
}

// ─── Inicializar ──────────────────────────────────────────────────────────

export async function initIAP(): Promise<boolean> {
  if (!IAP) return false;
  try {
    await IAP.initConnection();
    return true;
  } catch (err) {
    console.warn('[IAP] initConnection failed:', err);
    return false;
  }
}

export async function endIAP(): Promise<void> {
  if (!IAP) return;
  try { await IAP.endConnection(); } catch { /* ignore */ }
}

// ─── Obter produto ────────────────────────────────────────────────────────

export async function getProProduct(): Promise<IAPProduct | null> {
  if (!IAP) return null;
  try {
    const products = await IAP.getProducts({ skus: [PRO_PRODUCT_ID] });
    const p = products[0];
    if (!p) return null;
    return {
      productId:      p.productId,
      title:          p.title,
      description:    p.description,
      localizedPrice: p.localizedPrice,
      currency:       p.currency,
    };
  } catch (err) {
    console.warn('[IAP] getProducts failed:', err);
    return null;
  }
}

// ─── Comprar ──────────────────────────────────────────────────────────────

export async function purchasePro(): Promise<boolean> {
  if (!IAP) {
    // Simula para desenvolvimento sem IAP instalado
    console.log('[IAP] Simulando compra (IAP não disponível)');
    return true;
  }

  try {
    await IAP.requestPurchase({ sku: PRO_PRODUCT_ID });
    // A confirmação chega via listener — ver usePro.ts
    return true;
  } catch (err: any) {
    if (err.code === 'E_USER_CANCELLED') {
      return false; // utilizador cancelou — não é erro
    }
    console.warn('[IAP] requestPurchase failed:', err);
    throw err;
  }
}

// ─── Restaurar compras ────────────────────────────────────────────────────

export async function restorePurchases(): Promise<boolean> {
  if (!IAP) return false;
  try {
    const purchases = await IAP.getAvailablePurchases();
    return purchases.some((p: any) => p.productId === PRO_PRODUCT_ID);
  } catch (err) {
    console.warn('[IAP] restorePurchases failed:', err);
    return false;
  }
}

// ─── Verificar compra existente ───────────────────────────────────────────

export async function checkExistingPurchase(): Promise<boolean> {
  if (!IAP) return false;
  try {
    const purchases = await IAP.getAvailablePurchases();
    return purchases.some((p: any) => p.productId === PRO_PRODUCT_ID);
  } catch {
    return false;
  }
}
