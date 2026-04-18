import React from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/constants/theme';
import { useCreatureStore } from '../../src/store/creatureStore';
import { useMapStore } from '../../src/store/mapStore';
import { useResourceStore } from '../../src/store/resourceStore';
import { SPECIES, SPECIES_MAP, RARITY_COLOR } from '../../src/constants/creatures';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RARITY_SHORT: Record<string, string> = {
  common: 'C', uncommon: 'U', rare: 'R', epic: 'E', legendary: 'L',
};

const SPECIES_EMOJI: Record<string, string> = {
  feuillon: '🌿', broutard: '🌿', boussin: '🌸', flottin: '💧',
  mellior: '🌸', rampex: '🌳', gribou: '🌳', crochon: '🪨',
  scorpilou: '🏜', griffax: '🦅', sirpio: '💧', stalagor: '🪨',
  dunor: '🏜', rughor: '🦁', venomoth: '🦋', aquilon: '🌊',
  lumios: '✨', draknoir: '🐉',
};

function formatGold(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type OwnedCreature = ReturnType<typeof useCreatureStore.getState>['creatures'][0];

function OwnedCreatureCard({
  creature,
  onSell,
}: {
  creature: OwnedCreature;
  onSell: (id: string) => void;
}) {
  const def = SPECIES_MAP.get(creature.speciesId);
  if (!def) return null;
  const rarityColor = RARITY_COLOR[def.rarity] ?? '#888';
  const emoji = SPECIES_EMOJI[creature.speciesId] ?? '❓';
  const sellPrice = def.sellPrice * (creature.isShiny ? 5 : 1);

  return (
    <View style={[styles.ownedCard, { borderColor: rarityColor }]}>
      <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
        <Text style={styles.rarityBadgeText}>{RARITY_SHORT[def.rarity]}</Text>
      </View>
      <Text style={styles.ownedEmoji}>{emoji}</Text>
      <Text style={styles.ownedName} numberOfLines={1}>{creature.name}</Text>
      <Text style={styles.ownedSpecies} numberOfLines={1}>{def.name}</Text>
      <View style={styles.ownedStats}>
        <Text style={styles.ownedStat}>❤️ {creature.happiness}</Text>
        {creature.isShiny && <Text style={styles.shinyTag}>✨</Text>}
      </View>
      <Pressable
        style={({ pressed }) => [styles.sellBtn, pressed && { opacity: 0.75 }]}
        onPress={() => onSell(creature.id)}
      >
        <Text style={styles.sellBtnText}>Sell  💰{formatGold(sellPrice)}</Text>
      </Pressable>
    </View>
  );
}

function CodexCard({ speciesId, discovered }: { speciesId: string; discovered: boolean }) {
  const def = SPECIES_MAP.get(speciesId);
  if (!def) return null;
  const rarityColor = RARITY_COLOR[def.rarity] ?? '#888';
  const emoji = SPECIES_EMOJI[speciesId] ?? '❓';

  return (
    <View style={[
      styles.codexCard,
      !discovered && styles.codexCardLocked,
      { borderColor: discovered ? rarityColor : theme.colors.border },
    ]}>
      <View style={[styles.rarityBadge, { backgroundColor: discovered ? rarityColor : '#aaa' }]}>
        <Text style={styles.rarityBadgeText}>{RARITY_SHORT[def.rarity]}</Text>
      </View>
      <Text style={[styles.codexEmoji, !discovered && styles.lockedEmoji]}>
        {discovered ? emoji : '❓'}
      </Text>
      <Text style={[styles.codexName, !discovered && styles.lockedText]} numberOfLines={1}>
        {discovered ? def.name : '???'}
      </Text>
      <Text style={styles.codexSellHint}>💰{formatGold(def.sellPrice)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

type Section =
  | { title: string; type: 'owned'; data: ['owned'] }
  | { title: string; type: 'codex'; data: ['codex'] };

export default function CreaturesScreen() {
  const creatures           = useCreatureStore((s) => s.creatures);
  const removeCreature      = useCreatureStore((s) => s.removeCreature);
  const unassignFromHabitat = useMapStore((s) => s.unassignCreatureFromHabitat);
  const addGold             = useResourceStore((s) => s.addGold);
  const gold                = useResourceStore((s) => s.gold);

  const discoveredSpeciesIds = new Set(creatures.map((c) => c.speciesId));

  const handleSell = (creatureId: string) => {
    const creature = useCreatureStore.getState().creatures.find((c) => c.id === creatureId);
    if (!creature) return;
    const def = SPECIES_MAP.get(creature.speciesId);
    if (!def) return;
    const sellPrice = def.sellPrice * (creature.isShiny ? 5 : 1);

    Alert.alert(
      `Sell ${creature.name}?`,
      `You'll receive 💰${formatGold(sellPrice)} gold.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell',
          style: 'destructive',
          onPress: () => {
            if (creature.habitatId) {
              unassignFromHabitat(creature.habitatId, creature.id);
            }
            removeCreature(creature.id);
            addGold(sellPrice);
          },
        },
      ],
    );
  };

  const sections: Section[] = [
    { title: `Your Creatures  (${creatures.length})`, type: 'owned', data: ['owned'] },
    { title: `Codex  ${discoveredSpeciesIds.size} / ${SPECIES.length} discovered`, type: 'codex', data: ['codex'] },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Creatures</Text>
        <View style={styles.goldChip}>
          <Text style={styles.goldText}>💰 {formatGold(gold)}</Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, i) => item + i}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ section }) => {
          if (section.type === 'owned') {
            if (creatures.length === 0) {
              return (
                <Text style={styles.emptyText}>
                  No creatures yet. Explore your map to attract them!
                </Text>
              );
            }
            return (
              <FlatList
                data={creatures}
                numColumns={3}
                keyExtractor={(c) => c.id}
                scrollEnabled={false}
                contentContainerStyle={styles.cardGrid}
                renderItem={({ item }) => (
                  <OwnedCreatureCard creature={item} onSell={handleSell} />
                )}
              />
            );
          }
          return (
            <FlatList
              data={SPECIES as unknown as typeof SPECIES[number][]}
              numColumns={4}
              keyExtractor={(s) => s.id}
              scrollEnabled={false}
              contentContainerStyle={styles.cardGrid}
              renderItem={({ item }) => (
                <CodexCard speciesId={item.id} discovered={discoveredSpeciesIds.has(item.id)} />
              )}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 24,
    color: theme.colors.text,
  },
  goldChip: {
    backgroundColor: '#FFF8E1',
    borderRadius: theme.radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.gold,
  },
  goldText: {
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    fontWeight: '700',
    color: '#B8860B',
  },
  sectionTitle: {
    fontFamily: theme.fonts.title,
    fontSize: 15,
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 14,
    paddingBottom: 6,
  },
  emptyText: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 40,
    fontStyle: 'italic',
  },
  cardGrid: {
    paddingHorizontal: theme.spacing.sm,
    gap: 8,
  },
  ownedCard: {
    flex: 1,
    margin: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: theme.radius.md,
    borderWidth: 2,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    position: 'relative',
    gap: 3,
  },
  rarityBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  ownedEmoji: {
    fontSize: 28,
    marginBottom: 2,
  },
  ownedName: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  ownedSpecies: {
    fontFamily: theme.fonts.body,
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  ownedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ownedStat: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  shinyTag: { fontSize: 10 },
  sellBtn: {
    marginTop: 6,
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sellBtnText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  codexCard: {
    flex: 1,
    margin: 4,
    aspectRatio: 0.8,
    backgroundColor: 'rgba(80,60,20,0.05)',
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
    gap: 2,
  },
  codexCardLocked: { opacity: 0.55 },
  codexEmoji: { fontSize: 22, marginBottom: 3 },
  lockedEmoji: { opacity: 0.35 },
  codexName: {
    fontFamily: theme.fonts.body,
    fontSize: 10,
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockedText: { color: theme.colors.textMuted },
  codexSellHint: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
});
