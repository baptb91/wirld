/**
 * BreedingPanel — shown when the player taps a habitat.
 *
 * States:
 *   1. Gestating: shows time remaining until baby arrives.
 *   2. Breed-ready: shows the pair and a "Start Breeding" button.
 *   3. Conditions not met: shows which conditions are missing.
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCreatureStore } from '../../store/creatureStore';
import { useMapStore, HabitatPlacement } from '../../store/mapStore';
import { SPECIES_MAP, RARITY_COLOR } from '../../constants/creatures';
import { HABITAT_MAP } from '../../constants/habitats';
import { findBreedPair, GESTATION_MS } from '../../engine/BreedingEngine';
import { useAdStore, GESTATION_SPEEDUP_MS } from '../../store/adStore';
import { usePurchaseStore } from '../../store/purchaseStore';
import { AdService } from '../../services/AdService';

interface Props {
  habitatId: string;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return 'Ready!';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function BreedingPanel({ habitatId, onClose }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [adLoading, setAdLoading] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const isAdFree              = usePurchaseStore((s) => s.isAdFree);
  const isSpeedUpUsed         = useAdStore((s) => s.isGestationSpeedUpUsed);
  const markSpeedUpUsed       = useAdStore((s) => s.markGestationSpeedUpUsed);

  const creatures   = useCreatureStore((s) => s.creatures);
  const habitat     = useMapStore((s) => s.habitats.find((h) => h.id === habitatId));
  const updateHabitat = useMapStore((s) => s.updateHabitat);

  if (!habitat) return null;

  const habitatDef = HABITAT_MAP.get(habitat.habitatTypeId);
  const isGestating = !!(habitat.gestationEndsAt && habitat.gestatingCreatureId);
  const pair = isGestating ? null : findBreedPair(habitat, creatures);

  function handleStartBreeding() {
    if (!pair) return;
    const [c1] = pair;
    const speciesDef = SPECIES_MAP.get(c1.speciesId);
    if (!speciesDef) return;
    const gestationMs = GESTATION_MS[speciesDef.rarity];
    updateHabitat(habitatId, {
      gestatingSpeciesId:  c1.speciesId,
      gestationEndsAt:     Date.now() + gestationMs,
      gestatingCreatureId: c1.id,
    });
    onClose();
  }

  // ── Gestating view ─────────────────────────────────────────────────────────
  if (isGestating) {
    const gestatingCreature = creatures.find((c) => c.id === habitat.gestatingCreatureId);
    const speciesDef = SPECIES_MAP.get(habitat.gestatingSpeciesId ?? '');
    const remaining  = (habitat.gestationEndsAt ?? 0) - now;
    const rarity     = speciesDef?.rarity ?? 'common';

    const speedUpKey  = `${habitatId}:${habitat.gestationEndsAt}`;
    const speedUpUsed = isSpeedUpUsed(speedUpKey);
    const canSpeedUp  = !isAdFree && !speedUpUsed && remaining > GESTATION_SPEEDUP_MS;

    async function handleSpeedUp() {
      if (!canSpeedUp || adLoading || !habitat) return;
      setAdLoading(true);
      const earned = await AdService.showRewarded();
      setAdLoading(false);
      if (earned) {
        updateHabitat(habitatId, {
          gestationEndsAt: (habitat.gestationEndsAt ?? 0) - GESTATION_SPEEDUP_MS,
        });
        markSpeedUpUsed(speedUpKey);
        setNow(Date.now());
      }
    }

    return (
      <Modal transparent visible animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.emoji}>🥚</Text>
              <Text style={styles.title}>Gestation in Progress</Text>
              <Text style={styles.subtitle}>{habitatDef?.name ?? 'Habitat'}</Text>
            </View>

            <View style={styles.body}>
              <View style={styles.speciesRow}>
                <Text style={[styles.rarityBadge, { color: RARITY_COLOR[rarity] }]}>
                  {rarity.toUpperCase()}
                </Text>
                <Text style={styles.speciesName}>{speciesDef?.name ?? '—'}</Text>
              </View>

              <View style={styles.timerBox}>
                <Text style={styles.timerLabel}>Time remaining</Text>
                <Text style={[styles.timerValue, remaining <= 0 && styles.timerDone]}>
                  {remaining <= 0 ? '🎉 Almost ready!' : formatDuration(remaining)}
                </Text>
              </View>

              {gestatingCreature && (
                <Text style={styles.gestatingNote}>
                  🐾 {gestatingCreature.name} is gestating
                </Text>
              )}
            </View>

            {canSpeedUp && (
              <Pressable
                style={({ pressed }) => [styles.speedUpBtn, pressed && { opacity: 0.75 }]}
                onPress={handleSpeedUp}
                disabled={adLoading}
              >
                <Text style={styles.speedUpBtnText}>
                  {adLoading ? 'Loading ad…' : '▶ Watch ad for −1h'}
                </Text>
              </Pressable>
            )}

            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // ── Breed-ready view ───────────────────────────────────────────────────────
  if (pair) {
    const [c1, c2] = pair;
    const speciesDef = SPECIES_MAP.get(c1.speciesId);
    const rarity     = speciesDef?.rarity ?? 'common';
    const gestationMs = GESTATION_MS[rarity];

    return (
      <Modal transparent visible animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.header, styles.headerBreed]}>
              <Text style={styles.emoji}>❤️</Text>
              <Text style={styles.title}>Ready to Breed!</Text>
              <Text style={styles.subtitle}>{habitatDef?.name ?? 'Habitat'}</Text>
            </View>

            <View style={styles.body}>
              <View style={styles.pairRow}>
                <View style={styles.creatureCard}>
                  <Text style={styles.creatureName}>{c1.name}</Text>
                  <Text style={styles.creatureInfo}>Lv {c1.level} · {speciesDef?.name}</Text>
                </View>
                <Text style={styles.pairHeart}>♥</Text>
                <View style={styles.creatureCard}>
                  <Text style={styles.creatureName}>{c2.name}</Text>
                  <Text style={styles.creatureInfo}>Lv {c2.level} · {speciesDef?.name}</Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Species  </Text>
                  <Text style={[styles.infoValue, { color: RARITY_COLOR[rarity] }]}>
                    {speciesDef?.name} ({rarity})
                  </Text>
                </Text>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Gestation  </Text>
                  <Text style={styles.infoValue}>{formatDuration(gestationMs)}</Text>
                </Text>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Result  </Text>
                  <Text style={styles.infoValue}>Level 1 {speciesDef?.name}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [styles.breedBtn, pressed && styles.breedBtnPressed]}
                onPress={handleStartBreeding}
              >
                <Text style={styles.breedBtnText}>Start Breeding</Text>
              </Pressable>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // ── Conditions not met ─────────────────────────────────────────────────────
  const assigned = creatures.filter(
    (c) => habitat.assignedCreatureIds.includes(c.id) && c.wildExpiresAt === null,
  );

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.emoji}>🏠</Text>
            <Text style={styles.title}>{habitatDef?.name ?? 'Habitat'}</Text>
            <Text style={styles.subtitle}>Breeding conditions</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.conditionsTitle}>Requirements to breed:</Text>
            <Text style={styles.condition}>• 2 creatures of the same species</Text>
            <Text style={styles.condition}>• Both must be level 3 or higher</Text>
            <Text style={styles.condition}>• Both assigned to this habitat</Text>
            <Text style={styles.condition}>• Each must have slept 1 full cycle here</Text>

            {assigned.length > 0 && (
              <View style={styles.assignedSection}>
                <Text style={styles.assignedTitle}>Assigned creatures:</Text>
                <ScrollView style={styles.assignedList}>
                  {assigned.map((c) => {
                    const def = SPECIES_MAP.get(c.speciesId);
                    const cycles = c.sleepCyclesInHabitat ?? 0;
                    return (
                      <View key={c.id} style={styles.assignedRow}>
                        <View style={styles.assignedInfo}>
                          <Text style={styles.assignedName}>{c.name}</Text>
                          <Text style={styles.assignedSpec}>
                            {def?.name} · Lv {c.level} · {cycles} cycle{cycles !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <View style={styles.condChecks}>
                          <Text style={c.level >= 3 ? styles.checkOk : styles.checkNo}>
                            {c.level >= 3 ? '✓' : '✗'} Lv≥3
                          </Text>
                          <Text style={cycles >= 1 ? styles.checkOk : styles.checkNo}>
                            {cycles >= 1 ? '✓' : '✗'} Slept
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.60)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  card: {
    width:           320,
    maxHeight:       520,
    backgroundColor: '#0E0E12',
    borderRadius:    18,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     'rgba(236,72,153,0.35)',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.5,
    shadowRadius:    10,
    elevation:       14,
  },

  header: {
    backgroundColor: '#1F1F2E',
    paddingVertical: 14,
    alignItems:      'center',
    gap:             3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerBreed: {
    backgroundColor: '#2D1020',
  },
  emoji:    { fontSize: 28 },
  title:    { color: '#fff', fontWeight: '800', fontSize: 18 },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },

  body: {
    paddingHorizontal: 16,
    paddingVertical:   14,
    gap:               10,
  },

  // Gestating
  speciesRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  rarityBadge: {
    fontWeight: '700',
    fontSize:   11,
  },
  speciesName: {
    color:      '#fff',
    fontWeight: '700',
    fontSize:   16,
  },
  timerBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius:    12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap:             4,
    alignItems:      'center',
  },
  timerLabel: { color: '#888', fontSize: 12 },
  timerValue: { color: '#fff', fontWeight: '800', fontSize: 22 },
  timerDone:  { color: '#34D399' },
  gestatingNote: { color: '#aaa', fontSize: 12, textAlign: 'center' },

  // Breed-ready pair view
  pairRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  creatureCard: {
    flex:              1,
    backgroundColor:   'rgba(255,255,255,0.06)',
    borderRadius:      10,
    paddingVertical:   8,
    paddingHorizontal: 10,
    alignItems:        'center',
    gap:               3,
  },
  creatureName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  creatureInfo: { color: '#888', fontSize: 11 },
  pairHeart: { color: '#EC4899', fontSize: 22, fontWeight: '800' },

  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius:    10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap:             5,
  },
  infoRow:   { color: '#ccc', fontSize: 13 },
  infoLabel: { color: '#888' },
  infoValue: { color: '#fff', fontWeight: '600' },

  footer: {
    paddingHorizontal: 16,
    paddingBottom:     16,
    gap:               8,
  },
  breedBtn: {
    backgroundColor: '#9D174D',
    borderRadius:    12,
    paddingVertical: 13,
    alignItems:      'center',
  },
  breedBtnPressed: { backgroundColor: '#BE185D' },
  breedBtnText: {
    color:      '#fff',
    fontWeight: '800',
    fontSize:   16,
  },

  // Conditions not met
  conditionsTitle: {
    color:      '#aaa',
    fontSize:   13,
    fontWeight: '600',
    marginBottom: 4,
  },
  condition: { color: '#888', fontSize: 13, lineHeight: 20 },

  assignedSection: { marginTop: 8, gap: 6 },
  assignedTitle: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  assignedList: { maxHeight: 140 },
  assignedRow: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(255,255,255,0.05)',
    borderRadius:      8,
    paddingVertical:   8,
    paddingHorizontal: 10,
    marginBottom:      4,
    gap:               8,
  },
  assignedInfo: { flex: 1, gap: 2 },
  assignedName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  assignedSpec: { color: '#888', fontSize: 11 },
  condChecks: { flexDirection: 'row', gap: 6 },
  checkOk: { color: '#34D399', fontSize: 11, fontWeight: '700' },
  checkNo: { color: '#EF4444', fontSize: 11, fontWeight: '700' },

  speedUpBtn: {
    marginHorizontal: 14,
    marginBottom:     8,
    backgroundColor:  '#6D28D9',
    borderRadius:     12,
    paddingVertical:  10,
    alignItems:       'center',
  },
  speedUpBtnText: {
    color:      '#fff',
    fontWeight: '800',
    fontSize:   13,
  },
  closeBtn: {
    margin:          14,
    backgroundColor: '#1F2937',
    borderRadius:    12,
    paddingVertical: 11,
    alignItems:      'center',
  },
  closeBtnText: {
    color:      '#fff',
    fontWeight: '700',
    fontSize:   15,
  },
});
