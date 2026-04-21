/**
 * useGameLoop — drives the main 60-second production tick and offline catch-up.
 *
 * Offline catch-up (step 10):
 *   1. Load `lastTickTime` from AsyncStorage on app open / foreground.
 *   2. Compute elapsed = now − lastTick, capped at MAX_OFFLINE_SECONDS (8 h).
 *   3. runProductionTick(now) — creature production; handles N missed intervals
 *      from each creature's own lastProducedAt timestamp.
 *   4. runOfflineAutoWater(cappedElapsedMs) — simulate aquatic-creature auto-water
 *      ticks for plants (every 2 s while app was closed).
 *   5. Diff resource state before/after → build OfflineSummary.
 *   6. If away ≥ 5 min and something was earned, publish summary to
 *      resourceStore.pendingOfflineSummary so OfflineSummaryModal can display it.
 *
 * Online tick: same runProductionTick every 60 s; no modal shown.
 */
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCreatureStore } from '../store/creatureStore';
import { useMapStore } from '../store/mapStore';
import { useResourceStore } from '../store/resourceStore';
import { usePlantStore } from '../store/plantStore';
import { SPECIES_MAP } from '../constants/creatures';
import { HABITAT_MAP } from '../constants/habitats';
import { AUTO_WATER_AMOUNT, AUTO_WATER_RANGE_TILES } from '../constants/plants';
import { TILE_SIZE } from '../constants/terrain';
import { notifyCarnivoreHungry } from '../services/NotificationService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TICK_MS             = 60_000;
/** Maximum offline time we'll back-fill (8 hours) */
const MAX_OFFLINE_SECONDS = 480 * 60;
/** Minimum away-time before showing the "welcome back" modal */
const MIN_SUMMARY_SECONDS = 5 * 60;
/** Duration of one move/auto-water tick in ms */
const MOVE_TICK_MS        = 2_000;
const LAST_TICK_KEY       = '@wilds/lastTickTime';

/** Carnivore hunger: 5 units per hour */
const HUNGER_PER_MS       = 5 / (60 * 60 * 1000);
/** Vivarium: 3 fish per 24 h */
const VIVARIUM_INTERVAL_MS     = 24 * 60 * 60 * 1000;
const VIVARIUM_FISH_PER_CYCLE  = 3;

// ---------------------------------------------------------------------------
// AsyncStorage helpers
// ---------------------------------------------------------------------------

async function loadLastTick(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAST_TICK_KEY);
    return raw ? parseInt(raw, 10) : Date.now();
  } catch {
    return Date.now();
  }
}

async function saveLastTick(ts: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_TICK_KEY, String(ts));
  } catch {
    // silently ignore storage failures
  }
}

// ---------------------------------------------------------------------------
// Production tick — handles any number of missed production intervals
// ---------------------------------------------------------------------------

function runProductionTick(now: number): void {
  const { creatures }   = useCreatureStore.getState();
  const { habitats }    = useMapStore.getState();
  const { addResource } = useResourceStore.getState();

  for (const creature of creatures) {
    const def = SPECIES_MAP.get(creature.speciesId);
    if (!def) continue;

    // ── Carnivore hunger ────────────────────────────────────────────────────
    if (def.type === 'carnivore' && creature.state !== 'sleeping') {
      const hungerElapsed = Math.min(
        now - (creature.lastHungerAt ?? now),
        MAX_OFFLINE_SECONDS * 1000,
      );
      const hungerGain = hungerElapsed * HUNGER_PER_MS;
      const prevHunger = creature.hunger;
      const newHunger  = Math.min(100, prevHunger + hungerGain);

      const hungerUpdates: Partial<typeof creature> = {
        hunger:       newHunger,
        lastHungerAt: now,
      };

      if (prevHunger < 80 && newHunger >= 80) {
        notifyCarnivoreHungry();
      }

      if (newHunger >= 100 && prevHunger < 100) {
        // Auto-attack: eat a random owned herbivore
        const { creatures: cs } = useCreatureStore.getState();
        const herbivores = cs.filter(
          (c) =>
            c.id !== creature.id &&
            c.wildExpiresAt === null &&
            SPECIES_MAP.get(c.speciesId)?.type === 'herbivore',
        );
        if (herbivores.length > 0) {
          const victim = herbivores[Math.floor(Math.random() * herbivores.length)];
          if (victim.habitatId) {
            useMapStore.getState().unassignCreatureFromHabitat(victim.habitatId, victim.id);
          }
          useCreatureStore.getState().removeCreature(victim.id);
          hungerUpdates.hunger       = 0;
          hungerUpdates.lastHungerAt = now;
        }
      }

      useCreatureStore.getState().updateCreature(creature.id, hungerUpdates);
    }

    // ── Resource production ─────────────────────────────────────────────────
    const intervalMs = def.productionInterval * 1000;
    const elapsed = Math.min(
      now - creature.lastProducedAt,
      MAX_OFFLINE_SECONDS * 1000,
    );
    if (elapsed < intervalMs) continue;

    const intervals = Math.floor(elapsed / intervalMs);

    let mult =
      creature.happiness >= 80 ? 1.5 :
      creature.happiness >= 50 ? 1.0 : 0.5;

    if (creature.isShiny) mult *= 2;

    if (creature.habitatId) {
      const habitat    = habitats.find((h) => h.id === creature.habitatId);
      const habitatDef = habitat ? HABITAT_MAP.get(habitat.habitatTypeId) : undefined;
      if (habitatDef?.sleepBonus.productionMultiplier) {
        mult *= habitatDef.sleepBonus.productionMultiplier;
      }
    }

    const amount = Math.max(1, Math.round(intervals * mult));
    addResource(def.resourceId, amount);

    useCreatureStore.getState().updateCreature(creature.id, {
      lastProducedAt: creature.lastProducedAt + intervals * intervalMs,
    });
  }

  // ── Vivarium: produce fish every 24 h ──────────────────────────────────
  const { buildings } = useMapStore.getState();
  for (const b of buildings) {
    if (b.buildingTypeId !== 'vivarium') continue;
    const lastProduced = b.lastProducedAt ?? now;
    const elapsed = Math.min(now - lastProduced, MAX_OFFLINE_SECONDS * 1000);
    if (elapsed < VIVARIUM_INTERVAL_MS) continue;
    const cycles = Math.floor(elapsed / VIVARIUM_INTERVAL_MS);
    addResource('fish', cycles * VIVARIUM_FISH_PER_CYCLE);
    useMapStore.getState().updateBuilding(b.id, {
      lastProducedAt: lastProduced + cycles * VIVARIUM_INTERVAL_MS,
    });
  }
}

