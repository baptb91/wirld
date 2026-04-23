import { create } from 'zustand';
import { TerrainType, GRID_COLS, GRID_ROWS, TILE_SIZE, TERRAIN_CONFIG } from '../constants/terrain';
import { HABITAT_MAP } from '../constants/habitats';
import { BUILDING_MAP } from '../constants/buildings';
import { useResourceStore } from './resourceStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Step 1: one-time fog-of-war unlock — the initial playable area within the base grid. */
export const MAP_EXPANSION_COST = 2000;
const INITIAL_UNLOCKED = 16;

/** Step 2: directional expansion — adds tiles beyond the current grid edges. */
export const EXPANSION_TILES = 10;
export const EXPANSION_COST_BASE = 500;
export const EXPANSION_MAX_CREATURES_BONUS = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExpansionDir = 'left' | 'right' | 'top' | 'bottom';

export interface BuildingPlacement {
  id: string;
  buildingTypeId: string;
  tileX: number;
  tileY: number;
  /** Palisade: remaining block count (initialized on wave spawn) */
  defenseHp?: number;
  /** Vivarium: UTC ms of last fish production */
  lastProducedAt?: number;
}

export interface HabitatPlacement {
  id: string;
  habitatTypeId: string;
  tileX: number;
  tileY: number;
  assignedCreatureIds: string[];
  /** Species being gestated (set when breeding starts) */
  gestatingSpeciesId?: string;
  /** UTC ms when gestation completes */
  gestationEndsAt?: number;
  /** ID of the creature staying in the habitat during gestation */
  gestatingCreatureId?: string;
}

export interface MapState {
  terrainGrid: TerrainType[][];
  selectedTool: TerrainType | null;
  selectedHabitat: string | null;
  selectedBuilding: string | null;
  buildings: BuildingPlacement[];
  habitats: HabitatPlacement[];
  /** Step 1: fog-of-war unlock within the base grid. */
  unlockedCols: number;
  unlockedRows: number;
  /** Step 2: actual grid dimensions (grows with directional expansions). */
  gridCols: number;
  gridRows: number;
  /** How many directional expansions have been purchased (drives cost). */
  expansionCount: number;
  /**
   * Set by expandMapDirection for left/top expansions.
   * MapCanvas reads this once and shifts translateX/translateY to keep
   * the same world content centred after coordinate-system shifts.
   * x/y are in world pixels (positive = content moved right/down).
   */
  pendingCameraShift: { x: number; y: number } | null;
}

