// app/xox-battle.tsx
// XOX Online lobby — challenge friends to real-time Tic Tac Toe

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ScreenShell } from '../components/ScreenShell';
import { useAppTheme } from '../lib/appTheme';
import { BATTLE_STAKE_OPTIONS, DEFAULT_BATTLE_STAKE } from '../lib/battleEconomy';
import {
  acceptXoxRoom,
  createXoxRoom,
  getAuthStatus,
  getCurrentUserId,
  getMyFriends,
  getXoxRooms,
  PublicUser,
  rejectXoxRoom,
  subscribeToMyXoxList,
  XoxRoom,
} from '../lib/online';
import { goBackOrHome } from '../lib/navigation';
import { useAppState } from '../lib/storage';

const BOARD_SIZES: { size: 3; label: string; sub: string; color: string }[] = [
  { size: 3, label: '3 × 3', sub: 'Classic',  color: '#4CC38A' },
];

type RoomBuckets = {
  incoming:  XoxRoom[];
  outgoing:  XoxRoom[];
  active:    XoxRoom[];
  completed: XoxRoom[];
};

const emptyBuckets: RoomBuckets = { incoming: [], outgoing: [], active: [], completed: [] };

function initials(name: string) {
  return (name || 'P').trim().charAt(0).toUpperCase();
}

