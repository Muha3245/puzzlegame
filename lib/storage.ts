// lib/storage.ts
// AsyncStorage-backed app state hook.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type MusicTheme = 'relax' | 'candy' | 'forest' | 'puzzle';

export type PlayerProfile = {
  name: string;
  avatar: string;
  levelTitle: string;
};

export type AppState = {
  coins: number;
  progress: Record<string, number>;
  settings: {
    sound: boolean;
    music: boolean;
    musicTheme: MusicTheme;
    haptics: boolean;
    notify: boolean;
  };
  profile: PlayerProfile;
};

const DEFAULTS: AppState = {
  coins: 300,
  progress: {},
  settings: {
    sound: true,
    music: true,
    musicTheme: 'relax',
    haptics: true,
    notify: true,
  },
  profile: {
    name: 'Player',
    avatar: '🧘',
    levelTitle: 'Calm Solver',
  },
};

const KEY = '@wordsearch:state';

let cache: AppState | null = null;
const listeners = new Set<() => void>();

async function load() {
  if (cache) return cache;

  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    cache = {
      ...DEFAULTS,
      ...parsed,
      settings: {
        ...DEFAULTS.settings,
        ...(parsed.settings || {}),
      },
      profile: {
        ...DEFAULTS.profile,
        ...(parsed.profile || {}),
      },
    };
  } catch {
    cache = DEFAULTS;
  }

  return cache!;
}

async function save() {
  if (!cache) return;

  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {}
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function useAppState() {
  const [state, setState] = useState<AppState>(cache || DEFAULTS);

  useEffect(() => {
    let mounted = true;

    load().then((loadedState) => {
      if (mounted) setState(loadedState);
    });

    const listener = () => setState({ ...cache! });
    listeners.add(listener);

    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  const update = useCallback((diff: Partial<AppState>) => {
    cache = { ...(cache || DEFAULTS), ...diff };
    save();
    notify();
  }, []);

  const addCoins = useCallback((amount: number) => {
    cache = {
      ...(cache || DEFAULTS),
      coins: Math.max(0, (cache?.coins ?? DEFAULTS.coins) + amount),
    };

    save();
    notify();
  }, []);

  const setWordsFound = useCallback((catId: string, count: number) => {
    const prev = cache?.progress[catId] ?? 0;
    if (count <= prev) return;

    cache = {
      ...(cache || DEFAULTS),
      progress: {
        ...(cache?.progress || {}),
        [catId]: count,
      },
    };

    save();
    notify();
  }, []);

  const updateProfile = useCallback((diff: Partial<PlayerProfile>) => {
    cache = {
      ...(cache || DEFAULTS),
      profile: {
        ...(cache?.profile || DEFAULTS.profile),
        ...diff,
      },
    };

    save();
    notify();
  }, []);

  const updateSettings = useCallback((diff: Partial<AppState['settings']>) => {
    cache = {
      ...(cache || DEFAULTS),
      settings: {
        ...(cache?.settings || DEFAULTS.settings),
        ...diff,
      },
    };

    save();
    notify();
  }, []);

  return {
    state,
    update,
    addCoins,
    setWordsFound,
    updateSettings,
    updateProfile,
  };
}
