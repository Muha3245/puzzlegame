// app/leaderboard.tsx

import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getGlobalLeaderboard, PublicUser } from '../lib/online';

type LeaderboardUser = PublicUser & { rank: number };

export default function LeaderboardScreen() {
  const [players, setPlayers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getGlobalLeaderboard(50);
      setPlayers(data as LeaderboardUser[]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.sub}>Top players by total score</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#FF6F00" />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.uid}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.rankBadge, item.rank <= 3 && styles.rankBadgeTop]}>
                <Text style={styles.rankText}>{item.rank}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.meta}>
                  {item.levelsCompleted ?? 0} levels completed
                </Text>
              </View>

              <View style={styles.scorePill}>
                <Text style={styles.scoreText}>{item.totalScore ?? 0}</Text>
              </View>
            </View>
          )}
        />
      )}
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
  list: { padding: 16, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF4D8',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.3,
    borderColor: '#E2D1AA',
  },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#B9A7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeTop: { backgroundColor: '#FFD21F' },
  rankText: { color: '#46235D', fontWeight: '900', fontSize: 16 },
  name: { color: '#243155', fontWeight: '900', fontSize: 16 },
  meta: { color: '#697895', fontSize: 12, marginTop: 2 },
  scorePill: {
    backgroundColor: '#FF6F00',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scoreText: { color: '#fff', fontWeight: '900' },
});
