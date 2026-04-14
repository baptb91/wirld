/**
 * TerrainTile — renders a single 48×48 terrain tile using React Native Skia.
 * All coordinates are in canvas space (already multiplied by TILE_SIZE).
 *
 * IMPORTANT: This component must only return Skia elements (Rect, Circle, Path,
 * Group, Line, etc.) because it renders inside a <Canvas> component.
 */
import React, { memo } from 'react';
import { Group, Rect, Circle, Line, Path } from '@shopify/react-native-skia';
import { TerrainType, TILE_SIZE as S } from '../../constants/terrain';

interface Props {
  x: number;
  y: number;
  type: TerrainType;
}

// ---------------------------------------------------------------------------
// Per-terrain drawing helpers
// ---------------------------------------------------------------------------

function GrassTile({ x, y }: { x: number; y: number }) {
  return (
    <Group>
      {/* Base fill */}
      <Rect x={x} y={y} width={S} height={S} color="#7EC850" />
      {/* Subtle grid line */}
      <Rect x={x} y={y} width={S} height={S} color="rgba(0,0,0,0.04)" style="stroke" strokeWidth={0.5} />
      {/* Grass blades */}
      <Line p1={{ x: x + 7,  y: y + S     }} p2={{ x: x + 5,  y: y + S - 9  }} color="#5AA832" strokeWidth={1.5} />
      <Line p1={{ x: x + 14, y: y + S     }} p2={{ x: x + 16, y: y + S - 11 }} color="#5AA832" strokeWidth={1.5} />
      <Line p1={{ x: x + 26, y: y + S - 2 }} p2={{ x: x + 24, y: y + S - 10 }} color="#4E9A2A" strokeWidth={1.5} />
      <Line p1={{ x: x + 35, y: y + S     }} p2={{ x: x + 37, y: y + S - 9  }} color="#5AA832" strokeWidth={1.5} />
      <Line p1={{ x: x + 42, y: y + S - 2 }} p2={{ x: x + 40, y: y + S - 11 }} color="#4E9A2A" strokeWidth={1.5} />
      {/* Small highlight at top */}
      <Rect x={x} y={y} width={S} height={4} color="rgba(255,255,255,0.10)" />
    </Group>
  );
}

function WaterTile({ x, y }: { x: number; y: number }) {
  return (
    <Group>
      <Rect x={x} y={y} width={S} height={S} color="#4FA8D5" />
      <Rect x={x} y={y} width={S} height={S} color="rgba(0,0,0,0.04)" style="stroke" strokeWidth={0.5} />
      {/* Ripple arcs (simplified as horizontal lines) */}
      <Line p1={{ x: x + 6,  y: y + 16 }} p2={{ x: x + S - 6,  y: y + 16 }} color="rgba(255,255,255,0.35)" strokeWidth={1.5} />
      <Line p1={{ x: x + 10, y: y + 26 }} p2={{ x: x + S - 10, y: y + 26 }} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      <Line p1={{ x: x + 6,  y: y + 36 }} p2={{ x: x + S - 6,  y: y + 36 }} color="rgba(255,255,255,0.30)" strokeWidth={1.5} />
      {/* Surface glint */}
      <Circle cx={x + 12} cy={y + 10} r={2} color="rgba(255,255,255,0.55)" />
      <Circle cx={x + 30} cy={y + 14} r={1.5} color="rgba(255,255,255,0.40)" />
      <Rect x={x} y={y} width={S} height={3} color="rgba(255,255,255,0.15)" />
    </Group>
  );
}

