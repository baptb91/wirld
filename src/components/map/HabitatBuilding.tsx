/**
 * HabitatBuilding — Skia-drawn habitat structures for all 8 types.
 *
 * Each body function draws in LOCAL space: (0,0) = top-left of footprint.
 * The outer Group applies the world-space (x, y) translation.
 *
 * Footprint sizes:
 *   2×2 tiles = 96 × 96 px  (woodBurrow, leafNest, coveredPool, predatorDen,
 *                              rockCave, nightSanctuary, rarePalace)
 *   3×3 tiles = 144 × 144 px (communalCamp)
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
import { HABITAT_MAP } from '../../constants/habitats';

// ---------------------------------------------------------------------------
// Selection highlight
// ---------------------------------------------------------------------------

function SelectionBorder({ w, h }: { w: number; h: number }) {
  return (
    <Rect
      x={1} y={1}
      width={w - 2} height={h - 2}
      color="rgba(253,224,71,0.90)"
      style="stroke"
      strokeWidth={3}
    />
  );
}

// ---------------------------------------------------------------------------
// 1. Wood Burrow — grass · herbivore · cap 2
// ---------------------------------------------------------------------------

function WoodBurrow() {
  return (
    <Group>
      {/* Broad grass mound (background) */}
      <Circle cx={48} cy={70} r={46} color="#7EC850" />
      {/* Chimney body — drawn before grass tufts so they sit in front */}
      <RoundedRect x={60} y={26} width={10} height={28} r={3} color="#8B5E3C" />
      {/* Earth underbelly */}
      <RoundedRect x={6} y={58} width={84} height={38} r={18} color="#A07040" />
      {/* Wooden frame — posts */}
      <RoundedRect x={27} y={48} width={7} height={24} r={3} color="#6B4423" />
      <RoundedRect x={62} y={48} width={7} height={24} r={3} color="#6B4423" />
      {/* Lintel */}
      <RoundedRect x={23} y={44} width={50} height={9} r={4} color="#5C3A1E" />
      <RoundedRect x={25} y={46} width={36} height={3} r={2} color="rgba(255,255,255,0.18)" />
      {/* Dark entrance hole */}
      <Circle cx={48} cy={68} r={19} color="#1A0A00" />
      {/* Warm interior glow */}
      <Circle cx={48} cy={72} r={13} color="rgba(255,150,40,0.28)" />
      {/* Grass tufts on mound */}
      <Circle cx={24} cy={42} r={8}  color="#5AA832" />
      <Circle cx={48} cy={34} r={9}  color="#5AA832" />
      <Circle cx={72} cy={42} r={8}  color="#5AA832" />
      {/* Mound highlight */}
      <Circle cx={34} cy={40} r={6}  color="rgba(255,255,255,0.14)" />
      {/* Chimney cap */}
      <RoundedRect x={57} y={21} width={16} height={6} r={3} color="#5C3A1E" />
      {/* Smoke wisps */}
      <Circle cx={65} cy={16} r={4}  color="rgba(200,200,200,0.55)" />
      <Circle cx={68} cy={10} r={3}  color="rgba(200,200,200,0.38)" />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// 2. Leaf Nest — forest · herbivore · cap 3
// ---------------------------------------------------------------------------

