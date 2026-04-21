/**
 * RavagerEngine — pure functions for ravager wave logic.
 *
 * Attack schedule:
 *   First wave : 24 h after firstLaunchAt (persisted in AsyncStorage)
 *   Subsequent : every 12 h
 *   Warning    : notification sent 30 min before each wave
 *
 * Wave composition:
 *   count = clamp(3, 15, floor(playerLevel / 2) + 3)
 *   playerLevel = floor(xp / 100) + 1
 *
 * Priority targets (per ravager, no double-targeting):
 *   1. Any placed plant
 *   2. Warehouse building
 *   3. Owned herbivore not in an immune habitat
 *   4. Map center (fallback — no damage dealt)
 */
import { TILE_SIZE } from '../constants/terrain';
import { SPECIES_MAP } from '../constants/creatures';
import type { PlantInstance } from '../store/plantStore';
import type { BuildingPlacement } from '../store/mapStore';
import type { Creature } from '../store/creatureStore';

// ---------------------------------------------------------------------------
// Timing constants (consumed by useRavagerEngine)
// ---------------------------------------------------------------------------

export const FIRST_ATTACK_DELAY_MS   = 24 * 60 * 60 * 1000; // 24 h
export const ATTACK_INTERVAL_MS      = 12 * 60 * 60 * 1000; // 12 h
export const WARNING_BEFORE_MS       = 30 * 60 * 1000;       // 30 min
export const RAVAGER_AI_TICK_MS      = 2_000;
export const RAVAGER_SPEED_PX_PER_MS = TILE_SIZE / 1800;     // ~26 px/s

// ---------------------------------------------------------------------------
// Ravager entity
// ---------------------------------------------------------------------------

export const RAVAGER_MAX_HP = 5;

export interface Ravager {
  id:         string;
  spawnedAt:  number;                    // UTC ms — wave creation time
  spawnPx:    { x: number; y: number };  // off-screen entry point
  targetPx:   { x: number; y: number };  // attack destination
  arrivalAt:  number;                    // UTC ms — when ravager reaches targetPx
  retreatPx:  { x: number; y: number };  // off-screen retreat point
  retreatAt:  number;                    // UTC ms — when retreat animation ends
  entryEdge:  0 | 1 | 2 | 3;            // 0=top 1=right 2=bottom 3=left
  targetType: 'plant' | 'warehouse' | 'herbivore' | 'center';
  targetId:   string | null;
  state:      'moving' | 'retreating' | 'done';
  hp:         number;
  maxHp:      number;
}

// ---------------------------------------------------------------------------
// Interpolated world-space position (for logic / hit tests)
// ---------------------------------------------------------------------------

export function interpolateRavagerPos(
  r: Ravager,
  now: number,
): { x: number; y: number } {
  if (r.state === 'moving') {
    const total = r.arrivalAt - r.spawnedAt;
    const t     = total > 0 ? Math.max(0, Math.min(1, (now - r.spawnedAt) / total)) : 1;
    return {
      x: r.spawnPx.x + (r.targetPx.x - r.spawnPx.x) * t,
      y: r.spawnPx.y + (r.targetPx.y - r.spawnPx.y) * t,
    };
  }
  if (r.state === 'retreating') {
    const total = r.retreatAt - r.arrivalAt;
    const t     = total > 0 ? Math.max(0, Math.min(1, (now - r.arrivalAt) / total)) : 1;
    return {
      x: r.targetPx.x + (r.retreatPx.x - r.targetPx.x) * t,
      y: r.targetPx.y + (r.retreatPx.y - r.targetPx.y) * t,
    };
  }
  return r.targetPx;
}

// ---------------------------------------------------------------------------
// Player level
// ---------------------------------------------------------------------------

export function xpToLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function ravagerCount(level: number): number {
  return Math.min(15, Math.max(3, Math.floor(level / 2) + 3));
}

// ---------------------------------------------------------------------------
// Private geometry helpers
// ---------------------------------------------------------------------------

function pxDist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function walkDuration(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return pxDist(from, to) / RAVAGER_SPEED_PX_PER_MS;
}

function randomEdge(): 0 | 1 | 2 | 3 {
  return Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3;
}

