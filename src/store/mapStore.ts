import { create } from 'zustand';
import { TerrainType, GRID_COLS, GRID_ROWS } from '../constants/terrain';
import { HABITAT_MAP } from '../constants/habitats';
import { BUILDING_MAP } from '../constants/buildings';

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
  /** Currently selected terrain painting tool (null = navigate mode) */
  selectedTool: TerrainType | null;
  /** Currently selected habitat type to place (null = not placing) */
  selectedHabitat: string | null;
  /** Currently selected building type to place (null = not placing) */
  selectedBuilding: string | null;
  buildings: BuildingPlacement[];
  habitats: HabitatPlacement[];
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
  /** Add a creature to a habitat's roster (respects capacity). */
  assignCreatureToHabitat: (habitatId: string, creatureId: string) => void;
  /** Remove a creature from a habitat's roster. */
  unassignCreatureFromHabitat: (habitatId: string, creatureId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createInitialGrid(): TerrainType[][] {
  return Array.from({ length: GRID_ROWS }, () =>
    Array<TerrainType>(GRID_COLS).fill('grass'),
  );
}

/** Returns true when two AABB rectangles overlap. */
function rectsOverlap(
  ax: number, ay: number, aw: number,
  bx: number, by: number, bw: number,
): boolean {
  return !(ax >= bx + bw || ax + aw <= bx || ay >= by + bw || ay + aw <= by);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useMapStore = create<MapState & MapActions>((set) => ({
  terrainGrid: createInitialGrid(),
  selectedTool: null,
  selectedHabitat: null,
  selectedBuilding: null,
  buildings: [],
  habitats: [],

  paintTile: (x, y, type) => {
    set((state) => {
      if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return state;
      if (state.terrainGrid[y][x] === type) return state;
      const newGrid = state.terrainGrid.map((row) => [...row]);
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

  placeBuilding: (placement) =>
    set((state) => {
      const def = BUILDING_MAP.get(placement.buildingTypeId);
      if (!def) return state;
      const sz = def.tileSize;

      // Bounds check
      if (
        placement.tileX < 0 || placement.tileX + sz > GRID_COLS ||
        placement.tileY < 0 || placement.tileY + sz > GRID_ROWS
      ) return state;

      // Overlap vs existing buildings
      const buildingOverlap = state.buildings.some((b) => {
        const bDef = BUILDING_MAP.get(b.buildingTypeId);
        if (!bDef) return false;
        return rectsOverlap(placement.tileX, placement.tileY, sz, b.tileX, b.tileY, bDef.tileSize);
      });
      if (buildingOverlap) return state;

      // Overlap vs existing habitats
      const habitatOverlap = state.habitats.some((h) => {
        const hDef = HABITAT_MAP.get(h.habitatTypeId);
        if (!hDef) return false;
        return rectsOverlap(placement.tileX, placement.tileY, sz, h.tileX, h.tileY, hDef.tileSize);
      });
      if (habitatOverlap) return state;

      return { buildings: [...state.buildings, placement] };
    }),

  placeHabitat: (placement) =>
    set((state) => {
      const def = HABITAT_MAP.get(placement.habitatTypeId);
      if (!def) return state;
      const sz = def.tileSize;

      // Bounds check
      if (
        placement.tileX < 0 || placement.tileX + sz > GRID_COLS ||
        placement.tileY < 0 || placement.tileY + sz > GRID_ROWS
      ) return state;

      // Overlap check against existing habitats
      const hasOverlap = state.habitats.some((h) => {
        const hDef = HABITAT_MAP.get(h.habitatTypeId);
        if (!hDef) return false;
        return rectsOverlap(
          placement.tileX, placement.tileY, sz,
          h.tileX, h.tileY, hDef.tileSize,
        );
      });
      if (hasOverlap) return state;

      return { habitats: [...state.habitats, placement] };
    }),

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
}));

