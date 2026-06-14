import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, FeColorMatrix, Filter, Image as SvgImage, Line, Path, Polygon, Rect } from 'react-native-svg';
import { CATEGORIES } from '../constants/categories';
import { Theme } from '../constants/theme';
import { useAppState, getAppSettings } from '../lib/storage';
import { playTapSound } from '../lib/audio';
import { Ionicons } from '@expo/vector-icons';

const LEVELS_PER_CATEGORY = 8;
const DEEP_PINK  = '#D9218E';
const PURPLE_BTN = '#7B5CF8';
const GOLD       = '#F5A623';

function FloatingMascot() {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -10, duration: 900, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0,   duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [bounce]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[mascotStyle.wrap, { transform: [{ translateY: bounce }] }]}
    >
      <Svg width={90} height={90}>
        <Defs>
          <Filter id="lvlMascotNoWhite" x="0%" y="0%" width="100%" height="100%">
            <FeColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3"
            />
          </Filter>
        </Defs>
        <SvgImage
          href={require('../assets/images/moscot.png')}
          x="0" y="0" width="90" height="90"
          preserveAspectRatio="xMidYMid meet"
          filter="url(#lvlMascotNoWhite)"
        />
      </Svg>
    </Animated.View>
  );
}

const mascotStyle = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 10,
    bottom: 130,   // sits above the floating tab bar
    zIndex: 99,
  },
});

function withAlpha(hex: string, opacity: number) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

type DifficultyId = 'easy' | 'medium' | 'hard' | 'pro';

type GameCategory = {
  id: string;
  name: string;
  baseId: string;
  baseIndex: number;
  price?: number;
};

const DIFFICULTY_ORDER: DifficultyId[] = ['easy', 'medium', 'hard', 'pro'];

const DIFFICULTIES: Record<
  DifficultyId,
  { label: string; activeBg: string; text: string; gridSizes: number[]; wordCounts: number[] }
> = {
  easy:   { label: 'EASY',   activeBg: '#EAF8F0', text: '#168A5A', gridSizes: [6,6,7,7,8,8,9,9],      wordCounts: [4,5,5,6,6,7,7,8]   },
  medium: { label: 'MEDIUM', activeBg: '#FFF3E8', text: '#D94F2B', gridSizes: [7,8,8,9,9,10,10,11],    wordCounts: [5,6,6,7,7,8,8,9]   },
  hard:   { label: 'HARD',   activeBg: '#F4ECFF', text: '#7C3AED', gridSizes: [8,9,9,10,10,11,11,12],  wordCounts: [6,6,7,8,8,9,9,10]  },
  pro:    { label: 'PRO',    activeBg: '#FFEAF3', text: '#D93676', gridSizes: [9,10,10,11,11,12,12,13], wordCounts: [7,8,8,9,9,10,10,11] },
};

const DIFF_XP:    Record<DifficultyId, string> = { easy: '1X XP', medium: '2X XP', hard: '3X XP', pro: '5X XP' };
const DIFF_BADGE: Record<DifficultyId, string> = { easy: 'BEGINNER', medium: 'MODERATE', hard: 'ADVANCED', pro: 'EXPERT' };

function getDifficulty(value?: string): DifficultyId {
  if (value === 'medium' || value === 'hard' || value === 'pro') return value;
  return 'easy';
}

function makeProgressKey(categoryId: string, difficulty: DifficultyId, level: number) {
  return `${categoryId}-${difficulty}-level-${level}`;
}

function getNeedCount(wordsLength: number, difficulty: DifficultyId, level: number) {
  return Math.min(wordsLength, DIFFICULTIES[difficulty].wordCounts[level - 1]);
}

function getCategorySet(difficulty: DifficultyId): GameCategory[] {
  const base = CATEGORIES.length ? CATEGORIES : [];
  return base.map((cat, index) => ({
    id: `${difficulty}-${cat.id}`,
    name: cat.name,
    baseId: cat.id,
    baseIndex: index,
    price:
      index < 12
        ? undefined
        : (difficulty === 'easy' ? 75 : difficulty === 'medium' ? 125 : difficulty === 'hard' ? 175 : 250) +
          (index - 12) * 15,
  }));
}

