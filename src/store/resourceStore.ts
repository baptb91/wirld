import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OfflineSummary {
  /** How long the player was actually away (capped at 8 h), in seconds */
  elapsedSeconds: number;
  /** Net resource gains from the offline period (only positive deltas) */
  resourceDeltas: Record<string, number>;
}

export interface ResourceState {
  /** All non-gold resources keyed by resourceId */
  resources: Record<string, number>;
  /** Gold is the primary in-game currency */
  gold: number;
  /** Cumulative experience points earned from capturing wild creatures */
  xp: number;
  /**
   * Set by useGameLoop when offline progress was applied.
   * OfflineSummaryModal reads this and clears it on dismiss.
   */
  pendingOfflineSummary: OfflineSummary | null;
}

export interface ResourceActions {
  addResource: (id: string, amount: number) => void;
  /** Returns false (no-op) when there are insufficient funds */
  spendResource: (id: string, amount: number) => boolean;
  addGold: (amount: number) => void;
  /** Returns false (no-op) when there is insufficient gold */
  spendGold: (amount: number) => boolean;
  addXP: (amount: number) => void;
  /** Bulk-set used for offline restore or save/load */
  setAll: (resources: Record<string, number>, gold: number) => void;
  setPendingOfflineSummary: (s: OfflineSummary | null) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const STARTER_GOLD = 500;
const STARTER_RESOURCES: Record<string, number> = {
  berries: 5,
  meat:    5,
  lure:    5,
};

export const useResourceStore = create<ResourceState & ResourceActions>(
  (set, get) => ({
    resources: { ...STARTER_RESOURCES },
    gold: STARTER_GOLD,
    xp: 0,
    pendingOfflineSummary: null,

    addResource: (id, amount) =>
      set((s) => ({
        resources: { ...s.resources, [id]: (s.resources[id] ?? 0) + amount },
      })),

    spendResource: (id, amount) => {
      if ((get().resources[id] ?? 0) < amount) return false;
      set((s) => ({
        resources: { ...s.resources, [id]: (s.resources[id] ?? 0) - amount },
      }));
      return true;
    },

    addGold: (amount) => set((s) => ({ gold: s.gold + amount })),

    addXP: (amount) => set((s) => ({ xp: s.xp + amount })),

    spendGold: (amount) => {
      if (get().gold < amount) return false;
      set((s) => ({ gold: s.gold - amount }));
      return true;
    },

    setAll: (resources, gold) => set({ resources, gold }),

    setPendingOfflineSummary: (s) => set({ pendingOfflineSummary: s }),
  }),
);
