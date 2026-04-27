/**
 * PurchaseService — RevenueCat wrapper.
 *
 * Products:
 *   wilds_pass_monthly   subscription  — ad_free + premium_pass entitlements
 *   wilds_remove_ads     non-consumable — ad_free entitlement
 *   wilds_starter_pack   consumable    — 50 Gold + 5 Crystals
 *   wilds_crystal_pack   consumable    — 20 Crystals
 *   wilds_crystal_pack_xl consumable   — 60 Crystals
 *
 * Sandbox API keys are placeholders; replace before production.
 */
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOfferings,
} from 'react-native-purchases';
import { usePurchaseStore } from '../store/purchaseStore';
import { useResourceStore } from '../store/resourceStore';

// ── Config ───────────────────────────────────────────────────────────────────

const API_KEY_IOS     = 'appl_SANDBOX_REPLACE_WITH_REAL_KEY';
const API_KEY_ANDROID = 'goog_SANDBOX_REPLACE_WITH_REAL_KEY';

const ENTITLEMENT_AD_FREE = 'ad_free';
const ENTITLEMENT_PREMIUM = 'premium_pass';

/** Consumable product IDs and the resources they grant on purchase */
const CONSUMABLE_REWARDS: Record<string, { gold?: number; crystals?: number }> = {
  wilds_starter_pack:    { gold: 50, crystals: 5 },
  wilds_crystal_pack:    { crystals: 20 },
  wilds_crystal_pack_xl: { crystals: 60 },
};

// ── Service ──────────────────────────────────────────────────────────────────

export const PurchaseService = {
  /** Call once on app mount, before any other method. */
  init(): void {
    const apiKey = Platform.OS === 'ios' ? API_KEY_IOS : API_KEY_ANDROID;
    try {
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
      Purchases.configure({ apiKey });
      PurchaseService.syncEntitlements().catch(() => {});
    } catch {
      // Gracefully skip if native module not linked (e.g. Expo Go)
    }
  },

  /** Re-fetch CustomerInfo and update purchaseStore. */
  async syncEntitlements(): Promise<void> {
    try {
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);
    } catch {
      // Offline / sandbox with no connection — keep current state
    }
  },

  /** Fetch RevenueCat offerings (used by ShopPanel). */
  async getOfferings(): Promise<PurchasesOfferings | null> {
    try {
      return await Purchases.getOfferings();
    } catch {
      return null;
    }
  },

  /**
   * Purchase a product by ID.
   * Returns true if the purchase succeeded (or reward was earned for consumables).
   */
  async purchase(productId: string): Promise<boolean> {
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings?.current?.availablePackages.find(
        (p: { product: { identifier: string } }) => p.product.identifier === productId,
      );
      if (!pkg) return false;

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      applyCustomerInfo(customerInfo);

      // Grant consumable rewards immediately
      const reward = CONSUMABLE_REWARDS[productId];
      if (reward) {
        const store = useResourceStore.getState();
        if (reward.gold)     store.addGold(reward.gold);
        if (reward.crystals) store.addResource('crystals', reward.crystals);
      }
      return true;
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      // User-cancelled is not a real error
      if (err['userCancelled'] === true) return false;
      return false;
    }
  },

  /** Restore non-consumable / subscription purchases. */
  async restore(): Promise<void> {
    try {
      const info = await Purchases.restorePurchases();
      applyCustomerInfo(info);
    } catch {
      // Ignore restore errors
    }
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyCustomerInfo(info: CustomerInfo): void {
  const { setAdFree, setPremiumPass } = usePurchaseStore.getState();
  const hasPremium = !!info.entitlements.active[ENTITLEMENT_PREMIUM];
  const hasAdFree  = !!info.entitlements.active[ENTITLEMENT_AD_FREE];
  setPremiumPass(hasPremium);
  setAdFree(hasAdFree || hasPremium);
}