function getCategoryType(name: string) {
  const n = name.toLowerCase();
  if (n.includes('animal')) return 'animals';
  if (n.includes('color')) return 'colors';
  if (n.includes('cities') || n.includes('city')) return 'cities';
  if (n.includes('nature')) return 'nature';
  if (n.includes('house') || n.includes('home')) return 'house';
  if (n.includes('adjective')) return 'adjectives';
  if (n.includes('tv')) return 'tv';
  if (n.includes('country')) return 'countries';
  if (n.includes('monument')) return 'monuments';
  if (n.includes('actor') || n.includes('director')) return 'actors';
  if (n.includes('writer')) return 'writers';
  if (n.includes('history')) return 'history';
  if (n.includes('family')) return 'family';
  if (n.includes('food') || n.includes('meal') || n.includes('kitchen')) return 'food';
  if (n.includes('fruit')) return 'fruits';
  if (n.includes('vegetable') || n.includes('veggie')) return 'vegetables';
  if (n.includes('sport') || n.includes('game')) return 'sports';
  if (n.includes('music') || n.includes('song')) return 'music';
  if (n.includes('school') || n.includes('education')) return 'school';
  if (n.includes('body') || n.includes('health')) return 'body';
  if (n.includes('job') || n.includes('profession') || n.includes('career') || n.includes('business')) return 'jobs';
  if (n.includes('transport') || n.includes('vehicle') || n.includes('car')) return 'transport';
  if (n.includes('space') || n.includes('planet')) return 'space';
  if (n.includes('ocean') || n.includes('sea') || n.includes('water')) return 'ocean';
  if (n.includes('weather') || n.includes('season')) return 'weather';
  if (n.includes('shape')) return 'shapes';
  if (n.includes('number') || n.includes('math')) return 'numbers';
  if (n.includes('time') || n.includes('clock')) return 'time';
  if (n.includes('emotion') || n.includes('feeling')) return 'emotions';
  if (n.includes('toy')) return 'toys';
  if (n.includes('clothes') || n.includes('clothing')) return 'clothes';
  if (n.includes('tool')) return 'tools';
  if (n.includes('myth')) return 'mythology';
  if (n.includes('science')) return 'science';
  if (n.includes('technology') || n.includes('robot')) return 'technology';
  if (n.includes('adventure')) return 'adventure';
  if (n.includes('mystery')) return 'mystery';
  if (n.includes('fantasy') || n.includes('magic')) return 'magic';
  if (n.includes('pirate') || n.includes('treasure')) return 'treasure';
  if (n.includes('dinosaur')) return 'dinosaurs';
  return 'puzzle';
}

function getIconColor(name: string) {
  const type = getCategoryType(name);
  switch (type) {
    case 'animals':    return '#b50061';
    case 'colors':     return '#c7008f';
    case 'cities':     return '#ff7a00';
    case 'nature':     return '#f2aa00';
    case 'house':      return '#2567d8';
    case 'adjectives': return '#6b149a';
    case 'tv':         return '#ff8a00';
    case 'countries':  return '#d90046';
    case 'monuments':  return '#ff6a00';
    case 'actors':     return '#ff8a16';
    case 'writers':    return '#d90046';
    case 'history':    return '#6a126d';
    case 'family':     return '#23a6d5';
    case 'food':       return '#ff4f43';
    case 'fruits':     return '#f36b21';
    case 'vegetables': return '#42b246';
    case 'sports':     return '#0da16f';
    case 'music':      return '#8d37c9';
    case 'school':     return '#2b74d9';
    case 'body':       return '#e64d7a';
    case 'jobs':       return '#2f5f9f';
    case 'transport':  return '#ff8a00';
    case 'space':      return '#4a3bd1';
    case 'ocean':      return '#0a9fd6';
    case 'weather':    return '#f2b600';
    case 'shapes':     return '#6b149a';
    case 'numbers':    return '#0e8ccf';
    case 'time':       return '#5e62d9';
    case 'emotions':   return '#ff8c2a';
    case 'toys':       return '#dc2fb6';
    case 'clothes':    return '#d9437d';
    case 'tools':      return '#677285';
    case 'mythology':  return '#8950ff';
    case 'science':    return '#00a3a3';
    case 'technology': return '#3d6dff';
    case 'adventure':  return '#f36b21';
    case 'mystery':    return '#3b2c5f';
    case 'magic':      return '#b330ff';
    case 'treasure':   return '#d89000';
    case 'dinosaurs':  return '#2aa84a';
    default:           return '#ff7a00';
  }
}

