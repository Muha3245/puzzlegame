import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ScreenShell } from '../components/ScreenShell';
import { useAppTheme } from '../lib/appTheme';
import { playDrawSound, playGameSound, playLoseSound, playWinSound } from '../lib/audio';
import { useAppState } from '../lib/storage';

type Mark = 'X' | 'O' | null;
type Mode = 'bot' | 'local' | 'online';
type BotLevel = 'easy' | 'medium' | 'hard';
type BoardSize = 3 | 4 | 5;

const DIFF_META: Record<BotLevel, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  easy: { label: 'Easy', color: '#4CC38A', icon: 'leaf-outline' },
  medium: { label: 'Medium', color: '#FF8A1F', icon: 'flash' },
  hard: { label: 'Hard', color: '#FF4D8D', icon: 'skull-outline' },
};

const MODES = [
  { id: 'bot'    as Mode, icon: 'hardware-chip-outline' as const, label: 'VS BOT',    sub: 'Play vs AI' },
  { id: 'local'  as Mode, icon: 'people-outline'        as const, label: '2 PLAYERS', sub: 'Pass & Play' },
  { id: 'online' as Mode, icon: 'wifi-outline'          as const, label: 'ONLINE',    sub: 'Challenge Friends' },
];

const BOARD_SIZES: { size: BoardSize; label: string; sub: string }[] = [
  { size: 3, label: '3 × 3', sub: 'Classic' },
  { size: 4, label: '4 × 4', sub: 'Extended' },
  { size: 5, label: '5 × 5', sub: 'Big' },
];

const ICON_X: Record<BoardSize, number> = { 3: 54, 4: 38, 5: 28 };
const ICON_O: Record<BoardSize, number> = { 3: 46, 4: 32, 5: 24 };

function getWins(n: number): number[][] {
  const wins: number[][] = [];

  for (let r = 0; r < n; r++) {
    wins.push(Array.from({ length: n }, (_, c) => r * n + c));
  }

  for (let c = 0; c < n; c++) {
    wins.push(Array.from({ length: n }, (_, r) => r * n + c));
  }

  wins.push(Array.from({ length: n }, (_, i) => i * n + i));
  wins.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)));

  return wins;
}

function winnerOf(board: Mark[], wins: number[][]): { winner: 'X' | 'O' | 'draw' | null; line: number[] } {
  for (const line of wins) {
    const first = board[line[0]];
    if (first && line.every((i) => board[i] === first)) {
      return { winner: first, line };
    }
  }

  if (board.every(Boolean)) {
    return { winner: 'draw', line: [] };
  }

  return { winner: null, line: [] };
}

function findMoveN(board: Mark[], mark: 'X' | 'O', wins: number[][]): number {
  for (const line of wins) {
    const vals = line.map((i) => board[i]);
    const marks = vals.filter((v) => v === mark).length;
    const nullIdx = vals.indexOf(null);

    if (marks === line.length - 1 && nullIdx >= 0) {
      return line[nullIdx];
    }
  }

  return -1;
}

function botMove(board: Mark[], level: BotLevel, wins: number[][], n: number): number {
  const empty = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);

  if (!empty.length) return -1;

  if (level !== 'easy') {
    const win = findMoveN(board, 'O', wins);
    if (win >= 0) return win;

    const block = findMoveN(board, 'X', wins);
    if (block >= 0) return block;
  }

  if (level === 'hard') {
    const center = Math.floor((n * n) / 2);
    if (!board[center]) return center;

    const corners = n === 3 ? [0, 2, 6, 8] : [0, n - 1, n * (n - 1), n * n - 1];

    const freeCorner = corners.find((c) => !board[c]);
    if (freeCorner !== undefined) return freeCorner;
  }

  return empty[Math.floor(Math.random() * empty.length)];
}

