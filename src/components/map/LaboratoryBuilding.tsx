/**
 * LaboratoryBuilding — Skia 3×3 tile (144×144 px) hybrid breeding facility.
 *
 * Visual: stone tower body · arched windows · domed roof · glowing central
 * reactor portal. When gestating, the portal glows brighter and pulses.
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
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TILE_SIZE } from '../../constants/terrain';

const W = TILE_SIZE * 3; // 144
const H = TILE_SIZE * 3; // 144

interface Props {
  x: number;
  y: number;
  isSelected?: boolean;
  /** True while a hybrid gestation is in progress */
  gestating?: boolean;
}

export default memo(function LaboratoryBuilding({ x, y, isSelected = false, gestating = false }: Props) {
  const transform = useMemo(() => [{ translateX: x }, { translateY: y }], [x, y]);

  // Dome roof arc path
  const domePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(24, 48);
    p.quadTo(W / 2, 6, W - 24, 48);
    p.lineTo(W - 24, 52);
    p.quadTo(W / 2, 12, 24, 52);
    p.close();
    return p;
  }, []);

  // Portal glow pulse when gestating
  const pulse = useSharedValue(0.6);
  useEffect(() => {
    if (gestating) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.0, { duration: 800 }),
          withTiming(0.55, { duration: 800 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0.6, { duration: 300 });
    }
  }, [gestating]);

  const portalOpacity = useDerivedValue(() => pulse.value);

  // Derive a transform for the pulsing glow ring
  const glowTransform = useDerivedValue(() => [
    { translateX: W / 2 },
    { translateY: 76 },
    { scale: 0.85 + pulse.value * 0.18 },
    { translateX: -(W / 2) },
    { translateY: -76 },
  ]);

  return (
    <Group transform={transform}>
      {/* ── Shadow ── */}
      <Rect x={8} y={H - 6} width={W - 16} height={6} color="rgba(0,0,0,0.20)" />

      {/* ── Stone foundation ── */}
      <RoundedRect x={10} y={H - 14} width={W - 20} height={14} r={4} color="#374151" />

      {/* ── Main tower body ── */}
      <RoundedRect x={16} y={46} width={W - 32} height={H - 60} r={6} color="#4B5563" />

      {/* Stone mortar lines */}
      <Line p1={{ x: 16, y: 70 }} p2={{ x: W - 16, y: 70 }} color="rgba(0,0,0,0.14)" strokeWidth={1} />
      <Line p1={{ x: 16, y: 94 }} p2={{ x: W - 16, y: 94 }} color="rgba(0,0,0,0.14)" strokeWidth={1} />
      <Line p1={{ x: 16, y: 118 }} p2={{ x: W - 16, y: 118 }} color="rgba(0,0,0,0.14)" strokeWidth={1} />
      <Line p1={{ x: 44, y: 46 }} p2={{ x: 44, y: 70 }} color="rgba(0,0,0,0.10)" strokeWidth={1} />
      <Line p1={{ x: 72, y: 46 }} p2={{ x: 72, y: 70 }} color="rgba(0,0,0,0.10)" strokeWidth={1} />
      <Line p1={{ x: 100, y: 46 }} p2={{ x: 100, y: 70 }} color="rgba(0,0,0,0.10)" strokeWidth={1} />

      {/* ── Side wings ── */}
      <RoundedRect x={4}      y={62} width={18} height={H - 76} r={4} color="#374151" />
      <RoundedRect x={W - 22} y={62} width={18} height={H - 76} r={4} color="#374151" />

      {/* Wing windows */}
      <RoundedRect x={8}      y={72} width={10} height={14} r={3} color="rgba(109,40,217,0.50)" />
      <RoundedRect x={W - 18} y={72} width={10} height={14} r={3} color="rgba(109,40,217,0.50)" />

      {/* ── Arched main windows ── */}
      <RoundedRect x={28} y={56} width={20} height={28} r={9} color="rgba(14,116,144,0.65)" />
      <RoundedRect x={W - 48} y={56} width={20} height={28} r={9} color="rgba(14,116,144,0.65)" />
      {/* Window sheen */}
      <Line p1={{ x: 32, y: 58 }} p2={{ x: 36, y: 62 }} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      <Line p1={{ x: W - 44, y: 58 }} p2={{ x: W - 40, y: 62 }} color="rgba(255,255,255,0.25)" strokeWidth={1.5} />

      {/* ── Central portal ring (outer) ── */}
      <Group transform={glowTransform}>
        <Circle cx={W / 2} cy={76} r={28} color="rgba(139,92,246,0.22)" />
      </Group>
      <Circle cx={W / 2} cy={76} r={22} color="rgba(30,10,60,0.90)" />
      <Circle cx={W / 2} cy={76} r={20} color="rgba(109,40,217,0.80)" />
      <Circle cx={W / 2} cy={76} r={16} color="rgba(139,92,246,0.70)" />
      <Circle cx={W / 2} cy={76} r={10} color="rgba(196,181,253,0.90)" />
      <Circle cx={W / 2} cy={76} r={5}  color="rgba(255,255,255,0.95)" />
      {/* Portal cross sparkles */}
      <Line p1={{ x: W/2, y: 60 }} p2={{ x: W/2, y: 92 }} color="rgba(196,181,253,0.55)" strokeWidth={1} />
      <Line p1={{ x: W/2 - 16, y: 76 }} p2={{ x: W/2 + 16, y: 76 }} color="rgba(196,181,253,0.55)" strokeWidth={1} />

      {/* ── Dome roof ── */}
      <Path path={domePath} color="#1E3A5F" />
      {/* Dome sheen */}
      <Line p1={{ x: W/2 - 14, y: 22 }} p2={{ x: W/2 - 6, y: 36 }} color="rgba(147,197,253,0.22)" strokeWidth={2} />

      {/* ── Dome cap ── */}
      <Circle cx={W / 2} cy={14} r={9}  color="#1E3A5F" />
      <Circle cx={W / 2} cy={8}  r={5}  color="#D4A017" />
      <Circle cx={W / 2} cy={6}  r={2}  color="rgba(255,255,200,0.90)" />

      {/* ── Lightning rod ── */}
      <Line p1={{ x: W - 30, y: 44 }} p2={{ x: W - 30, y: 32 }} color="#9CA3AF" strokeWidth={2} />
      <Circle cx={W - 30} cy={30} r={3} color="#FDE68A" />

      {/* ── Entrance door ── */}
      <RoundedRect x={56} y={H - 34} width={32} height={34} r={7} color="#111827" />
      <RoundedRect x={58} y={H - 32} width={28} height={30} r={6} color="rgba(109,40,217,0.35)" />

      {/* Gestating indicator: star sparkles around portal */}
      {gestating && (
        <Group>
          <Circle cx={W/2 - 26} cy={60} r={2.5} color="rgba(196,181,253,0.88)" />
          <Circle cx={W/2 + 26} cy={60} r={2.5} color="rgba(196,181,253,0.88)" />
          <Circle cx={W/2 - 26} cy={92} r={2.5} color="rgba(196,181,253,0.88)" />
          <Circle cx={W/2 + 26} cy={92} r={2.5} color="rgba(196,181,253,0.88)" />
        </Group>
      )}

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
