/**
 * TransformerPanel — shown when the player taps a Transformer building.
 *
 * Lists owned (non-wild) herbivores. Tapping "Convert" on any herbivore:
 *   • Removes the herbivore from creatureStore
 *   • Unassigns it from its habitat (if any)
 *   • Adds 10 Meat to resourceStore
 */
import React from 'react';
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
import { useResourceStore } from '../../store/resourceStore';
import { SPECIES_MAP } from '../../constants/creatures';

const MEAT_PER_CONVERT = 10;

interface Props {
  onClose: () => void;
}

export default function TransformerPanel({ onClose }: Props) {
  const creatures = useCreatureStore((s) => s.creatures);
  const removeCreature = useCreatureStore((s) => s.removeCreature);
  const unassign = useMapStore((s) => s.unassignCreatureFromHabitat);
  const addResource = useResourceStore((s) => s.addResource);

  const herbivores = creatures.filter(
    (c) =>
      c.wildExpiresAt === null &&
      SPECIES_MAP.get(c.speciesId)?.type === 'herbivore',
  );

  function handleConvert(creatureId: string) {
    const creature = creatures.find((c) => c.id === creatureId);
    if (!creature) return;
    if (creature.habitatId) {
      unassign(creature.habitatId, creature.id);
    }
    removeCreature(creature.id);
    addResource('meat', MEAT_PER_CONVERT);
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>⚙️</Text>
            <Text style={styles.title}>Transformer</Text>
            <Text style={styles.subtitle}>Convert 1 herbivore → {MEAT_PER_CONVERT} 🥩 Meat</Text>
          </View>

          {herbivores.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No owned herbivores to convert.</Text>
              <Text style={styles.emptyHint}>Capture herbivores on the map first.</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {herbivores.map((c) => {
                const def = SPECIES_MAP.get(c.speciesId);
                return (
                  <View key={c.id} style={styles.row}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{c.name}</Text>
                      <Text style={styles.rowSpecies}>{def?.name} • Lv {c.level}</Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.convertBtn, pressed && styles.convertBtnPressed]}
                      onPress={() => handleConvert(c.id)}
                    >
                      <Text style={styles.convertBtnText}>→ {MEAT_PER_CONVERT} 🥩</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          )}

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
    width:           310,
    maxHeight:       480,
    backgroundColor: '#0E0E12',
    borderRadius:    18,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     'rgba(120,120,160,0.3)',
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
  emoji:    { fontSize: 28 },
  title:    { color: '#fff', fontWeight: '800', fontSize: 18 },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },

  empty: {
    paddingVertical:   32,
    alignItems:        'center',
    gap:               6,
  },
  emptyText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  emptyHint: { color: '#666', fontSize: 12 },

  list:        { maxHeight: 300 },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical:   10,
    gap:               8,
  },

  row: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius:    10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap:             10,
  },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rowSpecies: { color: '#888', fontSize: 11 },

  convertBtn: {
    backgroundColor:   '#7A2000',
    borderRadius:      10,
    paddingHorizontal: 12,
    paddingVertical:   7,
  },
  convertBtnPressed: { backgroundColor: '#9B2800' },
  convertBtnText: {
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
