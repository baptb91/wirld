/**
 * useBreedingEngine — polls every 60 s for completed gestations.
 *
 * Handles two gestation types:
 *   1. Normal breeding (HabitatPlacement.gestationEndsAt) → baby added to habitat
 *   2. Hybrid breeding (BuildingPlacement.hybridGestationEndsAt) → hybrid baby spawned
 */
import { useEffect, useRef } from 'react';
import { useMapStore } from '../store/mapStore';
import { useCreatureStore } from '../store/creatureStore';
import { createBabyCreature } from '../engine/BreedingEngine';
import { createHybridBaby } from '../engine/HybridBreedingEngine';
import { HABITAT_MAP } from '../constants/habitats';
import { SoundService } from '../services/SoundService';
import { HapticsService } from '../services/HapticsService';

const CHECK_INTERVAL_MS = 60_000;

export function useBreedingEngine(): void {
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runTick = () => {
    const {
      habitats, updateHabitat, assignCreatureToHabitat,
      buildings, updateBuilding,
    } = useMapStore.getState();
    const { creatures, addCreature } = useCreatureStore.getState();
    const now = Date.now();

    // ── Normal breeding: habitat gestations ────────────────────────────────
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

      if (!parent) { clearGestation(); continue; }

      const babyId = `baby-${parent.speciesId}-${now}`;
      addCreature({ ...createBabyCreature(parent), id: babyId });
      SoundService.play('breedingComplete');
      HapticsService.success();

      const def = HABITAT_MAP.get(h.habitatTypeId);
      if (def && h.assignedCreatureIds.length < def.capacity) {
        assignCreatureToHabitat(h.id, babyId);
      }
      clearGestation();
    }

    // ── Hybrid breeding: laboratory gestations ─────────────────────────────
    for (const b of buildings) {
      if (b.buildingTypeId !== 'laboratory') continue;
      if (!b.hybridGestationEndsAt || !b.hybridSpeciesId || !b.hybridParentIds) continue;
      if (now < b.hybridGestationEndsAt) continue;

      const parentA = creatures.find((c) => c.id === b.hybridParentIds![0]);
      const clearHybrid = () =>
        updateBuilding(b.id, {
          hybridGestationEndsAt: undefined,
          hybridSpeciesId:       undefined,
          hybridParentIds:       undefined,
        });

      if (!parentA) { clearHybrid(); continue; }

      const hybridId = `hybrid-${b.hybridSpeciesId}-${now}`;
      addCreature({ ...createHybridBaby(b.hybridSpeciesId, parentA), id: hybridId });
      SoundService.play('breedingComplete');
      HapticsService.success();
      clearHybrid();
    }
  };

  useEffect(() => {
    tickRef.current = setInterval(runTick, CHECK_INTERVAL_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);
}
