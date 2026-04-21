/**
 * useCreatureAI — drives creature movement and sleep-cycle transitions.
 *
 * Ticks every 2 s (movement) and every 60 s (sleep-cycle sync).
 * Pure AI decisions live in CreatureAI.ts; this hook wires them to the store.
 *
 * Auto-assign: when a creature falls asleep for the first time (no habitatId),
 * we scan nearby compatible habitats and assign it to the closest one with
 * available capacity (within AUTO_ASSIGN_RANGE tiles).
 */
import { useEffect, useRef } from 'react';
import { useCreatureStore, Creature } from '../store/creatureStore';
import { useMapStore } from '../store/mapStore';
import { usePlantStore } from '../store/plantStore';
import { useRavagerStore } from '../store/ravagerStore';
import { HABITAT_MAP } from '../constants/habitats';
import { SPECIES_MAP } from '../constants/creatures';
import { TILE_SIZE } from '../constants/terrain';
import { AUTO_WATER_AMOUNT, AUTO_WATER_RANGE_TILES } from '../constants/plants';
import {
  pickWanderTarget,
  walkDuration,
  randomPauseDuration,
  resolveScheduleState,
  isCreatureCompatibleWithHabitat,
  WALK_SPEED_PX_PER_MS,
} from '../engine/CreatureAI';
import { interpolateRavagerPos } from '../engine/RavagerEngine';

const COMBAT_RANGE_PX  = 5 * TILE_SIZE;
const COMBAT_RANGE_SQ  = COMBAT_RANGE_PX ** 2;
const MELEE_RANGE_SQ   = (TILE_SIZE * 1.5) ** 2;

const AUTO_ASSIGN_RANGE_PX = 8 * TILE_SIZE; // 8-tile radius

/** Find the nearest compatible, non-full habitat and assign the creature. */
function autoAssignToHabitat(creature: Creature): void {
  const { habitats, assignCreatureToHabitat } = useMapStore.getState();
  const { updateCreature } = useCreatureStore.getState();

  const cx = creature.targetPosition.x;
  const cy = creature.targetPosition.y;

  let bestHabitatId: string | null = null;
  let bestDist = AUTO_ASSIGN_RANGE_PX;

  for (const h of habitats) {
    if (!isCreatureCompatibleWithHabitat(creature.speciesId, h.habitatTypeId)) continue;
    const def = HABITAT_MAP.get(h.habitatTypeId);
    if (!def) continue;
    if (h.assignedCreatureIds.includes(creature.id)) continue;
    if (h.assignedCreatureIds.length >= def.capacity) continue;

    const habCX = (h.tileX + def.tileSize / 2) * TILE_SIZE;
    const habCY = (h.tileY + def.tileSize / 2) * TILE_SIZE;
    const dist = Math.hypot(cx - habCX, cy - habCY);

    if (dist < bestDist) {
      bestDist = dist;
      bestHabitatId = h.id;
    }
  }

  if (bestHabitatId) {
    assignCreatureToHabitat(bestHabitatId, creature.id);
    updateCreature(creature.id, { habitatId: bestHabitatId });
  }
}

const MOVE_TICK_MS  = 2_000;
const SLEEP_TICK_MS = 60_000;

