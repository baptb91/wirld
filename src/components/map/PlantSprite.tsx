/**
 * PlantSprite — Skia-drawn plant tiles for all 6 plant types × 4 growth states.
 *
 * All drawings use LOCAL space: (0,0) = top-left of the 1×1 tile (48×48 px).
 * The outer Group applies the world-space (tileX * TILE_SIZE, tileY * TILE_SIZE)
 * translation.
 *
 * Growth states per plant:
 *   seed     → tiny mound / spore / crystal speck
 *   sprout   → small emerging plant
 *   growing  → developing plant
 *   mature   → full plant with harvest glow
 *
 * Shared overlays rendered by PlantSprite:
 *   - Blue water-level progress bar at the bottom (hidden when mature)
 *   - Pulsing gold harvest glow when mature
 */
import React, { memo, useEffect, useMemo } from 'react';
import {
  Circle,
  Group,
  Line,
  Path,
  Rect,
  RoundedRect,
  Skia,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { GrowthState, PLANT_MAP } from '../../constants/plants';
import { TILE_SIZE } from '../../constants/terrain';

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/** Thin blue progress bar at the tile bottom showing water accumulation. */
function WaterBar({ waterLevel, waterPerStage }: { waterLevel: number; waterPerStage: number }) {
  const progress = Math.min(1, waterLevel / waterPerStage);
  if (progress <= 0) return null;
  return (
    <Group>
      <Rect x={3} y={44} width={42} height={3} color="rgba(56,189,248,0.18)" />
      <Rect x={3} y={44} width={42 * progress} height={3} color="#38BDF8" />
    </Group>
  );
}

/** Pulsing golden aura shown on mature (harvestable) plants. */
function HarvestGlow() {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 0 }),
        withTiming(0.80, { duration: 800, easing: Easing.out(Easing.quad) }),
        withTiming(0.35, { duration: 800, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(opacity);
  }, []);

  return (
    <Group opacity={opacity}>
      <Circle cx={24} cy={22} r={20} color="rgba(253,224,71,0.28)" />
      <Circle cx={24} cy={8}  r={4}  color="rgba(253,224,71,0.90)" />
      <Circle cx={16} cy={12} r={2.5} color="rgba(253,224,71,0.75)" />
      <Circle cx={32} cy={12} r={2.5} color="rgba(253,224,71,0.75)" />
    </Group>
  );
}

/** Soil / earth base common to grass-grown plants. */
function SoilBase({ wide = false }: { wide?: boolean }) {
  if (wide) {
    return <RoundedRect x={4} y={37} width={40} height={10} r={5} color="#8B6914" />;
  }
  return <RoundedRect x={12} y={38} width={24} height={9} r={4.5} color="#8B6914" />;
}

// ---------------------------------------------------------------------------
// 1. Berry Bush — any terrain
// ---------------------------------------------------------------------------

function BerryBush({ state }: { state: GrowthState }) {
  switch (state) {
    case 'seed':
      return (
        <>
          <Circle cx={24} cy={40} r={7}  color="#8B6914" />
          <Circle cx={24} cy={33} r={3}  color="#5AA832" />
        </>
      );
    case 'sprout':
      return (
        <>
          <SoilBase />
          <Line p1={{ x: 24, y: 38 }} p2={{ x: 24, y: 24 }} color="#3A7A3A" strokeWidth={2} />
          <Circle cx={18} cy={26} r={5}  color="#4A9A4A" />
          <Circle cx={30} cy={28} r={5}  color="#3A7A3A" />
        </>
      );
    case 'growing':
      return (
        <>
          <SoilBase />
          <Line p1={{ x: 24, y: 37 }} p2={{ x: 24, y: 18 }} color="#2E6B2E" strokeWidth={2.5} />
          <Circle cx={18} cy={22} r={8}  color="#2E6B2E" />
          <Circle cx={30} cy={20} r={7}  color="#2E6B2E" />
          <Circle cx={24} cy={15} r={8}  color="#3A7A3A" />
          <Circle cx={18} cy={14} r={3}  color="#DC2626" />
          <Circle cx={30} cy={13} r={3}  color="#DC2626" />
        </>
      );
    case 'mature':
      return (
        <>
          <SoilBase wide />
          <Circle cx={16} cy={26} r={12} color="#1D5E1D" />
          <Circle cx={32} cy={26} r={12} color="#1D5E1D" />
          <Circle cx={24} cy={17} r={12} color="#2E6B2E" />
          <Circle cx={24} cy={28} r={11} color="#2E6B2E" />
          {/* Berries */}
          <Circle cx={14} cy={24} r={2.5} color="#DC2626" />
          <Circle cx={21} cy={19} r={2.5} color="#EF4444" />
          <Circle cx={29} cy={17} r={2.5} color="#DC2626" />
          <Circle cx={34} cy={22} r={2.5} color="#EF4444" />
          <Circle cx={22} cy={29} r={2.5} color="#DC2626" />
          <Circle cx={32} cy={29} r={2.5} color="#EF4444" />
        </>
      );
  }
}

