// app/game.tsx
// Word-search game with timer, twists, multiplayer pass-and-play, and dark navy glass UI.

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FoundEntry, WordGrid } from '../components/WordGrid';
import { CATEGORIES, STRIPE_COLORS } from '../constants/categories';
import { Theme } from '../constants/theme';
import { playGameSound, playRelaxMusic } from '../lib/audio';
import {
  BattleBroadcastPayload,
  BattlePlayerState,
  BattleRoom,
  completeOnlineLevel,
  ensureBattlePlayerRows,
  getBattlePlayers,
  getBattleRoom,
  getCurrentUserId,
  subscribeToBattleRoom,
  subscribeToBattleScore,
  updateBattleProgress,
  finishBattleRoomNow,
  quitBattleRoom,
} from '../lib/online';
import { buildPuzzle } from '../lib/puzzle';
import { useAppState } from '../lib/storage';
  

// ─── Constants ────────────────────────────────────────────────────────────────

const PRAISE = ['AMAZING', 'NICE', 'GOOD', 'WOW', 'BRILLIANT'];
const LEVELS_PER_CATEGORY = 8;

type DifficultyId = 'easy' | 'medium' | 'hard' | 'pro';

const DIFFICULTIES: Record<
  DifficultyId,
  { label: string; tint: string; gridSizes: number[]; wordCounts: number[]; timerSec: number }
> = {
  easy:   { label: 'EASY',   tint: '#4CC38A', gridSizes: [6,6,7,7,8,8,9,9],     wordCounts: [4,5,5,6,6,7,7,8],   timerSec: 120 },
  medium: { label: 'MEDIUM', tint: '#5B9BFF', gridSizes: [7,8,8,9,9,10,10,11],  wordCounts: [5,6,6,7,7,8,8,9],   timerSec: 90  },
  hard:   { label: 'HARD',   tint: '#FFD23F', gridSizes: [8,9,9,10,10,11,11,12],wordCounts: [6,6,7,8,8,9,9,10],  timerSec: 60  },
  pro:    { label: 'PRO',    tint: '#B9A7FF', gridSizes: [9,10,10,11,11,12,12,13],wordCounts:[7,8,8,9,9,10,10,11],timerSec: 45  },
};

