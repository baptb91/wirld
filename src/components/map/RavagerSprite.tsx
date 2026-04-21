/**
 * RavagerSprite — Skia-drawn hostile entity.
 *
 * Animates in two phases driven by ravager.state:
 *   'moving'    → withTiming from spawnPx → targetPx over arrivalAt − now
 *   'retreating'→ withTiming from current pos → retreatPx over retreatAt − now
 *
 * Rendering follows the same Reanimated + Skia SharedValue pattern used by
 * CreatureSprite: useDerivedValue for transform array, Group for world-space
 * positioning.
 */
import React, { memo, useEffect } from 'react';
import { Circle, Group, Rect } from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Ravager } from '../../engine/RavagerEngine';

// ---------------------------------------------------------------------------
// Hostile body: blood-red round beast with orange flame eyes
// ---------------------------------------------------------------------------

function RavagerBody() {
  // Menacing pulsing aura
  const auraOp = useSharedValue(0.3);
  useEffect(() => {
    auraOp.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 600 }),
        withTiming(0.3,  { duration: 600 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(auraOp);
  }, []);

  return (
    <Group>
      {/* Pulsing danger aura */}
      <Circle cx={0} cy={0} r={20} color="rgba(200,0,0,0.35)" opacity={auraOp} />
      {/* Horn tips */}
      <Circle cx={-8} cy={-19} r={3.5} color="#7A0000" />
      <Circle cx={8}  cy={-19} r={3.5} color="#7A0000" />
      {/* Horn shafts */}
      <Circle cx={-7} cy={-15} r={2.5} color="#9B0000" />
      <Circle cx={7}  cy={-15} r={2.5} color="#9B0000" />
      {/* Main body */}
      <Circle cx={0}  cy={0}   r={14}  color="#CC1111" />
      {/* Belly shading */}
      <Circle cx={0}  cy={5}   r={8}   color="#AA0E0E" />
      {/* Brow ridge */}
      <Circle cx={-5} cy={-7}  r={4}   color="#990000" />
      <Circle cx={5}  cy={-7}  r={4}   color="#990000" />
      {/* Eyes — sclera */}
      <Circle cx={-5} cy={-4}  r={3.8} color="#FFF0D0" />
      <Circle cx={5}  cy={-4}  r={3.8} color="#FFF0D0" />
      {/* Irises */}
      <Circle cx={-5} cy={-4}  r={2.5} color="#FF6600" />
      <Circle cx={5}  cy={-4}  r={2.5} color="#FF6600" />
      {/* Pupils */}
      <Circle cx={-5} cy={-4}  r={1.2} color="#0D0000" />
      <Circle cx={5}  cy={-4}  r={1.2} color="#0D0000" />
      {/* Eye gleam */}
      <Circle cx={-4} cy={-5}  r={0.7} color="rgba(255,255,255,0.8)" />
      <Circle cx={6}  cy={-5}  r={0.7} color="rgba(255,255,255,0.8)" />
      {/* Mouth */}
      <Circle cx={0}  cy={6}   r={2.5} color="#6A0000" />
      <Circle cx={-3} cy={8}   r={1.2} color="#DDDDDD" />
      <Circle cx={3}  cy={8}   r={1.2} color="#DDDDDD" />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// RavagerSprite
// ---------------------------------------------------------------------------

interface Props {
  ravager: Ravager;
}

const RavagerSprite = memo(function RavagerSprite({ ravager }: Props) {
  const posX = useSharedValue(ravager.spawnPx.x);
  const posY = useSharedValue(ravager.spawnPx.y);

  useEffect(() => {
    cancelAnimation(posX);
    cancelAnimation(posY);

    const now = Date.now();

    if (ravager.state === 'moving') {
      const ms = Math.max(100, ravager.arrivalAt - now);
      posX.value = withTiming(ravager.targetPx.x, { duration: ms, easing: Easing.linear });
      posY.value = withTiming(ravager.targetPx.y, { duration: ms, easing: Easing.linear });
    } else if (ravager.state === 'retreating') {
      const ms = Math.max(100, ravager.retreatAt - now);
      posX.value = withTiming(ravager.retreatPx.x, { duration: ms, easing: Easing.linear });
      posY.value = withTiming(ravager.retreatPx.y, { duration: ms, easing: Easing.linear });
    }
  }, [ravager.state]);

  const posTransform = useDerivedValue(() => [
    { translateX: posX.value },
    { translateY: posY.value },
  ]);

  const hpFrac = ravager.hp / ravager.maxHp;

  return (
    <Group transform={posTransform}>
      <RavagerBody />
      {/* HP bar — shown only when damaged */}
      {hpFrac < 1 && (
        <Group>
          {/* Background */}
          <Rect x={-14} y={-28} width={28} height={4} color="rgba(0,0,0,0.5)" />
          {/* Fill */}
          <Rect x={-14} y={-28} width={28 * hpFrac} height={4} color="#FF2222" />
        </Group>
      )}
    </Group>
  );
});

export default RavagerSprite;
