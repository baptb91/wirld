/**
 * WarehousePanel — resource inventory overlay.
 * Appears when the player taps a placed Warehouse building.
 * Reads directly from useResourceStore — no props needed for data.
 */
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme, useTheme } from '../../constants/theme';
import { useResourceStore } from '../../store/resourceStore';
import {
  RESOURCE_DISPLAY,
  RESOURCE_DISPLAY_FALLBACK,
} from '../../constants/resourceDisplay';

interface WarehousePanelProps {
  visible: boolean;
  onClose: () => void;
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function WarehousePanel({ visible, onClose }: WarehousePanelProps) {
  const { resources, gold } = useResourceStore();
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  const panelBg = isDark ? 'rgba(28,28,30,0.97)' : 'rgba(245,240,232,0.97)';
  const divider = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(80,60,20,0.10)';

  // Sort non-zero resources by value descending
  const rows = Object.entries(resources)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      {/* Prevent tap-through to backdrop when pressing inside panel */}
      <View style={[styles.panel, { backgroundColor: panelBg }]} onStartShouldSetResponder={() => true}>
        <View style={[styles.header, { borderBottomColor: divider }]}>
          <Text style={[styles.title, { color: colors.text }]}>🏪  Warehouse</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={[styles.closeBtn, { color: colors.textMuted }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Gold — always first */}
          <ResourceRow
            emoji="💰"
            label="Gold"
            value={gold}
            color="#D4A017"
            labelColor={colors.text}
            dividerColor={divider}
          />

          {rows.length === 0 && (
            <Text style={[styles.emptyNote, { color: colors.textMuted }]}>
              Creatures and plants will produce resources over time.
            </Text>
          )}

          {rows.map(([id, value]) => {
            const d = RESOURCE_DISPLAY[id] ?? RESOURCE_DISPLAY_FALLBACK;
            return (
              <ResourceRow
                key={id}
                emoji={d.emoji}
                label={d.label}
                value={value}
                color={d.color}
                labelColor={colors.text}
                dividerColor={divider}
              />
            );
          })}
        </ScrollView>
      </View>
    </Pressable>
  );
}

function ResourceRow({
  emoji, label, value, color, labelColor, dividerColor,
}: {
  emoji: string; label: string; value: number; color: string;
  labelColor: string; dividerColor: string;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: dividerColor }]}>
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.rowValue, { color }]}>{formatAmount(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: 'rgba(245,240,232,0.97)',
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingBottom: 36,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(80,60,20,0.10)',
  },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '700',
  },
  closeBtn: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  scroll: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 2,
  },
  emptyNote: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(80,60,20,0.10)',
  },
  rowEmoji: {
    fontSize: 18,
    width: 28,
  },
  rowLabel: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 4,
  },
  rowValue: {
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    fontWeight: '700',
  },
});
