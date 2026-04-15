/**
 * CreatureSprite — Skia-drawn animated creature rendering.
 *
 * All 18 species fully illustrated:
 *   Feuillon, Broutard, Boussin, Mellior, Flottin, Sirpio,
 *   Rampex, Gribou, Crochon, Stalagor, Scorpilou, Dunor,
 *   Griffax, Rughor, Vénomoth, Aquilon, Lumios, Draknoir
 * FallbackBody remains as a safety net for unknown speciesIds.
 *
 * All bodies are centered at (0, 0) in local space.
 * The outer Group's transform handles world-space positioning.
 *
 * Animation:
 *   - Position: withTiming toward targetPosition (2s per tile)
 *   - Sleeping: breathing scale (1.0 → 1.03) + ZZZ bubbles
 *   - Stumbling: quick scale jolt (1.0 → 1.2 → 1.0)
 *   - Affection: heart particle floats up
 *   - Shiny: golden shimmer pulse
 */
import React, { memo, useEffect, useMemo } from 'react';
import {
  Canvas,
  Circle,
  Group,
  Path,
  Rect,
  RoundedRect,
  Skia,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Creature } from '../../store/creatureStore';
import { SPECIES_MAP } from '../../constants/creatures';
import { TILE_SIZE } from '../../constants/terrain';

// ---------------------------------------------------------------------------
// Z-bubble helpers
// ---------------------------------------------------------------------------

/** Single "Z" drawn as three stroked line segments */
function ZShape() {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-4, 0);  p.lineTo(4, 0);
    p.moveTo(4, 0);   p.lineTo(-4, 8);
    p.moveTo(-4, 8);  p.lineTo(4, 8);
    return p;
  }, []);
  return (
    <Path
      path={path}
      color="rgba(80,60,140,0.90)"
      style="stroke"
      strokeWidth={1.8}
      strokeCap="round"
      strokeJoin="round"
    />
  );
}

interface ZzzBubbleProps {
  index: number; // 0, 1, 2 — controls stagger + size
}

function ZzzBubble({ index }: ZzzBubbleProps) {
  const DELAY    = index * 600;           // stagger: 0, 600, 1200 ms
  const SCALE    = 0.6 + index * 0.2;    // 0.6, 0.8, 1.0
  const XOFF     = (index - 1) * 9;      // -9, 0, +9 px spread

  const opacity  = useSharedValue(0);
  const offsetY  = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      DELAY,
      withRepeat(
        withSequence(
          withTiming(0,   { duration: 0 }),
          withTiming(1,   { duration: 300 }),
          withTiming(1,   { duration: 1200 }),
          withTiming(0,   { duration: 300 }),
        ),
        -1,
        false,
      ),
    );
    offsetY.value = withDelay(
      DELAY,
      withRepeat(
        withSequence(
          withTiming(0,   { duration: 0 }),
          withTiming(-20, { duration: 1800, easing: Easing.out(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(offsetY);
    };
  }, []);

  const transform = useDerivedValue(() => [
    { translateX: XOFF },
    { translateY: -22 + offsetY.value },
    { scale: SCALE },
  ]);

  return (
    <Group transform={transform} opacity={opacity}>
      <ZShape />
    </Group>
  );
}

function ZzzBubbles() {
  return (
    <Group>
      <ZzzBubble index={0} />
      <ZzzBubble index={1} />
      <ZzzBubble index={2} />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Heart particle
// ---------------------------------------------------------------------------

interface HeartParticleProps {
  trigger: number; // timestamp — changes cause the animation to re-fire
}

function HeartParticle({ trigger }: HeartParticleProps) {
  const opacity  = useSharedValue(0);
  const offsetY  = useSharedValue(0);

  const heartPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, 5);
    p.lineTo(-7, -2);
    p.lineTo(-3.5, -6);
    p.lineTo(0, -3);
    p.lineTo(3.5, -6);
    p.lineTo(7, -2);
    p.close();
    return p;
  }, []);

  useEffect(() => {
    if (!trigger) return;
    cancelAnimation(opacity);
    cancelAnimation(offsetY);
    offsetY.value = 0;
    opacity.value = withSequence(
      withTiming(1,   { duration: 150 }),
      withTiming(1,   { duration: 500 }),
      withTiming(0,   { duration: 300 }),
    );
    offsetY.value = withTiming(-32, { duration: 950, easing: Easing.out(Easing.quad) });
  }, [trigger]);

  const transform = useDerivedValue(() => [
    { translateY: -20 + offsetY.value },
  ]);

  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={-3.5} cy={-4} r={4}   color="#FF6B8A" />
      <Circle cx={3.5}  cy={-4} r={4}   color="#FF6B8A" />
      <Path   path={heartPath}           color="#FF6B8A" />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Shiny shimmer overlay
// ---------------------------------------------------------------------------

function ShimmerOverlay() {
  const op = useSharedValue(0.35);

  useEffect(() => {
    op.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 900 }),
        withTiming(0.35, { duration: 900 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(op);
  }, []);

  return (
    <Group opacity={op}>
      <Circle cx={0} cy={0} r={17} color="rgba(255,215,0,0.55)" />
      <Circle cx={-6} cy={-8} r={2.5} color="rgba(255,255,200,0.9)" />
      <Circle cx={7}  cy={-5} r={1.5} color="rgba(255,255,200,0.9)" />
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Sleep desaturation overlay
// ---------------------------------------------------------------------------

function SleepOverlay() {
  return <Circle cx={0} cy={0} r={18} color="rgba(20,20,60,0.22)" />;
}

// ---------------------------------------------------------------------------
// Species body components  (all centered at 0,0)
// ---------------------------------------------------------------------------

function FeuillonBody({ sleeping }: { sleeping: boolean }) {
  const leftEar = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-8, -10);  p.lineTo(-16, -21);  p.lineTo(-4, -20);  p.close();
    return p;
  }, []);
  const rightEar = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(8, -10);  p.lineTo(4, -20);  p.lineTo(16, -21);  p.close();
    return p;
  }, []);

  const eyeColor = sleeping ? '#3D6020' : '#1A3A0E';
  return (
    <Group>
      {/* Leaf ears */}
      <Path path={leftEar}  color="#5AA832" />
      <Path path={rightEar} color="#5AA832" />
      {/* Body */}
      <RoundedRect x={-13} y={-10} width={26} height={20} r={10} color="#8AC659" />
      {/* Body highlight */}
      <RoundedRect x={-10} y={-9}  width={10} height={5}  r={3}  color="rgba(255,255,255,0.28)" />
      {/* Eyes — closed when sleeping */}
      {sleeping ? (
        <>
          <Rect x={-8} y={-4} width={6} height={1.5} r={1} color={eyeColor} />
          <Rect x={2}  y={-4} width={6} height={1.5} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-5} cy={-3} r={2.5} color={eyeColor} />
          <Circle cx={5}  cy={-3} r={2.5} color={eyeColor} />
          <Circle cx={-4} cy={-4} r={1}   color="rgba(255,255,255,0.6)" />
          <Circle cx={6}  cy={-4} r={1}   color="rgba(255,255,255,0.6)" />
        </>
      )}
      {/* Nose */}
      <Circle cx={0} cy={3} r={1.5} color="#5AA832" />
    </Group>
  );
}

