// app/battle.tsx
// Simplified online Word Search Battle screen using the existing Supabase database.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ScreenShell } from '../components/ScreenShell';
import { useAppTheme } from '../lib/appTheme';
import { CATEGORIES } from '../constants/categories';
import {
  acceptBattleRoom,
  BattleRoom,
  createBattleRoom,
  getAuthStatus,
  getBattleRooms,
  getCurrentUserId,
  getMyFriends,
  PublicUser,
  rejectBattleRoom,
  quitBattleRoom,
  subscribeToMyBattleList,
} from '../lib/online';
import { playBattleRequestSound, playBattleStart } from '../lib/audio';
import { BATTLE_STAKE_OPTIONS, DEFAULT_BATTLE_STAKE } from '../lib/battleEconomy';
import { useAppState } from '../lib/storage';
import { goBackOrHome } from '../lib/navigation';

type DifficultyId = 'easy' | 'medium' | 'hard' | 'pro';

const DIFFICULTIES: {
  id: DifficultyId;
  label: string;
  sub: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'easy', label: 'Easy', sub: 'Relaxed level', color: '#4CC38A', icon: 'leaf' },
  { id: 'medium', label: 'Medium', sub: 'Balanced challenge', color: '#FF7A00', icon: 'flame' },
  { id: 'hard', label: 'Hard', sub: 'Tough puzzle', color: '#FF4D8D', icon: 'flash' },
  { id: 'pro', label: 'Pro', sub: 'Expert mode', color: '#8E6BFF', icon: 'diamond' },
];

type RoomBucket = {
  incoming: BattleRoom[];
  outgoing: BattleRoom[];
  active: BattleRoom[];
  completed: BattleRoom[];
};

const emptyBuckets: RoomBucket = {
  incoming: [],
  outgoing: [],
  active: [],
  completed: [],
};

const LEVELS_PER_CATEGORY = 8;

