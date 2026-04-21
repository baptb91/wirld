/**
 * CarnivoreHungerPanel — shown when the player taps a hungry carnivore.
 *
 * Displays hunger level and a "Feed" button that costs 1 Meat.
 * Tapping Feed: spends 1 Meat from resourceStore, resets hunger to 0.
 */
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useResourceStore } from '../../store/resourceStore';
import { useCreatureStore, Creature } from '../../store/creatureStore';

interface Props {
  creature: Creature;
  onClose: () => void;
}

export default function CarnivoreHungerPanel({ creature, onClose }: Props) {
  const meat        = useResourceStore((s) => s.resources['meat'] ?? 0);
  const spendResource = useResourceStore((s) => s.spendResource);
  const feedCreature  = useCreatureStore((s) => s.feedCreature);

  const hungerPct = Math.round(creature.hunger);
  const barColor  = hungerPct >= 90 ? '#DC2626' : hungerPct >= 80 ? '#F97316' : '#D97706';
  const canFeed   = meat >= 1;

  function handleFeed() {
    if (!canFeed) return;
    if (spendResource('meat', 1)) {
      feedCreature(creature.id);
      onClose();
    }
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🥩</Text>
            <Text style={styles.title}>{creature.name}</Text>
            <Text style={styles.subtitle}>Carnivore — Needs feeding</Text>
          </View>

          {/* Hunger bar */}
          <View style={styles.body}>
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>Hunger</Text>
              <Text style={[styles.barValue, { color: barColor }]}>{hungerPct}%</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${hungerPct}%` as any, backgroundColor: barColor }]} />
            </View>
            {hungerPct >= 100 && (
              <Text style={styles.warning}>Starving — will attack herbivores!</Text>
            )}
            {hungerPct >= 80 && hungerPct < 100 && (
              <Text style={styles.warningMild}>Agitated — feed soon!</Text>
            )}
          </View>

          {/* Feed button */}
          <View style={styles.footer}>
            <Text style={styles.costLabel}>Cost: 🥩 ×1  (have: {meat})</Text>
            <Pressable
              style={[styles.feedBtn, !canFeed && styles.feedBtnDisabled]}
              onPress={handleFeed}
              disabled={!canFeed}
            >
              <Text style={styles.feedBtnText}>
                {canFeed ? 'Feed Carnivore' : 'Not enough Meat'}
              </Text>
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

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  card: {
    width:           290,
    backgroundColor: '#1C1008',
    borderRadius:    18,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     '#7A2000',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.5,
    shadowRadius:    10,
    elevation:       14,
  },
  header: {
    backgroundColor: '#7A2000',
    paddingVertical: 14,
    alignItems:      'center',
    gap:             3,
  },
  emoji:    { fontSize: 28 },
  title:    { color: '#fff', fontWeight: '800', fontSize: 18 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  body: {
    paddingHorizontal: 18,
    paddingVertical:   14,
    gap:               8,
  },
  barRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  barLabel: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  barValue: { fontSize: 14, fontWeight: '800' },
  barTrack: {
    height:       10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 5,
    overflow:     'hidden',
  },
  barFill: {
    height:       10,
    borderRadius: 5,
  },
  warning: {
    color:      '#FF4444',
    fontSize:   12,
    fontWeight: '700',
    textAlign:  'center',
  },
  warningMild: {
    color:      '#F97316',
    fontSize:   12,
    fontWeight: '600',
    textAlign:  'center',
  },

  footer: {
    paddingHorizontal: 18,
    paddingBottom:     16,
    gap:               8,
    alignItems:        'center',
  },
  costLabel: {
    color:    '#888',
    fontSize: 12,
  },
  feedBtn: {
    width:             '100%',
    backgroundColor:   '#9B2400',
    borderRadius:      12,
    paddingVertical:   12,
    alignItems:        'center',
  },
  feedBtnDisabled: {
    backgroundColor: '#3A2010',
  },
  feedBtnText: {
    color:      '#fff',
    fontWeight: '800',
    fontSize:   15,
  },
  closeBtn: {
    paddingVertical: 6,
  },
  closeBtnText: {
    color:    '#666',
    fontSize: 13,
  },
});
