/**
 * ResourceBar — top-left HUD showing Gold | Seeds | Meat | Crystals.
 * Phase 1: reads from a simple resource store (placeholder values).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';

interface ResourceBarProps {
  gold?: number;
  seeds?: number;
  meat?: number;
  crystals?: number;
}

export default function ResourceBar({
  gold = 0,
  seeds = 0,
  meat = 0,
  crystals = 0,
}: ResourceBarProps) {
  return (
    <View style={styles.bar} pointerEvents="none">
      <Pill icon="💰" value={gold}     color="#D4A017" />
      <Pill icon="🌱" value={seeds}    color="#4A7C59" />
      <Pill icon="🥩" value={meat}     color="#C0392B" />
      <Pill icon="💎" value={crystals} color="#6C63FF" />
    </View>
  );
}

function Pill({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={styles.pillIcon}>{icon}</Text>
      <Text style={[styles.pillValue, { color }]}>
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245,240,232,0.90)',
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
