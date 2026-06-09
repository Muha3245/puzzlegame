import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Scheme = 'light' | 'dark';

// Single candy-glass palette — no visual distinction between light and dark.
const CANDY = {
  bg:      '#2A0A80',
  surface: 'rgba(30,8,90,0.62)',
  ink:     '#FFFFFF',
  muted:   'rgba(255,255,255,0.70)',
  divider: 'rgba(255,255,255,0.18)',
};

export const LIGHT = CANDY;
export const DARK  = CANDY;

interface ThemeCtx {
  scheme: Scheme;
  toggle: () => void;
  C: typeof CANDY;
}

const ThemeContext = createContext<ThemeCtx>({
  scheme: 'light',
  toggle: () => {},
  C: CANDY,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setScheme] = useState<Scheme>('light');

  useEffect(() => {
    AsyncStorage.getItem('@app:theme').then((v) => {
      if (v === 'dark' || v === 'light') setScheme(v);
    }).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setScheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem('@app:theme', next).catch(() => {});
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ scheme, toggle, C: CANDY }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeCtx {
  return useContext(ThemeContext);
}
