/**
 * Settings Screen — Phase 6.
 * Sound, haptics, notifications + about info.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, useTheme } from '../../src/constants/theme';
import { useSettingsStore } from '../../src/store/settingsStore';
import { SoundService } from '../../src/services/SoundService';
import { PurchaseService } from '../../src/services/PurchaseService';
import { usePurchaseStore } from '../../src/store/purchaseStore';
import ShopPanel from '../../src/components/ui/ShopPanel';

export default function SettingsScreen() {
  const sfxEnabled      = useSettingsStore((s) => s.sfxEnabled);
  const ambientEnabled  = useSettingsStore((s) => s.ambientEnabled);
  const hapticsEnabled  = useSettingsStore((s) => s.hapticsEnabled);
  const notifEnabled    = useSettingsStore((s) => s.notifEnabled);

  const setSfxEnabled     = useSettingsStore((s) => s.setSfxEnabled);
  const setAmbientEnabled = useSettingsStore((s) => s.setAmbientEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const setNotifEnabled   = useSettingsStore((s) => s.setNotifEnabled);

  const isAdFree      = usePurchaseStore((s) => s.isAdFree);
  const isPremiumPass = usePurchaseStore((s) => s.isPremiumPass);
  const [shopOpen, setShopOpen]     = useState(false);
  const [restoring, setRestoring]   = useState(false);

  function handleAmbientToggle(v: boolean) {
    setAmbientEnabled(v);
    if (v) {
      SoundService.startAmbient();
    } else {
      SoundService.stopAmbient();
    }
  }

  function handleSfxToggle(v: boolean) {
    setSfxEnabled(v);
    if (v) SoundService.play('captureSuccess'); // quick preview
  }

  async function handleRestore() {
    if (restoring) return;
    setRestoring(true);
    await PurchaseService.restore();
    setRestoring(false);
  }

  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <Section label="Sound">
          <Row
            label="Sound effects"
            hint="Tap, capture, battle sounds"
            value={sfxEnabled}
            onToggle={handleSfxToggle}
          />
          <Row
            label="Ambient nature loop"
            hint="Birds & wind (off by default)"
            value={ambientEnabled}
            onToggle={handleAmbientToggle}
          />
        </Section>

        <Section label="Feel">
          <Row
            label="Haptics"
            value={hapticsEnabled}
            onToggle={setHapticsEnabled}
          />
        </Section>

        <Section label="Notifications">
          <Row
            label="All notifications"
            value={notifEnabled}
            onToggle={setNotifEnabled}
          />
        </Section>

        <Section label="Purchases">
          <ActionRow
            label={isPremiumPass ? '⚡ Wilds Pass — Active' : '🛒 Shop'}
            hint={
              isPremiumPass
                ? 'No ads · ×1.2 production · +1 creature slot'
                : isAdFree
                ? 'Ads removed'
                : '5 products available'
            }
            onPress={() => setShopOpen(true)}
          />
          <ActionRow
            label={restoring ? 'Restoring…' : 'Restore Purchases'}
            hint="Recover previous non-consumable purchases"
            onPress={handleRestore}
            disabled={restoring}
            trailing={restoring ? <ActivityIndicator size="small" color={colors.textMuted} /> : undefined}
          />
        </Section>

        <Section label="About">
          <InfoRow label="Version"  value="1.0.0 (Phase 6)" />
          <InfoRow label="Build"    value="Development" />
          <InfoRow label="Engine"   value="Expo SDK 54 · Skia · Reanimated 4" />
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>WILDS © 2025 Baptiste</Text>
          <Text style={styles.footerSubtext}>
            Privacy Policy · Support: support@wilds.app
          </Text>
        </View>
      </ScrollView>

      {shopOpen && <ShopPanel onClose={() => setShopOpen(false)} />}
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={[styles.sectionBody, { backgroundColor: colors.sectionBody, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  hint,
  value,
  onToggle,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.rowHint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.green }}
        thumbColor="#fff"
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.textMuted }]}>{value}</Text>
    </View>
  );
}

function ActionRow({
  label,
  hint,
  onPress,
  disabled,
  trailing,
}: {
  label:     string;
  hint?:     string;
  onPress:   () => void;
  disabled?: boolean;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        pressed && !disabled && { opacity: 0.6 },
      ]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.rowHint, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      {trailing ?? <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 28,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionBody: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowText: { flex: 1, marginRight: 12, gap: 2 },
  rowLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.text,
  },
  rowHint: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  rowValue: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  footer: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: theme.fonts.title,
    fontSize: 14,
    color: theme.colors.green,
  },
  footerSubtext: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