// ---------------------------------------------------------------------------
// Offline plant auto-watering
// ---------------------------------------------------------------------------

/**
 * For every active aquatic creature, apply the water they would have produced
 * during `cappedElapsedMs` of offline time to any non-mature plants in range.
 */
function runOfflineAutoWater(cappedElapsedMs: number): void {
  const { creatures }    = useCreatureStore.getState();
  const { plants }       = usePlantStore.getState();
  if (plants.length === 0) return;

  const moveTicks = Math.floor(cappedElapsedMs / MOVE_TICK_MS);
  if (moveTicks === 0) return;

  const RANGE_SQ = (AUTO_WATER_RANGE_TILES * TILE_SIZE) ** 2;

  for (const creature of creatures) {
    if (SPECIES_MAP.get(creature.speciesId)?.type !== 'aquatic') continue;

    for (const plant of plants) {
      if (plant.state === 'mature') continue;
      const plantCX = (plant.tileX + 0.5) * TILE_SIZE;
      const plantCY = (plant.tileY + 0.5) * TILE_SIZE;
      const dx = creature.targetPosition.x - plantCX;
      const dy = creature.targetPosition.y - plantCY;
      if (dx * dx + dy * dy <= RANGE_SQ) {
        // Use bulk-water to handle multiple stage advances in one state update
        usePlantStore.getState().applyBulkWater(plant.id, moveTicks * AUTO_WATER_AMOUNT);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Resource delta snapshot helper
// ---------------------------------------------------------------------------

function snapshotResources(): Record<string, number> {
  const { resources, gold } = useResourceStore.getState();
  return { ...resources, __gold__: gold };
}

function computeDeltas(
  before: Record<string, number>,
  after: Record<string, number>,
): Record<string, number> {
  const deltas: Record<string, number> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    const diff = (after[key] ?? 0) - (before[key] ?? 0);
    if (diff > 0) deltas[key] = diff;
  }
  return deltas;
}

// ---------------------------------------------------------------------------
// Full offline catch-up (run on mount + every foreground restore)
// ---------------------------------------------------------------------------

async function applyOfflineProgress(): Promise<void> {
  const lastTick = await loadLastTick();
  const now      = Date.now();

  const elapsedMs       = now - lastTick;
  const cappedElapsedMs = Math.min(elapsedMs, MAX_OFFLINE_SECONDS * 1000);

  // Snapshot before applying anything
  const before = snapshotResources();

  // ── Apply offline progress ──────────────────────────────────────────────
  runProductionTick(now);
  if (cappedElapsedMs > 0) {
    runOfflineAutoWater(cappedElapsedMs);
  }

  // ── Build and publish summary if the player was away long enough ────────
  const elapsedSeconds = Math.floor(cappedElapsedMs / 1000);
  if (elapsedSeconds >= MIN_SUMMARY_SECONDS) {
    const after  = snapshotResources();
    const deltas = computeDeltas(before, after);

    // Only show the modal when at least one resource was actually earned
    if (Object.keys(deltas).length > 0) {
      useResourceStore.getState().setPendingOfflineSummary({
        elapsedSeconds,
        resourceDeltas: deltas,
      });
    }
  }

  await saveLastTick(now);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGameLoop(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const startInterval = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      runProductionTick(Date.now());
      await saveLastTick(Date.now());
    }, TICK_MS);
  };

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    applyOfflineProgress().then(() => startInterval());

    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'active' && prev !== 'active') {
        // Re-entered foreground: catch up offline progress, restart interval
        applyOfflineProgress().then(() => startInterval());
      } else if (nextState !== 'active') {
        // Going to background: stop interval, checkpoint timestamp
        stopInterval();
        saveLastTick(Date.now());
      }
    });

    return () => {
      stopInterval();
      sub.remove();
    };
  }, []);
}
