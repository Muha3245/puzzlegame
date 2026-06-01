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

// ── Single-player background engine ─────────────────────────────────────────
// Guarantees exactly ONE background track is ever audible. A generation token
// invalidates any in-flight "track finished → play next" callbacks the moment
// the background is stopped or switched, so tracks can never overlap (the old
// "2–3 sounds at once" bug).

let bgPlayer: AudioPlayer | null = null;
let bgCurrent: BgTrack | null = null;
let bgMode: 'off' | 'shuffle' | 'single' = 'off';
let bgStatusSub: { remove: () => void } | null = null;
let bgGen = 0; // bumped on every stop/switch — stale callbacks compare against it

const BG_VOLUME = 0.16;

// Ambient pool for the global background. 'battle-loop' is intentionally
// excluded — it's reserved for the in-battle screens.
const AMBIENT_TRACKS: BgTrack[] = [
  'puzzle-loop',
  'candy-loop',
  'forest-loop',
  'relax-loop',
];

function pickRandomTrack(exclude: BgTrack | null): BgTrack {
  const pool = AMBIENT_TRACKS.filter((t) => t !== exclude);
  const list = pool.length ? pool : AMBIENT_TRACKS;
  return list[Math.floor(Math.random() * list.length)];
}

// Tears down the current player + listener. Does NOT change mode/gen.
function teardownBgPlayer() {
  try { bgStatusSub?.remove(); } catch {}
  bgStatusSub = null;
  releasePlayer(bgPlayer);
  bgPlayer = null;
  bgCurrent = null;
}

// A single looping track — used for the in-battle screens (e.g. 'battle-loop').
export async function playBgMusic(track: BgTrack = 'puzzle-loop', enabled: boolean) {
  if (!enabled) { stopBgMusic(); return; }
  try {
    await setupAudio();
    if (bgMode === 'single' && bgCurrent === track && bgPlayer) return;

    const gen = ++bgGen; // invalidate any pending shuffle callback
    bgMode = 'single';
    teardownBgPlayer();
    if (gen !== bgGen) return;

    const player = createAudioPlayer(BG_FILES[track]);
    player.volume = BG_VOLUME;
    player.loop = true;
    bgPlayer = player;
    bgCurrent = track;
    player.play();
  } catch {}
}

// Standard "gaming background": plays the ambient tracks one-by-one (sequential
// shuffle). Each track plays fully, then a different one starts — never layered.
export async function playShuffledBgMusic(enabled: boolean) {
  if (!enabled) { stopBgMusic(); return; }
  try {
    await setupAudio();
    if (bgMode === 'shuffle' && bgPlayer) return; // already running, don't stack

    const gen = ++bgGen;
    bgMode = 'shuffle';
    teardownBgPlayer();
    if (gen !== bgGen) return;
    playNextShuffleTrack(gen, null);
  } catch {}
}

function playNextShuffleTrack(gen: number, exclude: BgTrack | null) {
  // Bail if this chain has been superseded (stopped or switched).
  if (gen !== bgGen || bgMode !== 'shuffle') return;

  teardownBgPlayer();
  if (gen !== bgGen || bgMode !== 'shuffle') return;

  const track = pickRandomTrack(exclude);
  const player = createAudioPlayer(BG_FILES[track]);
  player.volume = BG_VOLUME;
  player.loop = false;
  bgPlayer = player;
  bgCurrent = track;

  try {
    bgStatusSub = player.addListener('playbackStatusUpdate', (status: any) => {
      if (status?.didJustFinish && gen === bgGen && bgMode === 'shuffle') {
        playNextShuffleTrack(gen, track);
      }
    });
  } catch {}

  player.play();
}

export function stopBgMusic() {
  bgGen++; // invalidate any pending shuffle callback so nothing restarts
  bgMode = 'off';
  teardownBgPlayer();
}
