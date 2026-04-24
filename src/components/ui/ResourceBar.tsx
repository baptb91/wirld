/**
 * ResourceBar — top HUD strip.
 * Shows gold (always pinned first) + up to 4 highest non-zero resources,
 * sorted by value descending. Scrollable horizontally if more resources exist.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme, useTheme } from '../../constants/theme';
import { useResourceStore } from '../../store/resourceStore';
import {
  RESOURCE_DISPLAY,
  RESOURCE_DISPLAY_FALLBACK,
} from '../../constants/resourceDisplay';

const MAX_SHOWN = 4; // non-gold resource pills to show before scroll

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function ResourceBar() {
  const gold      = useResourceStore((s) => s.gold);
  const resources = useResourceStore((s) => s.resources);

  // Top non-zero resources sorted by value desc
  const topResources = Object.entries(resources)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_SHOWN);

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bar}
      >
        {/* Gold — always first */}
        <Pill emoji="💰" value={gold} color="#D4A017" />

        {topResources.map(([id, value]) => {
          const d = RESOURCE_DISPLAY[id] ?? RESOURCE_DISPLAY_FALLBACK;
          return <Pill key={id} emoji={d.emoji} value={value} color={d.color} />;
        })}
      </ScrollView>
    </View>
  );
}

function Pill({ emoji, value, color }: { emoji: string; value: number; color: string }) {
  const { isDark } = useTheme();
  const pillBg = isDark ? 'rgba(44,44,46,0.92)' : 'rgba(245,240,232,0.92)';
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: pillBg }]}>
      <Text style={styles.pillIcon}>{emoji}</Text>
      <Text style={[styles.pillValue, { color }]}>{formatAmount(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
  },
  bar: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245,240,232,0.92)',
    borderWidth: 1.5,
    borderRadius: theme.radius.xl,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 3,
    elevation: 4,
  },
  pillIcon: {
    fontSize: 13,
  },
  pillValue: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    fontWeight: '700',
  },
});
