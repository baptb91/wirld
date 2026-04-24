import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCreatureStore, Creature } from '../../store/creatureStore';
import { useResourceStore } from '../../store/resourceStore';
import { SoundService } from '../../services/SoundService';
import { SPECIES_MAP, RARITY_COLOR } from '../../constants/creatures';
import {
  RESOURCE_DISPLAY,
  RESOURCE_DISPLAY_FALLBACK,
} from '../../constants/resourceDisplay';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAIT_FOR_TYPE: Record<string, string> = {
  herbivore: 'berries',
  carnivore: 'meat',
  aquatic:   'lure',
};

const XP_FOR_RARITY: Record<string, number> = {
  common: 10, uncommon: 25, rare: 50, epic: 100, legendary: 250,
};

const RARITY_LABEL: Record<string, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare',
  epic: 'Epic', legendary: 'Legendary',
};

const BAIT_DURATION_MS  = 3_000;
const CATCH_DURATION_MS = 2_000;
const CONFETTI_COUNT    = 12;
const CONFETTI_COLORS   = ['#FFD700', '#FF69B4', '#00BFFF', '#ADFF2F', '#FF6347', '#DA70D6'];

type Phase = 'idle' | 'baiting' | 'catching' | 'success' | 'failure';

// ---------------------------------------------------------------------------
// Confetti particle
// ---------------------------------------------------------------------------

function ConfettiParticle({ index }: { index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const vals = useRef({
    offsetX:  (index / CONFETTI_COUNT - 0.5) * 220 + (Math.random() - 0.5) * 50,
    riseY:    -(85 + Math.random() * 65),
    rotation: Math.floor(Math.random() * 540),
  }).current;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 65),
      Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left: '50%' as unknown as number,
        width: 9,
        height: 9,
        backgroundColor: color,
        borderRadius: 2,
        opacity: anim.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] }),
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, vals.offsetX],
            }),
          },
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, vals.riseY],
            }),
          },
          {
            rotate: anim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', `${vals.rotation}deg`],
            }),
          },
        ],
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// CaptureOverlay
// ---------------------------------------------------------------------------

interface Props {
  creature: Creature | null;
  onClose: () => void;
}