function BroutardBody({ sleeping }: { sleeping: boolean }) {
  const leftHorn = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-8, -11);  p.lineTo(-13, -21);  p.lineTo(-5, -20);  p.close();
    return p;
  }, []);
  const rightHorn = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(8, -11);  p.lineTo(5, -20);  p.lineTo(13, -21);  p.close();
    return p;
  }, []);

  const eyeColor = sleeping ? '#4A2A00' : '#3D1A00';
  return (
    <Group>
      {/* Horns */}
      <Path path={leftHorn}  color="#8B6040" />
      <Path path={rightHorn} color="#8B6040" />
      {/* Body */}
      <RoundedRect x={-15} y={-11} width={30} height={22} r={7} color="#C8956A" />
      {/* Body highlight */}
      <RoundedRect x={-12} y={-10} width={11} height={5} r={3} color="rgba(255,255,255,0.22)" />
      {/* Snout */}
      <RoundedRect x={-7}  y={2}   width={14} height={9}  r={4} color="#A07040" />
      {/* Nostrils */}
      <Circle cx={-3} cy={6} r={1.5} color="#5C3A10" />
      <Circle cx={3}  cy={6} r={1.5} color="#5C3A10" />
      {/* Eyes */}
      {sleeping ? (
        <>
          <Rect x={-9} y={-4} width={6} height={2} r={1} color={eyeColor} />
          <Rect x={3}  y={-4} width={6} height={2} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-6} cy={-3} r={3}   color={eyeColor} />
          <Circle cx={6}  cy={-3} r={3}   color={eyeColor} />
          <Circle cx={-5} cy={-4} r={1.2} color="rgba(255,255,255,0.55)" />
          <Circle cx={7}  cy={-4} r={1.2} color="rgba(255,255,255,0.55)" />
        </>
      )}
    </Group>
  );
}

function BoussinBody({ sleeping }: { sleeping: boolean }) {
  // Flower petal path on top of head
  const flowerPath = useMemo(() => {
    const p = Skia.Path.Make();
    // 4 small petals around center
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const cx    = Math.cos(angle) * 4.5;
      const cy    = Math.sin(angle) * 4.5;
      p.addCircle(cx - 1, cy - 18, 2.8);
    }
    return p;
  }, []);

  const eyeColor = sleeping ? '#2A001A' : '#1E0010';
  return (
    <Group>
      {/* Ears */}
      <Circle cx={-11} cy={-12} r={5.5} color="#F9A8D4" />
      <Circle cx={11}  cy={-12} r={5.5} color="#F9A8D4" />
      <Circle cx={-11} cy={-12} r={2.5} color="#EC4899" />
      <Circle cx={11}  cy={-12} r={2.5} color="#EC4899" />
      {/* Body */}
      <Circle cx={0}   cy={0}   r={13}  color="#F9A8D4" />
      {/* Body highlight */}
      <Circle cx={-5}  cy={-6}  r={4}   color="rgba(255,255,255,0.30)" />
      {/* Flower */}
      <Path path={flowerPath} color="#FBBF24" />
      <Circle cx={0} cy={-18} r={2} color="#FEF08A" />
      {/* Eyes */}
      {sleeping ? (
        <>
          <Rect x={-8} y={-4} width={5} height={1.5} r={1} color={eyeColor} />
          <Rect x={3}  y={-4} width={5} height={1.5} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-5} cy={-3} r={2.5} color={eyeColor} />
          <Circle cx={5}  cy={-3} r={2.5} color={eyeColor} />
          <Circle cx={-4} cy={-4} r={1}   color="rgba(255,255,255,0.7)" />
          <Circle cx={6}  cy={-4} r={1}   color="rgba(255,255,255,0.7)" />
        </>
      )}
      {/* Smile */}
      {!sleeping && <Rect x={-3} y={4} width={6} height={1.5} r={1} color="#EC4899" />}
    </Group>
  );
}

function MelliorBody({ sleeping }: { sleeping: boolean }) {
  const leftAntenna = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-5, -8);  p.quadTo(-10, -14, -8, -18);
    return p;
  }, []);
  const rightAntenna = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(5, -8);  p.quadTo(10, -14, 8, -18);
    return p;
  }, []);

  const eyeColor = sleeping ? '#2A1400' : '#1A0A00';
  return (
    <Group>
      {/* Wings (behind body) */}
      <RoundedRect x={-22} y={-16} width={11} height={14} r={5.5} color="rgba(186,230,255,0.70)" />
      <RoundedRect x={11}  y={-16} width={11} height={14} r={5.5} color="rgba(186,230,255,0.70)" />
      {/* Body */}
      <RoundedRect x={-12} y={-8} width={24} height={16} r={8} color="#FCD34D" />
      {/* Body highlight */}
      <RoundedRect x={-9} y={-7} width={9} height={4} r={3} color="rgba(255,255,255,0.35)" />
      {/* Stripes */}
      <Rect x={-10} y={-2} width={20} height={2} color="rgba(146,64,14,0.45)" />
      <Rect x={-9}  y={3}  width={18} height={2} color="rgba(146,64,14,0.35)" />
      {/* Antennae */}
      <Path path={leftAntenna}  color="#92400E" style="stroke" strokeWidth={1.5} strokeCap="round" />
      <Path path={rightAntenna} color="#92400E" style="stroke" strokeWidth={1.5} strokeCap="round" />
      {/* Antenna tips */}
      <Circle cx={-8}  cy={-18} r={2} color="#F59E0B" />
      <Circle cx={8}   cy={-18} r={2} color="#F59E0B" />
      {/* Eyes */}
      {sleeping ? (
        <>
          <Rect x={-7} y={-4} width={4} height={1.5} r={1} color={eyeColor} />
          <Rect x={3}  y={-4} width={4} height={1.5} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-5} cy={-2} r={2.5} color={eyeColor} />
          <Circle cx={5}  cy={-2} r={2.5} color={eyeColor} />
          <Circle cx={-4} cy={-3} r={1}   color="rgba(255,255,255,0.6)" />
          <Circle cx={6}  cy={-3} r={1}   color="rgba(255,255,255,0.6)" />
        </>
      )}
    </Group>
  );
}

