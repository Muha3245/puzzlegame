// app/friends.tsx
// Friends screen — dark navy glass aesthetic.

import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
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
import { Theme } from '../constants/theme';

const BG_URI =
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=90';

export default function FriendsScreen() {
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const load = async () => {
    setRequests(await getIncomingFriendRequests());
    setFriends(await getMyFriends());
  };

  useFocusEffect(useCallback(() => { load(); }, []));

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
      Alert.alert('✅ Sent!', `Friend request sent to ${player.displayName}.`);
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
    | { type: 'section'; title: string; count: number }
    | { type: 'request'; item: FriendRequest }
    | { type: 'player'; item: PublicUser }
    | { type: 'friend'; item: any }
    | { type: 'empty'; message: string };

  const listData: ListItem[] = [
    { type: 'section', title: 'Incoming Requests', count: requests.length },
    ...(requests.length === 0
      ? [{ type: 'empty' as const, message: 'No pending requests' }]
      : requests.map((item) => ({ type: 'request' as const, item }))),

    { type: 'section', title: 'Search Results', count: players.length },
    ...(players.length === 0
      ? [{ type: 'empty' as const, message: 'Search for a player name above' }]
      : players.map((item) => ({ type: 'player' as const, item }))),

    { type: 'section', title: 'My Friends', count: friends.length },
    ...(friends.length === 0
      ? [{ type: 'empty' as const, message: 'No friends yet' }]
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
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>👥 Friends</Text>
            <Text style={styles.sub}>Search players & send requests</Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <View style={styles.searchInputRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search player name..."
              placeholderTextColor="rgba(164,176,216,0.45)"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={doSearch}
            />
            {searching && <ActivityIndicator size="small" color={Theme.primary} />}
          </View>
          <Pressable onPress={doSearch} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
        </View>

        <FlatList
          data={listData}
          keyExtractor={(item: any, index) =>
            `${item.type}-${item.item?.uid ?? item.item?.id ?? item.title ?? index}`
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: ListItem }) => {
            if (item.type === 'section') {
              return (
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionLine} />
                  <Text style={styles.sectionTitle}>{item.title}</Text>
                  {item.count > 0 && (
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>{item.count}</Text>
                    </View>
                  )}
                  <View style={styles.sectionLine} />
                </View>
              );
            }

            if (item.type === 'empty') {
              return (
                <Text style={styles.emptyRow}>{item.message}</Text>
              );
            }

            if (item.type === 'request') {
              const req = item.item;
              return (
                <View style={styles.card}>
                  <View style={styles.cardAvatar}>
                    <Text style={styles.cardAvatarText}>
                      {req.fromName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{req.fromName}</Text>
                    <Text style={styles.cardMeta}>wants to be your friend</Text>
                  </View>
                  <Pressable onPress={() => accept(req)} style={styles.acceptBtn}>
                    <Text style={styles.acceptText}>✓</Text>
                  </Pressable>
                  <Pressable onPress={() => reject(req)} style={styles.rejectBtn}>
                    <Text style={styles.rejectText}>✕</Text>
                  </Pressable>
                </View>
              );
            }

            if (item.type === 'player') {
              const player = item.item;
              return (
                <View style={styles.card}>
                  <View style={[styles.cardAvatar, { backgroundColor: 'rgba(91,155,255,0.2)' }]}>
                    <Text style={styles.cardAvatarText}>
                      {player.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{player.displayName}</Text>
                    <Text style={styles.cardMeta}>
                      Score {(player.totalScore ?? 0).toLocaleString()}
                    </Text>
                  </View>
                  <Pressable onPress={() => sendRequest(player)} style={styles.addBtn}>
                    <Text style={styles.addText}>+ Add</Text>
                  </Pressable>
                </View>
              );
            }

            // friend
            const friend = item.item;
            return (
              <View style={styles.card}>
                <View style={[styles.cardAvatar, { backgroundColor: 'rgba(76,195,138,0.2)' }]}>
                  <Text style={styles.cardAvatarText}>
                    {friend.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{friend.displayName}</Text>
                  <Text style={styles.cardMeta}>Friend</Text>
                </View>
                <Pressable onPress={() => router.push('/battle')} style={styles.battleBtn}>
                  <Text style={styles.battleBtnText}>⚔️</Text>
                </Pressable>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#050c20' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,8,32,0.75)' },
  orb1: {
    position: 'absolute', top: -40, left: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(91,155,255,0.1)',
  },
  orb2: {
    position: 'absolute', bottom: 60, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(76,195,138,0.1)',
  },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#fff', fontSize: 32, fontWeight: '700', lineHeight: 34 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  sub: { color: Theme.textDim, fontSize: 13, marginTop: 2, fontWeight: '700' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  searchInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    paddingVertical: 10,
  },
  searchBtn: {
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.primary,
    shadowColor: Theme.primary,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  searchBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  list: { padding: 16, gap: 8, paddingBottom: 32 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  sectionTitle: { color: Theme.textDim, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  sectionBadge: {
    backgroundColor: 'rgba(91,155,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sectionBadgeText: { color: Theme.primary, fontSize: 10, fontWeight: '900' },

  emptyRow: {
    color: 'rgba(164,176,216,0.45)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Player card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardAvatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  cardName: { color: '#fff', fontWeight: '900', fontSize: 15 },
  cardMeta: { color: Theme.textDim, fontSize: 12, marginTop: 2 },

  acceptBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(76,195,138,0.2)',
    borderWidth: 1, borderColor: 'rgba(76,195,138,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  acceptText: { color: Theme.success, fontWeight: '900', fontSize: 16 },

  rejectBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(247,108,108,0.15)',
    borderWidth: 1, borderColor: 'rgba(247,108,108,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  rejectText: { color: Theme.danger, fontWeight: '900', fontSize: 15 },

  addBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: 'rgba(91,155,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(91,155,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: Theme.primary, fontWeight: '900', fontSize: 13 },
  addText: { color: Theme.primary, fontWeight: '900', fontSize: 13 },
  battleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,210,63,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,210,63,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  battleBtnText: { color: Theme.warn, fontWeight: '900', fontSize: 18 },

  addBtnActive: { backgroundColor: Theme.primary },
  addBtnActiveText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
