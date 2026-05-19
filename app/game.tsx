import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { FoundEntry, WordGrid } from '../components/WordGrid';
import { CATEGORIES, STRIPE_COLORS } from '../constants/categories';
import { buildPuzzle } from '../lib/puzzle';
import { useAppState } from '../lib/storage';

const PRAISE = ['AMAZING', 'NICE', 'GOOD', 'WOW', 'BRILLIANT'];
const LEVELS_PER_CATEGORY = 8;
const BG_URI =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';

type DifficultyId = 'easy' | 'medium' | 'hard' | 'pro';

const DIFFICULTIES: Record<
  DifficultyId,
  {
    label: string;
    tint: string;
    gridSizes: number[];
    wordCounts: number[];
  }
> = {
  easy: {
    label: 'EASY',
    tint: '#C8FF59',
    gridSizes: [6, 6, 7, 7, 8, 8, 9, 9],
    wordCounts: [4, 5, 5, 6, 6, 7, 7, 8],
  },
  medium: {
    label: 'MEDIUM',
    tint: '#FFD84D',
    gridSizes: [7, 8, 8, 9, 9, 10, 10, 11],
    wordCounts: [5, 6, 6, 7, 7, 8, 8, 9],
  },
  hard: {
    label: 'HARD',
    tint: '#FF9ACB',
    gridSizes: [8, 9, 9, 10, 10, 11, 11, 12],
    wordCounts: [6, 6, 7, 8, 8, 9, 9, 10],
  },
  pro: {
    label: 'PRO',
    tint: '#B9A7FF',
    gridSizes: [9, 10, 10, 11, 11, 12, 12, 13],
    wordCounts: [7, 8, 8, 9, 9, 10, 10, 11],
  },
};

function getDifficulty(value?: string): DifficultyId {
  if (value === 'medium' || value === 'hard' || value === 'pro') return value;
  return 'easy';
}

function clampLevel(level: number) {
  return Math.min(Math.max(level || 1, 1), LEVELS_PER_CATEGORY);
}

