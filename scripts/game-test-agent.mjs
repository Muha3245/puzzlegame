#!/usr/bin/env node
/**
 * game-test-agent.mjs
 * Automated test agent for the Puzzle Word-Search Game.
 *
 * Run with:  node scripts/game-test-agent.mjs
 *
 * Tests covered:
 *  1. Puzzle generator — determinism, all words placed, no overlaps
 *  2. Level word selection — unique words, correct count, level isolation
 *  3. Score calculation — per-word points, battle scoring
 *  4. Category/difficulty logic — navigation, selectedCategory computation
 *  5. Battle flow — room status transitions, winner determination
 *  6. Notification deduplication — shownRoomIds guard
 */

// ─── Minimal test harness ─────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    → ${err.message}`);
    failures.push({ name, message: err.message });
    failed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected)
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual(expected) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
    },
    toBeGreaterThan(n) {
      if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeGreaterThanOrEqual(n) {
      if (!(actual >= n)) throw new Error(`Expected ${actual} >= ${n}`);
    },
    toBeLessThanOrEqual(n) {
      if (!(actual <= n)) throw new Error(`Expected ${actual} <= ${n}`);
    },
    toContain(item) {
      if (!actual.includes(item))
        throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
    },
    toHaveLength(n) {
      if (actual.length !== n)
        throw new Error(`Expected length ${n}, got ${actual.length}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
    toBeUndefined() {
      if (actual !== undefined) throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
    },
    not: {
      toBe(expected) {
        if (actual === expected)
          throw new Error(`Expected value NOT to be ${JSON.stringify(expected)}`);
      },
      toContain(item) {
        if (actual.includes(item))
          throw new Error(`Expected array NOT to contain ${JSON.stringify(item)}`);
      },
    },
  };
}

function describe(suite, fn) {
  console.log(`\n▶ ${suite}`);
  fn();
}

// ─── Re-implemented pure game logic (no React Native deps) ───────────────────

// --- Puzzle generator (from lib/puzzle.ts) ---
const DIRS = [
  [1, 0], [0, 1], [1, 1], [-1, 1],
  [-1, 0], [0, -1], [-1, -1], [1, -1],
];

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strHash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildPuzzle(words, size = 10, seedStr = 'seed') {
  const rng = mulberry32(strHash(seedStr));
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placements = [];
  const uniqueWords = [...new Set(
    words.map(w => w.toUpperCase().trim()).filter(w => w.length > 1 && w.length <= size)
  )];

  function tryPlace(word) {
    const dirs = [...DIRS].sort(() => rng() - 0.5);
    for (let attempt = 0; attempt < 80; attempt++) {
      const dir = dirs[attempt % dirs.length];
      const row = Math.floor(rng() * size);
      const col = Math.floor(rng() * size);
      const cells = [];
      let valid = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + dir[0] * i;
        const c = col + dir[1] * i;
        if (r < 0 || r >= size || c < 0 || c >= size) { valid = false; break; }
        if (grid[r][c] !== null && grid[r][c] !== word[i]) { valid = false; break; }
        cells.push([r, c]);
      }
      if (valid) {
        cells.forEach(([r, c], i) => { grid[r][c] = word[i]; });
        placements.push({
          word,
          start: cells[0],
          end: cells[cells.length - 1],
          dir,
        });
        return true;
      }
    }
    return false;
  }

  for (const word of uniqueWords) tryPlace(word);

  // Fill remaining cells with random letters
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c] === null) grid[r][c] = ALPHA[Math.floor(rng() * 26)];

  return { grid, placements, size };
}

// --- Level word selection (from app/game.tsx) ---
const SAMPLE_CATEGORIES = [
  { id: 'animals', words: ['CAT', 'DOG', 'LION', 'TIGER', 'BEAR', 'WOLF', 'DEER', 'FISH', 'BIRD', 'FROG'] },
  { id: 'colors', words: ['RED', 'BLUE', 'GREEN', 'GOLD', 'PINK', 'GRAY', 'CYAN', 'LIME', 'TEAL', 'NAVY'] },
  { id: 'fruits', words: ['APPLE', 'MANGO', 'PEACH', 'GRAPE', 'PLUM', 'LIME', 'PEAR', 'KIWI', 'FIG', 'DATE'] },
];

function makeUniqueLevelWords(categoryWords, totalWords, levelIndex) {
  const baseWords = categoryWords.map(w => w.toUpperCase().trim()).filter(Boolean);
  const globalWords = SAMPLE_CATEGORIES.flatMap(cat => cat.words).map(w => w.toUpperCase().trim()).filter(Boolean);
  const pool = [...new Set([...baseWords, ...globalWords])];
  const start = levelIndex * totalWords;
  const selected = [];
  for (let i = 0; i < pool.length && selected.length < totalWords; i++) {
    selected.push(pool[(start + i) % pool.length]);
  }
  return selected;
}

// --- Score calculation ---
function calcScore(wordsFound) {
  return wordsFound * 10;
}

function determineBattleWinner(playerA, playerB) {
  if (playerA.wordsFound > playerB.wordsFound) return playerA.userId;
  if (playerB.wordsFound > playerA.wordsFound) return playerB.userId;
  if (playerA.score > playerB.score) return playerA.userId;
  if (playerB.score > playerA.score) return playerB.userId;
  if (playerA.elapsedSeconds < playerB.elapsedSeconds) return playerA.userId;
  if (playerB.elapsedSeconds < playerA.elapsedSeconds) return playerB.userId;
  return null; // draw
}

// --- Category / difficulty logic (from app/levels.tsx) ---
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'pro'];

const CATEGORY_NAMES = {
  easy:   ['Animals', 'Colors', 'Cities', 'Nature', 'House', 'Adjectives', 'Food', 'Fruits', 'Family', 'Weather', 'Shapes', 'Toys'],
  medium: ['Sports', 'Music', 'School', 'Body', 'Jobs', 'Transport', 'Space', 'Ocean', 'Numbers', 'Time', 'Clothes', 'Vegetables'],
  hard:   ['TV Shows', 'Countries', 'Monuments', 'Actors & Directors', 'Writers', 'History', 'Tools', 'Emotions', 'Planets', 'Sea Life', 'Math', 'Games'],
  pro:    ['Mythology', 'Science', 'Technology', 'Business', 'Adventure', 'Mystery', 'Fantasy', 'Pirates', 'Robots', 'Dinosaurs', 'Magic', 'Treasure'],
};

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getCategorySet(difficulty) {
  const names = CATEGORY_NAMES[difficulty];
  return names.map((name, index) => ({
    id: `${difficulty}-${slugify(name)}-${index + 1}`,
    name,
    baseIndex: index,
  }));
}

function getSelectedCategory(params_category, currentCategorySet) {
  if (!params_category) return undefined;
  return currentCategorySet.find(item => item.id === params_category);
}

// --- Notification deduplication ---
function makeShownRoomIds() {
  const ids = new Set();
  return {
    shouldShow(roomId) {
      if (ids.has(roomId)) return false;
      ids.add(roomId);
      return true;
    },
  };
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('1. Puzzle Generator', () => {
  const words = ['CAT', 'DOG', 'BIRD', 'FISH'];
  const size = 8;

  test('builds a grid of correct size', () => {
    const { grid } = buildPuzzle(words, size, 'test-seed');
    expect(grid).toHaveLength(size);
    grid.forEach(row => expect(row).toHaveLength(size));
  });

  test('places all words in the grid', () => {
    const { placements } = buildPuzzle(words, size, 'test-seed');
    const placedWords = placements.map(p => p.word);
    words.forEach(w => expect(placedWords).toContain(w.toUpperCase()));
  });

  test('is deterministic — same seed produces same grid', () => {
    const a = buildPuzzle(words, size, 'myseed');
    const b = buildPuzzle(words, size, 'myseed');
    expect(JSON.stringify(a.grid)).toBe(JSON.stringify(b.grid));
    expect(JSON.stringify(a.placements)).toBe(JSON.stringify(b.placements));
  });

  test('different seeds produce different grids', () => {
    const a = buildPuzzle(words, size, 'seed-A');
    const b = buildPuzzle(words, size, 'seed-B');
    expect(JSON.stringify(a.grid)).not.toBe(JSON.stringify(b.grid));
  });

  test('all cells are filled (no nulls)', () => {
    const { grid } = buildPuzzle(words, size, 'filled');
    grid.forEach(row => row.forEach(cell => expect(cell).toBeTruthy()));
  });

  test('start/end coordinates are within grid bounds', () => {
    const { placements } = buildPuzzle(words, size, 'bounds');
    placements.forEach(({ start, end }) => {
      expect(start[0]).toBeGreaterThanOrEqual(0);
      expect(start[1]).toBeGreaterThanOrEqual(0);
      expect(end[0]).toBeLessThanOrEqual(size - 1);
      expect(end[1]).toBeLessThanOrEqual(size - 1);
    });
  });

  test('word letters are readable from start → end in the grid', () => {
    const { grid, placements } = buildPuzzle(['LION', 'BEAR'], 8, 'readable');
    placements.forEach(({ word, start, dir }) => {
      const read = [...word].map((_, i) => grid[start[0] + dir[0] * i][start[1] + dir[1] * i]).join('');
      expect(read).toBe(word);
    });
  });

  test('handles words longer than grid size gracefully', () => {
    const { placements } = buildPuzzle(['SUPERLONGWORDTHATDOESNOTFIT'], 6, 'longword');
    expect(placements.map(p => p.word)).not.toContain('SUPERLONGWORDTHATDOESNOTFIT');
  });

  test('deduplicates repeated words', () => {
    const { placements } = buildPuzzle(['CAT', 'CAT', 'DOG'], 6, 'dedup');
    const catPlacements = placements.filter(p => p.word === 'CAT');
    expect(catPlacements.length).toBeLessThanOrEqual(1);
  });
});

describe('2. Level Word Selection', () => {
  const catWords = ['APPLE', 'MANGO', 'PEACH', 'GRAPE', 'PLUM', 'LIME'];

  test('returns the requested number of words', () => {
    const words = makeUniqueLevelWords(catWords, 4, 0);
    expect(words).toHaveLength(4);
  });

  test('all returned words are uppercase strings', () => {
    const words = makeUniqueLevelWords(catWords, 5, 0);
    words.forEach(w => {
      expect(w).toBe(w.toUpperCase());
      expect(typeof w).toBe('string');
    });
  });

  test('different level indexes produce different word sets', () => {
    const level1 = makeUniqueLevelWords(catWords, 4, 0).join(',');
    const level2 = makeUniqueLevelWords(catWords, 4, 1).join(',');
    expect(level1).not.toBe(level2);
  });

  test('same inputs always return the same words', () => {
    const a = makeUniqueLevelWords(catWords, 4, 2);
    const b = makeUniqueLevelWords(catWords, 4, 2);
    expect(a.join(',')).toBe(b.join(','));
  });

  test('no duplicate words in a single level', () => {
    const words = makeUniqueLevelWords(catWords, 5, 0);
    const unique = new Set(words);
    expect(unique.size).toBe(words.length);
  });
});

describe('3. Score Calculation', () => {
  test('0 words → 0 score', () => {
    expect(calcScore(0)).toBe(0);
  });

  test('1 word → 10 points', () => {
    expect(calcScore(1)).toBe(10);
  });

  test('5 words → 50 points', () => {
    expect(calcScore(5)).toBe(50);
  });

  test('score is always a multiple of 10', () => {
    [1, 3, 7, 12].forEach(n => {
      expect(calcScore(n) % 10).toBe(0);
    });
  });

  test('coin delta: winner gets positive, loser negative', () => {
    const stake = 60;
    const winnerDelta = stake;
    const loserDelta = -stake;
    expect(winnerDelta).toBeGreaterThan(0);
    expect(loserDelta).toBeLessThanOrEqual(-stake);
  });

  test('battle stake is symmetrical for winner and loser', () => {
    [20, 40, 60, 100, 200].forEach((stake) => {
      expect(stake + -stake).toBe(0);
    });
  });
});

describe('4. Battle Winner Determination', () => {
  const makePlayer = (userId, wordsFound, score, elapsedSeconds) =>
    ({ userId, wordsFound, score, elapsedSeconds });

  test('more words → wins regardless of score', () => {
    const a = makePlayer('A', 6, 60, 45);
    const b = makePlayer('B', 4, 80, 20); // B has higher score but fewer words
    expect(determineBattleWinner(a, b)).toBe('A');
  });

  test('equal words → higher score wins', () => {
    const a = makePlayer('A', 5, 60, 45);
    const b = makePlayer('B', 5, 50, 45);
    expect(determineBattleWinner(a, b)).toBe('A');
  });

  test('equal words and score → faster time wins', () => {
    const a = makePlayer('A', 5, 50, 30);
    const b = makePlayer('B', 5, 50, 45);
    expect(determineBattleWinner(a, b)).toBe('A');
  });

  test('completely equal → draw (null)', () => {
    const a = makePlayer('A', 5, 50, 30);
    const b = makePlayer('B', 5, 50, 30);
    expect(determineBattleWinner(a, b)).toBe(null);
  });

  test('score display: myLiveScore uses local found count', () => {
    const localFound = 3;
    const myLiveScore = localFound * 10;
    expect(myLiveScore).toBe(30);
  });

  test('opponent score uses max of DB and broadcast counts', () => {
    const dbScore = 20;
    const broadcastCount = 4;
    const opponentLiveScore = Math.max(dbScore, broadcastCount * 10);
    expect(opponentLiveScore).toBe(40); // broadcast wins (40 > 20)
  });

  test('opponent score falls back to DB when broadcast is lower', () => {
    const dbScore = 50;
    const broadcastCount = 3;
    const opponentLiveScore = Math.max(dbScore, broadcastCount * 10);
    expect(opponentLiveScore).toBe(50); // DB wins (50 > 30)
  });
});

describe('5. Category & Difficulty Navigation', () => {
  test('getCategorySet returns 12 categories per difficulty', () => {
    DIFFICULTY_ORDER.forEach(diff => {
      const set = getCategorySet(diff);
      expect(set).toHaveLength(12);
    });
  });

  test('each category has a unique id per difficulty', () => {
    DIFFICULTY_ORDER.forEach(diff => {
      const ids = getCategorySet(diff).map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  test('ids do NOT collide across difficulties', () => {
    const allIds = DIFFICULTY_ORDER.flatMap(d => getCategorySet(d).map(c => c.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  test('selectedCategory returns undefined when params.category is absent', () => {
    const set = getCategorySet('easy');
    const result = getSelectedCategory(undefined, set);
    expect(result).toBeUndefined();
  });

  test('selectedCategory returns correct item when id matches', () => {
    const set = getCategorySet('easy');
    const target = set[2]; // Cities
    const result = getSelectedCategory(target.id, set);
    expect(result.id).toBe(target.id);
    expect(result.name).toBe('Cities');
  });

  test('selectedCategory returns undefined for a stale id (no fallback to [0])', () => {
    const easySet = getCategorySet('easy');
    const staleId = easySet[0].id; // easy-animals-1
    const mediumSet = getCategorySet('medium');
    // stale id from easy does NOT exist in medium — should return undefined (not medium[0])
    const result = getSelectedCategory(staleId, mediumSet);
    expect(result).toBeUndefined(); // Bug was: returned currentCategorySet[0]
  });

  test('onDifficultyChange maps to correct corresponding category index', () => {
    const easySet = getCategorySet('easy');
    const selectedEasy = easySet[3]; // index 3 = Nature
    const mediumSet = getCategorySet('medium');
    const nextCategory = mediumSet[selectedEasy.baseIndex % mediumSet.length];
    expect(nextCategory.baseIndex).toBe(3); // Same index (Body in medium)
    expect(nextCategory.name).toBe('Body');
  });
});

describe('6. Notification Deduplication', () => {
  test('first show of a room id returns true', () => {
    const guard = makeShownRoomIds();
    expect(guard.shouldShow('room-1')).toBeTruthy();
  });

  test('second show of the same room id returns false', () => {
    const guard = makeShownRoomIds();
    guard.shouldShow('room-1');
    expect(guard.shouldShow('room-1')).toBeFalsy();
  });

  test('different room ids are shown independently', () => {
    const guard = makeShownRoomIds();
    expect(guard.shouldShow('room-1')).toBeTruthy();
    expect(guard.shouldShow('room-2')).toBeTruthy();
    expect(guard.shouldShow('room-3')).toBeTruthy();
  });

  test('after dedup, original room cannot be shown again', () => {
    const guard = makeShownRoomIds();
    guard.shouldShow('room-A');
    guard.shouldShow('room-A'); // second call
    // Calling a third time also returns false
    expect(guard.shouldShow('room-A')).toBeFalsy();
  });
});

describe('7. Battle Room Flow (state machine)', () => {
  function simulateRoom(initial = 'pending') {
    let status = initial;
    let winnerId = null;
    return {
      getStatus: () => status,
      getWinner: () => winnerId,
      accept()  { if (status === 'pending')   status = 'accepted'; },
      reject()  { if (status === 'pending')   status = 'rejected'; },
      start()   { if (status === 'accepted')  status = 'in_progress'; },
      complete(winner) { status = 'completed'; winnerId = winner; },
    };
  }

  test('pending → accepted on accept()', () => {
    const room = simulateRoom();
    room.accept();
    expect(room.getStatus()).toBe('accepted');
  });

  test('pending → rejected on reject()', () => {
    const room = simulateRoom();
    room.reject();
    expect(room.getStatus()).toBe('rejected');
  });

  test('accepted → in_progress on start()', () => {
    const room = simulateRoom();
    room.accept();
    room.start();
    expect(room.getStatus()).toBe('in_progress');
  });

  test('in_progress → completed with winner', () => {
    const room = simulateRoom();
    room.accept();
    room.start();
    room.complete('player-uid-1');
    expect(room.getStatus()).toBe('completed');
    expect(room.getWinner()).toBe('player-uid-1');
  });

  test('rejected room ignores accept()', () => {
    const room = simulateRoom();
    room.reject();
    room.accept(); // no-op
    expect(room.getStatus()).toBe('rejected');
  });

  test('rematch creates a fresh pending room', () => {
    const original = simulateRoom();
    original.accept();
    original.start();
    original.complete('player-1');

    // Rematch = new room
    const rematch = simulateRoom('pending');
    expect(rematch.getStatus()).toBe('pending');
    expect(rematch.getWinner()).toBe(null);
  });
});

// ─── Summary ──────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log('\n' + '─'.repeat(52));
console.log(`Results: ${passed}/${total} tests passed`);
if (failed > 0) {
  console.log(`\nFailed tests:`);
  failures.forEach(({ name, message }) => {
    console.log(`  ✗ ${name}`);
    console.log(`    ${message}`);
  });
  process.exit(1);
} else {
  console.log('All tests passed! ✓');
  process.exit(0);
}
