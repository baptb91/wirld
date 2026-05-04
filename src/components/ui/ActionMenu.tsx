/**
 * ActionMenu — bottom slide-up tray.
 * Phase 1: terrain painting tools.
 * Phase 3: Terrain / Habitats / Plants tabs.
 *           Selecting a habitat enters placement mode; the next tap places it.
 *           Selecting a plant type enters placement mode; tapping plants them
 *           (no auto-deselect — allows multi-placement).
 */
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme, useTheme } from '../../constants/theme';
import { TERRAIN_TYPES, TERRAIN_CONFIG, TerrainType } from '../../constants/terrain';
import { HABITAT_TYPES } from '../../constants/habitats';
import { PLANT_TYPES } from '../../constants/plants';
import { BUILDING_TYPES } from '../../constants/buildings';
import { useMapStore, MAP_EXPANSION_COST } from '../../store/mapStore';
import { usePlantStore } from '../../store/plantStore';
import { useResourceStore } from '../../store/resourceStore';
import { GRID_COLS, GRID_ROWS } from '../../constants/terrain';

type MenuTab = 'terrain' | 'habitats' | 'plants' | 'buildings';

export default function ActionMenu() {
  const { selectedTool, selectTool, selectedHabitat, selectHabitat, selectedBuilding, selectBuilding, unlockedCols, unlockedRows, expandMap } = useMapStore();
  const { selectedPlantType, selectPlantType } = usePlantStore();
  const gold = useResourceStore((s) => s.gold);

  const mapFullyUnlocked = unlockedCols >= GRID_COLS && unlockedRows >= GRID_ROWS;
  const canAffordExpansion = gold >= MAP_EXPANSION_COST;
  const [tab, setTab] = useState<MenuTab>('terrain');
  const { colors, isDark } = useTheme();
  const trayBg   = isDark ? 'rgba(28,28,30,0.96)'    : 'rgba(245,240,232,0.96)';
  const tabRowBg = isDark ? 'rgba(255,255,255,0.08)'  : 'rgba(80,60,20,0.10)';
  const toolBg   = isDark ? 'rgba(255,255,255,0.10)'  : 'rgba(255,255,255,0.60)';

  const handleTabPress = (next: MenuTab) => {
    setTab(next);
    if (next === 'terrain')   { selectHabitat(null); selectPlantType(null); selectBuilding(null); }
    if (next === 'habitats')  { selectTool(null);    selectPlantType(null); selectBuilding(null); }
    if (next === 'plants')    { selectTool(null);    selectHabitat(null);   selectBuilding(null); }
    if (next === 'buildings') { selectTool(null);    selectHabitat(null);   selectPlantType(null); }
  };

  const handleToolPress = (type: TerrainType) => {
    selectTool(selectedTool === type ? null : type);
  };

  const handleHabitatPress = (id: string) => {
    selectHabitat(selectedHabitat === id ? null : id);
  };

  const handlePlantPress = (id: string) => {
    selectPlantType(selectedPlantType === id ? null : id);
  };

  const handleBuildingPress = (id: string) => {
    selectBuilding(selectedBuilding === id ? null : id);
  };

  // Derive the mode-pill label
  let modeLabel = 'Navigate';
  if (tab === 'terrain' && selectedTool) {
    modeLabel = `Painting: ${TERRAIN_CONFIG[selectedTool].label}`;
  } else if (tab === 'habitats' && selectedHabitat) {
    const def = HABITAT_TYPES.find((h) => h.id === selectedHabitat);
    modeLabel = `Place: ${def?.name ?? selectedHabitat}`;
  } else if (tab === 'plants' && selectedPlantType) {
    const def = PLANT_TYPES.find((p) => p.id === selectedPlantType);
    modeLabel = `Plant: ${def?.name ?? selectedPlantType}`;
  } else if (tab === 'buildings' && selectedBuilding) {
    const def = BUILDING_TYPES.find((b) => b.id === selectedBuilding);
    modeLabel = `Place: ${def?.name ?? selectedBuilding}`;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={[styles.tray, { backgroundColor: trayBg }]} pointerEvents="box-none">

        {/* ── Tab toggle ── */}
        <View style={[styles.tabRow, { backgroundColor: tabRowBg }]} pointerEvents="auto">
          <Pressable
            onPress={() => handleTabPress('terrain')}
            style={[styles.tabBtn, tab === 'terrain' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabLabel, tab === 'terrain' && styles.tabLabelActive]}>
              Terrain
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleTabPress('habitats')}
            style={[styles.tabBtn, tab === 'habitats' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabLabel, tab === 'habitats' && styles.tabLabelActive]}>
              Habitats
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleTabPress('plants')}
            style={[styles.tabBtn, tab === 'plants' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabLabel, tab === 'plants' && styles.tabLabelActive]}>
              Plants
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleTabPress('buildings')}
            style={[styles.tabBtn, tab === 'buildings' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabLabel, tab === 'buildings' && styles.tabLabelActive]}>
              Build
            </Text>
          </Pressable>
        </View>

        {/* ── Tool / habitat row ── */}
        {tab === 'terrain' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolRow}
            pointerEvents="auto"
          >
            {TERRAIN_TYPES.map((type) => {
              const cfg    = TERRAIN_CONFIG[type];
              const active = selectedTool === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => handleToolPress(type)}
                  style={({ pressed }) => [
                    styles.toolBtn,
                    { borderColor: cfg.color, backgroundColor: toolBg },
                    active  && { backgroundColor: cfg.color, transform: [{ scale: 1.08 }] },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={styles.toolEmoji}>{cfg.emoji}</Text>
                  <Text
                    style={[styles.toolLabel, active && styles.toolLabelWhite]}
                    numberOfLines={1}
                  >
                    {cfg.label}
                  </Text>
                  {active && (
                    <Text style={styles.toolCost}>{cfg.costPerTile}G</Text>
                  )}
                </Pressable>
              );
            })}

            {/* Navigate button */}
            <Pressable
              onPress={() => selectTool(null)}
              style={({ pressed }) => [
                styles.toolBtn,
                styles.navBtn,
                { backgroundColor: toolBg },
                !selectedTool && styles.navBtnActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={styles.toolEmoji}>🧭</Text>
              <Text
                style={[styles.toolLabel, !selectedTool && styles.toolLabelWhite]}
              >
                Move
              </Text>
            </Pressable>
          </ScrollView>
        )}

        {tab === 'habitats' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolRow}
            pointerEvents="auto"
          >
            {HABITAT_TYPES.map((h) => {
              const active = selectedHabitat === h.id;
              return (
                <Pressable
                  key={h.id}
                  onPress={() => handleHabitatPress(h.id)}
                  style={({ pressed }) => [
                    styles.toolBtn,
                    styles.habitatBtn,
                    { backgroundColor: toolBg },
                    active  && styles.habitatBtnActive,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={styles.toolEmoji}>{h.emoji}</Text>
                  <Text
                    style={[styles.toolLabel, active && styles.toolLabelWhite]}
                    numberOfLines={1}
                  >
                    {h.name}
                  </Text>
                  {active && (
                    <Text style={styles.toolCost}>{h.baseCost}G</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {tab === 'plants' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolRow}
            pointerEvents="auto"
          >
            {PLANT_TYPES.map((p) => {
              const active = selectedPlantType === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => handlePlantPress(p.id)}
                  style={({ pressed }) => [
                    styles.toolBtn,
                    styles.plantBtn,
                    { backgroundColor: toolBg },
                    active  && styles.plantBtnActive,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={styles.toolEmoji}>{p.emoji}</Text>
                  <Text
                    style={[styles.toolLabel, active && styles.toolLabelWhite]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  {active && (
                    <Text style={styles.toolCost}>{p.baseCost}G</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {tab === 'buildings' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolRow}
            pointerEvents="auto"
          >
            {BUILDING_TYPES.map((b) => {
              const active = selectedBuilding === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => handleBuildingPress(b.id)}
                  style={({ pressed }) => [
                    styles.toolBtn,
                    styles.buildingBtn,
                    { backgroundColor: toolBg },
                    active  && styles.buildingBtnActive,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={styles.toolEmoji}>{b.emoji}</Text>
                  <Text
                    style={[styles.toolLabel, active && styles.toolLabelWhite]}
                    numberOfLines={1}
                  >
                    {b.name}
                  </Text>
                  {active && (
                    <Text style={styles.toolCost}>{b.baseCost}G</Text>
                  )}
                </Pressable>
              );
            })}

            {/* Expand Map — one-time purchase */}
            <Pressable
              onPress={() => { if (!mapFullyUnlocked && canAffordExpansion) expandMap(); }}
              style={({ pressed }) => [
                styles.toolBtn,
                styles.expandBtn,
                { backgroundColor: toolBg },
                mapFullyUnlocked && styles.expandBtnDone,
                !mapFullyUnlocked && !canAffordExpansion && styles.expandBtnLocked,
                pressed && !mapFullyUnlocked && { opacity: 0.75 },
              ]}
            >
              <Text style={styles.toolEmoji}>{mapFullyUnlocked ? '🗺️' : '🔒'}</Text>
              <Text style={[styles.toolLabel, mapFullyUnlocked && styles.toolLabelWhite]} numberOfLines={1}>
                {mapFullyUnlocked ? 'Expanded' : 'Expand'}
              </Text>
              {!mapFullyUnlocked && (
                <Text style={[styles.toolCost, !canAffordExpansion && styles.toolCostInsufficient]}>
                  {MAP_EXPANSION_COST}G
                </Text>
              )}
            </Pressable>
          </ScrollView>
        )}

        {/* Mode label pill */}
        <View style={[styles.modePill, isDark && { backgroundColor: 'rgba(255,255,255,0.06)' }]} pointerEvents="none">
          <Text style={[styles.modeText, { color: colors.textMuted }]}>{modeLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tray: {
    backgroundColor: 'rgba(245,240,232,0.96)',
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingTop: 6,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
  },
  // ── Tabs ──
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(80,60,20,0.10)',
    padding: 3,
    gap: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: theme.radius.sm - 2,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: theme.colors.green,
  },
  tabLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#fff',
  },
  // ── Tool / habitat buttons ──
  toolRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  toolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.6)',
    gap: 2,
  },
  toolEmoji: {
    fontSize: 22,
  },
  toolLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  toolLabelWhite: {
    color: theme.colors.textLight,
    fontWeight: '700',
  },
  toolCost: {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    color: 'rgba(255,255,255,0.80)',
    marginTop: 1,
  },
  navBtn: {
    borderColor: theme.colors.green,
  },
  navBtnActive: {
    backgroundColor: theme.colors.green,
  },
  habitatBtn: {
    borderColor: theme.colors.gold,
    width: 72,
  },
  habitatBtnActive: {
    backgroundColor: theme.colors.gold,
  },
  plantBtn: {
    borderColor: '#5AAD5A',
    width: 72,
  },
  plantBtnActive: {
    backgroundColor: '#5AAD5A',
  },
  buildingBtn: {
    borderColor: '#8B5E3C',
    width: 72,
  },
  buildingBtnActive: {
    backgroundColor: '#8B5E3C',
  },
  expandBtn: {
    borderColor: '#4A90D9',
    width: 72,
  },
  expandBtnDone: {
    backgroundColor: '#4A90D9',
  },
  expandBtnLocked: {
    opacity: 0.5,
  },
  toolCostInsufficient: {
    color: '#FF6B6B',
  },
  // ── Mode pill ──
  modePill: {
    alignSelf: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 3,
    backgroundColor: 'rgba(80,60,20,0.08)',
    borderRadius: theme.radius.xl,
  },
  modeText: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
