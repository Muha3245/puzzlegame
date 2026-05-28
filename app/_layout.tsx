// app/_layout.tsx
// Root Stack + background music + global battle notification modal + global bottom tab bar.

import { router, Stack, usePathname } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useAppTheme } from '../lib/appTheme';
import BottomTabBar from '../components/BottomTabBar';
import {
  acceptBattleRoom,
  acceptXoxRoom,
  BattleRoom,
  getCurrentUserId,
  rejectBattleRoom,
  rejectXoxRoom,
  subscribeToIncomingBattles,
  subscribeToIncomingXox,
  XoxRoom,
} from '../lib/online';
import { BattleNotificationModal } from '../components/BattleNotificationModal';
import { XoxNotificationModal } from '../components/XoxNotificationModal';

function AppShell() {
  const { C } = useAppTheme();
  const pathname = usePathname();

  const [pendingBattle, setPendingBattle] = useState<BattleRoom | null>(null);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const shownRoomIds = useRef<Set<string>>(new Set());

  const [pendingXox, setPendingXox] = useState<XoxRoom | null>(null);
  const [xoxAcceptBusy, setXoxAcceptBusy] = useState(false);
  const shownXoxIds = useRef<Set<string>>(new Set());

  const hideBottomTab = useMemo(() => {
    const hiddenRoutes = [
      '/login',
      '/game',
      '/winner',
      '/shop',
      '/help',
      '/xox-room',
    ];

    return hiddenRoutes.some((route) => {
      return pathname === route || pathname.startsWith(`${route}/`);
    });
  }, [pathname]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    getCurrentUserId()
      .then((uid) => {
        if (!uid) return;

        cleanup = subscribeToIncomingBattles(uid, (room: BattleRoom) => {
          if (shownRoomIds.current.has(room.id)) return;
          shownRoomIds.current.add(room.id);
          setPendingBattle(room);
        });
      })
      .catch(() => {});

    return () => cleanup?.();
  }, []);

  useEffect(() => {
    let cleanupXox: (() => void) | undefined;

    getCurrentUserId()
      .then((uid) => {
        if (!uid) return;

        cleanupXox = subscribeToIncomingXox(uid, (room: XoxRoom) => {
          if (shownXoxIds.current.has(room.id)) return;
          shownXoxIds.current.add(room.id);
          setPendingXox(room);
        });
      })
      .catch(() => {});

    return () => cleanupXox?.();
  }, []);

  const handleAccept = async () => {
    if (!pendingBattle) return;

    setAcceptBusy(true);

    try {
      await acceptBattleRoom(pendingBattle);

      const room = pendingBattle;
      setPendingBattle(null);

      router.replace(
        `/game?id=${room.categoryId}&categoryKey=${room.categoryKey}&title=${encodeURIComponent(
          room.categoryTitle
        )}&difficulty=${room.difficulty}&level=${room.level}&mode=battle&roomId=${room.id}`
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

  const handleXoxAccept = async () => {
    if (!pendingXox) return;

    setXoxAcceptBusy(true);

    try {
      await acceptXoxRoom(pendingXox);

      const room = pendingXox;
      setPendingXox(null);

      router.replace(`/xox-room?roomId=${room.id}`);
    } catch {
      Alert.alert(
        'Error',
        'Could not accept XOX challenge. Open XOX Online to try again.'
      );
    } finally {
      setXoxAcceptBusy(false);
    }
  };

  const handleXoxReject = () => {
    if (!pendingXox) return;

    rejectXoxRoom(pendingXox).catch(() => {});
    setPendingXox(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />

      <View style={styles.stackWrap}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: C.bg,
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="offline" />
          <Stack.Screen name="levels" />
          <Stack.Screen name="xox" />
          <Stack.Screen name="game" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="friends" />
          <Stack.Screen name="battle" />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="login" />
          <Stack.Screen
            name="shop"
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
          <Stack.Screen name="coins" />
          <Stack.Screen name="settings" />
          <Stack.Screen
            name="help"
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
          <Stack.Screen name="winner" />
          <Stack.Screen name="xox-battle" />
          <Stack.Screen name="xox-room" />
        </Stack>
      </View>

      {!hideBottomTab && <BottomTabBar />}

      <BattleNotificationModal
        room={pendingBattle}
        onAccept={handleAccept}
        onReject={handleReject}
        acceptBusy={acceptBusy}
      />

      <XoxNotificationModal
        room={pendingXox}
        onAccept={handleXoxAccept}
        onReject={handleXoxReject}
        acceptBusy={xoxAcceptBusy}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  stackWrap: {
    flex: 1,
  },

  stackWithTab: {
    paddingBottom: 90,
  },
});