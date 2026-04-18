/**
 * useEcosystemEngine — mounts the wild-creature spawn and departure timers.
 *
 * Spawn cycle  : every SPAWN_INTERVAL_MS (30 min real time)
 *   • Reads current terrain + creature state
 *   • Picks a qualifying species via weighted dropWeight roll
 *   • Inserts a wild creature at a random map edge (walks inward)
 *
 * Departure cycle : every DEPART_CHECK_MS (60 s)
 *   • Removes any wild creature whose wildExpiresAt has passed AND whose
 *     habitatId is still null (not captured by the player)
 *
 * Mount this hook once in MapCanvas (active only while map tab is open).
 */
import { useEffect } from 'react';
import { useMapStore } from '../store/mapStore';
import { useCreatureStore } from '../store/creatureStore';
import {
  evaluateTerrain,
  pickSpawnCandidate,
  createWildCreature,
  SPAWN_INTERVAL_MS,
  DEPART_CHECK_MS,
} from '../engine/EcosystemEngine';
import {
  notifyWildCreature,
  notifyShinyCreature,
} from '../services/NotificationService';

export function useEcosystemEngine(): void {
  useEffect(() => {
    // ── Spawn attempt ──────────────────────────────────────────────────────
    const trySpawn = () => {
      const { terrainGrid, unlockedCols, unlockedRows } = useMapStore.getState();
      const { creatures, maxCreatures, addCreature }    = useCreatureStore.getState();

      // Respect the creature cap
      if (creatures.length >= maxCreatures) return;
      // Need at least a minimal unlocked area
      if (unlockedCols < 4 || unlockedRows < 4) return;

      const counts  = evaluateTerrain(terrainGrid, unlockedCols, unlockedRows, creatures);
      const species = pickSpawnCandidate(counts);
      if (!species) return;

      const newCreature = createWildCreature(species, unlockedCols, unlockedRows);
      addCreature(newCreature);
      if (newCreature.isShiny) {
        notifyShinyCreature(species.name);
      } else {
        notifyWildCreature(species.name);
      }
    };

    // ── Departure check ────────────────────────────────────────────────────
    const checkDepartures = () => {
      const { creatures, removeCreature } = useCreatureStore.getState();
      const now = Date.now();
      for (const c of creatures) {
        if (
          c.wildExpiresAt !== null &&
          c.wildExpiresAt <= now &&
          c.habitatId === null
        ) {
          removeCreature(c.id);
        }
      }
    };

    const spawnTimer  = setInterval(trySpawn,          SPAWN_INTERVAL_MS);
    const departTimer = setInterval(checkDepartures,   DEPART_CHECK_MS);

    return () => {
      clearInterval(spawnTimer);
      clearInterval(departTimer);
    };
  }, []);
}
