// lib/audio.ts
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

type AudioPlayer = ReturnType<typeof createAudioPlayer>;
export type SoundName =
  | 'tap' | 'wordFound' | 'win' | 'wrong' | 'draw' | 'lose' | 'battleRequest'
  | 'menuOpen' | 'menuClose' | 'letterSelect' | 'wordDrag' | 'wordCompleted'
  | 'levelUnlock' | 'coin' | 'reward' | 'battleStart' | 'battleWin'
  | 'timerWarning' | 'xoxMove' | 'xoxWin' | 'friendRequest' | 'error';

const SOUND_FILES: Record<SoundName, any> = {
  tap:           require('../assets/sounds/tap.wav'),
  wordFound:     require('../assets/sounds/word-found.wav'),
  win:           require('../assets/sounds/win.wav'),
  wrong:         require('../assets/sounds/wrong.wav'),
  draw:          require('../assets/sounds/draw.wav'),
  lose:          require('../assets/sounds/lose.wav'),
  battleRequest: require('../assets/sounds/battle-request.wav'),
  menuOpen:      require('../assets/sounds/menu-open.wav'),
  menuClose:     require('../assets/sounds/menu-close.wav'),
  letterSelect:  require('../assets/sounds/letter-select.wav'),
  wordDrag:      require('../assets/sounds/word-drag.wav'),
  wordCompleted: require('../assets/sounds/word-completed.wav'),
  levelUnlock:   require('../assets/sounds/level-unlock.wav'),
  coin:          require('../assets/sounds/coin.wav'),
  reward:        require('../assets/sounds/reward.wav'),
  battleStart:   require('../assets/sounds/battle-start.wav'),
  battleWin:     require('../assets/sounds/battle-win.wav'),
  timerWarning:  require('../assets/sounds/timer-warning.wav'),
  xoxMove:       require('../assets/sounds/xox-move.wav'),
  xoxWin:        require('../assets/sounds/xox-win.wav'),
  friendRequest: require('../assets/sounds/friend-request.wav'),
  error:         require('../assets/sounds/error.wav'),
};

let audioReady = false;
const soundCache: Partial<Record<SoundName, AudioPlayer>> = {};

function getSoundVolume(name: SoundName) {
  if (name === 'tap' || name === 'letterSelect' || name === 'wordDrag') return 0.28;
  if (name === 'wrong' || name === 'error') return 0.45;
  if (name === 'draw') return 0.45;
  if (name === 'timerWarning') return 0.55;
  if (name === 'menuOpen' || name === 'menuClose' || name === 'xoxMove') return 0.35;
  if (name === 'battleRequest' || name === 'friendRequest') return 0.70;
  if (name === 'reward' || name === 'battleWin' || name === 'levelUnlock' || name === 'xoxWin') return 0.75;
  if (name === 'battleStart') return 0.72;
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
export async function playMenuOpen(enabled = true) { return playGameSound('menuOpen', enabled); }
export async function playMenuClose(enabled = true) { return playGameSound('menuClose', enabled); }
export async function playLetterSelect(enabled = true) { return playGameSound('letterSelect', enabled); }
export async function playWordDrag(enabled = true) { return playGameSound('wordDrag', enabled); }
export async function playWordCompleted(enabled = true) { return playGameSound('wordCompleted', enabled); }
export async function playLevelUnlock(enabled = true) { return playGameSound('levelUnlock', enabled); }
export async function playCoinSound(enabled = true) { return playGameSound('coin', enabled); }
export async function playReward(enabled = true) { return playGameSound('reward', enabled); }
export async function playBattleStart(enabled = true) { return playGameSound('battleStart', enabled); }
export async function playBattleWin(enabled = true) { return playGameSound('battleWin', enabled); }
export async function playTimerWarning(enabled = true) { return playGameSound('timerWarning', enabled); }
export async function playXoxMove(enabled = true) { return playGameSound('xoxMove', enabled); }
export async function playXoxWin(enabled = true) { return playGameSound('xoxWin', enabled); }
export async function playFriendRequest(enabled = true) { return playGameSound('friendRequest', enabled); }
export async function playError(enabled = true) { return playGameSound('error', enabled); }

export async function unloadSounds() {
  (Object.keys(soundCache) as SoundName[]).forEach((key) => {
    releasePlayer(soundCache[key]);
    delete soundCache[key];
  });
  audioReady = false;
}

// ── Background music ──────────────────────────────────────────────────────────

export type BgTrack = 'puzzle-loop' | 'candy-loop' | 'forest-loop' | 'relax-loop' | 'battle-loop';

const BG_FILES: Record<BgTrack, any> = {
  'puzzle-loop': require('../assets/sounds/puzzle-loop.wav'),
  'candy-loop':  require('../assets/sounds/candy-loop.wav'),
  'forest-loop': require('../assets/sounds/forest-loop.wav'),
  'relax-loop':  require('../assets/sounds/relax-loop.wav'),
  'battle-loop': require('../assets/sounds/battle-loop.wav'),
};

let bgPlayer: AudioPlayer | null = null;
let bgCurrent: BgTrack | null = null;

export async function playBgMusic(track: BgTrack = 'puzzle-loop', enabled: boolean) {
  if (!enabled) { stopBgMusic(); return; }
  try {
    await setupAudio();
    if (bgPlayer && bgCurrent === track) return;
    stopBgMusic();
    bgPlayer = createAudioPlayer(BG_FILES[track]);
    bgPlayer.volume = 0.18;
    bgPlayer.loop = true;
    bgPlayer.play();
    bgCurrent = track;
  } catch {}
}

export function stopBgMusic() {
  releasePlayer(bgPlayer);
  bgPlayer = null;
  bgCurrent = null;
}
