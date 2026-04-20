/**
 * useRavagerEngine — mounts the ravager attack-wave scheduler and AI loop.
 *
 * Timing (persisted in AsyncStorage):
 *   @wilds/firstLaunchAt  — set once on first mount; drives the initial 24 h delay
 *   @wilds/nextRavagerAt  — updated at end of each wave; next wave = now + 12 h
 *
 * Wave lifecycle:
 *   1. init(): load timestamps, compute nextAttackAt
 *   2. checkAttack() fires every 30 s (and on every AppState → active):
 *      a. If 30 min before wave: send ravager-warning notification
 *      b. If wave is due: spawnWave()
 *      c. If waveActiveUntil has passed: force endWave()
 *   3. AI tick (every 2 s):
 *      • ravager.state 'moving' + arrivalAt ≤ now  → applyDamage + 'retreating'
 *      • ravager.state 'retreating' + retreatAt ≤ now → removeRavager
 *      • all ravagers removed → endWave()
 *
 * Mount once in MapCanvas (active only while the map tab is open).
 */
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRavagerStore } from '../store/ravagerStore';
import { useResourceStore } from '../store/resourceStore';
import { useCreatureStore } from '../store/creatureStore';
import { useMapStore } from '../store/mapStore';
import { usePlantStore } from '../store/plantStore';
import { HABITAT_MAP } from '../constants/habitats';
import {
  FIRST_ATTACK_DELAY_MS,
  ATTACK_INTERVAL_MS,
  WARNING_BEFORE_MS,
  RAVAGER_AI_TICK_MS,
  createRavagerWave,
  xpToLevel,
  ravagerCount,
  type Ravager,
} from '../engine/RavagerEngine';
import { notifyRavagerWarning } from '../services/NotificationService';

// ---------------------------------------------------------------------------
// AsyncStorage keys
// ---------------------------------------------------------------------------

