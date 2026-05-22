import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import { CATEGORIES } from '../constants/categories';
import { Theme, GlassEffects } from '../constants/theme';
import { HighlightText } from '../components/HighlightText';
import { useAppState } from '../lib/storage';
import { Ionicons } from '@expo/vector-icons';

const LEVELS_PER_CATEGORY = 8;
const BG_URI =
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80';

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
  {
    label: string;
    activeBg: string;
    text: string;
    gridSizes: number[];
    wordCounts: number[];
  }
> = {
  easy: {
    label: 'EASY',
    activeBg: '#f5e7cf',
    text: '#c01882',
    gridSizes: [6, 6, 7, 7, 8, 8, 9, 9],
    wordCounts: [4, 5, 5, 6, 6, 7, 7, 8],
  },
  medium: {
    label: 'MEDIUM',
    activeBg: '#eaff00',
    text: '#c01882',
    gridSizes: [7, 8, 8, 9, 9, 10, 10, 11],
    wordCounts: [5, 6, 6, 7, 7, 8, 8, 9],
  },
  hard: {
    label: 'HARD',
    activeBg: '#ffb1dc',
    text: '#9c096d',
    gridSizes: [8, 9, 9, 10, 10, 11, 11, 12],
    wordCounts: [6, 6, 7, 8, 8, 9, 9, 10],
  },
  pro: {
    label: 'PRO',
    activeBg: '#b9a7ff',
    text: '#4b218d',
    gridSizes: [9, 10, 10, 11, 11, 12, 12, 13],
    wordCounts: [7, 8, 8, 9, 9, 10, 10, 11],
  },
};

const CATEGORY_NAMES: Record<DifficultyId, string[]> = {
  easy: [
    'Animals',
    'Colors',
    'Cities',
    'Nature',
    'House',
    'Adjectives',
    'Food',
    'Fruits',
    'Family',
    'Weather',
    'Shapes',
    'Toys',
  ],
  medium: [
    'Sports',
    'Music',
    'School',
    'Body',
    'Jobs',
    'Transport',
    'Space',
    'Ocean',
    'Numbers',
    'Time',
    'Clothes',
    'Vegetables',
  ],
  hard: [
    'TV Shows',
    'Countries',
    'Monuments',
    'Actors & Directors',
    'Writers',
    'History',
    'Tools',
    'Emotions',
    'Planets',
    'Sea Life',
    'Math',
    'Games',
  ],
  pro: [
    'Mythology',
    'Science',
    'Technology',
    'Business',
    'Adventure',
    'Mystery',
    'Fantasy',
    'Pirates',
    'Robots',
    'Dinosaurs',
    'Magic',
    'Treasure',
  ],
};

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

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getCategorySet(difficulty: DifficultyId): GameCategory[] {
  const base = CATEGORIES.length ? CATEGORIES : [];
  const names = CATEGORY_NAMES[difficulty];

  return names.map((name, index) => {
    const source = base[index % base.length] ?? base[0];

    return {
      id: `${difficulty}-${slugify(name)}-${index + 1}`,
      name,
      baseId: source.id,
      baseIndex: index,
      price:
        difficulty === 'easy'
          ? index >= 9
            ? 75
            : undefined
          : difficulty === 'medium'
            ? index >= 6
              ? 100 + (index - 6) * 25
              : undefined
            : difficulty === 'hard'
              ? 125 + Math.max(0, index - 4) * 25
              : 200 + index * 25,
    };
  });
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
    case 'animals':
      return '#b50061';
    case 'colors':
      return '#c7008f';
    case 'cities':
      return '#ff7a00';
    case 'nature':
      return '#f2aa00';
    case 'house':
      return '#2567d8';
    case 'adjectives':
      return '#6b149a';
    case 'tv':
      return '#ff8a00';
    case 'countries':
      return '#d90046';
    case 'monuments':
      return '#ff6a00';
    case 'actors':
      return '#ff8a16';
    case 'writers':
      return '#d90046';
    case 'history':
      return '#6a126d';
    case 'family':
      return '#23a6d5';
    case 'food':
      return '#ff4f43';
    case 'fruits':
      return '#f36b21';
    case 'vegetables':
      return '#42b246';
    case 'sports':
      return '#0da16f';
    case 'music':
      return '#8d37c9';
    case 'school':
      return '#2b74d9';
    case 'body':
      return '#e64d7a';
    case 'jobs':
      return '#2f5f9f';
    case 'transport':
      return '#ff8a00';
    case 'space':
      return '#4a3bd1';
    case 'ocean':
      return '#0a9fd6';
    case 'weather':
      return '#f2b600';
    case 'shapes':
      return '#6b149a';
    case 'numbers':
      return '#0e8ccf';
    case 'time':
      return '#5e62d9';
    case 'emotions':
      return '#ff8c2a';
    case 'toys':
      return '#dc2fb6';
    case 'clothes':
      return '#d9437d';
    case 'tools':
      return '#677285';
    case 'mythology':
      return '#8950ff';
    case 'science':
      return '#00a3a3';
    case 'technology':
      return '#3d6dff';
    case 'adventure':
      return '#f36b21';
    case 'mystery':
      return '#3b2c5f';
    case 'magic':
      return '#b330ff';
    case 'treasure':
      return '#d89000';
    case 'dinosaurs':
      return '#2aa84a';
    default:
      return '#ff7a00';
  }
}

