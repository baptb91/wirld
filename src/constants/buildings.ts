/**
 * Building type definitions (non-habitat map structures).
 * Phase 3: Warehouse only.
 */

export interface BuildingDef {
  id: string;
  name: string;
  emoji: string;
  baseCost: number;
  /** Square footprint in tiles (2 → 2×2) */
  tileSize: 2 | 3;
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
] as const;

export const BUILDING_MAP = new Map(BUILDING_TYPES.map((b) => [b.id, b]));
