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
 *      a. Warning notification (30 min, or 1 h if Watchtower present)
 *      b. If wave is due: spawnWave() — also initializes palisade HP
 *      c. If waveActiveUntil has passed: force endWave()
 *   3. AI tick (every 2 s):
 *      • BaitTrap: slow nearby moving ravagers by 5 min (×effectiveness)
 *      • Palisade: intercept arriving ravager — block damage, decrement HP
 *      • ravager 'moving' + arrivalAt ≤ now → applyDamage + 'retreating'
 *      • ravager 'retreating' + retreatAt ≤ now → removeRavager
 *      • all ravagers gone → endWave()
 *   4. endWave():
 *      • GuardianTotem: extends next interval by 20 % (×effectiveness)
 *      • Publishes BattleReport
 *
 * Online vs offline effectiveness:
 *   Offline (app in background) : 0.6× base
 *   Online, auto-activated       : 1.0× base
 *   Online + player taps button  : 1.3× base
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
import { TILE_SIZE } from '../constants/terrain';
import {
  FIRST_ATTACK_DELAY_MS,
  ATTACK_INTERVAL_MS,
  WARNING_BEFORE_MS,
  WARNING_WATCHTOWER_MS,
  RAVAGER_AI_TICK_MS,
  createRavagerWave,
  getWaveTargetHint,
  xpToLevel,
  ravagerCount,
  interpolateRavagerPos,
  type Ravager,
} from '../engine/RavagerEngine';
import { notifyRavagerWarning } from '../services/NotificationService';
import { HapticsService } from '../services/HapticsService';

const FIRST_LAUNCH_KEY   = '@wilds/firstLaunchAt';
const NEXT_RAVAGER_KEY   = '@wilds/nextRavagerAt';
const WAVE_TIMEOUT_MS    = 5 * 60 * 1000;
const BAIT_TRAP_RANGE_PX = TILE_SIZE * 3;
const BAIT_TRAP_SLOW_MS  = 5 * 60 * 1000; // base: 5 min