const FIRST_LAUNCH_KEY = '@wilds/firstLaunchAt';
const NEXT_RAVAGER_KEY = '@wilds/nextRavagerAt';
const WAVE_TIMEOUT_MS  = 5 * 60 * 1000; // 5-min hard cap on wave duration

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRavagerEngine(): void {
  const waveSpawnedRef  = useRef(false);
  const warningFiredRef = useRef(false);
  const isInitialized   = useRef(false);
  const isEndingWave    = useRef(false);

  // ── Damage application ─────────────────────────────────────────────────
  function applyDamage(r: Ravager): void {
    if (r.targetType === 'plant' && r.targetId) {
      usePlantStore.getState().removePlant(r.targetId);
      return;
    }

    if (r.targetType === 'warehouse') {
      const resources = useResourceStore.getState().resources;
      for (const [id, amount] of Object.entries(resources)) {
        const loss = Math.floor(amount * 0.3);
        if (loss > 0) useResourceStore.getState().spendResource(id, loss);
      }
      return;
    }

    if (r.targetType === 'herbivore' && r.targetId) {
      const creature = useCreatureStore.getState().creatures.find((c) => c.id === r.targetId);
      if (!creature) return;
      // Respect habitat immunity (RarePalace) and defense bonus (PredatorDen)
      if (creature.habitatId) {
        const hab    = useMapStore.getState().habitats.find((h) => h.id === creature.habitatId);
        const habDef = hab ? HABITAT_MAP.get(hab.habitatTypeId) : undefined;
        if (habDef?.sleepBonus.ravagerImmunity) return;
      }
      useCreatureStore.getState().removeCreature(r.targetId);
    }
  }

  // ── Spawn wave ─────────────────────────────────────────────────────────
  function spawnWave(): void {
    const { xp }                                       = useResourceStore.getState();
    const { unlockedCols, unlockedRows, buildings }    = useMapStore.getState();
    const { plants }                                   = usePlantStore.getState();
    const { creatures }                                = useCreatureStore.getState();

    const level = xpToLevel(xp);
    const count = ravagerCount(level);
    const wave  = createRavagerWave(count, unlockedCols, unlockedRows, plants, buildings, creatures);

    useRavagerStore.getState().setRavagers(wave);
    useRavagerStore.getState().setWaveActiveUntil(Date.now() + WAVE_TIMEOUT_MS);
  }

  // ── End wave ───────────────────────────────────────────────────────────
  async function endWave(): Promise<void> {
    if (isEndingWave.current) return;
    isEndingWave.current = true;

    useRavagerStore.getState().clearRavagers();
    useRavagerStore.getState().setWaveActiveUntil(0);

    const nextAt = Date.now() + ATTACK_INTERVAL_MS;
    useRavagerStore.getState().setNextAttackAt(nextAt);
    try { await AsyncStorage.setItem(NEXT_RAVAGER_KEY, String(nextAt)); } catch { /* ignore */ }

    waveSpawnedRef.current  = false;
    warningFiredRef.current = false;
    isEndingWave.current    = false;
  }

  // ── Periodic attack check ──────────────────────────────────────────────
  function checkAttack(): void {
    if (!isInitialized.current) return;
    const now = Date.now();
    const { nextAttackAt, waveActiveUntil } = useRavagerStore.getState();

    // 30-min warning notification
    if (
      !warningFiredRef.current &&
      nextAttackAt > 0 &&
      now >= nextAttackAt - WARNING_BEFORE_MS &&
      now < nextAttackAt
    ) {
      warningFiredRef.current = true;
      notifyRavagerWarning();
    }

    // Spawn wave when due
    if (!waveSpawnedRef.current && nextAttackAt > 0 && now >= nextAttackAt) {
      // Guard against double-spawn after component remount
      const existing = useRavagerStore.getState().ravagers;
      waveSpawnedRef.current = true;
      if (existing.length === 0) {
        spawnWave();
      }
    }

    // Force-end wave if it has been running too long
    if (waveActiveUntil > 0 && now >= waveActiveUntil) {
      endWave();
    }
  }

  useEffect(() => {
    // ── Initialization ───────────────────────────────────────────────────
    const init = async () => {
      const now = Date.now();

      // First launch timestamp
      let firstLaunch = 0;
      try {
        const raw = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
        firstLaunch = raw ? parseInt(raw, 10) : 0;
        if (!firstLaunch) {
          firstLaunch = now;
          await AsyncStorage.setItem(FIRST_LAUNCH_KEY, String(firstLaunch));
        }
      } catch { firstLaunch = now; }

      // Next attack timestamp
      let nextAt = 0;
      try {
        const raw = await AsyncStorage.getItem(NEXT_RAVAGER_KEY);
        nextAt = raw ? parseInt(raw, 10) : 0;
      } catch { /* ignore */ }

      if (!nextAt) {
        nextAt = firstLaunch + FIRST_ATTACK_DELAY_MS;
        try { await AsyncStorage.setItem(NEXT_RAVAGER_KEY, String(nextAt)); } catch { /* ignore */ }
      }

      useRavagerStore.getState().setNextAttackAt(nextAt);
      isInitialized.current = true;
      checkAttack();
    };

    init();

    // ── Periodic check timer (every 30 s) ────────────────────────────────
    const checkTimer = setInterval(checkAttack, 30_000);

    // ── AI tick (every 2 s) ───────────────────────────────────────────────
    const aiTimer = setInterval(() => {
      const now            = Date.now();
      const { ravagers }   = useRavagerStore.getState();
      if (ravagers.length === 0) return;

      for (const r of ravagers) {
        if (r.state === 'moving' && now >= r.arrivalAt) {
          applyDamage(r);
          useRavagerStore.getState().updateRavager(r.id, { state: 'retreating' });
        } else if (r.state === 'retreating' && now >= r.retreatAt) {
          useRavagerStore.getState().removeRavager(r.id);
        }
      }

      // End wave when all ravagers have retreated
      if (useRavagerStore.getState().ravagers.length === 0 && waveSpawnedRef.current) {
        endWave();
      }
    }, RAVAGER_AI_TICK_MS);

    // ── AppState listener: re-check on foreground ─────────────────────────
    const appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') checkAttack();
    });

    return () => {
      clearInterval(checkTimer);
      clearInterval(aiTimer);
      appStateSub.remove();
    };
  }, []);
}
