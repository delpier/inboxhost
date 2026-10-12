import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRO_STORAGE_KEY as PRO_KEY } from '../constants/config';

interface ProContextType {
  isPro: boolean;
  loading: boolean;
  activatePro: () => Promise<void>;
  deactivatePro: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ProContext = createContext<ProContextType>({
  isPro:          false,
  loading:        true,
  activatePro:    async () => {},
  deactivatePro:  async () => {},
  refresh:        async () => {},
});

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro]     = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const val = await AsyncStorage.getItem(PRO_KEY);
    setIsPro(val === 'true');
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const activatePro = useCallback(async () => {
    await AsyncStorage.setItem(PRO_KEY, 'true');
    setIsPro(true);   // actualiza imediatamente — sem reinício
  }, []);

  const deactivatePro = useCallback(async () => {
    await AsyncStorage.removeItem(PRO_KEY);
    setIsPro(false);
  }, []);

  return (
    <ProContext.Provider value={{ isPro, loading, activatePro, deactivatePro, refresh }}>
      {children}
    </ProContext.Provider>
  );
}

export function usePro() {
  return useContext(ProContext);
}
