// app/xox-room.tsx
// Real-time online XOX game room.
// Player 1 (challenger) = X  |  Player 2 (challenged) = O

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  BattleChatMessage,
  applyOnlineCoinDelta,
  createXoxRoom,
  getCurrentUserId,
  getXoxRoom,
  makeXoxMove,
  PublicUser,
  rejectXoxRoom,
  subscribeToXoxBroadcast,
  subscribeToXoxChat,
  subscribeToXoxRoom,
  XoxMoveBroadcast,
  XoxRoom,
} from '../lib/online';
import { playDrawSound, playLoseSound, playXoxMove, playBattleWin, playBgMusic, stopBgMusic, playTapSound } from '../lib/audio';
import { useAppState } from '../lib/storage';
import { goBackOrHome } from '../lib/navigation';
import { DEFAULT_BATTLE_STAKE, sanitizeBattleStake } from '../lib/battleEconomy';

type Mark = 'X' | 'O' | null;

// ── Game-logic utilities ──────────────────────────────────────────────────────

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

function fmtChatTime(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
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
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 280, useNativeDriver: true }).start();
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
          <Ionicons name="close-sharp" size={ix} color={isWinCell ? '#FF3D00' : '#FF7A00'} />
        )}
        {value === 'O' && (
          <Ionicons name="ellipse-outline" size={io} color={isWinCell ? '#00C853' : '#4CC38A'} />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function XoxRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { state, addCoins } = useAppState();
  const { width } = useWindowDimensions();

  const [room,        setRoom]        = useState<XoxRoom | null>(null);
  const [board,       setBoard]       = useState<Mark[]>([]);
  const [currentTurn, setCurrentTurn] = useState<'X' | 'O'>('X');
  const [winner,      setWinner]      = useState<'X' | 'O' | 'draw' | null>(null);
  const [winLine,     setWinLine]     = useState<number[]>([]);
  const [myUid,       setMyUid]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [makingMove,  setMakingMove]  = useState(false);

  // Chat state
  const [chatOpen,       setChatOpen]       = useState(false);
  const [chatText,       setChatText]       = useState('');
  const [chatMessages,   setChatMessages]   = useState<BattleChatMessage[]>([]);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const chatScrollRef  = useRef<ScrollView | null>(null);
  const chatOpenRef    = useRef(false);
  const sendXoxChatRef = useRef<((m: BattleChatMessage) => void) | null>(null);

  const broadcastRef  = useRef<{ send: (d: XoxMoveBroadcast) => void; cleanup: () => void } | null>(null);
  const soundPlayedRef = useRef(false);
  const coinAppliedRef = useRef(false);

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

  const myName = useMemo(() => {
    if (!room || !myUid) return state.profile.name;
    return room.player1Id === myUid ? room.player1Name : room.player2Name;
  }, [room, myUid, state.profile.name]);

  const isMyTurn = useMemo(
    () => !!myMark && !winner && room?.status === 'in_progress' && currentTurn === myMark,
    [myMark, winner, room?.status, currentTurn],
  );

  const boardSizePx = Math.min(width - 36, 370);
  const stakeCoins = sanitizeBattleStake(room?.stakeCoins ?? DEFAULT_BATTLE_STAKE);

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
    soundPlayedRef.current = false;
    coinAppliedRef.current = false;
  }, [roomId]);

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

  // ── postgres_changes — room updates ───────────────────────────────────────

  useEffect(() => {
    if (!roomId) return;
    const unsub = subscribeToXoxRoom(roomId, syncFromRoom);
    return () => {
      unsub?.();
    };
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

  // ── Chat broadcast subscription ────────────────────────────────────────────

  useEffect(() => {
    if (!roomId) return;
    const chatChannel = subscribeToXoxChat(roomId, (msg) => {
      setChatMessages((prev) => [...prev.slice(-29), msg]);
      if (!chatOpenRef.current) {
        setUnreadCount((c) => Math.min(c + 1, 99));
      } else {
        requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: true }));
      }
    });
    sendXoxChatRef.current = chatChannel.send;
    return () => {
      chatChannel.cleanup();
      sendXoxChatRef.current = null;
    };
  }, [roomId]);

  // ── Sync chatOpen ref ──────────────────────────────────────────────────────

  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) {
      setUnreadCount(0);
      requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [chatOpen, chatMessages.length]);

  // ── Battle music ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (state.settings.sound) playBgMusic(true).catch(() => {});
    return () => stopBgMusic();
  }, [state.settings.sound]);

  // ── Sound when game ends ───────────────────────────────────────────────────

  useEffect(() => {
    if (!winner || soundPlayedRef.current || !myMark) return;
    soundPlayedRef.current = true;
    if (winner === 'draw') {
      playDrawSound(state.settings.sound).catch(() => {});
    } else if (winner === myMark) {
      playBattleWin(state.settings.sound).catch(() => {});
    } else {
      playLoseSound(state.settings.sound).catch(() => {});
    }

    // Coins: award the winner / deduct the loser exactly once when the online
    // game ends (draw -> no change). Keep local and Supabase balances aligned.
    if (room?.boardSize && winner !== 'draw' && !coinAppliedRef.current) {
      coinAppliedRef.current = true;
      const coinDelta = winner === myMark ? stakeCoins : -stakeCoins;
      addCoins(coinDelta);
      applyOnlineCoinDelta(coinDelta).catch(() => {});
    }
  }, [winner, myMark, stakeCoins]);

  // ── Move handler ───────────────────────────────────────────────────────────

  const handleCellPress = async (index: number) => {
    if (!isMyTurn || board[index] || winner || makingMove || !room || !myMark) return;

    const newBoard = [...board] as Mark[];
    newBoard[index] = myMark;

    const wins      = getWins(room.boardSize);
    const result    = checkWinner(newBoard, wins);
    const nextTurn: 'X' | 'O' = myMark === 'X' ? 'O' : 'X';
    const winnerId  = result.winner === 'X' ? room.player1Id
      : result.winner === 'O' ? room.player2Id
      : null;

    setBoard(newBoard);
    setCurrentTurn(nextTurn);
    if (result.winner) {
      setWinner(result.winner);
      setWinLine(result.line);
    }

    playXoxMove(state.settings.sound).catch(() => {});

    broadcastRef.current?.send({
      index,
      mark: myMark,
      board: newBoard as ('X' | 'O' | null)[],
      nextTurn,
      winner: result.winner,
      winnerId,
    });

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

  // ── Send chat message ──────────────────────────────────────────────────────

  const sendChatMessage = useCallback(() => {
    if (!myUid || !sendXoxChatRef.current) return;
    const text = chatText.trim().slice(0, 140);
    if (!text) return;
    const msg: BattleChatMessage = {
      id:          `${myUid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      roomId:      roomId ?? '',
      userId:      myUid,
      displayName: myName,
      text,
      createdAt:   Date.now(),
    };
    setChatMessages((prev) => [...prev.slice(-29), msg]);
    setChatText('');
    requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: true }));
    sendXoxChatRef.current(msg);
  }, [chatText, myUid, myName, roomId]);

  // ── Quit / rematch ─────────────────────────────────────────────────────────

  const handleQuit = () => {
    const isActive = room?.status === 'in_progress' && !winner;
    Alert.alert(
      'Quit Game',
      isActive
        ? `Leave this game? Your opponent wins and you lose ${stakeCoins} coins.`
        : 'Leave this game?',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: async () => {
            if (isActive && room && myMark) {
              coinAppliedRef.current = true;
              addCoins(-stakeCoins);
              applyOnlineCoinDelta(-stakeCoins).catch(() => {});
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
            goBackOrHome();
          },
        },
      ],
    );
  };

  const handlePlayAgain = () => router.replace('/xox-battle');

  const handleRematch = async () => {
    if (!room || !myMark) return;
    if (state.coins < stakeCoins) {
      Alert.alert(
        'Not enough coins',
        `This rematch needs ${stakeCoins} coins. Your balance is ${state.coins}.`,
      );
      return;
    }

    const friend: PublicUser = {
      uid:             myMark === 'X' ? room.player2Id   : room.player1Id,
      displayName:     myMark === 'X' ? room.player2Name : room.player1Name,
      coins: 0,
      totalScore: 0,
      levelsCompleted: 0,
      battlesWon: 0,
      battlesLost: 0,
    };
    try {
      const newRoom = await createXoxRoom({ friend, boardSize: room.boardSize, stakeCoins });
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
          <Pressable onPress={() => { playTapSound(state.settings.sound).catch(() => {}); goBackOrHome(); }} style={styles.fallbackBtn}>
            <Text style={styles.fallbackBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Waiting for opponent ───────────────────────────────────────────────────

  if (room.status === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => { playTapSound(state.settings.sound).catch(() => {}); goBackOrHome(); }} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>XOX Online</Text>
          <View style={styles.headerRight}>
            <View style={styles.coinPill}>
              <Ionicons name="logo-bitcoin" size={13} color="#FFD23F" />
              <Text style={styles.coinText}>{state.coins}</Text>
            </View>
          </View>
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
      <Image source={require('../assets/images/wordrush-arena-background.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { playTapSound(state.settings.sound).catch(() => {}); handleQuit(); }} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>XOX Online</Text>
        <View style={styles.headerRight}>
          {/* Chat button */}
          <Pressable onPress={() => setChatOpen(true)} style={styles.chatBtn}>
            <Ionicons name="chatbubble-ellipses" size={17} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          {/* Coin pill */}
          <Pressable onPress={() => router.push('/coins')} style={styles.coinPill}>
            <Ionicons name="logo-bitcoin" size={13} color="#FFD23F" />
            <Text style={styles.coinText}>{state.coins}</Text>
          </Pressable>
        </View>
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
              { color: winner === 'draw' ? '#FFD23F' : winner === myMark ? '#FFD23F' : '#FF4D8D' },
            ]}>
              {winner === 'draw' ? 'DRAW!' : winner === myMark ? 'YOU WIN!' : 'YOU LOSE!'}
            </Text>

            <Text style={styles.overlaySub}>
              {winner === 'draw'
                ? "It's a tie — well played!"
                : winner === myMark
                ? `Excellent play! +${stakeCoins} coins`
                : `${opponentName} wins this round. -${stakeCoins} coins`}
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
              <Pressable onPress={() => router.replace('/home')} style={[styles.overlayBtn, styles.homeBtn]}>
                <Ionicons name="home" size={17} color="#fff" />
                <Text style={styles.overlayBtnText}>Home</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Chat Modal */}
      <Modal
        visible={chatOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setChatOpen(false)}
      >
        <View style={styles.chatModalRoot}>
          <Pressable style={styles.chatModalBackdrop} onPress={() => setChatOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
            style={styles.chatKeyboardWrap}
          >
            <View style={styles.chatCard}>
              <View style={styles.chatHandle} />

              <View style={styles.chatHeader}>
                <View style={styles.chatHeaderLeft}>
                  <View style={styles.chatIconCircle}>
                    <Ionicons name="chatbubble-ellipses" size={17} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chatTitle}>XOX Live Chat</Text>
                    <Text style={styles.chatSub}>Realtime only · not saved</Text>
                  </View>
                </View>
                <Pressable style={styles.chatCloseBtn} onPress={() => setChatOpen(false)}>
                  <Ionicons name="close" size={18} color="#fff" />
                </Pressable>
              </View>

              <ScrollView
                ref={chatScrollRef}
                style={styles.chatMessages}
                contentContainerStyle={styles.chatMessagesContent}
                showsVerticalScrollIndicator={false}
                automaticallyAdjustKeyboardInsets
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
              >
                {chatMessages.length === 0 ? (
                  <View style={styles.chatEmptyBox}>
                    <View style={styles.chatEmptyIcon}>
                      <Ionicons name="chatbubbles-outline" size={32} color="rgba(255,216,122,0.9)" />
                    </View>
                    <Text style={styles.chatEmpty}>No messages yet</Text>
                    <Text style={styles.chatEmptySmall}>Send a quick message to your opponent.</Text>
                  </View>
                ) : (
                  chatMessages.map((msg) => {
                    const mine = msg.userId === myUid;
                    return (
                      <View
                        key={msg.id}
                        style={[
                          styles.chatMessageRow,
                          mine ? styles.chatMessageRowMine : styles.chatMessageRowOpponent,
                        ]}
                      >
                        {!mine && (
                          <View style={styles.chatAvatar}>
                            <Text style={styles.chatAvatarText}>
                              {(msg.displayName || 'O').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.chatBubble, mine ? styles.chatBubbleMine : styles.chatBubbleOpponent]}>
                          {!mine && (
                            <Text style={styles.chatName} numberOfLines={1}>
                              {msg.displayName || 'Opponent'}
                            </Text>
                          )}
                          <Text style={styles.chatMsgText}>{msg.text}</Text>
                          <View style={styles.chatMetaRow}>
                            <Text style={[styles.chatTime, mine && styles.chatTimeMine]}>
                              {fmtChatTime(msg.createdAt)}
                            </Text>
                            {mine && (
                              <Ionicons name="checkmark-done" size={13} color="rgba(255,255,255,0.72)" />
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <View style={styles.chatInputRow}>
                <TextInput
                  value={chatText}
                  onChangeText={setChatText}
                  placeholder="Write a message..."
                  placeholderTextColor="rgba(255,255,255,0.38)"
                  style={styles.chatInput}
                  maxLength={140}
                  returnKeyType="send"
                  onSubmitEditing={sendChatMessage}
                  multiline
                />
                <Pressable
                  style={[styles.chatSendBtn, !chatText.trim() && styles.chatSendBtnDisabled]}
                  onPress={sendChatMessage}
                  disabled={!chatText.trim()}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#2A0A80' },
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
    paddingVertical: 12,
    gap: 10,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,70,50,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,216,122,0.30)',
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 999,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD23F',
    borderWidth: 1.5,
    borderColor: '#0B1020',
  },
  chatBadgeText: { color: '#0B1020', fontSize: 8, fontWeight: '900' },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,210,63,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.32)',
  },
  coinText: { color: '#FFD23F', fontSize: 12, fontWeight: '900' },

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
  waitTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
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
  overlayBtnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
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
  homeBtn:    { backgroundColor: '#8E6BFF' },
  overlayBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  // Chat modal
  chatModalRoot: { flex: 1, justifyContent: 'flex-end' },
  chatModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.64)' },
  chatKeyboardWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  chatCard: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    height: '82%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(3,26,15,0.99)',
    borderWidth: 1,
    borderColor: 'rgba(255,216,122,0.30)',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 26,
    elevation: 24,
  },
  chatHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: 9,
    marginBottom: 2,
  },
  chatHeader: {
    minHeight: 64,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,216,122,0.14)',
  },
  chatHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  chatIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,216,122,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,216,122,0.30)',
  },
  chatTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
  chatSub:   { color: 'rgba(255,255,255,0.50)', fontSize: 11, fontWeight: '700', marginTop: 1 },
  chatCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  chatMessages: { flex: 1 },
  chatMessagesContent: { padding: 14, gap: 8 },
  chatEmptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48, gap: 8 },
  chatEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,216,122,0.12)',
  },
  chatEmpty:      { color: '#fff', fontSize: 16, fontWeight: '900' },
  chatEmptySmall: { color: 'rgba(255,255,255,0.48)', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  chatMessageRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', maxWidth: '84%' },
  chatMessageRowMine:     { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  chatMessageRowOpponent: { alignSelf: 'flex-start' },
  chatAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  chatAvatarText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  chatBubble: {
    maxWidth: 220,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 3,
  },
  chatBubbleMine: {
    backgroundColor: 'rgba(255,122,0,0.85)',
    borderBottomRightRadius: 5,
  },
  chatBubbleOpponent: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  chatName:    { color: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: '700' },
  chatMsgText: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  chatMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  chatTime:     { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700' },
  chatTimeMine: { color: 'rgba(255,255,255,0.60)' },
  chatInputRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,216,122,0.14)',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7A00',
  },
  chatSendBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.15)' },
});

