import { useFonts, Lora_700Bold } from '@expo-google-fonts/lora';
import {
  NunitoSans_400Regular,
  NunitoSans_700Bold,
} from '@expo-google-fonts/nunito-sans';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSettingsStore } from '../src/store/settingsStore';
import OnboardingScreen from '../src/components/ui/OnboardingScreen';

// Keep the splash screen up while fonts are loading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Lora_700Bold,
    NunitoSans_400Regular,
    NunitoSans_700Bold,
    SpaceMono_400Regular,
  });

  const fadeAnim            = useRef(new Animated.Value(0)).current;
  const settingsLoaded      = useSettingsStore((s) => s.loaded);
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);

  // Load settings early so we know onboarding state before first render
  useEffect(() => {
    useSettingsStore.getState().loadSettings();
  }, []);

  // Hide native splash once fonts ready, then fade the app in
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [fontsLoaded, fontError]);

  // Hold render until fonts and persisted settings are ready
  if ((!fontsLoaded && !fontError) || !settingsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </Animated.View>

      {/* Full-screen onboarding shown on first launch */}
      {!onboardingCompleted && <OnboardingScreen />}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
