/**
 * BreedingEngine — pure functions for the normal breeding system.
 *
 * Breeding conditions:
 *   - 2 owned creatures of the same species
 *   - both level ≥ 3
 *   - both assigned to the same habitat
 *   - both have completed ≥ 1 full sleep cycle in that habitat
 *
 * Gestation duration is based on the species rarity.
 * Result: a level-1 baby creature of the same species.
 */
import { SPECIES_MAP, Rarity } from '../constants/creatures';
import type { Creature } from '../store/creatureStore';
import type { HabitatPlacement } from '../store/mapStore';

export const GESTATION_MS: Record<Rarity, number> = {
  common:     2 * 60 * 60 * 1000,
  uncommon:   4 * 60 * 60 * 1000,
  rare:       8 * 60 * 60 * 1000,
  epic:      24 * 60 * 60 * 1000,
  legendary: 72 * 60 * 60 * 1000,
};

/**
 * Returns the first valid breeding pair found in this habitat, or null.
 * Both creatures must be owned (wildExpiresAt === null), level ≥ 3,
 * and have sleepCyclesInHabitat ≥ 1.
 */
export function findBreedPair(
  habitat: HabitatPlacement,
  allCreatures: readonly Creature[],
): [Creature, Creature] | null {
  const assigned = allCreatures.filter(
    (c) =>
      habitat.assignedCreatureIds.includes(c.id) &&
      c.wildExpiresAt === null,
  );
  if (assigned.length < 2) return null;

  const bySpecies = new Map<string, Creature[]>();
  for (const c of assigned) {
    const arr = bySpecies.get(c.speciesId) ?? [];
    arr.push(c);
    bySpecies.set(c.speciesId, arr);
  }

  for (const [, group] of bySpecies) {
    if (group.length < 2) continue;
    const eligible = group.filter(
      (c) => c.level >= 3 && (c.sleepCyclesInHabitat ?? 0) >= 1,
    );
    if (eligible.length >= 2) return [eligible[0], eligible[1]];
  }
  return null;
}

/** Create a baby creature from a gestating parent. Baby is level 1, in the same habitat. */
export function createBabyCreature(parent: Creature): Omit<Creature, 'id'> {
  const now = Date.now();
  const def = SPECIES_MAP.get(parent.speciesId);
  return {
    speciesId:           parent.speciesId,
    name:                def?.name ?? 'Baby',
    level:               1,
    happiness:           80,
    hunger:              0,
    lastHungerAt:        now,
    isShiny:             Math.random() < (def?.shinyRate ?? 0.02),
    habitatId:           parent.habitatId,
    state:               'active',
    position:            { ...parent.position },
    targetPosition:      { ...parent.position },
    lastProducedAt:      now,
    scheduleType:        parent.scheduleType,
    nextMoveAt:          now + 2000,
    lastWokenAt:         0,
    sleepInterrupts:     0,
    lastAffectedAt:      0,
    wildExpiresAt:       null,
    sleepCyclesInHabitat: 0,
  };
}
