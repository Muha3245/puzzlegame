// app/_layout.tsx
// Root Stack + background music + global battle notification modal.

import { router, Stack, useRootNavigationState } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { playRelaxMusic, getScreenMusicTheme } from '../lib/audio';
import {
  acceptBattleRoom,
  BattleRoom,
  getCurrentUserId,
  rejectBattleRoom,
  subscribeToIncomingBattles,
} from '../lib/online';
import { useAppState } from '../lib/storage';
import { BattleNotificationModal } from '../components/BattleNotificationModal';

export default function RootLayout() {
  const { state } = useAppState();
  const navigationState = useRootNavigationState();

  const [pendingBattle, setPendingBattle] = useState<BattleRoom | null>(null);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const shownRoomIds = useRef<Set<string>>(new Set());

  const currentRoute = navigationState?.routes[navigationState.routes.length - 1]?.name || 'index';

  useEffect(() => {
    const screenTheme = getScreenMusicTheme(currentRoute);
    const themeToPlay = state.settings.musicTheme === 'relax' ? screenTheme : state.settings.musicTheme;
    playRelaxMusic(state.settings.music, themeToPlay, state.settings.musicVolume ?? 0.5);
  }, [state.settings.music, state.settings.musicTheme, state.settings.musicVolume, currentRoute]);

  // ── Global incoming battle notifications (fires on every screen) ──────────
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    getCurrentUserId().then((uid) => {
      if (!uid) return;

      cleanup = subscribeToIncomingBattles(uid, (room: BattleRoom) => {
        if (shownRoomIds.current.has(room.id)) return;
        shownRoomIds.current.add(room.id);
        setPendingBattle(room);
      });
    }).catch(() => {});

    return () => cleanup?.();
  }, []);

  const handleAccept = async () => {
    if (!pendingBattle) return;
    setAcceptBusy(true);
    try {
      await acceptBattleRoom(pendingBattle);
      const room = pendingBattle;
      setPendingBattle(null);
      // Use replace, not push — push stacks the game screen behind the still-visible
      // modal on winner/other screens, leaving the user frozen on "Joining…".
      router.replace(
        `/game?id=${room.categoryId}&categoryKey=${room.categoryKey}&title=${encodeURIComponent(room.categoryTitle)}&difficulty=${room.difficulty}&level=${room.level}&mode=battle&roomId=${room.id}`,
      );
    } catch {
      Alert.alert('Error', 'Could not accept battle. Try from Battle Arena.');
    } finally {
      setAcceptBusy(false);
    }
  };

  const handleReject = () => {
    if (!pendingBattle) return;
    rejectBattleRoom(pendingBattle).catch(() => {});
    setPendingBattle(null);
  };

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

      {/* Global battle challenge popup — appears over any screen */}
      <BattleNotificationModal
        room={pendingBattle}
        onAccept={handleAccept}
        onReject={handleReject}
        acceptBusy={acceptBusy}
      />
    </>
  );
}
