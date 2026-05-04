/**
 * ProfilePanel — view + edit the player's online profile.
 *
 * Shows: display name (editable), level, XP, creature count, rarity score,
 * "Sync to Leaderboard" button, "Claim Gold" button if earnings pending.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useOnlineStore, xpToLevel, RARITY_SCORE } from '../../store/onlineStore';
import { useCreatureStore } from '../../store/creatureStore';
import { useResourceStore } from '../../store/resourceStore';
import { SupabaseService } from '../../services/SupabaseService';
import { SPECIES_MAP, RARITY_COLOR } from '../../constants/creatures';
import { useTheme } from '../../constants/theme';

interface Props { onClose: () => void }

export default function ProfilePanel({ onClose }: Props) {
  const { colors, isDark } = useTheme();

  const userId      = useOnlineStore((s) => s.userId);
  const isAnonymous = useOnlineStore((s) => s.isAnonymous);
  const profile     = useOnlineStore((s) => s.profile);

  const creatures = useCreatureStore((s) => s.creatures);
  const xp        = useResourceStore((s) => s.xp);

  const [usernameInput, setUsernameInput] = useState(profile?.username ?? '');
  const [savingName, setSavingName]       = useState(false);
  const [syncing, setSyncing]             = useState(false);
  const [claiming, setClaiming]           = useState(false);
  const [statusMsg, setStatusMsg]         = useState('');
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setUsernameInput(profile?.username ?? '');
  }, [profile?.username]);

  // Compute stats
  const ownedCreatures = creatures.filter((c) => c.wildExpiresAt === null);
  const level = xpToLevel(xp);
  const rarityScore = ownedCreatures.reduce((sum, c) => {
    const rarity = SPECIES_MAP.get(c.speciesId)?.rarity ?? 'common';
    return sum + (RARITY_SCORE[rarity] ?? 1) * (c.isShiny ? 2 : 1);
  }, 0);

  // Rarest creature
  const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  const rarestCreature = ownedCreatures.reduce<typeof ownedCreatures[0] | null>((best, c) => {
    if (!best) return c;
    const ra = rarityOrder.indexOf(SPECIES_MAP.get(c.speciesId)?.rarity ?? 'common');
    const rb = rarityOrder.indexOf(SPECIES_MAP.get(best.speciesId)?.rarity ?? 'common');
    return ra < rb ? c : best;
  }, null);

  const rarestDef   = rarestCreature ? SPECIES_MAP.get(rarestCreature.speciesId) : null;
  const rarestRarity = rarestDef?.rarity ?? 'common';

  function showStatus(msg: string) {
    setStatusMsg(msg);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setStatusMsg(''), 2500);
  }

  async function handleSaveName() {
    if (!usernameInput.trim() || savingName) return;
    setSavingName(true);
    const ok = await SupabaseService.setUsername(usernameInput.trim());
    setSavingName(false);
    showStatus(ok ? '✓ Name saved' : '✗ Name taken or offline');
  }

  async function handleSync() {
    if (syncing || !userId) return;
    setSyncing(true);
    const ok = await SupabaseService.submitScore();
    setSyncing(false);
    showStatus(ok ? '✓ Score synced' : '✗ Offline — try later');
  }

  async function handleClaim() {
    if (claiming || !profile || profile.pendingGold <= 0) return;
    setClaiming(true);
    const earned = await SupabaseService.claimPendingGold();
    setClaiming(false);
    showStatus(earned > 0 ? `✓ +${earned} Gold claimed!` : '✗ Offline — try later');
  }

  const panelBg = isDark ? '#1C1C1E' : '#FFFDF4';
  const cardBg  = isDark ? '#2C2C2E' : '#FFFFFF';
  const divider = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(80,60,20,0.10)';

  const displayName = profile?.username ?? (userId ? `Anon_${userId.slice(0, 6)}` : 'Offline');

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <View style={[styles.sheet, { backgroundColor: panelBg }]}>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: divider }]}>
            <Text style={[styles.title, { color: colors.text }]}>👤  Profile</Text>
            <Pressable onPress={onClose} hitSlop={14}>
              <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          {/* Identity */}
          <View style={[styles.identityCard, { backgroundColor: cardBg, borderColor: divider }]}>
            <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
            {isAnonymous && (
              <Text style={[styles.anonNote, { color: colors.textMuted }]}>
                Anonymous account
              </Text>
            )}
            <View style={[styles.levelRow]}>
              <Text style={[styles.levelBadge, { backgroundColor: colors.green }]}>
                Lv {level}
              </Text>
              <Text style={[styles.xpText, { color: colors.textMuted }]}>
                {xp} XP
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={[styles.statsRow, { borderColor: divider }]}>
            <StatBox label="Creatures" value={String(ownedCreatures.length)} colors={colors} />
            <View style={[styles.statDivider, { backgroundColor: divider }]} />
            <StatBox label="Rarity Score" value={String(rarityScore)} colors={colors} />
            <View style={[styles.statDivider, { backgroundColor: divider }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: rarestDef ? RARITY_COLOR[rarestRarity] : colors.textMuted }]}>
                {rarestDef?.name ?? '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rarest</Text>
            </View>
          </View>

          {/* Username editor */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Display Name</Text>
            <View style={[styles.nameRow]}>
              <TextInput
                style={[styles.nameInput, {
                  color: colors.text,
                  backgroundColor: cardBg,
                  borderColor: divider,
                }]}
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="Set a username…"
                placeholderTextColor={colors.textMuted}
                maxLength={24}
                autoCapitalize="none"
              />
              <Pressable
                onPress={handleSaveName}
                disabled={savingName || !usernameInput.trim() || !userId}
                style={[styles.saveBtn, { backgroundColor: colors.green }]}
              >
                {savingName
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>Save</Text>
                }
              </Pressable>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleSync}
              disabled={syncing || !userId}
              style={[styles.actionBtn, { backgroundColor: cardBg, borderColor: divider }]}
            >
              {syncing
                ? <ActivityIndicator size="small" color={colors.textMuted} />
                : <Text style={[styles.actionBtnText, { color: colors.text }]}>
                    📊  Sync to Leaderboard
                  </Text>
              }
            </Pressable>

            {(profile?.pendingGold ?? 0) > 0 && (
              <Pressable
                onPress={handleClaim}
                disabled={claiming}
                style={[styles.actionBtn, styles.claimBtn]}
              >
                {claiming
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.claimBtnText}>
                      🪙  Claim {profile!.pendingGold} Gold from sales
                    </Text>
                }
              </Pressable>
            )}
          </View>

          {/* Status message */}
          {!!statusMsg && (
            <Text style={[styles.status, { color: statusMsg.startsWith('✓') ? colors.green : '#EF4444' }]}>
              {statusMsg}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function StatBox({
  label, value, colors,
}: {
  label: string; value: string; colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 300 },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.24, shadowRadius: 14, elevation: 24,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1,
  },
  title:  { fontSize: 20, fontWeight: '800' },
  closeX: { fontSize: 17, fontWeight: '700' },

  identityCard: {
    margin: 16, borderRadius: 14, borderWidth: 1,
    padding: 16, alignItems: 'center', gap: 6,
  },
  displayName: { fontSize: 22, fontWeight: '800' },
  anonNote:    { fontSize: 12 },
  levelRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelBadge:  { color: '#fff', fontWeight: '800', fontSize: 12, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  xpText:      { fontSize: 12 },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, borderRadius: 14, borderWidth: 1,
    overflow: 'hidden', marginBottom: 16,
  },
  statBox:    { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
  statValue:  { fontSize: 18, fontWeight: '800' },
  statLabel:  { fontSize: 10 },
  statDivider: { width: 1, marginVertical: 8 },

  section:      { paddingHorizontal: 16, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  nameRow:      { flexDirection: 'row', gap: 8 },
  nameInput: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15,
  },
  saveBtn:     { borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  actions:      { paddingHorizontal: 16, gap: 8 },
  actionBtn: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  claimBtn:      { backgroundColor: '#78350F' },
  claimBtnText:  { color: '#FDE68A', fontWeight: '800', fontSize: 14 },

  status: { textAlign: 'center', fontSize: 13, fontWeight: '700', marginTop: 10 },
});
