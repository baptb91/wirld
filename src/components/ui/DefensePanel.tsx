/**
 * DefensePanel — shown during ravager waves when the player is online.
 *
 * Lists placed defense structures and lets the player manually activate
 * each one for a +30% effectiveness bonus over the auto-activation baseline.
 *
 * Palisade   — "Reinforce" adds +1 block (shown as HP)
 * BaitTrap   — "Prime" boosts slow duration to 6.5 min (vs 5 min auto)
 * Watchtower — passive; no button (early-warning benefit is automatic)
 * GuardianTotem — "Invoke" boosts next-interval bonus to 26% (vs 20% auto)
 */
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMapStore, BuildingPlacement } from '../../store/mapStore';
import { useRavagerStore } from '../../store/ravagerStore';
import { BUILDING_MAP } from '../../constants/buildings';

const DEFENSE_TYPE_IDS = ['palisade', 'baitTrap', 'watchtower', 'guardianTotem'] as const;

interface DefenseInfo {
  action:      string;
  description: string;
}

const DEFENSE_INFO: Record<string, DefenseInfo> = {
  palisade:      { action: 'Reinforce',  description: 'Blocks +1 ravager' },
  baitTrap:      { action: 'Prime',      description: '+30% slow duration' },
  watchtower:    { action: '',           description: '1h warning active' },
  guardianTotem: { action: 'Invoke',     description: '+6% delay bonus' },
};

function DefenseCard({
  building,
  isActivated,
  onActivate,
}: {
  building:    BuildingPlacement;
  isActivated: boolean;
  onActivate:  () => void;
}) {
  const def     = BUILDING_MAP.get(building.buildingTypeId);
  const info    = DEFENSE_INFO[building.buildingTypeId];
  const passive = building.buildingTypeId === 'watchtower';

  const hpText = building.buildingTypeId === 'palisade' && building.defenseHp !== undefined
    ? ` ${building.defenseHp} HP`
    : '';

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{def?.emoji}</Text>
      <Text style={styles.name}>{def?.name}{hpText}</Text>
      <Text style={styles.desc}>{info?.description}</Text>

      {passive ? (
        <View style={[styles.btn, styles.passiveBtn]}>
          <Text style={styles.passiveTxt}>Passive</Text>
        </View>
      ) : isActivated ? (
        <View style={[styles.btn, styles.activeBtn]}>
          <Text style={styles.activeTxt}>+30% Active</Text>
        </View>
      ) : (
        <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={onActivate}>
          <Text style={styles.btnTxt}>{info?.action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function DefensePanel() {
  const waveActive         = useRavagerStore((s) => s.ravagers.length > 0);
  const activatedDefenseIds = useRavagerStore((s) => s.activatedDefenseIds);
  const activateDefense    = useRavagerStore((s) => s.activateDefense);
  const buildings          = useMapStore((s) => s.buildings);
  const updateBuilding     = useMapStore((s) => s.updateBuilding);

  if (!waveActive) return null;

  const defenseBuildings = buildings.filter((b) =>
    (DEFENSE_TYPE_IDS as readonly string[]).includes(b.buildingTypeId),
  );
  if (defenseBuildings.length === 0) return null;

  function handleActivate(b: BuildingPlacement) {
    if (activatedDefenseIds.includes(b.id)) return;
    activateDefense(b.id);
    // Palisade: immediately grant +1 block
    if (b.buildingTypeId === 'palisade') {
      updateBuilding(b.id, { defenseHp: (b.defenseHp ?? 2) + 1 });
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>⚔️ Defenses</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {defenseBuildings.map((b) => (
          <DefenseCard
            key={b.id}
            building={b}
            isActivated={activatedDefenseIds.includes(b.id)}
            onActivate={() => handleActivate(b)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  panel: {
    position:          'absolute',
    bottom:            90,
    left:              8,
    right:             8,
    backgroundColor:   'rgba(10,5,0,0.90)',
    borderRadius:      14,
    paddingVertical:   10,
    paddingHorizontal: 12,
    borderWidth:       1,
    borderColor:       'rgba(180,60,0,0.5)',
  },
  title: {
    color:         '#FFD700',
    fontWeight:    '800',
    fontSize:      12,
    marginBottom:  8,
    letterSpacing: 0.6,
  },
  list: {
    gap:          8,
    paddingRight: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius:    10,
    padding:         10,
    alignItems:      'center',
    width:           100,
    gap:             3,
  },
  emoji: { fontSize: 22 },
  name:  {
    color:      '#fff',
    fontWeight: '700',
    fontSize:   11,
    textAlign:  'center',
  },
  desc: {
    color:     '#aaa',
    fontSize:  9,
    textAlign: 'center',
    minHeight: 22,
  },
  btn: {
    marginTop:         4,
    backgroundColor:   '#7A0000',
    borderRadius:      8,
    paddingHorizontal: 10,
    paddingVertical:   4,
    alignItems:        'center',
    minWidth:          72,
  },
  btnPressed: { backgroundColor: '#9B0000' },
  btnTxt:     { color: '#fff', fontWeight: '700', fontSize: 11 },
  activeBtn:  { backgroundColor: '#065F46' },
  activeTxt:  { color: '#6EE7B7', fontWeight: '700', fontSize: 10 },
  passiveBtn: { backgroundColor: 'rgba(255,255,255,0.08)' },
  passiveTxt: { color: '#888', fontSize: 10 },
});
