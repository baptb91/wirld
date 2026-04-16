import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResourceState {
  /** All non-gold resources keyed by resourceId */
  resources: Record<string, number>;
  /** Gold is the primary in-game currency */
  gold: number;
}

export interface ResourceActions {
  addResource: (id: string, amount: number) => void;
  /** Returns false (no-op) when there are insufficient funds */
  spendResource: (id: string, amount: number) => boolean;
  addGold: (amount: number) => void;
  /** Returns false (no-op) when there is insufficient gold */
  spendGold: (amount: number) => boolean;
  /** Bulk-set used for offline restore or save/load */
  setAll: (resources: Record<string, number>, gold: number) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const STARTER_GOLD = 500;

export const useResourceStore = create<ResourceState & ResourceActions>(
  (set, get) => ({
    resources: {},
    gold: STARTER_GOLD,

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

    spendGold: (amount) => {
      if (get().gold < amount) return false;
      set((s) => ({ gold: s.gold - amount }));
      return true;
    },

    setAll: (resources, gold) => set({ resources, gold }),
  }),
);
