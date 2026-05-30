// app/battle.tsx
// Live Battle Arena — create real-time battle rooms for any category/level.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { getRandomBattleLevel } from '../lib/battleHelpers';
import { AnimatedEntry } from '../components/AnimatedEntry';
import { SkeletonCard, SkeletonSection } from '../components/SkeletonLoader';
import { DifficultyPickerModal } from '../components/DifficultyPickerModal';

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
  const [uid, setUid] = useState<string | null>(null);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [rooms, setRooms] = useState<RoomBucket>(emptyBuckets);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [rematchSentIds, setRematchSentIds] = useState<Set<string>>(new Set());
  const [diffModalFriend, setDiffModalFriend] = useState<PublicUser | null>(null);
  const [diffModalRoom, setDiffModalRoom] = useState<BattleRoom | null>(null);
  const prevIncomingRef = useRef<string[]>([]);
  const [toastMsg, setToastMsg] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalBadge = rooms.incoming.length + rooms.active.length;

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastAnim.setValue(0);
    Animated.spring(toastAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setToastMsg(''));
    }, 2600);
  }, [toastAnim]);

  const friendBattleCounts = useMemo(() => {
    const map: Record<string, number> = {};
    [...rooms.incoming, ...rooms.active, ...rooms.outgoing].forEach((r) => {
      const oppId = uid === r.player1Id ? r.player2Id : r.player1Id;
      map[oppId] = (map[oppId] || 0) + 1;
    });
    return map;
  }, [rooms.incoming, rooms.active, rooms.outgoing, uid]);

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
      // `active` prevents a stale .then() from subscribing after the screen blurs.
      // Without this, the channel is created but never cleaned up, causing the
      // "cannot add callbacks after subscribe()" Supabase error on next focus.
      let active = true;
      let unsub: (() => void) | undefined;

      load();
      getCurrentUserId().then((current) => {
        if (!active || !current) return;
        unsub = subscribeToMyBattleList(current, load);
      }).catch(() => {});

      return () => {
        active = false;
        unsub?.();
      };
    }, [load]),
  );

  // Track incoming IDs so the global _layout.tsx notification can deduplicate
  useEffect(() => {
    prevIncomingRef.current = rooms.incoming.map((r) => r.id);
  }, [rooms.incoming]);

  const handleFriendDifficultySelect = async (difficulty: string) => {
    if (!diffModalFriend) return;
    const friend = diffModalFriend;
    const levelData = getRandomBattleLevel(difficulty);
    setBusyId(friend.uid);
    try {
      const room = await createBattleRoom({ friend, ...levelData });
      setDiffModalFriend(null);
      showToast('⚡ Entering battle lobby…');
      openRoom(room);
    } catch (error: any) {
      Alert.alert('Challenge error', error?.message || 'Unable to send battle challenge.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRematchDifficultySelect = async (difficulty: string) => {
    if (!diffModalRoom) return;
    const room = diffModalRoom;
    const friend: PublicUser = {
      uid: uid === room.player1Id ? room.player2Id : room.player1Id,
      displayName: uid === room.player1Id ? room.player2Name : room.player1Name,
      coins: 0,
      totalScore: 0,
      levelsCompleted: 0,
    };
    const levelData = getRandomBattleLevel(difficulty);
    setBusyId(room.id);
    try {
      const nextRoom = await createBattleRoom({ friend, ...levelData });
      setRematchSentIds((prev) => new Set([...prev, room.id]));
      setDiffModalRoom(null);
      showToast('🔄 Rematch sent! Entering battle…');
      openRoom(nextRoom);
    } catch (error: any) {
      Alert.alert('Rematch error', error?.message || 'Unable to create rematch.');
    } finally {
      setBusyId(null);
    }
  };

  const accept = async (room: BattleRoom) => {
    try {
      setBusyId(room.id);
      await acceptBattleRoom(room);
      // Navigate immediately — do NOT await load() before openRoom().
      // load() triggers subscribeToMyBattleList which fires its own load(), creating a
      // double-reload race that prevented the router.push from executing (bug fix).
      showToast('🔥 Battle accepted! Get ready!');
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
      showToast('❌ Battle declined');
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


  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/levels')} style={styles.backBtn}>
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
            <Text style={styles.sub}>Challenge a friend — pick a difficulty!</Text>
          </View>
        </View>

        {/* Animated toast banner */}
        {toastMsg ? (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: toastAnim,
                transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
              },
            ]}
          >
            <Text style={styles.toastText}>{toastMsg}</Text>
          </Animated.View>
        ) : null}

        {loading ? (
          <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
            <SkeletonSection />
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={`in-${i}`} />)}
            <SkeletonSection />
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`fr-${i}`} />)}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {/* ── 1. How to Battle card ── */}
            <AnimatedEntry from="bottom" delay={0}>
            <View style={styles.infoCard}>
              <View style={styles.infoIconRow}>
                <Ionicons name="flash" size={22} color={Theme.warn} />
                <Text style={styles.infoTitle}>How to Battle</Text>
              </View>
              <Text style={styles.infoText}>
                Tap <Text style={{ color: Theme.warn, fontWeight: '900' }}>⚡ Battle</Text> on a friend, choose a difficulty, and a random level is picked for both of you. Whoever finds the most words wins coins!
              </Text>
            </View>
            </AnimatedEntry>

            {/* ── 2. Battle Twists ── */}
            <AnimatedEntry from="bottom" delay={60}>
            <View style={styles.twistsCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <Ionicons name="flash" size={16} color={Theme.warn} />
                <Text style={styles.twistsTitle}>Battle Twists</Text>
              </View>
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
            </AnimatedEntry>

            {/* ── 3. Challenge Friends ── */}
            <AnimatedEntry from="bottom" delay={120}>
            <Section title="👥 Challenge Friends" count={friends.length} />
            {friends.length === 0 ? <Empty text="Add friends first, then start battles here." /> : friends.map((friend, i) => (
              <AnimatedEntry key={friend.uid} delay={i * 50}>
              <View style={styles.friendCard}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials(friend.displayName)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{friend.displayName}</Text>
                  <Text style={styles.cardMeta}>Tap to battle</Text>
                </View>
                <Pressable
                  disabled={busyId === friend.uid}
                  onPress={() => setDiffModalFriend(friend)}
                  style={styles.challengeBtn}
                >
                  {busyId === friend.uid ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.challengeText}>⚡ Battle</Text>
                      {(friendBattleCounts[friend.uid] ?? 0) > 0 && (
                        <View style={styles.friendCountBadge}>
                          <Text style={styles.friendCountText}>{friendBattleCounts[friend.uid]}</Text>
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
              </View>
              </AnimatedEntry>
            ))}
            </AnimatedEntry>

            {/* ── 4. Incoming Requests ── */}
            <AnimatedEntry from="bottom" delay={180}>
            <Section title="📥 Incoming Requests" count={rooms.incoming.length} />
            {rooms.incoming.length === 0 ? <Empty text="No incoming battles" /> : rooms.incoming.map((room, i) => (
              <AnimatedEntry key={room.id} delay={i * 55}>
              <RoomCard
                room={room}
                uid={uid}
                busy={busyId === room.id}
                footer={
                  <View style={styles.actionsRow}>
                    <Pressable onPress={() => accept(room)} style={styles.acceptBtn}><Text style={styles.btnText}>✅ Accept</Text></Pressable>
                    <Pressable onPress={() => reject(room)} style={styles.rejectBtn}><Text style={styles.btnText}>✕ Decline</Text></Pressable>
                  </View>
                }
              />
              </AnimatedEntry>
            ))}
            </AnimatedEntry>

            {/* ── 5. Active Live Battles — at the bottom above completed ── */}
            <AnimatedEntry from="bottom" delay={210}>
            <Section title="⚡ Active Battles" count={rooms.active.length} />
            {rooms.active.length === 0 ? <Empty text="No active battles right now" /> : rooms.active.map((room, i) => (
              <AnimatedEntry key={room.id} delay={i * 55}>
              <RoomCard
                room={room}
                uid={uid}
                busy={busyId === room.id}
                footer={
                  <Pressable onPress={() => openRoom(room)} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>▶ Continue Battle</Text>
                  </Pressable>
                }
              />
              </AnimatedEntry>
            ))}
            </AnimatedEntry>

            <AnimatedEntry from="bottom" delay={270}>
            {/* ── 6. Completed battles — collapsed by default, always at the bottom ── */}
            <Pressable
              onPress={() => setShowCompleted((v) => !v)}
              style={styles.sectionHeader}
            >
              <Text style={styles.sectionTitle}>🏁 Completed Battles</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{rooms.completed.length}</Text>
              </View>
              <Ionicons
                name={showCompleted ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={16}
                color={Theme.textDim}
                style={{ marginLeft: 'auto' }}
              />
            </Pressable>

            {showCompleted && (
              rooms.completed.length === 0
                ? <Empty text="Completed battles will appear here." />
                : rooms.completed.slice(0, 15).map((room, i) => (
                  <AnimatedEntry key={room.id} delay={i * 40}>
                  <CompletedRoomCard
                    room={room}
                    uid={uid}
                    rematchSent={rematchSentIds.has(room.id)}
                    onRematch={() => setDiffModalRoom(room)}
                    busy={busyId === room.id}
                  />
                  </AnimatedEntry>
                ))
            )}
            </AnimatedEntry>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>

      <DifficultyPickerModal
        visible={!!diffModalFriend}
        onClose={() => setDiffModalFriend(null)}
        onSelect={handleFriendDifficultySelect}
      />
      <DifficultyPickerModal
        visible={!!diffModalRoom}
        onClose={() => setDiffModalRoom(null)}
        onSelect={handleRematchDifficultySelect}
      />
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

function CompletedRoomCard({
  room, uid, onRematch, busy, rematchSent,
}: {
  room: BattleRoom; uid: string | null; onRematch: () => void;
  busy?: boolean; rematchSent?: boolean;
}) {
  const opponentName = uid === room.player1Id ? room.player2Name : room.player1Name;
  const iWon = room.winnerId && room.winnerId === uid;
  const isDraw = !room.winnerId;
  const result = isDraw ? 'Draw' : iWon ? '🏆 You won!' : `${opponentName} won`;
  const resultColor = isDraw ? Theme.warn : iWon ? Theme.success : Theme.danger;

  return (
    <View style={styles.roomCard}>
      <View style={styles.roomTop}>
        <View style={[styles.avatar, iWon ? styles.goldAvatar : isDraw ? styles.drawAvatar : styles.lossAvatar]}>
          <Ionicons
            name={iWon ? 'trophy' : isDraw ? 'ribbon-outline' : 'skull-outline'}
            size={20}
            color="#fff"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: resultColor }]}>{result}</Text>
          <Text style={styles.cardMeta}>
            {room.categoryTitle} • {room.difficulty.toUpperCase()} • Level {room.level}
          </Text>
        </View>
        {busy && <ActivityIndicator color={Theme.primary} />}
      </View>

      {rematchSent ? (
        <View style={styles.rematchSentPill}>
          <Ionicons name="checkmark-circle" size={14} color={Theme.success} />
          <Text style={styles.rematchSentText}>Rematch sent — waiting for opponent</Text>
        </View>
      ) : (
        <Pressable onPress={onRematch} disabled={busy} style={[styles.acceptBtn, busy && { opacity: 0.6 }]}>
          <Text style={styles.btnText}>🔄 Rematch</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0D0500' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,5,0,0.82)' },
  orb1: { position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,100,0,0.13)' },
  orb2: { position: 'absolute', bottom: 40, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,60,0,0.09)' },
  safe: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,120,0,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,150,0,0.25)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  sub: { color: Theme.textDim, marginTop: 2, fontWeight: '700' },
  bigBadge: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: '#ff3b69', alignItems: 'center', justifyContent: 'center' },
  bigBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18, paddingBottom: 20 },
  infoCard: { padding: 18, borderRadius: 26, backgroundColor: 'rgba(255,120,0,0.10)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.22)', marginBottom: 16 },
  infoIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  infoText: { color: Theme.textDim, lineHeight: 20, marginBottom: 14 },

  twistsCard: { padding: 18, borderRadius: 26, backgroundColor: 'rgba(255,120,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.22)', marginBottom: 16 },
  twistsTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  twistsSubtitle: { color: Theme.textDim, fontSize: 12, marginBottom: 14, fontWeight: '700' },
  twistsList: { gap: 10 },
  twistItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  twistIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,120,0,0.18)', alignItems: 'center', justifyContent: 'center' },
  twistItemLabel: { color: '#fff', fontSize: 13, fontWeight: '900' },
  twistItemDesc: { color: Theme.textDim, fontSize: 11, fontWeight: '700', marginTop: 1 },
  twistCostBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,210,63,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,210,63,0.3)' },
  twistCostText: { color: Theme.warn, fontSize: 11, fontWeight: '900' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 10, gap: 8 },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  sectionBadge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,120,0,0.20)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, borderWidth: 1, borderColor: 'rgba(255,150,0,0.30)' },
  sectionBadgeText: { color: Theme.primary, fontWeight: '900', fontSize: 12 },
  empty: { color: Theme.textDim, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  friendCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.18)', marginBottom: 10 },
  roomCard: { padding: 14, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.18)', marginBottom: 10 },
  roomTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,120,0,0.22)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.35)' },
  goldAvatar: { backgroundColor: 'rgba(255,190,55,0.35)' },
  drawAvatar: { backgroundColor: 'rgba(255,210,63,0.22)' },
  lossAvatar: { backgroundColor: 'rgba(247,108,108,0.25)' },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  cardTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  cardMeta: { color: Theme.textDim, fontSize: 12, marginTop: 3, fontWeight: '700' },
  statusText: { color: Theme.primary, fontSize: 12, marginTop: 4, fontWeight: '800', textTransform: 'capitalize' },
  challengeBtn: { paddingHorizontal: 14, height: 40, borderRadius: 20, backgroundColor: Theme.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  challengeText: { color: '#fff', fontWeight: '900' },
  friendCountBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  friendCountText: { color: Theme.primary, fontWeight: '900', fontSize: 11 },
  toast: {
    marginHorizontal: 18, marginBottom: 8,
    backgroundColor: 'rgba(255,100,0,0.93)',
    borderRadius: 18, paddingHorizontal: 18, paddingVertical: 11,
    alignItems: 'center',
    shadowColor: Theme.primary, shadowOpacity: 0.55, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 8,
    borderWidth: 1, borderColor: 'rgba(255,200,100,0.3)',
  },
  toastText: { color: '#fff', fontWeight: '900', fontSize: 14, textAlign: 'center' },
  disabledBtn: { opacity: 0.55 },
  primaryBtn: { height: 44, borderRadius: 22, backgroundColor: Theme.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, flexDirection: 'row', gap: 6, shadowColor: Theme.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5 },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  acceptBtn: { flex: 1, height: 42, borderRadius: 21, backgroundColor: Theme.success, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { flex: 1, height: 42, borderRadius: 21, backgroundColor: Theme.danger, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flex: 1, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,120,0,0.70)', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '900' },
  rematchSentPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(74,204,138,0.12)', borderWidth: 1, borderColor: 'rgba(74,204,138,0.3)' },
  rematchSentText: { color: Theme.success, fontSize: 13, fontWeight: '800' },
});