function FlottinBody({ sleeping }: { sleeping: boolean }) {
  const tailPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(13, -3);  p.lineTo(20, -9);  p.lineTo(22, 0);  p.lineTo(20, 9);  p.lineTo(13, 3);
    p.close();
    return p;
  }, []);
  const dorsalFin = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-6, -9);  p.lineTo(0, -16);  p.lineTo(6, -9);  p.close();
    return p;
  }, []);
  const mouthPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-13, 2);  p.quadTo(-15, 5, -13, 7);
    return p;
  }, []);

  const eyeWhite = sleeping ? '#CCE8FF' : '#FFFFFF';
  const eyeDark  = sleeping ? '#101030' : '#1A1A3E';
  return (
    <Group>
      {/* Tail fin */}
      <Path path={tailPath}  color="#0EA5E9" />
      {/* Body */}
      <RoundedRect x={-13} y={-9} width={26} height={18} r={9} color="#38BDF8" />
      {/* Body highlight */}
      <Circle cx={-4} cy={-4} r={5} color="rgba(255,255,255,0.25)" />
      {/* Dorsal fin */}
      <Path path={dorsalFin} color="#0EA5E9" />
      {/* Scales hint */}
      <Rect x={-5} y={-2} width={10} height={1.5} r={1} color="rgba(14,165,233,0.35)" />
      <Rect x={-3} y={2}  width={8}  height={1.5} r={1} color="rgba(14,165,233,0.30)" />
      {/* Eyes — fish have big round eyes */}
      <Circle cx={-7} cy={-1} r={5}   color={eyeWhite} />
      {sleeping ? (
        <Rect x={-11} y={-2} width={8} height={2} r={1} color={eyeDark} />
      ) : (
        <>
          <Circle cx={-7} cy={-1} r={3}   color={eyeDark} />
          <Circle cx={-6} cy={-2} r={1.2} color="rgba(255,255,255,0.85)" />
        </>
      )}
      {/* Mouth */}
      <Path path={mouthPath} color="#0EA5E9" style="stroke" strokeWidth={1.5} strokeCap="round" />
    </Group>
  );
}

function SirpioBody({ sleeping }: { sleeping: boolean }) {
  const finCrest = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-12, -7);  p.lineTo(-8, -15);  p.lineTo(-4, -7);
    p.lineTo(0,   -13); p.lineTo(4,   -7);
    p.lineTo(8,   -11); p.lineTo(12,  -7);
    return p;
  }, []);
  const tailFin = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(15, 0);  p.lineTo(22, -7);  p.lineTo(22, 7);  p.close();
    return p;
  }, []);

  const eyeDark = sleeping ? '#002A15' : '#001A0A';
  return (
    <Group>
      {/* Tail fin */}
      <Path path={tailFin}  color="#059669" />
      {/* Body (elongated) */}
      <RoundedRect x={-16} y={-7} width={32} height={14} r={7} color="#10B981" />
      {/* Head bump */}
      <Circle cx={-13} cy={0} r={8} color="#10B981" />
      {/* Body highlight */}
      <RoundedRect x={-12} y={-6} width={12} height={4} r={3} color="rgba(255,255,255,0.25)" />
      {/* Fin crest */}
      <Path
        path={finCrest}
        color="#059669"
        style="stroke"
        strokeWidth={2}
        strokeCap="round"
        strokeJoin="round"
      />
      {/* Scale stripe */}
      <Rect x={-5} y={-1} width={14} height={1.5} r={1} color="rgba(5,150,105,0.40)" />
      {/* Eye (serpentine — single visible) */}
      <Circle cx={-13} cy={-1} r={3.5} color="white" />
      {sleeping ? (
        <Rect x={-16} y={-2} width={7} height={2} r={1} color={eyeDark} />
      ) : (
        <>
          <Circle cx={-13} cy={-1} r={2.2} color={eyeDark} />
          <Circle cx={-12} cy={-2} r={1}   color="rgba(255,255,255,0.8)" />
        </>
      )}
    </Group>
  );
}

function RampexBody({ sleeping }: { sleeping: boolean }) {
  const tailPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(14, -2);
    p.quadTo(22, -14, 18, -20);
    p.quadTo(14, -26, 8, -18);
    p.close();
    return p;
  }, []);

  const eyeColor = sleeping ? '#3D1800' : '#2A0A00';
  return (
    <Group>
      {/* Bushy tail */}
      <Path path={tailPath} color="#6B4423" />
      {/* Round ears */}
      <Circle cx={-10} cy={-16} r={6.5} color="#8B5E3C" />
      <Circle cx={10}  cy={-16} r={6.5} color="#8B5E3C" />
      <Circle cx={-10} cy={-16} r={3}   color="#5C3A1E" />
      <Circle cx={10}  cy={-16} r={3}   color="#5C3A1E" />
      {/* Body */}
      <RoundedRect x={-14} y={-11} width={28} height={22} r={9} color="#8B5E3C" />
      {/* Belly patch */}
      <RoundedRect x={-7}  y={-4}  width={14} height={12} r={6} color="rgba(255,220,180,0.30)" />
      {/* Body highlight */}
      <RoundedRect x={-11} y={-10} width={10} height={5}  r={3} color="rgba(255,255,255,0.20)" />
      {/* Snout */}
      <RoundedRect x={-8} y={4} width={16} height={8} r={4} color="#6B4423" />
      {/* Nostrils */}
      <Circle cx={-3} cy={8} r={1.5} color="#3D1800" />
      <Circle cx={3}  cy={8} r={1.5} color="#3D1800" />
      {/* Eyes */}
      {sleeping ? (
        <>
          <Rect x={-9} y={-4} width={6} height={2} r={1} color={eyeColor} />
          <Rect x={3}  y={-4} width={6} height={2} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-6} cy={-3} r={3}   color={eyeColor} />
          <Circle cx={6}  cy={-3} r={3}   color={eyeColor} />
          <Circle cx={-5} cy={-4} r={1.2} color="rgba(255,255,255,0.55)" />
          <Circle cx={7}  cy={-4} r={1.2} color="rgba(255,255,255,0.55)" />
        </>
      )}
    </Group>
  );
}

function GribouBody({ sleeping }: { sleeping: boolean }) {
  const capPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-16, -10);
    p.quadTo(-12, -28, 0, -30);
    p.quadTo(12, -28, 16, -10);
    p.close();
    return p;
  }, []);

  const eyeColor = sleeping ? '#1A0040' : '#0D0020';
  return (
    <Group>
      {/* Mushroom cap */}
      <Path path={capPath} color="#5B21B6" />
      {/* Cap underside rim */}
      <Rect x={-16} y={-12} width={32} height={3} r={2} color="rgba(200,180,255,0.35)" />
      {/* Cap spots */}
      <Circle cx={-5}  cy={-22} r={2.5} color="rgba(255,255,255,0.65)" />
      <Circle cx={4}   cy={-25} r={2}   color="rgba(255,255,255,0.65)" />
      <Circle cx={9}   cy={-18} r={1.8} color="rgba(255,255,255,0.65)" />
      <Circle cx={-10} cy={-19} r={1.5} color="rgba(255,255,255,0.65)" />
      {/* Stem / neck join */}
      <RoundedRect x={-5} y={-12} width={10} height={6} r={3} color="#7C3AED" />
      {/* Body */}
      <Circle cx={0} cy={0} r={12} color="#7C3AED" />
      {/* Body highlight */}
      <Circle cx={-5} cy={-5} r={4} color="rgba(255,255,255,0.22)" />
      {/* Stubby arms */}
      <Circle cx={-14} cy={2} r={4.5} color="#7C3AED" />
      <Circle cx={14}  cy={2} r={4.5} color="#7C3AED" />
      {/* Eyes */}
      {sleeping ? (
        <>
          <Rect x={-7} y={-3} width={5} height={1.5} r={1} color={eyeColor} />
          <Rect x={2}  y={-3} width={5} height={1.5} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-4} cy={-2} r={3}   color={eyeColor} />
          <Circle cx={4}  cy={-2} r={3}   color={eyeColor} />
          {/* Glowing crepuscular iris */}
          <Circle cx={-4} cy={-2} r={1.4} color="rgba(200,160,255,0.9)" />
          <Circle cx={4}  cy={-2} r={1.4} color="rgba(200,160,255,0.9)" />
        </>
      )}
    </Group>
  );
}

