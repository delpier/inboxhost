import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initIAP,
  endIAP,
  checkExistingPurchase,
  restorePurchases as restoreIAP,
  purchasePro as purchaseIAP,
} from '../services/iapService';
import { PRO_PRODUCT_ID } from '../constants/config';

const PRO_KEY = 'is_pro_purchased';

// Importação condicional do IAP para listener
let IAP: any = null;
try { IAP = require('react-native-iap'); } catch { /* sem IAP */ }

interface ProContextType {
  isPro:            boolean;
  loading:          boolean;
  activatePro:      () => Promise<void>;
  deactivatePro:    () => Promise<void>;
  purchasePro:      () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refresh:          () => Promise<void>;
}

const ProContext = createContext<ProContextType>({
  isPro:            false,
  loading:          true,
  activatePro:      async () => {},
  deactivatePro:    async () => {},
  purchasePro:      async () => false,
  restorePurchases: async () => false,
  refresh:          async () => {},
});

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [isPro,   setIsPro]   = useState(false);
  const [loading, setLoading] = useState(true);

  // Carrega estado guardado E verifica na Play Store
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Verifica AsyncStorage (rápido, offline)
      const cached = await AsyncStorage.getItem(PRO_KEY);
      if (cached === 'true') {
        setIsPro(true);
        setLoading(false);
        return;
      }
      // 2. Verifica na Play Store (requer ligação)
      const hasPurchase = await checkExistingPurchase();
      if (hasPurchase) {
        await AsyncStorage.setItem(PRO_KEY, 'true');
        setIsPro(true);
      }
    } catch { /* offline ou IAP indisponível */ }
    setLoading(false);
  }, []);

  // Inicializa IAP e configura listener de compras
  useEffect(() => {
    refresh();
    initIAP();

    // Listener de compras concluídas (Google Play envia aqui)
    let purchaseSub: any;
    let errorSub:    any;

    if (IAP) {
      purchaseSub = IAP.purchaseUpdatedListener(async (purchase: any) => {
        if (purchase.productId === PRO_PRODUCT_ID) {
          // Confirma a compra na Play Store
          if (IAP.finishTransaction) {
            await IAP.finishTransaction({ purchase, isConsumable: false });
          }
          await AsyncStorage.setItem(PRO_KEY, 'true');
          setIsPro(true);  // ← actualiza imediatamente
        }
      });

      errorSub = IAP.purchaseErrorListener((err: any) => {
        if (err.code !== 'E_USER_CANCELLED') {
          console.warn('[IAP] Purchase error:', err.message);
        }
      });
    }

    return () => {
      endIAP();
      purchaseSub?.remove?.();
      errorSub?.remove?.();
    };
  }, [refresh]);

  const activatePro = useCallback(async () => {
    await AsyncStorage.setItem(PRO_KEY, 'true');
    setIsPro(true);
  }, []);

  const deactivatePro = useCallback(async () => {
    await AsyncStorage.removeItem(PRO_KEY);
    setIsPro(false);
  }, []);

  const purchasePro = useCallback(async (): Promise<boolean> => {
    try {
      return await purchaseIAP();
    } catch {
      return false;
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const restored = await restoreIAP();
      if (restored) {
        await AsyncStorage.setItem(PRO_KEY, 'true');
        setIsPro(true);
      }
      return restored;
    } catch {
      return false;
    }
  }, []);

  return (
    <ProContext.Provider value={{
      isPro, loading,
      activatePro, deactivatePro,
      purchasePro, restorePurchases,
      refresh,
    }}>
      {children}
    </ProContext.Provider>
  );
}

export function usePro() {
  return useContext(ProContext);
}
