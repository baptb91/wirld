/**
 * HapticsService — thin wrapper around expo-haptics.
 * All calls read hapticsEnabled from settingsStore at invocation time
 * so the service never needs to subscribe to React state.
 */
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/settingsStore';

function enabled(): boolean {
  return useSettingsStore.getState().hapticsEnabled;
}

export const HapticsService = {
  light(): void {
    if (!enabled()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },

  medium(): void {
    if (!enabled()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },

  heavy(): void {
    if (!enabled()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },

  success(): void {
    if (!enabled()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