function CrochonBody({ sleeping }: { sleeping: boolean }) {
  const shellPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-10, 5);
    p.quadTo(-12, -10, 0, -14);
    p.quadTo(14, -10, 14, 5);
    p.close();
    return p;
  }, []);
  const ridge1 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-1, 4); p.quadTo(-3, -8, 0, -13);
    return p;
  }, []);
  const ridge2 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(5, 4); p.quadTo(7, -7, 9, -10);
    return p;
  }, []);

  const eyeColor = sleeping ? '#1A2510' : '#0A150A';
  return (
    <Group>
      {/* Underbelly */}
      <RoundedRect x={-10} y={3} width={24} height={9} r={5} color="#8A9A7A" />
      {/* Rocky shell */}
      <Path path={shellPath} color="#6A7A5A" />
      {/* Shell highlight */}
      <Circle cx={-1} cy={-7} r={4} color="rgba(255,255,255,0.18)" />
      {/* Shell ridges */}
      <Path path={ridge1} color="rgba(50,60,40,0.45)" style="stroke" strokeWidth={1.5} strokeCap="round" />
      <Path path={ridge2} color="rgba(50,60,40,0.38)" style="stroke" strokeWidth={1.5} strokeCap="round" />
      {/* Head */}
      <Circle cx={-14} cy={0} r={8} color="#8A9A7A" />
      {/* Head highlight */}
      <Circle cx={-17} cy={-4} r={2.5} color="rgba(255,255,255,0.22)" />
      {/* Eye */}
      {sleeping ? (
        <Rect x={-19} y={-2} width={7} height={2} r={1} color={eyeColor} />
      ) : (
        <>
          <Circle cx={-16} cy={-1} r={3}   color={eyeColor} />
          <Circle cx={-15} cy={-2} r={1.2} color="rgba(255,255,255,0.50)" />
        </>
      )}
      {/* Jaw line */}
      <Rect x={-20} y={4} width={9} height={1.2} r={1} color={eyeColor} />
    </Group>
  );
}

function StalagorBody({ sleeping }: { sleeping: boolean }) {
  const leftWing = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-8, -4);
    p.lineTo(-22, -12);
    p.lineTo(-18, 6);
    p.close();
    return p;
  }, []);
  const rightWing = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(8, -4);
    p.lineTo(22, -12);
    p.lineTo(18, 6);
    p.close();
    return p;
  }, []);
  const crystal1 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-5, -10); p.lineTo(-2, -22); p.lineTo(1, -10); p.close();
    return p;
  }, []);
  const crystal2 = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(2, -10); p.lineTo(6, -20); p.lineTo(9, -10); p.close();
    return p;
  }, []);

  const eyeColor = sleeping ? '#071830' : '#020E1C';
  return (
    <Group>
      {/* Wings */}
      <Path path={leftWing}  color="rgba(30,58,95,0.82)" />
      <Path path={rightWing} color="rgba(30,58,95,0.82)" />
      {/* Wing membrane lines */}
      <Path path={leftWing}  color="rgba(37,99,235,0.28)" style="stroke" strokeWidth={0.8} />
      <Path path={rightWing} color="rgba(37,99,235,0.28)" style="stroke" strokeWidth={0.8} />
      {/* Body */}
      <RoundedRect x={-11} y={-9} width={22} height={18} r={9} color="#1E3A5F" />
      {/* Body highlight */}
      <RoundedRect x={-8} y={-8} width={8} height={4} r={3} color="rgba(37,99,235,0.35)" />
      {/* Crystal spikes */}
      <Path path={crystal1} color="#2563EB" />
      <Path path={crystal2} color="#3B82F6" />
      {/* Crystal glow tips */}
      <Circle cx={-1}  cy={-21} r={2.2} color="rgba(147,197,253,0.90)" />
      <Circle cx={5.5} cy={-19} r={1.8} color="rgba(147,197,253,0.90)" />
      {/* Large nocturnal eyes */}
      {sleeping ? (
        <>
          <Rect x={-8} y={-3} width={6} height={2} r={1} color={eyeColor} />
          <Rect x={2}  y={-3} width={6} height={2} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-5} cy={-2} r={4.5} color="white" />
          <Circle cx={5}  cy={-2} r={4.5} color="white" />
          <Circle cx={-5} cy={-2} r={2.8} color={eyeColor} />
          <Circle cx={5}  cy={-2} r={2.8} color={eyeColor} />
          <Circle cx={-4} cy={-3} r={1.2} color="rgba(147,197,253,0.85)" />
          <Circle cx={6}  cy={-3} r={1.2} color="rgba(147,197,253,0.85)" />
        </>
      )}
    </Group>
  );
}

function ScorpilouBody({ sleeping }: { sleeping: boolean }) {
  const tailPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(10, -2);
    p.quadTo(18, -2, 20, -10);
    p.quadTo(22, -18, 14, -20);
    p.quadTo(10, -22, 8, -16);
    return p;
  }, []);
  const leftClaw = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-10, 2);
    p.lineTo(-18, -4);
    p.lineTo(-22, 0);
    p.lineTo(-18, 4);
    p.lineTo(-10, 6);
    p.close();
    return p;
  }, []);
  const rightClaw = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(10, 2);
    p.lineTo(18, -4);
    p.lineTo(22, 0);
    p.lineTo(18, 4);
    p.lineTo(10, 6);
    p.close();
    return p;
  }, []);

  const eyeColor = sleeping ? '#400A00' : '#2A0500';
  return (
    <Group>
      {/* Claws */}
      <Path path={leftClaw}  color="#EA580C" />
      <Path path={rightClaw} color="#EA580C" />
      {/* Curved tail — drawn as thick stroke */}
      <Path path={tailPath} color="#F97316" style="stroke" strokeWidth={5} strokeCap="round" strokeJoin="round" />
      {/* Stinger */}
      <Circle cx={8}  cy={-16} r={3}   color="#EA580C" />
      <Circle cx={6}  cy={-20} r={2}   color="#7F1D1D" />
      {/* Segmented abdomen */}
      <RoundedRect x={-4}  y={-2}  width={14} height={12} r={5}  color="#F97316" />
      <Rect        x={-3}  y={4}   width={12} height={1.5} r={1}  color="rgba(234,88,12,0.55)" />
      {/* Main body */}
      <RoundedRect x={-13} y={-8}  width={22} height={16} r={8}  color="#F97316" />
      {/* Body highlight */}
      <Circle cx={-5} cy={-4} r={5} color="rgba(255,255,255,0.20)" />
      {/* Eyes */}
      {sleeping ? (
        <>
          <Rect x={-7} y={-3} width={4} height={1.5} r={1} color={eyeColor} />
          <Rect x={2}  y={-3} width={4} height={1.5} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-5} cy={-2} r={2.5} color={eyeColor} />
          <Circle cx={4}  cy={-2} r={2.5} color={eyeColor} />
          <Circle cx={-4} cy={-3} r={1}   color="rgba(255,150,50,0.85)" />
          <Circle cx={5}  cy={-3} r={1}   color="rgba(255,150,50,0.85)" />
        </>
      )}
    </Group>
  );
}

