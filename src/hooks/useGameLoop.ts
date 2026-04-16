/**
 * useGameLoop — runs the main 60-second game tick while the app is open.
 * On app foreground after being closed: applies capped offline progress.
 *
 * Resource production logic:
 *   - Each creature has a productionInterval (seconds) and lastProducedAt timestamp.
 *   - Every tick we compute how many full intervals have elapsed (capped at 8 h).
 *   - Happiness modifier: ≥80 → ×1.5, ≥50 → ×1.0, <50 → ×0.5
 *   - Habitat productionMultiplier bonus applied on top if creature is housed.
 *   - Same runProductionTick(now) handles both online and offline catchup.
 */
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCreatureStore } from '../store/creatureStore';
import { useMapStore } from '../store/mapStore';
import { useResourceStore } from '../store/resourceStore';
import { SPECIES_MAP } from '../constants/creatures';
import { HABITAT_MAP } from '../constants/habitats';

const TICK_MS             = 60_000;           // 1 minute real time
const MAX_OFFLINE_SECONDS = 480 * 60;          // cap at 8 h offline
const LAST_TICK_KEY       = '@wilds/lastTickTime';

// ---------------------------------------------------------------------------
// Persistence helpers
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
// Production tick
// ---------------------------------------------------------------------------

/**
 * Evaluate resource production for every creature as of `now`.
 * Handles multiple missed intervals (offline catch-up) automatically.
 */
function runProductionTick(now: number): void {
  const { creatures } = useCreatureStore.getState();
  const { habitats }  = useMapStore.getState();
  const { addResource } = useResourceStore.getState();

  for (const creature of creatures) {
    const def = SPECIES_MAP.get(creature.speciesId);
    if (!def) continue;

    const intervalMs = def.productionInterval * 1000;
    // Cap how far back we look (offline protection)
    const elapsed = Math.min(
      now - creature.lastProducedAt,
      MAX_OFFLINE_SECONDS * 1000,
    );
    if (elapsed < intervalMs) continue;

    const intervals = Math.floor(elapsed / intervalMs);

    // Happiness multiplier
    let mult =
      creature.happiness >= 80 ? 1.5 :
      creature.happiness >= 50 ? 1.0 : 0.5;

    // Habitat sleep bonus
    if (creature.habitatId) {
      const habitat    = habitats.find((h) => h.id === creature.habitatId);
      const habitatDef = habitat ? HABITAT_MAP.get(habitat.habitatTypeId) : undefined;
      if (habitatDef?.sleepBonus.productionMultiplier) {
        mult *= habitatDef.sleepBonus.productionMultiplier;
      }
    }

    const amount = Math.max(1, Math.round(intervals * mult));
    addResource(def.resourceId, amount);

    // Advance lastProducedAt by exact intervals processed (not to `now`)
    // so fractional progress carries over to the next tick.
    useCreatureStore.getState().updateCreature(creature.id, {
      lastProducedAt: creature.lastProducedAt + intervals * intervalMs,
    });
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGameLoop(): void {
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef  = useRef<AppStateStatus>(AppState.currentState);

  const applyOfflineProgress = async () => {
    // Timestamp-based offline catch-up — no loop needed
    runProductionTick(Date.now());
    await saveLastTick(Date.now());
  };

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
        applyOfflineProgress().then(() => startInterval());
      } else if (nextState !== 'active') {
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
