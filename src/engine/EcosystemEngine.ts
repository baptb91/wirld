/**
 * EcosystemEngine — pure functions for wild creature spawn logic.
 *
 * Every SPAWN_INTERVAL_MS real time:
 *   1. Evaluate terrain composition of the unlocked area.
 *   2. Filter species whose terrain[] conditions are all satisfied.
 *   3. Weighted-random pick via dropWeight.
 *   4. Spawn at a random map edge; targetPosition is 4–7 tiles inward
 *      so the sprite animates walking in.
 *   5. Wild creature leaves after WILD_LIFESPAN_MS if never assigned to
 *      a habitat (habitatId === null).
 */

import { TILE_SIZE, TerrainType } from '../constants/terrain';
import { SPECIES, SPECIES_MAP, SpeciesDef } from '../constants/creatures';
import { getHourDecimal } from './TimeEngine';
import type { Creature } from '../store/creatureStore';

// ---------------------------------------------------------------------------
// Public timing constants (consumed by the hook)
// ---------------------------------------------------------------------------

export const SPAWN_INTERVAL_MS = 30 * 60 * 1000; // 30 min
export const WILD_LIFESPAN_MS  = 30 * 60 * 1000; // 30 min to capture
export const DEPART_CHECK_MS   =      60 * 1000; // departure poll

// ---------------------------------------------------------------------------
// Terrain evaluation
// ---------------------------------------------------------------------------

export interface TerrainCounts {
  byType: Record<string, number>; // terrain type → tile count
  totalTiles: number;             // total unlocked tiles
  bySpecies: Record<string, number>; // speciesId → creature count
  totalCreatures: number;
  isNight: boolean;
}

export function evaluateTerrain(
  terrainGrid: TerrainType[][],
  unlockedCols: number,
  unlockedRows: number,
  creatures: readonly Pick<Creature, 'speciesId'>[],
): TerrainCounts {
  const byType: Record<string, number> = {};
  let totalTiles = 0;

  for (let r = 0; r < unlockedRows; r++) {
    for (let c = 0; c < unlockedCols; c++) {
      const t = terrainGrid[r]?.[c];
      if (t !== undefined) {
        byType[t] = (byType[t] ?? 0) + 1;
        totalTiles++;
      }
    }
  }

  const bySpecies: Record<string, number> = {};
  for (const cr of creatures) {
    bySpecies[cr.speciesId] = (bySpecies[cr.speciesId] ?? 0) + 1;
  }

  const hour = getHourDecimal();
  const isNight = hour >= 22 || hour < 6;

  return { byType, totalTiles, bySpecies, totalCreatures: creatures.length, isNight };
}

// ---------------------------------------------------------------------------
// Condition checking
// ---------------------------------------------------------------------------

function meetsConditions(species: SpeciesDef, counts: TerrainCounts): boolean {
  for (const [key, required] of Object.entries(species.terrain)) {
    if (key === 'nightOnly') {
      if (!counts.isNight) return false;
      continue;
    }
    if (key === 'totalCreatures') {
      if (counts.totalCreatures < required) return false;
      continue;
    }
    if (key === 'herbivoreCount') {
      let herbTotal = 0;
      for (const [sid, cnt] of Object.entries(counts.bySpecies)) {
        if (SPECIES_MAP.get(sid)?.type === 'herbivore') herbTotal += cnt;
      }
      if (herbTotal < required) return false;
      continue;
    }
    if (key.endsWith('Count')) {
      // e.g. scorpilouCount → count of species whose id is 'scorpilou'
      const targetId = key.slice(0, -5);
      if ((counts.bySpecies[targetId] ?? 0) < required) return false;
      continue;
    }
    // Terrain-type percentage condition
    const pct = counts.totalTiles > 0
      ? ((counts.byType[key] ?? 0) / counts.totalTiles) * 100
      : 0;
    if (pct < required) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Weighted-random candidate selection
// ---------------------------------------------------------------------------

export function pickSpawnCandidate(counts: TerrainCounts): SpeciesDef | null {
  const candidates = (SPECIES as readonly SpeciesDef[]).filter(
    (s) => meetsConditions(s, counts),
  );
  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, s) => sum + s.dropWeight, 0);
  if (totalWeight <= 0) return null;

  let roll = Math.random() * totalWeight;
  for (const s of candidates) {
    roll -= s.dropWeight;
    if (roll <= 0) return s;
  }
  return candidates[candidates.length - 1];
}

