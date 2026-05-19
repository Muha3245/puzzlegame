// lib/storage.ts
// AsyncStorage-backed app state hook.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type AppState = {
  coins: number;
  progress: Record<string, number>;
  settings: { sound: boolean; music: boolean; haptics: boolean; notify: boolean };
};

const DEFAULTS: AppState = {
  coins: 300,
  progress: {},
  settings: { sound: true, music: true, haptics: true, notify: true },
};

const KEY = '@wordsearch:state';

let cache: AppState | null = null;
const listeners = new Set<() => void>();

async function load() {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache!;
}

async function save() {
  if (!cache) return;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
}

function notify() { listeners.forEach((l) => l()); }

export function useAppState() {
  const [state, setState] = useState<AppState>(cache || DEFAULTS);

  useEffect(() => {
    let mounted = true;
    load().then((s) => { if (mounted) setState(s); });
    const listener = () => setState({ ...cache! });
    listeners.add(listener);
    return () => { mounted = false; listeners.delete(listener); };
  }, []);

  const update = useCallback((diff: Partial<AppState>) => {
    cache = { ...(cache || DEFAULTS), ...diff };
    save();
    notify();
  }, []);

  const addCoins = useCallback((n: number) => {
    cache = { ...(cache || DEFAULTS), coins: (cache?.coins ?? DEFAULTS.coins) + n };
    save(); notify();
  }, []);

  const setWordsFound = useCallback((catId: string, count: number) => {
    const prev = cache?.progress[catId] ?? 0;
    if (count <= prev) return;
    cache = {
      ...(cache || DEFAULTS),
      progress: { ...(cache?.progress || {}), [catId]: count },
    };
    save(); notify();
  }, []);

  const updateSettings = useCallback((diff: Partial<AppState['settings']>) => {
    cache = {
      ...(cache || DEFAULTS),
      settings: { ...(cache?.settings || DEFAULTS.settings), ...diff },
    };
    save(); notify();
  }, []);

  return { state, update, addCoins, setWordsFound, updateSettings };
}