function CategorySvgIcon({ name, size = 82 }: { name: string; size?: number }) {
  const color = getIconColor(name);
  const type  = getCategoryType(name);

  if (type === 'animals') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx="50" cy="56" rx="24" ry="30" fill={color} />
      <Circle cx="25" cy="35" r="7" fill={color} />
      <Circle cx="38" cy="25" r="7" fill={color} />
      <Circle cx="55" cy="22" r="7" fill={color} />
      <Circle cx="72" cy="35" r="7" fill={color} />
    </Svg>
  );

  if (type === 'colors') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="34" r="20" fill="#d9008b" />
      <Circle cx="35" cy="58" r="20" fill="#6c00a8" />
      <Circle cx="65" cy="58" r="20" fill="#efb3bd" />
    </Svg>
  );

  if (type === 'cities') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="17" y="36" width="14" height="43" rx="2" fill={color} />
      <Rect x="43" y="26" width="15" height="53" rx="2" fill={color} />
      <Rect x="70" y="37" width="14" height="42" rx="2" fill={color} />
      <Line x1="24" y1="24" x2="24" y2="34" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <Line x1="50" y1="13" x2="50" y2="23" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <Line x1="77" y1="24" x2="77" y2="34" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <Line x1="49" y1="37" x2="49" y2="70" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <Line x1="24" y1="47" x2="24" y2="70" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <Line x1="77" y1="49" x2="77" y2="70" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );

  if (type === 'nature') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M48 78 C48 60 48 48 46 31" stroke={color} strokeWidth="8" strokeLinecap="round" fill="none" />
      <Path d="M48 41 C33 36 23 28 18 15 C37 14 51 22 54 39 Z" fill={color} />
      <Path d="M51 47 C65 40 73 31 78 18 C61 18 49 27 47 44 Z" fill={color} />
    </Svg>
  );

  if (type === 'house') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M16 48 L50 18 L84 48" fill={color} />
      <Rect x="25" y="47" width="50" height="34" fill={color} />
      <Rect x="44" y="60" width="13" height="21" fill="#fff" />
      <Rect x="31" y="57" width="10" height="10" fill="#fff" />
      <Rect x="60" y="57" width="10" height="10" fill="#fff" />
    </Svg>
  );

  if (type === 'adjectives') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Line x1="12" y1="28" x2="88" y2="28" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <Line x1="12" y1="68" x2="88" y2="68" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <Circle cx="24" cy="50" r="10" fill={color} />
      <Polygon points="49,39 62,61 36,61" fill={color} />
      <Rect x="68" y="39" width="20" height="22" fill={color} />
    </Svg>
  );

  if (type === 'tv') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="18" y="28" width="64" height="48" rx="5" stroke={color} strokeWidth="7" fill="none" />
      <Path d="M41 43 L61 52 L41 61 Z" fill={color} />
      <Line x1="35" y1="85" x2="65" y2="85" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );

  if (type === 'countries') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M72 16 C58 18 47 22 39 30 C29 40 21 51 18 67 C31 74 47 80 62 79 C74 78 83 69 84 57 C72 59 66 53 70 43 C74 34 80 28 72 16 Z" fill={color} />
      <Circle cx="38" cy="48" r="5" fill="#fff" opacity="0.8" />
    </Svg>
  );

  if (type === 'monuments') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points="50,16 15,34 85,34" fill={color} />
      <Rect x="20" y="39" width="10" height="35" fill={color} />
      <Rect x="38" y="39" width="10" height="35" fill={color} />
      <Rect x="56" y="39" width="10" height="35" fill={color} />
      <Rect x="74" y="39" width="10" height="35" fill={color} />
      <Rect x="15" y="78" width="70" height="8" fill={color} />
      <Circle cx="50" cy="28" r="5" fill="#fff" opacity="0.75" />
    </Svg>
  );

  if (type === 'actors') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M18 25 C33 17 48 20 56 32 C52 65 27 71 16 51 C12 42 12 31 18 25 Z" fill={color} />
      <Path d="M51 38 C62 26 79 27 86 36 C86 67 62 76 48 58 C48 50 49 44 51 38 Z" fill={color} opacity="0.75" />
      <Path d="M25 46 C32 52 40 52 47 46" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M58 51 C65 47 72 47 79 51" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
    </Svg>
  );

  if (type === 'writers') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M24 75 L39 28 C41 20 50 16 58 18 L70 22 L56 67 Z" fill={color} />
      <Path d="M24 75 L20 88 L33 81 Z" fill={color} />
      <Line x1="65" y1="70" x2="86" y2="70" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );

  if (type === 'history') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M24 18 H66 C77 18 83 25 83 36 V82 H34 C24 82 18 76 18 66 V24 C18 21 21 18 24 18 Z" fill={color} />
      <Path d="M66 18 C58 22 57 33 66 37 H83 C83 25 77 18 66 18 Z" fill="#fff" opacity="0.55" />
      <Line x1="33" y1="45" x2="62" y2="45" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <Line x1="33" y1="58" x2="58" y2="58" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </Svg>
  );

  if (type === 'food') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="49" cy="52" r="31" fill={color} />
      <Circle cx="49" cy="52" r="20" fill="#fff" opacity="0.85" />
      <Path d="M72 18 V82" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <Path d="M20 20 V44 C20 55 34 55 34 44 V20" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
    </Svg>
  );

  if (type === 'fruits') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M49 32 C25 30 18 48 25 67 C33 88 50 83 50 83 C50 83 67 88 75 67 C82 48 75 30 51 32 Z" fill={color} />
      <Path d="M51 30 C54 20 62 15 74 16 C70 28 62 33 51 30 Z" fill="#42b246" />
      <Path d="M50 32 C49 24 47 19 43 15" stroke="#7d4a1e" strokeWidth="5" strokeLinecap="round" />
    </Svg>
  );

  if (type === 'vegetables') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M48 80 C30 63 32 40 49 29 C66 40 68 63 50 80 Z" fill={color} />
      <Path d="M47 30 C37 22 27 20 17 23 C24 35 35 39 47 30 Z" fill="#66c95f" />
      <Path d="M53 30 C63 20 74 18 84 22 C77 35 65 39 53 30 Z" fill="#66c95f" />
    </Svg>
  );

  if (type === 'sports') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="34" fill={color} />
      <Path d="M18 50 C36 43 64 43 82 50" stroke="#fff" strokeWidth="5" fill="none" />
      <Path d="M50 16 C43 34 43 66 50 84" stroke="#fff" strokeWidth="5" fill="none" />
      <Path d="M50 16 C57 34 57 66 50 84" stroke="#fff" strokeWidth="5" fill="none" />
    </Svg>
  );

  if (type === 'music') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M38 28 L75 20 V64" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Line x1="38" y1="28" x2="38" y2="70" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <Ellipse cx="30" cy="74" rx="15" ry="10" fill={color} />
      <Ellipse cx="67" cy="68" rx="15" ry="10" fill={color} />
    </Svg>
  );

  if (type === 'school') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M18 34 L50 18 L82 34 L50 50 Z" fill={color} />
      <Path d="M28 44 V65 C40 75 60 75 72 65 V44 L50 56 Z" fill={color} opacity="0.82" />
      <Line x1="82" y1="34" x2="82" y2="58" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <Circle cx="82" cy="65" r="5" fill={color} />
    </Svg>
  );

  if (type === 'body') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50 82 C30 66 18 54 18 38 C18 25 28 18 39 23 C45 26 48 31 50 35 C52 31 55 26 61 23 C72 18 82 25 82 38 C82 54 70 66 50 82 Z" fill={color} />
    </Svg>
  );

  if (type === 'jobs') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="18" y="35" width="64" height="43" rx="8" fill={color} />
      <Path d="M38 35 V27 C38 22 42 19 47 19 H53 C58 19 62 22 62 27 V35" stroke={color} strokeWidth="7" fill="none" />
      <Rect x="42" y="50" width="16" height="10" rx="2" fill="#fff" opacity="0.85" />
    </Svg>
  );

  if (type === 'transport') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M18 55 L28 32 H70 L82 55 V73 H18 Z" fill={color} />
      <Rect x="34" y="39" width="28" height="13" fill="#fff" opacity="0.85" />
      <Circle cx="31" cy="75" r="8" fill="#333" />
      <Circle cx="69" cy="75" r="8" fill="#333" />
    </Svg>
  );

  if (type === 'space') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="48" cy="50" r="25" fill={color} />
      <Path d="M16 59 C37 42 65 35 86 39 C72 58 40 71 16 59 Z" stroke={color} strokeWidth="6" fill="none" />
      <Circle cx="58" cy="41" r="5" fill="#fff" opacity="0.8" />
    </Svg>
  );

  if (type === 'ocean') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M14 58 C25 47 36 47 47 58 C58 69 69 69 86 54 V76 H14 Z" fill={color} />
      <Path d="M20 39 C30 30 40 30 50 39 C60 48 70 48 80 39" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none" />
    </Svg>
  );

  if (type === 'weather') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="36" cy="36" r="20" fill="#ffc82e" />
      <Path d="M31 68 H73 C83 68 88 62 88 54 C88 45 81 39 72 41 C68 31 59 26 49 28 C39 30 33 37 32 47 C22 47 15 52 15 60 C15 66 21 68 31 68 Z" fill={color} />
    </Svg>
  );

  if (type === 'shapes') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="32" cy="35" r="18" fill={color} />
      <Rect x="50" y="20" width="32" height="32" rx="4" fill={color} opacity="0.82" />
      <Polygon points="50,60 78,86 22,86" fill={color} opacity="0.65" />
    </Svg>
  );

  if (type === 'numbers') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="20" y="18" width="60" height="64" rx="14" fill={color} />
      <Path d="M36 62 H48 M42 62 V38 L35 44" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M58 40 C70 36 76 50 62 59 C58 62 56 65 56 65 H74" stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" />
    </Svg>
  );

  if (type === 'time') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="33" fill={color} />
      <Circle cx="50" cy="50" r="25" fill="#fff" opacity="0.9" />
      <Line x1="50" y1="50" x2="50" y2="32" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <Line x1="50" y1="50" x2="66" y2="58" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );

  if (type === 'emotions') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="34" fill={color} />
      <Circle cx="38" cy="42" r="5" fill="#fff" />
      <Circle cx="62" cy="42" r="5" fill="#fff" />
      <Path d="M34 60 C43 72 57 72 66 60" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" />
    </Svg>
  );

  if (type === 'toys') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="25" y="25" width="50" height="50" rx="10" fill={color} />
      <Circle cx="37" cy="37" r="8" fill="#fff" opacity="0.85" />
      <Circle cx="63" cy="37" r="8" fill="#fff" opacity="0.85" />
      <Circle cx="37" cy="63" r="8" fill="#fff" opacity="0.85" />
      <Circle cx="63" cy="63" r="8" fill="#fff" opacity="0.85" />
    </Svg>
  );

  if (type === 'clothes') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M33 21 C39 31 61 31 67 21 L84 35 L73 49 V82 H27 V49 L16 35 Z" fill={color} />
      <Path d="M40 24 C44 31 56 31 60 24" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
    </Svg>
  );

  if (type === 'tools') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M66 17 C75 17 82 24 82 33 C82 37 81 40 79 43 L65 29 L55 39 L69 53 C66 55 62 56 58 56 C49 56 42 49 42 40 C42 37 43 34 44 31 L18 57 C13 62 13 70 18 75 C23 80 31 80 36 75 L62 49" fill={color} />
    </Svg>
  );

  if (type === 'mythology') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50 14 L70 38 L61 82 H39 L30 38 Z" fill={color} />
      <Path d="M35 38 H65" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <Circle cx="50" cy="32" r="8" fill="#fff" opacity="0.82" />
    </Svg>
  );

  if (type === 'science') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M42 18 H58 V38 L78 75 C82 82 77 88 69 88 H31 C23 88 18 82 22 75 L42 38 Z" fill={color} />
      <Path d="M33 70 H67" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <Circle cx="44" cy="58" r="5" fill="#fff" />
      <Circle cx="57" cy="68" r="4" fill="#fff" />
    </Svg>
  );

  if (type === 'technology') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="22" y="22" width="56" height="56" rx="14" fill={color} />
      <Circle cx="40" cy="45" r="6" fill="#fff" />
      <Circle cx="60" cy="45" r="6" fill="#fff" />
      <Path d="M38 62 H62" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <Line x1="38" y1="16" x2="38" y2="22" stroke={color} strokeWidth="5" />
      <Line x1="62" y1="16" x2="62" y2="22" stroke={color} strokeWidth="5" />
    </Svg>
  );

  if (type === 'adventure') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="35" fill={color} />
      <Polygon points="50,22 60,54 50,78 40,54" fill="#fff" opacity="0.9" />
      <Polygon points="50,22 60,54 50,50" fill="#ffd84d" />
    </Svg>
  );

  if (type === 'mystery') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="34" fill={color} />
      <Path d="M39 39 C41 28 61 28 62 41 C63 52 50 52 50 63" stroke="#fff" strokeWidth="8" strokeLinecap="round" fill="none" />
      <Circle cx="50" cy="75" r="5" fill="#fff" />
    </Svg>
  );

  if (type === 'magic') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M28 76 L72 32" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <Path d="M66 18 L70 29 L82 30 L72 37 L75 49 L66 42 L56 49 L60 37 L50 30 L62 29 Z" fill={color} />
      <Circle cx="31" cy="29" r="5" fill={color} />
      <Circle cx="79" cy="72" r="5" fill={color} />
    </Svg>
  );

  if (type === 'treasure') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M20 46 C22 28 35 20 50 20 C65 20 78 28 80 46 V78 H20 Z" fill={color} />
      <Rect x="20" y="46" width="60" height="32" fill={color} />
      <Rect x="45" y="46" width="10" height="32" fill="#fff" opacity="0.72" />
      <Circle cx="50" cy="61" r="6" fill="#ffd84d" />
    </Svg>
  );

  if (type === 'dinosaurs') return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M20 62 C24 39 45 28 67 35 C78 39 84 47 84 56 C84 68 72 77 55 77 H34 C25 77 18 71 20 62 Z" fill={color} />
      <Circle cx="68" cy="47" r="4" fill="#fff" />
      <Path d="M32 34 L38 22 L45 35" fill={color} />
    </Svg>
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="22" y="22" width="56" height="56" rx="14" fill={color} />
      <Circle cx="38" cy="38" r="9" fill="#fff" opacity="0.85" />
      <Path d="M55 32 H70 V47" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M70 64 C60 75 42 74 32 62" stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function PremiumStarBadge({ price }: { price: number }) {
  return (
    <View style={s.premiumBadge}>
      <Svg width={30} height={30} viewBox="0 0 100 100">
        <Path d="M50 8 L61 35 L90 38 L68 57 L75 86 L50 70 L25 86 L32 57 L10 38 L39 35 Z" fill="#FFD21F" stroke="#FFF5B8" strokeWidth="8" strokeLinejoin="round" />
      </Svg>
      <Text style={s.premiumPrice}>{price}</Text>
    </View>
  );
}