// ---------------------------------------------------------------------------
// Wild creature name generation
// ---------------------------------------------------------------------------

const WILD_PREFIXES = [
  'Lone', 'Shy', 'Bold', 'Mossy', 'Swift',
  'Calm', 'Ancient', 'Young', 'Lost', 'Wild',
  'Gentle', 'Fierce', 'Sleepy', 'Curious', 'Wary',
] as const;

function randomWildName(speciesName: string): string {
  const prefix = WILD_PREFIXES[Math.floor(Math.random() * WILD_PREFIXES.length)];
  return `${prefix} ${speciesName}`;
}

// ---------------------------------------------------------------------------
// Wild creature factory
// ---------------------------------------------------------------------------

const WALK_SPEED_PX_PER_MS = TILE_SIZE / 2000;

export function createWildCreature(
  species: SpeciesDef,
  unlockedCols: number,
  unlockedRows: number,
): Creature {
  const now    = Date.now();
  const isShiny = Math.random() < species.shinyRate;

  // Choose a random map edge (0=top 1=right 2=bottom 3=left)
  const edge = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3;
  let tileX: number;
  let tileY: number;

  switch (edge) {
    case 0:  tileX = Math.floor(Math.random() * unlockedCols); tileY = 0; break;
    case 1:  tileX = unlockedCols - 1; tileY = Math.floor(Math.random() * unlockedRows); break;
    case 2:  tileX = Math.floor(Math.random() * unlockedCols); tileY = unlockedRows - 1; break;
    default: tileX = 0; tileY = Math.floor(Math.random() * unlockedRows); break;
  }

  const spawnPx = {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  };

  // Walk 4–7 tiles inward for the entry animation
  const walkIn = 4 + Math.floor(Math.random() * 4);
  let targetTileX = tileX;
  let targetTileY = tileY;
  switch (edge) {
    case 0:  targetTileY = Math.min(unlockedRows - 1, tileY + walkIn); break;
    case 1:  targetTileX = Math.max(0, tileX - walkIn); break;
    case 2:  targetTileY = Math.max(0, tileY - walkIn); break;
    default: targetTileX = Math.min(unlockedCols - 1, tileX + walkIn); break;
  }

  const targetPx = {
    x: targetTileX * TILE_SIZE + TILE_SIZE / 2,
    y: targetTileY * TILE_SIZE + TILE_SIZE / 2,
  };

  const dx = targetPx.x - spawnPx.x;
  const dy = targetPx.y - spawnPx.y;
  const walkMs = Math.sqrt(dx * dx + dy * dy) / WALK_SPEED_PX_PER_MS;

  return {
    id: `wild-${species.id}-${now}-${Math.floor(Math.random() * 9999)}`,
    speciesId:      species.id,
    name:           randomWildName(species.name),
    level:          1,
    happiness:      60 + Math.floor(Math.random() * 20),
    hunger:         0,
    lastHungerAt:   now,
    isShiny,
    habitatId:      null,
    state:          'active',
    position:       spawnPx,
    targetPosition: targetPx,
    lastProducedAt: now,
    scheduleType:   species.schedule,
    nextMoveAt:     now + walkMs + 500, // start wandering after walk-in finishes
    lastWokenAt:    0,
    sleepInterrupts: 0,
    lastAffectedAt: 0,
    wildExpiresAt:  now + WILD_LIFESPAN_MS,
  };
}