function DunorBody({ sleeping }: { sleeping: boolean }) {
  const frillPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-12, -7);
    p.lineTo(-10, -15); p.lineTo(-6, -8);
    p.lineTo(-2,  -14); p.lineTo(2,  -8);
    p.lineTo(6,   -13); p.lineTo(10, -8);
    p.lineTo(12,  -7);
    return p;
  }, []);
  const tailPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(14, 0);
    p.quadTo(20, 5, 24, 0);
    p.quadTo(20, -5, 14, 0);
    p.close();
    return p;
  }, []);

  const eyeColor = sleeping ? '#2A1200' : '#1A0900';
  return (
    <Group>
      {/* Wide flat tail */}
      <Path path={tailPath} color="#B45309" />
      {/* Wide flat body */}
      <RoundedRect x={-16} y={-7} width={32} height={14} r={7} color="#D97706" />
      {/* Body highlight */}
      <RoundedRect x={-13} y={-6} width={13} height={4} r={3} color="rgba(255,255,255,0.20)" />
      {/* Dorsal frill */}
      <Path
        path={frillPath}
        color="#92400E"
        style="stroke"
        strokeWidth={2.5}
        strokeCap="round"
        strokeJoin="round"
      />
      {/* Scale rows */}
      <Rect x={-6} y={-1} width={12} height={1.5} r={1} color="rgba(146,64,14,0.35)" />
      <Rect x={-4} y={3}  width={9}  height={1.5} r={1} color="rgba(146,64,14,0.30)" />
      {/* Head / snout block */}
      <RoundedRect x={-22} y={-6} width={12} height={12} r={5} color="#D97706" />
      {/* Jaw line */}
      <Rect x={-22} y={2} width={13} height={1.5} r={1} color="#92400E" />
      {/* Eye */}
      {sleeping ? (
        <Rect x={-20} y={-3} width={6} height={2} r={1} color={eyeColor} />
      ) : (
        <>
          <Circle cx={-17} cy={-2} r={3.5} color="white" />
          <Circle cx={-17} cy={-2} r={2.2} color={eyeColor} />
          <Circle cx={-16} cy={-3} r={1}   color="rgba(255,200,80,0.85)" />
        </>
      )}
      {/* Nostril */}
      <Circle cx={-23} cy={2} r={1.2} color="#92400E" />
    </Group>
  );
}

function GriffaxBody({ sleeping }: { sleeping: boolean }) {
  const leftWing = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-6, -4);
    p.lineTo(-24, -10);
    p.lineTo(-20, 4);
    p.lineTo(-12, 8);
    p.lineTo(-6, 6);
    p.close();
    return p;
  }, []);
  const rightWing = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(6, -4);
    p.lineTo(24, -10);
    p.lineTo(20, 4);
    p.lineTo(12, 8);
    p.lineTo(6, 6);
    p.close();
    return p;
  }, []);
  const tailPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-6, 8);
    p.lineTo(-10, 20); p.lineTo(-4, 16);
    p.lineTo(0, 22);   p.lineTo(4, 16);
    p.lineTo(10, 20);  p.lineTo(6, 8);
    p.close();
    return p;
  }, []);
  const beakPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-12, -4);
    p.lineTo(-22, 0);
    p.lineTo(-12, 3);
    p.close();
    return p;
  }, []);

  const eyeColor = sleeping ? '#1A1A1A' : '#0A0A0A';
  return (
    <Group>
      {/* Fan tail */}
      <Path path={tailPath}  color="#4B5563" />
      {/* Wings */}
      <Path path={leftWing}  color="#4B5563" />
      <Path path={rightWing} color="#4B5563" />
      {/* Wing feather edge */}
      <Path path={leftWing}  color="rgba(107,114,128,0.38)" style="stroke" strokeWidth={1} />
      <Path path={rightWing} color="rgba(107,114,128,0.38)" style="stroke" strokeWidth={1} />
      {/* Body */}
      <Circle cx={0}   cy={0}   r={12} color="#374151" />
      {/* Head */}
      <Circle cx={-10} cy={-6}  r={9}  color="#374151" />
      {/* Head highlight */}
      <Circle cx={-14} cy={-10} r={3}  color="rgba(255,255,255,0.18)" />
      {/* Beak */}
      <Path path={beakPath} color="#9CA3AF" />
      {/* Body highlight */}
      <Circle cx={4} cy={-3} r={4} color="rgba(255,255,255,0.12)" />
      {/* Eye */}
      {sleeping ? (
        <Rect x={-17} y={-8} width={7} height={2} r={1} color={eyeColor} />
      ) : (
        <>
          <Circle cx={-14} cy={-7} r={3.5} color="white" />
          <Circle cx={-14} cy={-7} r={2.2} color={eyeColor} />
          <Circle cx={-13} cy={-8} r={1}   color="rgba(255,255,255,0.75)" />
        </>
      )}
    </Group>
  );
}

