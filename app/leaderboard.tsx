// app/leaderboard.tsx

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  ImageBackground,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedEntry } from "../components/AnimatedEntry";
import { SkeletonLeaderboardRow } from "../components/SkeletonLoader";
import { Theme } from "../constants/theme";
import { getGlobalLeaderboard, PublicUser } from "../lib/online";

const BG_URI =
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=90";

type LeaderboardUser = PublicUser & { rank: number };

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function LeaderboardScreen() {
  const [players, setPlayers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const isMountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText("");

      const timeout = new Promise<LeaderboardUser[]>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                "Leaderboard request timed out. Please check internet or Supabase RLS policy.",
              ),
            ),
          12000,
        );
      });

      const data = await Promise.race([
        getGlobalLeaderboard(50) as Promise<LeaderboardUser[]>,
        timeout,
      ]);

      if (!isMountedRef.current) return;
      setPlayers(data);
    } catch (error: any) {
      if (!isMountedRef.current) return;
      setPlayers([]);
      setErrorText(error?.message || "Could not load leaderboard.");
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      load();

      return () => {
        isMountedRef.current = false;
      };
    }, [load]),
  );

  return (
    <ImageBackground
      source={{ uri: BG_URI }}
      style={styles.bg}
      resizeMode="cover"
    >
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
              <Ionicons name="trophy" size={20} color={Theme.warn} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Leaderboard</Text>
              <Text style={styles.sub}>Top players by total score</Text>
            </View>
          </View>
        </View>

        {loading && players.length === 0 ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
            {Array.from({ length: 9 }).map((_, i) => <SkeletonLeaderboardRow key={i} />)}
          </View>
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
                <Ionicons
                  name={errorText ? "warning" : "trophy-outline"}
                  size={48}
                  color={Theme.textDim}
                />
                <Text style={styles.emptyText}>
                  {errorText ? "Leaderboard not loaded" : "No players yet"}
                </Text>
                <Text style={styles.emptySub}>
                  {errorText || "Complete levels to appear here!"}
                </Text>
                <Pressable onPress={load} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            }
            renderItem={({ item, index }) => {
              const isTop3 = item.rank <= 3;
              const rankColor = RANK_COLORS[item.rank - 1] ?? Theme.textDim;

              return (
                <AnimatedEntry delay={Math.min(index, 9) * 52} from="bottom">
                <View style={[styles.row, isTop3 && styles.rowTop]}>
                  {/* Rank badge */}
                  <View
                    style={[
                      styles.rankBadge,
                      isTop3 && { borderColor: rankColor },
                    ]}
                  >
                    {isTop3 ? (
                      <Ionicons name="trophy" size={22} color={rankColor} />
                    ) : (
                      <Text style={[styles.rankNum, { color: rankColor }]}>
                        {item.rank}
                      </Text>
                    )}
                  </View>

                  {/* Name + meta */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    <Text style={styles.meta}>
                      {item.levelsCompleted ?? 0} levels completed
                    </Text>
                  </View>

                  {/* Score pill */}
                  <View
                    style={[
                      styles.scorePill,
                      isTop3 && {
                        backgroundColor: `${rankColor}22`,
                        borderColor: `${rankColor}55`,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.scoreText, isTop3 && { color: rankColor }]}
                    >
                      {(item.totalScore ?? 0).toLocaleString()}
                    </Text>
                    <Text style={styles.scorePts}>pts</Text>
                  </View>
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
  bg: { flex: 1, backgroundColor: "#0D0500" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13,5,0,0.82)",
  },
  orb1: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,100,0,0.13)",
  },
  orb2: {
    position: "absolute",
    bottom: 40,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,60,0,0.09)",
  },
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,120,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,150,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  titleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,120,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "900" },
  sub: { color: Theme.textDim, fontSize: 12, marginTop: 1, fontWeight: "700" },

  list: { padding: 16, gap: 10, paddingBottom: 32 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,150,0,0.18)",
  },
  rowTop: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderColor: "rgba(255,150,0,0.28)",
  },

  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,150,0,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: { fontWeight: "900", fontSize: 16 },

  name: { color: "#fff", fontWeight: "900", fontSize: 15 },
  meta: { color: Theme.textDim, fontSize: 12, marginTop: 2 },

  scorePill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    backgroundColor: "rgba(255,120,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,150,0,0.30)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scoreText: { color: Theme.primary, fontWeight: "900", fontSize: 14 },
  scorePts: { color: Theme.textDim, fontWeight: "700", fontSize: 10 },

  emptyWrap: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  emptySub: {
    color: Theme.textDim,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Theme.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontWeight: "900", fontSize: 13 },
});
