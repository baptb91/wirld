import { create } from 'zustand';
import { ScheduleType } from '../constants/creatures';
import { CreatureState } from '../engine/CreatureAI';
import { TILE_SIZE } from '../constants/terrain';
import { isCreatureActive } from '../engine/TimeEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Creature {
  id: string;
  speciesId: string;
  name: string;
  level: number;
  happiness: number;
  /** 0–100; carnivores only — others always 0 */
  hunger: number;
  isShiny: boolean;
  habitatId: string | null;
  state: CreatureState;
  /** Current pixel position (center of creature). Updated each AI tick. */
  position: { x: number; y: number };
  /** Destination pixel position. Sprite animates toward this. */
  targetPosition: { x: number; y: number };
  lastProducedAt: number;
  scheduleType: ScheduleType;
  /** Timestamp: when to pick the next wander target (walk + pause elapsed). */
  nextMoveAt: number;
  /** Timestamp: when the creature was last woken by the player. */
  lastWokenAt: number;
  /** Times this creature was tapped while sleeping in the current sleep cycle. */
  sleepInterrupts: number;
  /** Timestamp: when affection was last shown (heart animation trigger). */
  lastAffectedAt: number;
  /**
   * null  = permanent (starter / assigned to habitat).
   * number = UTC ms when a wild creature leaves if still unassigned.
   */
  wildExpiresAt: number | null;
}

export interface CreatureState2 {
  creatures: Creature[];
  maxCreatures: number;
}

export interface CreatureActions {
  addCreature: (c: Creature) => void;
  removeCreature: (id: string) => void;
  updateCreature: (id: string, updates: Partial<Creature>) => void;
  wakeCreature: (id: string) => void;
  affectCreature: (id: string) => void;
  setCreatures: (cs: Creature[]) => void;
  increaseMaxCreatures: (amount: number) => void;
  shiftPositions: (dx: number, dy: number) => void;
}

// ---------------------------------------------------------------------------
// Helper — tile centre to pixel
// ---------------------------------------------------------------------------
function tilePx(tx: number, ty: number) {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

// ---------------------------------------------------------------------------
// Starter creatures
// ---------------------------------------------------------------------------

function makeStarter(): Creature[] {
  const now = Date.now();
  return [
    {
      id: 'starter-feuillon-1',
      speciesId: 'feuillon',
      name: 'Feuillon',
      level: 1,
      happiness: 70,
      hunger: 0,
      isShiny: false,
      habitatId: null,
      state: isCreatureActive('diurnal') ? 'active' : 'sleeping',
      position: tilePx(4, 4),
      targetPosition: tilePx(4, 4),
      lastProducedAt: now,
      scheduleType: 'diurnal',
      nextMoveAt: now,
      lastWokenAt: 0,
      sleepInterrupts: 0,
      lastAffectedAt: 0,
      wildExpiresAt: null,
    },
    {
      id: 'starter-broutard-1',
      speciesId: 'broutard',
      name: 'Broutard',
      level: 1,
      happiness: 65,
      hunger: 0,
      isShiny: false,
      habitatId: null,
      state: isCreatureActive('diurnal') ? 'active' : 'sleeping',
      position: tilePx(9, 7),
      targetPosition: tilePx(9, 7),
      lastProducedAt: now,
      scheduleType: 'diurnal',
      nextMoveAt: now + 1500, // stagger starts
      lastWokenAt: 0,
      sleepInterrupts: 0,
      lastAffectedAt: 0,
      wildExpiresAt: null,
    },
    {
      id: 'starter-flottin-1',
      speciesId: 'flottin',
      name: 'Flottin',
      level: 1,
      happiness: 75,
      hunger: 0,
      isShiny: false,
      habitatId: null,
      state: isCreatureActive('diurnal') ? 'active' : 'sleeping',
      position: tilePx(14, 4),
      targetPosition: tilePx(14, 4),
      lastProducedAt: now,
      scheduleType: 'diurnal',
      nextMoveAt: now + 3000,
      lastWokenAt: 0,
      sleepInterrupts: 0,
      lastAffectedAt: 0,
      wildExpiresAt: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCreatureStore = create<CreatureState2 & CreatureActions>(
  (set, get) => ({
    creatures: makeStarter(),
    maxCreatures: 10,

    addCreature: (c) =>
      set((s) => ({ creatures: [...s.creatures, c] })),

    removeCreature: (id) =>
      set((s) => ({ creatures: s.creatures.filter((c) => c.id !== id) })),

    updateCreature: (id, updates) =>
      set((s) => ({
        creatures: s.creatures.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
      })),

    wakeCreature: (id) => {
      const now = Date.now();
      set((s) => ({
        creatures: s.creatures.map((c) => {
          if (c.id !== id || c.state !== 'sleeping') return c;
          const happiness =
            now - c.lastWokenAt < 10_000
              ? Math.max(0, c.happiness - 3) // penalty for tapping again < 10s
              : c.happiness;
          return {
            ...c,
            state: 'stumbling' as CreatureState,
            lastWokenAt: now,
            happiness,
            sleepInterrupts: c.sleepInterrupts + 1,
            nextMoveAt: now + 12_000, // stumble for ~12s then re-evaluate
          };
        }),
      }));
    },

    affectCreature: (id) => {
      const now = Date.now();
      set((s) => ({
        creatures: s.creatures.map((c) => {
          if (c.id !== id || c.state !== 'active') return c;
          // +5 happiness, max 1 per hour
          // (simplification: always apply for Phase 2)
          return {
            ...c,
            happiness: Math.min(100, c.happiness + 5),
            lastAffectedAt: now,
          };
        }),
      }));
    },

    setCreatures: (cs) => set({ creatures: cs }),

    increaseMaxCreatures: (amount) =>
      set((s) => ({ maxCreatures: s.maxCreatures + amount })),

    shiftPositions: (dx, dy) =>
      set((s) => ({
        creatures: s.creatures.map((c) => ({
          ...c,
          position:       { x: c.position.x + dx,       y: c.position.y + dy },
          targetPosition: { x: c.targetPosition.x + dx, y: c.targetPosition.y + dy },
        })),
      })),
  }),
);
