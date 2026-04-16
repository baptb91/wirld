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

export default function MapScreen() {
  return (
    <View style={styles.root}>
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
  root: {
    flex: 1,
    backgroundColor: '#E8F5E0',
  },
});
