/**
 * LeaderboardPanel — top 50 players ranked by rarity score.
 * Current player's row is highlighted. Pull-to-refresh supported.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useOnlineStore } from '../../store/onlineStore';
import { SupabaseService } from '../../services/SupabaseService';
import { useTheme } from '../../constants/theme';
import type { LeaderboardEntry } from '../../store/onlineStore';

interface Props { onClose: () => void }

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPanel({ onClose }: Props) {
  const { colors, isDark } = useTheme();

  const userId      = useOnlineStore((s) => s.userId);
  const leaderboard = useOnlineStore((s) => s.leaderboard);

  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    await SupabaseService.fetchLeaderboard();
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const panelBg = isDark ? '#1C1C1E' : '#FFFDF4';
  const cardBg  = isDark ? '#2C2C2E' : '#FFFFFF';
  const divider = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(80,60,20,0.10)';

  function renderRow({ item, index }: { item: LeaderboardEntry; index: number }) {
    const isMe = item.id === userId;
    const bg   = isMe ? (isDark ? '#1E3A2F' : '#EAF7EF') : cardBg;
    const rank = index + 1;

    return (
      <View style={[styles.row, { backgroundColor: bg, borderColor: divider }]}>
        <Text style={[styles.rank, { color: isMe ? colors.green : colors.textMuted }]}>
          {rank <= 3 ? MEDAL[rank - 1] : `#${rank}`}
        </Text>
        <View style={styles.rowInfo}>
          <Text style={[styles.name, { color: colors.text }, isMe && styles.nameBold]}>
            {item.displayName}
            {isMe ? '  (you)' : ''}
          </Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            Lv {item.level}  ·  {item.creatureCount} creatures
          </Text>
        </View>
        <Text style={[styles.score, { color: isMe ? colors.green : colors.gold }]}>
          {item.rarityScore}
        </Text>
      </View>
    );
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <View style={[styles.sheet, { backgroundColor: panelBg }]}>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: divider }]}>
            <Text style={[styles.title, { color: colors.text }]}>🏆  Leaderboard</Text>
            <Pressable onPress={onClose} hitSlop={14}>
              <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          {/* Column headers */}
          <View style={[styles.colHeader, { borderBottomColor: divider }]}>
            <Text style={[styles.colRank,  { color: colors.textMuted }]}>Rank</Text>
            <Text style={[styles.colName,  { color: colors.textMuted }]}>Player</Text>
            <Text style={[styles.colScore, { color: colors.textMuted }]}>Score</Text>
          </View>

          {loading && leaderboard.length === 0 ? (
            <ActivityIndicator color={colors.green} style={styles.loader} />
          ) : leaderboard.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No scores yet — sync your score to appear here!
              </Text>
            </View>
          ) : (
            <FlatList
              data={leaderboard}
              keyExtractor={(e) => e.id}
              renderItem={renderRow}
              contentContainerStyle={styles.list}
              onRefresh={load}
              refreshing={loading}
              showsVerticalScrollIndicator={false}
            />
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 300 },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.24, shadowRadius: 14, elevation: 24,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1,
  },
  title:  { fontSize: 20, fontWeight: '800' },
  closeX: { fontSize: 17, fontWeight: '700' },
  loader: { marginTop: 40 },

  colHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1,
  },
  colRank:  { width: 44, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  colName:  { flex: 1,   fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  colScore: { width: 56, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' },

  list: { padding: 10, gap: 6, paddingBottom: 30 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
  },
  rank:     { width: 36, fontSize: 16, textAlign: 'center', fontWeight: '800' },
  rowInfo:  { flex: 1, gap: 2 },
  name:     { fontSize: 14, fontWeight: '600' },
  nameBold: { fontWeight: '800' },
  sub:      { fontSize: 11 },
  score:    { width: 50, fontSize: 18, fontWeight: '800', textAlign: 'right' },

  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