// ---------------------------------------------------------------------------
// 2. Sunbloom — any terrain
// ---------------------------------------------------------------------------

function Sunbloom({ state }: { state: GrowthState }) {
  switch (state) {
    case 'seed':
      return (
        <>
          <Circle cx={24} cy={40} r={7}  color="#8B6914" />
          <Circle cx={24} cy={33} r={2.5} color="#FCD34D" />
        </>
      );
    case 'sprout':
      return (
        <>
          <SoilBase />
          <Line p1={{ x: 24, y: 38 }} p2={{ x: 24, y: 24 }} color="#4A7A3A" strokeWidth={2} />
          <Circle cx={24} cy={21} r={4}  color="#FDE68A" />
        </>
      );
    case 'growing':
      return (
        <>
          <SoilBase />
          <Line p1={{ x: 24, y: 37 }} p2={{ x: 24, y: 16 }} color="#3A6B2A" strokeWidth={3} />
          <RoundedRect x={12} y={26} width={9} height={5} r={2.5} color="#3A7A3A" />
          <RoundedRect x={27} y={28} width={9} height={5} r={2.5} color="#3A7A3A" />
          <Circle cx={24} cy={13} r={7} color="#F97316" />
          <Circle cx={24} cy={13} r={4} color="#FCD34D" />
        </>
      );
    case 'mature':
      return (
        <>
          <SoilBase wide />
          <Line p1={{ x: 24, y: 36 }} p2={{ x: 24, y: 24 }} color="#2D5A1E" strokeWidth={3} />
          <RoundedRect x={10} y={26} width={10} height={6} r={3} color="#2E6B2E" />
          <RoundedRect x={28} y={27} width={10} height={6} r={3} color="#2E6B2E" />
          {/* 8 petals placed in a ring (r=10 from center 24,14) */}
          <Circle cx={34} cy={14} r={5.5} color="#FBBF24" />  {/* 0° */}
          <Circle cx={31} cy={21} r={5.5} color="#FBBF24" />  {/* 45° */}
          <Circle cx={24} cy={24} r={5.5} color="#FBBF24" />  {/* 90° */}
          <Circle cx={17} cy={21} r={5.5} color="#FBBF24" />  {/* 135° */}
          <Circle cx={14} cy={14} r={5.5} color="#FBBF24" />  {/* 180° */}
          <Circle cx={17} cy={7}  r={5.5} color="#FBBF24" />  {/* 225° */}
          <Circle cx={24} cy={4}  r={5.5} color="#FBBF24" />  {/* 270° */}
          <Circle cx={31} cy={7}  r={5.5} color="#FBBF24" />  {/* 315° */}
          {/* Center disk */}
          <Circle cx={24} cy={14} r={7}   color="#78350F" />
          <Circle cx={24} cy={14} r={4}   color="#92400E" />
          <Circle cx={22} cy={12} r={1.5} color="rgba(255,255,255,0.25)" />
        </>
      );
  }
}

// ---------------------------------------------------------------------------
// 3. Fern Frond — forest terrain
// ---------------------------------------------------------------------------

