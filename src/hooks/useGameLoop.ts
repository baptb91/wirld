/**
 * useGameLoop — runs the main 60-second game tick while the app is open.
 * On app foreground after being closed: applies capped offline progress.
 *
 * Phase 2 implementation: ticks creature production and saves last-tick time.
 * Full resource production wired in Phase 3.
 */
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCreatureStore } from '../store/creatureStore';

const TICK_MS        = 60_000;  // 1 minute real time
const MAX_OFFLINE_TICKS = 480;  // cap 8 hours offline progress
const LAST_TICK_KEY  = '@wilds/lastTickTime';

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

/** A single logical tick: update production timestamps, etc. */
function runTick(_tickIndex: number, _offline: boolean): void {
  // Phase 2: placeholder — resource production wired in Phase 3.
  // Creature AI runs on its own faster interval (useCreatureAI).
}

export function useGameLoop(): void {
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef   = useRef<AppStateStatus>(AppState.currentState);

  const applyOfflineProgress = async () => {
    const lastTick   = await loadLastTick();
    const elapsed    = Date.now() - lastTick;
    const ticks      = Math.min(
      Math.floor(elapsed / TICK_MS),
      MAX_OFFLINE_TICKS,
    );
    for (let i = 0; i < ticks; i++) {
      runTick(i, true);
    }
    await saveLastTick(Date.now());
  };

  const startInterval = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      runTick(0, false);
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
    // Apply any offline progress accumulated since last open
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
