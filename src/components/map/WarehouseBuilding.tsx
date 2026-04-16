/**
 * WarehouseBuilding — Skia 2×2 tile (96×96 px) storage building.
 *
 * Visual: triangular roof → stone walls → sign plate → double wooden doors.
 * Yellow selection border when isSelected.
 */
import React, { memo, useMemo } from 'react';
import {
  Circle,
  Group,
  Line,
  Path,
  Rect,
  RoundedRect,
  Skia,
} from '@shopify/react-native-skia';
import { TILE_SIZE } from '../../constants/terrain';

const W = TILE_SIZE * 2; // 96
const H = TILE_SIZE * 2; // 96

interface WarehouseBuildingProps {
  x: number;
  y: number;
  isSelected?: boolean;
}

export default memo(function WarehouseBuilding({
  x,
  y,
  isSelected,
}: WarehouseBuildingProps) {
  const transform = useMemo(() => [{ translateX: x }, { translateY: y }], [x, y]);

  // Triangular roof outline (peak at top-center, eaves at y=28)
  const roofPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(W / 2, 3);
    p.lineTo(2, 28);
    p.lineTo(W - 2, 28);
    p.close();
    return p;
  }, []);

  return (
    <Group transform={transform}>
      {/* ── Ground shadow ── */}
      <Rect x={6} y={H - 6} width={W - 12} height={5} color="rgba(0,0,0,0.18)" />

      {/* ── Foundation ── */}
      <Rect x={0} y={H - 10} width={W} height={10} color="#4E4846" />

      {/* ── Stone walls ── */}
      <Rect x={2} y={28} width={W - 4} height={H - 38} color="#8F8A86" />

      {/* Stone mortar — horizontal courses */}
      <Line p1={{ x: 2,     y: 42 }} p2={{ x: W - 2, y: 42 }} color="rgba(0,0,0,0.12)" strokeWidth={1} />
      <Line p1={{ x: 2,     y: 56 }} p2={{ x: W - 2, y: 56 }} color="rgba(0,0,0,0.12)" strokeWidth={1} />
      {/* Stone mortar — vertical (offset per course) */}
      <Line p1={{ x: 24, y: 28 }} p2={{ x: 24, y: 42 }} color="rgba(0,0,0,0.09)" strokeWidth={1} />
      <Line p1={{ x: 48, y: 28 }} p2={{ x: 48, y: 42 }} color="rgba(0,0,0,0.09)" strokeWidth={1} />
      <Line p1={{ x: 72, y: 28 }} p2={{ x: 72, y: 42 }} color="rgba(0,0,0,0.09)" strokeWidth={1} />
      <Line p1={{ x: 12, y: 42 }} p2={{ x: 12, y: 56 }} color="rgba(0,0,0,0.09)" strokeWidth={1} />
      <Line p1={{ x: 36, y: 42 }} p2={{ x: 36, y: 56 }} color="rgba(0,0,0,0.09)" strokeWidth={1} />
      <Line p1={{ x: 60, y: 42 }} p2={{ x: 60, y: 56 }} color="rgba(0,0,0,0.09)" strokeWidth={1} />
      <Line p1={{ x: 84, y: 42 }} p2={{ x: 84, y: 56 }} color="rgba(0,0,0,0.09)" strokeWidth={1} />

      {/* ── Sign plate ── */}
      <RoundedRect x={20} y={32} width={56} height={16} r={4} color="#C8920A" />
      <RoundedRect x={22} y={34} width={52} height={12} r={3} color="#F0C030" />
      {/* "W" glyph */}
      <Line p1={{ x: 31, y: 37 }} p2={{ x: 33, y: 43 }} color="#5A3A00" strokeWidth={1.5} />
      <Line p1={{ x: 33, y: 43 }} p2={{ x: 35, y: 39 }} color="#5A3A00" strokeWidth={1.5} />
      <Line p1={{ x: 35, y: 39 }} p2={{ x: 37, y: 43 }} color="#5A3A00" strokeWidth={1.5} />
      <Line p1={{ x: 37, y: 43 }} p2={{ x: 39, y: 37 }} color="#5A3A00" strokeWidth={1.5} />
      {/* "H" glyph */}
      <Line p1={{ x: 43, y: 37 }} p2={{ x: 43, y: 43 }} color="#5A3A00" strokeWidth={1.5} />
      <Line p1={{ x: 43, y: 40 }} p2={{ x: 47, y: 40 }} color="#5A3A00" strokeWidth={1.5} />
      <Line p1={{ x: 47, y: 37 }} p2={{ x: 47, y: 43 }} color="#5A3A00" strokeWidth={1.5} />
      {/* Barrel dots (decorative) */}
      <Circle cx={58} cy={39} r={2} color="rgba(90,58,0,0.55)" />
      <Circle cx={63} cy={39} r={2} color="rgba(90,58,0,0.45)" />

      {/* ── Double wooden doors ── */}
      {/* Door frame header */}
      <Rect x={12} y={58} width={72} height={4}  color="#3E2808" />
      {/* Left door leaf */}
      <Rect x={14} y={62} width={32} height={26} color="#7A5C2A" />
      {/* Right door leaf */}
      <Rect x={50} y={62} width={32} height={26} color="#6A4C1A" />
      {/* Door plank lines */}
      <Line p1={{ x: 14, y: 72 }} p2={{ x: 46, y: 72 }} color="rgba(0,0,0,0.18)" strokeWidth={1} />
      <Line p1={{ x: 14, y: 80 }} p2={{ x: 46, y: 80 }} color="rgba(0,0,0,0.18)" strokeWidth={1} />
      <Line p1={{ x: 50, y: 72 }} p2={{ x: 82, y: 72 }} color="rgba(0,0,0,0.18)" strokeWidth={1} />
      <Line p1={{ x: 50, y: 80 }} p2={{ x: 82, y: 80 }} color="rgba(0,0,0,0.18)" strokeWidth={1} />
      {/* Center divider */}
      <Line p1={{ x: 48, y: 58 }} p2={{ x: 48, y: 88 }} color="#3E2808" strokeWidth={2} />
      {/* Door handles */}
      <Circle cx={44} cy={75} r={2.5} color="#C8902A" />
      <Circle cx={52} cy={75} r={2.5} color="#C8902A" />

      {/* ── Roof ── (drawn last so it sits on top visually) */}
      <Path path={roofPath} color="#4A3728" />
      {/* Roof eave strip */}
      <Rect x={0} y={26} width={W} height={4} color="#2E1A0E" />
      {/* Ridge highlight */}
      <Line
        p1={{ x: W / 2, y: 3 }}
        p2={{ x: W / 2, y: 26 }}
        color="rgba(255,220,160,0.18)"
        strokeWidth={2}
      />

      {/* ── Selection border ── */}
      {isSelected && (
        <Rect
          x={1} y={1} width={W - 2} height={H - 2}
          color="#FFD700"
          style="stroke"
          strokeWidth={2}
        />
      )}
    </Group>
  );
});