// ─── Difficulty tabs ──────────────────────────────────────────────────────────

function DifficultyTabs({ active, onChange }: { active: DifficultyId; onChange: (v: DifficultyId) => void }) {
  return (
    <View style={dt.row}>
      {DIFFICULTY_ORDER.map((d) => {
        const isActive = d === active;
        return (
          <Pressable key={d} onPress={() => onChange(d)} style={[dt.pill, isActive && dt.pillActive]}>
            <Text style={[dt.label, isActive && dt.labelActive]}>{DIFFICULTIES[d].label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const dt = StyleSheet.create({
  row:        { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill:       { flex: 1, paddingVertical: 11, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(168,148,228,0.40)' },
  pillActive: { backgroundColor: DEEP_PINK, borderColor: DEEP_PINK },
  label:      { fontSize: 12, fontWeight: '800', color: '#8B7EB5', letterSpacing: 0.3 },
  labelActive:{ color: '#FFFFFF' },
});

// ─── Category card (list view) ────────────────────────────────────────────────

function CategoryCard({
  item, width, onPress, completedCount, premiumPrice,
}: {
  item: GameCategory; width: number; onPress: () => void;
  completedCount: number; premiumPrice?: number;
}) {
  const accent = getIconColor(item.name);
  const done   = completedCount >= LEVELS_PER_CATEGORY;
  const stars  = done ? 3 : completedCount >= Math.ceil(LEVELS_PER_CATEGORY * 0.625) ? 2 : completedCount > 0 ? 1 : 0;

  return (
    <Pressable onPress={() => { playTapSound(getAppSettings().sound).catch(() => {}); onPress(); }} style={[s.catCard, { width }]}>
      <View style={[s.catIconBg, { backgroundColor: withAlpha(accent, 0.13) }]}>
        <CategorySvgIcon name={item.name} size={52} />
        {done && (
          <View style={s.catDonePin}>
            <Ionicons name="checkmark-circle" size={18} color={Theme.success} />
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={s.catName}>{item.name}</Text>
      <View style={s.catStars}>
        {[1,2,3].map((n) => (
          <Ionicons key={n} name={n <= stars ? 'star' : 'star-outline'} size={11} color={n <= stars ? GOLD : '#C4B8E0'} />
        ))}
        <Text style={s.catProgress}>{completedCount}/{LEVELS_PER_CATEGORY}</Text>
      </View>
      <View style={s.catTrack}>
        <View style={[s.catFill, { width: `${(completedCount / LEVELS_PER_CATEGORY) * 100}%` as any, backgroundColor: done ? Theme.success : accent }]} />
      </View>
      <View style={[s.catBtn, { backgroundColor: done ? Theme.success : DEEP_PINK }]}>
        <Ionicons name={done ? 'refresh' : 'play'} size={10} color="#fff" />
        <Text style={s.catBtnText}>{done ? 'REPLAY' : 'PLAY'}</Text>
      </View>
      {premiumPrice ? <PremiumStarBadge price={premiumPrice} /> : null}
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Levels() {
  const params = useLocalSearchParams<{ category?: string; difficulty?: string }>();
  const { state } = useAppState();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [difficulty, setDifficulty] = useState<DifficultyId>(getDifficulty(params.difficulty));

  useEffect(() => {
    setDifficulty(getDifficulty(params.difficulty));
  }, [params.difficulty]);

  const currentCategorySet = useMemo(() => getCategorySet(difficulty), [difficulty]);

  const selectedCategory = useMemo(() => {
    if (!params.category) return undefined;
    return currentCategorySet.find((item) => item.id === params.category);
  }, [currentCategorySet, params.category]);

  const hPad     = Math.max(16, insets.left + 16);
  const usable   = width - insets.left - insets.right;
  const columns  = width >= 500 ? 3 : 2;
  const cardW    = (usable - hPad * 2 - 12 * (columns - 1)) / columns;
  const levelW   = (usable - hPad * 2 - 12) / 2;

  const isCompleted = (catId: string, wLen: number, lvl: number) =>
    (state.progress[makeProgressKey(catId, difficulty, lvl)] ?? 0) >= getNeedCount(wLen, difficulty, lvl);

  const isUnlocked = (catId: string, wLen: number, lvl: number) =>
    lvl === 1 || isCompleted(catId, wLen, lvl - 1);

  const catDoneCount = (catId: string, wLen: number) => {
    let done = 0;
    for (let i = 1; i <= LEVELS_PER_CATEGORY; i++) if (isCompleted(catId, wLen, i)) done++;
    return done;
  };

  const onDifficultyChange = (item: DifficultyId) => {
    if (selectedCategory) {
      const nextSet = getCategorySet(item);
      const next    = nextSet[selectedCategory.baseIndex % nextSet.length] ?? nextSet[0];
      router.setParams({ category: next.id, difficulty: item });
    } else {
      router.setParams({ difficulty: item });
    }
    setDifficulty(item);
  };

  const iconColor = selectedCategory ? getIconColor(selectedCategory.name) : '#8B5CF6';

  return (
    <View style={s.root}>
      <Image source={require('../assets/images/background.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <FloatingMascot />
      <SafeAreaView edges={['top','left','right']} style={s.safe}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Pressable
            style={s.backBtn}
            onPress={() => { playTapSound(state.settings.sound).catch(() => {}); selectedCategory ? router.replace(`/levels?difficulty=${difficulty}`) : router.back(); }}
          >
            <Ionicons name="chevron-back" size={22} color="#1A0845" />
          </Pressable>
          <Text style={s.headerTitle} numberOfLines={1}>
            {selectedCategory ? selectedCategory.name.toUpperCase() : 'CATEGORIES'}
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable style={s.coinPill} onPress={() => router.push('/coins' as any)}>
            <Ionicons name="logo-bitcoin" size={14} color={GOLD} />
            <Text style={s.coinText}>{state.coins.toLocaleString()}</Text>
          </Pressable>
          <Pressable style={s.avatarRing} onPress={() => router.push('/profile' as any)}>
            {state.profile.photoURL ? (
              <Image source={{ uri: state.profile.photoURL }} style={s.avatarImg} contentFit="cover" />
            ) : (
              <View style={s.avatarFallback}>
                <Ionicons name={(state.profile.avatar || 'game-controller') as any} size={20} color="#FF6BB3" />
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingLeft: hPad, paddingRight: hPad }]}
        >
          {/* ── Category info card (level view only) ── */}
          {selectedCategory && (
            <View style={s.infoCard}>
              <View style={[s.infoIcon, { backgroundColor: withAlpha(iconColor, 0.13) }]}>
                <CategorySvgIcon name={selectedCategory.name} size={50} />
              </View>
              <View style={s.infoBody}>
                <Text style={s.infoTitle}>{selectedCategory.name}</Text>
                <Text style={s.infoDesc} numberOfLines={2}>
                  Find all the words hidden in the grid across {LEVELS_PER_CATEGORY} exciting levels!
                </Text>
                <View style={s.infoTags}>
                  <View style={s.tagPink}>
                    <Text style={s.tagPinkText}>{DIFF_BADGE[difficulty]}</Text>
                  </View>
                  <View style={s.tagPurple}>
                    <Text style={s.tagPurpleText}>{DIFF_XP[difficulty]}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ── Difficulty tabs ── */}
          <DifficultyTabs active={difficulty} onChange={onDifficultyChange} />

          {/* ── Category grid ── */}
          {!selectedCategory ? (
            <View style={s.catGrid}>
              {currentCategorySet.map((item) => {
                const base      = CATEGORIES.find((c) => c.id === item.baseId) ?? CATEGORIES[0];
                const completed = catDoneCount(item.id, base.words.length);
                return (
                  <CategoryCard
                    key={item.id}
                    item={item}
                    width={cardW}
                    completedCount={completed}
                    premiumPrice={item.price}
                    onPress={() => router.push(`/levels?category=${item.id}&difficulty=${difficulty}`)}
                  />
                );
              })}
            </View>
          ) : (
            /* ── Level grid ── */
            <View style={s.lvGrid}>
              {Array.from({ length: LEVELS_PER_CATEGORY }).map((_, idx) => {
                const level       = idx + 1;
                const base        = CATEGORIES.find((c) => c.id === selectedCategory.baseId) ?? CATEGORIES[0];
                const need        = getNeedCount(base.words.length, difficulty, level);
                const grid        = DIFFICULTIES[difficulty].gridSizes[idx];
                const found       = state.progress[makeProgressKey(selectedCategory.id, difficulty, level)] ?? 0;
                const completed   = found >= need;
                const unlocked    = isUnlocked(selectedCategory.id, base.words.length, level);
                const progressPct = need > 0 ? Math.min(1, found / need) : 0;
                const stars       = completed ? 3 : progressPct >= 0.66 ? 2 : progressPct > 0 ? 1 : 0;

                const gameRoute = `/game?id=${selectedCategory.baseId}&categoryKey=${selectedCategory.id}&title=${encodeURIComponent(selectedCategory.name)}&difficulty=${difficulty}&level=${level}`;

                return (
                  <Pressable
                    key={`${selectedCategory.id}-${difficulty}-${level}`}
                    disabled={!unlocked}
                    onPress={() => { playTapSound(state.settings.sound).catch(() => {}); router.push(gameRoute as any); }}
                    style={[s.lvCard, { width: levelW }, !unlocked && s.lvLocked]}
                  >
                    {/* Stars */}
                    <View style={s.lvStars}>
                      {[1,2,3].map((n) => (
                        <Ionicons key={n} name={n <= stars ? 'star' : 'star-outline'} size={13} color={n <= stars ? GOLD : '#C4B8E0'} />
                      ))}
                    </View>

                    {/* Badge circle */}
                    <View style={[s.lvBadge, completed && s.lvBadgeDone, !unlocked && s.lvBadgeGray]}>
                      {!unlocked
                        ? <Ionicons name="lock-closed"  size={22} color="#C4B8E0" />
                        : completed
                          ? <Ionicons name="checkmark"  size={28} color="#FFFFFF" />
                          : <Text style={s.lvNum}>{level}</Text>
                      }
                    </View>

                    {/* Title + meta */}
                    <Text style={s.lvTitle}>Level {level}</Text>
                    <Text style={s.lvMeta}>{grid}×{grid} • {need} words</Text>

                    {/* Found count (in-progress) */}
                    {unlocked && !completed && found > 0 && (
                      <Text style={s.lvFound}>{found} / {need} found</Text>
                    )}

                    {/* Progress bar */}
                    <View style={s.lvTrack}>
                      <View style={[
                        s.lvFill,
                        { width: `${progressPct * 100}%` as any, backgroundColor: completed ? Theme.success : '#6366F1' },
                      ]} />
                    </View>

                    {/* Action buttons */}
                    {unlocked ? (
                      <View style={s.lvActions}>
                        <Pressable
                          style={s.lvPlayBtn}
                          onPress={() => { playTapSound(state.settings.sound).catch(() => {}); router.push(gameRoute as any); }}
                        >
                          <Ionicons name={completed ? 'refresh' : 'play'} size={11} color="#fff" />
                          <Text style={s.lvPlayText}>{completed ? 'REPLAY' : 'PLAY'}</Text>
                        </Pressable>
                        <Pressable
                          style={s.lvBattleBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            playTapSound(state.settings.sound).catch(() => {});
                            router.push(
                              `/battle?id=${selectedCategory.baseId}&categoryKey=${selectedCategory.id}&title=${encodeURIComponent(selectedCategory.name)}&difficulty=${difficulty}&level=${level}` as any
                            );
                          }}
                        >
                          <Ionicons name="flash" size={14} color="#fff" />
                        </Pressable>
                      </View>
                    ) : (
                      <View style={s.lvLockedRow}>
                        <Text style={s.lvLockedText}>LOCKED</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2A0A80' },
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8B5CF6', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  coinPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7,
    shadowColor: GOLD, shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
    flexShrink: 0,
  },
  coinText: { fontSize: 13, fontWeight: '900', color: '#1A0845' },
  avatarRing: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF', overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)',
    flexShrink: 0,
    marginBottom: 6,
  },
  avatarImg: { width: 40, height: 40 },
  avatarFallback: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,107,179,0.15)' },

  // ScrollView
  scroll: { paddingTop: 4, paddingBottom: 160 },

  // Info card (level detail view)
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, marginBottom: 16,
    shadowColor: '#8B5CF6', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 5,
  },
  infoIcon: {
    width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  infoBody: { flex: 1, minWidth: 0 },
  infoTitle: { fontSize: 17, fontWeight: '900', color: '#1A0845', marginBottom: 4 },
  infoDesc:  { fontSize: 12, color: '#8B7EB5', lineHeight: 17, marginBottom: 8 },
  infoTags:  { flexDirection: 'row', gap: 6 },
  tagPink:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: '#FFEAF3' },
  tagPinkText:   { fontSize: 10, fontWeight: '800', color: DEEP_PINK, letterSpacing: 0.4 },
  tagPurple: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: '#F0EAFF' },
  tagPurpleText: { fontSize: 10, fontWeight: '800', color: PURPLE_BTN, letterSpacing: 0.4 },

  // Category grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: {
    borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', paddingBottom: 12, overflow: 'hidden',
    shadowColor: '#8B5CF6', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5,
  },
  catIconBg: {
    width: '100%', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, marginBottom: 8, position: 'relative',
  },
  catDonePin: { position: 'absolute', bottom: 8, right: 18 },
  catName:    { fontSize: 12, fontWeight: '900', color: '#1A0845', textAlign: 'center', paddingHorizontal: 8, marginBottom: 5 },
  catStars:   { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 6 },
  catProgress:{ fontSize: 9, fontWeight: '800', color: '#8B7EB5', marginLeft: 4 },
  catTrack:   { width: '80%', height: 4, borderRadius: 99, backgroundColor: 'rgba(168,148,228,0.2)', overflow: 'hidden', marginBottom: 8 },
  catFill:    { height: '100%', borderRadius: 99 },
  catBtn:     { width: '80%', paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  catBtnText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  premiumBadge: {
    position: 'absolute', right: -1, top: -1,
    width: 45, height: 45, borderBottomLeftRadius: 13,
    backgroundColor: '#d60083', alignItems: 'center', justifyContent: 'center',
    borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#fff4b8',
  },
  premiumPrice: { position: 'absolute', bottom: 3, color: '#fff', fontSize: 9, fontWeight: '900' },

  // Level grid
  lvGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  lvCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10,
    alignItems: 'center',
    shadowColor: '#8B5CF6', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5,
  },
  lvLocked: { opacity: 0.55 },
  lvStars:  { flexDirection: 'row', gap: 3, alignSelf: 'flex-start', marginBottom: 8 },

  lvBadge: {
    width: 62, height: 62, borderRadius: 31,
    borderWidth: 2.5, borderColor: PURPLE_BTN, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    shadowColor: PURPLE_BTN, shadowOpacity: 0.20, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 3,
  },
  lvBadgeDone: { backgroundColor: PURPLE_BTN, borderColor: PURPLE_BTN },
  lvBadgeGray: { borderColor: '#C4B8E0', backgroundColor: '#F5F0FF', shadowOpacity: 0 },
  lvNum: { color: PURPLE_BTN, fontWeight: '900', fontSize: 22 },

  lvTitle: { fontWeight: '900', fontSize: 13, color: '#1A0845', marginBottom: 2, textAlign: 'center' },
  lvMeta:  { fontSize: 10, fontWeight: '700', color: '#8B7EB5', textAlign: 'center', marginBottom: 6 },
  lvFound: { fontSize: 10, fontWeight: '800', color: DEEP_PINK, marginBottom: 4 },

  lvTrack: { width: '100%', height: 5, borderRadius: 99, backgroundColor: 'rgba(168,148,228,0.2)', overflow: 'hidden', marginBottom: 8 },
  lvFill:  { height: '100%', borderRadius: 99 },

  lvActions: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' },
  lvPlayBtn: {
    flex: 1, height: 34, borderRadius: 10,
    backgroundColor: DEEP_PINK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  lvPlayText:  { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  lvBattleBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PURPLE_BTN, alignItems: 'center', justifyContent: 'center',
  },
  lvLockedRow: {
    width: '100%', paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#C4B8E0', alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  lvLockedText: { color: '#C4B8E0', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
});
