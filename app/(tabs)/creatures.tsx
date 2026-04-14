/**
 * Creatures Screen — codex + owned creature grid.
 * Phase 1 placeholder: shows all 18 species as locked cards.
 * Full implementation in Phase 2.
 */
import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/constants/theme';

const SPECIES_PREVIEW = [
  { id: 'feuillon',  name: 'Feuillon',  rarity: 'common',    emoji: '🌿' },
  { id: 'broutard',  name: 'Broutard',  rarity: 'common',    emoji: '🌿' },
  { id: 'boussin',   name: 'Boussin',   rarity: 'common',    emoji: '🌸' },
  { id: 'mellior',   name: 'Mellior',   rarity: 'uncommon',  emoji: '🌸' },
  { id: 'rampex',    name: 'Rampex',    rarity: 'uncommon',  emoji: '🌳' },
  { id: 'gribou',    name: 'Gribou',    rarity: 'uncommon',  emoji: '🌳' },
  { id: 'crochon',   name: 'Crochon',   rarity: 'uncommon',  emoji: '🪨' },
  { id: 'stalagor',  name: 'Stalagor',  rarity: 'rare',      emoji: '🪨' },
  { id: 'scorpilou', name: 'Scorpilou', rarity: 'uncommon',  emoji: '🏜' },
  { id: 'dunor',     name: 'Dunor',     rarity: 'rare',      emoji: '🏜' },
  { id: 'griffax',   name: 'Griffax',   rarity: 'uncommon',  emoji: '🦅' },
  { id: 'rughor',    name: 'Rughor',    rarity: 'rare',      emoji: '🦁' },
  { id: 'venomoth',  name: 'Vénomoth',  rarity: 'rare',      emoji: '🦋' },
  { id: 'flottin',   name: 'Flottin',   rarity: 'common',    emoji: '💧' },
  { id: 'sirpio',    name: 'Sirpio',    rarity: 'uncommon',  emoji: '💧' },
  { id: 'aquilon',   name: 'Aquilon',   rarity: 'epic',      emoji: '🌊' },
  { id: 'lumios',    name: 'Lumios',    rarity: 'epic',      emoji: '✨' },
  { id: 'draknoir',  name: 'Draknoir',  rarity: 'legendary', emoji: '🐉' },
] as const;

const RARITY_COLOR: Record<string, string> = {
  common:    '#8DC99A',
  uncommon:  '#60A5FA',
  rare:      '#C084FC',
  epic:      '#F59E0B',
  legendary: '#EF4444',
};

export default function CreaturesScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Creatures</Text>
        <Text style={styles.subtitle}>0 / 18 discovered</Text>
      </View>
      <FlatList
        data={SPECIES_PREVIEW}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.cardBadge, { backgroundColor: RARITY_COLOR[item.rarity] }]}>
              <Text style={styles.cardBadgeText}>{item.rarity[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.cardEmoji}>❓</Text>
            <Text style={styles.cardName} numberOfLines={1}>???</Text>
            <Text style={styles.cardRarity} numberOfLines={1}>{item.rarity}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 26,
    color: theme.colors.text,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  list: {
    padding: theme.spacing.sm,
    gap: 8,
  },
  card: {
    flex: 1,
    margin: 4,
    aspectRatio: 0.85,
    backgroundColor: 'rgba(80,60,20,0.06)',
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    position: 'relative',
  },
  cardBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  cardEmoji: {
    fontSize: 30,
    marginBottom: 6,
    opacity: 0.35,
  },
  cardName: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  cardRarity: {
    fontFamily: theme.fonts.body,
    fontSize: 10,
    color: theme.colors.textMuted,
    opacity: 0.7,
    textTransform: 'capitalize',
    marginTop: 2,
  },
});
