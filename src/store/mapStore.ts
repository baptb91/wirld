import { create } from 'zustand';
import { TerrainType, GRID_COLS, GRID_ROWS } from '../constants/terrain';

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
  buildings: BuildingPlacement[];
  habitats: HabitatPlacement[];
}

export interface MapActions {
  paintTile: (x: number, y: number, type: TerrainType) => void;
  paintRect: (x1: number, y1: number, x2: number, y2: number, type: TerrainType) => void;
  selectTool: (type: TerrainType | null) => void;
  placeBuilding: (placement: BuildingPlacement) => void;
  placeHabitat: (placement: HabitatPlacement) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createInitialGrid(): TerrainType[][] {
  return Array.from({ length: GRID_ROWS }, () =>
    Array<TerrainType>(GRID_COLS).fill('grass'),
  );
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useMapStore = create<MapState & MapActions>((set) => ({
  terrainGrid: createInitialGrid(),
  selectedTool: null,
  buildings: [],
  habitats: [],

  paintTile: (x, y, type) => {
    set((state) => {
      // Validate bounds
      if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return state;
      // Skip if already that type (avoids unnecessary re-renders)
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

  selectTool: (type) => set({ selectedTool: type }),

  placeBuilding: (placement) =>
    set((state) => ({ buildings: [...state.buildings, placement] })),

  placeHabitat: (placement) =>
    set((state) => ({ habitats: [...state.habitats, placement] })),
}));
