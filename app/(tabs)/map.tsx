/**
 * Map Screen — the primary game view.
 * Hosts MapCanvas (Skia terrain grid + camera), ResourceBar HUD, and ActionMenu.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapCanvas from '../../src/components/map/MapCanvas';
import ResourceBar from '../../src/components/ui/ResourceBar';
import ActionMenu from '../../src/components/ui/ActionMenu';
import { useTheme } from '../../src/constants/theme';

export default function MapScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      {/* Full-screen game canvas */}
      <MapCanvas />

      {/* Top HUD — resource bar */}
      <ResourceBar />

      {/* Bottom tool tray */}
      <ActionMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
