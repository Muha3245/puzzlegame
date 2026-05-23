import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ScreenShell } from '../components/ScreenShell';
import { useAppState } from '../lib/storage';

function QuickAction({ icon, label, subtitle, onPress }: any) {
  return (
    <AnimatedPressable style={styles.quickItem} onPress={onPress}>
      <View style={styles.quickIconWrap}>
        <Ionicons name={icon} size={21} color="#fff" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.quickLabel}>{label}</Text>
        <Text style={styles.quickSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.45)" />
    </AnimatedPressable>
  );
}

function ModeCard({
  title,
  subtitle,
  icon,
  color,
  lightColor,
  badge,
  onPress,
  delay = 0,
}: any) {
  const y = useRef(new Animated.Value(24)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: 1,
        duration: 430,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(y, {
        toValue: 0,
        friction: 7,
        tension: 55,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: y }] }}>
      <AnimatedPressable
        style={[
          styles.modeCard,
          {
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
        onPress={onPress}
      >
        <View style={styles.modeCircleTop} />
        <View style={styles.modeCircleBottom} />

        <View style={styles.modeLeft}>
          <View style={[styles.modeIconBox, { backgroundColor: lightColor }]}>
            <Ionicons name={icon} size={34} color="#fff" />
          </View>

          <View style={styles.modeTextArea}>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>{badge}</Text>
            </View>

            <Text style={styles.modeTitle}>{title}</Text>
            <Text style={styles.modeSubtitle}>{subtitle}</Text>

            <View style={styles.startRow}>
              <Text style={styles.startText}>Start playing</Text>
              <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function Home() {
  const { state } = useAppState();

  return (
    <ScreenShell
      title="Puzzle Arena"
      subtitle="Offline fun and live Word Search battles"
      showBack={false}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topPanel}>
          <View style={styles.profileRow}>
            <View style={styles.profileLeft}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={23} color="#fff" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.hello} numberOfLines={1}>
                  Hi, {state.profile.name}
                </Text>
                <Text style={styles.meta}>Ready for your next puzzle?</Text>
              </View>
            </View>

            <AnimatedPressable style={styles.coinPill} onPress={() => router.push('/coins')}>
              <View style={styles.coinIcon}>
                <Ionicons name="logo-bitcoin" size={15} color="#2A1B00" />
              </View>
              <Text style={styles.coinText}>{state.coins}</Text>
            </AnimatedPressable>
          </View>

          <View style={styles.quickPanel}>
            <View style={styles.quickHeader}>
              <Text style={styles.quickTitle}>Quick Access</Text>
              <Text style={styles.quickHint}>Manage your game faster</Text>
            </View>

            <View style={styles.quickGrid}>
              <QuickAction
                icon="person"
                label="Profile"
                subtitle="Player info"
                onPress={() => router.push('/profile')}
              />

              <QuickAction
                icon="settings"
                label="Settings"
                subtitle="Game setup"
                onPress={() => router.push('/settings')}
              />

              <QuickAction
                icon="trophy"
                label="Ranks"
                subtitle="Leaderboard"
                onPress={() => router.push('/leaderboard')}
              />
            </View>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color="#FFD23F" />
            <Text style={styles.heroBadgeText}>Brain Challenge</Text>
          </View>

          <Text style={styles.heroTitle}>Play smarter. Compete faster.</Text>
          <Text style={styles.heroSubtitle}>
            Choose offline games for practice or enter online battle mode for real-time word
            search challenges.
          </Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Choose Game Mode</Text>
          <Text style={styles.sectionSubtitle}>Select how you want to play today</Text>
        </View>

        <ModeCard
          title="Offline Games"
          subtitle="Play Word Search, XOX, bot mode and same-phone multiplayer without internet."
          icon="game-controller"
          badge="Practice Mode"
          color="#2FBF7A"
          lightColor="rgba(255,255,255,0.18)"
          onPress={() => router.push('/offline' as any)}
        />

        <ModeCard
          title="Online Battle"
          subtitle="Join live rooms and challenge another player in real-time Word Search battles."
          icon="flash"
          badge="Live Match"
          color="#FF7A1A"
          lightColor="rgba(255,255,255,0.18)"
          onPress={() => router.push('/battle')}
          delay={90}
        />

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="bulb" size={21} color="#FFD23F" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Pro Tip</Text>
            <Text style={styles.infoText}>
              Play battles to improve your ranking, collect more coins and become a better puzzle
              solver.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingBottom: 34,
    gap: 16,
  },

  topPanel: {
    gap: 14,
  },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  profileLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },

  hello: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '900',
  },

  meta: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },

  coinIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD23F',
  },

  coinText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },

  quickPanel: {
    padding: 15,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  quickHeader: {
    marginBottom: 12,
  },

  quickTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },

  quickHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  quickGrid: {
    gap: 10,
  },

  quickItem: {
    minHeight: 64,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
  },

  quickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  quickLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },

  quickSubtitle: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 190,
    borderRadius: 32,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  heroGlowOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 999,
    right: -60,
    top: -60,
    backgroundColor: 'rgba(47,191,122,0.32)',
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 145,
    height: 145,
    borderRadius: 999,
    left: -55,
    bottom: -60,
    backgroundColor: 'rgba(255,122,26,0.25)',
  },

  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,210,63,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.18)',
  },

  heroBadgeText: {
    color: '#FFD23F',
    fontSize: 12,
    fontWeight: '900',
  },

  heroTitle: {
    color: '#fff',
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 35,
    marginTop: 14,
    maxWidth: '92%',
  },

  heroSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
    maxWidth: '95%',
  },

  sectionHead: {
    marginTop: 2,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },

  modeCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 172,
    borderRadius: 34,
    padding: 20,
    justifyContent: 'center',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  modeCircleTop: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 999,
    top: -45,
    right: -35,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },

  modeCircleBottom: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 999,
    bottom: -35,
    right: 45,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  modeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  modeIconBox: {
    width: 72,
    height: 72,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  modeTextArea: {
    flex: 1,
  },

  modeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.17)',
    marginBottom: 8,
  },

  modeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },

  modeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },

  modeSubtitle: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },

  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 13,
  },

  startText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },

  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 15,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },

  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,210,63,0.12)',
  },

  infoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },

  infoText: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 3,
  },
});