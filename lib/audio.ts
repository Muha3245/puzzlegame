// lib/audio.ts
// Full-app background music + game sound effects.

import { Audio } from 'expo-av';
import type { MusicTheme } from './storage';

type SoundName = 'tap' | 'wordFound' | 'win' | 'error';

const SOUND_FILES: Record<SoundName, any> = {
  tap: require('../assets/sounds/tap.wav'),
  wordFound: require('../assets/sounds/word-found.wav'),
  win: require('../assets/sounds/win.wav'),
  error: require('../assets/sounds/tap.wav'),  // reuse tap at very low volume for error feedback
};

const MUSIC_FILES: Record<MusicTheme, any> = {
  relax: require('../assets/sounds/relax-loop.wav'),
  candy: require('../assets/sounds/candy-loop.wav'),
  forest: require('../assets/sounds/forest-loop.wav'),
  puzzle: require('../assets/sounds/puzzle-loop.wav'),
};

let music: Audio.Sound | null = null;
let currentTheme: MusicTheme | null = null;
let audioReady = false;
// Synchronous flag updated before any await so concurrent disable calls
// can cancel an in-flight createAsync before it assigns to `music`.
let musicEnabled = false;

const soundCache: Partial<Record<SoundName, Audio.Sound>> = {};

async function setupAudio() {
  if (audioReady) return;

  audioReady = true;

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });
}

export async function playRelaxMusic(enabled: boolean, theme: MusicTheme = 'relax', volume = 0.5) {
  // Update intent synchronously BEFORE any await so a concurrent disable call
  // made while createAsync is in-flight is not lost.
  musicEnabled = enabled;

  try {
    await setupAudio();

    // Re-read the flag after every await — another call may have flipped it.
    if (!musicEnabled) {
      if (music) {
        await music.stopAsync().catch(() => {});
        await music.unloadAsync().catch(() => {});
        music = null;
        currentTheme = null;
      }
      return;
    }

    if (music && currentTheme !== theme) {
      await music.stopAsync().catch(() => {});
      await music.unloadAsync().catch(() => {});
      music = null;
      currentTheme = null;
    }

    if (!music) {
      const created = await Audio.Sound.createAsync(MUSIC_FILES[theme], {
        isLooping: true,
        volume: Math.max(0, Math.min(1, volume)),
        shouldPlay: true,
      });

      // Music was disabled while createAsync was pending — discard the sound.
      if (!musicEnabled) {
        await created.sound.stopAsync().catch(() => {});
        await created.sound.unloadAsync().catch(() => {});
        return;
      }

      music = created.sound;
      currentTheme = theme;
      return;
    }

    const status = await music.getStatusAsync();

    if (!musicEnabled) {
      await music.stopAsync().catch(() => {});
      await music.unloadAsync().catch(() => {});
      music = null;
      currentTheme = null;
      return;
    }

    if (status.isLoaded && !status.isPlaying) {
      await music.playAsync();
    }

    await music.setVolumeAsync(Math.max(0, Math.min(1, volume))).catch(() => {});
  } catch {}
}

export async function setMusicVolume(volume: number) {
  if (music) await music.setVolumeAsync(Math.max(0, Math.min(1, volume))).catch(() => {});
}

export async function playGameSound(name: SoundName, enabled: boolean) {
  if (!enabled) return;

  try {
    await setupAudio();

    if (!soundCache[name]) {
      const created = await Audio.Sound.createAsync(SOUND_FILES[name], {
        volume: name === 'tap' ? 0.18 : name === 'error' ? 0.06 : 0.45,
      });

      soundCache[name] = created.sound;
    }

    const sound = soundCache[name];
    if (!sound) return;

    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {}
}

// Screen-to-music theme mapping for immersive gaming experience
const SCREEN_MUSIC_MAP: Record<string, MusicTheme> = {
  'index': 'puzzle',
  'levels': 'puzzle',
  '(tabs)/index': 'puzzle',
  '(tabs)/explore': 'puzzle',
  'game': 'relax',
  'battle': 'relax',
  'coins': 'candy',
  'shop': 'candy',
  'profile': 'forest',
  'friends': 'forest',
  'leaderboard': 'forest',
  'winner': 'candy',
};

export function getScreenMusicTheme(routeName: string): MusicTheme {
  return SCREEN_MUSIC_MAP[routeName] || 'relax';
}
