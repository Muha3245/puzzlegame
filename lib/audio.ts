// lib/audio.ts
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

type AudioPlayer = ReturnType<typeof createAudioPlayer>;
export type SoundName = 'tap' | 'wordFound' | 'win' | 'wrong' | 'draw' | 'lose' | 'battleRequest';

const SOUND_FILES: Record<SoundName, any> = {
  tap: require('../assets/sounds/tap.wav'),
  wordFound: require('../assets/sounds/word-found.wav'),
  win: require('../assets/sounds/win.wav'),
  wrong: require('../assets/sounds/wrong.wav'),
  draw: require('../assets/sounds/draw.wav'),
  lose: require('../assets/sounds/lose.wav'),
  battleRequest: require('../assets/sounds/battle-request.wav'),
};

let audioReady = false;
const soundCache: Partial<Record<SoundName, AudioPlayer>> = {};

function getSoundVolume(name: SoundName) {
  if (name === 'tap') return 0.28;
  if (name === 'wrong') return 0.45;
  if (name === 'draw') return 0.45;
  if (name === 'battleRequest') return 0.70;
  return 0.65;
}

async function setupAudio() {
  if (audioReady) return;
  audioReady = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
  } catch {
    // Keep game running even if audio session setup is unavailable on a platform.
  }
}

function releasePlayer(player: AudioPlayer | null | undefined) {
  if (!player) return;
  try { player.pause(); } catch {}
  try { player.remove(); } catch {}
}

export async function preloadSounds() {
  try {
    await setupAudio();
    (Object.keys(SOUND_FILES) as SoundName[]).forEach((name) => {
      if (soundCache[name]) return;
      const player = createAudioPlayer(SOUND_FILES[name]);
      player.volume = getSoundVolume(name);
      soundCache[name] = player;
    });
  } catch {}
}

export async function playGameSound(name: SoundName, enabled: boolean) {
  if (!enabled) return;
  try {
    await setupAudio();
    if (!soundCache[name]) {
      const player = createAudioPlayer(SOUND_FILES[name]);
      player.volume = getSoundVolume(name);
      soundCache[name] = player;
    }
    const sound = soundCache[name];
    if (!sound) return;
    try { sound.seekTo(0); } catch {}
    sound.volume = getSoundVolume(name);
    sound.play();
  } catch {}
}

export async function playTapSound(enabled = true) { return playGameSound('tap', enabled); }
export async function playCorrectSound(enabled = true) { return playGameSound('wordFound', enabled); }
export async function playWrongSound(enabled = true) { return playGameSound('wrong', enabled); }
export async function playWinSound(enabled = true) { return playGameSound('win', enabled); }
export async function playLoseSound(enabled = true) { return playGameSound('lose', enabled); }
export async function playDrawSound(enabled = true) { return playGameSound('draw', enabled); }
export async function playBattleRequestSound(enabled = true) { return playGameSound('battleRequest', enabled); }

export async function unloadSounds() {
  (Object.keys(soundCache) as SoundName[]).forEach((key) => {
    releasePlayer(soundCache[key]);
    delete soundCache[key];
  });
  audioReady = false;
}