function LeafNest() {
  return (
    <Group>
      {/* Tree trunk */}
      <RoundedRect x={40} y={62} width={16} height={34} r={4} color="#5C3A1E" />
      {/* Branch stubs left/right */}
      <RoundedRect x={18} y={52} width={30} height={8} r={4} color="#6B4423" />
      <RoundedRect x={48} y={52} width={30} height={8} r={4} color="#6B4423" />
      {/* Back foliage layer */}
      <Circle cx={28} cy={40} r={19} color="#1D5E1D" />
      <Circle cx={68} cy={40} r={19} color="#1D5E1D" />
      <Circle cx={48} cy={24} r={18} color="#236B23" />
      {/* Front foliage */}
      <Circle cx={36} cy={36} r={15} color="#2E6B2E" />
      <Circle cx={60} cy={36} r={15} color="#2E6B2E" />
      <Circle cx={48} cy={30} r={14} color="#3A7A3A" />
      {/* Nest bowl rim */}
      <RoundedRect x={22} y={50} width={52} height={16} r={8} color="#6B4423" />
      {/* Nest hollow */}
      <Circle cx={48} cy={56} r={16} color="#2A1000" />
      {/* Warm glow inside nest */}
      <Circle cx={48} cy={59} r={11} color="rgba(255,180,80,0.22)" />
      {/* Leaf detail at rim */}
      <Circle cx={26} cy={54} r={5} color="#2E6B2E" />
      <Circle cx={70} cy={54} r={5} color="#2E6B2E" />
      {/* Foliage highlight */}
      <Circle cx={40} cy={22} r={4} color="rgba(255,255,255,0.12)" />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// 3. Covered Pool — water · aquatic · cap 2
// ---------------------------------------------------------------------------

function CoveredPool() {
  const roofPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(10, 40);
    p.quadTo(48, 22, 86, 40);
    p.lineTo(86, 46);
    p.quadTo(48, 30, 10, 46);
    p.close();
    return p;
  }, []);

  return (
    <Group>
      {/* Wooden support posts */}
      <RoundedRect x={14} y={36} width={8} height={44} r={3} color="#92400E" />
      <RoundedRect x={74} y={36} width={8} height={44} r={3} color="#92400E" />
      {/* Water pool */}
      <RoundedRect x={10} y={52} width={76} height={40} r={14} color="#38BDF8" />
      {/* Water shimmer lines */}
      <Line p1={{ x: 16, y: 62 }} p2={{ x: 80, y: 62 }} color="rgba(255,255,255,0.38)" strokeWidth={1.5} />
      <Line p1={{ x: 20, y: 72 }} p2={{ x: 76, y: 72 }} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      <Line p1={{ x: 16, y: 82 }} p2={{ x: 80, y: 82 }} color="rgba(255,255,255,0.20)" strokeWidth={1.5} />
      {/* Surface glints */}
      <Circle cx={28} cy={58} r={2}   color="rgba(255,255,255,0.60)" />
      <Circle cx={68} cy={66} r={1.5} color="rgba(255,255,255,0.50)" />
      {/* Lily pads */}
      <Circle cx={30} cy={78} r={8} color="#16A34A" />
      <Circle cx={64} cy={76} r={6} color="#15803D" />
      {/* Lily flowers */}
      <Circle cx={30} cy={78} r={3}   color="#FBBF24" />
      <Circle cx={64} cy={76} r={2.5} color="#FDE68A" />
      {/* Curved arch roof */}
      <Path path={roofPath} color="#A16207" />
      {/* Roof highlight */}
      <Line p1={{ x: 22, y: 36 }} p2={{ x: 74, y: 36 }} color="rgba(255,255,255,0.20)" strokeWidth={2} />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// 4. Predator's Den — any · carnivore · cap 2
// ---------------------------------------------------------------------------

function PredatorDen() {
  return (
    <Group>
      {/* Rocky cave mound */}
      <RoundedRect x={4} y={36} width={88} height={56} r={20} color="#4B5563" />
      {/* Mound highlight */}
      <Circle cx={30} cy={44} r={9} color="rgba(255,255,255,0.08)" />
      {/* Cave entrance */}
      <RoundedRect x={20} y={44} width={56} height={48} r={16} color="#111827" />
      {/* Red inner glow */}
      <Circle cx={48} cy={72} r={24} color="rgba(220,38,38,0.18)" />
      {/* Glowing eyes */}
      <Circle cx={38} cy={64} r={5}   color="rgba(220,38,38,0.85)" />
      <Circle cx={58} cy={64} r={5}   color="rgba(220,38,38,0.85)" />
      <Circle cx={38} cy={64} r={2.5} color="rgba(255,120,120,0.90)" />
      <Circle cx={58} cy={64} r={2.5} color="rgba(255,120,120,0.90)" />
      {/* Crossbones — diagonal 1 (lighter) */}
      <Line p1={{ x: 24, y: 26 }} p2={{ x: 72, y: 44 }} color="#E5E7EB" strokeWidth={5} />
      <Circle cx={24} cy={26} r={6} color="#E5E7EB" />
      <Circle cx={72} cy={44} r={6} color="#E5E7EB" />
      {/* Crossbones — diagonal 2 */}
      <Line p1={{ x: 72, y: 26 }} p2={{ x: 24, y: 44 }} color="#D1D5DB" strokeWidth={5} />
      <Circle cx={72} cy={26} r={6} color="#D1D5DB" />
      <Circle cx={24} cy={44} r={6} color="#D1D5DB" />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// 5. Rock Cave — rock · herbivore+carnivore · cap 3
// ---------------------------------------------------------------------------

function RockCave() {
  const stalactite1 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(36, 50); p.lineTo(32, 62); p.lineTo(40, 62); p.close();
    return p;
  }, []);
  const stalactite2 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(48, 48); p.lineTo(44, 62); p.lineTo(52, 62); p.close();
    return p;
  }, []);
  const stalactite3 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(60, 50); p.lineTo(56, 62); p.lineTo(64, 62); p.close();
    return p;
  }, []);

  return (
    <Group>
      {/* Back rock boulders */}
      <Circle cx={24} cy={46} r={26} color="#374151" />
      <Circle cx={72} cy={46} r={26} color="#374151" />
      {/* Arch rock */}
      <Circle cx={48} cy={34} r={22} color="#4B5563" />
      {/* Center fill */}
      <Circle cx={48} cy={52} r={16} color="#374151" />
      {/* Cave opening */}
      <RoundedRect x={22} y={52} width={52} height={44} r={8} color="#0F172A" />
      {/* Faint interior glow */}
      <Circle cx={48} cy={76} r={20} color="rgba(96,165,250,0.10)" />
      {/* Stalactites */}
      <Path path={stalactite1} color="#374151" />
      <Path path={stalactite2} color="#4B5563" />
      <Path path={stalactite3} color="#374151" />
      {/* Rock highlights */}
      <Circle cx={20} cy={32} r={5} color="rgba(255,255,255,0.12)" />
      <Circle cx={72} cy={30} r={4} color="rgba(255,255,255,0.10)" />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// 6. Night Sanctuary — any · nocturnal · cap 2
// ---------------------------------------------------------------------------

function NightSanctuary() {
  const roofPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(48, 8);
    p.lineTo(18, 36);
    p.lineTo(78, 36);
    p.close();
    return p;
  }, []);

  return (
    <Group>
      {/* Main tower body */}
      <RoundedRect x={22} y={34} width={52} height={62} r={6} color="#1E3A5F" />
      {/* Body highlight */}
      <RoundedRect x={24} y={36} width={20} height={8} r={3} color="rgba(37,99,235,0.25)" />
      {/* Roof */}
      <Path path={roofPath} color="#1E3A5F" />
      {/* Roof edge highlight */}
      <Line p1={{ x: 48, y: 10 }} p2={{ x: 20, y: 34 }} color="rgba(147,197,253,0.25)" strokeWidth={2} />
      {/* Crescent moon — gold circle with cutout */}
      <Circle cx={48} cy={22} r={9}  color="#FDE68A" />
      <Circle cx={52} cy={18} r={7}  color="#1E3A5F" />
      {/* Glowing entrance */}
      <RoundedRect x={34} y={62} width={28} height={34} r={8} color="rgba(109,40,217,0.55)" />
      <RoundedRect x={36} y={64} width={24} height={28} r={6} color="rgba(167,139,250,0.35)" />
      {/* Side windows */}
      <Circle cx={32} cy={52} r={5.5} color="rgba(167,139,250,0.55)" />
      <Circle cx={64} cy={52} r={5.5} color="rgba(167,139,250,0.55)" />
      {/* Star sparkles */}
      <Circle cx={18} cy={28} r={1.5} color="rgba(254,240,138,0.88)" />
      <Circle cx={78} cy={26} r={1.5} color="rgba(254,240,138,0.88)" />
      <Circle cx={12} cy={44} r={1}   color="rgba(254,240,138,0.70)" />
      <Circle cx={84} cy={42} r={1}   color="rgba(254,240,138,0.70)" />
      <Circle cx={22} cy={18} r={1}   color="rgba(254,240,138,0.60)" />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// 7. Rare Palace — any · epic+legendary · cap 1
// ---------------------------------------------------------------------------

function RarePalace() {
  const spirePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(48, 6);
    p.lineTo(38, 30);
    p.lineTo(58, 30);
    p.close();
    return p;
  }, []);

  return (
    <Group>
      {/* Palace body */}
      <RoundedRect x={12} y={28} width={72} height={68} r={8} color="#2D2040" />
      {/* Gold top trim */}
      <RoundedRect x={10} y={26} width={76} height={8} r={4} color="#D4A017" />
      {/* Side pillars */}
      <RoundedRect x={12} y={34} width={8} height={56} r={3} color="#92400E" />
      <RoundedRect x={76} y={34} width={8} height={56} r={3} color="#92400E" />
      {/* Pillar highlights */}
      <RoundedRect x={13} y={35} width={3} height={40} r={2} color="rgba(212,160,23,0.45)" />
      <RoundedRect x={79} y={35} width={3} height={40} r={2} color="rgba(212,160,23,0.45)" />
      {/* Gold spire */}
      <Path path={spirePath} color="#D4A017" />
      {/* Gem on facade */}
      <Circle cx={48} cy={48} r={14} color="rgba(109,40,217,0.65)" />
      <Circle cx={48} cy={48} r={10} color="rgba(139,92,246,0.55)" />
      <Circle cx={48} cy={48} r={5}  color="rgba(196,181,253,0.80)" />
      {/* Sparkles around gem */}
      <Circle cx={36} cy={38} r={2}   color="rgba(212,160,23,0.90)" />
      <Circle cx={60} cy={38} r={2}   color="rgba(212,160,23,0.90)" />
      <Circle cx={34} cy={58} r={1.5} color="rgba(212,160,23,0.80)" />
      <Circle cx={62} cy={58} r={1.5} color="rgba(212,160,23,0.80)" />
      {/* Doorway */}
      <RoundedRect x={36} y={68} width={24} height={28} r={6} color="rgba(109,40,217,0.40)" />
      {/* Gold door frame */}
      <RoundedRect x={34} y={66} width={28} height={30} r={7} color="#D4A017" style="stroke" strokeWidth={2} />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// 8. Communal Camp — any · all · cap 6 · 144×144 px (3×3 tiles)
// ---------------------------------------------------------------------------

function CommunalCamp() {
  const leftTent = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(22, 72);
    p.lineTo(4,  104);
    p.lineTo(40, 104);
    p.close();
    return p;
  }, []);
  const rightTent = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(122, 72);
    p.lineTo(104, 104);
    p.lineTo(140, 104);
    p.close();
    return p;
  }, []);
  const backTent = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(72, 56);
    p.lineTo(52, 82);
    p.lineTo(92, 82);
    p.close();
    return p;
  }, []);

  return (
    <Group>
      {/* Ground dirt patch */}
      <RoundedRect x={6} y={78} width={132} height={62} r={18} color="#92400E" />
      {/* Ground highlight */}
      <RoundedRect x={18} y={80} width={60} height={6} r={3} color="rgba(255,255,255,0.10)" />
      {/* Back tent */}
      <Path path={backTent} color="#D97706" />
      <Line p1={{ x: 72, y: 56 }} p2={{ x: 72, y: 82 }} color="rgba(255,255,255,0.20)" strokeWidth={1.5} />
      {/* Flag pole + flag on back tent */}
      <Line p1={{ x: 72, y: 42 }} p2={{ x: 72, y: 58 }} color="#5C3A1E" strokeWidth={2} />
      <Rect x={72} y={42} width={10} height={7} color="#EF4444" />
      {/* Left tent */}
      <Path path={leftTent} color="#B45309" />
      <Line p1={{ x: 22, y: 72 }} p2={{ x: 22, y: 104 }} color="rgba(255,255,255,0.18)" strokeWidth={1.5} />
      {/* Right tent */}
      <Path path={rightTent} color="#B45309" />
      <Line p1={{ x: 122, y: 72 }} p2={{ x: 122, y: 104 }} color="rgba(255,255,255,0.18)" strokeWidth={1.5} />
      {/* Campfire log ring */}
      <Circle cx={72} cy={96} r={14} color="#6B4423" />
      {/* Fire glow */}
      <Circle cx={72} cy={96} r={12} color="rgba(251,191,36,0.35)" />
      {/* Fire flames */}
      <Circle cx={72} cy={90} r={8} color="#F97316" />
      <Circle cx={72} cy={86} r={5} color="#FBBF24" />
      <Circle cx={72} cy={83} r={3} color="rgba(255,255,200,0.80)" />
      {/* Logs */}
      <RoundedRect x={62} y={100} width={20} height={5} r={2} color="#5C3A1E" />
      <RoundedRect x={60} y={104} width={24} height={4} r={2} color="#4A2A00" />
      {/* Sitting stones */}
      <Circle cx={54} cy={112} r={5} color="#6B7280" />
      <Circle cx={90} cy={112} r={5} color="#6B7280" />
      <Circle cx={72} cy={118} r={4} color="#6B7280" />
      {/* Banner strings tent-to-tent */}
      <Line p1={{ x: 22, y: 72 }} p2={{ x: 72, y: 58 }} color="rgba(180,83,9,0.50)" strokeWidth={1} />
      <Line p1={{ x: 122, y: 72 }} p2={{ x: 72, y: 58 }} color="rgba(180,83,9,0.50)" strokeWidth={1} />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface HabitatBuildingProps {
  x: number;        // canvas pixel — left edge of footprint
  y: number;        // canvas pixel — top edge of footprint
  typeId: string;
  isSelected?: boolean;
}

const HabitatBuilding = memo(function HabitatBuilding({
  x,
  y,
  typeId,
  isSelected = false,
}: HabitatBuildingProps) {
  const def = HABITAT_MAP.get(typeId);
  const tileSize = def?.tileSize ?? 2;
  const W = tileSize * TILE_SIZE;

  const transform = useMemo(
    () => [{ translateX: x }, { translateY: y }],
    [x, y],
  );

  let body: React.ReactElement;
  switch (typeId) {
    case 'woodBurrow':     body = <WoodBurrow />;     break;
    case 'leafNest':       body = <LeafNest />;       break;
    case 'coveredPool':    body = <CoveredPool />;    break;
    case 'predatorDen':    body = <PredatorDen />;    break;
    case 'rockCave':       body = <RockCave />;       break;
    case 'nightSanctuary': body = <NightSanctuary />; break;
    case 'rarePalace':     body = <RarePalace />;     break;
    case 'communalCamp':   body = <CommunalCamp />;   break;
    default:               body = <WoodBurrow />;     break;
  }

  return (
    <Group transform={transform}>
      {body}
      {isSelected && <SelectionBorder w={W} h={W} />}
    </Group>
  );
});

export default HabitatBuilding;
