/**
 * CreatureAI — pure functions for creature movement and sleep decisions.
 * All functions are side-effect free; they return new values for the store.
 */
import { GRID_COLS, GRID_ROWS, TILE_SIZE } from '../constants/terrain';
import { ScheduleType } from '../constants/creatures';
import { isCreatureActive } from './TimeEngine';

export type CreatureState =
  | 'active'
  | 'sleeping'
  | 'stumbling'   // just woken by player — reverts after ~12s
  | 'eating'
  | 'working'
  | 'fleeing'
  | 'fighting';

export interface PixelPos {
  x: number;
  y: number;
}

// Speed: 1 tile per 2 seconds = TILE_SIZE px per 2000 ms
export const WALK_SPEED_PX_PER_MS = TILE_SIZE / 2000;

// ---------------------------------------------------------------------------
// Target selection
// ---------------------------------------------------------------------------

/**
 * Pick a random wander target within `range` tiles of the current position.
 * Returns the CENTER pixel coordinate of the target tile.
 */
export function pickWanderTarget(
  currentPx: number,
  currentPy: number,
  range = 5,
): PixelPos {
  const tileX = Math.floor(currentPx / TILE_SIZE);
  const tileY = Math.floor(currentPy / TILE_SIZE);

  const minTX = Math.max(0, tileX - range);
  const maxTX = Math.min(GRID_COLS - 1, tileX + range);
  const minTY = Math.max(0, tileY - range);
  const maxTY = Math.min(GRID_ROWS - 1, tileY + range);

  // Avoid re-picking the exact same tile
  let targetTX: number;
  let targetTY: number;
  let attempts = 0;
  do {
    targetTX = minTX + Math.floor(Math.random() * (maxTX - minTX + 1));
    targetTY = minTY + Math.floor(Math.random() * (maxTY - minTY + 1));
    attempts++;
  } while (targetTX === tileX && targetTY === tileY && attempts < 5);

  return {
    x: targetTX * TILE_SIZE + TILE_SIZE / 2,
    y: targetTY * TILE_SIZE + TILE_SIZE / 2,
  };
}

// ---------------------------------------------------------------------------
// Timing helpers
// ---------------------------------------------------------------------------

/**
 * How long (ms) will it take to walk from pos to target at normal speed?
 */
export function walkDuration(from: PixelPos, to: PixelPos): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist / WALK_SPEED_PX_PER_MS;
}

/**
 * Random pause time (ms) between 2 000 and 4 000.
 */
export function randomPauseDuration(): number {
  return 2000 + Math.random() * 2000;
}

// ---------------------------------------------------------------------------
// Sleep / wake decisions
// ---------------------------------------------------------------------------

/**
 * Returns the new state (active/sleeping) based on the schedule and current time.
 * The caller is responsible for updating nextMoveAt when waking.
 */
export function resolveScheduleState(
  currentState: CreatureState,
  schedule: ScheduleType,
): 'active' | 'sleeping' | null {   // null = no change
  const shouldBeActive = isCreatureActive(schedule);

  if (shouldBeActive && currentState === 'sleeping') return 'active';
  if (!shouldBeActive && currentState === 'active')   return 'sleeping';
  return null; // no change needed
}
