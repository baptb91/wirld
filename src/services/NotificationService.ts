import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOTIF_COUNT_KEY = '@wilds/notifDayCount';
const NOTIF_DATE_KEY  = '@wilds/notifDate';
const DAILY_LIMIT     = 6;

// Set default notification behavior (show alert + sound when app is foregrounded)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

// ---------------------------------------------------------------------------
// Android notification channel (no-op on iOS)
// ---------------------------------------------------------------------------

Notifications.setNotificationChannelAsync('wilds-default', {
  name: 'WILDS',
  importance: Notifications.AndroidImportance.DEFAULT,
  sound: 'default',
});

Notifications.setNotificationChannelAsync('wilds-urgent', {
  name: 'WILDS Alerts',
  importance: Notifications.AndroidImportance.HIGH,
  sound: 'default',
  vibrationPattern: [0, 250, 250, 250],
});

// ---------------------------------------------------------------------------
// Daily limit helpers
// ---------------------------------------------------------------------------

async function getDailyCount(): Promise<number> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const date  = await AsyncStorage.getItem(NOTIF_DATE_KEY);
    if (date !== today) {
      await AsyncStorage.multiSet([[NOTIF_DATE_KEY, today], [NOTIF_COUNT_KEY, '0']]);
      return 0;
    }
    const raw = await AsyncStorage.getItem(NOTIF_COUNT_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

async function incrementDailyCount(): Promise<void> {
  try {
    const count = await getDailyCount();
    await AsyncStorage.setItem(NOTIF_COUNT_KEY, String(count + 1));
  } catch {
    // ignore storage failures
  }
}

// ---------------------------------------------------------------------------
// Core schedule function
// ---------------------------------------------------------------------------

async function schedule(
  title: string,
  body: string,
  isHighPriority = false,
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    let granted = status === 'granted';
    if (!granted) {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      granted = requested === 'granted';
    }
    if (!granted) return;

    if (!isHighPriority) {
      const count = await getDailyCount();
      if (count >= DAILY_LIMIT) return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        ...(isHighPriority && { priority: 'high' }),
      },
      trigger: null,
    });

    if (!isHighPriority) {
      await incrementDailyCount();
    }
  } catch {
    // silently ignore — notifications are non-critical
  }
}

// ---------------------------------------------------------------------------
// Public notification helpers
// ---------------------------------------------------------------------------

export async function notifyWildCreature(speciesName: string): Promise<void> {
  await schedule('A wild creature appeared!', `A ${speciesName} is roaming your map.`);
}

export async function notifyShinyCreature(speciesName: string): Promise<void> {
  await schedule('✨ Shiny creature appeared!', `A shiny ${speciesName} is on your map!`, true);
}

export async function notifyRavagerWarning(
  leadTimeMin = 30,
  targetHint?: string,
): Promise<void> {
  const body = targetHint
    ? `Attack targeting ${targetHint} in ${leadTimeMin} minutes! Prepare defenses.`
    : `A ravager attack is incoming in ${leadTimeMin} minutes!`;
  await schedule('⚠️ Ravager Warning!', body, true);
}

export async function notifyBreedingComplete(): Promise<void> {
  await schedule('Breeding complete!', 'A new creature is ready in your Breeding Hut.');
}

export async function notifyPlantWilting(): Promise<void> {
  await schedule('🌿 Plant wilting!', 'One of your plants needs water soon.');
}

export async function notifyCarnivoreHungry(): Promise<void> {
  await schedule('🥩 Carnivore hungry!', 'A carnivore in your habitat is getting hungry.');
}