function FlowersTile({ x, y }: { x: number; y: number }) {
  return (
    <Group>
      {/* Base: light green ground */}
      <Rect x={x} y={y} width={S} height={S} color="#90C97A" />
      <Rect x={x} y={y} width={S} height={S} color="rgba(0,0,0,0.04)" style="stroke" strokeWidth={0.5} />
      {/* Stems */}
      <Line p1={{ x: x + 10, y: y + S - 4 }} p2={{ x: x + 10, y: y + S - 14 }} color="#4E9A2A" strokeWidth={1} />
      <Line p1={{ x: x + 22, y: y + S - 4 }} p2={{ x: x + 22, y: y + S - 16 }} color="#4E9A2A" strokeWidth={1} />
      <Line p1={{ x: x + 34, y: y + S - 4 }} p2={{ x: x + 34, y: y + S - 14 }} color="#4E9A2A" strokeWidth={1} />
      <Line p1={{ x: x + 16, y: y + 14     }} p2={{ x: x + 16, y: y + 24     }} color="#4E9A2A" strokeWidth={1} />
      <Line p1={{ x: x + 30, y: y + 10     }} p2={{ x: x + 30, y: y + 22     }} color="#4E9A2A" strokeWidth={1} />
      {/* Flower heads */}
      <Circle cx={x + 10} cy={y + S - 16} r={4} color="#F472B6" />
      <Circle cx={x + 22} cy={y + S - 18} r={5} color="#FBBF24" />
      <Circle cx={x + 34} cy={y + S - 16} r={4} color="#C084FC" />
      <Circle cx={x + 16} cy={y + 12}     r={3.5} color="#F9A8D4" />
      <Circle cx={x + 30} cy={y + 8}      r={3}   color="#86EFAC" />
      {/* White centers */}
      <Circle cx={x + 10} cy={y + S - 16} r={1.5} color="rgba(255,255,255,0.7)" />
      <Circle cx={x + 22} cy={y + S - 18} r={2}   color="rgba(255,255,255,0.7)" />
      <Circle cx={x + 34} cy={y + S - 16} r={1.5} color="rgba(255,255,255,0.7)" />
      <Rect x={x} y={y} width={S} height={3} color="rgba(255,255,255,0.10)" />
    </Group>
  );
}

function ForestTile({ x, y }: { x: number; y: number }) {
  return (
    <Group>
      {/* Dark ground */}
      <Rect x={x} y={y} width={S} height={S} color="#2E6B2E" />
      <Rect x={x} y={y} width={S} height={S} color="rgba(0,0,0,0.06)" style="stroke" strokeWidth={0.5} />
      {/* Tree trunks */}
      <Rect x={x + 9}  y={y + 34} width={4} height={10} color="#5C3A1E" />
      <Rect x={x + 31} y={y + 34} width={4} height={10} color="#5C3A1E" />
      {/* Left tree canopy (triangle approximated with lines) */}
      <Line p1={{ x: x + 11, y: y + 34 }} p2={{ x: x + 2,  y: y + 20 }} color="#1A4D1A" strokeWidth={9} style="stroke" />
      <Line p1={{ x: x + 11, y: y + 34 }} p2={{ x: x + 20, y: y + 20 }} color="#1A4D1A" strokeWidth={9} style="stroke" />
      <Circle cx={x + 11} cy={y + 20} r={9}  color="#1D5E1D" />
      <Circle cx={x + 11} cy={y + 12} r={7}  color="#236B23" />
      {/* Right tree canopy */}
      <Line p1={{ x: x + 33, y: y + 34 }} p2={{ x: x + 24, y: y + 22 }} color="#1A4D1A" strokeWidth={8} style="stroke" />
      <Line p1={{ x: x + 33, y: y + 34 }} p2={{ x: x + 42, y: y + 22 }} color="#1A4D1A" strokeWidth={8} style="stroke" />
      <Circle cx={x + 33} cy={y + 22} r={8}  color="#1D5E1D" />
      <Circle cx={x + 33} cy={y + 14} r={6}  color="#236B23" />
      {/* Forest floor dapple */}
      <Circle cx={x + 22} cy={y + 40} r={3} color="rgba(255,255,255,0.06)" />
      <Rect x={x} y={y} width={S} height={3} color="rgba(255,255,255,0.06)" />
    </Group>
  );
}

