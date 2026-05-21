// lib/audio.ts
// Full-app background music + game sound effects.

import { Audio } from 'expo-av';
import type { MusicTheme } from './storage';

type SoundName = 'tap' | 'wordFound' | 'win';

const SOUND_FILES: Record<SoundName, any> = {
  tap: require('../assets/sounds/tap.wav'),
  wordFound: require('../assets/sounds/word-found.wav'),
  win: require('../assets/sounds/win.wav'),
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

export async function playRelaxMusic(enabled: boolean, theme: MusicTheme = 'relax') {
  try {
    await setupAudio();

    if (!enabled) {
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
        volume: 0.28,
        shouldPlay: true,
      });

      music = created.sound;
      currentTheme = theme;
      return;
    }

    const status = await music.getStatusAsync();

    if (status.isLoaded && !status.isPlaying) {
      await music.playAsync();
    }
  } catch {}
}

export async function playGameSound(name: SoundName, enabled: boolean) {
  if (!enabled) return;

  try {
    await setupAudio();

    if (!soundCache[name]) {
      const created = await Audio.Sound.createAsync(SOUND_FILES[name], {
        volume: name === 'tap' ? 0.18 : 0.45,
      });

      soundCache[name] = created.sound;
    }

    const sound = soundCache[name];
    if (!sound) return;

    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {}
}