export default function Game() {
  const params = useLocalSearchParams<{ id?: string; level?: string; difficulty?: string; title?: string; categoryKey?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, addCoins, setWordsFound } = useAppState();

  const category = CATEGORIES.find((c) => c.id === params.id) ?? CATEGORIES[0];
  const displayTitle = typeof params.title === 'string' ? decodeURIComponent(params.title) : category.name;
  const categoryKey = typeof params.categoryKey === 'string' ? params.categoryKey : category.id;
  const difficulty = getDifficulty(params.difficulty);
  const difficultyConfig = DIFFICULTIES[difficulty];
  const levelNumber = clampLevel(Number(params.level ?? 1));
  const levelIndex = levelNumber - 1;

  const gridSize = difficultyConfig.gridSizes[levelIndex];
  const totalWords = Math.min(category.words.length, difficultyConfig.wordCounts[levelIndex]);

  const levelWords = useMemo(
    () => category.words.slice(0, totalWords).map((w) => w.toUpperCase().trim()),
    [category.words, totalWords]
  );

  const progressKey = `${categoryKey}-${difficulty}-level-${levelNumber}`;
  const seed = `${category.id}-${difficulty}-${levelNumber}`;

  const [found, setFound] = useState<FoundEntry[]>([]);
  const [hintCell, setHintCell] = useState<[number, number] | null>(null);
  const [banner, setBanner] = useState<{ text: string; color: string } | null>(null);
  const [won, setWon] = useState(false);
  const [rewardCoins, setRewardCoins] = useState(0);

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setFound([]);
    setHintCell(null);
    setBanner(null);
    setWon(false);
    setRewardCoins(0);
  }, [category.id, difficulty, levelNumber]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  const bottomSafe = Math.max(insets.bottom, 14);
  const toolbarHeight = 78 + bottomSafe;
  const gridMax = Math.min(width - 40, height * 0.47, 430);
  const progress = levelWords.length ? (found.length / levelWords.length) * 100 : 0;

  const bannerScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const getRewardForLevel = () => {
    if (difficulty === 'easy') return 25;
    if (difficulty === 'medium') return levelNumber % 3 === 0 ? 60 : levelNumber % 2 === 0 ? 40 : 0;
    if (difficulty === 'hard') return levelNumber % 2 === 0 ? 75 : 0;
    return levelNumber % 2 === 1 ? 100 : 0;
  };

  const onFound = (entry: FoundEntry) => {
    setFound((prevFound) => {
      const entryWord = entry.word.toUpperCase().trim();
      const alreadyFound = prevFound.some((f) => f.word.toUpperCase().trim() === entryWord);
      if (alreadyFound) return prevFound;

      const newFound = [...prevFound, entry];

      setBanner({
        text: PRAISE[Math.floor(Math.random() * PRAISE.length)],
        color: entry.color,
      });

      setTimeout(() => setBanner(null), 1150);
      setWordsFound(progressKey, newFound.length);

      if (newFound.length === levelWords.length) {
        const reward = getRewardForLevel();
        setRewardCoins(reward);

        if (reward > 0) {
          addCoins(reward);
        }

        setTimeout(() => setWon(true), 650);
      }

      return newFound;
    });
  };

  const handleHint = (kind: 'reveal-start' | 'reveal-word' | 'magnify') => {
    const cost = kind === 'reveal-word' ? 80 : kind === 'magnify' ? 50 : 20;
    if (state.coins < cost) return;

    const remaining = levelWords.filter(
      (w) => !found.some((f) => f.word.toUpperCase().trim() === w.toUpperCase().trim())
    );
    if (!remaining.length) return;

    const word = remaining[Math.floor(Math.random() * remaining.length)];
    const puzzle = buildPuzzle(levelWords, gridSize, seed);
    const placement = puzzle.placements.find(
      (p) => p.word.toUpperCase().trim() === word.toUpperCase().trim()
    );
    if (!placement) return;

    if (kind === 'reveal-word') {
      const color = STRIPE_COLORS[found.length % STRIPE_COLORS.length];
      onFound({ word, start: placement.start, end: placement.end, color });
    } else if (kind === 'magnify') {
      remaining.forEach((rw, i) => {
        const p = puzzle.placements.find(
          (pp) => pp.word.toUpperCase().trim() === rw.toUpperCase().trim()
        );
        if (p) setTimeout(() => setHintCell(p.start), i * 200);
      });
      setTimeout(() => setHintCell(null), 2400);
    } else {
      setHintCell(placement.start);
      setTimeout(() => setHintCell(null), 1800);
    }

    addCoins(-cost);
  };

  const goNext = () => {
    if (levelNumber < LEVELS_PER_CATEGORY) {
      router.replace(`/game?id=${category.id}&difficulty=${difficulty}&level=${levelNumber + 1}`);
      return;
    }

    router.replace(`/levels?category=${categoryKey}&difficulty=${difficulty}`);
  };

  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.roundBtn}>
            <Svg width={18} height={18} viewBox="0 0 16 16">
              <Path
                d="M10 3L5 8l5 5"
                stroke="#fff"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerKicker}>{difficultyConfig.label} • LEVEL {levelNumber}</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>{displayTitle}</Text>
          </View>

          <Pressable onPress={() => router.push('/shop')} style={styles.coinBtn}>
            <Text style={styles.coinText}>🪙 {state.coins}</Text>
          </Pressable>
        </View>

        <View style={[styles.main, { paddingBottom: toolbarHeight }]}>
          <View style={styles.titlePill}>
            <Text style={styles.titlePillText}>LEARN NEW WORDS</Text>
          </View>

          <View style={styles.wordsCard}>
            <View style={styles.wordsHeader}>
              <Text style={styles.wordsHeaderText}>{displayTitle.toUpperCase()}</Text>
            </View>

            <View style={styles.wordsList}>
              {levelWords.map((word) => {
                const done = found.some((f) => f.word.toUpperCase().trim() === word);
                return (
                  <Text key={word} numberOfLines={1} style={[styles.wordText, done && styles.wordTextDone]}>
                    {word}
                  </Text>
                );
              })}
            </View>
          </View>

          <View style={[styles.gridGlass, { width: gridMax + 14 }]}>
            <WordGrid
              words={levelWords}
              seed={seed}
              found={found}
              hintCell={hintCell}
              onFound={onFound}
              width={gridMax}
              size={gridSize}
            />
          </View>

          <View style={styles.progressLine}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: difficultyConfig.tint }]} />
          </View>
        </View>

        <View style={[styles.bottomTools, { paddingBottom: bottomSafe }]}>
          <PowerButton icon="★" label="Start" cost={20} disabled={state.coins < 20} onPress={() => handleHint('reveal-start')} />
          <PowerButton icon="⌕" label="Find" cost={50} disabled={state.coins < 50} onPress={() => handleHint('magnify')} />
          <PowerButton icon="↻" label="Word" cost={80} disabled={state.coins < 80} onPress={() => handleHint('reveal-word')} />
        </View>

        {banner && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.banner,
              {
                backgroundColor: banner.color,
                transform: [{ scale: bannerScale }],
              },
            ]}
          >
            <Text style={styles.bannerText}>{banner.text}</Text>
          </Animated.View>
        )}

        {won && (
          <View style={styles.winOverlay}>
            <View style={styles.winCard}>
              <Text style={styles.winEmoji}>🏆</Text>
              <Text style={styles.winTitle}>Level Complete!</Text>
              <Text style={styles.winText}>
                You cleared {displayTitle} • {difficultyConfig.label} • Level {levelNumber}.
              </Text>
              <View style={styles.rewardChest}>
                <Text style={styles.rewardChestIcon}>{rewardCoins > 0 ? '🎁' : '⭐'}</Text>
              </View>

              <View style={styles.winRewardPill}>
                <Text style={styles.winRewardText}>
                  {rewardCoins > 0 ? `+${rewardCoins} coins earned` : 'Level unlocked'}
                </Text>
              </View>
              <Pressable style={styles.winPrimaryBtn} onPress={goNext}>
                <Text style={styles.winPrimaryBtnText}>
                  {levelNumber < LEVELS_PER_CATEGORY ? 'Next Level' : 'Back to Levels'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.winSecondaryBtn}
                onPress={() => router.replace(`/levels?category=${categoryKey}&difficulty=${difficulty}`)}
              >
                <Text style={styles.winSecondaryBtnText}>Category Levels</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

function PowerButton({
  icon,
  label,
  cost,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  cost: number;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.powerBtn, disabled && styles.powerBtnDisabled]}>
      <Text style={styles.powerIcon}>{icon}</Text>
      <Text style={styles.powerLabel}>{label}</Text>
      <Text style={styles.powerCost}>🪙 {cost}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#244F7E',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 55, 76, 0.18)',
  },
  safe: {
    flex: 1,
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundBtn: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.56)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerKicker: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    maxWidth: 170,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  coinBtn: {
    minWidth: 62,
    height: 39,
    borderRadius: 20,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.56)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  titlePill: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 111, 0, 0.92)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.56)',
    alignItems: 'center',
    marginBottom: 14,
  },
  titlePillText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  wordsCard: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.68)',
    marginBottom: 14,
  },
  wordsHeader: {
    backgroundColor: 'rgba(255, 94, 0, 0.95)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  wordsHeaderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  wordsList: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    minHeight: 74,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  wordText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '900',
    minWidth: 70,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.33)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  wordTextDone: {
    color: '#AAFF9B',
    textDecorationLine: 'line-through',
  },
  gridGlass: {
    backgroundColor: 'rgba(255,255,255,0.50)',
    borderRadius: 22,
    padding: 7,
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.76)',
    shadowColor: '#000',
    shadowOpacity: 0.20,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 9,
  },
  progressLine: {
    width: '78%',
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
    marginTop: 13,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  bottomTools: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  powerBtn: {
    width: 72,
    minHeight: 64,
    borderRadius: 22,
    backgroundColor: '#FF6F00',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.50)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 10,
    elevation: 7,
  },
  powerBtnDisabled: {
    opacity: 0.48,
  },
  powerIcon: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 26,
  },
  powerLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 1,
  },
  powerCost: {
    color: '#FFF3C4',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 1,
  },
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '40%',
    paddingVertical: 18,
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.26)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 5,
  },
  winOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 8, 35, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  winCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
  },
  winEmoji: { fontSize: 50 },
  winTitle: { marginTop: 10, color: '#28145C', fontWeight: '900', fontSize: 24 },
  winText: { marginTop: 8, textAlign: 'center', color: '#6A608F', lineHeight: 20 },
  rewardChest: {
    marginTop: 14,
    width: 86,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#FFD84D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFF3B0',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 12,
    elevation: 7,
  },
  rewardChestIcon: {
    fontSize: 38,
  },
  winRewardPill: {
    marginTop: 12,
    backgroundColor: '#FFF4CC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  winRewardText: { color: '#7C5400', fontWeight: '900' },
  winPrimaryBtn: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#FF6F00',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  winPrimaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  winSecondaryBtn: {
    marginTop: 10,
    width: '100%',
    backgroundColor: '#F2EEFF',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  winSecondaryBtnText: { color: '#4B358B', fontWeight: '900', fontSize: 15 },
});