export function useCreatureAI(): void {
  const moveTickRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Movement tick (2 s) ───────────────────────────────────────────────
  const runMoveTick = () => {
    const { creatures, updateCreature } = useCreatureStore.getState();
    const now = Date.now();

    creatures.forEach((c) => {
      // Resolve stumble expiry here so the creature transitions within 2 s
      // of the stumble window ending, not up to 60 s later via the sleep tick.
      if (c.state === 'stumbling') {
        if (now >= c.nextMoveAt) {
          const next = resolveScheduleState('active', c.scheduleType);
          if (next === 'sleeping') {
            updateCreature(c.id, { state: 'sleeping', sleepInterrupts: 0 });
          } else {
            updateCreature(c.id, {
              state: 'active',
              nextMoveAt: now + 500,
              sleepInterrupts: 0,
            });
          }
        }
        return;
      }

      if (c.state !== 'active') return;

      // ── Carnivore combat: override wander when ravagers are present ────────
      if (SPECIES_MAP.get(c.speciesId)?.type === 'carnivore') {
        const { ravagers, focusedRavagerId } = useRavagerStore.getState();
        const movingRavagers = ravagers.filter((r) => r.state === 'moving');

        if (movingRavagers.length > 0) {
          // Prefer focused ravager; otherwise find nearest within 5 tiles
          let target = movingRavagers.find((r) => r.id === focusedRavagerId) ?? null;

          if (!target) {
            let minDistSq = COMBAT_RANGE_SQ;
            for (const r of movingRavagers) {
              const rp = interpolateRavagerPos(r, now);
              const dx = rp.x - c.targetPosition.x;
              const dy = rp.y - c.targetPosition.y;
              const dSq = dx * dx + dy * dy;
              if (dSq < minDistSq) { minDistSq = dSq; target = r; }
            }
          }

          if (target) {
            const rp  = interpolateRavagerPos(target, now);
            const dx  = rp.x - c.targetPosition.x;
            const dy  = rp.y - c.targetPosition.y;
            const dSq = dx * dx + dy * dy;

            // Melee damage when close enough
            if (dSq < MELEE_RANGE_SQ) {
              useRavagerStore.getState().damageRavager(target.id, 1);
            }

            // Always walk toward target, bypassing nextMoveAt
            const dist   = Math.sqrt(dSq);
            const walkMs = dist / WALK_SPEED_PX_PER_MS;
            updateCreature(c.id, {
              position:       c.targetPosition,
              targetPosition: rp,
              nextMoveAt:     now + walkMs + 200,
            });
            return;
          }
        }
      }

      if (now < c.nextMoveAt) return;

      // Pick a new wander target and schedule the next move
      const newTarget = pickWanderTarget(
        c.targetPosition.x,
        c.targetPosition.y,
      );
      const walkMs  = walkDuration(c.targetPosition, newTarget);
      const pauseMs = randomPauseDuration();

      updateCreature(c.id, {
        position: c.targetPosition,   // record leg start for sprite interpolation
        targetPosition: newTarget,
        nextMoveAt: now + walkMs + pauseMs,
      });
    });

    // ── Auto-watering by active aquatic creatures ─────────────────────────
    const { plants, waterPlant } = usePlantStore.getState();
    if (plants.length > 0) {
      const { creatures: activeCreatures } = useCreatureStore.getState();
      const RANGE_PX = AUTO_WATER_RANGE_TILES * TILE_SIZE;
      const RANGE_SQ = RANGE_PX * RANGE_PX;

      for (const c of activeCreatures) {
        if (c.state !== 'active') continue;
        if (SPECIES_MAP.get(c.speciesId)?.type !== 'aquatic') continue;
        for (const plant of plants) {
          if (plant.state === 'mature') continue;
          const plantCX = (plant.tileX + 0.5) * TILE_SIZE;
          const plantCY = (plant.tileY + 0.5) * TILE_SIZE;
          const dx = c.targetPosition.x - plantCX;
          const dy = c.targetPosition.y - plantCY;
          if (dx * dx + dy * dy <= RANGE_SQ) {
            waterPlant(plant.id, AUTO_WATER_AMOUNT);
          }
        }
      }
    }
  };

  // ── Sleep/wake tick (60 s) ────────────────────────────────────────────
  const runSleepTick = () => {
    const { creatures, updateCreature } = useCreatureStore.getState();
    const now = Date.now();

    creatures.forEach((c) => {
      // Stumbling is already resolved by the 2 s move tick — skip here
      if (c.state === 'stumbling') return;

      const change = resolveScheduleState(c.state, c.scheduleType);
      if (!change) return;

      if (change === 'sleeping') {
        updateCreature(c.id, { state: 'sleeping', sleepInterrupts: 0 });
        // Auto-assign to nearest compatible habitat if not already housed
        if (!c.habitatId) autoAssignToHabitat(c);
      } else {
        // Natural wake-up
        updateCreature(c.id, {
          state: 'active',
          nextMoveAt: now + 500,
          sleepInterrupts: 0,
        });
      }
    });
  };

  useEffect(() => {
    // Run immediately on mount
    runMoveTick();
    runSleepTick();

    moveTickRef.current  = setInterval(runMoveTick,  MOVE_TICK_MS);
    sleepTickRef.current = setInterval(runSleepTick, SLEEP_TICK_MS);

    return () => {
      if (moveTickRef.current)  clearInterval(moveTickRef.current);
      if (sleepTickRef.current) clearInterval(sleepTickRef.current);
    };
  }, []);
}
