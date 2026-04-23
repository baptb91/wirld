/**
 * HappinessEngine — pure functions for the happiness system.
 *
 * Hourly modifiers:
 *   +20  housed in a compatible habitat
 *   +15  standing on preferred terrain
 *   +10  carnivore well-fed (hunger < 30)
 *   +25  same-species partner in the same habitat
 *   -10  standing on wrong terrain (non-grass, non-preferred)
 *   -15  carnivore hungry (hunger ≥ 80)
 *
 * Event modifiers (applied at the time of the event):
 *   +5   affectionate tap   (max once per hour — enforced in creatureStore)
 *   -5   slept outdoors     (applied on natural wake-up when habitatId === null)
 *   -3   forcefully woken beyond the 2nd time per sleep cycle
 *
 * Production multiplier table (from spec):
 *   80–100 → ×1.3
 *   50–79  → ×1.0
 *   20–49  → ×0.7
 *    0–19  → ×0.4
 */
import { SPECIES_MAP } from '../constants/creatures';
import { TILE_SIZE, TerrainType } from '../constants/terrain';
import { isCreatureCompatibleWithHabitat } from './CreatureAI';
import type { Creature } from '../store/creatureStore';
import type { HabitatPlacement } from '../store/mapStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PHYSICAL_TERRAIN = new Set<TerrainType>(['grass', 'water', 'flowers', 'forest', 'rock', 'sand']);

/** Returns the set of physical terrain types preferred by this species. */
function preferredTerrains(speciesId: string): Set<TerrainType> {
  const def = SPECIES_MAP.get(speciesId);
  if (!def) return new Set();
  const out = new Set<TerrainType>();
  for (const key of Object.keys(def.terrain)) {
    if (PHYSICAL_TERRAIN.has(key as TerrainType)) out.add(key as TerrainType);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Production multiplier
// ---------------------------------------------------------------------------

export function productionMultiplier(happiness: number): number {
  if (happiness >= 80) return 1.3;
  if (happiness >= 50) return 1.0;
  if (happiness >= 20) return 0.7;
  return 0.4;
}

// ---------------------------------------------------------------------------
// Hourly happiness delta
// ---------------------------------------------------------------------------

export interface HappinessContext {
  habitats:     readonly HabitatPlacement[];
  allCreatures: readonly Creature[];
  terrainGrid:  readonly (readonly TerrainType[])[]; // [row][col]
}

/**
 * Computes the net happiness delta to apply in one hourly tick.
 * Does NOT include event-based modifiers (tap, outdoor sleep, forced wake).
 */
export function computeHappinessDelta(
  creature: Creature,
  { habitats, allCreatures, terrainGrid }: HappinessContext,
): number {
  const def = SPECIES_MAP.get(creature.speciesId);
  if (!def) return 0;

  let delta = 0;

  // ── Habitat: +20 housed in compatible habitat ────────────────────────────
  if (creature.habitatId) {
    const habitat = habitats.find((h) => h.id === creature.habitatId);
    if (habitat && isCreatureCompatibleWithHabitat(creature.speciesId, habitat.habitatTypeId)) {
      delta += 20;
    }
  }

  // ── Terrain: +15 preferred / -10 wrong ──────────────────────────────────
  const preferred = preferredTerrains(creature.speciesId);
  if (preferred.size > 0) {
    const tileX = Math.max(0, Math.floor(creature.targetPosition.x / TILE_SIZE));
    const tileY = Math.max(0, Math.floor(creature.targetPosition.y / TILE_SIZE));
    const tile  = terrainGrid[tileY]?.[tileX] ?? 'grass';
    if (preferred.has(tile as TerrainType)) {
      delta += 15;
    } else if (tile !== 'grass' && PHYSICAL_TERRAIN.has(tile as TerrainType)) {
      delta -= 10;
    }
  }

  // ── Carnivore well-fed: +10 if hunger < 30 ───────────────────────────────
  if (def.type === 'carnivore' && creature.hunger < 30) {
    delta += 10;
  }

  // ── Carnivore hungry: -15 if hunger ≥ 80 ────────────────────────────────
  if (def.type === 'carnivore' && creature.hunger >= 80) {
    delta -= 15;
  }

  // ── Breeding partner: +25 if same-species partner in same habitat ────────
  if (creature.habitatId) {
    const hasPartner = allCreatures.some(
      (c) =>
        c.id !== creature.id &&
        c.speciesId === creature.speciesId &&
        c.habitatId === creature.habitatId &&
        c.wildExpiresAt === null,
    );
    if (hasPartner) delta += 25;
  }

  return delta;
}
