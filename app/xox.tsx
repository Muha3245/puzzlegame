import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ScreenShell } from '../components/ScreenShell';
import { useAppTheme } from '../lib/appTheme';
import { playDrawSound, playLoseSound, playXoxMove, playXoxWin } from '../lib/audio';
import { useAppState } from '../lib/storage';

type Mark      = 'X' | 'O' | null;
type Mode      = 'bot' | 'local' | 'online';
type BotLevel  = 'easy' | 'medium' | 'hard';
type BoardSize = 3 | 4 | 5;

const DIFF_LEVELS: BotLevel[] = ['easy', 'medium', 'hard'];

const DIFF_META: Record<BotLevel, { label: string; short: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  easy:   { label: 'Easy',   short: 'EASY', color: '#4CC38A', icon: 'leaf-outline'  },
  medium: { label: 'Medium', short: 'MED',  color: '#FF8A1F', icon: 'flash'         },
  hard:   { label: 'Hard',   short: 'HARD', color: '#FF4D8D', icon: 'skull-outline' },
};

const MODES = [
  { id: 'bot'    as Mode, icon: 'hardware-chip-outline' as const, label: 'VS BOT'    },
  { id: 'local'  as Mode, icon: 'people-outline'        as const, label: '2 PLAYERS' },
  { id: 'online' as Mode, icon: 'wifi-outline'          as const, label: 'ONLINE'    },
];

const BOARD_SIZES: { size: BoardSize; label: string }[] = [
  { size: 3, label: '3×3' },
  { size: 4, label: '4×4' },
  { size: 5, label: '5×5' },
];

const ICON_X: Record<BoardSize, number> = { 3: 54, 4: 38, 5: 28 };
const ICON_O: Record<BoardSize, number> = { 3: 46, 4: 32, 5: 24 };

// ─── Game logic ───────────────────────────────────────────────────────────────

function getWins(n: number): number[][] {
  const wins: number[][] = [];
  for (let r = 0; r < n; r++) wins.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++) wins.push(Array.from({ length: n }, (_, r) => r * n + c));
  wins.push(Array.from({ length: n }, (_, i) => i * n + i));
  wins.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)));
  return wins;
}

function winnerOf(board: Mark[], wins: number[][]): { winner: 'X' | 'O' | 'draw' | null; line: number[] } {
  for (const line of wins) {
    const first = board[line[0]];
    if (first && line.every((i) => board[i] === first)) return { winner: first, line };
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return { winner: null, line: [] };
}

function findMoveN(board: Mark[], mark: 'X' | 'O', wins: number[][]): number {
  for (const line of wins) {
    const vals    = line.map((i) => board[i]);
    const marks   = vals.filter((v) => v === mark).length;
    const nullIdx = vals.indexOf(null);
    if (marks === line.length - 1 && nullIdx >= 0) return line[nullIdx];
  }
  return -1;
}

function botMove(board: Mark[], level: BotLevel, wins: number[][], n: number): number {
  const empty = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  if (!empty.length) return -1;
  if (level !== 'easy') {
    const win   = findMoveN(board, 'O', wins); if (win >= 0) return win;
    const block = findMoveN(board, 'X', wins); if (block >= 0) return block;
  }
  if (level === 'hard') {
    const center     = Math.floor((n * n) / 2);
    if (!board[center]) return center;
    const corners    = n === 3 ? [0, 2, 6, 8] : [0, n - 1, n * (n - 1), n * n - 1];
    const freeCorner = corners.find((c) => !board[c]);
    if (freeCorner !== undefined) return freeCorner;
  }
  return empty[Math.floor(Math.random() * empty.length)];
}

// ─── Cell ─────────────────────────────────────────────────────────────────────

function Cell({ value, onPress, active, disabled, boardSize }: {
  value: Mark; onPress: () => void; active: boolean; disabled?: boolean; boardSize: BoardSize;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const markScale  = useRef(new Animated.Value(0)).current;
  const winPulse   = useRef(new Animated.Value(1)).current;
  const winAnim    = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (value) Animated.spring(markScale, { toValue: 1, friction: 3, tension: 280, useNativeDriver: true }).start();
    else markScale.setValue(0);
  }, [value, markScale]);

  useEffect(() => {
    winAnim.current?.stop();
    if (active) {
      winAnim.current = Animated.loop(Animated.sequence([
        Animated.timing(winPulse, { toValue: 1.08, duration: 480, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(winPulse, { toValue: 0.97, duration: 480, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
      winAnim.current.start();
    } else winPulse.setValue(1);
    return () => { winAnim.current?.stop(); };
  }, [active, winPulse]);

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: winPulse }] }}>
      <Animated.View style={{ flex: 1, transform: [{ scale: pressScale }] }}>
        <Pressable
          style={[styles.cell, active && styles.cellWin]}
          onPressIn={() => { if (value || disabled) return; Animated.spring(pressScale, { toValue: 0.88, friction: 6, tension: 220, useNativeDriver: true }).start(); }}
          onPressOut={() => Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }).start()}
          onPress={onPress}
          disabled={disabled}
        >
          <Animated.View style={{ transform: [{ scale: markScale }] }}>
            {value === 'X' && <Ionicons name="close-sharp"     size={ICON_X[boardSize]} color={active ? '#FF3D00' : '#FF7A00'} />}
            {value === 'O' && <Ionicons name="ellipse-outline" size={ICON_O[boardSize]} color={active ? '#00C853' : '#4CC38A'} />}
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ─── BotThinking ──────────────────────────────────────────────────────────────

function BotThinking() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.3, duration: 520, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 520, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [pulse]);
  return (
    <Animated.View style={[styles.turnPillBox, { opacity: pulse, borderColor: '#4CC38A88', backgroundColor: 'rgba(76,195,138,0.10)' }]}>
      <Ionicons name="hardware-chip-outline" size={16} color="#4CC38A" />
      <Text style={[styles.turnPillText, { color: '#4CC38A' }]}>BOT{'\n'}THINKING</Text>
    </Animated.View>
  );
}