function RughorBody({ sleeping }: { sleeping: boolean }) {
  const hacklesPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-10, -10);
    p.lineTo(-8, -18); p.lineTo(-4, -11);
    p.lineTo(-1, -17); p.lineTo(3,  -11);
    p.lineTo(6,  -16); p.lineTo(9,  -10);
    return p;
  }, []);
  const leftClawPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-14, 7); p.lineTo(-20, 11);
    p.moveTo(-14, 7); p.lineTo(-19, 8);
    p.moveTo(-14, 7); p.lineTo(-18, 4);
    return p;
  }, []);
  const rightClawPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(14, 7); p.lineTo(20, 11);
    p.moveTo(14, 7); p.lineTo(19, 8);
    p.moveTo(14, 7); p.lineTo(18, 4);
    return p;
  }, []);

  const eyeColor = sleeping ? '#2A0A00' : '#1A0400';
  return (
    <Group>
      {/* Heavy body */}
      <RoundedRect x={-15} y={-10} width={30} height={20} r={8} color="#92400E" />
      {/* Body highlight */}
      <RoundedRect x={-12} y={-9}  width={11} height={5}  r={3} color="rgba(255,255,255,0.18)" />
      {/* Raised hackle ridge */}
      <Path
        path={hacklesPath}
        color="#78350F"
        style="stroke"
        strokeWidth={2.5}
        strokeCap="round"
        strokeJoin="round"
      />
      {/* Head */}
      <Circle cx={-12} cy={-4} r={10} color="#92400E" />
      {/* Snout */}
      <RoundedRect x={-23} y={0} width={13} height={8} r={4} color="#78350F" />
      {/* Snout highlight */}
      <Circle cx={-20} cy={2} r={2} color="rgba(255,255,255,0.15)" />
      {/* Nostrils */}
      <Circle cx={-22} cy={6} r={1.5} color="#3D1200" />
      <Circle cx={-17} cy={6} r={1.5} color="#3D1200" />
      {/* Claws */}
      <Path path={leftClawPath}  color="#3D1200" style="stroke" strokeWidth={1.8} strokeCap="round" />
      <Path path={rightClawPath} color="#3D1200" style="stroke" strokeWidth={1.8} strokeCap="round" />
      {/* Eye */}
      {sleeping ? (
        <Rect x={-20} y={-6} width={7} height={2} r={1} color={eyeColor} />
      ) : (
        <>
          <Circle cx={-17} cy={-5} r={3.5} color="white" />
          <Circle cx={-17} cy={-5} r={2.2} color={eyeColor} />
          <Circle cx={-16} cy={-6} r={1}   color="rgba(255,150,50,0.65)" />
        </>
      )}
    </Group>
  );
}

function VenomothBody({ sleeping }: { sleeping: boolean }) {
  const topLeftWing = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-4, -8);
    p.lineTo(-22, -22);
    p.lineTo(-26, -4);
    p.lineTo(-14, 4);
    p.close();
    return p;
  }, []);
  const topRightWing = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(4, -8);
    p.lineTo(22, -22);
    p.lineTo(26, -4);
    p.lineTo(14, 4);
    p.close();
    return p;
  }, []);
  const botLeftWing = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-6, 2);
    p.lineTo(-20, 8);
    p.lineTo(-16, 18);
    p.lineTo(-4, 12);
    p.close();
    return p;
  }, []);
  const botRightWing = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(6, 2);
    p.lineTo(20, 8);
    p.lineTo(16, 18);
    p.lineTo(4, 12);
    p.close();
    return p;
  }, []);
  const leftAntenna = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-4, -8); p.quadTo(-10, -16, -8, -22);
    return p;
  }, []);
  const rightAntenna = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(4, -8); p.quadTo(10, -16, 8, -22);
    return p;
  }, []);

  const eyeColor = sleeping ? '#1A0040' : '#0D0020';
  return (
    <Group>
      {/* Wings */}
      <Path path={topLeftWing}  color="rgba(88,28,135,0.85)" />
      <Path path={topRightWing} color="rgba(88,28,135,0.85)" />
      <Path path={botLeftWing}  color="rgba(109,40,217,0.75)" />
      <Path path={botRightWing} color="rgba(109,40,217,0.75)" />
      {/* Wing eye-spots */}
      <Circle cx={-16} cy={-12} r={4}   color="rgba(167,139,250,0.70)" />
      <Circle cx={-16} cy={-12} r={2}   color="rgba(20,0,50,0.85)" />
      <Circle cx={16}  cy={-12} r={4}   color="rgba(167,139,250,0.70)" />
      <Circle cx={16}  cy={-12} r={2}   color="rgba(20,0,50,0.85)" />
      {/* Wing veins */}
      <Path path={topLeftWing}  color="rgba(167,139,250,0.22)" style="stroke" strokeWidth={0.8} />
      <Path path={topRightWing} color="rgba(167,139,250,0.22)" style="stroke" strokeWidth={0.8} />
      {/* Fuzzy body */}
      <RoundedRect x={-6} y={-8} width={12} height={20} r={6} color="#7C3AED" />
      {/* Fuzz highlight */}
      <Circle cx={-2} cy={-4} r={3} color="rgba(255,255,255,0.20)" />
      {/* Antennae */}
      <Path path={leftAntenna}  color="#5B21B6" style="stroke" strokeWidth={1.5} strokeCap="round" />
      <Path path={rightAntenna} color="#5B21B6" style="stroke" strokeWidth={1.5} strokeCap="round" />
      {/* Feathered antenna tips */}
      <Circle cx={-8} cy={-22} r={2.5} color="#A78BFA" />
      <Circle cx={8}  cy={-22} r={2.5} color="#A78BFA" />
      {/* Eyes */}
      {sleeping ? (
        <>
          <Rect x={-5} y={-4} width={4} height={1.5} r={1} color={eyeColor} />
          <Rect x={1}  y={-4} width={4} height={1.5} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-3} cy={-3} r={3}   color={eyeColor} />
          <Circle cx={3}  cy={-3} r={3}   color={eyeColor} />
          <Circle cx={-2} cy={-4} r={1.5} color="rgba(167,139,250,0.92)" />
          <Circle cx={4}  cy={-4} r={1.5} color="rgba(167,139,250,0.92)" />
        </>
      )}
    </Group>
  );
}

function AquilonBody({ sleeping }: { sleeping: boolean }) {
  const topFin = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-8, -8);
    p.lineTo(-4, -20); p.lineTo(0, -14);
    p.lineTo(4, -22);  p.lineTo(8, -14);
    p.lineTo(12, -18); p.lineTo(14, -8);
    p.close();
    return p;
  }, []);
  const tailFin = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(15, 0);
    p.lineTo(24, -10); p.lineTo(28, 0);
    p.lineTo(24, 10);
    p.close();
    return p;
  }, []);
  const lowerFin = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-4, 8); p.lineTo(-2, 16);
    p.lineTo(4, 14); p.lineTo(8, 8);
    p.close();
    return p;
  }, []);

  const eyeColor = sleeping ? '#002A30' : '#001A20';
  return (
    <Group>
      {/* Tail fin */}
      <Path path={tailFin}  color="#0E7490" />
      {/* Body */}
      <RoundedRect x={-16} y={-7} width={32} height={14} r={7} color="#0891B2" />
      {/* Iridescent highlight */}
      <RoundedRect x={-13} y={-6} width={14} height={4} r={3} color="rgba(186,230,254,0.40)" />
      {/* Scale shimmer */}
      <Rect x={-4} y={-1} width={14} height={1.5} r={1} color="rgba(14,116,144,0.40)" />
      <Rect x={-2} y={3}  width={11} height={1.5} r={1} color="rgba(14,116,144,0.35)" />
      {/* Dorsal fin */}
      <Path path={topFin}   color="#0E7490" />
      {/* Lower fin */}
      <Path path={lowerFin} color="#0E7490" />
      {/* Head */}
      <Circle cx={-14} cy={0} r={9} color="#0891B2" />
      {/* Epic head glow */}
      <Circle cx={-14} cy={0} r={7} color="rgba(125,211,252,0.20)" />
      {/* Head highlight */}
      <Circle cx={-17} cy={-4} r={3} color="rgba(255,255,255,0.28)" />
      {/* Floating epic aura particles */}
      <Circle cx={0}  cy={-13} r={1.5} color="rgba(125,211,252,0.70)" />
      <Circle cx={8}  cy={-15} r={1}   color="rgba(125,211,252,0.60)" />
      <Circle cx={-6} cy={-14} r={1}   color="rgba(125,211,252,0.60)" />
      {/* Eye */}
      {sleeping ? (
        <Rect x={-20} y={-2} width={8} height={2} r={1} color={eyeColor} />
      ) : (
        <>
          <Circle cx={-16} cy={-1} r={4.5} color="white" />
          <Circle cx={-16} cy={-1} r={2.8} color={eyeColor} />
          <Circle cx={-15} cy={-2} r={1.5} color="rgba(125,211,252,0.95)" />
        </>
      )}
    </Group>
  );
}

