import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../src/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🗺️</Text>
        <Text style={styles.title}>Lost in the wilds?</Text>
        <Text style={styles.body}>This screen doesn't exist.</Text>
        <Link href="/(tabs)/map" style={styles.link}>
          <Text style={styles.linkText}>Return to the map →</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  emoji: { fontSize: 60 },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 24,
    color: theme.colors.text,
  },
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  link: {
    marginTop: 8,
  },
  linkText: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.green,
    textDecorationLine: 'underline',
  },
});
