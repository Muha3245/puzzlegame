// app/battle.tsx
// Live Battle Arena — create real-time battle rooms for any category/level.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORIES } from '../constants/categories';
import { Theme } from '../constants/theme';
import {
  acceptBattleRoom,
  BattleRoom,
  createBattleRoom,
  getBattleRooms,
  getCurrentUserId,
  getMyFriends,
  PublicUser,
  rejectBattleRoom,
  subscribeToMyBattleList,
} from '../lib/online';

const BG_URI = 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=90';

type RoomBucket = {
  incoming: BattleRoom[];
  outgoing: BattleRoom[];
  active: BattleRoom[];
  completed: BattleRoom[];
};

const emptyBuckets: RoomBucket = { incoming: [], outgoing: [], active: [], completed: [] };

function initials(name: string) {
  return (name || 'P').trim().charAt(0).toUpperCase();
}

export default function BattleArena() {
  const params = useLocalSearchParams<{
    id?: string;
    categoryKey?: string;
    title?: string;
    difficulty?: string;
    level?: string;
  }>();

  const category = CATEGORIES.find((c) => c.id === params.id) ?? CATEGORIES[0];
  const categoryId = params.id || category.id;
  const categoryKey = params.categoryKey || category.id;
  const categoryTitle = typeof params.title === 'string' ? decodeURIComponent(params.title) : category.name;
  const difficulty = params.difficulty || 'easy';
  const level = Math.max(1, Number(params.level || 1));
  const hasSelectedLevel = Boolean(params.level && params.id);

  const [uid, setUid] = useState<string | null>(null);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [rooms, setRooms] = useState<RoomBucket>(emptyBuckets);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const totalBadge = rooms.incoming.length + rooms.active.length;

  const titleLine = useMemo(() => {
    if (!hasSelectedLevel) return 'Choose a friend and start a live room';
    return `${categoryTitle} • ${difficulty.toUpperCase()} • Level ${level}`;
  }, [hasSelectedLevel, categoryTitle, difficulty, level]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const current = await getCurrentUserId();
      setUid(current);
      const [friendRows, roomRows] = await Promise.all([getMyFriends(), getBattleRooms()]);
      setFriends(friendRows);
      setRooms(roomRows);
    } catch (error: any) {
      Alert.alert('Battle error', error?.message || 'Unable to load battle arena.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cleanup: undefined | (() => void);
      load();
      getCurrentUserId().then((current) => {
        if (current) cleanup = subscribeToMyBattleList(current, load);
      });
      return () => cleanup?.();
    }, [load]),
  );

  const challenge = async (friend: PublicUser) => {
    if (!hasSelectedLevel) {
      Alert.alert('Select level first', 'Open Levels, select any level, then tap Battle Friend.');
      return;
    }

    try {
      setBusyId(friend.uid);
      const room = await createBattleRoom({
        friend,
        categoryId,
        categoryKey,
        categoryTitle,
        difficulty,
        level,
      });
      await load();
      Alert.alert('Challenge sent', `${friend.displayName} can accept this battle now.`, [
        { text: 'OK' },
        { text: 'Open Room', onPress: () => openRoom(room) },
      ]);
    } catch (error: any) {
      Alert.alert('Challenge error', error?.message || 'Unable to send battle challenge.');
    } finally {
      setBusyId(null);
    }
  };

  const accept = async (room: BattleRoom) => {
    try {
      setBusyId(room.id);
      await acceptBattleRoom(room);
      await load();
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

  const openRoom = (room: BattleRoom) => {
    router.push(
      `/game?id=${room.categoryId}&categoryKey=${room.categoryKey}&title=${encodeURIComponent(room.categoryTitle)}&difficulty=${room.difficulty}&level=${room.level}&mode=battle&roomId=${room.id}`,
    );
  };

  const rematch = async (room: BattleRoom) => {
    const friend: PublicUser = {
      uid: uid === room.player1Id ? room.player2Id : room.player1Id,
      displayName: uid === room.player1Id ? room.player2Name : room.player1Name,
      coins: 0,
      totalScore: 0,
      levelsCompleted: 0,
    };

    try {
      setBusyId(room.id);
      const nextRoom = await createBattleRoom({
        friend,
        categoryId: room.categoryId,
        categoryKey: room.categoryKey,
        categoryTitle: room.categoryTitle,
        difficulty: room.difficulty,
        level: room.level,
      });
      await load();
      Alert.alert('Rematch sent', 'Your friend can accept the rematch now.', [
        { text: 'OK' },
        { text: 'Open', onPress: () => openRoom(nextRoom) },
      ]);
    } catch (error: any) {
      Alert.alert('Rematch error', error?.message || 'Unable to create rematch.');
    } finally {
      setBusyId(null);
    }
  };

  const nextLevelBattle = async (room: BattleRoom) => {
    const friend: PublicUser = {
      uid: uid === room.player1Id ? room.player2Id : room.player1Id,
      displayName: uid === room.player1Id ? room.player2Name : room.player1Name,
      coins: 0,
      totalScore: 0,
      levelsCompleted: 0,
    };

    try {
      setBusyId(room.id);
      const nextRoom = await createBattleRoom({
        friend,
        categoryId: room.categoryId,
        categoryKey: room.categoryKey,
        categoryTitle: room.categoryTitle,
        difficulty: room.difficulty,
        level: Math.min(room.level + 1, 8),
      });
      await load();
      Alert.alert('Next level challenge sent', 'Your friend can accept the next level battle now.', [
        { text: 'OK' },
        { text: 'Open', onPress: () => openRoom(nextRoom) },
      ]);
    } catch (error: any) {
      Alert.alert('Next level error', error?.message || 'Unable to create next level battle.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Ionicons name="flash" size={22} color={Theme.warn} />
              <Text style={styles.title}>Battle Arena</Text>
              {totalBadge > 0 && (
                <View style={styles.bigBadge}><Text style={styles.bigBadgeText}>{totalBadge}</Text></View>
              )}
            </View>
            <Text style={styles.sub}>{titleLine}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={Theme.primary} size="large" /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {!hasSelectedLevel && (
              <View style={styles.infoCard}>
                <View style={styles.infoIconRow}>
                  <Ionicons name="flash" size={22} color={Theme.warn} />
                  <Text style={styles.infoTitle}>How to Battle</Text>
                </View>
                <Text style={styles.infoText}>
                  Go to Levels → pick a category → tap <Text style={{ color: Theme.warn, fontWeight: '900' }}>Battle</Text> on any level card. Both players solve the exact same puzzle simultaneously. Whoever finds the most words wins coins!
                </Text>
                <Pressable onPress={() => router.push('/levels')} style={styles.primaryBtn}>
                  <Ionicons name="grid-outline" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Choose Level</Text>
                </Pressable>
              </View>
            )}

            {/* Battle twists explainer */}
            <View style={styles.twistsCard}>
              <Text style={styles.twistsTitle}>⚡ Battle Twists</Text>
              <Text style={styles.twistsSubtitle}>Use in-game power-ups to gain the edge</Text>
              <View style={styles.twistsList}>
                {[
                  { icon: 'snow-outline' as const, label: 'Freeze', desc: 'Pause your own timer for 10s', cost: 30 },
                  { icon: 'flash-outline' as const, label: 'Hint', desc: 'Reveal the start of a hidden word', cost: 20 },
                  { icon: 'eye-outline' as const, label: 'Reveal', desc: 'Auto-complete a hidden word for you', cost: 80 },
                ].map((t) => (
                  <View key={t.label} style={styles.twistItem}>
                    <View style={styles.twistIcon}>
                      <Ionicons name={t.icon} size={18} color={Theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.twistItemLabel}>{t.label}</Text>
                      <Text style={styles.twistItemDesc}>{t.desc}</Text>
                    </View>
                    <View style={styles.twistCostBadge}>
                      <Ionicons name="logo-bitcoin" size={10} color={Theme.warn} />
                      <Text style={styles.twistCostText}>{t.cost}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <Section title="Incoming Battle Requests" count={rooms.incoming.length} />
            {rooms.incoming.length === 0 ? <Empty text="No incoming battles" /> : rooms.incoming.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                uid={uid}
                busy={busyId === room.id}
                footer={
                  <View style={styles.actionsRow}>
                    <Pressable onPress={() => accept(room)} style={styles.acceptBtn}><Text style={styles.btnText}>Accept</Text></Pressable>
                    <Pressable onPress={() => reject(room)} style={styles.rejectBtn}><Text style={styles.btnText}>Reject</Text></Pressable>
                  </View>
                }
              />
            ))}

            <Section title="Active Live Battles" count={rooms.active.length} />
            {rooms.active.length === 0 ? <Empty text="No active battle room" /> : rooms.active.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                uid={uid}
                busy={busyId === room.id}
                footer={
                  <Pressable onPress={() => openRoom(room)} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Play / Continue</Text>
                  </Pressable>
                }
              />
            ))}

            <Section title="Challenge Friends" count={friends.length} />
            {friends.length === 0 ? <Empty text="Add friends first, then start battles here." /> : friends.map((friend) => (
              <View key={friend.uid} style={styles.friendCard}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials(friend.displayName)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{friend.displayName}</Text>
                  <Text style={styles.cardMeta}>{hasSelectedLevel ? titleLine : 'Select a level first'}</Text>
                </View>
                <Pressable disabled={busyId === friend.uid} onPress={() => challenge(friend)} style={[styles.challengeBtn, !hasSelectedLevel && styles.disabledBtn]}>
                  {busyId === friend.uid ? <ActivityIndicator color="#fff" /> : <Text style={styles.challengeText}>Battle</Text>}
                </Pressable>
              </View>
            ))}

            <Section title="Completed Battles" count={rooms.completed.length} />
            {rooms.completed.length === 0 ? <Empty text="Completed battles will appear here." /> : rooms.completed.slice(0, 15).map((room) => (
              <CompletedRoomCard
                key={room.id}
                room={room}
                uid={uid}
                onRematch={() => rematch(room)}
                onNext={() => nextLevelBattle(room)}
                busy={busyId === room.id}
              />
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

function Section({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{count}</Text></View>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

function RoomCard({ room, uid, footer, busy }: { room: BattleRoom; uid: string | null; footer: React.ReactNode; busy?: boolean }) {
  const opponentName = uid === room.player1Id ? room.player2Name : room.player1Name;
  return (
    <View style={styles.roomCard}>
      <View style={styles.roomTop}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(opponentName)}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>You vs {opponentName}</Text>
          <Text style={styles.cardMeta}>{room.categoryTitle} • {room.difficulty.toUpperCase()} • Level {room.level}</Text>
          <Text style={styles.statusText}>Status: {room.status.replace('_', ' ')}</Text>
        </View>
        {busy && <ActivityIndicator color={Theme.primary} />}
      </View>
      {footer}
    </View>
  );
}

function CompletedRoomCard({ room, uid, onRematch, onNext, busy }: { room: BattleRoom; uid: string | null; onRematch: () => void; onNext: () => void; busy?: boolean }) {
  const opponentName = uid === room.player1Id ? room.player2Name : room.player1Name;
  const result = room.winnerId ? (room.winnerId === uid ? 'You won' : `${opponentName} won`) : 'Draw';
  return (
    <View style={styles.roomCard}>
      <View style={styles.roomTop}>
        <View style={[styles.avatar, styles.goldAvatar]}><Ionicons name="trophy" size={20} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{result}</Text>
          <Text style={styles.cardMeta}>{room.categoryTitle} • {room.difficulty.toUpperCase()} • Level {room.level}</Text>
        </View>
        {busy && <ActivityIndicator color={Theme.primary} />}
      </View>
      <View style={styles.actionsRow}>
        <Pressable onPress={onRematch} style={styles.acceptBtn}><Text style={styles.btnText}>Rematch</Text></Pressable>
        <Pressable onPress={onNext} style={styles.nextBtn}><Text style={styles.btnText}>Next Level</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#050c20' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,8,32,0.82)' },
  safe: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.11)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  sub: { color: 'rgba(220,229,255,0.72)', marginTop: 2, fontWeight: '700' },
  bigBadge: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: '#ff3b69', alignItems: 'center', justifyContent: 'center' },
  bigBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18, paddingBottom: 20 },
  infoCard: { padding: 18, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.11)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', marginBottom: 16 },
  infoIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  infoText: { color: 'rgba(220,229,255,0.75)', lineHeight: 20, marginBottom: 14 },

  twistsCard: { padding: 18, borderRadius: 26, backgroundColor: 'rgba(91,155,255,0.08)', borderWidth: 1, borderColor: 'rgba(91,155,255,0.22)', marginBottom: 16 },
  twistsTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 3 },
  twistsSubtitle: { color: Theme.textDim, fontSize: 12, marginBottom: 14, fontWeight: '700' },
  twistsList: { gap: 10 },
  twistItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  twistIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(91,155,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  twistItemLabel: { color: '#fff', fontSize: 13, fontWeight: '900' },
  twistItemDesc: { color: Theme.textDim, fontSize: 11, fontWeight: '700', marginTop: 1 },
  twistCostBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,210,63,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,210,63,0.3)' },
  twistCostText: { color: Theme.warn, fontSize: 11, fontWeight: '900' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 10, gap: 8 },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  sectionBadge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  sectionBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  empty: { color: 'rgba(220,229,255,0.55)', padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  friendCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', marginBottom: 10 },
  roomCard: { padding: 14, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', marginBottom: 10 },
  roomTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(91,155,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  goldAvatar: { backgroundColor: 'rgba(255,190,55,0.35)' },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  cardTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  cardMeta: { color: 'rgba(220,229,255,0.65)', fontSize: 12, marginTop: 3, fontWeight: '700' },
  statusText: { color: Theme.primary, fontSize: 12, marginTop: 4, fontWeight: '800', textTransform: 'capitalize' },
  challengeBtn: { paddingHorizontal: 16, height: 40, borderRadius: 20, backgroundColor: Theme.primary, alignItems: 'center', justifyContent: 'center' },
  challengeText: { color: '#fff', fontWeight: '900' },
  disabledBtn: { opacity: 0.55 },
  primaryBtn: { height: 44, borderRadius: 22, backgroundColor: Theme.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, flexDirection: 'row', gap: 6 },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  acceptBtn: { flex: 1, height: 42, borderRadius: 21, backgroundColor: Theme.success, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { flex: 1, height: 42, borderRadius: 21, backgroundColor: Theme.danger, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flex: 1, height: 42, borderRadius: 21, backgroundColor: '#7C5CFF', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '900' },
});