function RockTile({ x, y }: { x: number; y: number }) {
  return (
    <Group>
      <Rect x={x} y={y} width={S} height={S} color="#8A8A7A" />
      <Rect x={x} y={y} width={S} height={S} color="rgba(0,0,0,0.05)" style="stroke" strokeWidth={0.5} />
      {/* Large boulder */}
      <Circle cx={x + 16} cy={y + 26} r={12} color="#72726A" />
      <Circle cx={x + 16} cy={y + 26} r={12} color="rgba(0,0,0,0.08)" style="stroke" strokeWidth={1} />
      {/* Crack lines */}
      <Line p1={{ x: x + 16, y: y + 16 }} p2={{ x: x + 12, y: y + 28 }} color="rgba(0,0,0,0.25)" strokeWidth={1} />
      <Line p1={{ x: x + 16, y: y + 16 }} p2={{ x: x + 22, y: y + 30 }} color="rgba(0,0,0,0.20)" strokeWidth={1} />
      {/* Small pebbles */}
      <Circle cx={x + 34} cy={y + 36} r={4} color="#6E6E60" />
      <Circle cx={x + 38} cy={y + 30} r={3} color="#7A7A6A" />
      <Circle cx={x + 36} cy={y + 16} r={2.5} color="#6E6E60" />
      {/* Highlight on boulder */}
      <Circle cx={x + 12} cy={y + 20} r={3} color="rgba(255,255,255,0.18)" />
      <Rect x={x} y={y} width={S} height={3} color="rgba(255,255,255,0.08)" />
    </Group>
  );
}

function SandTile({ x, y }: { x: number; y: number }) {
  return (
    <Group>
      <Rect x={x} y={y} width={S} height={S} color="#D4B896" />
      <Rect x={x} y={y} width={S} height={S} color="rgba(0,0,0,0.04)" style="stroke" strokeWidth={0.5} />
      {/* Dune contour arcs */}
      <Line p1={{ x: x + 4,  y: y + 20 }} p2={{ x: x + 22, y: y + 16 }} color="rgba(160,120,70,0.40)" strokeWidth={1.5} />
      <Line p1={{ x: x + 22, y: y + 16 }} p2={{ x: x + S - 4, y: y + 22 }} color="rgba(160,120,70,0.35)" strokeWidth={1.5} />
      <Line p1={{ x: x + 6,  y: y + 32 }} p2={{ x: x + 28, y: y + 28 }} color="rgba(160,120,70,0.30)" strokeWidth={1.5} />
      <Line p1={{ x: x + 28, y: y + 28 }} p2={{ x: x + S - 6, y: y + 34 }} color="rgba(160,120,70,0.28)" strokeWidth={1.5} />
      {/* Small pebble dots */}
      <Circle cx={x + 10} cy={y + 38} r={1.5} color="rgba(150,110,60,0.35)" />
      <Circle cx={x + 30} cy={y + 12} r={1}   color="rgba(150,110,60,0.30)" />
      <Circle cx={x + 40} cy={y + 40} r={1.5} color="rgba(150,110,60,0.35)" />
      {/* Bright highlight band */}
      <Rect x={x} y={y} width={S} height={6} color="rgba(255,255,220,0.20)" />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const TerrainTile = memo(function TerrainTile({ x, y, type }: Props) {
  switch (type) {
    case 'grass':   return <GrassTile   x={x} y={y} />;
    case 'water':   return <WaterTile   x={x} y={y} />;
    case 'flowers': return <FlowersTile x={x} y={y} />;
    case 'forest':  return <ForestTile  x={x} y={y} />;
    case 'rock':    return <RockTile    x={x} y={y} />;
    case 'sand':    return <SandTile    x={x} y={y} />;
    default:        return <GrassTile   x={x} y={y} />;
  }
});

export default TerrainTile;
