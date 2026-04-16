import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../src/constants/theme';
import { useGameLoop } from '../../src/hooks/useGameLoop';
import { useCreatureAI } from '../../src/hooks/useCreatureAI';
import OfflineSummaryModal from '../../src/components/ui/OfflineSummaryModal';

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

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: theme.colors.tabActive,
          tabBarInactiveTintColor: theme.colors.tabInactive,
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
  tabBar: {
    backgroundColor: theme.colors.tabBar,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    height: 58,
    paddingBottom: 6,
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
