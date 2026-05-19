// app/_layout.tsx
// Root Stack — declares every route. Modals use modal presentation.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A1230' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="levels" />
        <Stack.Screen name="game" />
        <Stack.Screen name="shop"     options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="help"     options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack>
    </>
  );
}
