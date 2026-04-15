/**
 * All 8 habitat type definitions.
 * Matches spec section 6.2 exactly.
 */
export type HabitatCompatible =
  | 'herbivore'
  | 'carnivore'
  | 'aquatic'
  | 'nocturnal'
  | 'epic'
  | 'legendary'
  | 'any';

export interface SleepBonus {
  productionMultiplier?: number;
  autoWaterBonus?: number;     // seconds of auto-watering
  defenseBonus?: number;
  shinyRateBonus?: number;
  ravagerImmunity?: boolean;
}

export interface HabitatTypeDef {
  id: string;
  name: string;
  emoji: string;
  baseCost: number;
  capacity: number;
  compatible: readonly HabitatCompatible[];
  sleepBonus: SleepBonus;
  /** 'any' or a TerrainType id */
  requiredTerrain: string;
  /** Square footprint in tiles (2 → 2×2, 3 → 3×3) */
  tileSize: 2 | 3;
}

export const HABITAT_TYPES: readonly HabitatTypeDef[] = [
  {
    id: 'woodBurrow',
    name: 'Wood Burrow',
    emoji: '🪵',
    baseCost: 200,
    capacity: 2,
    compatible: ['herbivore'],
    sleepBonus: { productionMultiplier: 1.10 },
    requiredTerrain: 'grass',
    tileSize: 2,
  },
  {
    id: 'leafNest',
    name: 'Leaf Nest',
    emoji: '🌿',
    baseCost: 350,
    capacity: 3,
    compatible: ['herbivore'],
    sleepBonus: { productionMultiplier: 1.15 },
    requiredTerrain: 'forest',
    tileSize: 2,
  },
  {
    id: 'coveredPool',
    name: 'Covered Pool',
    emoji: '💧',
    baseCost: 500,
    capacity: 2,
    compatible: ['aquatic'],
    sleepBonus: { productionMultiplier: 1.20, autoWaterBonus: 3600 },
    requiredTerrain: 'water',
    tileSize: 2,
  },
  {
    id: 'predatorDen',
    name: "Predator's Den",
    emoji: '🦴',
    baseCost: 800,
    capacity: 2,
    compatible: ['carnivore'],
    sleepBonus: { defenseBonus: 1.25 },
    requiredTerrain: 'any',
    tileSize: 2,
  },
  {
    id: 'rockCave',
    name: 'Rock Cave',
    emoji: '🪨',
    baseCost: 600,
    capacity: 3,
    compatible: ['herbivore', 'carnivore'],
    sleepBonus: { productionMultiplier: 1.15 },
    requiredTerrain: 'rock',
    tileSize: 2,
  },
  {
    id: 'nightSanctuary',
    name: 'Night Sanctuary',
    emoji: '🌙',
    baseCost: 1200,
    capacity: 2,
    compatible: ['nocturnal'],
    sleepBonus: { productionMultiplier: 1.30, shinyRateBonus: 0.01 },
    requiredTerrain: 'any',
    tileSize: 2,
  },
  {
    id: 'rarePalace',
    name: 'Palace of Rares',
    emoji: '⭐',
    baseCost: 3000,
    capacity: 1,
    compatible: ['epic', 'legendary'],
    sleepBonus: { productionMultiplier: 1.50, ravagerImmunity: true },
    requiredTerrain: 'any',
    tileSize: 2,
  },
  {
    id: 'communalCamp',
    name: 'Communal Camp',
    emoji: '🏕',
    baseCost: 1500,
    capacity: 6,
    compatible: ['any'],
    sleepBonus: {},
    requiredTerrain: 'any',
    tileSize: 3,
  },
] as const;

export const HABITAT_MAP = new Map(HABITAT_TYPES.map((h) => [h.id, h]));
