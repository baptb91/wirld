/**
 * ShopPanel — presents the RevenueCat Paywall (or Customer Center for Pro users).
 *
 * The paywall UI and copy are configured entirely in the RevenueCat dashboard.
 * Products: lifetime · yearly · monthly  (entitlement: "wilds Pro")
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PurchaseService } from '../../services/PurchaseService';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useTheme } from '../../constants/theme';

interface Props {
  onClose: () => void;
}

export default function ShopPanel({ onClose }: Props) {
  const { colors, isDark } = useTheme();
  const isPro              = usePurchaseStore((s) => s.isPro);
  const [busy, setBusy]    = useState(false);

  const panelBg = isDark ? '#1C1C1E' : '#FFFDF4';
  const divider = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(80,60,20,0.10)';

  async function handleOpenPaywall() {
    setBusy(true);
    await PurchaseService.presentPaywall();
    setBusy(false);
    onClose();
  }

  async function handleManage() {
    setBusy(true);
    await PurchaseService.presentCustomerCenter();
    setBusy(false);
    onClose();
  }

  async function handleRestore() {
    setBusy(true);
    await PurchaseService.restore();
    setBusy(false);
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <View style={[styles.sheet, { backgroundColor: panelBg }]}>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: divider }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isPro ? '⚡  Wilds Pro' : '🛒  Shop'}
            </Text>
            <Pressable onPress={onClose} hitSlop={14} disabled={busy}>
              <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {isPro ? (
              // ── Active subscriber ──────────────────────────────────────────
              <>
                <View style={styles.proCard}>
                  <Text style={styles.proEmoji}>⚡</Text>
                  <Text style={[styles.proTitle, { color: colors.text }]}>
                    Wilds Pro — Active
                  </Text>
                  <Text style={[styles.proTagline, { color: colors.textMuted }]}>
                    No ads  ·  ×1.2 production  ·  +1 creature slot
                  </Text>
                </View>

                <ActionButton
                  label="Manage Subscription"
                  icon="⚙️"
                  onPress={handleManage}
                  busy={busy}
                  colors={colors}
                  variant="secondary"
                />
              </>
            ) : (
              // ── Non-subscriber ─────────────────────────────────────────────
              <>
                <View style={styles.proCard}>
                  <Text style={styles.proEmoji}>🌿</Text>
                  <Text style={[styles.proTitle, { color: colors.text }]}>
                    Unlock Wilds Pro
                  </Text>
                  <Text style={[styles.proTagline, { color: colors.textMuted }]}>
                    No ads  ·  ×1.2 production  ·  +1 creature slot{'\n'}
                    Choose monthly, yearly, or lifetime.
                  </Text>
                </View>

                <ActionButton
                  label="View Plans"
                  icon="⚡"
                  onPress={handleOpenPaywall}
                  busy={busy}
                  colors={colors}
                  variant="primary"
                />

                <Pressable
                  onPress={handleRestore}
                  disabled={busy}
                  style={styles.restoreRow}
                >
                  {busy
                    ? <ActivityIndicator size="small" color={colors.textMuted} />
                    : <Text style={[styles.restoreText, { color: colors.textMuted }]}>
                        Restore Purchases
                      </Text>
                  }
                </Pressable>
              </>
            )}

            {/* Customer Center — always available */}
            {isPro && (
              <Pressable
                onPress={handleManage}
                disabled={busy}
                style={styles.restoreRow}
              >
                <Text style={[styles.restoreText, { color: colors.textMuted }]}>
                  Support / Cancel Subscription
                </Text>
              </Pressable>
            )}

            <Text style={[styles.legalNote, { color: colors.textMuted }]}>
              Subscriptions renew automatically unless cancelled 24 h before renewal.
              Managed via your App Store / Google Play account.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── ActionButton ──────────────────────────────────────────────────────────────

function ActionButton({
  label, icon, onPress, busy, colors, variant,
}: {
  label:   string;
  icon:    string;
  onPress: () => void;
  busy:    boolean;
  colors:  ReturnType<typeof useTheme>['colors'];
  variant: 'primary' | 'secondary';
}) {
  const bg = variant === 'primary' ? colors.green : 'transparent';
  const border = variant === 'secondary' ? colors.green : 'transparent';
  const textColor = variant === 'primary' ? '#fff' : colors.green;

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: bg, borderColor: border, borderWidth: 1.5 },
        pressed && !busy && { opacity: 0.75 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.actionBtnText, { color: textColor }]}>
          {icon}  {label}
        </Text>
      )}
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 300,
  },
  sheet: {
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 24,
  },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 20,
    paddingTop:      18,
    paddingBottom:   12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize:   20,
    fontWeight: '800',
  },
  closeX: {
    fontSize:   17,
    fontWeight: '700',
  },
  body: {
    padding: 20,
    gap: 14,
  },
  proCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  proEmoji: {
    fontSize: 52,
    marginBottom: 4,
  },
  proTitle: {
    fontSize:   20,
    fontWeight: '800',
    textAlign:  'center',
  },
  proTagline: {
    fontSize:   13,
    textAlign:  'center',
    lineHeight: 20,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  actionBtnText: {
    fontSize:   16,
    fontWeight: '800',
  },
  restoreRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  restoreText: {
    fontSize:          13,
    textDecorationLine: 'underline',
  },
  legalNote: {
    fontSize:    10,
    textAlign:   'center',
    lineHeight:  15,
    paddingHorizontal: 8,
    marginTop: 4,
  },
});