export default function XoxBattleScreen() {
  const { state } = useAppState();
  const [uid,           setUid]           = useState<string | null>(null);
  const [friends,       setFriends]       = useState<PublicUser[]>([]);
  const [rooms,         setRooms]         = useState<RoomBuckets>(emptyBuckets);
  const [boardSize,     setBoardSize]     = useState<3>(3);
  const [stakeCoins,    setStakeCoins]    = useState(DEFAULT_BATTLE_STAKE);
  const [loading,       setLoading]       = useState(true);
  const [busyId,        setBusyId]        = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const current = await getCurrentUserId();
      setUid(current);
      const [friendRows, roomRows] = await Promise.all([getMyFriends(), getXoxRooms()]);
      setFriends(friendRows);
      setRooms(roomRows);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not load XOX games.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let unsub: (() => void) | undefined;

      // Online XOX needs a real account — block guests / signed-out users.
      getAuthStatus()
        .then((status) => {
          if (!active) return;
          if (!status.loggedIn) {
            Alert.alert(
              'Sign in required',
              'Create an account or sign in to play online XOX. Guest mode is offline only.',
              [
                { text: 'Not now', style: 'cancel', onPress: goBackOrHome },
                { text: 'Sign in', onPress: () => router.replace('/login') },
              ],
            );
            return;
          }

          load();
          if (status.uid) unsub = subscribeToMyXoxList(status.uid, load);
        })
        .catch(() => {});

      return () => {
        active = false;
        unsub?.();
      };
    }, [load]),
  );

  const openRoom = (room: XoxRoom) => {
    router.push(`/xox-room?roomId=${room.id}`);
  };

  const challenge = async (friend: PublicUser) => {
    if (state.coins < stakeCoins) {
      Alert.alert(
        'Not enough coins',
        `You need ${stakeCoins} coins to start this XOX battle. Your balance is ${state.coins}.`,
      );
      return;
    }

    try {
      setBusyId(friend.uid);
      const room = await createXoxRoom({ friend, boardSize, stakeCoins });
      openRoom(room);
    } catch (e: any) {
      Alert.alert('Challenge error', e?.message || 'Could not send challenge.');
    } finally {
      setBusyId(null);
    }
  };

  const accept = async (room: XoxRoom) => {
    const roomStake = room.stakeCoins ?? DEFAULT_BATTLE_STAKE;
    if (state.coins < roomStake) {
      Alert.alert(
        'Not enough coins',
        `This XOX battle needs ${roomStake} coins. Your balance is ${state.coins}.`,
      );
      return;
    }

    try {
      setBusyId(room.id);
      const accepted = await acceptXoxRoom(room);
      openRoom(accepted);
    } catch (e: any) {
      Alert.alert('Accept error', e?.message || 'Could not accept challenge.');
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (room: XoxRoom) => {
    try {
      setBusyId(room.id);
      await rejectXoxRoom(room);
      await load();
    } catch (e: any) {
      Alert.alert('Decline error', e?.message || 'Could not decline challenge.');
    } finally {
      setBusyId(null);
    }
  };

  const { C } = useAppTheme();

  return (
    <ScreenShell title="XOX Online" subtitle="Challenge friends to real-time Tic Tac Toe">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: C.surface, borderColor: C.divider }]}>
          <View style={styles.heroIcon}>
            <Ionicons name="grid-outline" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: C.ink }]}>Pick board size</Text>
            <Text style={[styles.heroSub, { color: C.muted }]}>
              Choose coins, then tap a friend to challenge them
            </Text>
          </View>
        </View>

        {/* Board size picker */}
        <View style={styles.sizeRow}>
          {BOARD_SIZES.map((b) => (
            <AnimatedPressable
              key={b.size}
              style={[
                styles.sizeCard,
                { backgroundColor: C.surface, borderColor: C.divider },
                boardSize === b.size && { backgroundColor: b.color, borderColor: b.color },
              ]}
              onPress={() => setBoardSize(b.size)}
            >
              <Text style={[styles.sizeLabel, { color: boardSize === b.size ? '#fff' : C.ink }]}>{b.label}</Text>
              <Text style={[styles.sizeSub, { color: boardSize === b.size ? 'rgba(255,255,255,0.80)' : C.muted }]}>{b.sub}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <View style={[styles.stakePanel, { backgroundColor: C.surface, borderColor: C.divider }]}>
          <View style={styles.stakeHeader}>
            <View>
              <Text style={[styles.stakeTitle, { color: C.ink }]}>XOX Coins</Text>
              <Text style={[styles.stakeSub, { color: C.muted }]}>
                Your balance: {state.coins.toLocaleString()} coins
              </Text>
            </View>
            <View style={styles.stakeBadge}>
              <Ionicons name="logo-bitcoin" size={14} color="#1A0845" />
              <Text style={styles.stakeBadgeText}>{stakeCoins}</Text>
            </View>
          </View>

          <View style={styles.stakeOptions}>
            {BATTLE_STAKE_OPTIONS.map((amount) => {
              const selected = amount === stakeCoins;
              const affordable = state.coins >= amount;
              return (
                <AnimatedPressable
                  key={amount}
                  disabled={!affordable}
                  onPress={() => setStakeCoins(amount)}
                  style={[
                    styles.stakeOption,
                    { borderColor: C.divider },
                    selected && styles.stakeOptionActive,
                    !affordable && styles.stakeOptionDisabled,
                  ]}
                >
                  <Text style={[styles.stakeOptionText, selected && styles.stakeOptionTextActive]}>
                    {amount}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {loading && (
          <ActivityIndicator color={C.ink} size="large" style={{ marginVertical: 30 }} />
        )}

        {/* ── Friends ── */}
        <SectionHeader title="Friends" count={friends.length} />
        {!loading && friends.length === 0 && (
          <EmptyRow text="Add friends first from the Friends screen, then challenge them here." />
        )}
        {friends.map((friend) => (
          <View key={friend.uid} style={[styles.friendCard, { backgroundColor: C.surface, borderColor: C.divider }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(friend.displayName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: C.ink }]}>{friend.displayName}</Text>
              <Text style={[styles.cardMeta, { color: C.muted }]}>{boardSize}x{boardSize} - Stake {stakeCoins} coins</Text>
            </View>
            <AnimatedPressable
              disabled={busyId === friend.uid || state.coins < stakeCoins}
              style={[styles.challengeBtn, state.coins < stakeCoins && styles.challengeBtnDisabled]}
              onPress={() => challenge(friend)}
            >
              {busyId === friend.uid ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="grid-outline" size={14} color="#fff" />
                  <Text style={styles.challengeText}>{state.coins < stakeCoins ? 'Need Coins' : 'Challenge'}</Text>
                </>
              )}
            </AnimatedPressable>
          </View>
        ))}

        {/* ── Incoming ── */}
        <SectionHeader title="Incoming Challenges" count={rooms.incoming.length} />
        {rooms.incoming.length === 0 ? (
          <EmptyRow text="No incoming XOX challenges." />
        ) : (
          rooms.incoming.map((room) => (
            <XoxRoomCard
              key={room.id}
              room={room}
              uid={uid}
              busy={busyId === room.id}
              footer={
                <View style={styles.rowActions}>
                  <AnimatedPressable
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => accept(room)}
                  >
                    <Text style={styles.actionText}>Accept</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => decline(room)}
                  >
                    <Text style={styles.actionText}>Decline</Text>
                  </AnimatedPressable>
                </View>
              }
            />
          ))
        )}

      </ScrollView>
    </ScreenShell>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  const { C } = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: C.ink }]}>{title}</Text>
      <View style={[styles.badge, { backgroundColor: C.divider }]}>
        <Text style={[styles.badgeText, { color: C.ink }]}>{count}</Text>
      </View>
    </View>
  );
}

