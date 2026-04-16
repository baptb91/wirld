export const TILE_SIZE = 48;
export const GRID_COLS = 20;
export const GRID_ROWS = 20;
export const MAP_WIDTH  = TILE_SIZE * GRID_COLS; // 960
export const MAP_HEIGHT = TILE_SIZE * GRID_ROWS; // 960

export type TerrainType = 'grass' | 'water' | 'flowers' | 'forest' | 'rock' | 'sand';

export const TERRAIN_TYPES: TerrainType[] = [
  'grass', 'water', 'flowers', 'forest', 'rock', 'sand',
];

export interface TerrainConfig {
  label: string;
  emoji: string;
  costPerTile: number;
  /** Minimap / action-menu swatch color */
  color: string;
  /** Species attracted by this terrain (matched in EcosystemEngine later) */
  attractedSpecies: string[];
}

export const TERRAIN_CONFIG: Record<TerrainType, TerrainConfig> = {
  grass: {
    label: 'Grass',
    emoji: '🌿',
    costPerTile: 10,
    color: '#7EC850',
    attractedSpecies: ['feuillon', 'broutard'],
  },
  water: {
    label: 'Water',
    emoji: '💧',
    costPerTile: 25,
    color: '#4FA8D5',
    attractedSpecies: ['flottin', 'sirpio', 'aquilon'],
  },
  flowers: {
    label: 'Flowers',
    emoji: '🌸',
    costPerTile: 20,
    color: '#E89EC4',
    attractedSpecies: ['boussin', 'mellior'],
  },
  forest: {
    label: 'Forest',
    emoji: '🌳',
    costPerTile: 40,
    color: '#2E6B2E',
    attractedSpecies: ['rampex', 'gribou'],
  },
  rock: {
    label: 'Rock',
    emoji: '🪨',
    costPerTile: 15,
    color: '#8A8A7A',
    attractedSpecies: ['crochon', 'stalagor'],
  },
  sand: {
    label: 'Sand',
    emoji: '🏜',
    costPerTile: 15,
    color: '#D4B896',
    attractedSpecies: ['scorpilou', 'dunor'],
  },
};
