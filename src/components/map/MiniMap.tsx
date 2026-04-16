/**
 * MiniMap — 120×120 persistent overlay (top-right corner).
 * Shows terrain colors + animated viewport rectangle.
 * Tap anywhere → jump camera to that location.
 */
import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  GestureResponderEvent,
} from 'react-native';
import { Canvas, Rect } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { useMapStore } from '../../store/mapStore';
import { TERRAIN_CONFIG } from '../../constants/terrain';
import { MAP_WIDTH, GRID_COLS } from '../../constants/terrain';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MINI_SIZE  = 120;
const MINI_TILE  = MINI_SIZE / GRID_COLS; // 6 px per tile for a 20×20 grid
const MINI_SCALE = MINI_SIZE / MAP_WIDTH;  // 0.125

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MiniMapProps {
  cameraX: SharedValue<number>;
  cameraY: SharedValue<number>;
  cameraScale: SharedValue<number>;
  screenWidth: number;
  screenHeight: number;
  onNavigate: (newTX: number, newTY: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MiniMap({
  cameraX,
  cameraY,
  cameraScale,
  screenWidth,
  screenHeight,
  onNavigate,
}: MiniMapProps) {
  const terrainGrid = useMapStore((s) => s.terrainGrid);
  const [visible, setVisible] = useState(true);

  // Viewport indicator dimensions — updated by Reanimated on the UI thread
  const vpX = useDerivedValue(() => {
    const x = (-cameraX.value / cameraScale.value) * MINI_SCALE;
    return Math.max(0, x);
  });
  const vpY = useDerivedValue(() => {
    const y = (-cameraY.value / cameraScale.value) * MINI_SCALE;
    return Math.max(0, y);
  });
  const vpW = useDerivedValue(() => {
    const w = (screenWidth / cameraScale.value) * MINI_SCALE;
    return Math.min(w, MINI_SIZE);
  });
  const vpH = useDerivedValue(() => {
    const h = (screenHeight / cameraScale.value) * MINI_SCALE;
    return Math.min(h, MINI_SIZE);
  });

  const handleTap = useCallback(
    (e: GestureResponderEvent) => {
      const mx = e.nativeEvent.locationX;
      const my = e.nativeEvent.locationY;
      // Convert minimap tap → world position → camera translate
      const mapX = mx / MINI_SCALE;
      const mapY = my / MINI_SCALE;
      const sc   = cameraScale.value;
      const newTX = screenWidth  / 2 - mapX * sc;
      const newTY = screenHeight / 2 - mapY * sc;
      onNavigate(newTX, newTY);
    },
    [cameraScale, screenWidth, screenHeight, onNavigate],
  );

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {visible && (
        <TouchableOpacity
          onPress={handleTap}
          activeOpacity={0.85}
          style={styles.mapContainer}
        >
          <Canvas style={styles.canvas}>
            {/* Terrain tiles */}
            {terrainGrid.map((row, r) =>
              row.map((type, c) => (
                <Rect
                  key={`m-${c}-${r}`}
                  x={c * MINI_TILE}
                  y={r * MINI_TILE}
                  width={MINI_TILE}
                  height={MINI_TILE}
                  color={TERRAIN_CONFIG[type].color}
                />
              )),
            )}
            {/* Viewport indicator */}
            <Rect
              x={vpX}
              y={vpY}
              width={vpW}
              height={vpH}
              color="rgba(255,255,255,0.25)"
            />
            <Rect
              x={vpX}
              y={vpY}
              width={vpW}
              height={vpH}
              color="rgba(255,255,255,0.9)"
              style="stroke"
              strokeWidth={1.5}
            />
            {/* Outer border */}
            <Rect
              x={0}
              y={0}
              width={MINI_SIZE}
              height={MINI_SIZE}
              color="rgba(42,31,14,0.55)"
              style="stroke"
              strokeWidth={2}
            />
          </Canvas>
        </TouchableOpacity>
      )}
      {/* Toggle button */}
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => setVisible((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.toggleBtnInner} />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 56,
    right: 12,
    alignItems: 'flex-end',
  },
  mapContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  canvas: {
    width: MINI_SIZE,
    height: MINI_SIZE,
  },
  toggleBtn: {
    marginTop: 6,
    width: 22,
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(245,240,232,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleBtnInner: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#8A7A60',
  },
});
