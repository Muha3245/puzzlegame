// app/leaderboard.tsx

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedEntry } from "../components/AnimatedEntry";
import { SkeletonLeaderboardRow } from "../components/SkeletonLoader";
import { Theme } from "../constants/theme";
import { useAppTheme } from "../lib/appTheme";
import { getGlobalLeaderboard, getMyProfile, PublicUser } from "../lib/online";

type LeaderboardUser = PublicUser & { rank: number };

type Palette = {
  primary: string;
  primarySoft: string;
  success: string;
  warning: string;
  warningSoft: string;
  bronze: string;
  bronzeSoft: string;
  silver: string;
  silverSoft: string;
  gold: string;
  goldSoft: string;
  cardAlt: string;
};

const RANK_LABELS = ["1st", "2nd", "3rd"];
const PODIUM_HEIGHTS = [112, 86, 72];

function getPalette(C: any, scheme: string): Palette {
  const isDark = scheme === "dark";

  return {
    primary: C.primary || "#D94F2B",
    primarySoft: C.primarySoft || "rgba(217,79,43,0.12)",
    success: C.success || "#4CC38A",

    // Softer gold for light theme, brighter only in dark theme
    warning: isDark ? "#FFD23F" : "#B7791F",
    warningSoft: isDark ? "rgba(255,210,63,0.16)" : "rgba(183,121,31,0.10)",

    gold: isDark ? "#FFD23F" : "#B7791F",
    goldSoft: isDark ? "rgba(255,210,63,0.16)" : "rgba(183,121,31,0.10)",

    silver: isDark ? "#D1D5DB" : "#64748B",
    silverSoft: isDark ? "rgba(209,213,219,0.12)" : "rgba(100,116,139,0.10)",

    bronze: isDark ? "#D69E6A" : "#A16207",
    bronzeSoft: isDark ? "rgba(214,158,106,0.14)" : "rgba(161,98,7,0.10)",

    cardAlt: isDark ? "rgba(255,255,255,0.045)" : "rgba(28,28,30,0.035)",
  };
}

function getRankStyle(rankIndex: number, palette: Palette) {
  if (rankIndex === 0) {
    return {
      color: palette.gold,
      soft: palette.goldSoft,
      icon: "trophy" as const,
    };
  }

  if (rankIndex === 1) {
    return {
      color: palette.silver,
      soft: palette.silverSoft,
      icon: "medal" as const,
    };
  }

  return {
    color: palette.bronze,
    soft: palette.bronzeSoft,
    icon: "ribbon" as const,
  };
}