export default function CaptureOverlay({ creature, onClose }: Props) {
  const [phase, setPhaseState] = useState<Phase>('idle');
  const phaseRef   = useRef<Phase>('idle');
  const didCapture = useRef(false);
  const baitAnim   = useRef(new Animated.Value(0)).current;
  const holdAnim   = useRef(new Animated.Value(0)).current;
  const bgOpacity  = useRef(new Animated.Value(0)).current;

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const def    = creature ? SPECIES_MAP.get(creature.speciesId) : null;
  const baitId = def ? (BAIT_FOR_TYPE[def.type] ?? 'berries') : 'berries';
  const baitDef   = RESOURCE_DISPLAY[baitId] ?? RESOURCE_DISPLAY_FALLBACK;
  const baitCount = useResourceStore((s) => s.resources[baitId] ?? 0);

  useEffect(() => {
    if (!creature) return;
    setPhase('idle');
    didCapture.current = false;
    baitAnim.setValue(0);
    holdAnim.setValue(0);
    Animated.timing(bgOpacity, {
      toValue: 1, duration: 200, useNativeDriver: true,
    }).start();
  }, [creature?.id]);

  const handleClose = useCallback(() => {
    Animated.timing(bgOpacity, {
      toValue: 0, duration: 150, useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, bgOpacity]);

  const doCapture = useCallback(() => {
    if (!creature || !def) return;
    setPhase('success');
    SoundService.play('captureSuccess');
    const xp = XP_FOR_RARITY[def.rarity] ?? 10;
    useCreatureStore.getState().updateCreature(creature.id, { wildExpiresAt: null });
    useResourceStore.getState().addXP(xp);
    setTimeout(handleClose, 2200);
  }, [creature, def, setPhase, handleClose]);

  const doFail = useCallback(() => {
    if (!creature) return;
    setPhase('failure');
    useCreatureStore.getState().removeCreature(creature.id);
    setTimeout(handleClose, 1400);
  }, [creature, setPhase, handleClose]);

  const handleBait = useCallback(() => {
    if (phaseRef.current !== 'idle') return;
    const spent = useResourceStore.getState().spendResource(baitId, 1);
    if (!spent) return;

    setPhase('baiting');
    baitAnim.setValue(0);
    Animated.timing(baitAnim, {
      toValue: 1,
      duration: BAIT_DURATION_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setPhase('catching');
    });
  }, [baitId, baitAnim, setPhase]);

  const handlePressIn = useCallback(() => {
    if (phaseRef.current !== 'catching') return;
    holdAnim.setValue(0);
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: CATCH_DURATION_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !didCapture.current) {
        didCapture.current = true;
        doCapture();
      }
    });
  }, [holdAnim, doCapture]);

  const handlePressOut = useCallback(() => {
    if (phaseRef.current !== 'catching' || didCapture.current) return;
    holdAnim.stopAnimation();
    holdAnim.setValue(0);
    doFail();
  }, [holdAnim, doFail]);

  if (!creature || !def) return null;

  const rarityColor = RARITY_COLOR[def.rarity] ?? '#888';
  const xpReward    = XP_FOR_RARITY[def.rarity] ?? 10;

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: bgOpacity }]}>
        <Pressable style={styles.backdropTouch} onPress={phase === 'idle' ? handleClose : undefined}>
          <Pressable style={[styles.card, { borderColor: rarityColor }]} onPress={() => {}}>

            {/* Close button (idle only) */}
            {phase === 'idle' && (
              <Pressable style={styles.closeBtn} onPress={handleClose}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            )}

            {/* Rarity + shiny badges */}
            <View style={styles.headerRow}>
              <View style={[styles.rarityChip, { backgroundColor: rarityColor }]}>
                <Text style={styles.rarityText}>{RARITY_LABEL[def.rarity] ?? def.rarity}</Text>
              </View>
              {creature.isShiny && (
                <View style={styles.shinyChip}>
                  <Text style={styles.shinyText}>✨ SHINY</Text>
                </View>
              )}
            </View>

            <Text style={styles.creatureName}>{creature.name}</Text>
            <Text style={styles.speciesName}>{def.name}</Text>

            {/* Bait info */}
            <View style={styles.baitRow}>
              <Text style={styles.baitLabel}>Bait needed:</Text>
              <View style={styles.baitChip}>
                <Text style={styles.baitEmoji}>{baitDef.emoji}</Text>
                <Text style={[styles.baitName, { color: baitDef.color }]}>{baitDef.label}</Text>
                <Text style={[styles.baitStock, baitCount === 0 && styles.baitEmpty]}>
                  ×{baitCount}
                </Text>
              </View>
            </View>

            {/* ── Phase: idle ── */}
            {phase === 'idle' && (
              <Pressable
                style={[
                  styles.baitBtn,
                  { backgroundColor: baitCount > 0 ? rarityColor : '#aaa' },
                ]}
                onPress={handleBait}
                disabled={baitCount === 0}
              >
                <Text style={styles.baitBtnText}>
                  {baitCount === 0 ? 'No bait!' : `Place ${baitDef.emoji} Bait`}
                </Text>
              </Pressable>
            )}

            {/* ── Phase: baiting ── */}
            {phase === 'baiting' && (
              <View style={styles.progressSection}>
                <Text style={styles.phaseHint}>Creature approaching…</Text>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: rarityColor,
                        width: baitAnim.interpolate({
                          inputRange:  [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* ── Phase: catching ── */}
            {phase === 'catching' && (
              <View style={styles.catchSection}>
                <Text style={styles.phaseHint}>Hold to catch!</Text>
                <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
                  <View style={[styles.holdRing, { borderColor: rarityColor }]}>
                    <Animated.View
                      style={[
                        styles.holdFill,
                        {
                          backgroundColor: rarityColor,
                          transform: [
                            {
                              scale: holdAnim.interpolate({
                                inputRange:  [0, 1],
                                outputRange: [0.05, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                    <Text style={styles.holdIcon}>🫴</Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* ── Phase: success ── */}
            {phase === 'success' && (
              <View style={styles.resultSection}>
                <View style={styles.confettiBox}>
                  {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
                    <ConfettiParticle key={i} index={i} />
                  ))}
                </View>
                <Text style={styles.successText}>Captured! 🎉</Text>
                <Text style={styles.xpText}>+{xpReward} XP</Text>
              </View>
            )}

            {/* ── Phase: failure ── */}
            {phase === 'failure' && (
              <View style={styles.resultSection}>
                <Text style={styles.failText}>Ran away… 💨</Text>
              </View>
            )}

          </Pressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouch: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 300,
    backgroundColor: '#FFFDF4',
    borderRadius: 22,
    borderWidth: 3,
    padding: 22,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 14,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 12, color: '#555', fontWeight: '700' },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 2,
    marginTop: 8,
  },
  rarityChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  shinyChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF3B0',
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  shinyText: { color: '#B8860B', fontWeight: '800', fontSize: 12 },
  creatureName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  speciesName: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  baitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  baitLabel: { fontSize: 12, color: '#777' },
  baitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  baitEmoji: { fontSize: 15 },
  baitName: { fontSize: 12, fontWeight: '700' },
  baitStock: { fontSize: 12, color: '#444', fontWeight: '600' },
  baitEmpty: { color: '#DC2626' },
  baitBtn: {
    marginTop: 6,
    paddingHorizontal: 30,
    paddingVertical: 13,
    borderRadius: 16,
  },
  baitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  progressSection: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingBottom: 4,
  },
  phaseHint: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  catchSection: {
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingBottom: 4,
  },
  holdRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  holdFill: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    top: 3,
    left: 3,
  },
  holdIcon: { fontSize: 32, zIndex: 1 },
  resultSection: {
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingBottom: 6,
  },
  confettiBox: {
    width: '100%',
    height: 110,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  successText: { fontSize: 24, fontWeight: '800', color: '#059669' },
  xpText: { fontSize: 16, fontWeight: '700', color: '#7C3AED' },
  failText: { fontSize: 20, fontWeight: '700', color: '#DC2626' },
});