// Twists available in-game
type TwistKind = 'freeze' | 'reveal-start' | 'reveal-word';
const TWISTS: { kind: TwistKind; label: string; cost: number; icon: keyof typeof Ionicons['glyphMap'] }[] = [
  { kind: 'freeze',       label: 'Freeze',  cost: 30, icon: 'snow-outline'         },
  { kind: 'reveal-start', label: 'Hint',    cost: 20, icon: 'flash-outline'        },
  { kind: 'reveal-word',  label: 'Reveal',  cost: 80, icon: 'eye-outline'          },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUniqueLevelWords(categoryWords: string[], totalWords: number, levelIndex: number) {
  const baseWords = categoryWords.map((w) => w.toUpperCase().trim()).filter(Boolean);
  const globalWords = CATEGORIES.flatMap((cat) => cat.words).map((w) => w.toUpperCase().trim()).filter(Boolean);
  const pool = Array.from(new Set([...baseWords, ...globalWords]));
  const start = levelIndex * totalWords;
  const selected: string[] = [];
  for (let i = 0; i < pool.length && selected.length < totalWords; i++) {
    selected.push(pool[(start + i) % pool.length]);
  }
  return selected;
}

function getDifficulty(value?: string): DifficultyId {
  if (value === 'medium' || value === 'hard' || value === 'pro') return value;
  return 'easy';
}

function clampLevel(level: number) {
  return Math.min(Math.max(level || 1, 1), LEVELS_PER_CATEGORY);
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Game() {
  const params = useLocalSearchParams<{
    id?: string; level?: string; difficulty?: string;
    title?: string; categoryKey?: string;
    mode?: string; p1?: string; p2?: string; roomId?: string;
  }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, addCoins, setWordsFound } = useAppState();

  // ── Params ──
  const category     = CATEGORIES.find((c) => c.id === params.id) ?? CATEGORIES[0];
  const displayTitle = typeof params.title === 'string' ? decodeURIComponent(params.title) : category.name;
  const categoryKey  = typeof params.categoryKey === 'string' ? params.categoryKey : category.id;
  const difficulty   = getDifficulty(params.difficulty);
  const diffCfg      = DIFFICULTIES[difficulty];
  const levelNumber  = clampLevel(Number(params.level ?? 1));
  const levelIndex   = levelNumber - 1;

  const isLiveBattle = params.mode === 'battle' && typeof params.roomId === 'string';
  const isMulti  = params.mode === 'multi';
  const roomId = typeof params.roomId === 'string' ? params.roomId : '';
  const player1  = params.p1 ?? 'Player 1';
  const player2  = params.p2 ?? 'Player 2';

  const gridSize  = diffCfg.gridSizes[levelIndex];
  const totalWords = Math.min(category.words.length, diffCfg.wordCounts[levelIndex]);
  const levelWords = useMemo(
    () => makeUniqueLevelWords(category.words, totalWords, levelIndex),
    [category.words, totalWords, levelIndex],
  );
  const progressKey = `${categoryKey}-${difficulty}-level-${levelNumber}`;
  const seed        = `${category.id}-${difficulty}-${levelNumber}`;

  // ── State ──
  const [found, setFound]                 = useState<FoundEntry[]>([]);
  const [hintCell, setHintCell]           = useState<[number, number] | null>(null);
  const [banner, setBanner]               = useState<{ text: string; color: string } | null>(null);
  const [won, setWon]                     = useState(false);
  const [rewardCoins, setRewardCoins]     = useState(0);
  const [rewardOptions, setRewardOptions] = useState<number[]>([]);
  const [selectedReward, setSelectedReward] = useState<number | null>(null);
  const [canContinue, setCanContinue]     = useState(false);

  // Timer
  const [timeLeft, setTimeLeft]   = useState(diffCfg.timerSec);
  const [frozen, setFrozen]       = useState(false);
  const [timedOut, setTimedOut]   = useState(false);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Multiplayer
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [scores, setScores]               = useState<{ 1: number; 2: number }>({ 1: 0, 2: 0 });
  const [turnsLeft, setTurnsLeft]         = useState(levelWords.length);
  const [turnFound, setTurnFound]         = useState<FoundEntry[]>([]);

  // Live battle room state
  const [myUid, setMyUid] = useState<string | null>(null);
  const [battleRoom, setBattleRoom] = useState<BattleRoom | null>(null);
  const [battlePlayers, setBattlePlayers] = useState<BattlePlayerState[]>([]);
  const [waitingForOpponent, setWaitingForOpponent] = useState(isLiveBattle);
  const [opponentFound, setOpponentFound] = useState(0); // track opponent word count for flash
  const [opponentFoundEntries, setOpponentFoundEntries] = useState<FoundEntry[]>([]);
  const [battleWinnerId, setBattleWinnerId] = useState<string | null>(null);
  const [battleFinishedReason, setBattleFinishedReason] = useState<'completed' | 'timeout' | 'quit' | null>(null);
  const [oppFlash, setOppFlash] = useState<string | null>(null); // last word opponent found

  // Stable refs so onFound closure never has stale uid / send fn
  const myUidRef        = useRef<string | null>(null);
  const sendBattleScore = useRef<((d: BattleBroadcastPayload) => void) | null>(null);

  // Animations
  const bannerPulse   = useRef(new Animated.Value(0)).current;
  const timerShake    = useRef(new Animated.Value(0)).current;
  const boxOneAnim    = useRef(new Animated.Value(0)).current;
  const boxTwoAnim    = useRef(new Animated.Value(0)).current;
  const boxThreeAnim  = useRef(new Animated.Value(0)).current;

  // ── Layout ──
  const bottomSafe   = Math.max(insets.bottom, 14);
  const toolbarH     = 82 + bottomSafe;
  const gridMax      = Math.min(width - 40, height * 0.45, 420);
  const progress     = levelWords.length ? (found.length / levelWords.length) * 100 : 0;
  const elapsedSeconds = Math.max(0, diffCfg.timerSec - timeLeft);
  const myBattleState = battlePlayers.find((p) => p.userId === myUid);
  const opponentBattleState = battlePlayers.find((p) => p.userId !== myUid);
  // Always use local found state for my score (instant, no DB lag)
  const myLiveScore = found.length * 10;
  const opponentLiveScore = opponentBattleState?.score ?? 0;

  // ── Timer management ──
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          setTimedOut(true);
          setWon(true);      // show overlay (timeout variant)
          setCanContinue(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  // Shake animation when < 15 s
  useEffect(() => {
    if (timeLeft <= 15 && timeLeft > 0 && !frozen && !won) {
      Animated.sequence([
        Animated.timing(timerShake, { toValue: 6,  duration: 60, useNativeDriver: true }),
        Animated.timing(timerShake, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(timerShake, { toValue: 3,  duration: 60, useNativeDriver: true }),
        Animated.timing(timerShake, { toValue: 0,  duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [timeLeft]);

  // ── Banner pulse ──
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bannerPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(bannerPulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [bannerPulse]);

  // ── Music ──
  useEffect(() => {
    playRelaxMusic(state.settings.music);
    return () => { playRelaxMusic(false); };
  }, [state.settings.music]);

  // ── Live battle realtime sync ──
  const loadBattleRoom = useCallback(async () => {
    if (!isLiveBattle || !roomId) return;
    const current = await getCurrentUserId();
    setMyUid(current);
    myUidRef.current = current; // keep ref in sync for stable closures
    await ensureBattlePlayerRows(roomId);
    const [room, players] = await Promise.all([getBattleRoom(roomId), getBattlePlayers(roomId)]);
    setBattleRoom(room);
    setBattlePlayers(players);
  }, [isLiveBattle, roomId]);

  const endBattleNow = useCallback(async ({ winnerId, reason }: { winnerId: string | null; reason: 'completed' | 'timeout' | 'quit' }) => {
    if (!isLiveBattle || !roomId || battleFinishedReason) return;

    setBattleWinnerId(winnerId);
    setBattleFinishedReason(reason);
    stopTimer();
    setTimedOut(reason === 'timeout');
    setRewardOptions([]);
    setSelectedReward(null);
    setRewardCoins(0);
    setCanContinue(true);
    setWon(true);

    await finishBattleRoomNow(roomId, winnerId).catch(() => {});

    if (myUidRef.current && sendBattleScore.current) {
      sendBattleScore.current({
        userId: myUidRef.current,
        score: found.length * 10,
        wordsFound: found.length,
        totalWords: levelWords.length,
        isFinished: true,
        gameOver: true,
        winnerId,
        reason,
      });
    }
  }, [isLiveBattle, roomId, battleFinishedReason, stopTimer, found.length, levelWords.length]);

  useEffect(() => {
    if (!isLiveBattle || !roomId) return;

    // Initial DB load
    loadBattleRoom().catch(() => {});

    // postgres_changes for room-level status changes (waiting phase: detecting when
    // battle_room starts / second player joins). Kept for room status only.
    const roomUnsub = subscribeToBattleRoom(roomId, () => {
      loadBattleRoom().catch(() => {});
    });

    // ── Broadcast channel for live gameplay score updates ──────────────────────
    // Bypasses RLS entirely — instant delivery, no DB round-trip.
    // When opponent finds a word they broadcast their new state; we update local
    // battlePlayers state directly so the UI refreshes in <50 ms.
    const broadcast = subscribeToBattleScore(roomId, (data) => {
      if (data.foundEntry) {
        setOpponentFoundEntries((prev) => {
          const word = String(data.foundEntry.word || '').toUpperCase().trim();
          if (!word || prev.some((entry) => entry.word.toUpperCase().trim() === word)) return prev;
          return [...prev, { ...data.foundEntry, color: '#FF4D8D' }];
        });
      }

      setBattlePlayers((prev) =>
        prev.map((p) =>
          p.userId === data.userId
            ? {
                ...p,
                score:        data.score,
                wordsFound:   data.wordsFound,
                totalWords:   data.totalWords,
                lastWord:     data.lastWord   ?? p.lastWord,
                isFinished:   data.isFinished ?? p.isFinished,
                updatedAt:    new Date().toISOString(),
              }
            : p,
        ),
      );

      if (data.gameOver) {
        setBattleWinnerId(data.winnerId ?? null);
        setBattleFinishedReason(data.reason ?? 'completed');
        stopTimer();
        setTimedOut(data.reason === 'timeout');
        setRewardOptions([]);
        setCanContinue(true);
        setWon(true);
      }
    });
    sendBattleScore.current = broadcast.send;

    // DB poll every 3 s as fallback (reconnects, missed events, waiting phase)
    const poll = setInterval(() => loadBattleRoom().catch(() => {}), 3000);

    return () => {
      roomUnsub?.();
      broadcast.cleanup();
      clearInterval(poll);
      sendBattleScore.current = null;
    };
  }, [isLiveBattle, roomId, loadBattleRoom]);

  // ── Reset on level change ──
  useEffect(() => {
    setFound([]); setHintCell(null); setBanner(null); setWon(false);
    setRewardCoins(0); setRewardOptions([]); setSelectedReward(null); setCanContinue(false);
    setTimeLeft(diffCfg.timerSec); setFrozen(false); setTimedOut(false);
    setCurrentPlayer(1); setScores({ 1: 0, 2: 0 }); setTurnsLeft(levelWords.length);
    setTurnFound([]);
    if (isLiveBattle) {
      // Don't start timer yet — wait until both players are in the room
      setWaitingForOpponent(true);
      setBattlePlayers([]);
      setOpponentFoundEntries([]);
      setBattleWinnerId(null);
      setBattleFinishedReason(null);
      loadBattleRoom().catch(() => {});
    } else {
      startTimer();
    }
    return stopTimer;
  }, [category.id, difficulty, levelNumber]);

  // ── Start battle timer once both players are ready ──
  useEffect(() => {
    if (!isLiveBattle || !waitingForOpponent) return;
    const readyPlayers = battlePlayers.filter((p) => p.isReady);
    if (readyPlayers.length >= 2) {
      setWaitingForOpponent(false);
      startTimer();
    }
  }, [battlePlayers, isLiveBattle, waitingForOpponent]);

  useEffect(() => {
    if (!isLiveBattle || !battleRoom || battleRoom.status !== 'completed' || won) return;
    setBattleWinnerId(battleRoom.winnerId ?? null);
    setBattleFinishedReason('completed');
    stopTimer();
    setRewardOptions([]);
    setCanContinue(true);
    setWon(true);
  }, [isLiveBattle, battleRoom?.status, battleRoom?.winnerId, won, stopTimer]);

  // ── Flash animation when opponent finds a word ──
  useEffect(() => {
    if (!isLiveBattle) return;
    const oppWords = opponentBattleState?.wordsFound ?? 0;
    const lastWord = opponentBattleState?.lastWord;
    if (oppWords > opponentFound) {
      setOpponentFound(oppWords);
      // Show opponent's last-found word as a brief toast
      if (lastWord) {
        setOppFlash(lastWord);
        const t = setTimeout(() => setOppFlash(null), 1800);
        return () => clearTimeout(t);
      }
    }
  }, [opponentBattleState?.wordsFound, opponentBattleState?.lastWord]);

  // Pause timer when frozen
  useEffect(() => {
    if (frozen) {
      stopTimer();
      const t = setTimeout(() => { setFrozen(false); startTimer(); }, 10_000);
      return () => clearTimeout(t);
    }
  }, [frozen]);

  useEffect(() => {
    if (!isLiveBattle || !roomId || !timedOut || battleFinishedReason) return;
    const opponentId = battleRoom
      ? (myUidRef.current === battleRoom.player1Id ? battleRoom.player2Id : battleRoom.player1Id)
      : opponentBattleState?.userId ?? null;

    updateBattleProgress({
      roomId,
      score: found.length * 10,
      wordsFound: found.length,
      totalWords: levelWords.length,
      elapsedSeconds: diffCfg.timerSec,
      isFinished: true,
    }).catch(() => {});

    endBattleNow({ winnerId: opponentId, reason: 'timeout' }).catch(() => {});
  }, [isLiveBattle, roomId, timedOut, battleFinishedReason, battleRoom?.player1Id, battleRoom?.player2Id, opponentBattleState?.userId, found.length, levelWords.length, endBattleNow]);

  // ── Reward boxes ──
  const makeRewardOptions = () => {
    const base = difficulty === 'easy' ? 25 + levelNumber * 5
      : difficulty === 'medium' ? (levelNumber % 2 === 0 ? 45 : 30)
      : difficulty === 'hard'   ? 90
      : 120;
    return [base, base + 15, base + 30].sort(() => Math.random() - 0.5);
  };

  const startRewardShuffle = () => {
    [boxOneAnim, boxTwoAnim, boxThreeAnim].forEach((a) => a.setValue(0));
    Animated.loop(
      Animated.sequence([
        Animated.parallel([boxOneAnim, boxTwoAnim, boxThreeAnim].map((a) =>
          Animated.timing(a, { toValue: 1, duration: 250, useNativeDriver: true }))),
        Animated.parallel([boxOneAnim, boxTwoAnim, boxThreeAnim].map((a) =>
          Animated.timing(a, { toValue: 0, duration: 250, useNativeDriver: true }))),
      ]),
      { iterations: 4 }
    ).start();
  };

  const pickRewardBox = (index: number) => {
    if (selectedReward !== null) return;
    const reward = rewardOptions[index] ?? 0;
    setSelectedReward(index);
    setRewardCoins(reward);
    if (reward > 0) addCoins(reward);
    completeOnlineLevel({ categoryKey, difficulty, level: levelNumber, foundWords: levelWords.length, rewardCoins: reward }).catch(() => {});
    setTimeout(() => setCanContinue(true), 450);
  };

  // ── Word found ──
  const onFound = useCallback((entry: FoundEntry) => {
    setFound((prevFound) => {
      const up = entry.word.toUpperCase().trim();
      if (prevFound.some((f) => f.word.toUpperCase().trim() === up)) return prevFound;
      const newFound = [...prevFound, entry];

      playGameSound('wordFound', state.settings.sound);
      setBanner({ text: PRAISE[Math.floor(Math.random() * PRAISE.length)], color: entry.color });
      setTimeout(() => setBanner(null), 1150);
      setWordsFound(progressKey, newFound.length);

      // Multiplayer scoring
      if (isMulti) {
        setScores((prev) => ({ ...prev, [currentPlayer]: prev[currentPlayer] + 1 }));
        setTurnFound((tf) => [...tf, entry]);
        const remaining = turnsLeft - 1;
        setTurnsLeft(remaining);
      }

      if (isLiveBattle && roomId) {
        const progressUpdate = {
          roomId,
          score:          newFound.length * 10,
          wordsFound:     newFound.length,
          totalWords:     levelWords.length,
          elapsedSeconds,
          lastWord:       up,
          isFinished:     newFound.length === levelWords.length,
        };
        // DB write for persistence + winner resolution
        updateBattleProgress(progressUpdate).catch(() => {});
        // Broadcast to opponent instantly — bypasses RLS, arrives in <50 ms
        if (myUidRef.current && sendBattleScore.current) {
          sendBattleScore.current({
            userId:     myUidRef.current,
            score:      newFound.length * 10,
            wordsFound: newFound.length,
            totalWords: levelWords.length,
            lastWord:   up,
            foundEntry: entry,
            isFinished: newFound.length === levelWords.length,
          });
        }
      }

      if (newFound.length === levelWords.length) {
        stopTimer();
        const options = isLiveBattle ? [] : makeRewardOptions();
        setRewardOptions(options);
        setSelectedReward(null);
        setRewardCoins(0);
        setCanContinue(isLiveBattle || options.length === 0);
        if (options.length === 0) {
          if (!isLiveBattle) completeOnlineLevel({ categoryKey, difficulty, level: levelNumber, foundWords: newFound.length, rewardCoins: 0 }).catch(() => {});
        }
        setTimeout(() => {
          playGameSound('win', state.settings.sound);
          if (isLiveBattle) {
            endBattleNow({ winnerId: myUidRef.current, reason: 'completed' }).catch(() => {});
          } else {
            setWon(true);
          }
          if (options.length > 0) setTimeout(startRewardShuffle, 180);
        }, 650);
      }

      return newFound;
    });
  }, [state.settings.sound, progressKey, isMulti, isLiveBattle, currentPlayer, turnsLeft, levelWords.length, roomId, elapsedSeconds]);

  // Multiplayer: switch turn (one word per turn)
  useEffect(() => {
    if (!isMulti || turnFound.length === 0) return;
    const t = setTimeout(() => {
      setCurrentPlayer((p) => (p === 1 ? 2 : 1));
      setTurnFound([]);
    }, 1200);
    return () => clearTimeout(t);
  }, [turnFound, isMulti]);

  // ── Twists ──
  const handleTwist = (kind: TwistKind) => {
    playGameSound('tap', state.settings.sound);
    const cost = TWISTS.find((t) => t.kind === kind)?.cost ?? 0;
    if (state.coins < cost) return;

    const remaining = levelWords.filter(
      (w) => !found.some((f) => f.word.toUpperCase().trim() === w.toUpperCase().trim())
    );
    if (kind === 'freeze') {
      addCoins(-cost);
      setFrozen(true);
      return;
    }
    if (!remaining.length) return;
    const word = remaining[Math.floor(Math.random() * remaining.length)];
    const puzzle = buildPuzzle(levelWords, gridSize, seed);
    const placement = puzzle.placements.find((p) => p.word.toUpperCase().trim() === word.toUpperCase().trim());
    if (!placement) return;
    addCoins(-cost);

    if (kind === 'reveal-word') {
      const color = STRIPE_COLORS[found.length % STRIPE_COLORS.length];
      onFound({ word, start: placement.start, end: placement.end, color });
    } else {
      setHintCell(placement.start);
      setTimeout(() => setHintCell(null), 1800);
    }
  };

  // ── Navigation ──
  const goNext = () => {
    if (levelNumber < LEVELS_PER_CATEGORY) {
      const extra = isMulti ? `&mode=multi&p1=${encodeURIComponent(player1)}&p2=${encodeURIComponent(player2)}` : '';
      router.replace(`/game?id=${category.id}&difficulty=${difficulty}&level=${levelNumber + 1}${extra}`);
    } else {
      router.replace(`/levels?category=${categoryKey}&difficulty=${difficulty}`);
    }
  };

  const goWinner = () => {
    if (isLiveBattle) {
      const myName   = myBattleState?.displayName ?? 'You';
      const oppName  = opponentBattleState?.displayName ?? 'Opponent';
      const s1       = myLiveScore;
      const s2       = opponentLiveScore;
      const myWords  = myBattleState?.wordsFound ?? found.length;
      const oppWords = opponentBattleState?.wordsFound ?? 0;
      const iWon     = myWords > oppWords || (myWords === oppWords && s1 >= s2);
      // Coin rewards: winner gets +60, loser loses -25 (per difficulty scaling)
      const diffBonus = difficulty === 'medium' ? 10 : difficulty === 'hard' ? 25 : difficulty === 'pro' ? 50 : 0;
      const coinDelta = iWon ? 60 + diffBonus : -(25 + Math.floor(diffBonus / 2));
      router.replace(
        `/winner?winner=${encodeURIComponent(iWon ? myName : oppName)}&p1=${encodeURIComponent(myName)}&p2=${encodeURIComponent(oppName)}&s1=${s1}&s2=${s2}&coins=${coinDelta}&id=${category.id}&categoryKey=${categoryKey}&difficulty=${difficulty}&level=${levelNumber}&isBattle=1`
      );
      return;
    }
    if (!isMulti) { goNext(); return; }
    const winner = scores[1] >= scores[2] ? player1 : player2;
    const coins  = rewardCoins;
    router.replace(
      `/winner?winner=${encodeURIComponent(winner)}&p1=${encodeURIComponent(player1)}&p2=${encodeURIComponent(player2)}&s1=${scores[1]}&s2=${scores[2]}&coins=${coins}&id=${category.id}&categoryKey=${categoryKey}&difficulty=${difficulty}&level=${levelNumber}`
    );
  };

  // ── Interpolations ──
  const bannerScale = bannerPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const timerColor  = timeLeft <= 15 ? Theme.danger : timeLeft <= 30 ? Theme.warn : Theme.success;

  // ── Render ──
  return (
    <View style={styles.bg}>
      <View style={styles.overlay} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
        <StatusBar barStyle="light-content" />

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
              onPress={async () => {
                if (isLiveBattle && roomId) {
                  await quitBattleRoom(roomId).catch(() => {});
                  router.replace('/battle');
                  return;
                }

                router.back();
              }}
              style={styles.roundBtn}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerKicker}>{diffCfg.label} · LEVEL {levelNumber}</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>{displayTitle}</Text>
          </View>

          <View style={styles.headerRight}>
            {/* Timer */}
            <Animated.View style={[styles.timerPill, { transform: [{ translateX: timerShake }] }]}>
              {frozen
                ? <Ionicons name="snow-outline" size={13} color="#5B9BFF" />
                : <Ionicons name="time-outline" size={13} color={timerColor} />}
              <Text style={[styles.timerText, { color: timerColor }]}>{fmt(timeLeft)}</Text>
            </Animated.View>

            {/* Coin pill */}
            <Pressable onPress={() => router.push('/shop' as any)} style={styles.coinPill}>
              <Ionicons name="logo-bitcoin" size={13} color={Theme.warn} />
              <Text style={styles.coinText}>{state.coins}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Multiplayer turn bar ── */}
        {isMulti && (
          <View style={styles.multiBar}>
            <PlayerChip name={player1} score={scores[1]} active={currentPlayer === 1} />
            <View style={styles.multiVs}><Text style={styles.multiVsText}>VS</Text></View>
            <PlayerChip name={player2} score={scores[2]} active={currentPlayer === 2} />
          </View>
        )}

        {isLiveBattle && (
          <View>
            <View style={styles.multiBar}>
              <PlayerChip
                name={myBattleState?.displayName ?? 'You'}
                score={myLiveScore}
                words={found.length}
                totalWords={levelWords.length}
                active
              />
              <View style={styles.multiVs}>
                <Ionicons name="flash" size={14} color={Theme.warn} />
                <Text style={styles.multiVsText}>LIVE</Text>
              </View>
              <PlayerChip
                name={opponentBattleState?.displayName ?? 'Joining…'}
                score={opponentLiveScore}
                words={opponentBattleState?.wordsFound ?? 0}
                totalWords={levelWords.length}
                active={false}
              />
            </View>
            {/* Opponent found-word toast */}
            {oppFlash && (
              <View style={styles.oppFlashRow} pointerEvents="none">
                <Ionicons name="flash" size={12} color={Theme.warn} />
                <Text style={styles.oppFlashText}>
                  Opponent found <Text style={{ color: '#fff', fontWeight: '900' }}>{oppFlash}</Text>
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.main, { paddingBottom: toolbarH }]}>
          {/* Words */}
          <View style={styles.wordsCard}>
            <View style={styles.wordsHeader}>
              <Text style={styles.wordsHeaderText}>{displayTitle.toUpperCase()}</Text>
            </View>
            <View style={styles.wordsList}>
              {levelWords.map((word) => {
                const done = found.some((f) => f.word.toUpperCase().trim() === word);
                return (
                  <View key={word} style={[styles.wordChip, done && styles.wordChipDone]}>
                    {done && <Ionicons name="checkmark-circle" size={11} color={Theme.success} />}
                    <Text style={[styles.wordText, done && styles.wordTextDone]}>{word}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Grid */}
          <View style={[styles.gridGlass, { width: gridMax + 14 }]}>
            <WordGrid
              words={levelWords}
              seed={seed}
              found={found}
              opponentFound={isLiveBattle ? opponentFoundEntries : []}
              hintCell={hintCell}
              onFound={onFound}
              width={gridMax}
              size={gridSize}
            />
          </View>

          {/* Progress bar */}
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: diffCfg.tint }]} />
            </View>
            <Text style={styles.progressLabel}>{found.length}/{levelWords.length}</Text>
          </View>
        </View>

        {/* ── Twists toolbar ── */}
        <View style={[styles.toolbar, { paddingBottom: bottomSafe }]}>
          {TWISTS.map((twist) => (
            <TwistButton
              key={twist.kind}
              icon={twist.icon}
              label={twist.label}
              cost={twist.cost}
              disabled={state.coins < twist.cost || won}
              onPress={() => handleTwist(twist.kind)}
            />
          ))}

          {/* Nav shortcuts */}
          <Pressable onPress={() => router.push('/leaderboard')} style={styles.navBtn}>
            <Ionicons name="trophy-outline" size={20} color={Theme.textDim} />
          </Pressable>
          <Pressable onPress={() => router.push('/profile' as any)} style={styles.navBtn}>
            <Ionicons name="person-outline" size={20} color={Theme.textDim} />
          </Pressable>
        </View>

        {/* ── Praise banner ── */}
        {banner && (
          <Animated.View
            pointerEvents="none"
            style={[styles.banner, { backgroundColor: banner.color, transform: [{ scale: bannerScale }] }]}
          >
            <Text style={styles.bannerText}>{banner.text}</Text>
          </Animated.View>
        )}

        {/* ── Battle waiting lobby overlay ── */}
        {isLiveBattle && waitingForOpponent && !won && (
          <View style={styles.waitingOverlay}>
            <View style={styles.waitingModal}>
              <View style={styles.waitingIconCircle}>
                <Ionicons name="flash" size={40} color={Theme.warn} />
              </View>
              <Text style={styles.waitingTitle}>Battle Ready?</Text>
              <Text style={styles.waitingText}>
                Waiting for your opponent to join the battle room…{'\n'}The timer starts when both players are ready.
              </Text>

              {/* Live player join status */}
              <View style={styles.waitingPlayers}>
                <View style={[styles.waitingPlayer, { borderColor: 'rgba(91,155,255,0.5)' }]}>
                  <View style={styles.waitingDot} />
                  <Text style={styles.waitingPlayerName} numberOfLines={1}>
                    {myBattleState?.displayName ?? 'You'}
                  </Text>
                  <Ionicons name="checkmark-circle" size={16} color={Theme.success} />
                </View>

                <View style={styles.waitingVs}>
                  <Text style={styles.waitingVsText}>VS</Text>
                </View>

                <View style={[styles.waitingPlayer, opponentBattleState ? { borderColor: 'rgba(91,155,255,0.5)' } : {}]}>
                  {opponentBattleState ? (
                    <>
                      <View style={[styles.waitingDot, { backgroundColor: Theme.success }]} />
                      <Text style={styles.waitingPlayerName} numberOfLines={1}>
                        {opponentBattleState.displayName}
                      </Text>
                      <Ionicons name="checkmark-circle" size={16} color={Theme.success} />
                    </>
                  ) : (
                    <>
                      <ActivityIndicator size="small" color={Theme.primary} />
                      <Text style={[styles.waitingPlayerName, { color: Theme.textMute }]}>
                        Joining...
                      </Text>
                    </>
                  )}
                </View>
              </View>

              <Pressable
                onPress={async () => {
                  if (roomId) await quitBattleRoom(roomId).catch(() => {});
                  router.replace('/battle');
                }}
                style={styles.waitingCancelBtn}
              >
                <Text style={styles.waitingCancelText}>Cancel Battle</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Win / timeout overlay ── */}
        {won && (
          <View style={styles.winOverlay}>
            <View style={styles.winModal}>
              {timedOut ? (
                <>
                  <View style={styles.winIconCircle}>
                    <Ionicons name="timer-outline" size={46} color={Theme.danger} />
                  </View>
                  <Text style={styles.winTitle}>Time's Up!</Text>
                  <Text style={styles.winSub}>
                    You found {found.length} of {levelWords.length} words.
                    {isLiveBattle ? `\nYour score: ${myLiveScore} • Opponent: ${opponentLiveScore}` : isMulti ? `\n${scores[1] > scores[2] ? player1 : scores[2] > scores[1] ? player2 : 'Tie!'} leads!` : ''}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.winIconCircle}>
                    <Ionicons name="trophy" size={46} color={Theme.warn} />
                  </View>
                  <Text style={styles.winTitle}>Level Complete!</Text>
                  <Text style={styles.winSub}>
                    {displayTitle} · {diffCfg.label} · Level {levelNumber}
                    {isLiveBattle ? `\nYou: ${myLiveScore}  •  Opponent: ${opponentLiveScore}` : isMulti ? `\n${player1}: ${scores[1]}  •  ${player2}: ${scores[2]}` : ''}
                  </Text>
                </>
              )}

              {/* Reward boxes (single player only) */}
              {!isMulti && !isLiveBattle && !timedOut && rewardOptions.length > 0 && (
                <>
                  <Text style={styles.rewardTitle}>Pick a reward box</Text>
                  <View style={styles.rewardRow}>
                    {rewardOptions.map((reward, i) => {
                      const anim = i === 0 ? boxOneAnim : i === 1 ? boxTwoAnim : boxThreeAnim;
                      const tx = anim.interpolate({ inputRange: [0, 1], outputRange: i === 0 ? [0, 16] : i === 1 ? [0, -16] : [0, 10] });
                      const ty = anim.interpolate({ inputRange: [0, 1], outputRange: i === 1 ? [0, 8] : [0, -8] });
                      const selected = selectedReward === i;
                      const opened   = selectedReward !== null;
                      return (
                        <Animated.View key={i} style={{ transform: [{ translateX: selectedReward === null ? tx : 0 }, { translateY: selectedReward === null ? ty : 0 }, { scale: selected ? 1.08 : 1 }] }}>
                          <Pressable
                            disabled={selectedReward !== null}
                            onPress={() => pickRewardBox(i)}
                            style={[styles.rewardBox, selected && styles.rewardBoxSelected]}
                          >
                            <Ionicons name={opened ? 'gift' : 'help-circle-outline'} size={32} color={selected ? Theme.success : '#fff'} />
                            <Text style={styles.rewardBoxAmt}>{opened ? `+${reward}` : 'TAP'}</Text>
                            <Text style={styles.rewardBoxSub}>{opened ? 'coins' : 'box'}</Text>
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                  </View>
                  {selectedReward !== null && (
                    <View style={styles.earnedPill}>
                      <Ionicons name="logo-bitcoin" size={14} color={Theme.warn} />
                      <Text style={styles.earnedText}>+{rewardCoins} coins earned</Text>
                    </View>
                  )}
                </>
              )}

              {/* No reward scenario */}
              {!isMulti && !isLiveBattle && !timedOut && rewardOptions.length === 0 && (
                <View style={styles.earnedPill}>
                  <Ionicons name="star" size={14} color={Theme.warn} />
                  <Text style={styles.earnedText}>Level unlocked!</Text>
                </View>
              )}

              {/* Action buttons */}
              <Pressable
                disabled={!canContinue}
                onPress={isMulti || isLiveBattle ? goWinner : goNext}
                style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
              >
                <Text style={styles.primaryBtnText}>
                  {isLiveBattle ? 'See Battle Results' : isMulti ? 'See Results' : canContinue
                    ? (levelNumber < LEVELS_PER_CATEGORY ? 'Next Level' : 'Back to Levels')
                    : 'Pick a Box'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.replace(`/levels?category=${categoryKey}&difficulty=${difficulty}`)}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Level Select</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TwistButton({
  icon, label, cost, disabled, onPress,
}: {
  icon: keyof typeof Ionicons['glyphMap'];
  label: string;
  cost: number;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.twistBtn, disabled && styles.twistBtnOff]}>
      <Ionicons name={icon} size={20} color={disabled ? Theme.textMute : '#fff'} />
      <Text style={[styles.twistLabel, disabled && { color: Theme.textMute }]}>{label}</Text>
      <View style={styles.twistCostRow}>
        <Ionicons name="logo-bitcoin" size={9} color={disabled ? Theme.textMute : Theme.warn} />
        <Text style={[styles.twistCost, disabled && { color: Theme.textMute }]}>{cost}</Text>
      </View>
    </Pressable>
  );
}

function PlayerChip({
  name, score, words, totalWords, active,
}: {
  name: string; score: number; words?: number; totalWords?: number; active: boolean;
}) {
  return (
    <View style={[styles.playerChip, active && styles.playerChipActive]}>
      <Ionicons name="person" size={14} color={active ? Theme.primary : Theme.textDim} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.playerName, active && { color: '#fff' }]} numberOfLines={1}>{name}</Text>
        {words !== undefined && totalWords !== undefined && (
          <Text style={styles.playerWordsText}>{words}/{totalWords} words</Text>
        )}
      </View>
      <View style={styles.playerScoreBadge}>
        <Text style={styles.playerScoreText}>{score}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#050c20' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,8,32,0.78)' },
  orb1: { position: 'absolute', top: -50, left: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(91,155,255,0.13)' },
  orb2: { position: 'absolute', bottom: 80, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(76,195,138,0.10)' },
  safe: { flex: 1 },

  // Header
  header: { height: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerKicker: { color: Theme.textDim, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', maxWidth: 160 },
  headerRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  timerText: { fontSize: 13, fontWeight: '900' },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,210,63,0.12)', borderWidth: 1, borderColor: 'rgba(255,210,63,0.25)' },
  coinText: { color: Theme.warn, fontSize: 12, fontWeight: '900' },

  // Multiplayer bar
  multiBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 6, gap: 8 },
  playerChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  playerChipActive: { backgroundColor: 'rgba(91,155,255,0.15)', borderColor: 'rgba(91,155,255,0.4)' },
  playerName: { color: Theme.textDim, fontSize: 12, fontWeight: '800' },
  playerWordsText: { color: Theme.textMute, fontSize: 10, fontWeight: '700', marginTop: 1 },
  playerScoreBadge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4 },
  playerScoreText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  multiVs: { width: 34, alignItems: 'center', gap: 2 },
  multiVsText: { color: Theme.textMute, fontSize: 10, fontWeight: '900' },

  // Opponent found-word toast
  oppFlashRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', backgroundColor: 'rgba(255,210,63,0.12)', borderWidth: 1, borderColor: 'rgba(255,210,63,0.3)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginTop: -2, marginBottom: 4 },
  oppFlashText: { color: Theme.textDim, fontSize: 12, fontWeight: '700' },

  // Main area
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },

  // Words
  wordsCard: { width: '100%', maxWidth: 430, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 12, overflow: 'hidden' },
  wordsHeader: { backgroundColor: Theme.primary, paddingVertical: 7, alignItems: 'center' },
  wordsHeaderText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  wordsList: { paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  wordChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  wordChipDone: { backgroundColor: 'rgba(76,195,138,0.12)', borderColor: 'rgba(76,195,138,0.3)' },
  wordText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '800' },
  wordTextDone: { color: Theme.success, textDecorationLine: 'line-through' },

  // Grid
  gridGlass: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', shadowColor: Theme.primary, shadowOpacity: 0.2, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 8 },

  // Progress
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, width: '80%' },
  progressTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressLabel: { color: Theme.textDim, fontSize: 11, fontWeight: '800', minWidth: 30 },

  // Toolbar
  toolbar: { position: 'absolute', left: 14, right: 14, bottom: 0, minHeight: 82, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  twistBtn: { flex: 1, minHeight: 66, borderRadius: 18, backgroundColor: Theme.primary, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', shadowColor: Theme.primary, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6 },
  twistBtnOff: { backgroundColor: 'rgba(255,255,255,0.06)', shadowOpacity: 0 },
  twistLabel: { color: '#fff', fontSize: 10, fontWeight: '900', marginTop: 3 },
  twistCostRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  twistCost: { color: Theme.warn, fontSize: 9, fontWeight: '900' },
  navBtn: { width: 44, height: 66, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Banner
  banner: { position: 'absolute', left: 0, right: 0, top: '40%', paddingVertical: 18, alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  bannerText: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: 3 },

  // Win overlay
  winOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,8,32,0.82)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  winModal: { width: '100%', maxWidth: 360, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', padding: 24, alignItems: 'center' },
  winIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,210,63,0.15)', borderWidth: 2, borderColor: 'rgba(255,210,63,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  winTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 6 },
  winSub: { color: Theme.textDim, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },

  rewardTitle: { color: Theme.textDim, fontSize: 13, fontWeight: '800', marginBottom: 12 },
  rewardRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  rewardBox: { width: 84, height: 106, borderRadius: 22, backgroundColor: 'rgba(91,155,255,0.2)', borderWidth: 2, borderColor: 'rgba(91,155,255,0.4)', alignItems: 'center', justifyContent: 'center', gap: 4 },
  rewardBoxSelected: { backgroundColor: 'rgba(76,195,138,0.2)', borderColor: Theme.success },
  rewardBoxAmt: { color: '#fff', fontSize: 15, fontWeight: '900' },
  rewardBoxSub: { color: Theme.textDim, fontSize: 10, fontWeight: '800' },

  earnedPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,210,63,0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,210,63,0.25)', marginBottom: 16 },
  earnedText: { color: Theme.warn, fontSize: 13, fontWeight: '900' },

  // Waiting lobby
  waitingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,8,32,0.94)', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 },
  waitingModal: { width: '100%', maxWidth: 360, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(91,155,255,0.25)', padding: 28, alignItems: 'center' },
  waitingIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,210,63,0.15)', borderWidth: 2, borderColor: 'rgba(255,210,63,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  waitingTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  waitingText: { color: Theme.textDim, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  waitingPlayers: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8, marginBottom: 20 },
  waitingPlayer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minHeight: 44 },
  waitingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.warn },
  waitingPlayerName: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '800' },
  waitingVs: { width: 30, alignItems: 'center' },
  waitingVsText: { color: Theme.textMute, fontSize: 11, fontWeight: '900' },
  waitingCancelBtn: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(247,108,108,0.35)', backgroundColor: 'rgba(247,108,108,0.1)' },
  waitingCancelText: { color: Theme.danger, fontSize: 14, fontWeight: '900' },

  primaryBtn: { width: '100%', backgroundColor: Theme.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 8, shadowColor: Theme.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondaryBtn: { width: '100%', paddingVertical: 13, borderRadius: 16, alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  secondaryBtnText: { color: Theme.textDim, fontSize: 15, fontWeight: '800' },
});
