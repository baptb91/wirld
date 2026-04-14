/**
 * ActionMenu — bottom slide-up tray.
 * Phase 1: shows terrain painting tools.
 * Tap a tool to select it (enters paint mode). Tap again to deselect (nav mode).
 */
import React, { useState } from 'react';
import {
  Animated as RNAnimated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../../constants/theme';
import { TERRAIN_TYPES, TERRAIN_CONFIG, TerrainType } from '../../constants/terrain';
import { useMapStore } from '../../store/mapStore';

export default function ActionMenu() {
  const { selectedTool, selectTool } = useMapStore();
  const [expanded, setExpanded] = useState(false);

  const handleToolPress = (type: TerrainType) => {
    // Toggle: tap selected tool → back to nav mode
    selectTool(selectedTool === type ? null : type);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Tool row — always visible */}
      <View style={styles.tray} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolRow}
          pointerEvents="auto"
        >
          {TERRAIN_TYPES.map((type) => {
            const cfg     = TERRAIN_CONFIG[type];
            const active  = selectedTool === type;
            return (
              <Pressable
                key={type}
                onPress={() => handleToolPress(type)}
                style={({ pressed }) => [
                  styles.toolBtn,
                  { borderColor: cfg.color },
                  active  && { backgroundColor: cfg.color, transform: [{ scale: 1.08 }] },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={styles.toolEmoji}>{cfg.emoji}</Text>
                <Text
                  style={[
                    styles.toolLabel,
                    active && styles.toolLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {cfg.label}
                </Text>
                {active && (
                  <Text style={styles.toolCost}>
                    {cfg.costPerTile}G
                  </Text>
                )}
              </Pressable>
            );
          })}

          {/* Navigate button — clears tool selection */}
          <Pressable
            onPress={() => selectTool(null)}
            style={({ pressed }) => [
              styles.toolBtn,
              styles.navBtn,
              !selectedTool && styles.navBtnActive,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={styles.toolEmoji}>🧭</Text>
            <Text
              style={[
                styles.toolLabel,
                !selectedTool && styles.toolLabelActive,
              ]}
            >
              Move
            </Text>
          </Pressable>
        </ScrollView>

        {/* Mode label */}
        <View style={styles.modePill} pointerEvents="none">
          <Text style={styles.modeText}>
            {selectedTool
              ? `Painting: ${TERRAIN_CONFIG[selectedTool].label}`
              : 'Navigate'}
          </Text>
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
    paddingTop: 8,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
  },
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
  toolLabelActive: {
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