function CategorySvgIcon({ name, size = 82 }: { name: string; size?: number }) {
  const color = getIconColor(name);
  const type = getCategoryType(name);

  if (type === 'animals') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Ellipse cx="50" cy="56" rx="24" ry="30" fill={color} />
        <Circle cx="25" cy="35" r="7" fill={color} />
        <Circle cx="38" cy="25" r="7" fill={color} />
        <Circle cx="55" cy="22" r="7" fill={color} />
        <Circle cx="72" cy="35" r="7" fill={color} />
      </Svg>
    );
  }

  if (type === 'colors') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="34" r="20" fill="#d9008b" />
        <Circle cx="35" cy="58" r="20" fill="#6c00a8" />
        <Circle cx="65" cy="58" r="20" fill="#efb3bd" />
      </Svg>
    );
  }

  if (type === 'cities') {
    return (
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
  }

  if (type === 'nature') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M48 78 C48 60 48 48 46 31" stroke={color} strokeWidth="8" strokeLinecap="round" fill="none" />
        <Path d="M48 41 C33 36 23 28 18 15 C37 14 51 22 54 39 Z" fill={color} />
        <Path d="M51 47 C65 40 73 31 78 18 C61 18 49 27 47 44 Z" fill={color} />
      </Svg>
    );
  }

  if (type === 'house') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M16 48 L50 18 L84 48" fill={color} />
        <Rect x="25" y="47" width="50" height="34" fill={color} />
        <Rect x="44" y="60" width="13" height="21" fill="#fff" />
        <Rect x="31" y="57" width="10" height="10" fill="#fff" />
        <Rect x="60" y="57" width="10" height="10" fill="#fff" />
      </Svg>
    );
  }

  if (type === 'adjectives') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Line x1="12" y1="28" x2="88" y2="28" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <Line x1="12" y1="68" x2="88" y2="68" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <Circle cx="24" cy="50" r="10" fill={color} />
        <Polygon points="49,39 62,61 36,61" fill={color} />
        <Rect x="68" y="39" width="20" height="22" fill={color} />
      </Svg>
    );
  }

  if (type === 'tv') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect x="18" y="28" width="64" height="48" rx="5" stroke={color} strokeWidth="7" fill="none" />
        <Path d="M41 43 L61 52 L41 61 Z" fill={color} />
        <Line x1="35" y1="85" x2="65" y2="85" stroke={color} strokeWidth="6" strokeLinecap="round" />
      </Svg>
    );
  }

  if (type === 'countries') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path
          d="M72 16 C58 18 47 22 39 30 C29 40 21 51 18 67 C31 74 47 80 62 79 C74 78 83 69 84 57 C72 59 66 53 70 43 C74 34 80 28 72 16 Z"
          fill={color}
        />
        <Circle cx="38" cy="48" r="5" fill="#fff" opacity="0.8" />
      </Svg>
    );
  }

  if (type === 'monuments') {
    return (
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
  }

  if (type === 'actors') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M18 25 C33 17 48 20 56 32 C52 65 27 71 16 51 C12 42 12 31 18 25 Z" fill={color} />
        <Path d="M51 38 C62 26 79 27 86 36 C86 67 62 76 48 58 C48 50 49 44 51 38 Z" fill={color} opacity="0.75" />
        <Path d="M25 46 C32 52 40 52 47 46" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
        <Path d="M58 51 C65 47 72 47 79 51" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
      </Svg>
    );
  }

  if (type === 'writers') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M24 75 L39 28 C41 20 50 16 58 18 L70 22 L56 67 Z" fill={color} />
        <Path d="M24 75 L20 88 L33 81 Z" fill={color} />
        <Line x1="65" y1="70" x2="86" y2="70" stroke={color} strokeWidth="6" strokeLinecap="round" />
      </Svg>
    );
  }

  if (type === 'history') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M24 18 H66 C77 18 83 25 83 36 V82 H34 C24 82 18 76 18 66 V24 C18 21 21 18 24 18 Z" fill={color} />
        <Path d="M66 18 C58 22 57 33 66 37 H83 C83 25 77 18 66 18 Z" fill="#fff" opacity="0.55" />
        <Line x1="33" y1="45" x2="62" y2="45" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        <Line x1="33" y1="58" x2="58" y2="58" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      </Svg>
    );
  }

  if (type === 'food') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="49" cy="52" r="31" fill={color} />
        <Circle cx="49" cy="52" r="20" fill="#fff" opacity="0.85" />
        <Path d="M72 18 V82" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <Path d="M20 20 V44 C20 55 34 55 34 44 V20" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
      </Svg>
    );
  }

  if (type === 'fruits') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M49 32 C25 30 18 48 25 67 C33 88 50 83 50 83 C50 83 67 88 75 67 C82 48 75 30 51 32 Z" fill={color} />
        <Path d="M51 30 C54 20 62 15 74 16 C70 28 62 33 51 30 Z" fill="#42b246" />
        <Path d="M50 32 C49 24 47 19 43 15" stroke="#7d4a1e" strokeWidth="5" strokeLinecap="round" />
      </Svg>
    );
  }

  if (type === 'vegetables') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M48 80 C30 63 32 40 49 29 C66 40 68 63 50 80 Z" fill={color} />
        <Path d="M47 30 C37 22 27 20 17 23 C24 35 35 39 47 30 Z" fill="#66c95f" />
        <Path d="M53 30 C63 20 74 18 84 22 C77 35 65 39 53 30 Z" fill="#66c95f" />
      </Svg>
    );
  }

  if (type === 'sports') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="34" fill={color} />
        <Path d="M18 50 C36 43 64 43 82 50" stroke="#fff" strokeWidth="5" fill="none" />
        <Path d="M50 16 C43 34 43 66 50 84" stroke="#fff" strokeWidth="5" fill="none" />
        <Path d="M50 16 C57 34 57 66 50 84" stroke="#fff" strokeWidth="5" fill="none" />
      </Svg>
    );
  }

  if (type === 'music') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M38 28 L75 20 V64" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Line x1="38" y1="28" x2="38" y2="70" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <Ellipse cx="30" cy="74" rx="15" ry="10" fill={color} />
        <Ellipse cx="67" cy="68" rx="15" ry="10" fill={color} />
      </Svg>
    );
  }

  if (type === 'school') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M18 34 L50 18 L82 34 L50 50 Z" fill={color} />
        <Path d="M28 44 V65 C40 75 60 75 72 65 V44 L50 56 Z" fill={color} opacity="0.82" />
        <Line x1="82" y1="34" x2="82" y2="58" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <Circle cx="82" cy="65" r="5" fill={color} />
      </Svg>
    );
  }

  if (type === 'body') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M50 82 C30 66 18 54 18 38 C18 25 28 18 39 23 C45 26 48 31 50 35 C52 31 55 26 61 23 C72 18 82 25 82 38 C82 54 70 66 50 82 Z" fill={color} />
      </Svg>
    );
  }

  if (type === 'jobs') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect x="18" y="35" width="64" height="43" rx="8" fill={color} />
        <Path d="M38 35 V27 C38 22 42 19 47 19 H53 C58 19 62 22 62 27 V35" stroke={color} strokeWidth="7" fill="none" />
        <Rect x="42" y="50" width="16" height="10" rx="2" fill="#fff" opacity="0.85" />
      </Svg>
    );
  }

  if (type === 'transport') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M18 55 L28 32 H70 L82 55 V73 H18 Z" fill={color} />
        <Rect x="34" y="39" width="28" height="13" fill="#fff" opacity="0.85" />
        <Circle cx="31" cy="75" r="8" fill="#333" />
        <Circle cx="69" cy="75" r="8" fill="#333" />
      </Svg>
    );
  }

  if (type === 'space') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="48" cy="50" r="25" fill={color} />
        <Path d="M16 59 C37 42 65 35 86 39 C72 58 40 71 16 59 Z" stroke={color} strokeWidth="6" fill="none" />
        <Circle cx="58" cy="41" r="5" fill="#fff" opacity="0.8" />
      </Svg>
    );
  }

  if (type === 'ocean') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M14 58 C25 47 36 47 47 58 C58 69 69 69 86 54 V76 H14 Z" fill={color} />
        <Path d="M20 39 C30 30 40 30 50 39 C60 48 70 48 80 39" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none" />
      </Svg>
    );
  }

  if (type === 'weather') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="36" cy="36" r="20" fill="#ffc82e" />
        <Path d="M31 68 H73 C83 68 88 62 88 54 C88 45 81 39 72 41 C68 31 59 26 49 28 C39 30 33 37 32 47 C22 47 15 52 15 60 C15 66 21 68 31 68 Z" fill={color} />
      </Svg>
    );
  }

  if (type === 'shapes') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="32" cy="35" r="18" fill={color} />
        <Rect x="50" y="20" width="32" height="32" rx="4" fill={color} opacity="0.82" />
        <Polygon points="50,60 78,86 22,86" fill={color} opacity="0.65" />
      </Svg>
    );
  }

  if (type === 'numbers') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect x="20" y="18" width="60" height="64" rx="14" fill={color} />
        <Path d="M36 62 H48 M42 62 V38 L35 44" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M58 40 C70 36 76 50 62 59 C58 62 56 65 56 65 H74" stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" />
      </Svg>
    );
  }

  if (type === 'time') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="33" fill={color} />
        <Circle cx="50" cy="50" r="25" fill="#fff" opacity="0.9" />
        <Line x1="50" y1="50" x2="50" y2="32" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <Line x1="50" y1="50" x2="66" y2="58" stroke={color} strokeWidth="6" strokeLinecap="round" />
      </Svg>
    );
  }

  if (type === 'emotions') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="34" fill={color} />
        <Circle cx="38" cy="42" r="5" fill="#fff" />
        <Circle cx="62" cy="42" r="5" fill="#fff" />
        <Path d="M34 60 C43 72 57 72 66 60" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" />
      </Svg>
    );
  }

  if (type === 'toys') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect x="25" y="25" width="50" height="50" rx="10" fill={color} />
        <Circle cx="37" cy="37" r="8" fill="#fff" opacity="0.85" />
        <Circle cx="63" cy="37" r="8" fill="#fff" opacity="0.85" />
        <Circle cx="37" cy="63" r="8" fill="#fff" opacity="0.85" />
        <Circle cx="63" cy="63" r="8" fill="#fff" opacity="0.85" />
      </Svg>
    );
  }

  if (type === 'clothes') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M33 21 C39 31 61 31 67 21 L84 35 L73 49 V82 H27 V49 L16 35 Z" fill={color} />
        <Path d="M40 24 C44 31 56 31 60 24" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
      </Svg>
    );
  }

  if (type === 'tools') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M66 17 C75 17 82 24 82 33 C82 37 81 40 79 43 L65 29 L55 39 L69 53 C66 55 62 56 58 56 C49 56 42 49 42 40 C42 37 43 34 44 31 L18 57 C13 62 13 70 18 75 C23 80 31 80 36 75 L62 49" fill={color} />
      </Svg>
    );
  }

  if (type === 'mythology') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M50 14 L70 38 L61 82 H39 L30 38 Z" fill={color} />
        <Path d="M35 38 H65" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <Circle cx="50" cy="32" r="8" fill="#fff" opacity="0.82" />
      </Svg>
    );
  }

  if (type === 'science') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M42 18 H58 V38 L78 75 C82 82 77 88 69 88 H31 C23 88 18 82 22 75 L42 38 Z" fill={color} />
        <Path d="M33 70 H67" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <Circle cx="44" cy="58" r="5" fill="#fff" />
        <Circle cx="57" cy="68" r="4" fill="#fff" />
      </Svg>
    );
  }

  if (type === 'technology') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect x="22" y="22" width="56" height="56" rx="14" fill={color} />
        <Circle cx="40" cy="45" r="6" fill="#fff" />
        <Circle cx="60" cy="45" r="6" fill="#fff" />
        <Path d="M38 62 H62" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        <Line x1="38" y1="16" x2="38" y2="22" stroke={color} strokeWidth="5" />
        <Line x1="62" y1="16" x2="62" y2="22" stroke={color} strokeWidth="5" />
      </Svg>
    );
  }

  if (type === 'adventure') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="35" fill={color} />
        <Polygon points="50,22 60,54 50,78 40,54" fill="#fff" opacity="0.9" />
        <Polygon points="50,22 60,54 50,50" fill="#ffd84d" />
      </Svg>
    );
  }

  if (type === 'mystery') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="34" fill={color} />
        <Path d="M39 39 C41 28 61 28 62 41 C63 52 50 52 50 63" stroke="#fff" strokeWidth="8" strokeLinecap="round" fill="none" />
        <Circle cx="50" cy="75" r="5" fill="#fff" />
      </Svg>
    );
  }

  if (type === 'magic') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M28 76 L72 32" stroke={color} strokeWidth="10" strokeLinecap="round" />
        <Path d="M66 18 L70 29 L82 30 L72 37 L75 49 L66 42 L56 49 L60 37 L50 30 L62 29 Z" fill={color} />
        <Circle cx="31" cy="29" r="5" fill={color} />
        <Circle cx="79" cy="72" r="5" fill={color} />
      </Svg>
    );
  }

  if (type === 'treasure') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M20 46 C22 28 35 20 50 20 C65 20 78 28 80 46 V78 H20 Z" fill={color} />
        <Rect x="20" y="46" width="60" height="32" fill={color} />
        <Rect x="45" y="46" width="10" height="32" fill="#fff" opacity="0.72" />
        <Circle cx="50" cy="61" r="6" fill="#ffd84d" />
      </Svg>
    );
  }

  if (type === 'dinosaurs') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M20 62 C24 39 45 28 67 35 C78 39 84 47 84 56 C84 68 72 77 55 77 H34 C25 77 18 71 20 62 Z" fill={color} />
        <Circle cx="68" cy="47" r="4" fill="#fff" />
        <Path d="M32 34 L38 22 L45 35" fill={color} />
      </Svg>
    );
  }

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
    <View style={styles.premiumBadge}>
      <Svg width={30} height={30} viewBox="0 0 100 100">
        <Path
          d="M50 8 L61 35 L90 38 L68 57 L75 86 L50 70 L25 86 L32 57 L10 38 L39 35 Z"
          fill="#FFD21F"
          stroke="#FFF5B8"
          strokeWidth="8"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.premiumPrice}>{price}</Text>
    </View>
  );
}