// ─── ResultOverlay ────────────────────────────────────────────────────────────

function ResultOverlay({ winner, mode, onPlayAgain }: { winner: 'X' | 'O' | 'draw'; mode: Mode; onPlayAgain: () => void }) {
  const scale   = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 130, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  const isDraw = winner === 'draw';
  const botWon = winner === 'O' && mode === 'bot';
  const color  = isDraw ? '#FFD23F' : winner === 'X' ? '#FF7A00' : '#4CC38A';
  const title  = isDraw ? 'DRAW!'   : botWon ? 'BOT WINS!'  : `${winner} WINS!`;
  const sub    = isDraw ? 'Well played!' : botWon ? 'Better luck next time!' : 'Excellent play!';

  return (
    <Animated.View style={[styles.overlayBg, { opacity }]}>
      <Animated.View style={[styles.overlayCard, { borderColor: color + '44', transform: [{ scale }] }]}>
        <View style={[styles.overlayBubble, { backgroundColor: color + '18', borderColor: color + '45' }]}>
          {isDraw          ? <Ionicons name="remove"          size={60} color={color} />
          : winner === 'X' ? <Ionicons name="close-sharp"     size={62} color={color} />
          :                  <Ionicons name="ellipse-outline" size={54} color={color} />}
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Xox() {
  const { state }         = useAppState();
  const { width, height } = useWindowDimensions();
  const { C, scheme }     = useAppTheme();
  const isDark            = scheme === 'dark';

  const [mode,       setMode]       = useState<Mode>('bot');
  const [botLevel,   setBotLevel]   = useState<BotLevel>('medium');
  const [boardSize,  setBoardSize]  = useState<BoardSize>(3);
  const [board,      setBoard]      = useState<Mark[]>(Array(9).fill(null));
  const [turn,       setTurn]       = useState<'X' | 'O'>('X');
  const [scores,     setScores]     = useState({ x: 0, o: 0, draw: 0 });
  const [boardWrapH, setBoardWrapH] = useState(0);

  const compact   = height < 760 || width < 390;
  const tinyPhone = height < 640 || width < 360;

  const wins   = useMemo(() => getWins(boardSize), [boardSize]);
  const result = useMemo(() => winnerOf(board, wins), [board, wins]);

  const maxBoard       = tinyPhone ? 280 : compact ? 314 : 348;
  const OUTER_BOARD_PX = boardWrapH > 40 ? Math.max(220, Math.min(width - 28, boardWrapH - 14, maxBoard)) : 0;
  const INNER_BOARD_PX = OUTER_BOARD_PX > 0 ? OUTER_BOARD_PX - (tinyPhone ? 8 : compact ? 10 : 14) : 0;

  const reset = () => { setBoard(Array(boardSize * boardSize).fill(null)); setTurn('X'); };

  useEffect(() => { setBoard(Array(boardSize * boardSize).fill(null)); setTurn('X'); }, [boardSize]);

  useEffect(() => {
    if (!result.winner) return;
    if      (result.winner === 'X') { setScores((s) => ({ ...s, x:    s.x    + 1 })); playXoxWin(state.settings.sound).catch(() => {}); }
    else if (result.winner === 'O') { setScores((s) => ({ ...s, o:    s.o    + 1 })); (mode === 'bot' ? playLoseSound : playXoxWin)(state.settings.sound).catch(() => {}); }
    else                            { setScores((s) => ({ ...s, draw: s.draw + 1 })); playDrawSound(state.settings.sound).catch(() => {}); }
  }, [result.winner, mode, state.settings.sound]);

  useEffect(() => {
    if (mode !== 'bot' || turn !== 'O' || result.winner) return;
    const t = setTimeout(() => {
      setBoard((prev) => {
        const move = botMove(prev, botLevel, wins, boardSize);
        if (move < 0) return prev;
        const next = [...prev]; next[move] = 'O'; return next;
      });
      setTurn('X');
      playXoxMove(state.settings.sound).catch(() => {});
    }, 520);
    return () => clearTimeout(t);
  }, [mode, turn, result.winner, botLevel, wins, boardSize, state.settings.sound]);

  const tapCell = (index: number) => {
    if (board[index] || result.winner) return;
    if (mode === 'bot' && turn === 'O') return;
    const next = [...board]; next[index] = turn;
    setBoard(next); setTurn(turn === 'X' ? 'O' : 'X');
    playXoxMove(state.settings.sound).catch(() => {});
  };

  const isBotThinking = mode === 'bot' && turn === 'O' && !result.winner;
  const diffIdx       = DIFF_LEVELS.indexOf(botLevel);
  const turnColor     = turn === 'X' ? '#FF7A00' : '#4CC38A';
  const turnIcon: keyof typeof Ionicons.glyphMap = turn === 'X' ? 'close-sharp' : 'ellipse-outline';
  const turnLabel     = turn === 'X'
    ? (mode === 'bot' ? 'YOUR\nTURN' : "X'S\nTURN")
    : (mode === 'bot' ? "BOT'S\nTURN" : "O'S\nTURN");

  const chipBg     = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const chipBorder = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.18)';

  return (
    <ScreenShell title="XO Arena" subtitle="Bot · Local · Online">
      <View style={[styles.screen, { backgroundColor: C.bg }]}>

        {/* ── Mode pill ─────────────────────────────────── */}
        <View style={[styles.modePill, { backgroundColor: isDark ? '#2A2520' : C.surface, borderColor: C.divider }]}>
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <AnimatedPressable
                key={m.id}
                style={[styles.modeBtn, active && styles.modeBtnActive]}
                onPress={() => {
                  if (m.id === 'online') { router.push('/xox-battle'); return; }
                  setMode(m.id); reset();
                }}
              >
                <Ionicons name={m.icon} size={14} color={active ? '#fff' : C.muted} />
                <Text style={[styles.modeBtnText, { color: active ? '#fff' : C.muted }]} numberOfLines={1}>
                  {m.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* ── SIZE + DIFFICULTY ──────────────────────────── */}
        <View style={styles.settingsRow}>

          {/* Board size */}
          <View style={styles.settingsHalf}>
            <Text style={[styles.sectionLabel, { color: C.muted }]}>SIZE</Text>
            <View style={styles.sizeChips}>
              {BOARD_SIZES.map((b) => {
                const active = boardSize === b.size;
                return (
                  <Pressable
                    key={b.size}
                    style={[
                      styles.sizeChip,
                      { backgroundColor: chipBg, borderColor: chipBorder },
                      active && { backgroundColor: 'rgba(255,122,0,0.15)', borderColor: '#FF7A00', borderWidth: 2 },
                    ]}
                    onPress={() => setBoardSize(b.size)}
                  >
                    <Text style={[styles.sizeChipText, { color: active ? '#FF7A00' : C.ink }]}>
                      {b.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Difficulty / Play mode */}
          <View style={styles.settingsHalf}>
            {mode === 'bot' ? (
              <>
                <Text style={[styles.sectionLabel, { color: C.muted }]}>BOT LEVEL</Text>
                <View style={[styles.diffTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.12)' }]}>
                  <View style={[
                    styles.diffFill,
                    {
                      backgroundColor: DIFF_META[botLevel].color,
                      width: diffIdx === 0 ? '2%' : diffIdx === 1 ? '50%' : '100%',
                    },
                  ]} />
                </View>
                <View style={styles.diffLabels}>
                  {DIFF_LEVELS.map((lvl) => (
                    <Pressable key={lvl} hitSlop={10} onPress={() => { setBotLevel(lvl); reset(); }}>
                      <Text style={[
                        styles.diffLabelText,
                        { color: botLevel === lvl ? DIFF_META[lvl].color : C.muted },
                        botLevel === lvl && { fontWeight: '900' },
                      ]}>
                        {DIFF_META[lvl].short}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.sectionLabel, { color: C.muted }]}>PLAY MODE</Text>
                <View style={[styles.passPlayBadge, { backgroundColor: 'rgba(141,231,255,0.12)', borderColor: 'rgba(141,231,255,0.30)' }]}>
                  <Ionicons name="people-outline" size={12} color="#8DE7FF" />
                  <Text style={styles.passPlayText}>Pass & Play</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Score + Turn + Restart ─────────────────────── */}
        <View style={styles.statusRow}>
          <View style={[styles.scoreBox, { borderColor: '#FF7A00', backgroundColor: 'rgba(255,122,0,0.12)' }]}>
            <Text style={[styles.scoreLabel, { color: C.muted }]}>{mode === 'bot' ? 'YOU' : 'X'}</Text>
            <Text style={[styles.scoreNum, { color: C.ink }]}>{scores.x}</Text>
          </View>

          <View style={[styles.drawBox, { borderColor: chipBorder, backgroundColor: chipBg }]}>
            <Text style={[styles.drawLabel, { color: C.muted }]}>D</Text>
            <Text style={[styles.drawNum, { color: C.ink }]}>{scores.draw}</Text>
          </View>

          <View style={[styles.scoreBox, { borderColor: '#4CC38A', backgroundColor: 'rgba(76,195,138,0.12)' }]}>
            <Text style={[styles.scoreLabel, { color: C.muted }]}>{mode === 'bot' ? 'BOT' : 'O'}</Text>
            <Text style={[styles.scoreNum, { color: C.ink }]}>{scores.o}</Text>
          </View>

          <View style={styles.turnSlot}>
            {!result.winner && (
              isBotThinking ? <BotThinking /> : (
                <View style={[
                  styles.turnPillBox,
                  {
                    borderColor:     turnColor + '88',
                    backgroundColor: isDark
                      ? (turnColor === '#FF7A00' ? 'rgba(255,122,0,0.12)' : 'rgba(76,195,138,0.10)')
                      : (turnColor === '#FF7A00' ? 'rgba(255,122,0,0.08)' : 'rgba(76,195,138,0.07)'),
                  },
                ]}>
                  <Ionicons name={turnIcon} size={18} color={turnColor} />
                  <Text style={[styles.turnPillText, { color: turnColor }]}>{turnLabel}</Text>
                </View>
              )
            )}
          </View>

          <AnimatedPressable style={[styles.restartBtn, { borderColor: chipBorder, backgroundColor: chipBg }]} onPress={reset}>
            <Ionicons name="refresh" size={18} color={C.muted} />
          </AnimatedPressable>
        </View>

        {/* ── Board ─────────────────────────────────────── */}
        <View
          style={styles.boardWrap}
          onLayout={(e) => setBoardWrapH(e.nativeEvent.layout.height)}
        >
          {OUTER_BOARD_PX > 0 && INNER_BOARD_PX > 0 && (
            <View style={[styles.boardOuter, {
              width:           OUTER_BOARD_PX,
              height:          OUTER_BOARD_PX,
              padding:         tinyPhone ? 4 : compact ? 5 : 7,
              backgroundColor: isDark ? '#0E1525' : '#D8DFEE',
              borderColor:     isDark ? 'rgba(141,231,255,0.14)' : 'rgba(80,120,200,0.22)',
            }]}>
              <View style={[styles.board, {
                width:           INNER_BOARD_PX,
                height:          INNER_BOARD_PX,
                padding:         boardSize === 5 ? 5 : compact ? 6 : 8,
                gap:             boardSize === 5 ? 5 : 7,
                backgroundColor: isDark ? '#101728' : '#C8D2E8',
                borderColor:     isDark ? 'rgba(141,231,255,0.16)' : 'rgba(80,120,200,0.28)',
              }]}>
                {Array.from({ length: boardSize }, (_, row) => (
                  <View key={row} style={[styles.boardRow, { gap: boardSize === 5 ? 5 : 7 }]}>
                    {Array.from({ length: boardSize }, (_, col) => {
                      const idx = row * boardSize + col;
                      return (
                        <Cell
                          key={idx}
                          value={board[idx]}
                          active={result.line.includes(idx)}
                          onPress={() => tapCell(idx)}
                          disabled={!!result.winner || isBotThinking}
                          boardSize={boardSize}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {result.winner && <ResultOverlay winner={result.winner} mode={mode} onPlayAgain={reset} />}
      </View>
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 92,
    gap: 10,
  },

  // ── Mode pill
  modePill: {
    height: 54,
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    height: 56,
    width: 100,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  modeBtnActive: {
    backgroundColor: '#FF7A00',
    shadowColor: '#FF7A00',
    shadowOpacity: 0.40,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modeBtnText: { fontWeight: '900', fontSize: 11, letterSpacing: 0.2 },

  // ── Settings row
  settingsRow:  { flexDirection: 'row', gap: 14 },
  settingsHalf: { flex: 1, gap: 7 },
  sectionLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },

  // Size chips
  sizeChips: { flexDirection: 'row', gap: 5 },
  sizeChip: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  sizeChipText: { fontSize: 13, fontWeight: '900' },

  // Difficulty slider
  diffTrack: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
  },
  diffFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    borderRadius: 99,
  },
  diffLabels:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1 },
  diffLabelText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  // Pass & play
  passPlayBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  passPlayText: { color: '#8DE7FF', fontWeight: '900', fontSize: 10 },

  // ── Status row
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  scoreBox: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  scoreLabel: { fontSize: 8,  fontWeight: '900', letterSpacing: 0.4 },
  scoreNum:   { fontSize: 20, fontWeight: '900', lineHeight: 24 },

  drawBox: {
    width: 32, height: 50, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  drawLabel: { fontSize: 7,  fontWeight: '900' },
  drawNum:   { fontSize: 15, fontWeight: '900' },

  turnSlot: { flex: 1 },
  turnPillBox: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 10,
  },
  turnPillText: { fontSize: 13, fontWeight: '900', lineHeight: 16 },

  restartBtn: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },

  // ── Board
  boardWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  boardOuter: {
    borderRadius: 30, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  board: { alignSelf: 'center', borderRadius: 24, borderWidth: 1.5 },
  boardRow: { flex: 1, flexDirection: 'row' },
  cell: {
    flex: 1, borderRadius: 15,
    backgroundColor: '#F8FAFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.20, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.68)',
  },
  cellWin: { backgroundColor: '#D8FFE8', borderWidth: 2, borderColor: '#4CC38A' },

  // ── Result overlay
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,8,18,0.94)',
    alignItems: 'center', justifyContent: 'center', zIndex: 100, paddingHorizontal: 18,
  },
  overlayCard: {
    width: '100%', maxWidth: 360, backgroundColor: '#12182A',
    borderRadius: 36, padding: 28, alignItems: 'center', gap: 10, borderWidth: 1.5,
    shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 24,
  },
  overlayBubble: {
    width: 100, height: 100, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 4,
  },
  overlayTitle:   { fontWeight: '900', fontSize: 34, letterSpacing: -0.5, textAlign: 'center' },
  overlaySub:     { color: 'rgba(255,255,255,0.56)', fontWeight: '700', fontSize: 13, marginBottom: 4, textAlign: 'center' },
  overlayBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 999, marginTop: 4 },
  overlayBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
