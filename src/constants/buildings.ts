/**
 * Building type definitions (non-habitat map structures).
 */

export interface BuildingDef {
  id: string;
  name: string;
  emoji: string;
  baseCost: number;
  /** Square footprint in tiles (1 → 1×1, 2 → 2×2, 3 → 3×3) */
  tileSize: 1 | 2 | 3;
  description: string;
}

export const BUILDING_TYPES: readonly BuildingDef[] = [
  {
    id: 'warehouse',
    name: 'Warehouse',
    emoji: '🏪',
    baseCost: 200,
    tileSize: 2,
    description: 'Stores resources produced by creatures and plants.',
  },
  {
    id: 'transformer',
    name: 'Transformer',
    emoji: '⚙️',
    baseCost: 400,
    tileSize: 2,
    description: 'Converts raw resources into refined materials.',
  },
  {
    id: 'nursery',
    name: 'Nursery',
    emoji: '🌱',
    baseCost: 250,
    tileSize: 2,
    description: 'Raises creature eggs and young offspring.',
  },
  {
    id: 'breedingHut',
    name: 'Breeding Hut',
    emoji: '🏡',
    baseCost: 350,
    tileSize: 2,
    description: 'Facilitates creature breeding pairs.',
  },
  {
    id: 'laboratory',
    name: 'Laboratory',
    emoji: '🔬',
    baseCost: 600,
    tileSize: 3,
    description: 'Researches new technologies and mutations.',
  },
  {
    id: 'aquarium',
    name: 'Aquarium',
    emoji: '🐠',
    baseCost: 500,
    tileSize: 3,
    description: 'Houses water-dwelling creatures for display.',
  },
  {
    id: 'vivarium',
    name: 'Vivarium',
    emoji: '🦎',
    baseCost: 500,
    tileSize: 3,
    description: 'Controlled environment for exotic land creatures.',
  },
  {
    id: 'market',
    name: 'Market',
    emoji: '💰',
    baseCost: 300,
    tileSize: 2,
    description: 'Trade creatures and resources with visitors.',
  },
  {
    id: 'palisade',
    name: 'Palisade',
    emoji: '🪵',
    baseCost: 50,
    tileSize: 1,
    description: 'Defensive wooden fence section.',
  },
  {
    id: 'baitTrap',
    name: 'Bait Trap',
    emoji: '🪤',
    baseCost: 100,
    tileSize: 1,
    description: 'Lures wild creatures into your territory.',
  },
  {
    id: 'watchtower',
    name: 'Watchtower',
    emoji: '🗼',
    baseCost: 150,
    tileSize: 1,
    description: 'Extends visibility over the surrounding map.',
  },
  {
    id: 'guardianTotem',
    name: 'Guardian Totem',
    emoji: '🗿',
    baseCost: 200,
    tileSize: 1,
    description: 'Mystical totem that calms nearby creatures.',
  },
] as const;

export const BUILDING_MAP = new Map(BUILDING_TYPES.map((b) => [b.id, b]));