function FloatingCategoryCard({
  item,
  width,
  onPress,
  completedCount,
  premiumPrice,
}: {
  item: GameCategory;
  width: number;
  onPress: () => void;
  completedCount: number;
  premiumPrice?: number;
}) {
  const float = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1450,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1450,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [float]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  const progressWidth = `${(completedCount / LEVELS_PER_CATEGORY) * 100}%`;

  return (
    <Animated.View style={{ width, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
        style={styles.categoryCard}
      >
        <View style={styles.progressTop}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth as any }]} />
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{completedCount}/{LEVELS_PER_CATEGORY}</Text>
          </View>
        </View>

        <View style={styles.iconWrap}>
          <CategorySvgIcon name={item.name} size={86} />
        </View>

        <View style={styles.categoryTitleWrap}>
          <Text numberOfLines={2} style={styles.categoryTitle}>
            {item.name}
          </Text>
        </View>

        {premiumPrice ? <PremiumStarBadge price={premiumPrice} /> : null}
      </Pressable>
    </Animated.View>
  );
}

function DifficultyTabs({
  active,
  onChange,
}: {
  active: DifficultyId;
  onChange: (value: DifficultyId) => void;
}) {
  return (
    <View style={styles.diffRow}>
      {DIFFICULTY_ORDER.map((item) => {
        const isActive = item === active;

        return (
          <Pressable
            key={item}
            onPress={() => onChange(item)}
            style={[
              styles.diffBtn,
              isActive && {
                backgroundColor: DIFFICULTIES[item].activeBg,
                borderColor: '#ffffff',
                transform: [{ translateY: -2 }],
              },
            ]}
          >
            <Text style={[styles.diffBtnText, isActive && { color: DIFFICULTIES[item].text }]}>
              {DIFFICULTIES[item].label}
            </Text>

            {isActive ? <View style={styles.activeDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

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

  const columns = width >= 500 ? 3 : 2;
  const gap = 14;
  const horizontalPadding = 16;
  const usableWidth = width - insets.left - insets.right;
  const cardWidth = (usableWidth - horizontalPadding * 2 - gap * (columns - 1)) / columns;

  const isCompleted = (categoryId: string, wordsLength: number, level: number) => {
    const found = state.progress[makeProgressKey(categoryId, difficulty, level)] ?? 0;
    return found >= getNeedCount(wordsLength, difficulty, level);
  };

  const isUnlocked = (categoryId: string, wordsLength: number, level: number) => {
    if (level === 1) return true;
    return isCompleted(categoryId, wordsLength, level - 1);
  };

  const categoryCompletedCount = (categoryId: string, wordsLength: number) => {
    let done = 0;

    for (let level = 1; level <= LEVELS_PER_CATEGORY; level += 1) {
      if (isCompleted(categoryId, wordsLength, level)) done += 1;
    }

    return done;
  };

  const onDifficultyChange = (item: DifficultyId) => {
    if (selectedCategory) {
      const nextSet = getCategorySet(item);
      const nextCategory = nextSet[selectedCategory.baseIndex % nextSet.length] ?? nextSet[0];
      // Set params first so selectedCategory re-derives from the new category id atomically
      router.setParams({ category: nextCategory.id, difficulty: item });
    } else {
      router.setParams({ difficulty: item });
    }
    setDifficulty(item);
  };

  const openCategory = (categoryId: string) => {
    router.push(`/levels?category=${categoryId}&difficulty=${difficulty}`);
  };

  const backToCategories = () => {
    router.replace(`/levels?difficulty=${difficulty}`);
  };

  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <StatusBar barStyle="light-content" />

        {!selectedCategory ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              {
                paddingLeft: Math.max(16, insets.left + 16),
                paddingRight: Math.max(16, insets.right + 16),
              },
            ]}
          >
            <View style={styles.topActions}>
              <Pressable onPress={() => router.push('/coins')} style={styles.coinPill}>
                <Ionicons name="logo-bitcoin" size={16} color={Theme.warn} />
                <Text style={styles.coinText}>{state.coins}</Text>
              </Pressable>

              <View style={styles.topActionGroup}>
                <Pressable onPress={() => router.push('/settings')} style={styles.topActionBtn}>
                  <Ionicons name="settings" size={18} color={Theme.primary} />
                </Pressable>

                <Pressable onPress={() => router.push('/leaderboard')} style={styles.topActionBtn}>
                  <Ionicons name="trophy" size={18} color={Theme.warn} />
                </Pressable>

                <Pressable onPress={() => router.push('/friends')} style={styles.topActionBtn}>
                  <Ionicons name="people" size={18} color={Theme.primary} />
                </Pressable>

                <Pressable onPress={() => router.push('/battle')} style={styles.topActionBtn}>
                  <Ionicons name="flash" size={18} color={Theme.danger} />
                </Pressable>

                <Pressable onPress={() => router.push('/profile')} style={styles.topActionBtn}>
                  <Ionicons name="person" size={18} color={Theme.textDim} />
                </Pressable>
              </View>
            </View>

            <View style={styles.titlePill}>
              <Text style={styles.titleText}>EXPLORE MANY THEMES</Text>
              <Text style={styles.titleSubText}>
                {DIFFICULTIES[difficulty].label} has its own category set
              </Text>
            </View>

            <DifficultyTabs active={difficulty} onChange={onDifficultyChange} />

            <View style={styles.categoryGrid}>
              {currentCategorySet.map((item) => {
                const baseCategory = CATEGORIES.find((cat) => cat.id === item.baseId) ?? CATEGORIES[0];
                const completed = categoryCompletedCount(item.id, baseCategory.words.length);

                return (
                  <FloatingCategoryCard
                    key={item.id}
                    item={item}
                    width={cardWidth}
                    completedCount={completed}
                    premiumPrice={item.price}
                    onPress={() => openCategory(item.id)}
                  />
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              {
                paddingLeft: Math.max(16, insets.left + 16),
                paddingRight: Math.max(16, insets.right + 16),
              },
            ]}
          >
            <View style={styles.levelHeader}>
              <Pressable onPress={backToCategories} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>

              <View style={styles.levelHeaderIcon}>
                <CategorySvgIcon name={selectedCategory.name} size={48} />
              </View>

              <View style={styles.levelHeaderText}>
                <Text style={styles.levelHeaderTitle}>{selectedCategory.name}</Text>
                <Text style={styles.levelHeaderSub}>
                  {DIFFICULTIES[difficulty].label} levels with growing grids
                </Text>
              </View>

              <View style={styles.headerActions}>
                <Pressable onPress={() => router.push('/shop')} style={styles.headerCoinPill}>
                  <Ionicons name="logo-bitcoin" size={13} color="#9c096d" />
                  <Text style={styles.headerCoinText}>{state.coins}</Text>
                </Pressable>

                <Pressable onPress={() => router.push('/settings')} style={styles.headerActionBtn}>
                  <Ionicons name="settings" size={16} color="#fff" />
                </Pressable>

                <Pressable onPress={() => router.push('/battle')} style={styles.headerActionBtn}>
                  <Ionicons name="flash" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>

            <DifficultyTabs active={difficulty} onChange={onDifficultyChange} />

            <View style={styles.levelGrid}>
              {Array.from({ length: LEVELS_PER_CATEGORY }).map((_, index) => {
                const level = index + 1;
                const baseCategory = CATEGORIES.find((cat) => cat.id === selectedCategory.baseId) ?? CATEGORIES[0];
                const need = getNeedCount(baseCategory.words.length, difficulty, level);
                const grid = DIFFICULTIES[difficulty].gridSizes[index];
                const found = state.progress[makeProgressKey(selectedCategory.id, difficulty, level)] ?? 0;
                const completed = found >= need;
                const unlocked = isUnlocked(selectedCategory.id, baseCategory.words.length, level);
                const progressWidth = need ? `${Math.min(100, (found / need) * 100)}%` : '0%';

                return (
                  <Pressable
                    key={`${selectedCategory.id}-${difficulty}-${level}`}
                    disabled={!unlocked}
                    onPress={() =>
                      router.push(
                        `/game?id=${selectedCategory.baseId}&categoryKey=${selectedCategory.id}&title=${encodeURIComponent(selectedCategory.name)}&difficulty=${difficulty}&level=${level}`
                      )
                    }
                    style={[styles.levelCard, completed && styles.levelCardDone, !unlocked && styles.levelCardLocked]}
                  >
                    <View style={styles.levelCardTop}>
                      <View style={styles.levelNumberCircle}>
                        <Text style={styles.levelNumber}>{level}</Text>
                      </View>

                      <View style={styles.levelStatusPill}>
                        <Text style={styles.levelStatusText}>
                          {completed ? 'DONE' : unlocked ? 'PLAY' : 'LOCK'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.levelCardTitle}>Level {level}</Text>
                    <Text style={styles.levelCardMeta}>Grid {grid}×{grid} • {need} words</Text>

                    <View style={styles.levelProgressTrack}>
                      <View style={[styles.levelProgressFill, { width: progressWidth as any }]} />
                    </View>

                    <Text style={styles.levelFoundText}>{Math.min(found, need)}/{need} found</Text>

                    {unlocked && (
                      <View style={styles.levelActionRow}>
                        <View style={styles.levelMiniBtn}>
                          <Text style={styles.levelMiniBtnText}>PLAY</Text>
                        </View>
                        <Pressable
                          onPress={(event) => {
                            event.stopPropagation();
                            router.push(
                              `/battle?id=${selectedCategory.baseId}&categoryKey=${selectedCategory.id}&title=${encodeURIComponent(selectedCategory.name)}&difficulty=${difficulty}&level=${level}`
                            );
                          }}
                          style={[styles.levelMiniBtn, styles.levelBattleBtn]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="flash" size={12} color="#0D0500" />
                            <Text style={[styles.levelMiniBtnText, { color: '#0D0500' }]}>BATTLE</Text>
                          </View>
                        </Pressable>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#0D0500',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,5,0,0.82)',
  },
  orb1: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,100,0,0.13)',
  },
  orb2: {
    position: 'absolute',
    bottom: 80,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,60,0,0.09)',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingTop: 10,
    paddingBottom: 34,
  },
  topActions: {
    width: '100%',
    maxWidth: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'nowrap',
  },
  topActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    flexShrink: 1,
  },
  coinPill: {
    minWidth: 68,
    maxWidth: 90,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 8,
    ...GlassEffects.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: Theme.warn,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 7,
    elevation: 6,
    flexShrink: 0,
  },
  coinText: {
    color: Theme.warn,
    fontSize: 13,
    fontWeight: '900',
  },
  topActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    ...GlassEffects.light,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 7,
    elevation: 6,
    flexShrink: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  headerCoinPill: {
    minWidth: 58,
    maxWidth: 76,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 7,
    backgroundColor: '#fff4d8',
    borderWidth: 1.5,
    borderColor: '#fff4b8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 5,
  },
  headerCoinText: {
    color: '#9c096d',
    fontSize: 12,
    fontWeight: '900',
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ff7a00',
    borderWidth: 1.5,
    borderColor: '#fff4b8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 5,
  },
  titlePill: {
    borderRadius: 999,
    paddingVertical: 17,
    paddingHorizontal: 18,
    marginBottom: 18,
    backgroundColor: '#ff7a00',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.88)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 2.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleSubText: {
    color: '#fff7dd',
    marginTop: 4,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  diffRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  diffBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 22,
    ...GlassEffects.light,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.primary,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 5,
    position: 'relative',
  },
  diffBtnText: {
    color: Theme.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  activeDot: {
    position: 'absolute',
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.primary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  categoryCard: {
    minHeight: 176,
    borderRadius: 14,
    ...GlassEffects.medium,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 13,
    paddingHorizontal: 9,
    shadowColor: Theme.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 7,
    elevation: 7,
    overflow: 'hidden',
  },
  progressTop: {
    width: '100%',
    position: 'relative',
    marginBottom: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(76,195,138,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Theme.success,
  },
  progressBadge: {
    position: 'absolute',
    right: -4,
    top: -5,
    backgroundColor: Theme.success,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  progressBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  iconWrap: {
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitleWrap: {
    backgroundColor: 'rgba(255,122,0,0.82)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 18,
    minHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  premiumBadge: {
    position: 'absolute',
    right: -1,
    top: -1,
    width: 45,
    height: 45,
    borderBottomLeftRadius: 13,
    backgroundColor: '#d60083',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#fff4b8',
  },
  premiumPrice: {
    position: 'absolute',
    bottom: 3,
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  levelHeader: {
    width: '100%',
    maxWidth: '100%',
    minHeight: 88,
    borderRadius: 22,
    backgroundColor: 'rgba(255,244,216,0.98)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 7,
    overflow: 'hidden',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ff7a00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
    flexShrink: 0,
  },
  levelHeaderIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#fff9e9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  levelHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  levelHeaderTitle: {
    color: '#2e2f3d',
    fontSize: 18,
    fontWeight: '900',
  },
  levelHeaderSub: {
    marginTop: 3,
    color: '#697083',
    fontSize: 10,
    fontWeight: '700',
  },
  levelGrid: {
    gap: 14,
  },
  levelCard: {
    borderRadius: 24,
    ...GlassEffects.medium,
    padding: 16,
    shadowColor: Theme.primary,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  levelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  levelCardDone: {
    borderColor: 'rgba(76,195,138,0.4)',
    backgroundColor: 'rgba(76,195,138,0.1)',
  },
  levelCardLocked: {
    opacity: 0.55,
  },
  levelNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.primary,
    borderWidth: 1.5,
    borderColor: 'rgba(255,150,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  levelStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(76,195,138,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76,195,138,0.3)',
  },
  levelStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.success,
  },
  levelCardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  levelCardMeta: {
    color: Theme.textDim,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
  },
  levelProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(76,195,138,0.2)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Theme.success,
  },
  levelFoundText: {
    color: Theme.textDim,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 12,
  },
  levelActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  levelMiniBtn: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBattleBtn: {
    backgroundColor: '#FFD23F',
  },
  levelMiniBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