function Cell({
  value,
  onPress,
  active,
  disabled,
  boardSize,
}: {
  value: Mark;
  onPress: () => void;
  active: boolean;
  disabled?: boolean;
  boardSize: BoardSize;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const markScale = useRef(new Animated.Value(0)).current;
  const winPulse = useRef(new Animated.Value(1)).current;
  const winAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (value) {
      Animated.spring(markScale, {
        toValue: 1,
        friction: 3,
        tension: 280,
        useNativeDriver: true,
      }).start();
    } else {
      markScale.setValue(0);
    }
  }, [value, markScale]);

  useEffect(() => {
    winAnim.current?.stop();

    if (active) {
      winAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(winPulse, {
            toValue: 1.08,
            duration: 480,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(winPulse, {
            toValue: 0.97,
            duration: 480,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      winAnim.current.start();
    } else {
      winPulse.setValue(1);
    }

    return () => {
      winAnim.current?.stop();
    };
  }, [active, winPulse]);

  const pressIn = () => {
    if (value || disabled) return;

    Animated.spring(pressScale, {
      toValue: 0.88,
      friction: 6,
      tension: 220,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const ix = ICON_X[boardSize];
  const io = ICON_O[boardSize];

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: winPulse }] }}>
      <Animated.View style={{ flex: 1, transform: [{ scale: pressScale }] }}>
        <Pressable
          style={[styles.cell, active && styles.cellWin]}
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={onPress}
          disabled={disabled}
        >
          <Animated.View style={{ transform: [{ scale: markScale }] }}>
            {value === 'X' && (
              <Ionicons name="close-sharp" size={ix} color={active ? '#FF3D00' : '#FF7A00'} />
            )}

            {value === 'O' && (
              <Ionicons name="ellipse-outline" size={io} color={active ? '#00C853' : '#4CC38A'} />
            )}
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function BotThinking() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.turnRow, { opacity: pulse }]}>
      <View style={[styles.turnIconWrap, { backgroundColor: '#4CC38A22', borderColor: '#4CC38A55' }]}>
        <Ionicons name="hardware-chip-outline" size={15} color="#4CC38A" />
      </View>
      <Text style={[styles.turnText, { color: '#4CC38A' }]}>Bot is thinking...</Text>
    </Animated.View>
  );
}

