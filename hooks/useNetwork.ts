import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  wasOffline: boolean;
}

export function useNetwork() {
  const [state, setState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    wasOffline: false,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      const connected = netState.isConnected ?? false;
      setState(prev => ({
        isConnected: connected,
        isInternetReachable: netState.isInternetReachable,
        wasOffline: prev.wasOffline || !connected,
      }));
    });

    // Fetch initial state
    NetInfo.fetch().then((netState: NetInfoState) => {
      setState(prev => ({
        ...prev,
        isConnected: netState.isConnected ?? true,
        isInternetReachable: netState.isInternetReachable,
      }));
    });

    return unsubscribe;
  }, []);

  const clearWasOffline = useCallback(() => {
    setState(prev => ({ ...prev, wasOffline: false }));
  }, []);

  return { ...state, clearWasOffline };
}