export interface MapActions {
  paintTile: (x: number, y: number, type: TerrainType) => void;
  paintRect: (x1: number, y1: number, x2: number, y2: number, type: TerrainType) => void;
  selectTool: (type: TerrainType | null) => void;
  selectHabitat: (id: string | null) => void;
  selectBuilding: (id: string | null) => void;
  placeBuilding: (placement: BuildingPlacement) => void;
  updateBuilding: (id: string, updates: Partial<BuildingPlacement>) => void;
  removeBuilding: (id: string) => void;
  placeHabitat: (placement: HabitatPlacement) => void;
  updateHabitat: (id: string, updates: Partial<HabitatPlacement>) => void;
  removeHabitat: (id: string) => void;
  assignCreatureToHabitat: (habitatId: string, creatureId: string) => void;
  unassignCreatureFromHabitat: (habitatId: string, creatureId: string) => void;
  /** Step 1: unlock the full base 20×20 grid. */
  expandMap: () => boolean;
  /** Step 2: add EXPANSION_TILES tiles in a direction; doubles cost each time. */
  expandMapDirection: (dir: ExpansionDir) => boolean;
  clearPendingCameraShift: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createInitialGrid(): TerrainType[][] {
  return Array.from({ length: GRID_ROWS }, () =>
    Array<TerrainType>(GRID_COLS).fill('grass'),
  );
}

function rectsOverlap(
  ax: number, ay: number, aw: number,
  bx: number, by: number, bw: number,
): boolean {
  return !(ax >= bx + bw || ax + aw <= bx || ay >= by + bw || ay + aw <= by);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useMapStore = create<MapState & MapActions>((set, get) => ({
  terrainGrid: createInitialGrid(),
  selectedTool: null,
  selectedHabitat: null,
  selectedBuilding: null,
  buildings: [],
  habitats: [],
  unlockedCols: INITIAL_UNLOCKED,
  unlockedRows: INITIAL_UNLOCKED,
  gridCols: GRID_COLS,
  gridRows: GRID_ROWS,
  expansionCount: 0,
  pendingCameraShift: null,

  // ── Terrain painting ─────────────────────────────────────────────────────
  paintTile: (x, y, type) => {
    const state = get();
    if (x < 0 || x >= state.gridCols || y < 0 || y >= state.gridRows) return;
    if (x >= state.unlockedCols || y >= state.unlockedRows) return;
    if (state.terrainGrid[y][x] === type) return;
    if (!useResourceStore.getState().spendGold(TERRAIN_CONFIG[type].costPerTile)) return;
    set((s) => {
      const newGrid = s.terrainGrid.map((row) => [...row]);
      newGrid[y][x] = type;
      return { terrainGrid: newGrid };
    });
  },

  paintRect: (x1, y1, x2, y2, type) => {
    set((state) => {
      const newGrid = state.terrainGrid.map((row) => [...row]);
      const minX = Math.max(0, Math.min(x1, x2));
      const maxX = Math.min(state.gridCols - 1, Math.max(x1, x2));
      const minY = Math.max(0, Math.min(y1, y2));
      const maxY = Math.min(state.gridRows - 1, Math.max(y1, y2));
      for (let r = minY; r <= maxY; r++) {
        for (let c = minX; c <= maxX; c++) {
          newGrid[r][c] = type;
        }
      }
      return { terrainGrid: newGrid };
    });
  },

  selectTool: (type) =>
    set({ selectedTool: type, selectedHabitat: null, selectedBuilding: null }),

  selectHabitat: (id) =>
    set({ selectedHabitat: id, selectedTool: null, selectedBuilding: null }),

  selectBuilding: (id) =>
    set({ selectedBuilding: id, selectedTool: null, selectedHabitat: null }),

  // ── Building placement ───────────────────────────────────────────────────
  placeBuilding: (placement) => {
    const state = get();
    const def = BUILDING_MAP.get(placement.buildingTypeId);
    if (!def) return;
    const sz = def.tileSize;
    if (
      placement.tileX < 0 || placement.tileX + sz > state.unlockedCols ||
      placement.tileY < 0 || placement.tileY + sz > state.unlockedRows
    ) return;
    if (state.buildings.some((b) => {
      const bDef = BUILDING_MAP.get(b.buildingTypeId);
      return bDef ? rectsOverlap(placement.tileX, placement.tileY, sz, b.tileX, b.tileY, bDef.tileSize) : false;
    })) return;
    if (state.habitats.some((h) => {
      const hDef = HABITAT_MAP.get(h.habitatTypeId);
      return hDef ? rectsOverlap(placement.tileX, placement.tileY, sz, h.tileX, h.tileY, hDef.tileSize) : false;
    })) return;
    if (!useResourceStore.getState().spendGold(def.baseCost)) return;
    set((s) => ({ buildings: [...s.buildings, placement] }));
  },

  updateBuilding: (id, updates) =>
    set((s) => ({
      buildings: s.buildings.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBuilding: (id) =>
    set((s) => ({ buildings: s.buildings.filter((b) => b.id !== id) })),

  // ── Habitat placement ────────────────────────────────────────────────────
  placeHabitat: (placement) => {
    const state = get();
    const def = HABITAT_MAP.get(placement.habitatTypeId);
    if (!def) return;
    const sz = def.tileSize;
    if (
      placement.tileX < 0 || placement.tileX + sz > state.unlockedCols ||
      placement.tileY < 0 || placement.tileY + sz > state.unlockedRows
    ) return;
    if (state.habitats.some((h) => {
      const hDef = HABITAT_MAP.get(h.habitatTypeId);
      return hDef ? rectsOverlap(placement.tileX, placement.tileY, sz, h.tileX, h.tileY, hDef.tileSize) : false;
    })) return;
    if (!useResourceStore.getState().spendGold(def.baseCost)) return;
    set((s) => ({ habitats: [...s.habitats, placement] }));
  },

  updateHabitat: (id, updates) =>
    set((s) => ({
      habitats: s.habitats.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    })),

  removeHabitat: (id) =>
    set((state) => ({
      habitats: state.habitats.filter((h) => h.id !== id),
    })),

  assignCreatureToHabitat: (habitatId, creatureId) =>
    set((state) => {
      const habitat = state.habitats.find((h) => h.id === habitatId);
      if (!habitat) return state;
      const def = HABITAT_MAP.get(habitat.habitatTypeId);
      if (!def) return state;
      if (habitat.assignedCreatureIds.includes(creatureId)) return state;
      if (habitat.assignedCreatureIds.length >= def.capacity) return state;
      return {
        habitats: state.habitats.map((h) =>
          h.id === habitatId
            ? { ...h, assignedCreatureIds: [...h.assignedCreatureIds, creatureId] }
            : h,
        ),
      };
    }),

  unassignCreatureFromHabitat: (habitatId, creatureId) =>
    set((state) => ({
      habitats: state.habitats.map((h) =>
        h.id === habitatId
          ? { ...h, assignedCreatureIds: h.assignedCreatureIds.filter((id) => id !== creatureId) }
          : h,
      ),
    })),

  // ── Step 1: fog-of-war unlock ────────────────────────────────────────────
  expandMap: () => {
    const state = get();
    if (state.unlockedCols >= state.gridCols && state.unlockedRows >= state.gridRows) return false;
    if (!useResourceStore.getState().spendGold(MAP_EXPANSION_COST)) return false;
    set({ unlockedCols: state.gridCols, unlockedRows: state.gridRows });
    return true;
  },

  // ── Step 2: directional expansion ────────────────────────────────────────
  expandMapDirection: (dir) => {
    const state = get();
    const cost = Math.floor(EXPANSION_COST_BASE * Math.pow(2, state.expansionCount));
    if (!useResourceStore.getState().spendGold(cost)) return false;

    const { gridCols, gridRows, terrainGrid, habitats, buildings } = state;
    const T = EXPANSION_TILES;
    const grassRow = (cols: number) => Array<TerrainType>(cols).fill('grass');

    let newGrid: TerrainType[][];
    let newHabitats = habitats;
    let newBuildings = buildings;
    let newGridCols = gridCols;
    let newGridRows = gridRows;
    let cameraShift: { x: number; y: number } | null = null;

    switch (dir) {
      case 'right':
        newGrid = terrainGrid.map((row) => [...row, ...grassRow(T)]);
        newGridCols = gridCols + T;
        break;

      case 'bottom':
        newGrid = [
          ...terrainGrid,
          ...Array.from({ length: T }, () => grassRow(gridCols)),
        ];
        newGridRows = gridRows + T;
        break;

      case 'left': {
        newGrid = terrainGrid.map((row) => [...grassRow(T), ...row]);
        newGridCols = gridCols + T;
        const dx = T * TILE_SIZE;
        newHabitats  = habitats.map((h) => ({ ...h, tileX: h.tileX + T }));
        newBuildings = buildings.map((b) => ({ ...b, tileX: b.tileX + T }));
        cameraShift  = { x: dx, y: 0 };
        // Shift creature pixel positions and plant tile coords via their stores
        const { shiftPositions } = require('./creatureStore').useCreatureStore.getState();
        const { shiftTiles }     = require('./plantStore').usePlantStore.getState();
        shiftPositions(dx, 0);
        shiftTiles(T, 0);
        break;
      }

      case 'top': {
        newGrid = [
          ...Array.from({ length: T }, () => grassRow(gridCols)),
          ...terrainGrid,
        ];
        newGridRows = gridRows + T;
        const dy = T * TILE_SIZE;
        newHabitats  = habitats.map((h) => ({ ...h, tileY: h.tileY + T }));
        newBuildings = buildings.map((b) => ({ ...b, tileY: b.tileY + T }));
        cameraShift  = { x: 0, y: dy };
        const { shiftPositions } = require('./creatureStore').useCreatureStore.getState();
        const { shiftTiles }     = require('./plantStore').usePlantStore.getState();
        shiftPositions(0, dy);
        shiftTiles(0, T);
        break;
      }
    }

    // Also expand the fog-of-war unlocked area to match the new dimension in that direction
    const newUnlockedCols = dir === 'right' ? state.unlockedCols + T
                          : dir === 'left'  ? state.unlockedCols + T
                          : state.unlockedCols;
    const newUnlockedRows = dir === 'bottom' ? state.unlockedRows + T
                          : dir === 'top'    ? state.unlockedRows + T
                          : state.unlockedRows;

    // +3 max creatures via creatureStore
    const { increaseMaxCreatures } = require('./creatureStore').useCreatureStore.getState();
    increaseMaxCreatures(EXPANSION_MAX_CREATURES_BONUS);

    set({
      terrainGrid:        newGrid!,
      gridCols:           newGridCols,
      gridRows:           newGridRows,
      habitats:           newHabitats,
      buildings:          newBuildings,
      unlockedCols:       newUnlockedCols,
      unlockedRows:       newUnlockedRows,
      expansionCount:     state.expansionCount + 1,
      pendingCameraShift: cameraShift,
    });

    return true;
  },

  clearPendingCameraShift: () => set({ pendingCameraShift: null }),
}));
