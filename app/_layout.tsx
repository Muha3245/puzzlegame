// app/_layout.tsx
// Root Stack + background music + global battle notification modal + global bottom tab bar.

import { router, Stack, usePathname } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../lib/appTheme';
import BottomTabBar from '../components/BottomTabBar';
import { playBattleRequestSound, playBgMusic, playFriendRequest, stopBgMusic } from '../lib/audio';
import { getAppSettings, useAppState } from '../lib/storage';
import {
  acceptBattleRoom,
  acceptFriendRequest,
  acceptXoxRoom,
  BattleRoom,
  FriendRequest,
  getCurrentUserId,
  rejectFriendRequest,
  rejectBattleRoom,
  rejectXoxRoom,
  subscribeToIncomingFriendRequests,
  subscribeToIncomingBattles,
  subscribeToIncomingXox,
  XoxRoom,
} from '../lib/online';
import { supabase } from '../lib/supabase';
import { BattleNotificationModal } from '../components/BattleNotificationModal';
import { FriendRequestNotificationModal } from '../components/FriendRequestNotificationModal';
import { XoxNotificationModal } from '../components/XoxNotificationModal';
import { DEFAULT_BATTLE_STAKE } from '../lib/battleEconomy';

const ARENA_NAV_BACKGROUND = '#05091C';

function AppShell() {
  const pathname = usePathname();
  const { state } = useAppState();

  useEffect(() => {
    if (state.settings.sound) {
      playBgMusic(true).catch(() => {});
    } else {
      stopBgMusic();
    }
    return () => stopBgMusic();
  }, [state.settings.sound]);

  const [pendingBattle, setPendingBattle] = useState<BattleRoom | null>(null);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const shownRoomIds = useRef<Set<string>>(new Set());

  const [pendingXox, setPendingXox] = useState<XoxRoom | null>(null);
  const [xoxAcceptBusy, setXoxAcceptBusy] = useState(false);
  const shownXoxIds = useRef<Set<string>>(new Set());

  const [pendingFriend, setPendingFriend] = useState<FriendRequest | null>(null);
  const [friendAcceptBusy, setFriendAcceptBusy] = useState(false);
  const shownFriendIds = useRef<Set<string>>(new Set());

  const hideBottomTab = useMemo(() => {
    const hiddenRoutes = [
      '/login',
      '/game',
      '/winner',
      '/shop',
      '/help',
      '/xox-room',
    ];

    // Splash/loading screen lives at the index route ('/') — keep the bottom
    // tab bar hidden there so it doesn't flash over the loading animation.
    if (pathname === '/' || pathname === '/index') return true;

    return hiddenRoutes.some((route) => {
      return pathname === route || pathname.startsWith(`${route}/`);
    });
  }, [pathname]);

  useEffect(() => {
    let cleanups: (() => void)[] = [];

    const clearRealtime = () => {
      cleanups.forEach((cleanup) => cleanup());
      cleanups = [];
    };

    const subscribeForUser = (uid: string | null) => {
      clearRealtime();
      if (!uid) return;

      cleanups = [
        subscribeToIncomingBattles(uid, (room: BattleRoom) => {
          if (shownRoomIds.current.has(room.id)) return;
          shownRoomIds.current.add(room.id);
          playBattleRequestSound(getAppSettings().sound).catch(() => {});
          setPendingBattle(room);
        }),
        subscribeToIncomingXox(uid, (room: XoxRoom) => {
          if (shownXoxIds.current.has(room.id)) return;
          shownXoxIds.current.add(room.id);
          playBattleRequestSound(getAppSettings().sound).catch(() => {});
          setPendingXox(room);
        }),
        subscribeToIncomingFriendRequests(uid, (request: FriendRequest) => {
          if (shownFriendIds.current.has(request.id)) return;
          shownFriendIds.current.add(request.id);
          playFriendRequest(getAppSettings().sound).catch(() => {});
          setPendingFriend(request);
        }),
      ];
    };

    getCurrentUserId()
      .then((uid) => subscribeForUser(uid))
      .catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => subscribeForUser(session?.user?.id ?? null),
    );

    return () => {
      subscription.unsubscribe();
      clearRealtime();
    };
  }, []);

  const handleAccept = async () => {
    if (!pendingBattle) return;
    const battleStake = pendingBattle.stakeCoins ?? DEFAULT_BATTLE_STAKE;
    if (state.coins < battleStake) {
      Alert.alert(
        'Not enough coins',
        `This battle needs ${battleStake} coins. Your balance is ${state.coins}.`,
      );
      return;
    }

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
    const xoxStake = pendingXox.stakeCoins ?? DEFAULT_BATTLE_STAKE;
    if (state.coins < xoxStake) {
      Alert.alert(
        'Not enough coins',
        `This XOX battle needs ${xoxStake} coins. Your balance is ${state.coins}.`,
      );
      return;
    }

    setXoxAcceptBusy(true);

    try {
      await acceptXoxRoom(pendingXox);

      const room = pendingXox;
      setPendingXox(null);

      router.replace(`/xox-room?roomId=${room.id}`);
    } catch (e: any) {
      console.error('[XOX Accept error]', e?.message ?? e);
      Alert.alert(
        'Error',
        e?.message || 'Could not accept XOX challenge. Open XOX Online to try again.'
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

  const handleFriendAccept = async () => {
    if (!pendingFriend) return;

    setFriendAcceptBusy(true);
    try {
      await acceptFriendRequest(pendingFriend);
      setPendingFriend(null);
    } catch {
      Alert.alert('Error', 'Could not accept friend request. Try from Friends.');
    } finally {
      setFriendAcceptBusy(false);
    }
  };

  const handleFriendReject = () => {
    if (!pendingFriend) return;

    rejectFriendRequest(pendingFriend).catch(() => {});
    setPendingFriend(null);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.stackWrap}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 220,
            contentStyle: {
              backgroundColor: ARENA_NAV_BACKGROUND,
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

      <FriendRequestNotificationModal
        request={pendingFriend}
        onAccept={handleFriendAccept}
        onReject={handleFriendReject}
        acceptBusy={friendAcceptBusy}
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
    backgroundColor: ARENA_NAV_BACKGROUND,
  },

  stackWrap: {
    flex: 1,
    backgroundColor: ARENA_NAV_BACKGROUND,
  },

  stackWithTab: {
    paddingBottom: 90,
    backgroundColor: ARENA_NAV_BACKGROUND,
  },
});
