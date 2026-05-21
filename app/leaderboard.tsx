// app/leaderboard.tsx
// Global leaderboard — dark navy glass aesthetic.

import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getGlobalLeaderboard, PublicUser } from '../lib/online';
import { Theme } from '../constants/theme';

const BG_URI =
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=90';

type LeaderboardUser = PublicUser & { rank: number };

const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS  = ['#FFD700', '#C0C0C0', '#CD7F32'];

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

  useFocusEffect(useCallback(() => { load(); }, []));

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
            <Text style={styles.title}>🏆 Leaderboard</Text>
            <Text style={styles.sub}>Top players by total score</Text>
          </View>
        </View>

        {loading && players.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={Theme.primary} size="large" />
        ) : (
          <FlatList
            data={players}
            keyExtractor={(item) => item.uid}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={load}
                tintColor={Theme.primary}
              />
            }
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIcon}>🏜️</Text>
                <Text style={styles.emptyText}>No players yet</Text>
                <Text style={styles.emptySub}>Complete levels to appear here!</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isTop3 = item.rank <= 3;
              const medal  = RANK_MEDALS[item.rank - 1];
              const rankColor = RANK_COLORS[item.rank - 1] ?? Theme.textDim;

              return (
                <View style={[styles.row, isTop3 && styles.rowTop]}>
                  {/* Rank badge */}
                  <View style={[styles.rankBadge, isTop3 && { borderColor: rankColor }]}>
                    {isTop3 ? (
                      <Text style={styles.medalEmoji}>{medal}</Text>
                    ) : (
                      <Text style={[styles.rankNum, { color: rankColor }]}>{item.rank}</Text>
                    )}
                  </View>

                  {/* Name + meta */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
                    <Text style={styles.meta}>{item.levelsCompleted ?? 0} levels completed</Text>
                  </View>

                  {/* Score pill */}
                  <View style={[styles.scorePill, isTop3 && { backgroundColor: `${rankColor}22`, borderColor: `${rankColor}55` }]}>
                    <Text style={[styles.scoreText, isTop3 && { color: rankColor }]}>
                      {(item.totalScore ?? 0).toLocaleString()}
                    </Text>
                    <Text style={styles.scorePts}>pts</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#050c20' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,8,32,0.75)' },
  orb1: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,210,63,0.1)',
  },
  orb2: {
    position: 'absolute', bottom: 40, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(91,155,255,0.1)',
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

  list: { padding: 16, gap: 10, paddingBottom: 32 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rowTop: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderColor: 'rgba(255,255,255,0.18)',
  },

  rankBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  medalEmoji: { fontSize: 22 },
  rankNum: { fontWeight: '900', fontSize: 16 },

  name: { color: '#fff', fontWeight: '900', fontSize: 15 },
  meta: { color: Theme.textDim, fontSize: 12, marginTop: 2 },

  scorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    backgroundColor: 'rgba(91,155,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(91,155,255,0.3)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scoreText: { color: Theme.primary, fontWeight: '900', fontSize: 14 },
  scorePts: { color: Theme.textDim, fontWeight: '700', fontSize: 10 },

  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  emptySub: { color: Theme.textDim, fontSize: 13, fontWeight: '600' },
});
