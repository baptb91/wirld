/**
 * Map Screen — the primary game view.
 * Hosts MapCanvas (Skia terrain grid + camera), ResourceBar HUD, and ActionMenu.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapCanvas from '../../src/components/map/MapCanvas';
import ResourceBar from '../../src/components/ui/ResourceBar';
import ActionMenu from '../../src/components/ui/ActionMenu';
import AdBonusPanel from '../../src/components/ui/AdBonusPanel';
import { useTheme } from '../../src/constants/theme';
import { usePurchaseStore } from '../../src/store/purchaseStore';

export default function MapScreen() {
  const { colors, isDark } = useTheme();
  const [bonusPanelOpen, setBonusPanelOpen] = useState(false);
  const isAdFree = usePurchaseStore((s) => s.isPro);

  const btnBg = isDark ? 'rgba(44,44,46,0.92)' : 'rgba(245,240,232,0.92)';

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      {/* Full-screen game canvas */}
      <MapCanvas />

      {/* Top HUD — resource bar */}
      <ResourceBar />

      {/* Bonuses floating button — hidden when ads are removed */}
      {!isAdFree && (
        <Pressable
          style={[styles.bonusBtn, { backgroundColor: btnBg }]}
          onPress={() => setBonusPanelOpen(true)}
        >
          <Text style={[styles.bonusBtnText, { color: colors.gold }]}>✨ Bonuses</Text>
        </Pressable>
      )}

      {/* Bottom tool tray */}
      <ActionMenu />

      {/* Ad bonus sheet */}
      {bonusPanelOpen && (
        <AdBonusPanel onClose={() => setBonusPanelOpen(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bonusBtn: {
    position:     'absolute',
    top:          52,
    right:        12,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical:   5,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 1 },
    shadowOpacity:     0.20,
    shadowRadius:      3,
    elevation:         4,
  },
  bonusBtnText: {
    fontSize:   12,
    fontWeight: '700',
  },
});
