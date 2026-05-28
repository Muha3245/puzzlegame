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
import { useAppTheme } from '../lib/appTheme';
import { useAppState } from '../lib/storage';

function greeting() {
  const h = new Date().getHours();

  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';

  return 'Good evening,';
}

function issueNumber() {
  return (
    Math.floor(
      (Date.now() - new Date('2024-01-01').getTime()) / 86400000
    ) + 1
  );
}

function dateLabel() {
  const d = new Date();

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];

  return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()}`;
}

function ModeItem({
  num,
  icon,
  badge,
  badgeColor,
  dot,
  meta,
  title,
  subtitle,
  onPress,
  delay = 0,
}: {
  num: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge: string;
  badgeColor: string;
  dot?: boolean;
  meta: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  delay?: number;
}) {
  const { C } = useAppTheme();

  const op = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: 1,
        duration: 360,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(tx, {
        toValue: 0,
        duration: 360,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [op, tx, delay]);

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateX: tx }] }}>
      <AnimatedPressable style={styles.modeRow} onPress={onPress}>
        <Text style={[styles.modeNum, { color: C.divider }]}>{num}</Text>

        <View style={[styles.modeIcon, { backgroundColor: C.ink }]}>
          <Ionicons name={icon} size={22} color={C.bg} />
        </View>

        <View style={styles.modeContent}>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              {dot && <View style={styles.liveDot} />}
              <Text style={styles.badgeText}>{badge}</Text>
            </View>

            <Text style={[styles.metaText, { color: C.muted }]}>{meta}</Text>
          </View>

          <Text style={[styles.modeTitle, { color: C.ink }]}>{title}</Text>
          <Text style={[styles.modeSub, { color: C.muted }]}>{subtitle}</Text>
        </View>

        <View style={[styles.arrowCircle, { backgroundColor: C.ink }]}>
          <Ionicons name="arrow-forward" size={14} color={C.bg} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

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
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingBottom: 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={[styles.brandIcon, { backgroundColor: C.ink }]}>
              <Ionicons name="sparkles" size={13} color={C.bg} />
            </View>

            <Text style={[styles.brandText, { color: C.ink }]}>
              PUZZLE ARENA
            </Text>
          </View>

          <View style={styles.topRight}>
            <AnimatedPressable
              style={[
                styles.bellBtn,
                {
                  backgroundColor: C.surface,
                  borderColor: C.divider,
                },
              ]}
              onPress={toggle}
            >
              <Ionicons
                name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={C.ink}
              />
            </AnimatedPressable>

            <AnimatedPressable
              style={[
                styles.bellBtn,
                {
                  backgroundColor: C.surface,
                  borderColor: C.divider,
                },
              ]}
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
                <Ionicons name="logo-bitcoin" size={11} color="#1C1C1E" />
              </View>

              <Text style={styles.coinText}>
                {state.coins.toLocaleString()}
              </Text>
            </AnimatedPressable>
          </View>
        </View>

        {/* Date / issue */}
        <Text style={[styles.dateLine, { color: C.muted }]}>
          {dateLabel()} · ISSUE {issueNumber()}
        </Text>

        {/* Greeting */}
        <View style={styles.greetBlock}>
          <Text style={[styles.greetLine, { color: C.ink }]}>
            {greeting()}
          </Text>

          <Text style={[styles.greetName, { color: C.ink }]}>
            {state.profile.name}.
          </Text>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { borderColor: C.divider }]}>
          <View style={styles.statCell}>
            <Text style={[styles.statNum, { color: C.primary || '#D94F2B' }]}>
              7
            </Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>
              DAY STREAK
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: C.divider }]}
          />

          <View style={styles.statCell}>
            <Text style={[styles.statNum, { color: C.ink }]}>14</Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>
              WINS THIS WK
            </Text>
          </View>

          <View
            style={[styles.statDivider, { backgroundColor: C.divider }]}
          />

          <View style={styles.statCell}>
            <Text style={[styles.statNum, { color: C.ink }]}>#</Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>
              GLOBAL RANK
            </Text>
          </View>
        </View>

        {/* Section header */}
        <View style={styles.sectionBar}>
          <Text style={[styles.sectionLabel, { color: C.muted }]}>
            # GAME MODES
          </Text>

          <AnimatedPressable onPress={() => {}}>
            <Text style={[styles.sectionAll, { color: C.ink }]}>
              All {'>'}
            </Text>
          </AnimatedPressable>
        </View>

        <View style={[styles.divider, { backgroundColor: C.divider }]} />

        {/* Mode list */}
        <ModeItem
          num="01"
          icon="game-controller"
          badge="PRACTICE"
          badgeColor="#7AC943"
          meta="12 levels"
          title="Offline"
          subtitle="Word Search, XOX, bot — your training ground."
          onPress={() => router.push('/offline' as any)}
        />

        <View style={[styles.divider, { backgroundColor: C.divider }]} />

        <ModeItem
          num="02"
          icon="flash"
          badge="LIVE"
          badgeColor="#E5452A"
          dot
          meta="4 queued"
          title="Word Battle"
          subtitle="Live 1v1 word hunt. Faster pen, faster win."
          onPress={() => router.push('/battle')}
          delay={90}
        />

        <View style={[styles.divider, { backgroundColor: C.divider }]} />

        <ModeItem
          num="03"
          icon="grid"
          badge="LIVE"
          badgeColor="#8E6BFF"
          dot
          meta="127 online"
          title="XOX Online"
          subtitle="Tic-tac-toe with elo, friends, and trash talk."
          onPress={() => router.push('/xox-battle' as any)}
          delay={180}
        />

        <View style={[styles.divider, { backgroundColor: C.divider }]} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

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

  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
  },

  coinCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFD23F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  coinText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  dateLine: {
    paddingHorizontal: 20,
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  greetBlock: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 18,
  },

  greetLine: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },

  greetName: {
    fontSize: 38,
    fontWeight: '900',
    fontStyle: 'italic',
    lineHeight: 44,
  },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 14,
  },

  statCell: {
    flex: 1,
    paddingHorizontal: 6,
  },

  statNum: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },

  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 3,
  },

  statDivider: {
    width: 1,
    marginVertical: 2,
  },

  sectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  sectionAll: {
    fontSize: 12,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    marginHorizontal: 20,
  },

  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
  },

  modeNum: {
    fontSize: 22,
    fontWeight: '900',
    width: 28,
  },

  modeIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeContent: {
    flex: 1,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },

  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fff',
  },

  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.4,
  },

  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },

  modeTitle: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },

  modeSub: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: 2,
  },

  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});