function FernFrond({ state }: { state: GrowthState }) {
  const frondLeft = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(24, 36); p.quadTo(8, 24, 5, 12); return p;
  }, []);
  const frondRight = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(24, 36); p.quadTo(40, 24, 43, 12); return p;
  }, []);
  const frondCenter = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(24, 36); p.quadTo(22, 20, 24, 8); return p;
  }, []);
  const frondSmallL = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(24, 36); p.quadTo(12, 28, 8, 20); return p;
  }, []);

  switch (state) {
    case 'seed':
      return (
        <>
          <Circle cx={24} cy={40} r={7} color="#6B4A14" />
          <Circle cx={24} cy={33} r={2} color="#3A7A3A" />
        </>
      );
    case 'sprout':
      return (
        <>
          <SoilBase />
          <Path path={frondSmallL} color="#3A7A3A" style="stroke" strokeWidth={2.5} strokeCap="round" />
        </>
      );
    case 'growing':
      return (
        <>
          <SoilBase />
          <Path path={frondLeft}  color="#2E6B2E" style="stroke" strokeWidth={3} strokeCap="round" />
          <Path path={frondRight} color="#2E6B2E" style="stroke" strokeWidth={3} strokeCap="round" />
        </>
      );
    case 'mature':
      return (
        <>
          <SoilBase wide />
          <Path path={frondLeft}   color="#1D5E1D" style="stroke" strokeWidth={3.5} strokeCap="round" />
          <Path path={frondRight}  color="#1D5E1D" style="stroke" strokeWidth={3.5} strokeCap="round" />
          <Path path={frondCenter} color="#2E6B2E" style="stroke" strokeWidth={3.5} strokeCap="round" />
          <Path path={frondSmallL} color="#3A7A3A" style="stroke" strokeWidth={2.5} strokeCap="round" />
          {/* Leaf tips */}
          <Circle cx={5}  cy={12} r={3.5} color="#3A7A3A" />
          <Circle cx={43} cy={12} r={3.5} color="#3A7A3A" />
          <Circle cx={24} cy={8}  r={3.5} color="#4A9A4A" />
        </>
      );
  }
}

// ---------------------------------------------------------------------------
// 4. Moon Lily — water terrain
// ---------------------------------------------------------------------------

function MoonLily({ state }: { state: GrowthState }) {
  const padPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addOval({ x: 8, y: 30, width: 32, height: 12 });
    return p;
  }, []);
  const largePadPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addOval({ x: 4, y: 28, width: 40, height: 14 });
    return p;
  }, []);

  switch (state) {
    case 'seed':
      return (
        <>
          <RoundedRect x={4} y={36} width={40} height={10} r={5} color="#1E40AF" opacity={0.35} />
          <Circle cx={24} cy={36} r={3} color="rgba(224,242,254,0.70)" />
        </>
      );
    case 'sprout':
      return (
        <>
          <RoundedRect x={4} y={34} width={40} height={12} r={6} color="rgba(56,189,248,0.25)" />
          <Path path={padPath} color="#16A34A" />
          <Circle cx={24} cy={28} r={3.5} color="#FDE68A" />
        </>
      );
    case 'growing':
      return (
        <>
          <RoundedRect x={4} y={32} width={40} height={14} r={7} color="rgba(56,189,248,0.28)" />
          <Path path={padPath} color="#15803D" />
          <Circle cx={24} cy={26} r={5}   color="#F9A8D4" />
          <Circle cx={24} cy={24} r={3}   color="#FBBF24" />
          <Circle cx={20} cy={25} r={2}   color="#F472B6" />
          <Circle cx={28} cy={25} r={2}   color="#F472B6" />
        </>
      );
    case 'mature':
      return (
        <>
          <RoundedRect x={2} y={30} width={44} height={16} r={8} color="rgba(56,189,248,0.30)" />
          <Path path={largePadPath} color="#166534" />
          {/* Vein line on pad */}
          <Line p1={{ x: 24, y: 42 }} p2={{ x: 24, y: 28 }} color="rgba(21,128,61,0.55)" strokeWidth={1.5} />
          {/* White glowing flower */}
          <Circle cx={24} cy={22} r={9}  color="rgba(255,255,255,0.20)" />
          <Circle cx={24} cy={6}  r={5}  color="rgba(253,244,255,0.90)" />  {/* petal top */}
          <Circle cx={24} cy={38} r={5}  color="rgba(253,244,255,0.90)" />  {/* petal bottom — clipped by pad */}
          <Circle cx={15} cy={22} r={5}  color="rgba(253,244,255,0.90)" />  {/* petal left */}
          <Circle cx={33} cy={22} r={5}  color="rgba(253,244,255,0.90)" />  {/* petal right */}
          <Circle cx={18} cy={12} r={4}  color="rgba(253,244,255,0.85)" />  {/* petal NW */}
          <Circle cx={30} cy={12} r={4}  color="rgba(253,244,255,0.85)" />  {/* petal NE */}
          <Circle cx={24} cy={22} r={5}  color="#FBBF24" />
          <Circle cx={24} cy={22} r={2.5} color="rgba(255,255,255,0.90)" />
        </>
      );
  }
}

