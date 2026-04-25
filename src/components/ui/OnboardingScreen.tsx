import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '../../store/settingsStore';

const { width: SCREEN_W } = Dimensions.get('window');

interface Slide {
  key: string;
  emoji: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    key: 'terrain',
    emoji: '🗺️',
    title: 'Build Your Terrain',
    body: 'Place habitats on the map — forests, ponds, caves — each attracting different wild creatures to your world.',
  },
  {
    key: 'capture',
    emoji: '🦎',
    title: 'Capture & Collect',
    body: 'Wild creatures appear on a schedule. Tap to capture them, name them, and discover rare shiny variants.',
  },
  {
    key: 'online',
    emoji: '🌐',
    title: 'Trade & Compete',
    body: 'List creatures on the market, climb the leaderboard by rarity score, and challenge other tamers worldwide.',
  },
];

export default function OnboardingScreen() {
  const [index, setIndex]   = useState(0);
  const listRef             = useRef<FlatList>(null);
  const fadeAnim            = useRef(new Animated.Value(0)).current;
  const completeOnboarding  = useSettingsStore((s) => s.completeOnboarding);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  function goNext() {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    } else {
      completeOnboarding();
    }
  }

  function goSkip() {
    completeOnboarding();
  }

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <SafeAreaView style={styles.safe}>
        {/* Skip */}
        <Pressable style={styles.skip} onPress={goSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>

        {/* Slides */}
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(s) => s.key}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )}
        />

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.75 }]}
          onPress={goNext}
        >
          <Text style={styles.ctaText}>
            {index < SLIDES.length - 1 ? 'Next' : 'Start Playing'}
          </Text>
        </Pressable>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4A7C59',
    zIndex: 999,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  skip: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontFamily: 'NunitoSans_400Regular',
  },
  slide: {
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    flex: 1,
  },
  emoji: {
    fontSize: 90,
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Lora_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  cta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 48,
    paddingVertical: 16,
    marginHorizontal: 40,
    alignItems: 'center',
    marginBottom: 8,
  },
  ctaText: {
    fontFamily: 'Lora_700Bold',
    fontSize: 18,
    color: '#4A7C59',
  },
});
