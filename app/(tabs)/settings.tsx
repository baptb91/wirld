/**
 * Settings Screen — Phase 1 placeholder.
 * Sound, haptics toggles + version info.
 * Full IAP / Supabase integration comes in Phase 6.
 */
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/constants/theme';

export default function SettingsScreen() {
  const [soundEnabled,   setSoundEnabled]   = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [notifEnabled,   setNotifEnabled]   = useState(true);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <Section label="Audio & Feel">
          <Row label="Sound" value={soundEnabled}   onToggle={setSoundEnabled} />
          <Row label="Haptics" value={hapticsEnabled} onToggle={setHapticsEnabled} />
        </Section>

        <Section label="Notifications">
          <Row label="All notifications" value={notifEnabled} onToggle={setNotifEnabled} />
        </Section>

        <Section label="About">
          <InfoRow label="Version"    value="1.0.0 (Phase 1)" />
          <InfoRow label="Build"      value="Development" />
          <InfoRow label="Engine"     value="Expo SDK 54 · Skia · Reanimated 3" />
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>WILDS © 2025 Baptiste</Text>
          <Text style={styles.footerSubtext}>
            Privacy Policy · Support: support@wilds.app
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.colors.border, true: theme.colors.green }}
        thumbColor="#fff"
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.text,
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