function ResultOverlay({
  winner,
  mode,
  onPlayAgain,
}: {
  winner: 'X' | 'O' | 'draw';
  mode: Mode;
  onPlayAgain: () => void;
}) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 130,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  const isDraw = winner === 'draw';
  const botWon = winner === 'O' && mode === 'bot';
  const color = isDraw ? '#FFD23F' : winner === 'X' ? '#FF7A00' : '#4CC38A';
  const title = isDraw ? 'DRAW!' : botWon ? 'BOT WINS!' : `${winner} WINS!`;
  const sub = isDraw ? 'Nobody wins this one' : botWon ? 'Better luck next time' : 'Excellent play!';

  return (
    <Animated.View style={[styles.overlayBg, { opacity }]}>
      <Animated.View style={[styles.overlayCard, { borderColor: color + '40', transform: [{ scale }] }]}>
        <View style={[styles.overlayBubble, { backgroundColor: color + '18', borderColor: color + '45' }]}>
          {isDraw ? (
            <Ionicons name="remove" size={60} color={color} />
          ) : winner === 'X' ? (
            <Ionicons name="close-sharp" size={62} color={color} />
          ) : (
            <Ionicons name="ellipse-outline" size={54} color={color} />
          )}
        </View>

        <Text style={[styles.overlayTitle, { color }]}>{title}</Text>
        <Text style={styles.overlaySub}>{sub}</Text>

        <AnimatedPressable style={[styles.overlayBtn, { backgroundColor: color }]} onPress={onPlayAgain}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.overlayBtnText}>Play Again</Text>
        </AnimatedPressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function Xox() {
  const { state } = useAppState();
  const { width } = useWindowDimensions();

  const [mode, setMode] = useState<Mode>('bot');
  const [botLevel, setBotLevel] = useState<BotLevel>('medium');
  const [boardSize, setBoardSize] = useState<BoardSize>(3);
  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [scores, setScores] = useState({ x: 0, o: 0, draw: 0 });

  const wins = useMemo(() => getWins(boardSize), [boardSize]);
  const result = useMemo(() => winnerOf(board, wins), [board, wins]);

  const BOARD_SIZE_PX = Math.min(width - 36, 370);

  const reset = () => {
    setBoard(Array(boardSize * boardSize).fill(null));
    setTurn('X');
  };

  useEffect(() => {
    setBoard(Array(boardSize * boardSize).fill(null));
    setTurn('X');
  }, [boardSize]);

  useEffect(() => {
    if (!result.winner) return;

    if (result.winner === 'X') {
      setScores((s) => ({ ...s, x: s.x + 1 }));
      playWinSound(state.settings.sound).catch(() => {});
    } else if (result.winner === 'O') {
      setScores((s) => ({ ...s, o: s.o + 1 }));
      (mode === 'bot' ? playLoseSound : playWinSound)(state.settings.sound).catch(() => {});
    } else {
      setScores((s) => ({ ...s, draw: s.draw + 1 }));
      playDrawSound(state.settings.sound).catch(() => {});
    }
  }, [result.winner]);

  useEffect(() => {
    if (mode !== 'bot' || turn !== 'O' || result.winner) return;

    const timer = setTimeout(() => {
      setBoard((prev) => {
        const move = botMove(prev, botLevel, wins, boardSize);
        if (move < 0) return prev;

        const next = [...prev];
        next[move] = 'O';
        return next;
      });

      setTurn('X');
      playGameSound('tap', state.settings.sound).catch(() => {});
    }, 520);

    return () => clearTimeout(timer);
  }, [mode, turn, result.winner, botLevel, wins, boardSize, state.settings.sound]);

  const tapCell = (index: number) => {
    if (board[index] || result.winner) return;
    if (mode === 'bot' && turn === 'O') return;

    const next = [...board];
    next[index] = turn;

    setBoard(next);
    setTurn(turn === 'X' ? 'O' : 'X');
    playGameSound('tap', state.settings.sound).catch(() => {});
  };

  const isBotThinking = mode === 'bot' && turn === 'O' && !result.winner;
  const turnColor = turn === 'X' ? '#FF7A00' : '#4CC38A';
  const turnIcon: keyof typeof Ionicons.glyphMap = turn === 'X' ? 'close-sharp' : 'ellipse-outline';

  const turnLabel =
    turn === 'X'
      ? mode === 'bot'
        ? 'Your Turn'
        : "X's Turn"
      : mode === 'bot'
        ? "Bot's Turn"
        : "O's Turn";

  const { C } = useAppTheme();

  return (
    <ScreenShell title="XOX" subtitle="Offline bot and same-mobile multiplayer">
        <View style={[styles.screen, { backgroundColor: C.bg }]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* <View style={styles.heroCard}>
              <View style={styles.heroGlowOne} />
              <View style={styles.heroGlowTwo} />

              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroSmall}>Tic Tac Toe</Text>
                  <Text style={styles.heroTitle}>Choose your strategy.</Text>
                </View>

                <View style={styles.heroIcon}>
                  <Ionicons name="grid-outline" size={26} color="#fff" />
                </View>
              </View>

              <Text style={styles.heroSub}>
                Play against the bot or challenge a friend on the same mobile.
              </Text>
            </View> */}

            <View style={styles.modeRow}>
              {MODES.map((m) => {
                const active = mode === m.id;

                return (
                  <AnimatedPressable
                    key={m.id}
                    style={[
                      styles.modeCard,
                      { backgroundColor: C.surface, borderColor: C.divider },
                      active && styles.modeCardActive,
                    ]}
                    onPress={() => {
                      if (m.id === 'online') {
                        router.push('/xox-battle');
                        return;
                      }
                      setMode(m.id);
                      reset();
                    }}
                  >
                    <View style={[styles.modeIconWrap, active && styles.modeIconWrapActive]}>
                      <Ionicons name={m.icon} size={25} color={active ? '#fff' : C.muted} />
                    </View>

                    <Text style={[styles.modeLabel, { color: C.muted }, active && styles.modeLabelActive]}>{m.label}</Text>
                    <Text style={[styles.modeSub, { color: C.muted }]}>{m.sub}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            <View style={[styles.panel, { backgroundColor: C.surface, borderColor: C.divider }]}>
              <View style={styles.panelHeader}>
                <Text style={[styles.panelTitle, { color: C.ink }]}>Board Size</Text>
                <Text style={[styles.panelSub, { color: C.muted }]}>Select your game layout</Text>
              </View>

              <View style={styles.sizeRow}>
                {BOARD_SIZES.map((b) => {
                  const active = boardSize === b.size;

                  return (
                    <AnimatedPressable
                      key={b.size}
                      style={[styles.sizeChip, active && styles.sizeChipActive]}
                      onPress={() => setBoardSize(b.size)}
                    >
                      <Text style={[styles.sizeLabel, active && styles.sizeLabelActive]}>{b.label}</Text>
                      <Text style={[styles.sizeSub, active && styles.sizeSubActive]}>{b.sub}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            {mode === 'bot' && (
              <View style={[styles.panel, { backgroundColor: C.surface, borderColor: C.divider }]}>
                <View style={styles.panelHeader}>
                  <Text style={[styles.panelTitle, { color: C.ink }]}>Difficulty</Text>
                  <Text style={[styles.panelSub, { color: C.muted }]}>Choose bot strength</Text>
                </View>

                <View style={styles.diffRow}>
                  {(Object.entries(DIFF_META) as [BotLevel, typeof DIFF_META[BotLevel]][]).map(([level, meta]) => {
                    const active = botLevel === level;

                    return (
                      <AnimatedPressable
                        key={level}
                        style={[
                          styles.diffChip,
                          active && {
                            backgroundColor: meta.color + '22',
                            borderColor: meta.color,
                          },
                        ]}
                        onPress={() => {
                          setBotLevel(level);
                          reset();
                        }}
                      >
                        <Ionicons name={meta.icon} size={14} color={active ? meta.color : 'rgba(255,255,255,0.42)'} />
                        <Text style={[styles.diffText, active && { color: meta.color }]}>{meta.label}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.scoreRow}>
              <View style={[styles.scoreBox, styles.scoreBoxX]}>
                <Ionicons name="close-sharp" size={21} color="#FF7A00" />
                <Text style={styles.scoreWho}>{mode === 'bot' ? 'YOU' : 'X'}</Text>
                <Text style={styles.scoreNum}>{scores.x}</Text>
              </View>

              <View style={styles.drawBox}>
                <Text style={styles.drawLabel}>DRAW</Text>
                <Text style={styles.drawNum}>{scores.draw}</Text>
              </View>

              <View style={[styles.scoreBox, styles.scoreBoxO]}>
                <Ionicons name="ellipse-outline" size={18} color="#4CC38A" />
                <Text style={styles.scoreWho}>{mode === 'bot' ? 'BOT' : 'O'}</Text>
                <Text style={styles.scoreNum}>{scores.o}</Text>
              </View>
            </View>

            {!result.winner &&
              (isBotThinking ? (
                <BotThinking />
              ) : (
                <View style={styles.turnRow}>
                  <View style={[styles.turnIconWrap, { backgroundColor: turnColor + '22', borderColor: turnColor + '55' }]}>
                    <Ionicons name={turnIcon} size={15} color={turnColor} />
                  </View>
                  <Text style={[styles.turnText, { color: turnColor }]}>{turnLabel}</Text>
                </View>
              ))}

            <View style={styles.boardOuter}>
              <View style={[styles.board, { width: BOARD_SIZE_PX, height: BOARD_SIZE_PX }]}>
                {Array.from({ length: boardSize }, (_, row) => (
                  <View key={row} style={styles.boardRow}>
                    {Array.from({ length: boardSize }, (_, col) => {
                      const index = row * boardSize + col;

                      return (
                        <Cell
                          key={index}
                          value={board[index]}
                          active={result.line.includes(index)}
                          onPress={() => tapCell(index)}
                          disabled={!!result.winner || isBotThinking}
                          boardSize={boardSize}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            <AnimatedPressable style={styles.restartBtn} onPress={reset}>
              <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.74)" />
              <Text style={styles.restartText}>Restart Game</Text>
            </AnimatedPressable>
          </ScrollView>

          {result.winner && <ResultOverlay winner={result.winner} mode={mode} onPlayAgain={reset} />}
        </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1020',
  },

  screen: {
    flex: 1,
    backgroundColor: '#0B1020',
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 38,
    alignItems: 'center',
  },

  heroCard: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 32,
    padding: 20,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  heroGlowOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: 'rgba(255,122,0,0.24)',
    right: -55,
    top: -70,
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(76,195,138,0.20)',
    left: -48,
    bottom: -55,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
  },

  heroSmall: {
    color: '#FFD23F',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  heroTitle: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 32,
    marginTop: 6,
  },

  heroSub: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
    maxWidth: '92%',
  },

  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },

  modeRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },

  modeCard: {
    flex: 1,
    borderRadius: 26,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  modeCardActive: {
    backgroundColor: 'rgba(255,122,0,0.16)',
    borderColor: '#FF7A00',
    shadowColor: '#FF7A00',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 7,
  },

  modeIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 20,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeIconWrapActive: {
    backgroundColor: '#FF7A00',
  },

  modeLabel: {
    color: 'rgba(255,255,255,0.52)',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.4,
  },

  modeLabelActive: {
    color: '#fff',
  },

  modeSub: {
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '700',
    fontSize: 11,
  },

  panel: {
    width: '100%',
    padding: 14,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.075)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    marginBottom: 12,
  },

  panelHeader: {
    marginBottom: 12,
  },

  panelTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },

  panelSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  sizeRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    
  },

  sizeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.11)',
    gap: 2,
    width:100,
  },

  sizeChipActive: {
    backgroundColor: 'rgba(141,231,255,0.15)',
    borderColor: '#8DE7FF',
  },

  sizeLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '900',
    fontSize: 13,
  },

  sizeLabelActive: {
    color: '#8DE7FF',
  },

  sizeSub: {
    color: 'rgba(255,255,255,0.32)',
    fontWeight: '700',
    fontSize: 10,
  },

  sizeSubActive: {
    color: 'rgba(141,231,255,0.75)',
  },

  diffRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },

  diffChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.11)',
    width:100,
  },

  diffText: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '800',
    fontSize: 12,
  },

  scoreRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },

  scoreBox: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 14,
    gap: 3,
    borderWidth: 1,
  },

  scoreBoxX: {
    backgroundColor: 'rgba(255,122,0,0.12)',
    borderColor: 'rgba(255,122,0,0.25)',
  },

  scoreBoxO: {
    backgroundColor: 'rgba(76,195,138,0.12)',
    borderColor: 'rgba(76,195,138,0.25)',
  },

  scoreWho: {
    color: 'rgba(255,255,255,0.52)',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.8,
  },

  scoreNum: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 28,
  },

  drawBox: {
    width: 74,
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 14,
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
  },

  drawLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.8,
  },

  drawNum: {
    color: 'rgba(255,255,255,0.70)',
    fontWeight: '900',
    fontSize: 20,
  },

  turnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  turnIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  turnText: {
    fontWeight: '900',
    fontSize: 15,
  },

  boardOuter: {
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

  boardRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },

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

  restartBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },

  restartText: {
    color: 'rgba(255,255,255,0.74)',
    fontWeight: '900',
    fontSize: 14,
  },

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
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 24,
  },

  overlayBubble: {
    width: 106,
    height: 106,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 4,
  },

  overlayTitle: {
    fontWeight: '900',
    fontSize: 36,
    letterSpacing: -0.5,
  },

  overlaySub: {
    color: 'rgba(255,255,255,0.56)',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 6,
  },

  overlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 34,
    borderRadius: 999,
    marginTop: 4,
  },

  overlayBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
});