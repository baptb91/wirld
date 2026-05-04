/**
 * adStore — tracks rewarded-ad cooldowns, active boosts, and premium status.
 * Persisted to AsyncStorage so cooldowns survive app restarts.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@wilds/ads';

// ── Constants ────────────────────────────────────────────────────────────────

export const PRODUCTION_BOOST_DURATION_MS = 3_600_000;        // 1 h
export const PRODUCTION_BOOST_COOLDOWN_MS = 8 * 3_600_000;   // 8 h
export const PRODUCTION_BOOST_MULTIPLIER  = 2;
export const GOLD_BONUS_AMOUNT            = 30;
export const GESTATION_SPEEDUP_MS         = 3_600_000;        // 1 h

// ── Types ────────────────────────────────────────────────────────────────────

interface AdPersistedState {
  isPremium:               boolean;
  productionBoostExpiresAt: number;  // 0 = not active
  lastProductionBoostAdAt:  number;  // 0 = never
  lastGoldBonusAdAt:        number;  // 0 = never
  /** Keys: `${habitatOrBuildingId}:${gestationEndsAt}` */
  usedGestationSpeedUps:    string[];
}

interface AdActions {
  setIsPremium(v: boolean): void;
  activateProductionBoost(): void;
  recordGoldBonusAd(): void;
  markGestationSpeedUpUsed(key: string): void;
  canShowProductionBoostAd(): boolean;
  canShowGoldBonusAd(): boolean;
  isGestationSpeedUpUsed(key: string): boolean;
  loadAdState(): Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isSameCalendarDay(ts1: number, ts2: number): boolean {
  const a = new Date(ts1);
  const b = new Date(ts2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth() &&
    a.getDate()     === b.getDate()
  );
}

const DEFAULTS: AdPersistedState = {
  isPremium:               false,
  productionBoostExpiresAt: 0,
  lastProductionBoostAdAt:  0,
  lastGoldBonusAdAt:        0,
  usedGestationSpeedUps:    [],
};

async function persist(patch: Partial<AdPersistedState>): Promise<void> {
  try {
    const raw  = await AsyncStorage.getItem(KEY);
    const prev = raw ? (JSON.parse(raw) as AdPersistedState) : DEFAULTS;
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...prev, ...patch }));
  } catch {
    // ignore
  }
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useAdStore = create<AdPersistedState & AdActions>((set, get) => ({
  ...DEFAULTS,

  setIsPremium: (v) => {
    set({ isPremium: v });
    persist({ isPremium: v });
  },

  activateProductionBoost: () => {
    const now = Date.now();
    const patch = {
      productionBoostExpiresAt: now + PRODUCTION_BOOST_DURATION_MS,
      lastProductionBoostAdAt:  now,
    };
    set(patch);
    persist(patch);
  },

  recordGoldBonusAd: () => {
    const patch = { lastGoldBonusAdAt: Date.now() };
    set(patch);
    persist(patch);
  },

  markGestationSpeedUpUsed: (key) => {
    const next = [...get().usedGestationSpeedUps, key];
    set({ usedGestationSpeedUps: next });
    persist({ usedGestationSpeedUps: next });
  },

  canShowProductionBoostAd: () => {
    const { lastProductionBoostAdAt } = get();
    return (
      lastProductionBoostAdAt === 0 ||
      Date.now() - lastProductionBoostAdAt >= PRODUCTION_BOOST_COOLDOWN_MS
    );
  },

  canShowGoldBonusAd: () => {
    const { lastGoldBonusAdAt } = get();
    return (
      lastGoldBonusAdAt === 0 ||
      !isSameCalendarDay(lastGoldBonusAdAt, Date.now())
    );
  },

  isGestationSpeedUpUsed: (key) =>
    get().usedGestationSpeedUps.includes(key),

  loadAdState: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<AdPersistedState>;
        set({ ...DEFAULTS, ...saved });
      }
    } catch {
      // ignore
    }
  },
}));
