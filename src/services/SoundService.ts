/**
 * SoundService — thin wrapper around expo-av for all in-game sounds.
 *
 * Design:
 *   • SFX (tap, capture, etc.) use fire-and-forget: create Sound, play, then
 *     unload automatically via onPlaybackStatusUpdate.
 *   • Ambient is a persistent looping Sound instance managed here.
 *   • All sounds respect the iOS silent switch (playsInSilentModeIOS: false).
 *   • Settings (enabled, volume) are read from settingsStore at call time so
 *     the service never needs to subscribe to React state.
 *
 * Usage:
 *   SoundService.init()           — call once (e.g. in _layout.tsx useEffect)
 *   SoundService.play('tapHerbivore')
 *   SoundService.startAmbient()   — call when ambientEnabled turns true
 *   SoundService.stopAmbient()    — call when ambientEnabled turns false
 */
import { Audio } from 'expo-av';
import { useSettingsStore } from '../store/settingsStore';

// ---------------------------------------------------------------------------
// Sound asset map
// ---------------------------------------------------------------------------

export type SfxKey =
  | 'tapHerbivore'
  | 'tapCarnivore'
  | 'tapAquatic'
  | 'captureSuccess'
  | 'ravagerWarning'
  | 'breedingComplete'
  | 'doorOpen'
  | 'doorClose';

const SFX_SOURCES: Record<SfxKey, number> = {
  tapHerbivore:    require('../../assets/sounds/creature_tap_herbivore.wav'),
  tapCarnivore:    require('../../assets/sounds/creature_tap_carnivore.wav'),
  tapAquatic:      require('../../assets/sounds/creature_tap_aquatic.wav'),
  captureSuccess:  require('../../assets/sounds/capture_success.wav'),
  ravagerWarning:  require('../../assets/sounds/ravager_warning.wav'),
  breedingComplete: require('../../assets/sounds/breeding_complete.wav'),
  doorOpen:        require('../../assets/sounds/habitat_door_open.wav'),
  doorClose:       require('../../assets/sounds/habitat_door_close.wav'),
};

const AMBIENT_SOURCE: number = require('../../assets/sounds/ambient_nature.wav');

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let audioModeSet = false;
let ambientSound: Audio.Sound | null = null;
let ambientRunning = false;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function ensureAudioMode(): Promise<void> {
  if (audioModeSet) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS:        false,
      playsInSilentModeIOS:      false, // respect iOS silent switch
      staysActiveInBackground:   false,
      shouldDuckAndroid:         true,
      playThroughEarpieceAndroid: false,
    });
    audioModeSet = true;
  } catch {
    // non-critical — sounds may not work but app continues
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const SoundService = {
  /** Set up audio mode. Call once at app start. */
  async init(): Promise<void> {
    await ensureAudioMode();
  },

  /**
   * Fire-and-forget SFX playback.
   * Creates a new Sound instance, plays it, and unloads when done.
   */
  play(key: SfxKey): void {
    const { sfxEnabled, sfxVolume } = useSettingsStore.getState();
    if (!sfxEnabled) return;

    const source = SFX_SOURCES[key];
    if (!source) return;

    // Run async without awaiting so callers stay synchronous
    (async () => {
      try {
        await ensureAudioMode();
        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: true,
          volume: Math.max(0, Math.min(1, sfxVolume)),
        });
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
          }
        });
      } catch {
        // silently ignore — audio is non-critical
      }
    })();
  },

  /** Start (or resume) the ambient nature loop. */
  async startAmbient(): Promise<void> {
    const { ambientEnabled, ambientVolume } = useSettingsStore.getState();
    if (!ambientEnabled || ambientRunning) return;

    try {
      await ensureAudioMode();
      const { sound } = await Audio.Sound.createAsync(AMBIENT_SOURCE, {
        shouldPlay:  true,
        isLooping:   true,
        volume:      Math.max(0, Math.min(1, ambientVolume)),
      });
      ambientSound   = sound;
      ambientRunning = true;
    } catch {
      // silently ignore
    }
  },

  /** Stop and unload the ambient loop. */
  async stopAmbient(): Promise<void> {
    if (!ambientSound) return;
    try {
      await ambientSound.stopAsync();
      await ambientSound.unloadAsync();
    } catch {
      // ignore
    } finally {
      ambientSound   = null;
      ambientRunning = false;
    }
  },

  /** Update ambient volume live without restarting the loop. */
  async setAmbientVolume(v: number): Promise<void> {
    if (!ambientSound) return;
    try {
      await ambientSound.setVolumeAsync(Math.max(0, Math.min(1, v)));
    } catch {
      // ignore
    }
  },
};
