// app/xox-room.tsx
// Real-time online XOX game room.
// Player 1 (challenger) = X  |  Player 2 (challenged) = O
// Moves sync via Supabase Broadcast (instant) + postgres_changes (fallback/reconnect).

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  createXoxRoom,
  getCurrentUserId,
  getXoxRoom,
  makeXoxMove,
  PublicUser,
  rejectXoxRoom,
  subscribeToXoxBroadcast,
  subscribeToXoxRoom,
  XoxMoveBroadcast,
  XoxRoom,
} from '../lib/online';
import { playDrawSound, playGameSound, playLoseSound, playWinSound } from '../lib/audio';
import { useAppState } from '../lib/storage';

type Mark = 'X' | 'O' | null;

// ── Shared game-logic utilities ───────────────────────────────────────────────

function getWins(n: number): number[][] {
  const wins: number[][] = [];
  for (let r = 0; r < n; r++)
    wins.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++)
    wins.push(Array.from({ length: n }, (_, r) => r * n + c));
  wins.push(Array.from({ length: n }, (_, i) => i * n + i));
  wins.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)));
  return wins;
}

function checkWinner(
  board: Mark[],
  wins: number[][],
): { winner: 'X' | 'O' | 'draw' | null; line: number[] } {
  for (const line of wins) {
    const first = board[line[0]];
    if (first && line.every((i) => board[i] === first)) return { winner: first, line };
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return { winner: null, line: [] };
}

// ── Board cell ────────────────────────────────────────────────────────────────

function XoxCell({
  value,
  onPress,
  isWinCell,
  disabled,
  boardSize,
}: {
  value: Mark;
  onPress: () => void;
  isWinCell: boolean;
  disabled: boolean;
  boardSize: number;
}) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (value) {
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        tension: 280,
        useNativeDriver: true,
      }).start();
    } else {
      scale.setValue(0);
    }
  }, [value]);

  const ix = boardSize === 3 ? 52 : boardSize === 4 ? 36 : 26;
  const io = boardSize === 3 ? 44 : boardSize === 4 ? 30 : 22;

  return (
    <Pressable
      style={[styles.cell, isWinCell && styles.cellWin]}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {value === 'X' && (
          <Ionicons
            name="close-sharp"
            size={ix}
            color={isWinCell ? '#FF3D00' : '#FF7A00'}
          />
        )}
        {value === 'O' && (
          <Ionicons
            name="ellipse-outline"
            size={io}
            color={isWinCell ? '#00C853' : '#4CC38A'}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function XoxRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { state }  = useAppState();
  const { width }  = useWindowDimensions();

  const [room,        setRoom]        = useState<XoxRoom | null>(null);
  const [board,       setBoard]       = useState<Mark[]>([]);
  const [currentTurn, setCurrentTurn] = useState<'X' | 'O'>('X');
  const [winner,      setWinner]      = useState<'X' | 'O' | 'draw' | null>(null);
  const [winLine,     setWinLine]     = useState<number[]>([]);
  const [myUid,       setMyUid]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [makingMove,  setMakingMove]  = useState(false);

  const broadcastRef  = useRef<{ send: (d: XoxMoveBroadcast) => void; cleanup: () => void } | null>(null);
  const soundPlayedRef = useRef(false);

  // ── Derived ────────────────────────────────────────────────────────────────

  const myMark = useMemo<'X' | 'O' | null>(() => {
    if (!room || !myUid) return null;
    if (room.player1Id === myUid) return 'X';
    if (room.player2Id === myUid) return 'O';
    return null;
  }, [room, myUid]);

  const opponentName = useMemo(() => {
    if (!room || !myUid) return 'Opponent';
    return room.player1Id === myUid ? room.player2Name : room.player1Name;
  }, [room, myUid]);

  const isMyTurn = useMemo(
    () => !!myMark && !winner && room?.status === 'in_progress' && currentTurn === myMark,
    [myMark, winner, room?.status, currentTurn],
  );

  const boardSizePx = Math.min(width - 36, 370);

  // ── Sync helper ────────────────────────────────────────────────────────────

  const syncFromRoom = (r: XoxRoom) => {
    setRoom(r);
    setBoard(r.board as Mark[]);
    setCurrentTurn(r.currentTurn);
    if (r.winner) {
      setWinner(r.winner);
      const wins   = getWins(r.boardSize);
      const result = checkWinner(r.board as Mark[], wins);
      setWinLine(result.line);
    }
  };

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const uid = await getCurrentUserId();
        if (!mounted) return;
        setMyUid(uid);

        if (!roomId) return;
        const r = await getXoxRoom(roomId);
        if (!mounted || !r) return;
        syncFromRoom(r);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Could not load game.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [roomId]);

  // ── postgres_changes — room updates (status, board, winner) ───────────────

  useEffect(() => {
    if (!roomId) return;
    return subscribeToXoxRoom(roomId, syncFromRoom);
  }, [roomId]);

  // ── Broadcast — instant move sync ─────────────────────────────────────────

  useEffect(() => {
    if (!roomId) return;
    const channel = subscribeToXoxBroadcast(roomId, (data) => {
      setBoard(data.board as Mark[]);
      setCurrentTurn(data.nextTurn);
      if (data.winner) {
        setWinner(data.winner);
        const n    = Math.round(Math.sqrt(data.board.length));
        const wins = getWins(n);
        setWinLine(checkWinner(data.board as Mark[], wins).line);
      }
    });
    broadcastRef.current = channel;
    return channel.cleanup;
  }, [roomId]);

  // ── Sound when game ends ───────────────────────────────────────────────────

  useEffect(() => {
    if (!winner || soundPlayedRef.current || !myMark) return;
    soundPlayedRef.current = true;
    if (winner === 'draw') {
      playDrawSound(state.settings.sound).catch(() => {});
    } else if (winner === myMark) {
      playWinSound(state.settings.sound).catch(() => {});
    } else {
      playLoseSound(state.settings.sound).catch(() => {});
    }
  }, [winner, myMark]);

  // ── Move handler ───────────────────────────────────────────────────────────

  const handleCellPress = async (index: number) => {
    if (!isMyTurn || board[index] || winner || makingMove || !room || !myMark) return;

    const newBoard = [...board] as Mark[];
    newBoard[index] = myMark;

    const wins      = getWins(room.boardSize);
    const result    = checkWinner(newBoard, wins);
    const nextTurn: 'X' | 'O' = myMark === 'X' ? 'O' : 'X';
    const winnerId  = result.winner === 'X' ? room.player1Id
      : result.winner === 'O'   ? room.player2Id
      : null;

    // Optimistic local update
    setBoard(newBoard);
    setCurrentTurn(nextTurn);
    if (result.winner) {
      setWinner(result.winner);
      setWinLine(result.line);
    }

    playGameSound('tap', state.settings.sound).catch(() => {});

    // Instant broadcast to opponent
    broadcastRef.current?.send({
      index,
      mark: myMark,
      board: newBoard as ('X' | 'O' | null)[],
      nextTurn,
      winner: result.winner,
      winnerId,
    });

    // Persist to DB
    setMakingMove(true);
    try {
      await makeXoxMove({
        roomId: room.id,
        board:  newBoard as ('X' | 'O' | null)[],
        nextTurn,
        winner:   result.winner,
        winnerId,
      });
    } catch (e: any) {
      Alert.alert('Move error', e?.message || 'Could not save move. Try again.');
    } finally {
      setMakingMove(false);
    }
  };

  // ── Quit / rematch ─────────────────────────────────────────────────────────

  const handleQuit = () => {
    Alert.alert(
      'Quit Game',
      'Leave this game? Your opponent wins.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: async () => {
            if (room && myMark && !winner) {
              const winnerMark: 'X' | 'O' = myMark === 'X' ? 'O' : 'X';
              const winnerId = myMark === 'X' ? room.player2Id : room.player1Id;
              await makeXoxMove({
                roomId: room.id,
                board:  board as ('X' | 'O' | null)[],
                nextTurn: winnerMark,
                winner: winnerMark,
                winnerId,
              }).catch(() => {});
            }
            router.back();
          },
        },
      ],
    );
  };

  const handlePlayAgain = () => {
    router.replace('/xox-battle');
  };

  const handleRematch = async () => {
    if (!room || !myMark) return;
    const friend: PublicUser = {
      uid:             myMark === 'X' ? room.player2Id   : room.player1Id,
      displayName:     myMark === 'X' ? room.player2Name : room.player1Name,
      coins: 0,
      totalScore: 0,
      levelsCompleted: 0,
    };
    try {
      const newRoom = await createXoxRoom({ friend, boardSize: room.boardSize });
      router.replace(`/xox-room?roomId=${newRoom.id}`);
    } catch (e: any) {
      Alert.alert('Rematch failed', e?.message || 'Could not create rematch.');
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#FF7A00" size="large" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!room) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Game room not found.</Text>
          <Pressable onPress={() => router.back()} style={styles.fallbackBtn}>
            <Text style={styles.fallbackBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Waiting for opponent to accept ─────────────────────────────────────────

  if (room.status === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>XOX Online</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.centered}>
          <View style={styles.waitCircle}>
            <Ionicons name="time-outline" size={50} color="#FF7A00" />
          </View>
          <Text style={styles.waitTitle}>Waiting for {opponentName}…</Text>
          <Text style={styles.waitSub}>
            The game will start automatically when they accept your challenge.
          </Text>
          <ActivityIndicator color="#FF7A00" size="small" style={{ marginTop: 4 }} />
          <Pressable onPress={handleQuit} style={styles.quitBtn}>
            <Text style={styles.quitBtnText}>Cancel Challenge</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── In-progress / completed game ───────────────────────────────────────────

  const turnColor  = currentTurn === 'X' ? '#FF7A00' : '#4CC38A';
  const isOppTurn  = !isMyTurn && !winner;
  const turnLabel  = isMyTurn ? 'Your Turn' : `${opponentName}'s Turn`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleQuit} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>XOX Online</Text>
        <View style={{ width: 42 }} />
      </View>

      {/* Player name strips */}
      <View style={styles.playersRow}>
        <View style={[
          styles.playerCard,
          currentTurn === 'X' && !winner && styles.playerCardActiveX,
        ]}>
          <Ionicons name="close-sharp" size={16} color="#FF7A00" />
          <Text style={styles.playerName} numberOfLines={1}>
            {room.player1Name}{room.player1Id === myUid ? ' (You)' : ''}
          </Text>
        </View>

        <Text style={styles.vsText}>VS</Text>

        <View style={[
          styles.playerCard,
          currentTurn === 'O' && !winner && styles.playerCardActiveO,
        ]}>
          <Ionicons name="ellipse-outline" size={14} color="#4CC38A" />
          <Text style={styles.playerName} numberOfLines={1}>
            {room.player2Name}{room.player2Id === myUid ? ' (You)' : ''}
          </Text>
        </View>
      </View>

      {/* Turn indicator */}
      {!winner && (
        <View style={[styles.turnBanner, { borderColor: turnColor + '44' }]}>
          {isOppTurn && (
            <ActivityIndicator size="small" color={turnColor} style={{ marginRight: 6 }} />
          )}
          <View style={[styles.turnDot, { backgroundColor: turnColor }]} />
          <Text style={[styles.turnText, { color: turnColor }]}>{turnLabel}</Text>
        </View>
      )}

      {/* Board */}
      <View style={styles.boardOuter}>
        <View style={[styles.board, { width: boardSizePx, height: boardSizePx }]}>
          {Array.from({ length: room.boardSize }, (_, row) => (
            <View key={row} style={styles.boardRow}>
              {Array.from({ length: room.boardSize }, (_, col) => {
                const index = row * room.boardSize + col;
                return (
                  <XoxCell
                    key={index}
                    value={board[index] ?? null}
                    isWinCell={winLine.includes(index)}
                    onPress={() => handleCellPress(index)}
                    disabled={!isMyTurn || !!winner || !!board[index] || makingMove}
                    boardSize={room.boardSize}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.boardLabel}>{room.boardSize}×{room.boardSize} Board</Text>

      {/* Result overlay */}
      {winner && (
        <View style={styles.overlayBg}>
          <View style={styles.overlayCard}>
            {winner === 'draw' ? (
              <Ionicons name="remove-circle-outline" size={72} color="#FFD23F" />
            ) : winner === myMark ? (
              <Ionicons name="trophy" size={72} color="#FFD23F" />
            ) : (
              <Ionicons name="sad-outline" size={72} color="#FF4D8D" />
            )}

            <Text style={[
              styles.overlayTitle,
              {
                color: winner === 'draw'
                  ? '#FFD23F'
                  : winner === myMark ? '#FFD23F' : '#FF4D8D',
              },
            ]}>
              {winner === 'draw' ? 'DRAW!' : winner === myMark ? 'YOU WIN!' : 'YOU LOSE!'}
            </Text>

            <Text style={styles.overlaySub}>
              {winner === 'draw'
                ? "It's a tie — well played!"
                : winner === myMark
                ? 'Excellent play!'
                : `${opponentName} wins this round`}
            </Text>

            <View style={styles.overlayBtnRow}>
              <Pressable onPress={handleRematch} style={[styles.overlayBtn, styles.rematchBtn]}>
                <Ionicons name="refresh" size={17} color="#fff" />
                <Text style={styles.overlayBtnText}>Rematch</Text>
              </Pressable>
              <Pressable onPress={handlePlayAgain} style={[styles.overlayBtn, styles.lobbyBtn]}>
                <Ionicons name="people" size={17} color="#0B1020" />
                <Text style={[styles.overlayBtnText, { color: '#0B1020' }]}>Lobby</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0B1020' },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 28 },
  errorText:  { color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  fallbackBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#FF7A00',
  },
  fallbackBtnText: { color: '#fff', fontWeight: '900' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },

  // Players row
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  playerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  playerCardActiveX: {
    borderColor: '#FF7A00',
    backgroundColor: 'rgba(255,122,0,0.12)',
  },
  playerCardActiveO: {
    borderColor: '#4CC38A',
    backgroundColor: 'rgba(76,195,138,0.12)',
  },
  playerName: { flex: 1, color: '#fff', fontWeight: '900', fontSize: 12 },
  vsText: { color: 'rgba(255,255,255,0.4)', fontWeight: '900', fontSize: 12 },

  // Turn banner
  turnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    marginBottom: 14,
  },
  turnDot:  { width: 8, height: 8, borderRadius: 4 },
  turnText: { fontWeight: '900', fontSize: 14 },

  // Board
  boardOuter: {
    alignSelf: 'center',
    padding: 6,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  board: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.13)',
    padding: 10,
    gap: 8,
  },
  boardRow: { flex: 1, flexDirection: 'row', gap: 8 },
  cell: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  cellWin: {
    backgroundColor: '#ADFFD0',
    borderWidth: 2,
    borderColor: '#4CC38A',
  },
  boardLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },

  // Waiting screen
  waitCircle: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: 'rgba(255,122,0,0.14)',
    borderWidth: 2,
    borderColor: 'rgba(255,122,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  waitSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  quitBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,77,141,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,141,0.4)',
  },
  quitBtnText: { color: '#FF4D8D', fontWeight: '900' },

  // Result overlay
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,8,18,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  overlayCard: {
    width: '84%',
    backgroundColor: 'rgba(18,24,42,0.98)',
    borderRadius: 38,
    padding: 30,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 24,
  },
  overlayTitle: { fontWeight: '900', fontSize: 36, letterSpacing: -0.5 },
  overlaySub:   { color: 'rgba(255,255,255,0.56)', fontWeight: '700', fontSize: 14, marginBottom: 6 },
  overlayBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  overlayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 999,
  },
  rematchBtn: { backgroundColor: '#FF7A00' },
  lobbyBtn:   { backgroundColor: '#fff' },
  overlayBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