function EmptyRow({ text }: { text: string }) {
  const { C } = useAppTheme();
  return (
    <View style={[styles.empty, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.divider }]}>
      <Text style={[styles.emptyText, { color: C.muted }]}>{text}</Text>
    </View>
  );
}

function XoxRoomCard({
  room,
  uid,
  busy,
  footer,
}: {
  room: XoxRoom;
  uid: string | null;
  busy: boolean;
  footer?: React.ReactNode;
}) {
  const { C } = useAppTheme();
  const opponent   = uid === room.player1Id ? room.player2Name : room.player1Name;
  const myMark     = uid === room.player1Id ? 'X' : 'O';
  const resultText = !room.winner
    ? room.status.replace('_', ' ').toUpperCase()
    : room.winner === 'draw'
    ? 'DRAW'
    : room.winner === myMark
    ? 'YOU WON'
    : `${opponent} WON`;
  const resultColor = !room.winner
    ? '#FFD23F'
    : room.winner === 'draw'
    ? '#FFD23F'
    : room.winner === myMark
    ? '#4CC38A'
    : '#FF4D8D';

  return (
    <View style={[styles.roomCard, { backgroundColor: C.surface, borderColor: C.divider }]}>
      <View style={styles.roomRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(opponent)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: C.ink }]}>{opponent}</Text>
          <Text style={[styles.cardMeta, { color: C.muted }]}>{room.boardSize}×{room.boardSize} Board</Text>
          <View style={styles.roomStakePill}>
            <Ionicons name="logo-bitcoin" size={11} color="#FFD23F" />
            <Text style={styles.roomStakeText}>{room.stakeCoins ?? DEFAULT_BATTLE_STAKE} coin battle</Text>
          </View>
          <Text style={[styles.statusText, { color: resultColor }]}>{resultText}</Text>
        </View>
        {busy && <ActivityIndicator color={C.ink} size="small" />}
      </View>
      {footer ?? null}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 36, gap: 12 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 28,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: '#8E6BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#fff', fontSize: 19, fontWeight: '900' },
  heroSub: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 4,
  },

  sizeRow: { flexDirection: 'row', gap: 10 },
  sizeCard: {
    flex: 1,
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    gap: 4,
  },
  sizeLabel: { color: '#fff', fontWeight: '900', fontSize: 16 },
  sizeSub:   { color: 'rgba(255,255,255,0.70)', fontWeight: '700', fontSize: 11 },

  stakePanel: {
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    gap: 12,
  },
  stakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stakeTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  stakeSub: {
    color: 'rgba(255,255,255,0.68)',
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  stakeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFD23F',
  },
  stakeBadgeText: { color: '#1A0845', fontSize: 13, fontWeight: '900' },
  stakeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stakeOption: {
    minWidth: 58,
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stakeOptionActive: { backgroundColor: '#FFD23F', borderColor: '#FFD23F' },
  stakeOptionDisabled: { opacity: 0.36 },
  stakeOptionText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  stakeOptionTextActive: { color: '#1A0845' },

  section: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 17 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
  },

  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    padding: 13,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  roomCard: {
    borderRadius: 24,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 12,
  },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: '#8E6BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  cardTitle:  { color: '#fff', fontWeight: '900', fontSize: 16 },
  cardMeta:   { color: 'rgba(255,255,255,0.64)', fontWeight: '700', fontSize: 12, marginTop: 2 },
  roomStakePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,210,63,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.26)',
    marginTop: 6,
  },
  roomStakeText: { color: '#FFD23F', fontSize: 10, fontWeight: '900' },
  statusText: { fontWeight: '900', fontSize: 10, marginTop: 5 },

  challengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8E6BFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minWidth: 96,
    justifyContent: 'center',
  },
  challengeBtnDisabled: { opacity: 0.55 },
  challengeText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  rowActions: { flexDirection: 'row', gap: 8 },
  actionBtn:  { flex: 1, alignItems: 'center', borderRadius: 16, paddingVertical: 11 },
  acceptBtn:  { backgroundColor: '#4CC38A' },
  declineBtn: { backgroundColor: '#FF4D8D' },
  actionText: { color: '#fff', fontWeight: '900' },

  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CC38A',
    borderRadius: 16,
    paddingVertical: 12,
  },
  continueText: { color: '#0B1020', fontWeight: '900' },

  empty: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.58)',
    fontWeight: '700',
    textAlign: 'center',
  },
});

