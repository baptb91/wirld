/**
 * MapCanvas — the core game screen.
 *
 * Rendering: React Native Skia Canvas inside an Animated.View.
 * Camera: Reanimated shared values (translateX, translateY, scale).
 * Gestures: react-native-gesture-handler Pan + Pinch via GestureDetector.
 *
 * Modes:
 *   navigate (selectedTool === null): single-finger pans, two-finger pinch-zooms.
 *   paint    (selectedTool !== null): single-finger paints tiles, pinch still zooms.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useMapStore } from '../../store/mapStore';
import {
  TILE_SIZE,
  GRID_COLS,
  GRID_ROWS,
  MAP_WIDTH,
  MAP_HEIGHT,
} from '../../constants/terrain';
import TerrainTile from './TerrainTile';
import MiniMap from './MiniMap';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SCALE = 0.4;
const MAX_SCALE = 3.0;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Camera clamping helpers (runs on UI thread — keep as plain functions used
// in worklets, no cross-thread calls inside)
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
  const terrainGrid  = useMapStore((s) => s.terrainGrid);
  const selectedTool = useMapStore((s) => s.selectedTool);
  const paintTile    = useMapStore((s) => s.paintTile);

  // ── Camera shared values ─────────────────────────────────────────────────
  const translateX   = useSharedValue(0);
  const translateY   = useSharedValue(0);
  const scale        = useSharedValue(1.0);

  // Saved values captured at gesture start for delta-based updates
  const savedTX      = useSharedValue(0);
  const savedTY      = useSharedValue(0);
  const savedScale   = useSharedValue(1.0);

  // Synced from Zustand to Reanimated (so gesture worklets can check mode)
  const isPaintMode  = useSharedValue(false);
  useEffect(() => {
    isPaintMode.value = selectedTool !== null;
  }, [selectedTool]);

  // Ref to throttle paint: skip if same tile as last paint
  const lastPaintedTile = useRef<{ x: number; y: number } | null>(null);

  // ── Paint helper (runs on JS thread via runOnJS) ──────────────────────────
  const handlePaint = useCallback(
    (sx: number, sy: number) => {
      if (!selectedTool) return;
      const worldX = (sx - translateX.value) / scale.value;
      const worldY = (sy - translateY.value) / scale.value;
      const tileX  = Math.floor(worldX / TILE_SIZE);
      const tileY  = Math.floor(worldY / TILE_SIZE);
      if (tileX < 0 || tileX >= GRID_COLS || tileY < 0 || tileY >= GRID_ROWS) return;
      const last = lastPaintedTile.current;
      if (last && last.x === tileX && last.y === tileY) return; // same tile, skip
      lastPaintedTile.current = { x: tileX, y: tileY };
      paintTile(tileX, tileY, selectedTool);
    },
    [selectedTool, paintTile, translateX, scale],
  );

  // Reset paint tracking at gesture start (called via runOnJS from worklet)
  const resetPaintTracking = useCallback(() => {
    lastPaintedTile.current = null;
  }, []);

  // ── Navigate-to (from MiniMap tap) ────────────────────────────────────────
  const handleNavigate = useCallback(
    (newTX: number, newTY: number) => {
      const sc = scale.value;
      translateX.value = withTiming(clampTX(newTX, sc), { duration: 280 });
      translateY.value = withTiming(clampTY(newTY, sc), { duration: 280 });
    },
    [scale, translateX, translateY],
  );

  // ── Gestures ──────────────────────────────────────────────────────────────

  const panGesture = Gesture.Pan()
    .minDistance(1)
    .onStart((e) => {
      'worklet';
      savedTX.value = translateX.value;
      savedTY.value = translateY.value;
      runOnJS(resetPaintTracking)(); // must run on JS — refs are not accessible in worklets
      if (isPaintMode.value) {
        runOnJS(handlePaint)(e.x, e.y);
      }
    })
    .onUpdate((e) => {
      'worklet';
      if (isPaintMode.value) {
        runOnJS(handlePaint)(e.x, e.y);
      } else {
        const newTX = savedTX.value + e.translationX;
        const newTY = savedTY.value + e.translationY;
        translateX.value = clampTX(newTX, scale.value);
        translateY.value = clampTY(newTY, scale.value);
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
      const newScale = Math.min(Math.max(savedScale.value * e.scale, MIN_SCALE), MAX_SCALE);

      // Focal-point zoom: keep the world point under the pinch centre fixed
      const worldFX = (e.focalX - savedTX.value) / savedScale.value;
      const worldFY = (e.focalY - savedTY.value) / savedScale.value;
      const newTX   = e.focalX - worldFX * newScale;
      const newTY   = e.focalY - worldFY * newScale;

      scale.value      = newScale;
      translateX.value = clampTX(newTX, newScale);
      translateY.value = clampTY(newTY, newScale);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      savedTX.value    = translateX.value;
      savedTY.value    = translateY.value;
    });

  // Allow pan and pinch simultaneously (e.g. pan with two fingers while zooming)
  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // ── Animated style for the map container ─────────────────────────────────
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
      {/* Gesture-enabled full-screen area */}
      <GestureDetector gesture={combinedGesture}>
        <View style={styles.gestureArea}>
          <Animated.View style={[styles.mapContainer, mapStyle]}>
            <Canvas style={styles.canvas}>
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
            </Canvas>
          </Animated.View>
        </View>
      </GestureDetector>

      {/* HUD overlays — rendered after GestureDetector so they capture taps first */}
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
    backgroundColor: '#E8F5E0', // daytime sky default; Phase 2 animates this
  },
  gestureArea: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  mapContainer: {
    // Anchor transform to top-left of the View
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