function spawnPixel(edge: 0 | 1 | 2 | 3, cols: number, rows: number): { x: number; y: number } {
  const half = TILE_SIZE / 2;
  switch (edge) {
    case 0:  // top
      return { x: Math.floor(Math.random() * cols) * TILE_SIZE + half, y: -half };
    case 1:  // right
      return { x: cols * TILE_SIZE + half, y: Math.floor(Math.random() * rows) * TILE_SIZE + half };
    case 2:  // bottom
      return { x: Math.floor(Math.random() * cols) * TILE_SIZE + half, y: rows * TILE_SIZE + half };
    default: // left
      return { x: -half, y: Math.floor(Math.random() * rows) * TILE_SIZE + half };
  }
}

function retreatPixel(
  edge: 0 | 1 | 2 | 3,
  cols: number,
  rows: number,
  from: { x: number; y: number },
): { x: number; y: number } {
  switch (edge) {
    case 0:  return { x: from.x, y: -TILE_SIZE };
    case 1:  return { x: cols * TILE_SIZE + TILE_SIZE, y: from.y };
    case 2:  return { x: from.x, y: rows * TILE_SIZE + TILE_SIZE };
    default: return { x: -TILE_SIZE, y: from.y };
  }
}

// ---------------------------------------------------------------------------
// Priority target selector
// ---------------------------------------------------------------------------

function selectTarget(
  plants:    readonly PlantInstance[],
  buildings: readonly BuildingPlacement[],
  creatures: readonly Creature[],
  taken:     Set<string>,
  center:    { x: number; y: number },
): { type: Ravager['targetType']; id: string | null; px: { x: number; y: number } } {
  // 1. Any placed plant
  const plant = plants.find((p) => !taken.has(p.id));
  if (plant) {
    return {
      type: 'plant',
      id:   plant.id,
      px:   { x: (plant.tileX + 0.5) * TILE_SIZE, y: (plant.tileY + 0.5) * TILE_SIZE },
    };
  }

  // 2. Warehouse building
  const wh = buildings.find((b) => b.buildingTypeId === 'warehouse' && !taken.has(b.id));
  if (wh) {
    return {
      type: 'warehouse',
      id:   wh.id,
      px:   { x: (wh.tileX + 1) * TILE_SIZE, y: (wh.tileY + 1) * TILE_SIZE },
    };
  }

  // 3. Owned herbivores (wildExpiresAt === null = captured by player)
  const herb = creatures.find(
    (c) =>
      !taken.has(c.id) &&
      c.wildExpiresAt === null &&
      SPECIES_MAP.get(c.speciesId)?.type === 'herbivore',
  );
  if (herb) {
    return { type: 'herbivore', id: herb.id, px: herb.targetPosition };
  }

  // 4. Fallback: walk toward center (no damage)
  return { type: 'center', id: null, px: center };
}

// ---------------------------------------------------------------------------
// Wave factory (pure — no side-effects)
// ---------------------------------------------------------------------------

export function createRavagerWave(
  count:        number,
  unlockedCols: number,
  unlockedRows: number,
  plants:       readonly PlantInstance[],
  buildings:    readonly BuildingPlacement[],
  creatures:    readonly Creature[],
): Ravager[] {
  const now    = Date.now();
  const center = {
    x: (unlockedCols / 2) * TILE_SIZE,
    y: (unlockedRows / 2) * TILE_SIZE,
  };
  const ravagers: Ravager[] = [];
  const taken = new Set<string>();

  for (let i = 0; i < count; i++) {
    const edge   = randomEdge();
    const spawn  = spawnPixel(edge, unlockedCols, unlockedRows);
    const tgt    = selectTarget(plants, buildings, creatures, taken, center);
    if (tgt.id) taken.add(tgt.id);

    const walkMs  = walkDuration(spawn, tgt.px);
    const arrive  = now + walkMs;
    const retreat = retreatPixel(edge, unlockedCols, unlockedRows, tgt.px);
    const retMs   = walkDuration(tgt.px, retreat);

    ravagers.push({
      id:         `ravager-${now}-${i}`,
      spawnedAt:  now,
      spawnPx:    spawn,
      targetPx:   tgt.px,
      arrivalAt:  arrive,
      retreatPx:  retreat,
      retreatAt:  arrive + retMs + 500, // 500ms pause at target
      entryEdge:  edge,
      targetType: tgt.type,
      targetId:   tgt.id,
      state:      'moving',
      hp:         RAVAGER_MAX_HP,
      maxHp:      RAVAGER_MAX_HP,
    });
  }

  return ravagers;
}