// ── Podium component for top 3 ────────────────────────────────────────────────
function Podium({ top3 }: { top3: LeaderboardUser[] }) {
  const { C, scheme } = useAppTheme();
  const palette = getPalette(C, scheme);

  const scales = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const orderedTop3 = useMemo(() => {
    const byRank = [...top3].sort((a, b) => a.rank - b.rank);
    return [byRank[1], byRank[0], byRank[2]].filter(Boolean);
  }, [top3]);

  const orderIndices = orderedTop3.map((player) => Math.max(player.rank - 1, 0));

  useEffect(() => {
    Animated.stagger(
      110,
      scales.map((scale) =>
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [scales]);

  if (!orderedTop3.length) return null;

  return (
    <View style={[podiumStyles.card, { backgroundColor: C.surface, borderColor: C.divider }]}>
      <View style={podiumStyles.cardHeader}>
        <View>
          <Text style={[podiumStyles.kicker, { color: C.muted }]}>TOP PLAYERS</Text>
          <Text style={[podiumStyles.cardTitle, { color: C.ink }]}>Hall of Fame</Text>
        </View>

        <View style={[podiumStyles.livePill, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name="flash" size={12} color={palette.primary} />
          <Text style={[podiumStyles.livePillText, { color: palette.primary }]}>
            LIVE
          </Text>
        </View>
      </View>

      <View style={podiumStyles.wrap}>
        {orderedTop3.map((player, index) => {
          const rankIndex = orderIndices[index];
          const rankStyle = getRankStyle(rankIndex, palette);
          const height = PODIUM_HEIGHTS[rankIndex] ?? 72;
          const isFirst = rankIndex === 0;

          return (
            <Animated.View
              key={player.uid}
              style={[
                podiumStyles.slot,
                {
                  transform: [
                    {
                      scale: scales[rankIndex] || scales[0],
                    },
                  ],
                },
              ]}
            >
              <View
                style={[
                  podiumStyles.avatarOuter,
                  {
                    backgroundColor: rankStyle.soft,
                    borderColor: rankStyle.color,
                  },
                  isFirst && podiumStyles.avatarOuterFirst,
                ]}
              >
                {isFirst && (
                  <View style={[podiumStyles.crownBadge, { backgroundColor: rankStyle.color }]}>
                    <Ionicons name="star" size={11} color="#fff" />
                  </View>
                )}

                <View style={[podiumStyles.avatar, { backgroundColor: C.bg }]}>
                  <Text style={[podiumStyles.avatarLetter, { color: C.ink }]}>
                    {(player.displayName || "P").charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={[podiumStyles.name, { color: C.ink }]} numberOfLines={1}>
                {player.displayName}
              </Text>

              <Text style={[podiumStyles.score, { color: rankStyle.color }]}>
                {(player.totalScore ?? 0).toLocaleString()}
              </Text>

              <View
                style={[
                  podiumStyles.block,
                  {
                    height,
                    backgroundColor: rankStyle.soft,
                    borderColor: rankStyle.color,
                  },
                ]}
              >
                <Text style={[podiumStyles.rankLabel, { color: rankStyle.color }]}>
                  {RANK_LABELS[rankIndex] ?? `${player.rank}th`}
                </Text>

                <Ionicons
                  name={rankStyle.icon}
                  size={isFirst ? 22 : 17}
                  color={rankStyle.color}
                />
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const { C, scheme, toggle } = useAppTheme();
  const palette = getPalette(C, scheme);

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
        setErrorText(
          leaderboardResult.reason?.message || "Could not load leaderboard."
        );
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

      return () => {
        isMountedRef.current = false;
      };
    }, [load])
  );

  const top3 = players.filter((player) => player.rank <= 3);
  const rest = players.filter((player) => player.rank > 3);
  const myRank = players.find((player) => myUid && player.uid === myUid);

  return (
    <View style={styles.bg}>
      <Image source={require('../assets/images/background.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              {
                backgroundColor: C.surface,
                borderColor: C.divider,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={C.ink} />
          </Pressable>

          <View style={styles.titleWrap}>
            <View
              style={[
                styles.titleIconWrap,
                {
                  backgroundColor: palette.primarySoft,
                  borderColor: palette.primary,
                },
              ]}
            >
              <Ionicons name="trophy" size={20} color={palette.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: C.ink }]}>Leaderboard</Text>
              <Text style={[styles.sub, { color: C.muted }]}>
                Top players by total score
              </Text>
            </View>
          </View>

          <Pressable onPress={toggle} style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.divider }]}>
            <Ionicons name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={C.ink} />
          </Pressable>
        </View>

        {/* Summary */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: C.surface,
              borderColor: C.divider,
            },
          ]}
        >
          <View>
            <Text style={[styles.summaryLabel, { color: C.muted }]}>
              YOUR POSITION
            </Text>
            <Text style={[styles.summaryValue, { color: C.ink }]}>
              {myRank ? `#${myRank.rank}` : "Not ranked"}
            </Text>
            <Text style={[styles.summarySub, { color: C.muted }]}>
              {myRank
                ? `${(myRank.totalScore ?? 0).toLocaleString()} total points`
                : "Play more levels to enter the leaderboard"}
            </Text>
          </View>

          <View
            style={[
              styles.summaryIcon,
              {
                backgroundColor: palette.primarySoft,
              },
            ]}
          >
            <Ionicons name="stats-chart" size={28} color={palette.primary} />
          </View>
        </View>

        {loading && players.length === 0 ? (
          <View style={styles.loadingWrap}>
            <View
              style={[
                styles.podiumSkeleton,
                {
                  backgroundColor: palette.cardAlt,
                  borderColor: C.divider,
                },
              ]}
            />
            {Array.from({ length: 7 }).map((_, index) => (
              <SkeletonLeaderboardRow key={index} />
            ))}
          </View>
        ) : (
          <FlatList
            data={rest}
            keyExtractor={(item) => item.uid}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={load}
                tintColor={palette.primary}
              />
            }
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={top3.length > 0 ? <Podium top3={top3} /> : null}
            ListEmptyComponent={
              top3.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <View
                    style={[
                      styles.emptyIcon,
                      {
                        backgroundColor: palette.primarySoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={errorText ? "warning-outline" : "trophy-outline"}
                      size={42}
                      color={palette.primary}
                    />
                  </View>

                  <Text style={[styles.emptyText, { color: C.ink }]}>
                    {errorText ? "Leaderboard not loaded" : "No players yet"}
                  </Text>

                  <Text style={[styles.emptySub, { color: C.muted }]}>
                    {errorText || "Complete levels to appear here!"}
                  </Text>

                  <Pressable
                    onPress={load}
                    style={[styles.retryBtn, { backgroundColor: palette.primary }]}
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null
            }
            renderItem={({ item, index }) => {
              const isMe = myUid !== null && item.uid === myUid;

              return (
                <AnimatedEntry delay={Math.min(index, 9) * 52} from="bottom">
                  <View
                    style={[
                      styles.row,
                      {
                        backgroundColor: C.surface,
                        borderColor: C.divider,
                      },
                      isMe && {
                        backgroundColor: palette.primarySoft,
                        borderColor: palette.primary,
                      },
                    ]}
                  >
                    {/* Rank badge */}
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor: isMe ? palette.primary : C.bg,
                          borderColor: isMe ? palette.primary : C.divider,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankNum,
                          {
                            color: isMe ? "#fff" : C.muted,
                          },
                        ]}
                      >
                        {item.rank}
                      </Text>
                    </View>

                    {/* Avatar initial */}
                    <View
                      style={[
                        styles.miniAvatar,
                        {
                          backgroundColor: C.bg,
                          borderColor: isMe ? palette.primary : C.divider,
                        },
                      ]}
                    >
                      <Text style={[styles.miniAvatarText, { color: C.ink }]}>
                        {(item.displayName || "P").charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    {/* Name + meta */}
                    <View style={styles.playerInfo}>
                      <View style={styles.nameRow}>
                        <Text
                          style={[
                            styles.name,
                            {
                              color: isMe ? palette.primary : C.ink,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.displayName}
                        </Text>

                        {isMe && (
                          <View
                            style={[
                              styles.youBadge,
                              {
                                backgroundColor: palette.primary,
                                borderColor: palette.primary,
                              },
                            ]}
                          >
                            <Text style={styles.youBadgeText}>YOU</Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.meta, { color: C.muted }]}>
                        {item.levelsCompleted ?? 0} levels completed
                      </Text>
                    </View>

                    {/* Score pill */}
                    <View
                      style={[
                        styles.scorePill,
                        {
                          backgroundColor: C.bg,
                          borderColor: C.divider,
                        },
                        isMe && {
                          backgroundColor: C.surface,
                          borderColor: palette.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreText,
                          {
                            color: isMe ? palette.primary : C.ink,
                          },
                        ]}
                      >
                        {(item.totalScore ?? 0).toLocaleString()}
                      </Text>
                      <Text style={[styles.scorePts, { color: C.muted }]}>pts</Text>
                    </View>
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

// ── Podium styles ─────────────────────────────────────────────────────────────
const podiumStyles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  kicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 1,
  },

  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  livePillText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
  },

  slot: {
    flex: 1,
    alignItems: "center",
  },

  avatarOuter: {
    width: 58,
    height: 58,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
    position: "relative",
  },

  avatarOuterFirst: {
    width: 66,
    height: 66,
    borderRadius: 25,
  },

  crownBadge: {
    position: "absolute",
    top: -10,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarLetter: {
    fontWeight: "900",
    fontSize: 18,
  },

  name: {
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 2,
    maxWidth: "96%",
  },

  score: {
    fontWeight: "900",
    fontSize: 13,
    marginBottom: 6,
  },

  block: {
    width: "100%",
    borderRadius: 16,
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
  bg: {
    flex: 1,
  },

  safe: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  titleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "900",
  },

  sub: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: "700",
  },

  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  summaryValue: {
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
  },

  summarySub: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  summaryIcon: {
    width: 58,
    height: 58,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },

  podiumSkeleton: {
    height: 250,
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 12,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 9,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
  },

  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  rankNum: {
    fontWeight: "900",
    fontSize: 14,
  },

  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  miniAvatarText: {
    fontWeight: "900",
    fontSize: 15,
  },

  playerInfo: {
    flex: 1,
    minWidth: 0,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  youBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },

  youBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  name: {
    flexShrink: 1,
    fontWeight: "900",
    fontSize: 14,
  },

  meta: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "700",
  },

  scorePill: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 76,
  },

  scoreText: {
    fontWeight: "900",
    fontSize: 13,
  },

  scorePts: {
    fontWeight: "700",
    fontSize: 10,
    marginTop: -1,
  },

  emptyWrap: {
    alignItems: "center",
    marginTop: 60,
    gap: 8,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: "900",
  },

  emptySub: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 19,
  },

  retryBtn: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },

  retryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
  },
});