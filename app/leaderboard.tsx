// app/leaderboard.tsx

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { getGlobalLeaderboard, getMyProfile, PublicUser } from "../lib/online";

const BG_URI =
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=90";

type LeaderboardUser = PublicUser & { rank: number };

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const RANK_LABELS = ["1st", "2nd", "3rd"];
const PODIUM_HEIGHTS = [110, 80, 65]; // center tallest

// ── Podium component for top 3 ────────────────────────────────────────────────
function Podium({ top3 }: { top3: LeaderboardUser[] }) {
  const scales = useRef(top3.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // stagger each podium block up — scales ref is stable, no need in deps
    Animated.stagger(120, scales.map((s) =>
      Animated.spring(s, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true })
    )).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Display order: 2nd | 1st | 3rd
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const orderIndices = [1, 0, 2];

  return (
    <View style={podiumStyles.wrap}>
      {order.map((player, i) => {
        const origIndex = orderIndices[i];
        const rankColor = RANK_COLORS[origIndex] ?? Theme.textDim;
        const height = PODIUM_HEIGHTS[origIndex];
        const isFirst = origIndex === 0;

        return (
          <Animated.View
            key={player.uid}
            style={[podiumStyles.slot, { transform: [{ scale: scales[origIndex] }] }]}
          >
            {/* Crown for #1 */}
            {isFirst && (
              <Text style={podiumStyles.crown}>👑</Text>
            )}
            {/* Avatar circle */}
            <View style={[podiumStyles.avatar, { borderColor: rankColor }]}>
              <Text style={podiumStyles.avatarLetter}>
                {player.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            {/* Name */}
            <Text style={podiumStyles.name} numberOfLines={1}>{player.displayName}</Text>
            {/* Score */}
            <Text style={[podiumStyles.score, { color: rankColor }]}>
              {(player.totalScore ?? 0).toLocaleString()}
            </Text>
            {/* Podium block */}
            <View style={[podiumStyles.block, { height, backgroundColor: `${rankColor}22`, borderColor: `${rankColor}55` }]}>
              <Text style={[podiumStyles.rankLabel, { color: rankColor }]}>
                {RANK_LABELS[origIndex]}
              </Text>
              <Ionicons name="trophy" size={isFirst ? 22 : 16} color={rankColor} />
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

export default function LeaderboardScreen() {
  const [players, setPlayers] = useState<LeaderboardUser[]>([]);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const isMountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText("");

      const [profileResult, leaderboardResult] = await Promise.allSettled([
        getMyProfile(),
        Promise.race([
          getGlobalLeaderboard(50) as Promise<LeaderboardUser[]>,
          new Promise<LeaderboardUser[]>((_, reject) =>
            setTimeout(() => reject(new Error("Leaderboard timed out.")), 12000)
          ),
        ]),
      ]);

      if (!isMountedRef.current) return;

      if (profileResult.status === "fulfilled" && profileResult.value) {
        setMyUid(profileResult.value.uid);
      }
      if (leaderboardResult.status === "fulfilled") {
        setPlayers(leaderboardResult.value);
      } else {
        setPlayers([]);
        setErrorText(leaderboardResult.reason?.message || "Could not load leaderboard.");
      }
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
      return () => { isMountedRef.current = false; };
    }, [load]),
  );

  const top3 = players.filter((p) => p.rank <= 3);
  const rest = players.filter((p) => p.rank > 3);

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
            {/* Podium skeleton placeholder */}
            <View style={styles.podiumSkeleton} />
            {Array.from({ length: 7 }).map((_, i) => <SkeletonLeaderboardRow key={i} />)}
          </View>
        ) : (
          <FlatList
            data={rest}
            keyExtractor={(item) => item.uid}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={load} tintColor={Theme.primary} />
            }
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              top3.length > 0 ? <Podium top3={top3} /> : null
            }
            ListEmptyComponent={
              top3.length === 0 ? (
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
              ) : null
            }
            renderItem={({ item, index }) => {
              const isMe = myUid !== null && item.uid === myUid;

              return (
                <AnimatedEntry delay={Math.min(index, 9) * 52} from="bottom">
                  <View style={[styles.row, isMe && styles.rowMe]}>
                    {/* Rank badge */}
                    <View style={[styles.rankBadge, isMe && styles.rankBadgeMe]}>
                      <Text style={[styles.rankNum, isMe && { color: Theme.warn }]}>
                        {item.rank}
                      </Text>
                    </View>

                    {/* Avatar initial */}
                    <View style={[styles.miniAvatar, isMe && { borderColor: Theme.warn }]}>
                      <Text style={styles.miniAvatarText}>
                        {item.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    {/* Name + meta */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.name, isMe && { color: Theme.warn }]} numberOfLines={1}>
                          {item.displayName}
                        </Text>
                        {isMe && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>YOU</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.meta}>
                        {item.levelsCompleted ?? 0} levels completed
                      </Text>
                    </View>

                    {/* Score pill */}
                    <View style={[styles.scorePill, isMe && { backgroundColor: "rgba(255,210,63,0.18)", borderColor: "rgba(255,210,63,0.45)" }]}>
                      <Text style={[styles.scoreText, isMe && { color: Theme.warn }]}>
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

// ── Podium styles ─────────────────────────────────────────────────────────────
const podiumStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  slot: {
    flex: 1,
    alignItems: "center",
  },
  crown: {
    fontSize: 22,
    marginBottom: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  avatarLetter: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
  },
  name: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 2,
  },
  score: {
    fontWeight: "900",
    fontSize: 13,
    marginBottom: 6,
  },
  block: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
  },
  rankLabel: {
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
  },
});

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

  podiumSkeleton: {
    height: 200,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 12,
  },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,150,0,0.18)",
  },
  rowMe: {
    backgroundColor: "rgba(255,210,63,0.08)",
    borderColor: "rgba(255,210,63,0.35)",
  },

  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255,150,0,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeMe: {
    backgroundColor: "rgba(255,210,63,0.15)",
    borderColor: "rgba(255,210,63,0.45)",
  },
  rankNum: { fontWeight: "900", fontSize: 14, color: Theme.textDim },

  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,120,0,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(255,150,0,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  youBadge: {
    backgroundColor: "rgba(255,210,63,0.22)",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255,210,63,0.45)",
  },
  youBadgeText: { color: Theme.warn, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },

  name: { color: "#fff", fontWeight: "900", fontSize: 14 },
  meta: { color: Theme.textDim, fontSize: 11, marginTop: 1 },

  scorePill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    backgroundColor: "rgba(255,120,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,150,0,0.30)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scoreText: { color: Theme.primary, fontWeight: "900", fontSize: 13 },
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
