/**
 * purchaseStore — RevenueCat entitlement state for WILDS.
 *
 * Single entitlement: "wilds Pro"
 * Benefits: no ads · ×1.2 production · +1 creature slot
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_INSTALL_KEY = '@wilds/firstInstallAt';

interface PurchaseState {
  /** True when "wilds Pro" entitlement is active */
  isPro: boolean;
  /** 1.2 while Pro active, 1.0 otherwise */
  passProductionMultiplier: number;
  /** +1 while Pro active, 0 otherwise */
  extraCreatureSlots: number;
  /** Timestamp of first app launch; 0 until loaded */
  firstInstallAt: number;
}

interface PurchaseActions {
  setIsPro(v: boolean): void;
  initFirstInstall(): Promise<void>;
}

export const usePurchaseStore = create<PurchaseState & PurchaseActions>((set) => ({
  isPro:                    false,
  passProductionMultiplier: 1.0,
  extraCreatureSlots:       0,
  firstInstallAt:           0,

  setIsPro: (v) => set({
    isPro:                    v,
    passProductionMultiplier: v ? 1.2 : 1.0,
    extraCreatureSlots:       v ? 1   : 0,
  }),

  initFirstInstall: async () => {
    try {
      const raw = await AsyncStorage.getItem(FIRST_INSTALL_KEY);
      if (raw) {
        set({ firstInstallAt: parseInt(raw, 10) });
      } else {
        const now = Date.now();
        await AsyncStorage.setItem(FIRST_INSTALL_KEY, String(now));
        set({ firstInstallAt: now });
      }
    } catch {
      set({ firstInstallAt: Date.now() });
    }
  },
}));
