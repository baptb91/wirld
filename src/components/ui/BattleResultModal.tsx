/**
 * BattleResultModal — shown after each ravager wave ends.
 * Displays ravagers defeated/escaped, resources stolen, plants destroyed,
 * and creatures lost. Player dismisses it to clear battleReport.
 */
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRavagerStore } from '../../store/ravagerStore';
import {
  RESOURCE_DISPLAY,
  RESOURCE_DISPLAY_FALLBACK,
} from '../../constants/resourceDisplay';
import { useTheme } from '../../constants/theme';

export default function BattleResultModal() {
  const battleReport   = useRavagerStore((s) => s.battleReport);
  const setBattleReport = useRavagerStore((s) => s.setBattleReport);

  const { colors, isDark } = useTheme();

  if (!battleReport) return null;

  const {
    ravagersDefeated,
    ravagersEscaped,
    plantsDestroyed,
    creaturesLost,
    resourcesStolen,
  } = battleReport;

  const totalRavagers = ravagersDefeated + ravagersEscaped;
  const victorious    = ravagersDefeated === totalRavagers;
  const resourceRows  = Object.entries(resourcesStolen).filter(([, v]) => v > 0);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => setBattleReport(null)}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, victorious && styles.headerVictory]}>
            <Text style={styles.headerEmoji}>{victorious ? '🛡️' : '💀'}</Text>
            <Text style={styles.headerTitle}>
              {victorious ? 'Attack Repelled!' : 'Wave Complete'}
            </Text>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Ravager outcome */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Ravagers</Text>
              <Row emoji="⚔️" label="Defeated" value={ravagersDefeated} color="#059669" labelColor={colors.text} />
              <Row emoji="🏃" label="Escaped"  value={ravagersEscaped}  color={ravagersEscaped > 0 ? '#DC2626' : '#6B7280'} labelColor={colors.text} />
            </View>

            {/* Losses */}
            {(plantsDestroyed > 0 || creaturesLost > 0 || resourceRows.length > 0) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Losses</Text>
                {plantsDestroyed > 0 && (
                  <Row emoji="🌿" label="Plants destroyed" value={plantsDestroyed} color="#DC2626" labelColor={colors.text} />
                )}
                {creaturesLost > 0 && (
                  <Row emoji="💔" label="Creatures lost"   value={creaturesLost}   color="#DC2626" labelColor={colors.text} />
                )}
                {resourceRows.map(([id, amount]) => {
                  const def = RESOURCE_DISPLAY[id] ?? RESOURCE_DISPLAY_FALLBACK;
                  return (
                    <Row
                      key={id}
                      emoji={def.emoji}
                      label={`${def.label} stolen`}
                      value={amount}
                      color="#DC2626"
                      labelColor={colors.text}
                    />
                  );
                })}
              </View>
            )}

            {plantsDestroyed === 0 && creaturesLost === 0 && resourceRows.length === 0 && (
              <Text style={styles.noLosses}>No losses — well defended! 🌟</Text>
            )}
          </ScrollView>

          <Pressable
            style={[styles.closeBtn, isDark && { backgroundColor: '#374151' }]}
            onPress={() => setBattleReport(null)}
          >
            <Text style={styles.closeBtnText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Row helper
// ---------------------------------------------------------------------------

function Row({
  emoji, label, value, color, labelColor,
}: {
  emoji: string; label: string; value: number; color: string; labelColor: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.rowValue, { color }]}>{value}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  card: {
    width:           300,
    maxHeight:       480,
    backgroundColor: '#FFFDF4',
    borderRadius:    20,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.4,
    shadowRadius:    10,
    elevation:       14,
  },
  header: {
    backgroundColor: '#7A0000',
    paddingVertical: 16,
    alignItems:      'center',
    gap:             4,
  },
  headerVictory: {
    backgroundColor: '#065F46',
  },
  headerEmoji: { fontSize: 32 },
  headerTitle: {
    color:      '#fff',
    fontWeight: '800',
    fontSize:   20,
  },
  body: { maxHeight: 280 },
  bodyContent: {
    paddingHorizontal: 18,
    paddingVertical:   14,
    gap:               12,
  },
  section: { gap: 6 },
  sectionTitle: {
    fontSize:   11,
    fontWeight: '700',
    color:      '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom:  2,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
  },
  rowEmoji: { fontSize: 16, width: 24 },
  rowLabel: {
    flex:       1,
    fontSize:   14,
    color:      '#333',
  },
  rowValue: {
    fontSize:   16,
    fontWeight: '800',
    minWidth:   28,
    textAlign:  'right',
  },
  noLosses: {
    textAlign:  'center',
    color:      '#059669',
    fontWeight: '600',
    fontSize:   14,
    paddingVertical: 8,
  },
  closeBtn: {
    margin:          16,
    backgroundColor: '#1F2937',
    borderRadius:    12,
    paddingVertical: 12,
    alignItems:      'center',
  },
  closeBtnText: {
    color:      '#fff',
    fontWeight: '800',
    fontSize:   16,
  },
});
