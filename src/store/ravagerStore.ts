import { create } from 'zustand';
import type { Ravager } from '../engine/RavagerEngine';

// ---------------------------------------------------------------------------
// Battle report (set when a wave ends)
// ---------------------------------------------------------------------------

export interface BattleReport {
  ravagersDefeated: number;
  ravagersEscaped:  number;
  plantsDestroyed:  number;
  creaturesLost:    number;
  resourcesStolen:  Record<string, number>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RavagerState {
  ravagers:        Ravager[];
  /** UTC ms for the next wave; 0 = not yet initialized */
  nextAttackAt:    number;
  /** UTC ms when the current wave force-expires; 0 = no active wave */
  waveActiveUntil: number;
  /** Ravager ID the player last tapped — carnivores prioritize it */
  focusedRavagerId: string | null;
  /** Count of ravagers defeated so far this wave */
  waveDefeats:     number;
  /** Set when a wave ends; cleared when the player dismisses the modal */
  battleReport:    BattleReport | null;
  /** Ravager IDs already slowed by a bait trap this wave */
  slowedRavagerIds:    string[];
  /** Building IDs manually activated by the player this wave (+30% effectiveness) */
  activatedDefenseIds: string[];
}

interface RavagerActions {
  setRavagers:        (rs: Ravager[]) => void;
  updateRavager:      (id: string, updates: Partial<Ravager>) => void;
  /** Reduce a ravager's HP; removes it and increments waveDefeats if hp ≤ 0 */
  damageRavager:      (id: string, dmg: number) => void;
  removeRavager:      (id: string) => void;
  clearRavagers:      () => void;
  setNextAttackAt:    (ts: number) => void;
  setWaveActiveUntil: (ts: number) => void;
  setFocusedRavager:   (id: string | null) => void;
  resetWaveStats:      () => void;
  setBattleReport:     (r: BattleReport | null) => void;
  addSlowedRavager:    (id: string) => void;
  activateDefense:     (id: string) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRavagerStore = create<RavagerState & RavagerActions>((set) => ({
  ravagers:            [],
  nextAttackAt:        0,
  waveActiveUntil:     0,
  focusedRavagerId:    null,
  waveDefeats:         0,
  battleReport:        null,
  slowedRavagerIds:    [],
  activatedDefenseIds: [],

  setRavagers: (rs) => set({ ravagers: rs }),

  updateRavager: (id, updates) =>
    set((s) => ({
      ravagers: s.ravagers.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),

  damageRavager: (id, dmg) =>
    set((s) => {
      const r = s.ravagers.find((x) => x.id === id);
      if (!r) return {};
      const newHp = r.hp - dmg;
      if (newHp <= 0) {
        return {
          ravagers:    s.ravagers.filter((x) => x.id !== id),
          waveDefeats: s.waveDefeats + 1,
          focusedRavagerId: s.focusedRavagerId === id ? null : s.focusedRavagerId,
        };
      }
      return {
        ravagers: s.ravagers.map((x) => (x.id === id ? { ...x, hp: newHp } : x)),
      };
    }),

  removeRavager: (id) =>
    set((s) => ({
      ravagers:         s.ravagers.filter((r) => r.id !== id),
      focusedRavagerId: s.focusedRavagerId === id ? null : s.focusedRavagerId,
    })),

  clearRavagers:      ()   => set({ ravagers: [], focusedRavagerId: null }),
  setNextAttackAt:    (ts) => set({ nextAttackAt: ts }),
  setWaveActiveUntil: (ts) => set({ waveActiveUntil: ts }),
  setFocusedRavager:  (id) => set({ focusedRavagerId: id }),
  resetWaveStats:     ()   => set({ waveDefeats: 0, slowedRavagerIds: [], activatedDefenseIds: [] }),
  setBattleReport:    (r)  => set({ battleReport: r }),
  addSlowedRavager:   (id) => set((s) => ({ slowedRavagerIds: [...s.slowedRavagerIds, id] })),
  activateDefense:    (id) => set((s) => ({ activatedDefenseIds: [...s.activatedDefenseIds, id] })),
}));