// ---------------------------------------------------------------------------
// 5. Rock Moss — rock terrain
// ---------------------------------------------------------------------------

function RockMoss({ state }: { state: GrowthState }) {
  const c1 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(24, 34); p.lineTo(19, 26); p.lineTo(29, 26); p.close(); return p;
  }, []);
  const c2 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(18, 34); p.lineTo(13, 24); p.lineTo(23, 24); p.close(); return p;
  }, []);
  const c3 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(30, 34); p.lineTo(25, 22); p.lineTo(35, 22); p.close(); return p;
  }, []);
  const c4 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(24, 34); p.lineTo(18, 16); p.lineTo(30, 16); p.close(); return p;
  }, []);
  const c5 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(14, 34); p.lineTo(8,  18); p.lineTo(20, 18); p.close(); return p;
  }, []);
  const c6 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(34, 34); p.lineTo(28, 14); p.lineTo(40, 14); p.close(); return p;
  }, []);

  switch (state) {
    case 'seed':
      return (
        <>
          <RoundedRect x={6} y={36} width={36} height={10} r={5} color="#6B7280" />
          <Circle cx={24} cy={34} r={2.5} color="#60A5FA" />
        </>
      );
    case 'sprout':
      return (
        <>
          <RoundedRect x={6} y={36} width={36} height={10} r={5} color="#6B7280" />
          <Path path={c1} color="#3B82F6" />
          <Path path={c2} color="#2563EB" />
        </>
      );
    case 'growing':
      return (
        <>
          <RoundedRect x={4} y={36} width={40} height={10} r={5} color="#6B7280" />
          <Path path={c2} color="#2563EB" />
          <Path path={c3} color="#3B82F6" />
          <Path path={c1} color="#1D4ED8" />
          <Path path={c4} color="#3B82F6" />
          <Path path={c5} color="#2563EB" />
        </>
      );
    case 'mature':
      return (
        <>
          <RoundedRect x={2} y={36} width={44} height={10} r={5} color="#6B7280" />
          {/* Glow aura */}
          <Circle cx={24} cy={22} r={18} color="rgba(96,165,250,0.15)" />
          <Path path={c5} color="#2563EB" />
          <Path path={c2} color="#1D4ED8" />
          <Path path={c3} color="#2563EB" />
          <Path path={c1} color="#3B82F6" />
          <Path path={c4} color="#60A5FA" />
          <Path path={c6} color="#93C5FD" />
          {/* Crystal tips glow */}
          <Circle cx={8}  cy={18} r={3} color="rgba(147,197,253,0.80)" />
          <Circle cx={34} cy={14} r={3} color="rgba(147,197,253,0.80)" />
          <Circle cx={24} cy={16} r={3} color="rgba(196,219,255,0.90)" />
        </>
      );
  }
}

// ---------------------------------------------------------------------------
// 6. Glowshroom — any terrain
// ---------------------------------------------------------------------------

