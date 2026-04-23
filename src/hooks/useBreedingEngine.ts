/**
 * useBreedingEngine — polls every 60 s for completed gestations.
 *
 * When gestationEndsAt has passed:
 *   1. Creates a baby creature from the gestating parent
 *   2. Adds it to the habitat (if capacity allows)
 *   3. Clears gestation fields on the habitat
 */
import { useEffect, useRef } from 'react';
import { useMapStore } from '../store/mapStore';
import { useCreatureStore } from '../store/creatureStore';
import { createBabyCreature } from '../engine/BreedingEngine';
import { HABITAT_MAP } from '../constants/habitats';

const CHECK_INTERVAL_MS = 60_000;

export function useBreedingEngine(): void {
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runTick = () => {
    const { habitats, updateHabitat, assignCreatureToHabitat } = useMapStore.getState();
    const { creatures, addCreature } = useCreatureStore.getState();
    const now = Date.now();

    for (const h of habitats) {
      if (!h.gestationEndsAt || !h.gestatingCreatureId) continue;
      if (now < h.gestationEndsAt) continue;

      const parent = creatures.find((c) => c.id === h.gestatingCreatureId);
      const clearGestation = () =>
        updateHabitat(h.id, {
          gestationEndsAt:     undefined,
          gestatingCreatureId: undefined,
          gestatingSpeciesId:  undefined,
        });

      if (!parent) {
        clearGestation();
        continue;
      }

      const babyBase = createBabyCreature(parent);
      const babyId   = `baby-${parent.speciesId}-${now}`;
      const baby     = { ...babyBase, id: babyId };

      addCreature(baby);

      // Assign baby to the habitat if there's capacity
      const def = HABITAT_MAP.get(h.habitatTypeId);
      if (def && h.assignedCreatureIds.length < def.capacity) {
        assignCreatureToHabitat(h.id, babyId);
      }

      clearGestation();
    }
  };

  useEffect(() => {
    tickRef.current = setInterval(runTick, CHECK_INTERVAL_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);
}
