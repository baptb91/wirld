/**
 * purchaseStore — tracks RevenueCat entitlements and IAP state.
 *
 * isAdFree:    true when player owns wilds_remove_ads OR wilds_pass_monthly
 * isPremiumPass: true only for wilds_pass_monthly subscribers
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_INSTALL_KEY = '@wilds/firstInstallAt';

// ── Types ────────────────────────────────────────────────────────────────────

interface PurchaseState {
  /** True when any ad-removal product is active */
  isAdFree: boolean;
  /** True only when the monthly pass is active */
  isPremiumPass: boolean;
  /** 1.2 while pass active, 1.0 otherwise */
  passProductionMultiplier: number;
  /** +1 while pass active, 0 otherwise */
  extraCreatureSlots: number;
  /** Timestamp of first app launch; 0 until loaded */
  firstInstallAt: number;
}

interface PurchaseActions {
  setAdFree(v: boolean): void;
  setPremiumPass(v: boolean): void;
  initFirstInstall(): Promise<void>;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const usePurchaseStore = create<PurchaseState & PurchaseActions>((set, get) => ({
  isAdFree:                 false,
  isPremiumPass:            false,
  passProductionMultiplier: 1.0,
  extraCreatureSlots:       0,
  firstInstallAt:           0,

  setAdFree: (v) => set({ isAdFree: v }),

  setPremiumPass: (v) => set((s) => ({
    isPremiumPass:            v,
    isAdFree:                 v || s.isAdFree,
    passProductionMultiplier: v ? 1.2 : 1.0,
    extraCreatureSlots:       v ? 1   : 0,
  })),

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
