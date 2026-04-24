/**
 * settingsStore — persisted user preferences (sound, haptics, notifications).
 *
 * Persistence: loaded from AsyncStorage on first read and saved on every change.
 * Defaults: sfx on, ambient off (per spec), haptics on, notifications on.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@wilds/settings';

interface SettingsState {
  sfxEnabled:      boolean;
  /** Ambient nature loop — off by default per spec */
  ambientEnabled:  boolean;
  sfxVolume:       number; // 0–1
  ambientVolume:   number; // 0–1 (very quiet: 0.12)
  hapticsEnabled:  boolean;
  notifEnabled:    boolean;
  /** True once AsyncStorage has been read */
  loaded:          boolean;
}

interface SettingsActions {
  setSfxEnabled(v: boolean): void;
  setAmbientEnabled(v: boolean): void;
  setSfxVolume(v: number): void;
  setAmbientVolume(v: number): void;
  setHapticsEnabled(v: boolean): void;
  setNotifEnabled(v: boolean): void;
  /** Call once at app start to hydrate from AsyncStorage */
  loadSettings(): Promise<void>;
}

type PersistedSettings = Omit<SettingsState, 'loaded'>;

const DEFAULTS: PersistedSettings = {
  sfxEnabled:     true,
  ambientEnabled: false,
  sfxVolume:      0.60,
  ambientVolume:  0.12,
  hapticsEnabled: true,
  notifEnabled:   true,
};

async function persist(partial: Partial<PersistedSettings>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const prev: PersistedSettings = raw ? JSON.parse(raw) : DEFAULTS;
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...prev, ...partial }));
  } catch {
    // ignore storage failures
  }
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  setSfxEnabled: (v) => {
    set({ sfxEnabled: v });
    persist({ sfxEnabled: v });
  },
  setAmbientEnabled: (v) => {
    set({ ambientEnabled: v });
    persist({ ambientEnabled: v });
  },
  setSfxVolume: (v) => {
    set({ sfxVolume: v });
    persist({ sfxVolume: v });
  },
  setAmbientVolume: (v) => {
    set({ ambientVolume: v });
    persist({ ambientVolume: v });
  },
  setHapticsEnabled: (v) => {
    set({ hapticsEnabled: v });
    persist({ hapticsEnabled: v });
  },
  setNotifEnabled: (v) => {
    set({ notifEnabled: v });
    persist({ notifEnabled: v });
  },

  loadSettings: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved: Partial<PersistedSettings> = JSON.parse(raw);
        set({ ...DEFAULTS, ...saved, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },
}));
