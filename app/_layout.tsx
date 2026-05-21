// app/_layout.tsx
// Root Stack + full-app background music controller.

import { useEffect } from 'react';
import { Stack, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { playRelaxMusic, getScreenMusicTheme } from '../lib/audio';
import { useAppState } from '../lib/storage';

export default function RootLayout() {
  const { state } = useAppState();
  const navigationState = useRootNavigationState();

  const currentRoute = navigationState?.routes[navigationState.routes.length - 1]?.name || 'index';

  useEffect(() => {
    const screenTheme = getScreenMusicTheme(currentRoute);
    const themeToPlay = state.settings.musicTheme === 'relax' ? screenTheme : state.settings.musicTheme;
    playRelaxMusic(state.settings.music, themeToPlay, state.settings.musicVolume ?? 0.5);
  }, [state.settings.music, state.settings.musicTheme, state.settings.musicVolume, currentRoute]);

  return (
    <>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0D0500' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="levels" />
        <Stack.Screen name="game" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="battle" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="login" />
        <Stack.Screen name="shop" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="coins" options={{ animationEnabled: true }} />
        <Stack.Screen name="settings" options={{ animationEnabled: true }} />
        <Stack.Screen name="help" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="winner" />
      </Stack>
    </>
  );
}