function LumiosBody({ sleeping }: { sleeping: boolean }) {
  const leftHorn = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-6, -12);
    p.lineTo(-10, -20);
    p.moveTo(-10, -20); p.lineTo(-14, -25);
    p.moveTo(-10, -20); p.lineTo(-6,  -26);
    return p;
  }, []);
  const rightHorn = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(6, -12);
    p.lineTo(10, -20);
    p.moveTo(10, -20); p.lineTo(14, -25);
    p.moveTo(10, -20); p.lineTo(6,  -26);
    return p;
  }, []);

  const eyeColor = sleeping ? '#1A1400' : '#0A0A00';
  return (
    <Group>
      {/* Outer glow aura (epic) */}
      <Circle cx={0} cy={0} r={18} color="rgba(254,252,232,0.25)" />
      {/* Body */}
      <Circle cx={0} cy={0} r={13} color="#FEFCE8" />
      {/* Inner glow */}
      <Circle cx={0} cy={0} r={9}  color="rgba(253,230,138,0.45)" />
      {/* Body highlight */}
      <Circle cx={-5} cy={-6} r={5} color="rgba(255,255,255,0.35)" />
      {/* Bioluminescent spots */}
      <Circle cx={6}  cy={4}  r={2.5} color="rgba(253,224,71,0.90)" />
      <Circle cx={-7} cy={5}  r={2}   color="rgba(253,224,71,0.85)" />
      <Circle cx={4}  cy={-7} r={1.5} color="rgba(253,224,71,0.80)" />
      <Circle cx={-4} cy={-8} r={1.2} color="rgba(253,224,71,0.75)" />
      {/* Antler horns */}
      <Path path={leftHorn}  color="#FDE68A" style="stroke" strokeWidth={2} strokeCap="round" strokeJoin="round" />
      <Path path={rightHorn} color="#FDE68A" style="stroke" strokeWidth={2} strokeCap="round" strokeJoin="round" />
      {/* Glowing horn tips */}
      <Circle cx={-14} cy={-25} r={2}   color="rgba(254,240,138,0.95)" />
      <Circle cx={-6}  cy={-26} r={2}   color="rgba(254,240,138,0.95)" />
      <Circle cx={14}  cy={-25} r={2}   color="rgba(254,240,138,0.95)" />
      <Circle cx={6}   cy={-26} r={2}   color="rgba(254,240,138,0.95)" />
      {/* Eyes */}
      {sleeping ? (
        <>
          <Rect x={-7} y={-3} width={5} height={1.5} r={1} color={eyeColor} />
          <Rect x={2}  y={-3} width={5} height={1.5} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-4} cy={-2} r={3}   color={eyeColor} />
          <Circle cx={4}  cy={-2} r={3}   color={eyeColor} />
          <Circle cx={-3} cy={-3} r={1.5} color="rgba(253,224,71,0.95)" />
          <Circle cx={5}  cy={-3} r={1.5} color="rgba(253,224,71,0.95)" />
        </>
      )}
    </Group>
  );
}

function DraknoirBody({ sleeping }: { sleeping: boolean }) {
  const leftWing = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-8, -6);
    p.lineTo(-28, -16);
    p.lineTo(-32, 2);
    p.lineTo(-22, 10);
    p.lineTo(-8, 8);
    p.close();
    return p;
  }, []);
  const rightWing = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(8, -6);
    p.lineTo(28, -16);
    p.lineTo(32, 2);
    p.lineTo(22, 10);
    p.lineTo(8, 8);
    p.close();
    return p;
  }, []);
  const leftHorn = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-7, -14); p.lineTo(-12, -26); p.lineTo(-5, -22); p.close();
    return p;
  }, []);
  const rightHorn = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(7, -14); p.lineTo(5, -22); p.lineTo(12, -26); p.close();
    return p;
  }, []);
  const spinePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-8, -12);
    p.lineTo(-5, -18); p.lineTo(-1, -12);
    p.lineTo(2,  -16); p.lineTo(6,  -12);
    p.lineTo(8,  -14); p.lineTo(10, -10);
    return p;
  }, []);

  const eyeColor = sleeping ? '#0A0010' : '#050008';
  return (
    <Group>
      {/* Legendary aura */}
      <Circle cx={0} cy={0} r={20} color="rgba(109,40,217,0.12)" />
      {/* Wings */}
      <Path path={leftWing}  color="rgba(28,28,46,0.92)" />
      <Path path={rightWing} color="rgba(28,28,46,0.92)" />
      {/* Wing purple veins */}
      <Path path={leftWing}  color="rgba(109,40,217,0.35)" style="stroke" strokeWidth={1} />
      <Path path={rightWing} color="rgba(109,40,217,0.35)" style="stroke" strokeWidth={1} />
      {/* Body */}
      <RoundedRect x={-14} y={-12} width={28} height={24} r={10} color="#1C1C2E" />
      {/* Body purple highlight */}
      <RoundedRect x={-11} y={-11} width={10} height={5}  r={3} color="rgba(109,40,217,0.25)" />
      {/* Scale rows */}
      <Rect x={-10} y={-4} width={20} height={1.5} r={1} color="rgba(109,40,217,0.30)" />
      <Rect x={-8}  y={1}  width={16} height={1.5} r={1} color="rgba(109,40,217,0.25)" />
      {/* Spine ridge */}
      <Path
        path={spinePath}
        color="#6D28D9"
        style="stroke"
        strokeWidth={2}
        strokeCap="round"
        strokeJoin="round"
      />
      {/* Horns */}
      <Path path={leftHorn}  color="#2D2040" />
      <Path path={rightHorn} color="#2D2040" />
      {/* Horn tips glow */}
      <Circle cx={-12} cy={-26} r={2} color="rgba(109,40,217,0.90)" />
      <Circle cx={12}  cy={-26} r={2} color="rgba(109,40,217,0.90)" />
      {/* Eyes */}
      {sleeping ? (
        <>
          <Rect x={-8} y={-4} width={6} height={2} r={1} color={eyeColor} />
          <Rect x={2}  y={-4} width={6} height={2} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-5} cy={-3} r={4.5} color="rgba(109,40,217,0.80)" />
          <Circle cx={5}  cy={-3} r={4.5} color="rgba(109,40,217,0.80)" />
          <Circle cx={-5} cy={-3} r={2.8} color={eyeColor} />
          <Circle cx={5}  cy={-3} r={2.8} color={eyeColor} />
          <Circle cx={-4} cy={-4} r={1.2} color="rgba(196,181,253,0.95)" />
          <Circle cx={6}  cy={-4} r={1.2} color="rgba(196,181,253,0.95)" />
        </>
      )}
    </Group>
  );
}

