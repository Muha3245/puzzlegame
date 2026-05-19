// lib/puzzle.ts
// Deterministic seeded word-search puzzle generator.

export type Placement = {
  word: string;
  start: [number, number];
  end: [number, number];
  dir: [number, number];
};

export type Puzzle = {
  grid: string[][];
  placements: Placement[];
  size: number;
};

const DIRS: [number, number][] = [
  [ 1, 0], [ 0, 1], [ 1, 1], [-1, 1],
  [-1, 0], [ 0,-1], [-1,-1], [ 1,-1],
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function buildPuzzle(words: string[], size = 10, seedStr = 'seed'): Puzzle {
  const rng = mulberry32(strHash(seedStr));
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const placements: Placement[] = [];
  const ordered = [...words].sort((a, b) => b.length - a.length);

  for (const word of ordered) {
    let placed = false;
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const dir = DIRS[Math.floor(rng() * DIRS.length)];
      const r = Math.floor(rng() * size);
      const c = Math.floor(rng() * size);
      const endR = r + dir[0] * (word.length - 1);
      const endC = c + dir[1] * (word.length - 1);
      if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const cur = grid[r + dir[0] * i][c + dir[1] * i];
        if (cur !== null && cur !== word[i]) { ok = false; break; }
      }
      if (!ok) continue;
      for (let i = 0; i < word.length; i++) {
        grid[r + dir[0] * i][c + dir[1] * i] = word[i];
      }
      placements.push({ word, start: [r, c], end: [endR, endC], dir });
      placed = true;
    }
    if (!placed) {
      // fallback: first horizontal slot that fits
      for (let r = 0; r < size && !placed; r++) {
        for (let c = 0; c <= size - word.length && !placed; c++) {
          let ok = true;
          for (let i = 0; i < word.length; i++) {
            const cur = grid[r][c + i];
            if (cur !== null && cur !== word[i]) { ok = false; break; }
          }
          if (ok) {
            for (let i = 0; i < word.length; i++) grid[r][c + i] = word[i];
            placements.push({ word, start: [r, c], end: [r, c + word.length - 1], dir: [0, 1] });
            placed = true;
          }
        }
      }
    }
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) grid[r][c] = letters[Math.floor(rng() * 26)];
    }
  }

  return { grid: grid as string[][], placements, size };
}
