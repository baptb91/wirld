import { create } from 'zustand';
import { TerrainType, GRID_COLS, GRID_ROWS, TERRAIN_CONFIG } from '../constants/terrain';
import { HABITAT_MAP } from '../constants/habitats';
import { BUILDING_MAP } from '../constants/buildings';
import { useResourceStore } from './resourceStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAP_EXPANSION_COST = 2000;
const INITIAL_UNLOCKED = 16; // 16×16 tiles unlocked at start; expand to 20×20

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuildingPlacement {
  id: string;
  buildingTypeId: string;
  tileX: number;
  tileY: number;
}

export interface HabitatPlacement {
  id: string;
  habitatTypeId: string;
  tileX: number;
  tileY: number;
  assignedCreatureIds: string[];
}

export interface MapState {
  /** 2-D grid of terrain types — row-major: terrainGrid[y][x] */
  terrainGrid: TerrainType[][];
  selectedTool: TerrainType | null;
  selectedHabitat: string | null;
  selectedBuilding: string | null;
  buildings: BuildingPlacement[];
  habitats: HabitatPlacement[];
  /** Purchasable map area. Starts at INITIAL_UNLOCKED; expands to GRID_COLS/ROWS. */
  unlockedCols: number;
  unlockedRows: number;
}

export interface MapActions {
  paintTile: (x: number, y: number, type: TerrainType) => void;
  paintRect: (x1: number, y1: number, x2: number, y2: number, type: TerrainType) => void;
  selectTool: (type: TerrainType | null) => void;
  selectHabitat: (id: string | null) => void;
  selectBuilding: (id: string | null) => void;
  placeBuilding: (placement: BuildingPlacement) => void;
  placeHabitat: (placement: HabitatPlacement) => void;
  removeHabitat: (id: string) => void;
  assignCreatureToHabitat: (habitatId: string, creatureId: string) => void;
  unassignCreatureFromHabitat: (habitatId: string, creatureId: string) => void;
  /** Spend MAP_EXPANSION_COST gold to unlock the full grid. Returns false if can't afford. */
  expandMap: () => boolean;
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

  // ── Terrain painting — costs goldPerTile; blocked outside unlocked area ──
  paintTile: (x, y, type) => {
    const state = get();
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
    if (x >= state.unlockedCols || y >= state.unlockedRows) return;
    if (state.terrainGrid[y][x] === type) return; // no change → no charge
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
      const maxX = Math.min(GRID_COLS - 1, Math.max(x1, x2));
      const minY = Math.max(0, Math.min(y1, y2));
      const maxY = Math.min(GRID_ROWS - 1, Math.max(y1, y2));
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

  // ── Building placement — costs baseCost gold ─────────────────────────────
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

  // ── Habitat placement — costs baseCost gold ──────────────────────────────
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

  // ── Map expansion — one-time purchase to unlock full grid ────────────────
  expandMap: () => {
    const state = get();
    if (state.unlockedCols >= GRID_COLS && state.unlockedRows >= GRID_ROWS) return false;
    if (!useResourceStore.getState().spendGold(MAP_EXPANSION_COST)) return false;
    set({ unlockedCols: GRID_COLS, unlockedRows: GRID_ROWS });
    return true;
  },
}));
