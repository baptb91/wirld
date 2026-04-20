import { create } from 'zustand';
import type { Ravager } from '../engine/RavagerEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RavagerState {
  ravagers: Ravager[];
  /** UTC ms for the next wave; 0 = not yet initialized */
  nextAttackAt: number;
  /** UTC ms when the current wave force-expires; 0 = no active wave */
  waveActiveUntil: number;
}

interface RavagerActions {
  setRavagers:        (rs: Ravager[]) => void;
  updateRavager:      (id: string, updates: Partial<Ravager>) => void;
  removeRavager:      (id: string) => void;
  clearRavagers:      () => void;
  setNextAttackAt:    (ts: number) => void;
  setWaveActiveUntil: (ts: number) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRavagerStore = create<RavagerState & RavagerActions>((set) => ({
  ravagers:        [],
  nextAttackAt:    0,
  waveActiveUntil: 0,

  setRavagers: (rs) => set({ ravagers: rs }),

  updateRavager: (id, updates) =>
    set((s) => ({
      ravagers: s.ravagers.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),

  removeRavager: (id) =>
    set((s) => ({ ravagers: s.ravagers.filter((r) => r.id !== id) })),

  clearRavagers:      ()   => set({ ravagers: [] }),
  setNextAttackAt:    (ts) => set({ nextAttackAt: ts }),
  setWaveActiveUntil: (ts) => set({ waveActiveUntil: ts }),
}));