/** Safety fallback — should never be reached with a valid speciesId */
function FallbackBody({ speciesId, sleeping }: { speciesId: string; sleeping: boolean }) {
  const species = SPECIES_MAP.get(speciesId);
  const color   = species?.primaryColor ?? '#888';
  const eyeColor = sleeping ? '#222' : '#111';
  return (
    <Group>
      <RoundedRect x={-13} y={-10} width={26} height={20} r={10} color={color} />
      <RoundedRect x={-10} y={-9}  width={10} height={5}  r={3}  color="rgba(255,255,255,0.25)" />
      {sleeping ? (
        <>
          <Rect x={-7} y={-3} width={5} height={1.5} r={1} color={eyeColor} />
          <Rect x={2}  y={-3} width={5} height={1.5} r={1} color={eyeColor} />
        </>
      ) : (
        <>
          <Circle cx={-4} cy={-2} r={2.5} color={eyeColor} />
          <Circle cx={4}  cy={-2} r={2.5} color={eyeColor} />
          <Circle cx={-3} cy={-3} r={1}   color="rgba(255,255,255,0.55)" />
          <Circle cx={5}  cy={-3} r={1}   color="rgba(255,255,255,0.55)" />
        </>
      )}
    </Group>
  );
}

function SpeciesBody({ speciesId, sleeping, shiny }: {
  speciesId: string;
  sleeping: boolean;
  shiny: boolean;
}) {
  let body: React.ReactElement;
  switch (speciesId) {
    case 'feuillon': body = <FeuillonBody sleeping={sleeping} />; break;
    case 'broutard': body = <BroutardBody sleeping={sleeping} />; break;
    case 'boussin':  body = <BoussinBody  sleeping={sleeping} />; break;
    case 'mellior':  body = <MelliorBody  sleeping={sleeping} />; break;
    case 'flottin':  body = <FlottinBody  sleeping={sleeping} />; break;
    case 'sirpio':    body = <SirpioBody    sleeping={sleeping} />; break;
    case 'rampex':    body = <RampexBody    sleeping={sleeping} />; break;
    case 'gribou':    body = <GribouBody    sleeping={sleeping} />; break;
    case 'crochon':   body = <CrochonBody   sleeping={sleeping} />; break;
    case 'stalagor':  body = <StalagorBody  sleeping={sleeping} />; break;
    case 'scorpilou': body = <ScorpilouBody sleeping={sleeping} />; break;
    case 'dunor':     body = <DunorBody     sleeping={sleeping} />; break;
    case 'griffax':   body = <GriffaxBody   sleeping={sleeping} />; break;
    case 'rughor':    body = <RughorBody     sleeping={sleeping} />; break;
    case 'venomoth':  body = <VenomothBody  sleeping={sleeping} />; break;
    case 'aquilon':   body = <AquilonBody   sleeping={sleeping} />; break;
    case 'lumios':    body = <LumiosBody    sleeping={sleeping} />; break;
    case 'draknoir':  body = <DraknoirBody  sleeping={sleeping} />; break;
    default:          body = <FallbackBody speciesId={speciesId} sleeping={sleeping} />; break;
  }
  return (
    <Group>
      {body}
      {shiny    && <ShimmerOverlay />}
      {sleeping && <SleepOverlay  />}
    </Group>
  );
}

// ---------------------------------------------------------------------------
// CreatureSprite — main animated component
// ---------------------------------------------------------------------------

export interface CreatureSpriteProps {
  creature: Creature;
}

const CreatureSprite = memo(function CreatureSprite({ creature }: CreatureSpriteProps) {
  const isSleeping  = creature.state === 'sleeping';
  const isStumbling = creature.state === 'stumbling';

  // ── Pixel-position animation ─────────────────────────────────────────────
  const posX = useSharedValue(creature.position.x);
  const posY = useSharedValue(creature.position.y);

  useEffect(() => {
    const dx   = creature.targetPosition.x - posX.value;
    const dy   = creature.targetPosition.y - posY.value;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) return;
    const duration = (dist / TILE_SIZE) * 2000;
    posX.value = withTiming(creature.targetPosition.x, {
      duration,
      easing: Easing.linear,
    });
    posY.value = withTiming(creature.targetPosition.y, {
      duration,
      easing: Easing.linear,
    });
  }, [creature.targetPosition.x, creature.targetPosition.y]);

  // ── Body scale animation (sleeping / stumbling) ──────────────────────────
  const bodyScale = useSharedValue(1.0);

  useEffect(() => {
    cancelAnimation(bodyScale);
    if (isSleeping) {
      bodyScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0,  { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else if (isStumbling) {
      bodyScale.value = withSequence(
        withTiming(1.22, { duration: 140, easing: Easing.out(Easing.back(2)) }),
        withTiming(1.0,  { duration: 140, easing: Easing.in(Easing.quad)     }),
      );
    } else {
      bodyScale.value = withTiming(1.0, { duration: 200 });
    }
    return () => cancelAnimation(bodyScale);
  }, [creature.state]);

  // ── Shiny animation ───────────────────────────────────────────────────────
  const shimmerOp = useSharedValue(creature.isShiny ? 0.35 : 0);

  useEffect(() => {
    if (!creature.isShiny) { shimmerOp.value = 0; return; }
    shimmerOp.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 900 }),
        withTiming(0.35, { duration: 900 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(shimmerOp);
  }, [creature.isShiny]);

  // ── Derived transforms ────────────────────────────────────────────────────
  const posTransform = useDerivedValue(() => [
    { translateX: posX.value },
    { translateY: posY.value },
  ]);

  const bodyTransform = useDerivedValue(() => [
    { scale: bodyScale.value },
  ]);

  return (
    <Group transform={posTransform}>
      {/* Body + species detail */}
      <Group transform={bodyTransform}>
        <SpeciesBody
          speciesId={creature.speciesId}
          sleeping={isSleeping}
          shiny={creature.isShiny}
        />
      </Group>

      {/* ZZZ bubbles (only while sleeping) */}
      {isSleeping && <ZzzBubbles />}

      {/* Heart particle (fires on each affection) */}
      <HeartParticle trigger={creature.lastAffectedAt} />
    </Group>
  );
});

export default CreatureSprite;
