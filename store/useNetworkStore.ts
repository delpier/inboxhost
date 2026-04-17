import { create } from "zustand";

type NetworkState = {
  isOnline: boolean;
  setOnline: (value: boolean) => void;
};

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  setOnline: (value) => set({ isOnline: value }),
}));
