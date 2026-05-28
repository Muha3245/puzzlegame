import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { STRIPE_COLORS } from '../constants/categories';
import { buildPuzzle } from '../lib/puzzle';
import { playGameSound, playLetterSelect, playWordDrag } from '../lib/audio';

export type Point = [number, number];

export type FoundEntry = {
  word: string;
  start: Point;
  end: Point;
  color: string;
};

type WordGridProps = {
  words: string[];
  seed: string;
  found: FoundEntry[];
  opponentFound?: FoundEntry[];
  hintCell?: Point | null;
  onFound: (entry: FoundEntry) => void;
  width: number;
  size?: number;
  soundEnabled?: boolean;
};

type PendingLine = {
  entry: FoundEntry;
  progress: Animated.Value;
};

const AnimatedLine = Animated.createAnimatedComponent(Line);
const LINE_DRAW_DURATION = 360;

export function WordGrid({
  words,
  seed,
  found,
  opponentFound = [],
  hintCell,
  onFound,
  width,
  size = 10,
  soundEnabled = true,
}: WordGridProps) {
  const safeWords = useMemo(
    () => words.map((word) => word.toUpperCase().trim()),
    [words]
  );

  const puzzle = useMemo(
    () => buildPuzzle(safeWords, size, seed),
    [safeWords, size, seed]
  );

  const cell = width / size;

  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragEnd, setDragEnd] = useState<Point | null>(null);
  const [pendingLine, setPendingLine] = useState<PendingLine | null>(null);

  const dragStartRef = useRef<Point | null>(null);
  const dragEndRef = useRef<Point | null>(null);
  const foundRef = useRef<FoundEntry[]>(found);
  const onFoundRef = useRef(onFound);
  const animatingRef = useRef(false);

  useEffect(() => {
    foundRef.current = [...found, ...opponentFound];
  }, [found, opponentFound]);

  useEffect(() => {
    onFoundRef.current = onFound;
  }, [onFound]);

  const resetDrag = () => {
    setDragStart(null);
    setDragEnd(null);
    dragStartRef.current = null;
    dragEndRef.current = null;
  };

  const animateMatchedLine = (entry: FoundEntry, afterAnimation: () => void) => {
    const progress = new Animated.Value(0);

    animatingRef.current = true;
    setPendingLine({ entry, progress });

    Animated.timing(progress, {
      toValue: 1,
      duration: LINE_DRAW_DURATION,
      useNativeDriver: false,
    }).start(() => {
      afterAnimation();

      setTimeout(() => {
        setPendingLine(null);
        animatingRef.current = false;
      }, 40);
    });
  };

  const clamp = (num: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, num));
  };

  const pointFromTouch = (x: number, y: number): Point => {
    const safeX = clamp(x, 0, width - 1);
    const safeY = clamp(y, 0, width - 1);

    const col = clamp(Math.floor(safeX / cell), 0, size - 1);
    const row = clamp(Math.floor(safeY / cell), 0, size - 1);

    return [row, col];
  };

  const samePoint = (a: Point | null, b: Point | null) => {
    if (!a || !b) return false;
    return a[0] === b[0] && a[1] === b[1];
  };

  const normalizeLine = (start: Point, end: Point) => {
    const rowDiff = end[0] - start[0];
    const colDiff = end[1] - start[1];

    const absRow = Math.abs(rowDiff);
    const absCol = Math.abs(colDiff);

    if (absRow === 0 && absCol === 0) {
      return { start, end };
    }

    if (absCol >= absRow * 2) {
      return {
        start,
        end: [start[0], end[1]] as Point,
      };
    }

    if (absRow >= absCol * 2) {
      return {
        start,
        end: [end[0], start[1]] as Point,
      };
    }

    const steps = Math.min(absRow, absCol);
    const rowDir = rowDiff > 0 ? 1 : -1;
    const colDir = colDiff > 0 ? 1 : -1;

    return {
      start,
      end: [
        start[0] + steps * rowDir,
        start[1] + steps * colDir,
      ] as Point,
    };
  };

  const getLinePoints = (start: Point, end: Point) => {
    const fixed = normalizeLine(start, end);

    const rowDiff = fixed.end[0] - fixed.start[0];
    const colDiff = fixed.end[1] - fixed.start[1];

    const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));

    const rowStep = rowDiff === 0 ? 0 : rowDiff > 0 ? 1 : -1;
    const colStep = colDiff === 0 ? 0 : colDiff > 0 ? 1 : -1;

    const points: Point[] = [];

    for (let i = 0; i <= steps; i++) {
      const row = fixed.start[0] + rowStep * i;
      const col = fixed.start[1] + colStep * i;

      if (row < 0 || row >= size || col < 0 || col >= size) {
        return [];
      }

      points.push([row, col]);
    }

    return points;
  };

  const lettersBetween = (start: Point, end: Point) => {
    const points = getLinePoints(start, end);

    return points
      .map(([row, col]) => puzzle.grid[row][col])
      .join('')
      .toUpperCase()
      .trim();
  };

  const finishSelection = () => {
    if (animatingRef.current) return;

    const start = dragStartRef.current;
    const end = dragEndRef.current;

    if (!start || !end) {
      resetDrag();
      return;
    }

    const fixed = normalizeLine(start, end);

    const sameExactPoint = (a: Point, b: Point) => {
      return a[0] === b[0] && a[1] === b[1];
    };

    const selectedWord = lettersBetween(fixed.start, fixed.end);
    const reversedWord = selectedWord.split('').reverse().join('');

    const placementMatch = puzzle.placements.find((placement) => {
      const sameDirection =
        sameExactPoint(placement.start, fixed.start) &&
        sameExactPoint(placement.end, fixed.end);

      const reverseDirection =
        sameExactPoint(placement.start, fixed.end) &&
        sameExactPoint(placement.end, fixed.start);

      return sameDirection || reverseDirection;
    });

    const directMatch = safeWords.find((word) => word === selectedWord);
    const reverseMatch = safeWords.find((word) => word === reversedWord);

    const matchedWord =
      placementMatch?.word?.toUpperCase().trim() || directMatch || reverseMatch;

    if (matchedWord) {
      const alreadyFound = foundRef.current.some(
        (entry) => entry.word.toUpperCase().trim() === matchedWord
      );

      if (!alreadyFound) {
        const color =
          STRIPE_COLORS[foundRef.current.length % STRIPE_COLORS.length];

        const reverseMatchFromPlacement =
          !!placementMatch &&
          sameExactPoint(placementMatch.start, fixed.end) &&
          sameExactPoint(placementMatch.end, fixed.start);

        const finalEntry: FoundEntry = {
          word: matchedWord,
          start:
            reverseMatch || reverseMatchFromPlacement
              ? fixed.end
              : fixed.start,
          end:
            reverseMatch || reverseMatchFromPlacement
              ? fixed.start
              : fixed.end,
          color,
        };

        resetDrag();
        playGameSound('wordFound', soundEnabled).catch(() => {});

        animateMatchedLine(finalEntry, () => {
          onFoundRef.current(finalEntry);
        });

        return;
      }
    } else if (selectedWord.length > 1) {
      playGameSound('wrong', soundEnabled).catch(() => {});
    }

    resetDrag();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !animatingRef.current,
      onStartShouldSetPanResponderCapture: () => !animatingRef.current,
      onMoveShouldSetPanResponder: () => !animatingRef.current,
      onMoveShouldSetPanResponderCapture: () => !animatingRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        if (animatingRef.current) return;

        const { locationX, locationY } = evt.nativeEvent;
        const point = pointFromTouch(locationX, locationY);

        dragStartRef.current = point;
        dragEndRef.current = point;

        setDragStart(point);
        setDragEnd(point);
        playLetterSelect(soundEnabled).catch(() => {});
      },
      onPanResponderMove: (evt) => {
        if (animatingRef.current) return;

        const { locationX, locationY } = evt.nativeEvent;
        const point = pointFromTouch(locationX, locationY);

        dragEndRef.current = point;
        setDragEnd((prev) => {
          if (samePoint(prev, point)) return prev;
          playWordDrag(soundEnabled).catch(() => {});
          return point;
        });
      },
      onPanResponderRelease: finishSelection,
      onPanResponderTerminate: finishSelection,
    })
  ).current;

  const linePoints = dragStart && dragEnd ? getLinePoints(dragStart, dragEnd) : [];

  const isSelected = (row: number, col: number) => {
    return linePoints.some((p) => p[0] === row && p[1] === col);
  };

  const isHint = (row: number, col: number) => {
    return !!hintCell && hintCell[0] === row && hintCell[1] === col;
  };

  const centerOf = (point: Point) => ({
    x: point[1] * cell + cell / 2,
    y: point[0] * cell + cell / 2,
  });

  const renderStaticLine = (entry: FoundEntry, options?: { opponent?: boolean }) => {
    const startPoint = centerOf(entry.start);
    const endPoint = centerOf(entry.end);

    return (
      <Line
        key={`${options?.opponent ? 'opp-' : ''}${entry.word}-${entry.start.join('-')}-${entry.end.join('-')}`}
        x1={startPoint.x}
        y1={startPoint.y}
        x2={endPoint.x}
        y2={endPoint.y}
        stroke={options?.opponent ? '#FF4D8D' : entry.color}
        strokeWidth={options?.opponent ? Math.max(8, cell * 0.56) : Math.max(10, cell * 0.68)}
        strokeLinecap="round"
        opacity={options?.opponent ? 0.34 : 0.68}
      />
    );
  };

  const renderPendingLine = () => {
    if (!pendingLine) return null;

    const startPoint = centerOf(pendingLine.entry.start);
    const endPoint = centerOf(pendingLine.entry.end);

    const x2 = pendingLine.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [startPoint.x, endPoint.x],
    });
    const y2 = pendingLine.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [startPoint.y, endPoint.y],
    });
    const opacity = pendingLine.progress.interpolate({
      inputRange: [0, 0.18, 1],
      outputRange: [0.1, 0.82, 0.74],
    });

    return (
      <AnimatedLine
        key={`pending-${pendingLine.entry.word}`}
        x1={startPoint.x}
        y1={startPoint.y}
        x2={x2 as any}
        y2={y2 as any}
        stroke={pendingLine.entry.color}
        strokeWidth={Math.max(12, cell * 0.74)}
        strokeLinecap="round"
        opacity={opacity as any}
      />
    );
  };

  return (
    <View
      style={[styles.grid, { width, height: width }]}
      {...panResponder.panHandlers}
    >
      <Svg pointerEvents="none" width={width} height={width} style={StyleSheet.absoluteFill}>
        {opponentFound.map((entry) => renderStaticLine(entry, { opponent: true }))}

        {found.map((entry) => renderStaticLine(entry))}

        {renderPendingLine()}

        {dragStart && dragEnd ? (() => {
          const fixed = normalizeLine(dragStart, dragEnd);
          const startPoint = centerOf(fixed.start);
          const endPoint = centerOf(fixed.end);

          return (
            <Line
              key="active-selection"
              x1={startPoint.x}
              y1={startPoint.y}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="#FFD23F"
              strokeWidth={Math.max(10, cell * 0.66)}
              strokeLinecap="round"
              opacity={0.78}
            />
          );
        })() : null}
      </Svg>

      {puzzle.grid.map((rowLetters, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {rowLetters.map((letter, colIndex) => {
            const selected = isSelected(rowIndex, colIndex);
            const hint = isHint(rowIndex, colIndex);

            return (
              <View
                key={`${rowIndex}-${colIndex}`}
                pointerEvents="none"
                style={[
                  styles.cell,
                  { width: cell, height: cell },
                  selected && styles.cellSelected,
                  hint && styles.cellHint,
                ]}
              >
                <Text
                  style={[
                    styles.letter,
                    { fontSize: Math.max(12, cell * 0.42) },
                    selected && styles.letterSelected,
                    hint && styles.letterHint,
                  ]}
                >
                  {letter}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderRadius: 22,
  },

  row: {
    flexDirection: 'row',
  },

  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  cellSelected: {
    backgroundColor: 'rgba(253,187,45,0.16)',
    borderRadius: 12,
  },

  cellHint: {
    backgroundColor: 'rgba(255,77,141,0.22)',
    borderRadius: 12,
  },

  letter: {
    color: '#2A1666',
    fontWeight: '900',
  },

  letterSelected: {
    color: '#5B3500',
  },

  letterHint: {
    color: '#FF4D8D',
  },
});
