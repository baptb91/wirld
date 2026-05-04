/**
 * HybridBreedingEngine — pure functions for the Laboratory hybrid breeding system.
 *
 * Hybrid recipes (order-independent):
 *   Feuillon  + Flottin   → Feulot    (rare)
 *   Griffax   + Rampex    → Sylvax    (rare)
 *   Broutard  + Crochon   → Terrak    (epic)
 *   Scorpilou + Venomoth  → Toxaris   (epic)
 *   Lumios    + Aquilon   → Célestin  (legendary)
 *
 * Gestation times use the same GESTATION_MS table from BreedingEngine.
 */
import { SPECIES_MAP } from '../constants/creatures';
import { GESTATION_MS } from './BreedingEngine';
import type { Creature } from '../store/creatureStore';

export interface HybridRecipe {
  speciesA: string;
  speciesB: string;
  resultSpeciesId: string;
}

export const HYBRID_RECIPES: readonly HybridRecipe[] = [
  { speciesA: 'feuillon',   speciesB: 'flottin',  resultSpeciesId: 'feulot'   },
  { speciesA: 'griffax',    speciesB: 'rampex',   resultSpeciesId: 'sylvax'   },
  { speciesA: 'broutard',   speciesB: 'crochon',  resultSpeciesId: 'terrak'   },
  { speciesA: 'scorpilou',  speciesB: 'venomoth', resultSpeciesId: 'toxaris'  },
  { speciesA: 'lumios',     speciesB: 'aquilon',  resultSpeciesId: 'celestin' },
];

/** Returns the hybrid result species ID, or null if no recipe matches. */
export function findHybridResult(speciesA: string, speciesB: string): string | null {
  for (const r of HYBRID_RECIPES) {
    if (
      (r.speciesA === speciesA && r.speciesB === speciesB) ||
      (r.speciesA === speciesB && r.speciesB === speciesA)
    ) {
      return r.resultSpeciesId;
    }
  }
  return null;
}

/** Returns all species IDs that are compatible hybrid partners for `speciesId`. */
export function getCompatiblePartners(speciesId: string): string[] {
  const partners: string[] = [];
  for (const r of HYBRID_RECIPES) {
    if (r.speciesA === speciesId) partners.push(r.speciesB);
    if (r.speciesB === speciesId) partners.push(r.speciesA);
  }
  return partners;
}

/** Milliseconds for a hybrid gestation, derived from the result's rarity. */
export function hybridGestationMs(resultSpeciesId: string): number {
  const def = SPECIES_MAP.get(resultSpeciesId);
  if (!def) return GESTATION_MS.rare;
  return GESTATION_MS[def.rarity];
}

/** Create a level-1 hybrid baby creature. */
export function createHybridBaby(
  resultSpeciesId: string,
  parentA: Creature,
): Omit<Creature, 'id'> {
  const now = Date.now();
  const def = SPECIES_MAP.get(resultSpeciesId);
  return {
    speciesId:            resultSpeciesId,
    name:                 def?.name ?? 'Hybrid',
    level:                1,
    happiness:            90,
    hunger:               0,
    lastHungerAt:         now,
    isShiny:              Math.random() < (def?.shinyRate ?? 0.05),
    habitatId:            null,
    state:                'active',
    position:             { ...parentA.position },
    targetPosition:       { ...parentA.position },
    lastProducedAt:       now,
    scheduleType:         def?.schedule ?? 'diurnal',
    nextMoveAt:           now + 2000,
    lastWokenAt:          0,
    sleepInterrupts:      0,
    lastAffectedAt:       0,
    wildExpiresAt:        null,
    sleepCyclesInHabitat: 0,
  };
}
