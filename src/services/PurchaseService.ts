/**
 * PurchaseService — RevenueCat wrapper for WILDS.
 *
 * Single entitlement: "wilds Pro"
 * Products: lifetime · yearly · monthly
 *
 * Public SDK key (safe to ship): test_UlOliGRzivRfYjAFFdOhGitLfCp
 * Secret key: NEVER embed in app — server-side only.
 */
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { usePurchaseStore } from '../store/purchaseStore';

// ── Config ───────────────────────────────────────────────────────────────────

const SDK_KEY            = 'test_UlOliGRzivRfYjAFFdOhGitLfCp';
const ENTITLEMENT_PRO    = 'wilds Pro';

// ── Service ──────────────────────────────────────────────────────────────────

export const PurchaseService = {
  /** Call once on app mount, before any other method. */
  init(): void {
    try {
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
      Purchases.configure({ apiKey: SDK_KEY });
      PurchaseService.syncEntitlements().catch(() => {});
    } catch {
      // Gracefully skip if native module not linked (e.g. Expo Go)
    }
  },

  /** Re-fetch CustomerInfo and sync purchaseStore. */
  async syncEntitlements(): Promise<void> {
    try {
      const info = await Purchases.getCustomerInfo();
      applyCustomerInfo(info);
    } catch {
      // Offline — keep current state
    }
  },

  /**
   * Present the RevenueCat paywall (configured in RC dashboard).
   * Returns true if the user purchased or restored.
   */
  async presentPaywall(): Promise<boolean> {
    try {
      const result = await RevenueCatUI.presentPaywall();
      await PurchaseService.syncEntitlements();
      return (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      );
    } catch {
      return false;
    }
  },

  /**
   * Present paywall only if the user does not have "wilds Pro".
   * Returns true if they ended up with an active entitlement.
   */
  async presentPaywallIfNeeded(): Promise<boolean> {
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_PRO,
      });
      await PurchaseService.syncEntitlements();
      return (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED  ||
        result === PAYWALL_RESULT.NOT_PRESENTED // already subscribed
      );
    } catch {
      return false;
    }
  },

  /**
   * Open the RevenueCat Customer Center (manage subscription, request refund,
   * contact support). Should be offered to existing subscribers.
   */
  async presentCustomerCenter(): Promise<void> {
    try {
      await RevenueCatUI.presentCustomerCenter();
      // Re-sync in case the user cancelled / changed their plan
      await PurchaseService.syncEntitlements();
    } catch {
      // Customer Center unavailable (Expo Go, simulator, no connection)
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
  const isPro = !!info.entitlements.active[ENTITLEMENT_PRO];
  usePurchaseStore.getState().setIsPro(isPro);
}
