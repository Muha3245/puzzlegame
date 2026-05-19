// app/friends.tsx

import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

export default function FriendsScreen() {
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setRequests(await getIncomingFriendRequests());
    setFriends(await getMyFriends());
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const doSearch = async () => {
    try {
      setLoading(true);
      setPlayers(await searchPlayers(search));
    } catch (error: any) {
      Alert.alert('Search error', error?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (player: PublicUser) => {
    try {
      await sendFriendRequest(player);
      Alert.alert('Request sent', `Friend request sent to ${player.displayName}.`);
    } catch (error: any) {
      Alert.alert('Request error', error?.message || 'Something went wrong.');
    }
  };

  const accept = async (request: FriendRequest) => {
    await acceptFriendRequest(request);
    await load();
  };

  const reject = async (request: FriendRequest) => {
    await rejectFriendRequest(request);
    await load();
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.sub}>Search players and send friend requests</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search player name"
          placeholderTextColor="#8A7EA6"
          style={styles.input}
        />

        <Pressable onPress={doSearch} style={styles.searchBtn}>
          <Text style={styles.searchText}>Search</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator color="#FF6F00" /> : null}

      <FlatList
        data={[
          { type: 'section', title: 'Incoming Requests' },
          ...requests.map((item) => ({ type: 'request', item })),
          { type: 'section', title: 'Search Results' },
          ...players.map((item) => ({ type: 'player', item })),
          { type: 'section', title: 'My Friends' },
          ...friends.map((item) => ({ type: 'friend', item })),
        ]}
        keyExtractor={(item: any, index) => `${item.type}-${item.item?.uid || item.item?.id || index}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }: any) => {
          if (item.type === 'section') {
            return <Text style={styles.sectionTitle}>{item.title}</Text>;
          }

          if (item.type === 'request') {
            const req = item.item as FriendRequest;

            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{req.fromName}</Text>
                  <Text style={styles.meta}>wants to be your friend</Text>
                </View>

                <Pressable onPress={() => accept(req)} style={styles.acceptBtn}>
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>

                <Pressable onPress={() => reject(req)} style={styles.rejectBtn}>
                  <Text style={styles.rejectText}>No</Text>
                </Pressable>
              </View>
            );
          }

          if (item.type === 'player') {
            const player = item.item as PublicUser;

            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{player.displayName}</Text>
                  <Text style={styles.meta}>Score {player.totalScore ?? 0}</Text>
                </View>

                <Pressable onPress={() => sendRequest(player)} style={styles.addBtn}>
                  <Text style={styles.addText}>Add</Text>
                </Pressable>
              </View>
            );
          }

          const friend = item.item;

          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{friend.displayName}</Text>
                <Text style={styles.meta}>Friend</Text>
              </View>

              <Text style={styles.friendIcon}>✅</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#DDF4FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FF6F00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    marginTop: -4,
  },
  title: { color: '#243155', fontSize: 26, fontWeight: '900' },
  sub: { color: '#697895', fontSize: 13, marginTop: 3, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    color: '#243155',
    fontWeight: '800',
  },
  searchBtn: {
    backgroundColor: '#FF6F00',
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchText: { color: '#fff', fontWeight: '900' },
  list: { padding: 16, gap: 10 },
  sectionTitle: {
    color: '#243155',
    fontWeight: '900',
    fontSize: 17,
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF4D8',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1.3,
    borderColor: '#E2D1AA',
  },
  name: { color: '#243155', fontWeight: '900', fontSize: 15 },
  meta: { color: '#697895', fontSize: 12, marginTop: 2 },
  addBtn: {
    backgroundColor: '#EFFF44',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addText: { color: '#B91F86', fontWeight: '900' },
  acceptBtn: {
    backgroundColor: '#21C76A',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  acceptText: { color: '#fff', fontWeight: '900' },
  rejectBtn: {
    backgroundColor: '#FF4D8D',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rejectText: { color: '#fff', fontWeight: '900' },
  friendIcon: { fontSize: 20 },
});
