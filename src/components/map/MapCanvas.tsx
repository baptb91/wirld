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
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useMapStore } from '../../store/mapStore';
import { useCreatureStore } from '../../store/creatureStore';
import { HABITAT_MAP } from '../../constants/habitats';
import {
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  MAP_WIDTH,
  MAP_HEIGHT,
} from '../../constants/terrain';
import { getSkyProgress } from '../../engine/TimeEngine';
import { useDayNight } from '../../hooks/useDayNight';
import TerrainTile from './TerrainTile';
import HabitatBuilding from './HabitatBuilding';
import CreatureSprite from './CreatureSprite';
import MiniMap from './MiniMap';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SCALE = 0.4;
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
  const terrainGrid      = useMapStore((s) => s.terrainGrid);
  const selectedTool     = useMapStore((s) => s.selectedTool);
  const selectedHabitat  = useMapStore((s) => s.selectedHabitat);
  const paintTile        = useMapStore((s) => s.paintTile);
  const habitats         = useMapStore((s) => s.habitats);
  const placeHabitat     = useMapStore((s) => s.placeHabitat);
  const selectHabitat    = useMapStore((s) => s.selectHabitat);
  const creatures        = useCreatureStore((s) => s.creatures);

  const period = useDayNight();

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

  useEffect(() => {
    isPaintMode.value   = selectedTool !== null;
    isHabitatMode.value = false;
  }, [selectedTool]);

  useEffect(() => {
    isHabitatMode.value = selectedHabitat !== null;
    isPaintMode.value   = false;
  }, [selectedHabitat]);

  const lastPaintedTile = useRef<{ x: number; y: number } | null>(null);

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

      // Center the footprint on the tapped tile
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

      // Deselect tool after single placement
      selectHabitat(null);
    },
    [selectedHabitat, placeHabitat, selectHabitat, translateX, scale],
  );

  // ── Creature tap handler ──────────────────────────────────────────────────
  const handleTap = useCallback(
    (sx: number, sy: number) => {
      const worldX = (sx - translateX.value) / scale.value;
      const worldY = (sy - translateY.value) / scale.value;

      const { creatures: cs, wakeCreature, affectCreature } = useCreatureStore.getState();
      const HIT_SQ = (TILE_SIZE * 0.9) ** 2;

      for (const c of cs) {
        const dx = c.targetPosition.x - worldX;
        const dy = c.targetPosition.y - worldY;
        if (dx * dx + dy * dy < HIT_SQ) {
          if (c.state === 'sleeping' || c.state === 'stumbling') {
            wakeCreature(c.id);
          } else if (c.state === 'active') {
            affectCreature(c.id);
          }
          return;
        }
      }
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
      if (isPaintMode.value) {
        runOnJS(handlePaint)(e.x, e.y);
      } else {
        translateX.value = clampTX(savedTX.value + e.translationX, scale.value);
        translateY.value = clampTY(savedTY.value + e.translationY, scale.value);
      }
    })
    .onEnd(() => {
      'worklet';
      savedTX.value = translateX.value;
      savedTY.value = translateY.value;
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

              {/* ── Habitat layer (above terrain, below creatures) ── */}
              {habitats.map((h) => (
                <HabitatBuilding
                  key={h.id}
                  x={h.tileX * TILE_SIZE}
                  y={h.tileY * TILE_SIZE}
                  typeId={h.habitatTypeId}
                />
              ))}

              {/* ── Creature layer ── */}
              {creatures.map((creature) => (
                <CreatureSprite key={creature.id} creature={creature} />
              ))}
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
});
