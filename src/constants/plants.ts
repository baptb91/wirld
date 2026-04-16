/**
 * All 6 plant type definitions.
 * Plants are 1×1 tile objects placed on the map.
 * Each plant progresses through 4 growth states: seed → sprout → growing → mature.
 * Growth advances automatically when waterLevel reaches waterPerStage.
 *
 * Manual watering: +25 per tap.
 * Auto-watering: active aquatic creatures within 3 tiles add +3 per 2 s tick.
 */

export type GrowthState = 'seed' | 'sprout' | 'growing' | 'mature';

export interface PlantDef {
  id: string;
  name: string;
  /** Emoji shown in the ActionMenu button */
  emoji: string;
  /** Gold cost to plant */
  baseCost: number;
  /** Water units needed to advance one growth stage */
  waterPerStage: number;
  /** Resource produced on harvest */
  resourceId: string;
  /** Amount of resource produced on harvest */
  resourceAmount: number;
  /** 'any' or a TerrainType id that this plant must be planted on */
  requiredTerrain: string;
}

export const PLANT_TYPES: readonly PlantDef[] = [
  {
    id: 'berryBush',
    name: 'Berry Bush',
    emoji: '🫐',
    baseCost: 50,
    waterPerStage: 80,
    resourceId: 'berries',
    resourceAmount: 5,
    requiredTerrain: 'any',
  },
  {
    id: 'sunbloom',
    name: 'Sunbloom',
    emoji: '🌻',
    baseCost: 80,
    waterPerStage: 100,
    resourceId: 'sunPollen',
    resourceAmount: 3,
    requiredTerrain: 'any',
  },
  {
    id: 'fernFrond',
    name: 'Fern Frond',
    emoji: '🌿',
    baseCost: 60,
    waterPerStage: 90,
    resourceId: 'fibers',
    resourceAmount: 4,
    requiredTerrain: 'forest',
  },
  {
    id: 'moonLily',
    name: 'Moon Lily',
    emoji: '🪷',
    baseCost: 120,
    waterPerStage: 70,
    resourceId: 'moonDew',
    resourceAmount: 2,
    requiredTerrain: 'water',
  },
  {
    id: 'rockMoss',
    name: 'Rock Moss',
    emoji: '💎',
    baseCost: 100,
    waterPerStage: 120,
    resourceId: 'crystalDust',
    resourceAmount: 2,
    requiredTerrain: 'rock',
  },
  {
    id: 'glowshroom',
    name: 'Glowshroom',
    emoji: '🍄',
    baseCost: 150,
    waterPerStage: 150,
    resourceId: 'glowSpores',
    resourceAmount: 1,
    requiredTerrain: 'any',
  },
] as const;

export const PLANT_MAP = new Map(PLANT_TYPES.map((p) => [p.id, p]));

/** Water added by one manual tap */
export const MANUAL_WATER_AMOUNT = 25;

/** Water added per 2 s tick by a nearby active aquatic creature */
export const AUTO_WATER_AMOUNT = 3;

/** Tile radius within which aquatic creatures auto-water plants */
export const AUTO_WATER_RANGE_TILES = 3;
