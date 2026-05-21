// app/_layout.tsx
// Root Stack + full-app background music controller.

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { playRelaxMusic } from '../lib/audio';
import { useAppState } from '../lib/storage';

export default function RootLayout() {
  const { state } = useAppState();

  useEffect(() => {
    playRelaxMusic(state.settings.music, state.settings.musicTheme);

    return () => {
      playRelaxMusic(false);
    };
  }, [state.settings.music, state.settings.musicTheme]);

  return (
    <>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A1230' },
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
        <Stack.Screen name="settings" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="help" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="winner" />
      </Stack>
    </>
  );
}
