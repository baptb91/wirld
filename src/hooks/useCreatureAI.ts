/**
 * useCreatureAI — drives creature movement and sleep-cycle transitions.
 *
 * Ticks every 2 s (movement) and every 60 s (sleep-cycle sync).
 * Pure AI decisions live in CreatureAI.ts; this hook wires them to the store.
 */
import { useEffect, useRef } from 'react';
import { useCreatureStore } from '../store/creatureStore';
import {
  pickWanderTarget,
  walkDuration,
  randomPauseDuration,
  resolveScheduleState,
} from '../engine/CreatureAI';

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
