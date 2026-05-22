// app/friends.tsx

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  Pressable,
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
  PublicUser,
  rejectFriendRequest,
  searchPlayers,
  sendFriendRequest,
} from '../lib/online';
import { notifyFriendRequest } from '../lib/notifications';
import { AnimatedEntry } from '../components/AnimatedEntry';
import { SkeletonCard, SkeletonSection } from '../components/SkeletonLoader';
import { Theme } from '../constants/theme';

const BG_URI =
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';

export default function FriendsScreen() {
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const prevRequestsRef = useRef<string[]>([]);

  const load = async () => {
    setLoading(true);
    const newReqs = await getIncomingFriendRequests();
    setRequests(newReqs);
    setFriends(await getMyFriends());
    setLoading(false);
    return newReqs;
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  // Notify on new friend requests
  useEffect(() => {
    const prev = prevRequestsRef.current;
    const newOnes = requests.filter((r) => !prev.includes(r.id));
    newOnes.forEach((r) => notifyFriendRequest(r.fromName).catch(() => {}));
    prevRequestsRef.current = requests.map((r) => r.id);
  }, [requests]);

  const doSearch = async () => {
    if (!search.trim()) return;
    try {
      setSearching(true);
      setPlayers(await searchPlayers(search));
    } catch (error: any) {
      Alert.alert('Search error', error?.message || 'Something went wrong.');
    } finally {
      setSearching(false);
    }
  };

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

    { type: 'section', title: 'Search Results', icon: 'search', count: players.length },
    ...(players.length === 0
      ? [{ type: 'empty' as const, message: search.trim() ? 'No players found — try a different name' : 'Type a name above and tap Search' }]
      : players.map((item) => ({ type: 'player' as const, item }))),

    { type: 'section', title: 'My Friends', icon: 'people', count: friends.length },
    ...(friends.length === 0
      ? [{ type: 'empty' as const, message: 'no-friends-tip' }]
      : friends.map((item) => ({ type: 'friend' as const, item }))),
  ];

  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.titleWrap}>
            <View style={styles.titleIconWrap}>
              <Ionicons name="people" size={20} color={Theme.primary} />
            </View>
            <View>
              <Text style={styles.title}>Friends</Text>
              <Text style={styles.sub}>Search players & send requests</Text>
            </View>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <View style={styles.searchInputRow}>
            <Ionicons name="search" size={17} color={Theme.textDim} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search player name..."
              placeholderTextColor="rgba(200,168,122,0.45)"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={doSearch}
            />
            {searching && <ActivityIndicator size="small" color={Theme.primary} />}
          </View>
          <Pressable onPress={doSearch} style={styles.searchBtn}>
            <Ionicons name="search" size={16} color="#fff" />
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
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
                  <View style={styles.sectionLine} />
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name={item.icon} size={13} color={Theme.textDim} />
                    <Text style={styles.sectionTitle}>{item.title}</Text>
                    {item.count > 0 && (
                      <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>{item.count}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.sectionLine} />
                </View>
              );
            }

            if (item.type === 'empty') {
              if (item.message === 'no-friends-tip') {
                return (
                  <View style={styles.emptyCard}>
                    <Ionicons name="people-outline" size={36} color={Theme.textDim} />
                    <Text style={styles.emptyCardTitle}>No friends yet</Text>
                    <Text style={styles.emptyCardSub}>
                      Search for players by name above and send a friend request to challenge them in Battle!
                    </Text>
                  </View>
                );
              }
              return <Text style={styles.emptyRow}>{item.message}</Text>;
            }

            if (item.type === 'request') {
              const req = item.item;
              return (
                <AnimatedEntry delay={Math.min(index, 6) * 50}>
                <View style={styles.card}>
                  <View style={styles.cardAvatar}>
                    <Text style={styles.cardAvatarText}>{req.fromName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{req.fromName}</Text>
                    <Text style={styles.cardMeta}>wants to be your friend</Text>
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
                <View style={styles.card}>
                  <View style={[styles.cardAvatar, styles.cardAvatarOrange]}>
                    <Text style={styles.cardAvatarText}>{player.displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{player.displayName}</Text>
                    <Text style={styles.cardMeta}>Score {(player.totalScore ?? 0).toLocaleString()}</Text>
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
              <View style={styles.card}>
                <View style={[styles.cardAvatar, styles.cardAvatarGreen]}>
                  <Text style={styles.cardAvatarText}>
                    {friend.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{friend.displayName}</Text>
                  <View style={styles.friendStatusRow}>
                    <View style={styles.friendDot} />
                    <Text style={styles.cardMeta}>Friend</Text>
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0D0500' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,5,0,0.82)' },
  orb1: { position: 'absolute', top: -40, left: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,100,0,0.13)' },
  orb2: { position: 'absolute', bottom: 60, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,60,0,0.09)' },
  safe: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,120,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,120,0,0.18)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  sub: { color: Theme.textDim, fontSize: 12, marginTop: 1, fontWeight: '700' },

  // Search
  searchWrap: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 6 },
  searchInputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,150,0,0.20)', paddingHorizontal: 14, minHeight: 48 },
  searchInput: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 15, paddingVertical: 10 },
  searchBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, borderRadius: 16, justifyContent: 'center', backgroundColor: Theme.primary, shadowColor: Theme.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5 },
  searchBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  list: { padding: 16, gap: 8, paddingBottom: 32 },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 6 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,150,0,0.15)' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionTitle: { color: Theme.textDim, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  sectionBadge: { backgroundColor: 'rgba(255,120,0,0.22)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  sectionBadgeText: { color: Theme.primary, fontSize: 10, fontWeight: '900' },

  emptyRow: { color: 'rgba(200,168,122,0.45)', fontSize: 13, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.14)', marginVertical: 4 },
  emptyCardTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  emptyCardSub: { color: Theme.textDim, fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19 },

  // Cards
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,150,0,0.18)' },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  cardAvatarOrange: { backgroundColor: 'rgba(255,120,0,0.22)' },
  cardAvatarGreen: { backgroundColor: 'rgba(76,195,138,0.2)' },
  cardAvatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  cardName: { color: '#fff', fontWeight: '900', fontSize: 15 },
  cardMeta: { color: Theme.textDim, fontSize: 12, marginTop: 2 },
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
