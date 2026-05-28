import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Scheme = 'light' | 'dark';

export const LIGHT = {
  bg:      '#EDE8E1',
  surface: '#FFFFFF',
  ink:     '#1C1C1E',
  muted:   '#8A8480',
  divider: '#D8D3CC',
};

export const DARK = {
  bg:      '#1C1917',
  surface: '#252220',
  ink:     '#F2EDE7',
  muted:   '#8A8480',
  divider: '#3A3531',
};

interface ThemeCtx {
  scheme: Scheme;
  toggle: () => void;
  C: typeof LIGHT;
}

const ThemeContext = createContext<ThemeCtx>({
  scheme: 'light',
  toggle: () => {},
  C: LIGHT,
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
    <ThemeContext.Provider value={{ scheme, toggle, C: scheme === 'dark' ? DARK : LIGHT }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeCtx {
  return useContext(ThemeContext);
}