function Glowshroom({ state }: { state: GrowthState }) {
  switch (state) {
    case 'seed':
      return (
        <>
          <Circle cx={24} cy={40} r={7}  color="#1C1C2E" />
          <Circle cx={24} cy={34} r={2}  color="rgba(124,58,237,0.70)" />
        </>
      );
    case 'sprout':
      return (
        <>
          <SoilBase />
          <RoundedRect x={22} y={30} width={4} height={8} r={2}  color="#4C1D95" />
          <Circle     cx={24} cy={28} r={5}                       color="#7C3AED" />
          <Circle     cx={24} cy={26} r={3}                       color="#8B5CF6" />
        </>
      );
    case 'growing':
      return (
        <>
          <SoilBase />
          <RoundedRect x={21} y={26} width={6} height={12} r={3} color="#3B0764" />
          {/* Mushroom cap */}
          <Circle cx={24} cy={22} r={10} color="#6D28D9" />
          <Circle cx={24} cy={20} r={7}  color="#7C3AED" />
          {/* Cap highlights */}
          <Circle cx={20} cy={18} r={2.5} color="rgba(167,139,250,0.55)" />
          <Circle cx={28} cy={17} r={2}   color="rgba(167,139,250,0.40)" />
          {/* Gills under cap */}
          <Line p1={{ x: 16, y: 26 }} p2={{ x: 24, y: 30 }} color="rgba(109,40,217,0.55)" strokeWidth={1} />
          <Line p1={{ x: 32, y: 26 }} p2={{ x: 24, y: 30 }} color="rgba(109,40,217,0.55)" strokeWidth={1} />
        </>
      );
    case 'mature':
      return (
        <>
          <SoilBase wide />
          {/* Spore ring on ground */}
          <Circle cx={24} cy={38} r={14} color="rgba(109,40,217,0.15)" />
          {/* Stem */}
          <RoundedRect x={20} y={24} width={8} height={14} r={4} color="#2E1065" />
          {/* Large glowing cap */}
          <Circle cx={24} cy={18} r={15} color="rgba(109,40,217,0.25)" />  {/* outer glow */}
          <Circle cx={24} cy={18} r={13} color="#5B21B6" />
          <Circle cx={24} cy={16} r={10} color="#7C3AED" />
          <Circle cx={24} cy={14} r={7}  color="#8B5CF6" />
          {/* Luminescent spots on cap */}
          <Circle cx={18} cy={14} r={2.5} color="rgba(196,181,253,0.90)" />
          <Circle cx={30} cy={13} r={2}   color="rgba(196,181,253,0.80)" />
          <Circle cx={24} cy={10} r={2}   color="rgba(216,180,254,0.95)" />
          <Circle cx={20} cy={20} r={1.5} color="rgba(196,181,253,0.70)" />
          {/* Gills */}
          <Line p1={{ x: 12, y: 24 }} p2={{ x: 20, y: 28 }} color="rgba(91,33,182,0.60)" strokeWidth={1.5} />
          <Line p1={{ x: 36, y: 24 }} p2={{ x: 28, y: 28 }} color="rgba(91,33,182,0.60)" strokeWidth={1.5} />
          <Line p1={{ x: 20, y: 24 }} p2={{ x: 22, y: 28 }} color="rgba(91,33,182,0.50)" strokeWidth={1} />
          <Line p1={{ x: 28, y: 24 }} p2={{ x: 26, y: 28 }} color="rgba(91,33,182,0.50)" strokeWidth={1} />
        </>
      );
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface PlantSpriteProps {
  tileX: number;
  tileY: number;
  plantTypeId: string;
  state: GrowthState;
  waterLevel: number;
}

const PlantSprite = memo(function PlantSprite({
  tileX,
  tileY,
  plantTypeId,
  state,
  waterLevel,
}: PlantSpriteProps) {
  const def = PLANT_MAP.get(plantTypeId);

  const transform = useMemo(
    () => [{ translateX: tileX * TILE_SIZE }, { translateY: tileY * TILE_SIZE }],
    [tileX, tileY],
  );

  let body: React.ReactElement;
  switch (plantTypeId) {
    case 'berryBush':  body = <BerryBush  state={state} />; break;
    case 'sunbloom':   body = <Sunbloom   state={state} />; break;
    case 'fernFrond':  body = <FernFrond  state={state} />; break;
    case 'moonLily':   body = <MoonLily   state={state} />; break;
    case 'rockMoss':   body = <RockMoss   state={state} />; break;
    case 'glowshroom': body = <Glowshroom state={state} />; break;
    default:           body = <BerryBush  state={state} />; break;
  }

  return (
    <Group transform={transform}>
      {body}
      {state === 'mature' && <HarvestGlow />}
      {state !== 'mature' && def && (
        <WaterBar waterLevel={waterLevel} waterPerStage={def.waterPerStage} />
      )}
    </Group>
  );
});

export default PlantSprite;
