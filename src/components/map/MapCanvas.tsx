/**
 * MapCanvas — the core game view.
 *
 * Phase 2 additions:
 *   - Sky background (Animated.View, color interpolated by time period)
 *   - Creature layer (CreatureSprite components rendered inside Canvas)
 *   - Tap gesture → wake sleeping creature or show affection on active one
 *
 * Phase 3 additions:
 *   - Habitat layer (HabitatBuilding components rendered inside Canvas)
 *   - Habitat placement mode: tap places the selected habitat type
 *   - Creature → habitat assignment via long-press drag-and-drop
 *   - Habitat open/close door animation driven by day/night period
 *   - Plant layer (PlantSprite components) between terrain and habitats
 *   - Plant placement mode: tap places the selected plant type (no auto-deselect)
 *   - Plant tap: water if not mature, harvest if mature → adds to resourceStore
 *   - Building layer (WarehouseBuilding) above habitats
 *   - Building placement mode: tap places the selected building type
 *   - Warehouse tap: opens WarehousePanel resource inventory overlay
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Canvas, Rect } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useMapStore } from '../../store/mapStore';
import { useCreatureStore, Creature } from '../../store/creatureStore';
import { usePlantStore } from '../../store/plantStore';
import { useResourceStore } from '../../store/resourceStore';
import { useRavagerStore } from '../../store/ravagerStore';
import { HABITAT_MAP } from '../../constants/habitats';
import { BUILDING_MAP } from '../../constants/buildings';
import { SPECIES_MAP } from '../../constants/creatures';
import { PLANT_MAP, MANUAL_WATER_AMOUNT } from '../../constants/plants';
import { isCreatureCompatibleWithHabitat } from '../../engine/CreatureAI';
import {
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  MAP_WIDTH,
  MAP_HEIGHT,
} from '../../constants/terrain';
import { getSkyProgress } from '../../engine/TimeEngine';
import { useDayNight } from '../../hooks/useDayNight';
import { useEcosystemEngine } from '../../hooks/useEcosystemEngine';
import { useRavagerEngine } from '../../hooks/useRavagerEngine';
import TerrainTile from './TerrainTile';
import HabitatBuilding from './HabitatBuilding';
import PlantSprite from './PlantSprite';
import CreatureSprite from './CreatureSprite';
import RavagerSprite from './RavagerSprite';
import WarehouseBuilding from './WarehouseBuilding';
import WarehousePanel from '../ui/WarehousePanel';
import CaptureOverlay from '../ui/CaptureOverlay';
import RavagerAlert from '../ui/RavagerAlert';
import BattleResultModal from '../ui/BattleResultModal';
import DefensePanel from '../ui/DefensePanel';
import CarnivoreHungerPanel from '../ui/CarnivoreHungerPanel';
import TransformerPanel from '../ui/TransformerPanel';
import MiniMap from './MiniMap';
import { interpolateRavagerPos } from '../../engine/RavagerEngine';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Sky color key points: [dawn=0, day=1, dusk=2, night=3]
const SKY_COLORS = ['#FFD9B0', '#E8F5E0', '#7B4F8C', '#0D1B2A'];
const SKY_INPUT  = [0, 1, 2, 3];

// ---------------------------------------------------------------------------
// Worklet helpers
// ---------------------------------------------------------------------------

function clampTX(tx: number, sc: number): number {
  'worklet';
  const minX = SCREEN_W - MAP_WIDTH * sc;
  return Math.min(Math.max(tx, minX), 0);
}

function clampTY(ty: number, sc: number): number {
  'worklet';
  const minY = SCREEN_H - MAP_HEIGHT * sc;
  return Math.min(Math.max(ty, minY), 0);
}

// ---------------------------------------------------------------------------
// MapCanvas
// ---------------------------------------------------------------------------

export default function MapCanvas() {
  const terrainGrid       = useMapStore((s) => s.terrainGrid);
  const selectedTool      = useMapStore((s) => s.selectedTool);
  const selectedHabitat   = useMapStore((s) => s.selectedHabitat);
  const selectedBuilding  = useMapStore((s) => s.selectedBuilding);
  const unlockedCols      = useMapStore((s) => s.unlockedCols);
  const unlockedRows      = useMapStore((s) => s.unlockedRows);
  const paintTile         = useMapStore((s) => s.paintTile);
  const habitats          = useMapStore((s) => s.habitats);
  const buildings         = useMapStore((s) => s.buildings);
  const placeHabitat      = useMapStore((s) => s.placeHabitat);
  const placeBuilding     = useMapStore((s) => s.placeBuilding);
  const selectHabitat     = useMapStore((s) => s.selectHabitat);
  const selectBuilding    = useMapStore((s) => s.selectBuilding);
  const creatures         = useCreatureStore((s) => s.creatures);
  const ravagers          = useRavagerStore((s) => s.ravagers);
  const setFocusedRavager = useRavagerStore((s) => s.setFocusedRavager);
  const plants            = usePlantStore((s) => s.plants);
  const selectedPlantType = usePlantStore((s) => s.selectedPlantType);

  const [warehousePanelOpen, setWarehousePanelOpen]     = useState(false);
  const [transformerPanelOpen, setTransformerPanelOpen] = useState(false);
  const [captureTarget, setCaptureTarget]               = useState<Creature | null>(null);
  const [hungerTarget, setHungerTarget]                 = useState<Creature | null>(null);

  const period = useDayNight();

  // Wild creature spawn + departure engine
  useEcosystemEngine();
  // Ravager attack-wave engine
  useRavagerEngine();

  // ── Sky gradient ─────────────────────────────────────────────────────────
  const skyProgress = useSharedValue(getSkyProgress());

  useEffect(() => {
    skyProgress.value = withTiming(getSkyProgress(), { duration: 30_000 });
  }, [period]);

  const skyStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      skyProgress.value,
      SKY_INPUT,
      SKY_COLORS,
    ),
  }));

  // ── Habitat open/close progress ───────────────────────────────────────────
  // 1.0 = daytime habitats open / nocturnal habitats closed
  // 0.0 = daytime habitats closed / nocturnal habitats open
  // NightSanctuary inverts this inside HabitatBuilding.
  const habitatOpenProgress = useSharedValue(
    (period === 'dawn' || period === 'day') ? 1 : 0,
  );

  useEffect(() => {
    const target = (period === 'dawn' || period === 'day') ? 1 : 0;
    habitatOpenProgress.value = withTiming(target, { duration: 25_000 });
  }, [period]);

  // ── Camera shared values ─────────────────────────────────────────────────
  const translateX  = useSharedValue(0);
  const translateY  = useSharedValue(0);
  const scale       = useSharedValue(1.0);
  const savedTX     = useSharedValue(0);
  const savedTY     = useSharedValue(0);
  const savedScale  = useSharedValue(1.0);

  // Mode flags kept as SharedValues so gesture worklets can read them
  const isPaintMode    = useSharedValue(false);
  const isHabitatMode  = useSharedValue(false);
  const isPlantMode    = useSharedValue(false);
  const isBuildingMode = useSharedValue(false);
  const isDraggingMode = useSharedValue(false);

  useEffect(() => {
    isPaintMode.value   = selectedTool !== null;
    isHabitatMode.value = false;
    if (selectedTool !== null) { isPlantMode.value = false; isBuildingMode.value = false; }
  }, [selectedTool]);

  useEffect(() => {
    isHabitatMode.value = selectedHabitat !== null;
    isPaintMode.value   = false;
    if (selectedHabitat !== null) { isPlantMode.value = false; isBuildingMode.value = false; }
  }, [selectedHabitat]);

  useEffect(() => {
    isPlantMode.value = selectedPlantType !== null;
    if (selectedPlantType !== null) {
      isPaintMode.value    = false;
      isHabitatMode.value  = false;
      isBuildingMode.value = false;
    }
  }, [selectedPlantType]);

  useEffect(() => {
    isBuildingMode.value = selectedBuilding !== null;
    if (selectedBuilding !== null) {
      isPaintMode.value   = false;
      isHabitatMode.value = false;
      isPlantMode.value   = false;
    }
  }, [selectedBuilding]);

  const lastPaintedTile = useRef<{ x: number; y: number } | null>(null);

  // ── Drag state ────────────────────────────────────────────────────────────
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const draggingCreatureRef = useRef<Creature | null>(null);
  const [draggingChip, setDraggingChip] = useState<{
    name: string;
    primaryColor: string;
  } | null>(null);

  // ── Compatible habitat IDs for drag highlight ─────────────────────────────
  const compatibleHabitatIds = useMemo(() => {
    if (!draggingChip) return new Set<string>();
    const dragging = draggingCreatureRef.current;
    if (!dragging) return new Set<string>();
    return new Set(
      habitats
        .filter((h) => {
          if (!isCreatureCompatibleWithHabitat(dragging.speciesId, h.habitatTypeId)) return false;
          const def = HABITAT_MAP.get(h.habitatTypeId);
          if (!def) return false;
          const freeSlots =
            def.capacity - h.assignedCreatureIds.filter((id) => id !== dragging.id).length;
          return freeSlots > 0;
        })
        .map((h) => h.id),
    );
  }, [draggingChip, habitats]);

  // ── Drag chip animated style ──────────────────────────────────────────────
  const dragChipStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value - 40 },
      { translateY: dragY.value - 66 },
    ],
  }));

  // ── Paint helper ──────────────────────────────────────────────────────────
  const handlePaint = useCallback(
    (sx: number, sy: number) => {
      if (!selectedTool) return;
      const worldX = (sx - translateX.value) / scale.value;
      const worldY = (sy - translateY.value) / scale.value;
      const tileX  = Math.floor(worldX / TILE_SIZE);
      const tileY  = Math.floor(worldY / TILE_SIZE);
      if (tileX < 0 || tileX >= GRID_COLS || tileY < 0 || tileY >= GRID_ROWS) return;
      const last = lastPaintedTile.current;
      if (last && last.x === tileX && last.y === tileY) return;
      lastPaintedTile.current = { x: tileX, y: tileY };
      paintTile(tileX, tileY, selectedTool);
    },
    [selectedTool, paintTile, translateX, scale],
  );

  const resetPaintTracking = useCallback(() => {
    lastPaintedTile.current = null;
  }, []);

  // ── Habitat placement handler ─────────────────────────────────────────────
  const handleHabitatPlace = useCallback(
    (sx: number, sy: number) => {
      if (!selectedHabitat) return;
      const def = HABITAT_MAP.get(selectedHabitat);
      if (!def) return;

      const worldX = (sx - translateX.value) / scale.value;
      const worldY = (sy - translateY.value) / scale.value;

      const tapTileX = Math.floor(worldX / TILE_SIZE);
      const tapTileY = Math.floor(worldY / TILE_SIZE);
      const half     = Math.floor(def.tileSize / 2);
      const tileX    = Math.max(0, tapTileX - half);
      const tileY    = Math.max(0, tapTileY - half);

      placeHabitat({
        id: `habitat-${Date.now()}`,
        habitatTypeId: selectedHabitat,
        tileX,
        tileY,
        assignedCreatureIds: [],
      });

      selectHabitat(null);
    },
    [selectedHabitat, placeHabitat, selectHabitat, translateX, scale],
  );

  // ── Building placement handler ────────────────────────────────────────────
  const handleBuildingPlace = useCallback(
    (sx: number, sy: number) => {
      const { selectedBuilding: typeId } = useMapStore.getState();
      if (!typeId) return;
      const def = BUILDING_MAP.get(typeId);
      if (!def) return;

      const worldX = (sx - translateX.value) / scale.value;
      const worldY = (sy - translateY.value) / scale.value;
      const tapTileX = Math.floor(worldX / TILE_SIZE);
      const tapTileY = Math.floor(worldY / TILE_SIZE);
      const half     = Math.floor(def.tileSize / 2);
      const tileX    = Math.max(0, tapTileX - half);
      const tileY    = Math.max(0, tapTileY - half);

      placeBuilding({
        id: `building-${Date.now()}`,
        buildingTypeId: typeId,
        tileX,
        tileY,
      });
      selectBuilding(null);
    },
    [placeBuilding, selectBuilding, translateX, scale],
  );

  // ── Plant placement handler ───────────────────────────────────────────────
  const handlePlantPlace = useCallback(
    (sx: number, sy: number) => {
      const { selectedPlantType: typeId } = usePlantStore.getState();
      if (!typeId) return;
      const def = PLANT_MAP.get(typeId);
      if (!def) return;

      const worldX = (sx - translateX.value) / scale.value;
      const worldY = (sy - translateY.value) / scale.value;
      const tileX  = Math.floor(worldX / TILE_SIZE);
      const tileY  = Math.floor(worldY / TILE_SIZE);

      if (tileX < 0 || tileX >= GRID_COLS || tileY < 0 || tileY >= GRID_ROWS) return;

      // Terrain compatibility check
      if (def.requiredTerrain !== 'any') {
        const { terrainGrid: grid } = useMapStore.getState();
        const tileTerrain = grid[tileY]?.[tileX];
        if (tileTerrain !== def.requiredTerrain) return;
      }

      usePlantStore.getState().placePlant(tileX, tileY, typeId);
      // Do NOT auto-deselect — allow placing multiple plants in a row
    },
    [translateX, scale],
  );

  // ── Creature tap + plant water/harvest handler ───────────────────────────
  const handleTap = useCallback(
    (sx: number, sy: number) => {
      const worldX = (sx - translateX.value) / scale.value;
      const worldY = (sy - translateY.value) / scale.value;

      // Ravager tap — focus carnivore attacks on this ravager
      const { ravagers: rs } = useRavagerStore.getState();
      const RAVAGER_HIT_SQ = (TILE_SIZE * 0.7) ** 2;
      const now = Date.now();
      for (const r of rs) {
        if (r.state === 'done') continue;
        const rp = interpolateRavagerPos(r, now);
        const dx = rp.x - worldX;
        const dy = rp.y - worldY;
        if (dx * dx + dy * dy < RAVAGER_HIT_SQ) {
          setFocusedRavager(r.id);
          return;
        }
      }

      const { creatures: cs, wakeCreature, affectCreature } = useCreatureStore.getState();
      const HIT_SQ = (TILE_SIZE * 0.9) ** 2;

      for (const c of cs) {
        const dx = c.targetPosition.x - worldX;
        const dy = c.targetPosition.y - worldY;
        if (dx * dx + dy * dy < HIT_SQ) {
          // Wild (uncaptured) creature — open capture mini-game
          if (c.wildExpiresAt !== null && c.habitatId === null) {
            setCaptureTarget(c);
            return;
          }
          // Hungry carnivore — open feed panel
          if (SPECIES_MAP.get(c.speciesId)?.type === 'carnivore' && c.hunger > 0) {
            setHungerTarget(c);
            return;
          }
          if (c.state === 'sleeping' || c.state === 'stumbling') {
            wakeCreature(c.id);
          } else if (c.state === 'active') {
            affectCreature(c.id);
          }
          return;
        }
      }

      // Check plants — water or harvest
      const { plants: ps, waterPlant, harvestPlant } = usePlantStore.getState();
      const PLANT_HIT_SQ = (TILE_SIZE * 0.75) ** 2;
      for (const plant of ps) {
        const plantCX = (plant.tileX + 0.5) * TILE_SIZE;
        const plantCY = (plant.tileY + 0.5) * TILE_SIZE;
        const dx = plantCX - worldX;
        const dy = plantCY - worldY;
        if (dx * dx + dy * dy < PLANT_HIT_SQ) {
          if (plant.state === 'mature') {
            const result = harvestPlant(plant.id);
            if (result) {
              useResourceStore.getState().addResource(result.resourceId, result.resourceAmount);
            }
          } else {
            waterPlant(plant.id, MANUAL_WATER_AMOUNT);
          }
          return;
        }
      }

      // Check buildings — open warehouse panel
      const { buildings: bs } = useMapStore.getState();
      for (const b of bs) {
        const def = BUILDING_MAP.get(b.buildingTypeId);
        if (!def) continue;
        const bX = b.tileX * TILE_SIZE;
        const bY = b.tileY * TILE_SIZE;
        const bW = def.tileSize * TILE_SIZE;
        if (worldX >= bX && worldX <= bX + bW && worldY >= bY && worldY <= bY + bW) {
          if (b.buildingTypeId === 'warehouse') {
            setWarehousePanelOpen(true);
          } else if (b.buildingTypeId === 'transformer') {
            setTransformerPanelOpen(true);
          }
          return;
        }
      }
    },
    [translateX, scale, setFocusedRavager],
  );

  // ── Long-press: start creature drag ──────────────────────────────────────
  const handleLongPressCreature = useCallback(
    (sx: number, sy: number) => {
      if (isPaintMode.value || isHabitatMode.value) return;

      const worldX = (sx - translateX.value) / scale.value;
      const worldY = (sy - translateY.value) / scale.value;

      const { creatures: cs } = useCreatureStore.getState();
      const HIT_SQ = (TILE_SIZE * 1.1) ** 2;

      for (const c of cs) {
        const dx = c.targetPosition.x - worldX;
        const dy = c.targetPosition.y - worldY;
        if (dx * dx + dy * dy < HIT_SQ) {
          draggingCreatureRef.current = c;
          setDraggingChip({
            name: c.name,
            primaryColor: SPECIES_MAP.get(c.speciesId)?.primaryColor ?? '#888888',
          });
          dragX.value = sx;
          dragY.value = sy;
          isDraggingMode.value = true;
          return;
        }
      }
    },
    [translateX, scale, isPaintMode, isHabitatMode, dragX, dragY, isDraggingMode],
  );

  // ── Drag end: hit-test habitats and assign ────────────────────────────────
  const handleDragEnd = useCallback(
    (sx: number, sy: number) => {
      const creature = draggingCreatureRef.current;
      draggingCreatureRef.current = null;
      setDraggingChip(null);
      if (!creature) return;

      const worldX = (sx - translateX.value) / scale.value;
      const worldY = (sy - translateY.value) / scale.value;

      const {
        habitats: hs,
        assignCreatureToHabitat,
        unassignCreatureFromHabitat,
      } = useMapStore.getState();

      for (const h of hs) {
        const def = HABITAT_MAP.get(h.habitatTypeId);
        if (!def) continue;

        const hX = h.tileX * TILE_SIZE;
        const hY = h.tileY * TILE_SIZE;
        const hW = def.tileSize * TILE_SIZE;

        if (worldX >= hX && worldX <= hX + hW && worldY >= hY && worldY <= hY + hW) {
          if (!isCreatureCompatibleWithHabitat(creature.speciesId, h.habitatTypeId)) break;

          const alreadyIn    = h.assignedCreatureIds.includes(creature.id);
          const otherCount   = h.assignedCreatureIds.filter((id) => id !== creature.id).length;
          if (!alreadyIn && otherCount >= def.capacity) break;

          // Unassign from previous habitat if different
          if (creature.habitatId && creature.habitatId !== h.id) {
            unassignCreatureFromHabitat(creature.habitatId, creature.id);
          }
          if (!alreadyIn) {
            assignCreatureToHabitat(h.id, creature.id);
          }
          useCreatureStore.getState().updateCreature(creature.id, {
            habitatId: h.id,
            wildExpiresAt: null, // creature is now captured — won't depart
          });
          return;
        }
      }
      // Dropped outside any valid target — no change
    },
    [translateX, scale],
  );

  // ── Navigate-to (MiniMap) ────────────────────────────────────────────────
  const handleNavigate = useCallback(
    (newTX: number, newTY: number) => {
      const sc = scale.value;
      translateX.value = withTiming(clampTX(newTX, sc), { duration: 280 });
      translateY.value = withTiming(clampTY(newTY, sc), { duration: 280 });
    },
    [scale, translateX, translateY],
  );

  // ── Gestures ──────────────────────────────────────────────────────────────

  const tapGesture = Gesture.Tap()
    .maxDistance(12)
    .onEnd((e) => {
      'worklet';
      if (isHabitatMode.value) {
        runOnJS(handleHabitatPlace)(e.x, e.y);
      } else if (isPlantMode.value) {
        runOnJS(handlePlantPlace)(e.x, e.y);
      } else if (isBuildingMode.value) {
        runOnJS(handleBuildingPlace)(e.x, e.y);
      } else if (!isPaintMode.value) {
        runOnJS(handleTap)(e.x, e.y);
      }
    });

  const panGesture = Gesture.Pan()
    .minDistance(1)
    .onStart((e) => {
      'worklet';
      savedTX.value = translateX.value;
      savedTY.value = translateY.value;
      runOnJS(resetPaintTracking)();
      if (isPaintMode.value) {
        runOnJS(handlePaint)(e.x, e.y);
      }
    })
    .onUpdate((e) => {
      'worklet';
      if (isDraggingMode.value) {
        dragX.value = e.absoluteX;
        dragY.value = e.absoluteY;
      } else if (isPaintMode.value) {
        runOnJS(handlePaint)(e.x, e.y);
      } else {
        translateX.value = clampTX(savedTX.value + e.translationX, scale.value);
        translateY.value = clampTY(savedTY.value + e.translationY, scale.value);
      }
    })
    .onEnd((e) => {
      'worklet';
      if (isDraggingMode.value) {
        runOnJS(handleDragEnd)(e.absoluteX, e.absoluteY);
        isDraggingMode.value = false;
      } else {
        savedTX.value = translateX.value;
        savedTY.value = translateY.value;
      }
    });

  // Long-press identifies which creature to drag; pan (above) tracks movement
  const longPressGesture = Gesture.LongPress()
    .minDuration(450)
    .maxDistance(12)
    .onStart((e) => {
      'worklet';
      runOnJS(handleLongPressCreature)(e.x, e.y);
    })
    .onFinalize(() => {
      'worklet';
      // Ensure cleanup if the finger lifts before pan.onEnd fires
      if (isDraggingMode.value) {
        runOnJS(handleDragEnd)(dragX.value, dragY.value);
        isDraggingMode.value = false;
      }
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      savedScale.value = scale.value;
      savedTX.value    = translateX.value;
      savedTY.value    = translateY.value;
    })
    .onUpdate((e) => {
      'worklet';
      const newScale   = Math.min(Math.max(savedScale.value * e.scale, MIN_SCALE), MAX_SCALE);
      const worldFX    = (e.focalX - savedTX.value) / savedScale.value;
      const worldFY    = (e.focalY - savedTY.value) / savedScale.value;
      scale.value      = newScale;
      translateX.value = clampTX(e.focalX - worldFX * newScale, newScale);
      translateY.value = clampTY(e.focalY - worldFY * newScale, newScale);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      savedTX.value    = translateX.value;
      savedTY.value    = translateY.value;
    });

  const combinedGesture = Gesture.Simultaneous(
    Gesture.Exclusive(tapGesture, panGesture),
    longPressGesture,
    pinchGesture,
  );

  // ── Animated map transform ────────────────────────────────────────────────
  const mapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Sky — fills screen, animated background color */}
      <Animated.View style={[StyleSheet.absoluteFill, skyStyle]} pointerEvents="none" />

      {/* Map content + gestures */}
      <GestureDetector gesture={combinedGesture}>
        <View style={styles.gestureArea}>
          <Animated.View style={[styles.mapContainer, mapStyle]}>
            <Canvas style={styles.canvas}>
              {/* ── Terrain layer ── */}
              {terrainGrid.map((row, r) =>
                row.map((type, c) => (
                  <TerrainTile
                    key={`${c}-${r}`}
                    x={c * TILE_SIZE}
                    y={r * TILE_SIZE}
                    type={type}
                  />
                )),
              )}

              {/* ── Plant layer (above terrain, below habitats) ── */}
              {plants.map((plant) => (
                <PlantSprite
                  key={plant.id}
                  tileX={plant.tileX}
                  tileY={plant.tileY}
                  plantTypeId={plant.plantTypeId}
                  state={plant.state}
                  waterLevel={plant.waterLevel}
                />
              ))}

              {/* ── Habitat layer (above plants, below creatures) ── */}
              {habitats.map((h) => {
                const def = HABITAT_MAP.get(h.habitatTypeId);
                return (
                  <HabitatBuilding
                    key={h.id}
                    x={h.tileX * TILE_SIZE}
                    y={h.tileY * TILE_SIZE}
                    typeId={h.habitatTypeId}
                    openProgress={habitatOpenProgress}
                    occupancy={h.assignedCreatureIds.length}
                    capacity={def?.capacity ?? 0}
                    highlighted={compatibleHabitatIds.has(h.id)}
                  />
                );
              })}

              {/* ── Building layer (above habitats, below creatures) ── */}
              {buildings.map((b) => (
                <WarehouseBuilding
                  key={b.id}
                  x={b.tileX * TILE_SIZE}
                  y={b.tileY * TILE_SIZE}
                  isSelected={selectedBuilding === b.buildingTypeId}
                />
              ))}

              {/* ── Creature layer ── */}
              {creatures.map((creature) => (
                <CreatureSprite key={creature.id} creature={creature} />
              ))}

              {/* ── Ravager layer (above creatures) ── */}
              {ravagers.map((r) => (
                <RavagerSprite key={r.id} ravager={r} />
              ))}

              {/* ── Fog of war — locked (unpurchased) map area ── */}
              {unlockedCols < GRID_COLS && (
                <Rect
                  x={unlockedCols * TILE_SIZE}
                  y={0}
                  width={(GRID_COLS - unlockedCols) * TILE_SIZE}
                  height={MAP_HEIGHT}
                  color="rgba(0,0,0,0.55)"
                />
              )}
              {unlockedRows < GRID_ROWS && (
                <Rect
                  x={0}
                  y={unlockedRows * TILE_SIZE}
                  width={unlockedCols * TILE_SIZE}
                  height={(GRID_ROWS - unlockedRows) * TILE_SIZE}
                  color="rgba(0,0,0,0.55)"
                />
              )}
            </Canvas>
          </Animated.View>
        </View>
      </GestureDetector>

      {/* HUD overlays */}
      <MiniMap
        cameraX={translateX}
        cameraY={translateY}
        cameraScale={scale}
        screenWidth={SCREEN_W}
        screenHeight={SCREEN_H}
        onNavigate={handleNavigate}
      />

      {/* Drag chip — floating creature label that follows the finger */}
      {draggingChip && (
        <Animated.View
          style={[styles.dragChip, dragChipStyle, { backgroundColor: draggingChip.primaryColor }]}
          pointerEvents="none"
        >
          <Text style={styles.dragChipText}>{draggingChip.name}</Text>
        </Animated.View>
      )}

      {/* Warehouse resource panel */}
      <WarehousePanel
        visible={warehousePanelOpen}
        onClose={() => setWarehousePanelOpen(false)}
      />

      {/* Capture mini-game overlay */}
      {captureTarget && (
        <CaptureOverlay
          creature={captureTarget}
          onClose={() => setCaptureTarget(null)}
        />
      )}

      {/* Carnivore hunger feed panel */}
      {hungerTarget && (
        <CarnivoreHungerPanel
          creature={hungerTarget}
          onClose={() => setHungerTarget(null)}
        />
      )}

      {/* Transformer building panel */}
      {transformerPanelOpen && (
        <TransformerPanel
          onClose={() => setTransformerPanelOpen(false)}
        />
      )}

      {/* Defense activation panel — shown during active waves */}
      <DefensePanel />

      {/* Ravager incoming warning banner */}
      <RavagerAlert />

      {/* Post-wave battle result modal */}
      <BattleResultModal />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gestureArea: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    transformOrigin: 'top left',
  },
  canvas: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  },
  dragChip: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius: 4,
    elevation: 8,
  },
  dragChipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
