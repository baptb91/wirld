/**
 * HybridBreedingPanel — shown when a creature is dragged onto the Laboratory,
 * or when the player taps a Laboratory that is already gestating.
 *
 * States:
 *   1. Gestating: shows time remaining and the resulting hybrid species.
 *   2. Select partner: first creature is pre-selected; lists compatible partners.
 *   3. Preview: both selected — shows first + second + hybrid result + confirm.
 *   4. Idle: no pre-selected creature; shows instructions.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCreatureStore } from '../../store/creatureStore';
import { useMapStore } from '../../store/mapStore';
import { SPECIES_MAP, RARITY_COLOR } from '../../constants/creatures';
import {
  findHybridResult,
  getCompatiblePartners,
  hybridGestationMs,
  HYBRID_RECIPES,
} from '../../engine/HybridBreedingEngine';
import { useAdStore, GESTATION_SPEEDUP_MS } from '../../store/adStore';
import { AdService } from '../../services/AdService';

interface Props {
  buildingId: string;
  /** Pre-selected first parent (from drag-and-drop). */
  firstCreatureId?: string;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return 'Ready!';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function HybridBreedingPanel({ buildingId, firstCreatureId, onClose }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedSecondId, setSelectedSecondId] = useState<string | null>(null);
  const [adLoading, setAdLoading] = useState(false);

  const isPremium       = useAdStore((s) => s.isPremium);
  const isSpeedUpUsed   = useAdStore((s) => s.isGestationSpeedUpUsed);
  const markSpeedUpUsed = useAdStore((s) => s.markGestationSpeedUpUsed);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const creatures    = useCreatureStore((s) => s.creatures);
  const building     = useMapStore((s) => s.buildings.find((b) => b.id === buildingId));
  const updateBuilding = useMapStore((s) => s.updateBuilding);

  if (!building) return null;

  const isGestating  = !!(building.hybridGestationEndsAt && building.hybridSpeciesId);
  const firstCreature = firstCreatureId ? creatures.find((c) => c.id === firstCreatureId) : null;

  // Compatible partners for the pre-selected creature
  const compatiblePartnerSpecies = useMemo(() => {
    if (!firstCreature) return new Set<string>();
    return new Set(getCompatiblePartners(firstCreature.speciesId));
  }, [firstCreature]);

  // All owned creatures that are valid second parents
  const candidatePartners = useMemo(() => {
    if (!firstCreature) return [];
    return creatures.filter(
      (c) =>
        c.id !== firstCreature.id &&
        c.wildExpiresAt === null &&
        compatiblePartnerSpecies.has(c.speciesId),
    );
  }, [creatures, firstCreature, compatiblePartnerSpecies]);

  const secondCreature = selectedSecondId
    ? creatures.find((c) => c.id === selectedSecondId) ?? null
    : null;

  const hybridResultId = firstCreature && secondCreature
    ? findHybridResult(firstCreature.speciesId, secondCreature.speciesId)
    : null;

  const hybridResultDef = hybridResultId ? SPECIES_MAP.get(hybridResultId) : null;

  function handleConfirm() {
    if (!hybridResultId || !firstCreature || !secondCreature) return;
    const gestMs = hybridGestationMs(hybridResultId);
    updateBuilding(buildingId, {
      hybridSpeciesId:       hybridResultId,
      hybridGestationEndsAt: Date.now() + gestMs,
      hybridParentIds:       [firstCreature.id, secondCreature.id],
    });
    onClose();
  }

  // ── Gestating view ─────────────────────────────────────────────────────────
  if (isGestating) {
    const resultDef  = SPECIES_MAP.get(building.hybridSpeciesId!);
    const remaining  = (building.hybridGestationEndsAt ?? 0) - now;
    const rarity     = resultDef?.rarity ?? 'rare';
    const parentA    = creatures.find((c) => c.id === building.hybridParentIds?.[0]);
    const parentB    = creatures.find((c) => c.id === building.hybridParentIds?.[1]);

    const speedUpKey  = `${buildingId}:${building.hybridGestationEndsAt}`;
    const speedUpUsed = isSpeedUpUsed(speedUpKey);
    const canSpeedUp  = !isPremium && !speedUpUsed && remaining > GESTATION_SPEEDUP_MS;

    async function handleSpeedUp() {
      if (!canSpeedUp || adLoading || !building) return;
      setAdLoading(true);
      const earned = await AdService.showRewarded();
      setAdLoading(false);
      if (earned) {
        updateBuilding(buildingId, {
          hybridGestationEndsAt: (building.hybridGestationEndsAt ?? 0) - GESTATION_SPEEDUP_MS,
        });
        markSpeedUpUsed(speedUpKey);
        setNow(Date.now());
      }
    }

    return (
      <Modal transparent visible animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.header, styles.headerLab]}>
              <Text style={styles.emoji}>🧬</Text>
              <Text style={styles.title}>Hybrid Gestation</Text>
              <Text style={styles.subtitle}>Laboratory</Text>
            </View>

            <View style={styles.body}>
              <View style={styles.speciesRow}>
                <Text style={[styles.rarityBadge, { color: RARITY_COLOR[rarity] }]}>
                  {rarity.toUpperCase()}
                </Text>
                <Text style={styles.speciesName}>{resultDef?.name ?? '—'}</Text>
              </View>

              <View style={styles.timerBox}>
                <Text style={styles.timerLabel}>Time remaining</Text>
                <Text style={[styles.timerValue, remaining <= 0 && styles.timerDone]}>
                  {remaining <= 0 ? '🎉 Almost ready!' : formatDuration(remaining)}
                </Text>
              </View>

              {(parentA || parentB) && (
                <View style={styles.parentsRow}>
                  {parentA && <Text style={styles.parentChip}>{parentA.name}</Text>}
                  <Text style={styles.plusSign}>×</Text>
                  {parentB && <Text style={styles.parentChip}>{parentB.name}</Text>}
                </View>
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

  // ── Preview view (both selected) ───────────────────────────────────────────
  if (firstCreature && secondCreature && hybridResultDef) {
    const rarity = hybridResultDef.rarity;
    const gestMs = hybridGestationMs(hybridResultId!);

    return (
      <Modal transparent visible animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.header, styles.headerLab]}>
              <Text style={styles.emoji}>🧬</Text>
              <Text style={styles.title}>Hybrid Preview</Text>
              <Text style={styles.subtitle}>Laboratory</Text>
            </View>

            <View style={styles.body}>
              {/* Parents */}
              <View style={styles.pairRow}>
                <View style={styles.creatureCard}>
                  <Text style={styles.creatureName}>{firstCreature.name}</Text>
                  <Text style={styles.creatureInfo}>
                    {SPECIES_MAP.get(firstCreature.speciesId)?.name} · Lv {firstCreature.level}
                  </Text>
                </View>
                <Text style={styles.combineSign}>+</Text>
                <View style={styles.creatureCard}>
                  <Text style={styles.creatureName}>{secondCreature.name}</Text>
                  <Text style={styles.creatureInfo}>
                    {SPECIES_MAP.get(secondCreature.speciesId)?.name} · Lv {secondCreature.level}
                  </Text>
                </View>
              </View>

              <Text style={styles.arrowDown}>↓</Text>

              {/* Result */}
              <View style={[styles.resultCard, { borderColor: RARITY_COLOR[rarity] }]}>
                <Text style={styles.resultEmoji}>🧬</Text>
                <View style={styles.resultInfo}>
                  <Text style={[styles.resultName, { color: RARITY_COLOR[rarity] }]}>
                    {hybridResultDef.name}
                  </Text>
                  <Text style={styles.resultDetail}>
                    {rarity.toUpperCase()} · {hybridResultDef.type} · Lv 1
                  </Text>
                  <Text style={styles.resultDetail}>
                    Gestation: {formatDuration(gestMs)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmBtnText}>Begin Gestation</Text>
              </Pressable>
              <Pressable style={styles.backBtn} onPress={() => setSelectedSecondId(null)}>
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // ── Partner selection (first creature pre-selected) ────────────────────────
  if (firstCreature) {
    const firstDef = SPECIES_MAP.get(firstCreature.speciesId);

    return (
      <Modal transparent visible animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.header, styles.headerLab]}>
              <Text style={styles.emoji}>🧬</Text>
              <Text style={styles.title}>Select Partner</Text>
              <Text style={styles.subtitle}>{firstCreature.name} ({firstDef?.name})</Text>
            </View>

            <View style={styles.body}>
              {candidatePartners.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No compatible partners owned.</Text>
                  <Text style={styles.emptyHint}>
                    {firstDef?.name} pairs with:{' '}
                    {getCompatiblePartners(firstCreature.speciesId)
                      .map((id) => SPECIES_MAP.get(id)?.name ?? id)
                      .join(', ')}
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.listScroll}>
                  {candidatePartners.map((c) => {
                    const def   = SPECIES_MAP.get(c.speciesId);
                    const result = findHybridResult(firstCreature.speciesId, c.speciesId);
                    const resDef = result ? SPECIES_MAP.get(result) : null;
                    return (
                      <Pressable
                        key={c.id}
                        style={({ pressed }) => [
                          styles.partnerRow,
                          pressed && styles.partnerRowPressed,
                        ]}
                        onPress={() => setSelectedSecondId(c.id)}
                      >
                        <View style={styles.partnerInfo}>
                          <Text style={styles.partnerName}>{c.name}</Text>
                          <Text style={styles.partnerSpec}>
                            {def?.name} · Lv {c.level}
                          </Text>
                        </View>
                        {resDef && (
                          <View style={styles.partnerResult}>
                            <Text style={styles.partnerResultLabel}>→</Text>
                            <Text style={[
                              styles.partnerResultName,
                              { color: RARITY_COLOR[resDef.rarity] },
                            ]}>
                              {resDef.name}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
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

  // ── Idle view: show all recipes as reference ───────────────────────────────
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.header, styles.headerLab]}>
            <Text style={styles.emoji}>🔬</Text>
            <Text style={styles.title}>Laboratory</Text>
            <Text style={styles.subtitle}>Hybrid Breeding Facility</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.idleHint}>
              Long-press a creature and drag it onto this building to begin a hybrid breed.
            </Text>

            <Text style={styles.recipesTitle}>Known Recipes</Text>
            <ScrollView style={styles.recipesList}>
              {HYBRID_RECIPES.map((r) => {
                const defA    = SPECIES_MAP.get(r.speciesA);
                const defB    = SPECIES_MAP.get(r.speciesB);
                const defRes  = SPECIES_MAP.get(r.resultSpeciesId);
                const rarity  = defRes?.rarity ?? 'rare';
                return (
                  <View key={r.resultSpeciesId} style={styles.recipeRow}>
                    <Text style={styles.recipeParents}>
                      {defA?.name} + {defB?.name}
                    </Text>
                    <Text style={styles.recipeArrow}>→</Text>
                    <Text style={[styles.recipeResult, { color: RARITY_COLOR[rarity] }]}>
                      {defRes?.name}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  card: {
    width:           320,
    maxHeight:       540,
    backgroundColor: '#0B0B14',
    borderRadius:    18,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     'rgba(139,92,246,0.45)',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.6,
    shadowRadius:    12,
    elevation:       16,
  },

  header: {
    backgroundColor: '#1A1030',
    paddingVertical: 14,
    alignItems:      'center',
    gap:             3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.20)',
  },
  headerLab: { backgroundColor: '#16082A' },
  emoji:    { fontSize: 28 },
  title:    { color: '#fff', fontWeight: '800', fontSize: 18 },
  subtitle: { color: 'rgba(196,181,253,0.70)', fontSize: 12 },

  body: {
    paddingHorizontal: 16,
    paddingVertical:   14,
    gap:               10,
  },

  // Gestating timer
  speciesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rarityBadge: { fontWeight: '700', fontSize: 11 },
  speciesName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  timerBox: {
    backgroundColor:   'rgba(139,92,246,0.12)',
    borderRadius:      12,
    paddingVertical:   12,
    paddingHorizontal: 14,
    gap:               4,
    alignItems:        'center',
  },
  timerLabel: { color: '#888', fontSize: 12 },
  timerValue: { color: '#fff', fontWeight: '800', fontSize: 22 },
  timerDone:  { color: '#34D399' },
  parentsRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  parentChip: {
    color:             '#ccc',
    fontSize:          12,
    backgroundColor:   'rgba(255,255,255,0.08)',
    borderRadius:      8,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  plusSign: { color: '#888', fontSize: 14 },

  // Preview
  pairRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
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
  combineSign:  { color: '#8B5CF6', fontSize: 22, fontWeight: '800' },
  arrowDown:    { color: '#8B5CF6', fontSize: 22, textAlign: 'center' },
  resultCard: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(139,92,246,0.12)',
    borderRadius:      12,
    borderWidth:       1,
    paddingVertical:   12,
    paddingHorizontal: 14,
    gap:               12,
  },
  resultEmoji: { fontSize: 26 },
  resultInfo:  { flex: 1, gap: 3 },
  resultName:  { fontWeight: '800', fontSize: 17 },
  resultDetail: { color: '#888', fontSize: 12 },

  // Partner selection
  emptyBox: { paddingVertical: 20, alignItems: 'center', gap: 6 },
  emptyText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  emptyHint: { color: '#666', fontSize: 12, textAlign: 'center' },
  listScroll: { maxHeight: 220 },
  partnerRow: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(255,255,255,0.05)',
    borderRadius:      10,
    paddingVertical:   10,
    paddingHorizontal: 12,
    marginBottom:      6,
    gap:               8,
  },
  partnerRowPressed: { backgroundColor: 'rgba(139,92,246,0.18)' },
  partnerInfo:  { flex: 1, gap: 2 },
  partnerName:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  partnerSpec:  { color: '#888', fontSize: 11 },
  partnerResult: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partnerResultLabel: { color: '#888', fontSize: 13 },
  partnerResultName:  { fontWeight: '700', fontSize: 13 },

  // Idle / recipes
  idleHint: {
    color:      '#888',
    fontSize:   13,
    textAlign:  'center',
    lineHeight: 18,
  },
  recipesTitle: {
    color:      '#aaa',
    fontSize:   13,
    fontWeight: '700',
    marginTop:  4,
  },
  recipesList: { maxHeight: 200 },
  recipeRow: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(255,255,255,0.04)',
    borderRadius:      8,
    paddingVertical:   7,
    paddingHorizontal: 10,
    marginBottom:      4,
    gap:               6,
  },
  recipeParents: { flex: 1, color: '#ccc', fontSize: 12 },
  recipeArrow:   { color: '#8B5CF6', fontSize: 13, fontWeight: '700' },
  recipeResult:  { fontWeight: '700', fontSize: 13 },

  // Footer
  footer: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  confirmBtn: {
    backgroundColor: '#6D28D9',
    borderRadius:    12,
    paddingVertical: 13,
    alignItems:      'center',
  },
  confirmBtnPressed: { backgroundColor: '#7C3AED' },
  confirmBtnText: {
    color:      '#fff',
    fontWeight: '800',
    fontSize:   16,
  },
  backBtn: { alignItems: 'center', paddingVertical: 6 },
  backBtnText: { color: '#888', fontSize: 13 },

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
