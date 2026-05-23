import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { STRIPE_COLORS } from '../constants/categories';
import { buildPuzzle } from '../lib/puzzle';
import { playGameSound } from '../lib/audio';

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

  const dragStartRef = useRef<Point | null>(null);
  const dragEndRef = useRef<Point | null>(null);

  const foundRef = useRef<FoundEntry[]>(found);
  const onFoundRef = useRef(onFound);

  useEffect(() => {
    // Include opponent-found words too, because live battle uses one shared board.
    // This prevents both players from scoring the same word twice.
    foundRef.current = [...found, ...opponentFound];
  }, [found, opponentFound]);

  useEffect(() => {
    onFoundRef.current = onFound;
  }, [onFound]);

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
    const start = dragStartRef.current;
    const end = dragEndRef.current;

    if (!start || !end) {
      setDragStart(null);
      setDragEnd(null);
      dragStartRef.current = null;
      dragEndRef.current = null;
      return;
    }

    const fixed = normalizeLine(start, end);

    const sameExactPoint = (a: Point, b: Point) => {
      return a[0] === b[0] && a[1] === b[1];
    };

    const selectedWord = lettersBetween(fixed.start, fixed.end);
    const reversedWord = selectedWord.split('').reverse().join('');

    /*
      This checks the actual puzzle placements first.
      It means the player can find ANY word in ANY order.
      Example: if the list has 5 words, the user can match word 3 first,
      then word 1, then word 5. It does not force sequential matching.
    */
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

        onFoundRef.current({
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
        });
      }
    } else if (selectedWord.length > 1) {
      playGameSound('wrong', soundEnabled).catch(() => {});
    }

    setDragStart(null);
    setDragEnd(null);
    dragStartRef.current = null;
    dragEndRef.current = null;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const point = pointFromTouch(locationX, locationY);

        dragStartRef.current = point;
        dragEndRef.current = point;

        setDragStart(point);
        setDragEnd(point);
        playGameSound('tap', soundEnabled).catch(() => {});
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const point = pointFromTouch(locationX, locationY);

        dragEndRef.current = point;
        setDragEnd((prev) => (samePoint(prev, point) ? prev : point));
      },
      onPanResponderRelease: finishSelection,
      onPanResponderTerminate: finishSelection,
    })
  ).current;

  const linePoints = dragStart && dragEnd ? getLinePoints(dragStart, dragEnd) : [];

  const isSelected = (row: number, col: number) => {
    const isInActiveDrag = linePoints.some((p) => p[0] === row && p[1] === col);
    const isInFound = [...found, ...opponentFound].some((entry) =>
      getLinePoints(entry.start, entry.end).some((p) => p[0] === row && p[1] === col)
    );

    return isInActiveDrag || isInFound;
  };

  const isHint = (row: number, col: number) => {
    return !!hintCell && hintCell[0] === row && hintCell[1] === col;
  };

  const centerOf = (point: Point) => ({
    x: point[1] * cell + cell / 2,
    y: point[0] * cell + cell / 2,
  });

  return (
    <View
      style={[styles.grid, { width, height: width }]}
      {...panResponder.panHandlers}
    >
      <Svg pointerEvents="none" width={width} height={width} style={StyleSheet.absoluteFill}>
        {opponentFound.map((entry) => {
          const start = centerOf(entry.start);
          const end = centerOf(entry.end);
          return (
            <Line
              key={`opp-${entry.word}-${entry.start.join('-')}-${entry.end.join('-')}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#FF4D8D"
              strokeWidth={Math.max(8, cell * 0.56)}
              strokeLinecap="round"
              opacity={0.34}
            />
          );
        })}
        {found.map((entry) => {
          const start = centerOf(entry.start);
          const end = centerOf(entry.end);
          return (
            <Line
              key={`${entry.word}-${entry.start.join('-')}-${entry.end.join('-')}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={entry.color}
              strokeWidth={Math.max(10, cell * 0.68)}
              strokeLinecap="round"
              opacity={0.68}
            />
          );
        })}
        {dragStart && dragEnd ? (() => {
          const fixed = normalizeLine(dragStart, dragEnd);
          const start = centerOf(fixed.start);
          const end = centerOf(fixed.end);
          return (
            <Line
              key="active-selection"
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
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
    backgroundColor: 'rgba(253,187,45,0.22)',
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
