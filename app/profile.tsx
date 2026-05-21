// app/profile.tsx
// Player profile — rich glass layout matching the dark navy aesthetic.

import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';
import { ensureUserProfile, getMyProfile, logoutOnline, PublicUser } from '../lib/online';
import { supabase } from '../lib/supabase';
import { useAppState } from '../lib/storage';

const BG_URI =
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=90';

const AVATARS = ['🧘', '🧠', '🌿', '⭐', '🐼', '🦊', '🐯', '🎮', '🦁', '🐉', '🚀', '💎'];
const COIN_ADDS = [50, 100, 250, 500];

export default function Profile() {
  const { state, updateProfile, addCoins } = useAppState();
  const [name, setName] = useState(state.profile.name);
  const [onlineProfile, setOnlineProfile] = useState<PublicUser | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authDisplayName, setAuthDisplayName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingOnline, setLoadingOnline] = useState(true);

  // Header avatar pulse animation
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Load profile from DB given a confirmed auth user
  const loadProfileForUser = async (authUser: any) => {
    try {
      const metaName: string =
        authUser.user_metadata?.display_name ||
        authUser.email?.split('@')[0] ||
        'Player';

      setIsLoggedIn(true);
      setAuthEmail(authUser.email ?? null);
      setAuthDisplayName(metaName);

      // Try to fetch the DB row
      let profile = await getMyProfile();

      // Auto-create if row doesn't exist yet
      if (!profile) {
        console.log('[Profile] no DB row, creating...');
        await ensureUserProfile(authUser.id, authUser.email, metaName);
        profile = await getMyProfile();
      }

      if (profile) {
        setOnlineProfile(profile);
        if (profile.displayName) {
          setName(profile.displayName);
          updateProfile({ name: profile.displayName });
        }
      }
    } catch (err: any) {
      console.warn('[Profile loadProfileForUser]', err?.message);
    } finally {
      setLoadingOnline(false);
    }
  };

  useEffect(() => {
    // On mobile, onAuthStateChange fires reliably once AsyncStorage restores the session.
    // We ALSO do an immediate getSession() check so the page isn't blank while waiting.
    let settled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (settled) return;          // onAuthStateChange already handled it
      if (session?.user) {
        loadProfileForUser(session.user);
      } else {
        setIsLoggedIn(false);
        setLoadingOnline(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        settled = true;
        if (session?.user) {
          await loadProfileForUser(session.user);
        } else {
          setIsLoggedIn(false);
          setOnlineProfile(null);
          setAuthEmail(null);
          setAuthDisplayName(null);
          setLoadingOnline(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const completedLevels = useMemo(
    () => Object.keys(state.progress).filter((key) => state.progress[key] > 0).length,
    [state.progress]
  );

  const saveName = () => {
    const safeName = name.trim() || 'Player';
    updateProfile({ name: safeName });
    setName(safeName);
  };

  const handleLogout = async () => {
    try {
      await logoutOnline();
      router.replace('/login');
    } catch {
      // ignore
    }
  };

  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      {/* Accent orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="light-content" />

        {/* ── Header bar ── */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Pressable onPress={() => router.push('/shop' as any)} style={styles.coinPill}>
            <Text style={styles.coinText}>🪙 {state.coins}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Avatar hero card ── */}
          <View style={styles.heroCard}>
            {/* Glow ring behind avatar */}
            <View style={styles.avatarGlowRing}>
              <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulse }] }]}>
                <Text style={styles.avatarEmoji}>{state.profile.avatar}</Text>
              </Animated.View>
            </View>

            <Text style={styles.heroName}>
              {onlineProfile?.displayName ?? authDisplayName ?? state.profile.name}
            </Text>
            <View style={styles.titleBadge}>
              <Text style={styles.titleBadgeText}>{state.profile.levelTitle}</Text>
            </View>

            {/* Online account badge */}
            {loadingOnline ? (
              <ActivityIndicator size="small" color={Theme.primary} style={{ marginTop: 10 }} />
            ) : isLoggedIn ? (
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineBadgeText}>
                  Online · {onlineProfile?.displayName ?? authDisplayName ?? authEmail ?? 'Player'}
                </Text>
              </View>
            ) : (
              <View style={styles.offlineBadge}>
                <Text style={styles.offlineBadgeText}>⚠️ Not signed in</Text>
              </View>
            )}
          </View>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            <StatCard
              icon="🪙"
              label="Coins"
              value={state.coins.toLocaleString()}
              accent="#FFD23F"
            />
            <StatCard
              icon="✅"
              label="Levels"
              value={completedLevels.toString()}
              accent={Theme.success}
            />
            {onlineProfile && (
              <StatCard
                icon="🏆"
                label="Score"
                value={(onlineProfile.totalScore ?? 0).toLocaleString()}
                accent={Theme.primary}
              />
            )}
          </View>

          {/* ── Change avatar ── */}
          <SectionLabel text="CHOOSE AVATAR" />
          <View style={styles.avatarGrid}>
            {AVATARS.map((av) => {
              const selected = state.profile.avatar === av;
              return (
                <Pressable
                  key={av}
                  onPress={() => updateProfile({ avatar: av })}
                  style={[styles.avatarBtn, selected && styles.avatarBtnSelected]}
                >
                  <Text style={styles.avatarBtnText}>{av}</Text>
                  {selected && <View style={styles.avatarSelectedDot} />}
                </Pressable>
              );
            })}
          </View>

          {/* ── Player name ── */}
          <SectionLabel text="PLAYER NAME" />
          <View style={styles.nameRow}>
            <View style={styles.nameInputWrap}>
              <Text style={styles.inputIcon}>🎮</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter player name"
                placeholderTextColor="rgba(164,176,216,0.4)"
                style={styles.input}
                onSubmitEditing={saveName}
                returnKeyType="done"
              />
            </View>
            <Pressable onPress={saveName} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>

          {/* ── Add test coins ── */}
          <SectionLabel text="ADD TEST COINS" />
          <View style={styles.coinGrid}>
            {COIN_ADDS.map((amount) => (
              <Pressable key={amount} onPress={() => addCoins(amount)} style={styles.addCoinBtn}>
                <Text style={styles.addCoinAmount}>+{amount}</Text>
                <Text style={styles.addCoinLabel}>coins</Text>
              </Pressable>
            ))}
          </View>

          {/* ── Action buttons ── */}
          <Pressable onPress={() => router.push('/shop' as any)} style={styles.shopBtn}>
            <Text style={styles.shopIcon}>🛒</Text>
            <Text style={styles.shopText}>Open Coin Shop</Text>
          </Pressable>

          {onlineProfile ? (
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/login' as any)} style={styles.loginBtn}>
              <Text style={styles.loginBtnText}>🔑 Sign In / Register</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionLabelLine} />
      <Text style={styles.sectionLabel}>{text}</Text>
      <View style={styles.sectionLabelLine} />
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: `${accent}30` }]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${accent}18` }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#050c20' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 8, 32, 0.75)',
  },
  orb1: {
    position: 'absolute', top: -60, left: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(91,155,255,0.12)',
  },
  orb2: {
    position: 'absolute', bottom: 80, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(76,195,138,0.1)',
  },

  safe: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  backText: { color: '#fff', fontSize: 32, fontWeight: '700', lineHeight: 34 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 22, fontWeight: '900' },
  coinPill: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: 'rgba(255,210,63,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,210,63,0.35)',
  },
  coinText: { color: '#FFD23F', fontSize: 13, fontWeight: '900' },

  content: { padding: 16, paddingBottom: 40 },

  // ── Hero card ──
  heroCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 16,
    shadowColor: '#5B9BFF',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
  },
  avatarGlowRing: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: 'rgba(91,155,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#5B9BFF',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 0,
  },
  avatarRing: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: 'rgba(91,155,255,0.15)',
    borderWidth: 2.5,
    borderColor: 'rgba(91,155,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 50 },

  heroName: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 6 },
  titleBadge: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(91,155,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(91,155,255,0.35)',
    marginBottom: 12,
  },
  titleBadgeText: { color: Theme.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(76,195,138,0.12)',
    borderWidth: 1, borderColor: 'rgba(76,195,138,0.3)',
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Theme.success },
  onlineBadgeText: { color: Theme.success, fontSize: 12, fontWeight: '800' },

  offlineBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
    backgroundColor: 'rgba(255,210,63,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,210,63,0.25)',
  },
  offlineBadgeText: { color: Theme.warn, fontSize: 12, fontWeight: '700' },
  // ── Stats ──
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, alignItems: 'center', padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { color: Theme.textDim, fontSize: 11, fontWeight: '800', marginTop: 2 },

  // ── Section label ──
  sectionLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, marginBottom: 12,
  },
  sectionLabelLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  sectionLabel: {
    color: Theme.textDim, fontSize: 11, fontWeight: '900',
    letterSpacing: 1.4, textTransform: 'uppercase',
  },

  // ── Avatar grid ──
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  avatarBtn: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarBtnSelected: {
    backgroundColor: 'rgba(91,155,255,0.22)',
    borderColor: Theme.primary,
    borderWidth: 2,
  },
  avatarBtnText: { fontSize: 28 },
  avatarSelectedDot: {
    position: 'absolute', bottom: 5,
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: Theme.primary,
  },

  // ── Name input ──
  nameRow: { flexDirection: 'row', gap: 10 },
  nameInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: 50, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  inputIcon: { fontSize: 16 },
  input: {
    flex: 1, color: '#fff', fontWeight: '800', fontSize: 15,
    paddingVertical: 12,
  },
  saveBtn: {
    paddingHorizontal: 20, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.primary,
    shadowColor: Theme.primary,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  // ── Coin grid ──
  coinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  addCoinBtn: {
    width: '47%', paddingVertical: 18,
    borderRadius: 18, alignItems: 'center',
    backgroundColor: 'rgba(255,210,63,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,210,63,0.25)',
  },
  addCoinAmount: { color: '#FFD23F', fontSize: 22, fontWeight: '900' },
  addCoinLabel: { color: Theme.textDim, fontSize: 11, fontWeight: '800', marginTop: 2 },

  // ── Action buttons ──
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 20, minHeight: 54,
    borderRadius: 18, backgroundColor: Theme.success,
    shadowColor: Theme.success,
    shadowOpacity: 0.45, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14,
    elevation: 6,
  },
  shopIcon: { fontSize: 20 },
  shopText: { color: '#072113', fontSize: 16, fontWeight: '900' },

  logoutBtn: {
    marginTop: 12, minHeight: 50,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(247,108,108,0.12)',
    borderWidth: 1, borderColor: 'rgba(247,108,108,0.3)',
  },
  logoutText: { color: Theme.danger, fontSize: 15, fontWeight: '900' },

  loginBtn: {
    marginTop: 12, minHeight: 50,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(91,155,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(91,155,255,0.3)',
  },
  loginBtnText: { color: Theme.primary, fontSize: 15, fontWeight: '900' },
});