function initials(name: string) {
  return (name || 'P').trim().charAt(0).toUpperCase();
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRandomLevel(difficulty: DifficultyId) {
  const cat = randomItem(CATEGORIES);
  const level = Math.floor(Math.random() * LEVELS_PER_CATEGORY) + 1;

  return {
    categoryId: cat.id,
    categoryKey: cat.id,
    categoryTitle: cat.name,
    difficulty,
    level,
  };
}

export default function BattleArena() {
  const { state } = useAppState();

  const [uid, setUid] = useState<string | null>(null);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [rooms, setRooms] = useState<RoomBucket>(emptyBuckets);
  const [difficulty, setDifficulty] = useState<DifficultyId>('easy');
  const [stakeCoins, setStakeCoins] = useState(DEFAULT_BATTLE_STAKE);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [deletingAllActive, setDeletingAllActive] = useState(false);

  // These ids are hidden locally after delete. This fixes the issue where quitBattleRoom
  // marks only my player row as quit, but the room can still come back from getBattleRooms().
  const [hiddenActiveIds, setHiddenActiveIds] = useState<Set<string>>(new Set());

  const activeRooms = useMemo(
    () => rooms.active.filter((room) => !hiddenActiveIds.has(room.id)),
    [rooms.active, hiddenActiveIds],
  );

  const counts = useMemo(
    () => rooms.incoming.length + rooms.outgoing.length + activeRooms.length,
    [rooms.incoming.length, rooms.outgoing.length, activeRooms.length],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const current = await getCurrentUserId();
      setUid(current);

      const [friendRows, roomRows] = await Promise.all([
        getMyFriends(),
        getBattleRooms(),
      ]);

      setFriends(friendRows);
      setRooms(roomRows);
    } catch (error: any) {
      Alert.alert('Battle error', error?.message || 'Unable to load battles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let unsub: (() => void) | undefined;

      // Online battles need a real account — block guests / signed-out users.
      getAuthStatus()
        .then((status) => {
          if (!active) return;
          if (!status.loggedIn) {
            Alert.alert(
              'Sign in required',
              'Create an account or sign in to play online battles. Guest mode is offline only.',
              [
                { text: 'Not now', style: 'cancel', onPress: goBackOrHome },
                { text: 'Sign in', onPress: () => router.replace('/login') },
              ],
            );
            return;
          }

          load();
          if (status.uid) unsub = subscribeToMyBattleList(status.uid, load);
        })
        .catch(() => {});

      return () => {
        active = false;
        unsub?.();
      };
    }, [load]),
  );

  const openRoom = (room: BattleRoom) => {
    router.push(
      `/game?id=${room.categoryId}&categoryKey=${room.categoryKey}&title=${encodeURIComponent(
        room.categoryTitle,
      )}&difficulty=${room.difficulty}&level=${room.level}&mode=battle&roomId=${room.id}`,
    );
  };

  const hideActiveRooms = (ids: string[]) => {
    const idSet = new Set(ids);

    setHiddenActiveIds((prev) => new Set([...Array.from(prev), ...ids]));

    setRooms((prev) => ({
      ...prev,
      active: prev.active.filter((room) => !idSet.has(room.id)),
    }));
  };

  const deleteRoomHard = async (room: BattleRoom) => {
    try {
      // This fully removes the room. It is the correct behavior for a delete button.
      await rejectBattleRoom(room);
    } catch (firstError) {
      // Fallback for projects where RLS blocks deleting active rooms.
      await quitBattleRoom(room.id);
    }
  };

  const challenge = async (friend: PublicUser) => {
    if (state.coins < stakeCoins) {
      Alert.alert(
        'Not enough coins',
        `You need ${stakeCoins} coins to start this battle. Your balance is ${state.coins}.`,
      );
      return;
    }

    try {
      setBusyId(friend.uid);

      const pick = pickRandomLevel(difficulty);
      const room = await createBattleRoom({ friend, ...pick, stakeCoins });

      playBattleRequestSound(state.settings.sound).catch(() => {});
      openRoom(room);
    } catch (error: any) {
      Alert.alert('Challenge error', error?.message || 'Unable to send battle request.');
    } finally {
      setBusyId(null);
    }
  };

  const accept = async (room: BattleRoom) => {
    const roomStake = room.stakeCoins ?? DEFAULT_BATTLE_STAKE;
    if (state.coins < roomStake) {
      Alert.alert(
        'Not enough coins',
        `This battle needs ${roomStake} coins. Your balance is ${state.coins}.`,
      );
      return;
    }

    try {
      setBusyId(room.id);
      await acceptBattleRoom(room);
      playBattleStart(state.settings.sound).catch(() => {});
      openRoom(room);
    } catch (error: any) {
      Alert.alert('Accept error', error?.message || 'Unable to accept battle.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (room: BattleRoom) => {
    try {
      setBusyId(room.id);
      await rejectBattleRoom(room);
      await load();
    } catch (error: any) {
      Alert.alert('Reject error', error?.message || 'Unable to reject battle.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteActiveBattle = async (room: BattleRoom) => {
    Alert.alert(
      'Delete active battle?',
      'This battle will be removed from Active Battles.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyId(room.id);

              // Hide instantly so UI does not wait for realtime.
              hideActiveRooms([room.id]);

              await deleteRoomHard(room);
              await load();
            } catch (error: any) {
              Alert.alert('Delete error', error?.message || 'Unable to delete this battle.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const deleteAllActiveBattles = async () => {
    if (activeRooms.length === 0) return;

    Alert.alert(
      'Delete all active battles?',
      `This will remove ${activeRooms.length} active battle${activeRooms.length > 1 ? 's' : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            const ids = activeRooms.map((room) => room.id);

            try {
              setDeletingAllActive(true);
              setBusyId('delete-all-active');

              // Hide instantly before network calls finish.
              hideActiveRooms(ids);

              await Promise.all(activeRooms.map((room) => deleteRoomHard(room).catch(() => null)));
              await load();
            } catch (error: any) {
              Alert.alert('Delete error', error?.message || 'Unable to delete all active battles.');
            } finally {
              setDeletingAllActive(false);
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const rematch = async (room: BattleRoom) => {
    if (!uid) return;

    const friend: PublicUser = {
      uid: uid === room.player1Id ? room.player2Id : room.player1Id,
      displayName: uid === room.player1Id ? room.player2Name : room.player1Name,
      coins: 0,
      totalScore: 0,
      levelsCompleted: 0,
      battlesWon: 0,
      battlesLost: 0,
    };

    try {
      setBusyId(room.id);

      const pick = pickRandomLevel((room.difficulty as DifficultyId) || difficulty);
      const nextRoom = await createBattleRoom({ friend, ...pick, stakeCoins: room.stakeCoins ?? stakeCoins });

      openRoom(nextRoom);
    } catch (error: any) {
      Alert.alert('Rematch error', error?.message || 'Unable to create rematch.');
    } finally {
      setBusyId(null);
    }
  };

  const { C } = useAppTheme();

  return (
    <ScreenShell title="Online Battle" subtitle="Word Search battles use your existing Supabase database">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: C.surface, borderColor: C.divider }]}>
          <View style={styles.heroIcon}>
            <Ionicons name="flash" size={28} color="#fff" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: C.ink }]}>Choose difficulty first</Text>
            <Text style={[styles.heroSub, { color: C.muted }]}>
              Choose a coin stake, then tap Battle. Winner gets the same amount the loser loses.
            </Text>
          </View>

          {counts > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{counts}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.stakePanel, { backgroundColor: C.surface, borderColor: C.divider }]}>
          <View style={styles.stakeHeader}>
            <View>
              <Text style={[styles.stakeTitle, { color: C.ink }]}>Battle Coins</Text>
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

        <View style={styles.diffGrid}>
          {DIFFICULTIES.map((d) => (
            <AnimatedPressable
              key={d.id}
              style={[
                styles.diffCard,
                { backgroundColor: C.surface, borderColor: C.divider },
                difficulty === d.id && {
                  backgroundColor: d.color,
                  borderColor: d.color,
                },
              ]}
              onPress={() => setDifficulty(d.id)}
            >
              <Ionicons name={d.icon} size={22} color={difficulty === d.id ? '#fff' : C.ink} />
              <Text style={[styles.diffLabel, { color: difficulty === d.id ? '#fff' : C.ink }]}>{d.label}</Text>
              <Text style={[styles.diffSub, { color: difficulty === d.id ? 'rgba(255,255,255,0.80)' : C.muted }]}>{d.sub}</Text>
            </AnimatedPressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={C.ink} size="large" style={{ marginVertical: 30 }} />
        ) : null}

        <Section title="Friends" count={friends.length} />

        {!loading && friends.length === 0 ? (
          <Empty text="Add friends first from Friends screen, then start battles here." />
        ) : null}

        {friends.map((friend) => (
          <View key={friend.uid} style={[styles.friendCard, { backgroundColor: C.surface, borderColor: C.divider }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(friend.displayName)}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: C.ink }]}>{friend.displayName}</Text>
              <Text style={[styles.cardMeta, { color: C.muted }]}>
                Random {difficulty.toUpperCase()} • Stake {stakeCoins} coins
              </Text>
            </View>

            <AnimatedPressable
              disabled={busyId === friend.uid || state.coins < stakeCoins}
              style={[styles.battleBtn, state.coins < stakeCoins && styles.battleBtnDisabled]}
              onPress={() => challenge(friend)}
            >
              {busyId === friend.uid ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.battleText}>{state.coins < stakeCoins ? 'Need Coins' : 'Battle'}</Text>
              )}
            </AnimatedPressable>
          </View>
        ))}

        <Section title="Incoming Requests" count={rooms.incoming.length} />

        {rooms.incoming.length === 0 ? (
          <Empty text="No incoming battles." />
        ) : (
          rooms.incoming.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              uid={uid}
              busy={busyId === room.id}
              footer={
                <View style={styles.rowActions}>
                  <AnimatedPressable
                    style={[styles.actionBtn, styles.accept]}
                    onPress={() => accept(room)}
                  >
                    <Text style={styles.actionText}>Accept</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    style={[styles.actionBtn, styles.reject]}
                    onPress={() => reject(room)}
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

function Section({
  title,
  count,
  compact = false,
}: {
  title: string;
  count: number;
  compact?: boolean;
}) {
  const { C } = useAppTheme();
  return (
    <View style={[styles.section, compact && styles.sectionCompact]}>
      <Text style={[styles.sectionTitle, { color: C.ink }]}>{title}</Text>
      <View style={[styles.sectionBadge, { backgroundColor: C.divider }]}>
        <Text style={[styles.sectionBadgeText, { color: C.ink }]}>{count}</Text>
      </View>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  const { C } = useAppTheme();
  return (
    <View style={[styles.empty, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.divider }]}>
      <Text style={[styles.emptyText, { color: C.muted }]}>{text}</Text>
    </View>
  );
}

function RoomCard({
  room,
  uid,
  busy,
  footer,
}: {
  room: BattleRoom;
  uid: string | null;
  busy: boolean;
  footer?: React.ReactNode;
}) {
  const { C } = useAppTheme();
  const opponent = uid === room.player1Id ? room.player2Name : room.player1Name;

  return (
    <View style={[styles.roomCard, { backgroundColor: C.surface, borderColor: C.divider }]}>
      <View style={styles.roomRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(opponent)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: C.ink }]}>{opponent}</Text>
          <Text style={[styles.cardMeta, { color: C.muted }]}>
            {room.categoryTitle} • {room.difficulty.toUpperCase()} • Lv {room.level}
          </Text>
          <View style={styles.roomStakePill}>
            <Ionicons name="logo-bitcoin" size={11} color="#FFD23F" />
            <Text style={styles.roomStakeText}>
              {room.stakeCoins ?? DEFAULT_BATTLE_STAKE} coin battle
            </Text>
          </View>
          <Text style={styles.status}>{room.status.replace('_', ' ').toUpperCase()}</Text>
        </View>

        {busy ? <ActivityIndicator color={C.ink} size="small" /> : null}
      </View>

      {footer ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingBottom: 160,
    gap: 12,
  },

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
    backgroundColor: '#FF7A00',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
  },

  heroSub: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 4,
  },

  countBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4D8D',
  },

  countText: {
    color: '#fff',
    fontWeight: '900',
  },

  diffGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  diffCard: {
    flex: 1,
    minWidth: '44%',
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  diffLabel: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    marginTop: 8,
  },

  diffSub: {
    color: 'rgba(255,255,255,0.70)',
    fontWeight: '700',
    fontSize: 11,
    marginTop: 2,
  },

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

  stakeTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },

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

  stakeBadgeText: {
    color: '#1A0845',
    fontSize: 13,
    fontWeight: '900',
  },

  stakeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  stakeOption: {
    minWidth: 58,
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  stakeOptionActive: {
    backgroundColor: '#FFD23F',
    borderColor: '#FFD23F',
  },

  stakeOptionDisabled: {
    opacity: 0.36,
  },

  stakeOptionText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },

  stakeOptionTextActive: {
    color: '#1A0845',
  },

  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },

  sectionCompact: {
    marginTop: 0,
    flex: 1,
  },

  sectionWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },

  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
  },

  sectionTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 17,
  },

  sectionBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },

  deleteAllIconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#FF4D8D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  disabledBtn: {
    opacity: 0.55,
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

  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: '#4CC38A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },

  cardTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },

  cardMeta: {
    color: 'rgba(255,255,255,0.64)',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
  },

  status: {
    color: '#FFD23F',
    fontWeight: '900',
    fontSize: 10,
    marginTop: 5,
  },

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

  roomStakeText: {
    color: '#FFD23F',
    fontSize: 10,
    fontWeight: '900',
  },

  battleBtn: {
    backgroundColor: '#FF7A00',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    minWidth: 82,
    alignItems: 'center',
  },

  battleBtnDisabled: {
    opacity: 0.55,
  },

  battleText: {
    color: '#fff',
    fontWeight: '900',
  },

  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },

  iconActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },

  iconActionBtn: {
    width: 46,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  continueIconBtn: {
    backgroundColor: '#4CC38A',
  },

  deleteIconBtn: {
    backgroundColor: '#FF4D8D',
  },

  actionBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 11,
  },

  accept: {
    backgroundColor: '#4CC38A',
  },

  reject: {
    backgroundColor: '#FF4D8D',
  },

  actionText: {
    color: '#fff',
    fontWeight: '900',
  },

  continueBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },

  continueText: {
    color: '#120F2D',
    fontWeight: '900',
  },

  waiting: {
    color: 'rgba(255,255,255,0.66)',
    fontWeight: '800',
  },

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
