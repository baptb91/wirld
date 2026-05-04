/**
 * AdBonusPanel — bottom sheet with two rewarded-ad bonuses:
 *   1. Double production for 1h (once per 8h)
 *   2. +30 Gold (once per calendar day)
 *
 * Not rendered for premium pass holders (caller must check isPremium).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAdStore, PRODUCTION_BOOST_COOLDOWN_MS, GOLD_BONUS_AMOUNT } from '../../store/adStore';
import { useResourceStore } from '../../store/resourceStore';
import { AdService } from '../../services/AdService';
import { useTheme } from '../../constants/theme';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCooldown(ms: number): string {
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function AdBonusPanel({ onClose }: Props) {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(320)).current;

  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState<'production' | 'gold' | null>(null);

  const canBoostProduction = useAdStore((s) => s.canShowProductionBoostAd());
  const canGoldBonus       = useAdStore((s) => s.canShowGoldBonusAd());
  const lastBoostAt        = useAdStore((s) => s.lastProductionBoostAdAt);
  const boostExpiresAt     = useAdStore((s) => s.productionBoostExpiresAt);
  const activateBoost      = useAdStore((s) => s.activateProductionBoost);
  const recordGold         = useAdStore((s) => s.recordGoldBonusAd);
  const addGold            = useResourceStore((s) => s.addGold);

  // Refresh timer every 30 s for cooldown display
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, tension: 60, friction: 10,
    }).start();
  }, []);

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 320, duration: 220, useNativeDriver: true,
    }).start(onClose);
  };

  // Cooldown remaining for production boost
  const boostCooldownRemaining = canBoostProduction
    ? 0
    : PRODUCTION_BOOST_COOLDOWN_MS - (now - lastBoostAt);

  // Active boost label
  const boostActive = boostExpiresAt > now;
  const boostTimeLeft = boostExpiresAt - now;

  async function handleProductionBoost() {
    if (!canBoostProduction || loading || boostActive) return;
    setLoading('production');
    const earned = await AdService.showRewarded();
    setLoading(null);
    if (earned) activateBoost();
  }

  async function handleGoldBonus() {
    if (!canGoldBonus || loading) return;
    setLoading('gold');
    const earned = await AdService.showRewarded();
    setLoading(null);
    if (earned) {
      addGold(GOLD_BONUS_AMOUNT);
      recordGold();
    }
  }

  const panelBg = isDark ? '#1C1C1E' : '#FFFDF4';
  const divider = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(80,60,20,0.10)';

  return (
    <Pressable style={styles.backdrop} onPress={dismiss}>
      <Animated.View
        style={[styles.sheet, { backgroundColor: panelBg, transform: [{ translateY: slideAnim }] }]}
        onStartShouldSetResponder={() => true}
      >
        {/* Header */}
        <View style={[styles.headerRow, { borderBottomColor: divider }]}>
          <Text style={[styles.title, { color: colors.text }]}>✨  Daily Bonuses</Text>
          <Pressable onPress={dismiss} hitSlop={14}>
            <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
          </Pressable>
        </View>

        {/* Production boost row */}
        <View style={[styles.row, { borderBottomColor: divider }]}>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              ⚡ Double production for 1h
            </Text>
            {boostActive ? (
              <Text style={[styles.rowSub, { color: colors.green }]}>
                Active — {formatCooldown(boostTimeLeft)} left
              </Text>
            ) : canBoostProduction ? (
              <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                Available now
              </Text>
            ) : (
              <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                Available in {formatCooldown(boostCooldownRemaining)}
              </Text>
            )}
          </View>
          <AdButton
            onPress={handleProductionBoost}
            disabled={!canBoostProduction || boostActive || loading === 'gold'}
            loading={loading === 'production'}
            done={boostActive}
          />
        </View>

        {/* Gold bonus row */}
        <View style={[styles.row, { borderBottomColor: 'transparent' }]}>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              💰 +{GOLD_BONUS_AMOUNT} Gold
            </Text>
            {canGoldBonus ? (
              <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                Available now
              </Text>
            ) : (
              <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                Available tomorrow
              </Text>
            )}
          </View>
          <AdButton
            onPress={handleGoldBonus}
            disabled={!canGoldBonus || loading === 'production'}
            loading={loading === 'gold'}
            done={false}
          />
        </View>

        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          Ads are always optional — bonus amounts may increase in future updates.
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ── AdButton ─────────────────────────────────────────────────────────────────

function AdButton({
  onPress, disabled, loading, done,
}: {
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
  done: boolean;
}) {
  const { colors } = useTheme();
  const bg = done ? '#065F46' : disabled ? '#555' : colors.green;
  const label = loading ? '…' : done ? '✓' : '▶ Watch';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading || done}
      style={({ pressed }) => [
        styles.adBtn,
        { backgroundColor: bg },
        pressed && !disabled && { opacity: 0.8 },
      ]}
    >
      <Text style={styles.adBtnText}>{label}</Text>
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeX: {
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 12,
  },
  adBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 74,
    alignItems: 'center',
  },
  adBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  disclaimer: {
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
