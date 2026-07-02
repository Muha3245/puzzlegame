// app/friends.tsx

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  acceptFriendRequest,
  FriendRequest,
  getIncomingFriendRequests,
  getMyFriends,
  getSuggestedPlayers,
  PublicUser,
  rejectFriendRequest,
  searchPlayers,
  sendFriendRequest,
} from '../lib/online';
import { AnimatedEntry } from '../components/AnimatedEntry';
import { SkeletonCard, SkeletonSection } from '../components/SkeletonLoader';
import { Theme } from '../constants/theme';
import { useAppTheme } from '../lib/appTheme';
import { playTapSound } from '../lib/audio';
import { goBackOrHome } from '../lib/navigation';
import { getAppSettings } from '../lib/storage';

export default function FriendsScreen() {
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const friendIds = useMemo(
    () => new Set(friends.map((friend) => friend.uid).filter(Boolean)),
    [friends],
  );

  const load = async () => {
    setLoading(true);
    const newReqs = await getIncomingFriendRequests();
    setRequests(newReqs);
    setFriends(await getMyFriends());
    setLoading(false);
    return newReqs;
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  // Live search: as the user types we debounce and query. When the box is
  // empty we show suggested players (top by score) so the list is never blank.
  useEffect(() => {
    const q = search.trim();
    let alive = true;
    const delay = q ? 300 : 0;

    const t = setTimeout(async () => {
      try {
        if (alive) setSearching(true);
        const results = q ? await searchPlayers(q) : await getSuggestedPlayers();
        const filtered = results.filter((player) => !friendIds.has(player.uid));
        if (alive) setPlayers(filtered);
      } catch {
        if (alive) setPlayers([]);
      } finally {
        if (alive) setSearching(false);
      }
    }, delay);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [friendIds, search]);

  const sendRequest = async (player: PublicUser) => {
    try {
      await sendFriendRequest(player);
      Alert.alert('Sent!', `Friend request sent to ${player.displayName}.`);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Something went wrong.');
    }
  };

  const accept = async (req: FriendRequest) => {
    await acceptFriendRequest(req);
    await load();
  };

  const reject = async (req: FriendRequest) => {
    await rejectFriendRequest(req);
    await load();
  };

  type ListItem =
    | { type: 'section'; title: string; icon: keyof typeof Ionicons['glyphMap']; count: number }
    | { type: 'request'; item: FriendRequest }
    | { type: 'player'; item: PublicUser }
    | { type: 'friend'; item: any }
    | { type: 'empty'; message: string };

  const listData: ListItem[] = [
    { type: 'section', title: 'Incoming Requests', icon: 'mail', count: requests.length },
    ...(requests.length === 0
      ? [{ type: 'empty' as const, message: 'No pending requests' }]
      : requests.map((item) => ({ type: 'request' as const, item }))),

    { type: 'section', title: search.trim() ? 'Search Results' : 'Suggested Players', icon: 'search', count: players.length },
    ...(players.length === 0
      ? [{ type: 'empty' as const, message: search.trim() ? 'No players found — try a different name' : 'No players to show yet' }]
      : players.map((item) => ({ type: 'player' as const, item }))),

    { type: 'section', title: 'My Friends', icon: 'people', count: friends.length },
    ...(friends.length === 0
      ? [{ type: 'empty' as const, message: 'no-friends-tip' }]
      : friends.map((item) => ({ type: 'friend' as const, item }))),
  ];

  const { C } = useAppTheme();

  return (
    <View style={styles.bg}>
      <Image source={require('../assets/images/wordrush-arena-background.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.divider }]}>
          <Pressable onPress={() => { playTapSound(getAppSettings().sound).catch(() => {}); goBackOrHome(); }} style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.divider }]}>
            <Ionicons name="chevron-back" size={22} color={C.ink} />
          </Pressable>
          <View style={styles.titleWrap}>
            <View style={[styles.titleIconWrap, { backgroundColor: C.surface, borderColor: C.divider }]}>
              <Ionicons name="people" size={20} color={Theme.primary} />
            </View>
            <View>
              <Text style={[styles.title, { color: C.ink }]}>Friends</Text>
              <Text style={[styles.sub, { color: C.muted }]}>Search players & send requests</Text>
            </View>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <View style={[styles.searchInputRow, { backgroundColor: C.surface, borderColor: C.divider }]}>
            <Ionicons name="search" size={17} color={C.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search player name..."
              placeholderTextColor={C.muted}
              style={[styles.searchInput, { color: C.ink }]}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searching ? (
              <ActivityIndicator size="small" color={Theme.primary} />
            ) : search.length > 0 ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={C.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
            <SkeletonSection />
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={`req-${i}`} />)}
            <SkeletonSection />
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`fr-${i}`} />)}
          </View>
        ) : (
        <FlatList
          data={listData}
          keyExtractor={(item: any, index) =>
            `${item.type}-${item.item?.uid ?? item.item?.id ?? item.title ?? index}`
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }: { item: ListItem; index: number }) => {
            if (item.type === 'section') {
              return (
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionLine, { backgroundColor: C.divider }]} />
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name={item.icon} size={13} color={C.muted} />
                    <Text style={[styles.sectionTitle, { color: C.muted }]}>{item.title}</Text>
                    {item.count > 0 && (
                      <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>{item.count}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.sectionLine, { backgroundColor: C.divider }]} />
                </View>
              );
            }

            if (item.type === 'empty') {
              if (item.message === 'no-friends-tip') {
                return (
                  <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.divider }]}>
                    <Ionicons name="people-outline" size={36} color={C.muted} />
                    <Text style={[styles.emptyCardTitle, { color: C.ink }]}>No friends yet</Text>
                    <Text style={[styles.emptyCardSub, { color: C.muted }]}>
                      Search for players by name above and send a friend request to challenge them in Battle!
                    </Text>
                  </View>
                );
              }
              return <Text style={[styles.emptyRow, { color: C.muted }]}>{item.message}</Text>;
            }

            if (item.type === 'request') {
              const req = item.item;
              return (
                <AnimatedEntry delay={Math.min(index, 6) * 50}>
                <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.divider }]}>
                  <View style={styles.cardAvatar}>
                    <Text style={styles.cardAvatarText}>{req.fromName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: C.ink }]}>{req.fromName}</Text>
                    <Text style={[styles.cardMeta, { color: C.muted }]}>wants to be your friend</Text>
                  </View>
                  <Pressable onPress={() => accept(req)} style={styles.acceptBtn}>
                    <Ionicons name="checkmark" size={18} color={Theme.success} />
                  </Pressable>
                  <Pressable onPress={() => reject(req)} style={styles.rejectBtn}>
                    <Ionicons name="close" size={18} color={Theme.danger} />
                  </Pressable>
                </View>
                </AnimatedEntry>
              );
            }

            if (item.type === 'player') {
              const player = item.item;
              return (
                <AnimatedEntry delay={Math.min(index, 6) * 50}>
                <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.divider }]}>
                  <View style={[styles.cardAvatar, styles.cardAvatarOrange]}>
                    <Text style={styles.cardAvatarText}>{player.displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: C.ink }]}>{player.displayName}</Text>
                    <Text style={[styles.cardMeta, { color: C.muted }]}>Score {(player.totalScore ?? 0).toLocaleString()}</Text>
                  </View>
                  <Pressable onPress={() => sendRequest(player)} style={styles.addBtn}>
                    <Ionicons name="person-add" size={15} color={Theme.primary} />
                    <Text style={styles.addText}>Add</Text>
                  </Pressable>
                </View>
                </AnimatedEntry>
              );
            }

            // friend row
            const friend = item.item;
            return (
              <AnimatedEntry delay={Math.min(index, 6) * 50}>
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.divider }]}>
                <View style={[styles.cardAvatar, styles.cardAvatarGreen]}>
                  <Text style={styles.cardAvatarText}>
                    {friend.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: C.ink }]}>{friend.displayName}</Text>
                  <View style={styles.friendStatusRow}>
                    <View style={styles.friendDot} />
                    <Text style={[styles.cardMeta, { color: C.muted }]}>Friend</Text>
                  </View>
                </View>
                <Pressable onPress={() => router.push('/battle')} style={styles.battleBtn}>
                  <Ionicons name="flash" size={18} color={Theme.warn} />
                  <Text style={styles.battleBtnText}>Battle</Text>
                </Pressable>
              </View>
              </AnimatedEntry>
            );
          }}
        />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIconWrap: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { fontSize: 12, marginTop: 1, fontWeight: '700' },

  // Search
  searchWrap: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 6 },
  searchInputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, minHeight: 48 },
  searchInput: { flex: 1, fontWeight: '700', fontSize: 15, paddingVertical: 10 },
  searchBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, borderRadius: 16, justifyContent: 'center', backgroundColor: Theme.primary, shadowColor: Theme.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5 },
  searchBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  list: { padding: 16, gap: 8, paddingBottom: 160 },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 6 },
  sectionLine: { flex: 1, height: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  sectionBadge: { backgroundColor: 'rgba(255,120,0,0.22)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  sectionBadgeText: { color: Theme.primary, fontSize: 10, fontWeight: '900' },

  emptyRow: { fontSize: 13, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, marginVertical: 4 },
  emptyCardTitle: { fontWeight: '900', fontSize: 16 },
  emptyCardSub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },

  // Cards
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14, borderWidth: 1 },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  cardAvatarOrange: { backgroundColor: 'rgba(255,120,0,0.22)' },
  cardAvatarGreen: { backgroundColor: 'rgba(76,195,138,0.2)' },
  cardAvatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  cardName: { fontWeight: '900', fontSize: 15 },
  cardMeta: { fontSize: 12, marginTop: 2 },
  friendStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  friendDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Theme.success },

  // Action buttons
  acceptBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(76,195,138,0.2)', borderWidth: 1, borderColor: 'rgba(76,195,138,0.4)', alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(247,108,108,0.15)', borderWidth: 1, borderColor: 'rgba(247,108,108,0.35)', alignItems: 'center', justifyContent: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,120,0,0.20)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.40)' },
  addText: { color: Theme.primary, fontWeight: '900', fontSize: 13 },
  battleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,210,63,0.16)', borderWidth: 1, borderColor: 'rgba(255,210,63,0.35)' },
  battleBtnText: { color: Theme.warn, fontWeight: '900', fontSize: 13 },
});

