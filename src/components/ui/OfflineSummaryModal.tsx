/**
 * OfflineSummaryModal — "Welcome back!" sheet shown after offline catch-up.
 *
 * Reads pendingOfflineSummary from resourceStore.
 * Dismissed by tapping "Collect" or the backdrop, which clears the summary.
 *
 * The __gold__ key in resourceDeltas is a sentinel for gold earnings
 * (resourceStore uses a separate `gold` field, not the resources map).
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0)          return `${h}h`;
  if (m > 0)          return `${m}m`;
  return `${seconds}s`;
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return `+${n}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OfflineSummaryModal() {
  const summary             = useResourceStore((s) => s.pendingOfflineSummary);
  const clearSummary        = useResourceStore((s) => s.setPendingOfflineSummary);
  const { colors }          = useTheme();

  const slideAnim = useRef(new Animated.Value(300)).current;

  // Animate in whenever a new summary appears
  useEffect(() => {
    if (summary) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [!!summary]);

  if (!summary) return null;

  const dismiss = () => clearSummary(null);

  // Separate gold from resource rows (gold uses __gold__ sentinel key)
  const goldEarned = summary.resourceDeltas.__gold__ ?? 0;
  const resourceRows = Object.entries(summary.resourceDeltas)
    .filter(([key]) => key !== '__gold__')
    .sort(([, a], [, b]) => b - a);

  return (
    <Pressable style={styles.backdrop} onPress={dismiss}>
      <Animated.View
        style={[styles.sheet, { backgroundColor: colors.surface, transform: [{ translateY: slideAnim }] }]}
        // Prevent backdrop tap from firing when pressing inside the sheet
        onStartShouldSetResponder={() => true}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>🌿  Welcome back!</Text>
          <Pressable onPress={dismiss} hitSlop={14}>
            <Text style={[styles.closeBtn, { color: colors.textMuted }]}>✕</Text>
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Away for{' '}
          <Text style={[styles.subtitleBold, { color: colors.text }]}>
            {formatDuration(summary.elapsedSeconds)}
          </Text>
          {' '}— here's what your creatures produced:
        </Text>

        <ScrollView
          style={[styles.scroll, { borderTopColor: colors.border }]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Gold row (if any gold was earned) */}
          {goldEarned > 0 && (
            <EarningRow emoji="💰" label="Gold" amount={goldEarned} color="#D4A017" labelColor={colors.text} dividerColor={colors.border} />
          )}

          {/* Resource rows */}
          {resourceRows.map(([id, amount]) => {
            const d = RESOURCE_DISPLAY[id] ?? RESOURCE_DISPLAY_FALLBACK;
            return (
              <EarningRow
                key={id}
                emoji={d.emoji}
                label={d.label}
                amount={amount}
                color={d.color}
                labelColor={colors.text}
                dividerColor={colors.border}
              />
            );
          })}
        </ScrollView>

        {/* Collect button */}
        <Pressable
          onPress={dismiss}
          style={({ pressed }) => [styles.collectBtn, pressed && styles.collectBtnPressed]}
        >
          <Text style={styles.collectLabel}>Collect  ✓</Text>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

function EarningRow({
  emoji, label, amount, color, labelColor, dividerColor,
}: {
  emoji: string; label: string; amount: number; color: string;
  labelColor: string; dividerColor: string;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: dividerColor }]}>
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
      <View style={[styles.amountPill, { borderColor: color }]}>
        <Text style={[styles.amountText, { color }]}>{formatAmount(amount)}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.40)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingBottom: 36,
    maxHeight: '65%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 20,
    color: theme.colors.text,
    fontWeight: '700',
  },
  closeBtn: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.textMuted,
    paddingHorizontal: 20,
    paddingBottom: 10,
    lineHeight: 19,
  },
  subtitleBold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  scroll: {
    flexGrow: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowEmoji: {
    fontSize: 20,
    width: 30,
  },
  rowLabel: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 4,
  },
  amountPill: {
    borderWidth: 1.5,
    borderRadius: theme.radius.xl,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  amountText: {
    fontFamily: theme.fonts.mono,
    fontSize: 13,
    fontWeight: '700',
  },
  collectBtn: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: theme.colors.green,
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  collectBtnPressed: {
    opacity: 0.80,
  },
  collectLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textLight,
    letterSpacing: 0.3,
  },
});
