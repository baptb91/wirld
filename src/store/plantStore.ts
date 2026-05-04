import { create } from 'zustand';
import { GrowthState, PLANT_MAP } from '../constants/plants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlantInstance {
  id: string;
  plantTypeId: string;
  tileX: number;
  tileY: number;
  /** Current growth stage */
  state: GrowthState;
  /** Accumulated water units toward the next growth stage */
  waterLevel: number;
}

export interface PlantStoreState {
  plants: PlantInstance[];
  /** Plant type selected for placement (null = not in plant-placement mode) */
  selectedPlantType: string | null;
}

export interface PlantStoreActions {
  /** Place a new plant seed on an empty tile */
  placePlant: (tileX: number, tileY: number, typeId: string) => void;
  /** Remove a plant instance by id */
  removePlant: (id: string) => void;
  /**
   * Add `amount` water to a plant (single-step, for live ticks).
   * Automatically advances the growth state when waterLevel ≥ waterPerStage.
   * Mature plants cannot receive more water.
   */
  waterPlant: (id: string, amount: number) => void;
  /**
   * Add a large bulk amount of water in one Zustand update (for offline catch-up).
   * Correctly advances through multiple growth stages if thresholds are crossed.
   */
  applyBulkWater: (id: string, totalAmount: number) => void;
  /**
   * Harvest a mature plant: collect the resource and reset it to seed state.
   * Returns the { resourceId, resourceAmount } harvested, or null if not ready.
   */
  harvestPlant: (id: string) => { resourceId: string; resourceAmount: number } | null;
  /** Select a plant type for placement (null clears the selection) */
  selectPlantType: (id: string | null) => void;
  /** Shift all plant tile coordinates by (dx, dy) — used after left/top map expansion */
  shiftTiles: (dx: number, dy: number) => void;
}

// ---------------------------------------------------------------------------
// Growth order
// ---------------------------------------------------------------------------

const GROWTH_ORDER: readonly GrowthState[] = ['seed', 'sprout', 'growing', 'mature'];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePlantStore = create<PlantStoreState & PlantStoreActions>((set, get) => ({
  plants: [],
  selectedPlantType: null,

  placePlant: (tileX, tileY, typeId) => {
    set((s) => {
      if (!PLANT_MAP.has(typeId)) return s;
      // Only one plant per tile
      if (s.plants.some((p) => p.tileX === tileX && p.tileY === tileY)) return s;
      return {
        plants: [
          ...s.plants,
          {
            id: `plant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            plantTypeId: typeId,
            tileX,
            tileY,
            state: 'seed',
            waterLevel: 0,
          },
        ],
      };
    });
  },

  removePlant: (id) =>
    set((s) => ({ plants: s.plants.filter((p) => p.id !== id) })),

  waterPlant: (id, amount) => {
    set((s) => {
      const plant = s.plants.find((p) => p.id === id);
      if (!plant || plant.state === 'mature') return s;

      const def = PLANT_MAP.get(plant.plantTypeId);
      if (!def) return s;

      const newLevel = plant.waterLevel + amount;
      if (newLevel < def.waterPerStage) {
        // Not yet ready — just update water level
        return {
          plants: s.plants.map((p) =>
            p.id === id ? { ...p, waterLevel: newLevel } : p,
          ),
        };
      }

      // Water threshold reached — advance to next growth state
      const nextIdx = GROWTH_ORDER.indexOf(plant.state) + 1;
      const nextState = nextIdx < GROWTH_ORDER.length
        ? GROWTH_ORDER[nextIdx]
        : plant.state; // already mature (shouldn't happen)

      return {
        plants: s.plants.map((p) =>
          p.id === id ? { ...p, waterLevel: 0, state: nextState } : p,
        ),
      };
    });
  },

  applyBulkWater: (id, totalAmount) => {
    set((s) => {
      const plant = s.plants.find((p) => p.id === id);
      if (!plant || plant.state === 'mature') return s;
      const def = PLANT_MAP.get(plant.plantTypeId);
      if (!def) return s;

      let state: GrowthState = plant.state;
      let waterLevel = plant.waterLevel;
      let remaining = totalAmount;

      // Walk through stage advances until we run out of water or hit mature
      while (remaining > 0 && state !== 'mature') {
        const needed = def.waterPerStage - waterLevel;
        if (remaining < needed) {
          waterLevel += remaining;
          remaining = 0;
        } else {
          remaining -= needed;
          waterLevel = 0;
          const nextIdx = GROWTH_ORDER.indexOf(state) + 1;
          state = nextIdx < GROWTH_ORDER.length
            ? GROWTH_ORDER[nextIdx]
            : 'mature';
        }
      }

      return {
        plants: s.plants.map((p) =>
          p.id === id ? { ...p, state, waterLevel } : p,
        ),
      };
    });
  },

  harvestPlant: (id) => {
    const plant = get().plants.find((p) => p.id === id);
    if (!plant || plant.state !== 'mature') return null;

    const def = PLANT_MAP.get(plant.plantTypeId);
    if (!def) return null;

    // Reset to seed
    set((s) => ({
      plants: s.plants.map((p) =>
        p.id === id ? { ...p, state: 'seed', waterLevel: 0 } : p,
      ),
    }));

    return { resourceId: def.resourceId, resourceAmount: def.resourceAmount };
  },

  selectPlantType: (id) => set({ selectedPlantType: id }),

  shiftTiles: (dx, dy) =>
    set((s) => ({
      plants: s.plants.map((p) => ({
        ...p,
        tileX: p.tileX + dx,
        tileY: p.tileY + dy,
      })),
    })),
}));
