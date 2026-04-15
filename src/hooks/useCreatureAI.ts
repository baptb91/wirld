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

  // ── Movement tick ──────────────────────────────────────────────────────
  const runMoveTick = () => {
    const { creatures, updateCreature } = useCreatureStore.getState();
    const now = Date.now();

    creatures.forEach((c) => {
      if (c.state !== 'active') return;
      if (now < c.nextMoveAt) return;

      // Pick a new wander target
      const newTarget = pickWanderTarget(
        c.targetPosition.x,
        c.targetPosition.y,
      );
      const walkMs   = walkDuration(c.targetPosition, newTarget);
      const pauseMs  = randomPauseDuration();
      const nextMove = now + walkMs + pauseMs;

      updateCreature(c.id, {
        position: c.targetPosition, // record where they started this leg
        targetPosition: newTarget,
        nextMoveAt: nextMove,
      });
    });
  };

  // ── Sleep/wake tick ────────────────────────────────────────────────────
  const runSleepTick = () => {
    const { creatures, updateCreature } = useCreatureStore.getState();
    const now = Date.now();

    creatures.forEach((c) => {
      // Skip creatures mid-stumble — let them finish first
      if (c.state === 'stumbling') {
        if (now >= c.nextMoveAt) {
          // Stumble period over — re-evaluate schedule
          const newState = resolveScheduleState('active', c.scheduleType);
          if (newState === 'sleeping') {
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

      const change = resolveScheduleState(c.state, c.scheduleType);
      if (!change) return;

      if (change === 'sleeping') {
        updateCreature(c.id, { state: 'sleeping', sleepInterrupts: 0 });
      } else {
        // Waking up naturally
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
