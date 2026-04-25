import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { theme, useTheme } from '../../src/constants/theme';
import { useGameLoop } from '../../src/hooks/useGameLoop';
import { useCreatureAI } from '../../src/hooks/useCreatureAI';
import { useBreedingEngine } from '../../src/hooks/useBreedingEngine';
import OfflineSummaryModal from '../../src/components/ui/OfflineSummaryModal';
import { SoundService } from '../../src/services/SoundService';
import { PurchaseService } from '../../src/services/PurchaseService';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useAdStore } from '../../src/store/adStore';
import { usePurchaseStore } from '../../src/store/purchaseStore';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {emoji}
    </Text>
  );
}

export default function TabLayout() {
  // Game-loop hooks live here so they run regardless of which tab is active
  useGameLoop();
  useCreatureAI();
  useBreedingEngine();

  const ambientEnabled = useSettingsStore((s) => s.ambientEnabled);
  const { colors } = useTheme();

  useEffect(() => {
    useSettingsStore.getState().loadSettings();
    useAdStore.getState().loadAdState();
    usePurchaseStore.getState().initFirstInstall();
    SoundService.init();
    PurchaseService.init();
  }, []);

  useEffect(() => {
    if (ambientEnabled) {
      SoundService.startAmbient();
    } else {
      SoundService.stopAmbient();
    }
  }, [ambientEnabled]);

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 58,
            paddingBottom: 6,
          },
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="map"
          options={{
            title: 'Terrain',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="creatures"
          options={{
            title: 'Creatures',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🦎" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
          }}
        />
      </Tabs>

      {/* Offline earnings modal — rendered above all tabs */}
      <OfflineSummaryModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.55,
  },
  tabIconFocused: {
    opacity: 1,
  },
});