export function useRavagerEngine(): void {
  const waveSpawnedRef  = useRef(false);
  const warningFiredRef = useRef(false);
  const isInitialized   = useRef(false);
  const isEndingWave    = useRef(false);

  // Whether the player has the app open (used for effectiveness multiplier)
  const playerOnlineRef = useRef(AppState.currentState === 'active');

  // Battle stat trackers — reset on each wave spawn
  const waveTotalRef       = useRef(0);
  const plantsLostRef      = useRef(0);
  const creaturesLostRef   = useRef(0);
  const resourcesStolenRef = useRef<Record<string, number>>({});

  // ── Effectiveness multiplier ─────────────────────────────────────────────
  function getEffectiveness(buildingId: string): number {
    if (!playerOnlineRef.current) return 0.6;
    const { activatedDefenseIds } = useRavagerStore.getState();
    return activatedDefenseIds.includes(buildingId) ? 1.3 : 1.0;
  }

  // ── Palisade interception ────────────────────────────────────────────────
  // Returns true if a palisade blocked this ravager (skip applyDamage).
  function tryPalisadeBlock(): boolean {
    const { buildings } = useMapStore.getState();
    const palisades = buildings.filter(
      (b) => b.buildingTypeId === 'palisade' && (b.defenseHp ?? 0) > 0,
    );
    if (palisades.length === 0) return false;

    const p = palisades[0];
    const currentHp = p.defenseHp ?? 1;
    if (currentHp <= 1) {
      useMapStore.getState().removeBuilding(p.id);
    } else {
      useMapStore.getState().updateBuilding(p.id, { defenseHp: currentHp - 1 });
    }
    return true;
  }

  // ── BaitTrap slowing ─────────────────────────────────────────────────────
  function checkBaitTrap(r: Ravager, now: number): void {
    const { buildings } = useMapStore.getState();
    const traps = buildings.filter((b) => b.buildingTypeId === 'baitTrap');
    if (traps.length === 0) return;

    const rp = interpolateRavagerPos(r, now);
    for (const trap of traps) {
      const tx = (trap.tileX + 0.5) * TILE_SIZE;
      const ty = (trap.tileY + 0.5) * TILE_SIZE;
      if (Math.hypot(rp.x - tx, rp.y - ty) < BAIT_TRAP_RANGE_PX) {
        const slowMs = Math.round(BAIT_TRAP_SLOW_MS * getEffectiveness(trap.id));
        useRavagerStore.getState().updateRavager(r.id, {
          arrivalAt: r.arrivalAt + slowMs,
          retreatAt: r.retreatAt + slowMs,
        });
        useRavagerStore.getState().addSlowedRavager(r.id);
        break;
      }
    }
  }

  // ── Damage application (tracks stats for battle report) ─────────────────
  function applyDamage(r: Ravager): void {
    if (r.targetType === 'plant' && r.targetId) {
      usePlantStore.getState().removePlant(r.targetId);
      plantsLostRef.current++;
      return;
    }

    if (r.targetType === 'warehouse') {
      const resources = useResourceStore.getState().resources;
      for (const [id, amount] of Object.entries(resources)) {
        const loss = Math.floor(amount * 0.3);
        if (loss > 0) {
          useResourceStore.getState().spendResource(id, loss);
          resourcesStolenRef.current[id] = (resourcesStolenRef.current[id] ?? 0) + loss;
        }
      }
      return;
    }

    if (r.targetType === 'herbivore' && r.targetId) {
      const creature = useCreatureStore.getState().creatures.find((c) => c.id === r.targetId);
      if (!creature) return;
      if (creature.habitatId) {
        const hab    = useMapStore.getState().habitats.find((h) => h.id === creature.habitatId);
        const habDef = hab ? HABITAT_MAP.get(hab.habitatTypeId) : undefined;
        if (habDef?.sleepBonus.ravagerImmunity) return;
      }
      useCreatureStore.getState().removeCreature(r.targetId);
      HapticsService.heavy();
      creaturesLostRef.current++;
    }
  }

  // ── Spawn wave ─────────────────────────────────────────────────────────
  function spawnWave(): void {
    const { xp }                                    = useResourceStore.getState();
    const { unlockedCols, unlockedRows, buildings } = useMapStore.getState();
    const { plants }                                = usePlantStore.getState();
    const { creatures }                             = useCreatureStore.getState();

    const level = xpToLevel(xp);
    const count = ravagerCount(level);
    const wave  = createRavagerWave(count, unlockedCols, unlockedRows, plants, buildings, creatures);

    // Reset wave stats
    waveTotalRef.current       = count;
    plantsLostRef.current      = 0;
    creaturesLostRef.current   = 0;
    resourcesStolenRef.current = {};
    useRavagerStore.getState().resetWaveStats();

    // Initialize palisade HP for this wave based on online status
    const baseHp = 2;
    for (const b of buildings) {
      if (b.buildingTypeId !== 'palisade') continue;
      const hp = playerOnlineRef.current ? baseHp : Math.max(1, Math.round(baseHp * 0.6));
      useMapStore.getState().updateBuilding(b.id, { defenseHp: hp });
    }

    useRavagerStore.getState().setRavagers(wave);
    useRavagerStore.getState().setWaveActiveUntil(Date.now() + WAVE_TIMEOUT_MS);
  }

  // ── End wave ───────────────────────────────────────────────────────────
  async function endWave(): Promise<void> {
    if (isEndingWave.current) return;
    isEndingWave.current = true;

    const { waveDefeats } = useRavagerStore.getState();

    useRavagerStore.getState().clearRavagers();
    useRavagerStore.getState().setWaveActiveUntil(0);
    useRavagerStore.getState().setFocusedRavager(null);

    // Publish battle report
    useRavagerStore.getState().setBattleReport({
      ravagersDefeated: waveDefeats,
      ravagersEscaped:  Math.max(0, waveTotalRef.current - waveDefeats),
      plantsDestroyed:  plantsLostRef.current,
      creaturesLost:    creaturesLostRef.current,
      resourcesStolen:  { ...resourcesStolenRef.current },
    });

    // GuardianTotem: extend next attack interval by 20% × effectiveness
    const totems = useMapStore.getState().buildings.filter(
      (b) => b.buildingTypeId === 'guardianTotem',
    );
    let nextAt: number;
    if (totems.length > 0) {
      const eff   = getEffectiveness(totems[0].id);
      const bonus = Math.round(ATTACK_INTERVAL_MS * 0.2 * eff);
      nextAt = Date.now() + ATTACK_INTERVAL_MS + bonus;
    } else {
      nextAt = Date.now() + ATTACK_INTERVAL_MS;
    }

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

    const { buildings } = useMapStore.getState();
    const hasWatchtower = buildings.some((b) => b.buildingTypeId === 'watchtower');
    const warningMs     = hasWatchtower ? WARNING_WATCHTOWER_MS : WARNING_BEFORE_MS;

    if (
      !warningFiredRef.current &&
      nextAttackAt > 0 &&
      now >= nextAttackAt - warningMs &&
      now < nextAttackAt
    ) {
      warningFiredRef.current = true;
      if (hasWatchtower) {
        const { plants }    = usePlantStore.getState();
        const { creatures } = useCreatureStore.getState();
        const hint    = getWaveTargetHint(plants, buildings, creatures);
        const leadMin = Math.round(warningMs / 60_000);
        notifyRavagerWarning(leadMin, hint);
      } else {
        notifyRavagerWarning();
      }
    }

    if (!waveSpawnedRef.current && nextAttackAt > 0 && now >= nextAttackAt) {
      const existing = useRavagerStore.getState().ravagers;
      waveSpawnedRef.current = true;
      if (existing.length === 0) spawnWave();
    }

    if (waveActiveUntil > 0 && now >= waveActiveUntil) endWave();
  }

  useEffect(() => {
    const init = async () => {
      const now = Date.now();

      let firstLaunch = 0;
      try {
        const raw = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
        firstLaunch = raw ? parseInt(raw, 10) : 0;
        if (!firstLaunch) {
          firstLaunch = now;
          await AsyncStorage.setItem(FIRST_LAUNCH_KEY, String(firstLaunch));
        }
      } catch { firstLaunch = now; }

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

    const checkTimer = setInterval(checkAttack, 30_000);

    const aiTimer = setInterval(() => {
      const now          = Date.now();
      const { ravagers } = useRavagerStore.getState();
      if (ravagers.length === 0) return;

      for (const r of ravagers) {
        // BaitTrap: check proximity for moving ravagers not yet slowed
        if (r.state === 'moving') {
          const { slowedRavagerIds } = useRavagerStore.getState();
          if (!slowedRavagerIds.includes(r.id)) {
            checkBaitTrap(r, now);
          }
        }

        if (r.state === 'moving' && now >= r.arrivalAt) {
          const blocked = tryPalisadeBlock();
          if (!blocked) applyDamage(r);
          useRavagerStore.getState().updateRavager(r.id, { state: 'retreating' });
        } else if (r.state === 'retreating' && now >= r.retreatAt) {
          useRavagerStore.getState().removeRavager(r.id);
        }
      }

      if (useRavagerStore.getState().ravagers.length === 0 && waveSpawnedRef.current) {
        endWave();
      }
    }, RAVAGER_AI_TICK_MS);

    const appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      playerOnlineRef.current = (next === 'active');
      if (next === 'active') checkAttack();
    });

    return () => {
      clearInterval(checkTimer);
      clearInterval(aiTimer);
      appStateSub.remove();
    };
  }, []);
}
