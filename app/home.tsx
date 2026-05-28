import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Theme } from '../constants/theme';
import { useAppTheme } from '../lib/appTheme';
import { useAppState } from '../lib/storage';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function issueNumber() {
  return Math.floor((Date.now() - new Date('2024-01-01').getTime()) / 86400000) + 1;
}

function dateLabel() {
  const d = new Date();
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()}`;
}

// ─── Player card ──────────────────────────────────────────────────────────────

function PlayerCard({ name, streak, wins }: { name: string; streak: number; wins: number }) {
  const { C, scheme } = useAppTheme();
  const initial = name?.charAt(0)?.toUpperCase() || 'P';

  const rank =
    wins >= 50
      ? { label: 'GOLD', color: '#FFD23F' }
      : wins >= 20
        ? { label: 'SILVER', color: '#A8B4C0' }
        : { label: 'BRONZE', color: '#CD7F32' };

  return (
    <View style={[styles.playerCard, { backgroundColor: C.surface, borderColor: C.divider }]}>
      {/* Accent strip */}
      <View style={[styles.playerStrip, { backgroundColor: Theme.primary }]} />

      <View style={styles.playerBody}>
        {/* Avatar with ring */}
        <View style={styles.playerAvatarWrap}>
          <View style={[styles.avatarRing, { borderColor: Theme.primary, backgroundColor: C.surface }]}>
            <View style={[styles.avatarInner, { backgroundColor: Theme.primary }]}>
              <Text style={styles.playerInitial}>{initial}</Text>
            </View>
          </View>
          <View style={[styles.onlineDot, { borderColor: C.surface }]} />
        </View>

        {/* Name + XP */}
        <View style={styles.playerInfo}>
          <Text style={[styles.playerGreet, { color: C.muted }]}>{greeting()}</Text>
          <View style={styles.nameRow}>
            <Text style={[styles.playerName, { color: C.ink }]} numberOfLines={1}>
              {name}.
            </Text>
            <View
              style={[
                styles.rankPill,
                { backgroundColor: rank.color + '22', borderColor: rank.color + '55' },
              ]}
            >
              <Text style={[styles.rankPillText, { color: rank.color }]}>{rank.label}</Text>
            </View>
          </View>

          <View style={styles.xpRow}>
            <Text style={[styles.xpLabel, { color: C.muted }]}>LVL 12</Text>
            <View style={[styles.xpTrack, { backgroundColor: C.divider }]}>
              <View style={[styles.xpFill, { width: '62%', backgroundColor: Theme.primary }]} />
            </View>
            <Text style={[styles.xpLabel, { color: C.muted }]}>620 XP</Text>
          </View>
        </View>

        {/* Streak badge */}
        <View
          style={[
            styles.streakBox,
            {
              backgroundColor:
                scheme === 'dark' ? 'rgba(255,122,0,0.13)' : 'rgba(255,122,0,0.08)',
              borderColor: 'rgba(255,122,0,0.35)',
            },
          ]}
        >
          <Ionicons name="flame" size={26} color={Theme.primary} />
          <Text style={[styles.streakNum, { color: C.ink }]}>{streak}</Text>
          <Text style={[styles.streakLabel, { color: C.muted }]}>{'DAY\nSTREAK'}</Text>
        </View>
      </View>

      {/* Footer stats */}
      <View style={[styles.playerFooter, { borderTopColor: C.divider }]}>
        <View style={styles.playerStat}>
          <View style={[styles.statIconBox, { backgroundColor: Theme.success + '22' }]}>
            <Ionicons name="trophy" size={15} color={Theme.success} />
          </View>
          <View>
            <Text style={[styles.playerStatVal, { color: C.ink }]}>{wins}</Text>
            <Text style={[styles.playerStatLabel, { color: C.muted }]}>WINS THIS WK</Text>
          </View>
        </View>

        <View style={[styles.playerStatDiv, { backgroundColor: C.divider }]} />

        <View style={styles.playerStat}>
          <View style={[styles.statIconBox, { backgroundColor: '#8E6BFF22' }]}>
            <Ionicons name="ribbon" size={15} color="#8E6BFF" />
          </View>
          <View>
            <Text style={[styles.playerStatVal, { color: C.ink }]}>#—</Text>
            <Text style={[styles.playerStatLabel, { color: C.muted }]}>GLOBAL RANK</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Offline card (full-width, horizontal) ────────────────────────────────────

function OfflineCard({ onPress }: { onPress: () => void }) {
  const { C } = useAppTheme();
  const op = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(-18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(tx, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [op, tx]);

  const GREEN = '#7AC943';

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateX: tx }] }}>
      <AnimatedPressable
        style={[styles.offlineCard, { backgroundColor: C.surface, borderColor: C.divider, shadowColor: GREEN }]}
        onPress={onPress}
      >
        <View style={[styles.offlineStrip, { backgroundColor: GREEN }]} />

        <View style={styles.offlineBody}>
          {/* Icon block */}
          <View style={[styles.offlineIconWrap, { backgroundColor: GREEN }]}>
            <Ionicons name="game-controller" size={30} color="#fff" />
          </View>

          {/* Content */}
          <View style={styles.offlineContent}>
            <View style={styles.offlineMetaRow}>
              <View style={[styles.offlineBadge, { backgroundColor: GREEN }]}>
                <Text style={styles.offlineBadgeText}>PRACTICE</Text>
              </View>
              <Text style={[styles.offlineLevels, { color: C.muted }]}>12 levels</Text>
            </View>
            <Text style={[styles.offlineTitle, { color: C.ink }]}>Offline</Text>
            <Text style={[styles.offlineSub, { color: C.muted }]}>
              Word Search · XOX · Bot
            </Text>
          </View>

          {/* Arrow */}
          <View style={[styles.offlineArrow, { backgroundColor: GREEN }]}>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── Live card (half-width, vertical) ────────────────────────────────────────

function LiveCard({
  icon,
  title,
  meta,
  accentColor,
  onPress,
  delay = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta: string;
  accentColor: string;
  onPress: () => void;
  delay?: number;
}) {
  const { C } = useAppTheme();
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, [op, ty, delay]);

  return (
    <Animated.View style={[styles.liveCardOuter, { opacity: op, transform: [{ translateY: ty }] }]}>
      <AnimatedPressable
        style={[styles.liveCard, { backgroundColor: C.surface, borderColor: C.divider, shadowColor: accentColor }]}
        onPress={onPress}
      >
        <View style={[styles.liveStrip, { backgroundColor: accentColor }]} />

        <View style={styles.liveBody}>
          {/* Top: icon + LIVE badge */}
          <View style={styles.liveTopRow}>
            <View style={[styles.liveIconBox, { backgroundColor: accentColor }]}>
              <Ionicons name={icon} size={22} color="#fff" />
            </View>
            <View style={[styles.liveBadge, { backgroundColor: accentColor }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.liveTitle, { color: C.ink }]}>{title}</Text>

          {/* Online count */}
          <Text style={[styles.liveMeta, { color: C.muted }]}>{meta}</Text>

          {/* Play button */}
          <View style={[styles.livePlayBtn, { backgroundColor: accentColor }]}>
            <Ionicons name="play" size={11} color="#fff" />
            <Text style={styles.livePlayText}>PLAY</Text>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── Home screen ──────────────────────────────────────────────────────────────

export default function Home() {
  const { state } = useAppState();
  const insets = useSafeAreaInsets();
  const { C, scheme, toggle } = useAppTheme();

  return (
    <View style={[styles.safe, { backgroundColor: C.bg }]}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={C.bg}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={[styles.brandIcon, { backgroundColor: C.ink }]}>
              <Ionicons name="sparkles" size={13} color={C.bg} />
            </View>
            <Text style={[styles.brandText, { color: C.ink }]}>PUZZLE ARENA</Text>
          </View>

          <View style={styles.topRight}>
            <AnimatedPressable
              style={[styles.topBtn, { backgroundColor: C.surface, borderColor: C.divider }]}
              onPress={toggle}
            >
              <Ionicons
                name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={C.ink}
              />
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.topBtn, { backgroundColor: C.surface, borderColor: C.divider }]}
              onPress={() => router.push('/friends')}
            >
              <Ionicons name="notifications" size={18} color={C.ink} />
              <View style={styles.bellDot} />
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.coinPill, { backgroundColor: C.ink }]}
              onPress={() => router.push('/coins')}
            >
              <View style={styles.coinCircle}>
                <Ionicons name="logo-bitcoin" size={11} color={C.bg} />
              </View>
              <Text style={[styles.coinText, { color: C.bg }]}>
                {state.coins.toLocaleString()}
              </Text>
            </AnimatedPressable>
          </View>
        </View>

        {/* ── Date ── */}
        <Text style={[styles.dateLine, { color: C.muted }]}>
          {dateLabel()} · ISSUE {issueNumber()}
        </Text>

        {/* ── Player card ── */}
        <PlayerCard name={state.profile.name} streak={7} wins={14} />

        {/* ── Section header ── */}
        <View style={styles.sectionBar}>
          <Text style={[styles.sectionLabel, { color: C.muted }]}># GAME MODES</Text>
          <AnimatedPressable onPress={() => {}}>
            <Text style={[styles.sectionAll, { color: C.ink }]}>All {'>'}</Text>
          </AnimatedPressable>
        </View>
        <View style={[styles.sectionDivider, { backgroundColor: C.divider }]} />

        {/* ── Modes ── */}
        <View style={styles.modesList}>
          {/* Full-width offline card */}
          <OfflineCard onPress={() => router.push('/offline' as any)} />

          {/* 2-column live cards */}
          <View style={styles.liveRow}>
            <LiveCard
              icon="flash"
              title="Word Battle"
              meta="4 queued"
              accentColor="#E5452A"
              onPress={() => router.push('/battle')}
              delay={100}
            />
            <LiveCard
              icon="grid"
              title="XOX Online"
              meta="127 online"
              accentColor="#8E6BFF"
              onPress={() => router.push('/xox-battle' as any)}
              delay={200}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },

  // ── Top bar ──────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.4 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E5452A',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 999 },
  coinCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFD23F', alignItems: 'center', justifyContent: 'center' },
  coinText: { fontSize: 13, fontWeight: '800' },

  // ── Date ─────────────────────────────────────────────────────────────────────
  dateLine: { paddingHorizontal: 20, marginTop: 8, marginBottom: 16, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  // ── Player card ───────────────────────────────────────────────────────────────
  playerCard: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    elevation: 6,
  },
  playerStrip: { width: '100%', height: 4 },
  playerBody: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  playerAvatarWrap: { position: 'relative', flexShrink: 0 },
  avatarRing: { padding: 3, borderRadius: 22, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  avatarInner: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  playerInitial: { fontSize: 24, fontWeight: '900', color: '#fff' },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CC38A',
    borderWidth: 2.5,
  },
  playerInfo: { flex: 1, minWidth: 0 },
  playerGreet: { fontSize: 12, fontWeight: '700', marginBottom: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'nowrap' },
  playerName: { fontSize: 20, fontWeight: '900', lineHeight: 24, flexShrink: 1 },
  rankPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1, flexShrink: 0 },
  rankPillText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  xpTrack: { flex: 1, height: 4, borderRadius: 999, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 999 },
  streakBox: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    minWidth: 68,
  },
  streakNum: { fontSize: 24, fontWeight: '900', lineHeight: 28 },
  streakLabel: { fontSize: 8, fontWeight: '800', textAlign: 'center', letterSpacing: 0.3, lineHeight: 11 },
  playerFooter: { flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 13 },
  playerStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  playerStatVal: { fontSize: 18, fontWeight: '900', lineHeight: 22 },
  playerStatLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  playerStatDiv: { width: 1, height: 30, marginHorizontal: 4 },

  // ── Section ───────────────────────────────────────────────────────────────────
  sectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  sectionAll: { fontSize: 12, fontWeight: '700' },
  sectionDivider: { height: 1, marginHorizontal: 20, marginBottom: 16 },

  // ── Modes layout ──────────────────────────────────────────────────────────────
  modesList: { paddingHorizontal: 20, gap: 12 },
  liveRow: { flexDirection: 'row', gap: 12 },
  liveCardOuter: { flex: 1 },

  // ── Offline card ──────────────────────────────────────────────────────────────
  offlineCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  offlineStrip: { width: '100%', height: 4 },
  offlineBody: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  offlineIconWrap: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  offlineContent: { flex: 1 },
  offlineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  offlineBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  offlineBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.4 },
  offlineLevels: { fontSize: 11, fontWeight: '600' },
  offlineTitle: { fontSize: 22, fontWeight: '900', lineHeight: 26, marginBottom: 2 },
  offlineSub: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  offlineArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // ── Live card ─────────────────────────────────────────────────────────────────
  liveCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  liveStrip: { width: '100%', height: 4 },
  liveBody: { padding: 14 },
  liveTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  liveIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.4 },
  liveTitle: { fontSize: 18, fontWeight: '900', lineHeight: 22, marginBottom: 5 },
  liveMeta: { fontSize: 11, fontWeight: '600', marginBottom: 14 },
  livePlayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 14 },
  livePlayText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
});
