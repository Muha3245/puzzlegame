// app/profile.tsx

import { Ionicons } from '@expo/vector-icons';
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
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { Theme } from '../constants/theme';
import { ensureUserProfile, getMyProfile, logoutOnline, PublicUser } from '../lib/online';
import { supabase } from '../lib/supabase';
import { useAppState } from '../lib/storage';

const BG_URI =
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80';

type AvatarId =
  | 'game-controller' | 'person' | 'star' | 'rocket' | 'flame'
  | 'shield' | 'trophy' | 'flash' | 'skull-outline' | 'planet'
  | 'diamond' | 'infinite';

const AVATARS: AvatarId[] = [
  'game-controller', 'person', 'star', 'rocket', 'flame',
  'shield', 'trophy', 'flash', 'skull-outline', 'planet',
  'diamond', 'infinite',
];


function safeAvatar(stored: string): AvatarId {
  return (AVATARS as string[]).includes(stored)
    ? (stored as AvatarId)
    : 'game-controller';
}

export default function Profile() {
  const { state, updateProfile } = useAppState();
  const [name, setName] = useState(state.profile.name);
  const [onlineProfile, setOnlineProfile] = useState<PublicUser | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authDisplayName, setAuthDisplayName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingOnline, setLoadingOnline] = useState(true);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.07, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadProfileForUser = async (authUser: any) => {
    try {
      const metaName: string =
        authUser.user_metadata?.display_name ||
        authUser.email?.split('@')[0] ||
        'Player';
      setIsLoggedIn(true);
      setAuthEmail(authUser.email ?? null);
      setAuthDisplayName(metaName);
      let profile = await getMyProfile();
      if (!profile) {
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
      console.warn('[Profile]', err?.message);
    } finally {
      setLoadingOnline(false);
    }
  };

  useEffect(() => {
    let settled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (settled) return;
      if (session?.user) loadProfileForUser(session.user);
      else { setIsLoggedIn(false); setLoadingOnline(false); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      settled = true;
      if (session?.user) await loadProfileForUser(session.user);
      else {
        setIsLoggedIn(false); setOnlineProfile(null);
        setAuthEmail(null); setAuthDisplayName(null); setLoadingOnline(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const completedLevels = useMemo(
    () => Object.keys(state.progress).filter((k) => state.progress[k] > 0).length,
    [state.progress]
  );

  const saveName = () => {
    const safe = name.trim() || 'Player';
    updateProfile({ name: safe });
    setName(safe);
  };

  const handleLogout = async () => {
    try { await logoutOnline(); router.replace('/login'); } catch {}
  };

  const avatar = safeAvatar(state.profile.avatar);

  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="light-content" />

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Pressable onPress={() => router.push('/shop' as any)} style={styles.coinPill}>
            <Ionicons name="logo-bitcoin" size={14} color={Theme.warn} />
            <Text style={styles.coinText}>{state.coins}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── Hero card ── */}
          <View style={styles.heroCard}>
            <View style={styles.avatarGlowRing}>
              <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulse }] }]}>
                <Ionicons name={avatar} size={48} color={Theme.primary} />
              </Animated.View>
            </View>

            <Text style={styles.heroName}>
              {onlineProfile?.displayName ?? authDisplayName ?? state.profile.name}
            </Text>
            <View style={styles.titleBadge}>
              <Ionicons name="ribbon" size={12} color={Theme.primary} />
              <Text style={styles.titleBadgeText}>{state.profile.levelTitle}</Text>
            </View>

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
                <Ionicons name="warning-outline" size={13} color={Theme.warn} />
                <Text style={styles.offlineBadgeText}>Not signed in</Text>
              </View>
            )}
          </View>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            <StatCard iconName="logo-bitcoin" label="Coins" value={state.coins.toLocaleString()} accent={Theme.warn} />
            <StatCard iconName="checkmark-circle" label="Levels" value={completedLevels.toString()} accent={Theme.success} />
            {onlineProfile && (
              <StatCard iconName="trophy" label="Score" value={(onlineProfile.totalScore ?? 0).toLocaleString()} accent={Theme.primary} />
            )}
          </View>

          {/* ── Choose avatar ── */}
          <SectionLabel text="CHOOSE AVATAR" />
          <View style={styles.avatarGrid}>
            {AVATARS.map((av) => {
              const selected = avatar === av;
              return (
                <Pressable
                  key={av}
                  onPress={() => updateProfile({ avatar: av })}
                  style={[styles.avatarBtn, selected && styles.avatarBtnSelected]}
                >
                  <Ionicons
                    name={av}
                    size={26}
                    color={selected ? Theme.primary : Theme.textDim}
                  />
                  {selected && <View style={styles.avatarSelectedDot} />}
                </Pressable>
              );
            })}
          </View>

          {/* ── Player name ── */}
          <SectionLabel text="PLAYER NAME" />
          <View style={styles.nameRow}>
            <View style={styles.nameInputWrap}>
              <Ionicons name="person-outline" size={18} color={Theme.textDim} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter player name"
                placeholderTextColor="rgba(200,168,122,0.4)"
                style={styles.input}
                onSubmitEditing={saveName}
                returnKeyType="done"
              />
            </View>
            <Pressable onPress={saveName} style={styles.saveBtn}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>

          {/* ── Actions ── */}
          <Pressable onPress={() => router.push('/shop' as any)} style={styles.shopBtn}>
            <Ionicons name="storefront" size={20} color="#fff" />
            <Text style={styles.shopText}>Open Coin Shop</Text>
          </Pressable>

          {isLoggedIn ? (
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={18} color={Theme.danger} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/login' as any)} style={styles.loginBtn}>
              <Ionicons name="key-outline" size={18} color={Theme.primary} />
              <Text style={styles.loginBtnText}>Sign In / Register</Text>
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

function StatCard({ iconName, label, value, accent }: {
  iconName: keyof typeof Ionicons['glyphMap'];
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: `${accent}30` }]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={iconName} size={20} color={accent} />
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0D0500' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,5,0,0.82)' },
  orb1: { position: 'absolute', top: -60, left: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,100,0,0.14)' },
  orb2: { position: 'absolute', bottom: 80, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,60,0,0.09)' },
  orb3: { position: 'absolute', top: '50%', left: '20%', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,180,0,0.06)' },
  safe: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,120,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.25)' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 22, fontWeight: '900' },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,210,63,0.14)', borderWidth: 1, borderColor: 'rgba(255,210,63,0.35)' },
  coinText: { color: Theme.warn, fontSize: 13, fontWeight: '900' },

  content: { padding: 16, paddingBottom: 40 },

  // Hero card
  heroCard: { alignItems: 'center', padding: 28, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.22)', marginBottom: 16, shadowColor: Theme.primary, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 8 },
  avatarGlowRing: { width: 108, height: 108, borderRadius: 54, backgroundColor: 'rgba(255,120,0,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: Theme.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20 },
  avatarRing: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,120,0,0.15)', borderWidth: 2.5, borderColor: 'rgba(255,150,0,0.5)', alignItems: 'center', justifyContent: 'center' },

  heroName: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 6 },
  titleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,120,0,0.18)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.35)', marginBottom: 12 },
  titleBadgeText: { color: Theme.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(76,195,138,0.12)', borderWidth: 1, borderColor: 'rgba(76,195,138,0.3)' },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Theme.success },
  onlineBadgeText: { color: Theme.success, fontSize: 12, fontWeight: '800' },

  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: 'rgba(255,210,63,0.1)', borderWidth: 1, borderColor: 'rgba(255,210,63,0.25)' },
  offlineBadgeText: { color: Theme.warn, fontSize: 12, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { color: Theme.textDim, fontSize: 11, fontWeight: '800', marginTop: 2 },

  // Section label
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 12 },
  sectionLabelLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,150,0,0.15)' },
  sectionLabel: { color: Theme.textDim, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },

  // Avatar grid
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  avatarBtn: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.16)' },
  avatarBtnSelected: { backgroundColor: 'rgba(255,120,0,0.22)', borderColor: Theme.primary, borderWidth: 2 },
  avatarSelectedDot: { position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: 3, backgroundColor: Theme.primary },

  // Name input
  nameRow: { flexDirection: 'row', gap: 10 },
  nameInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.20)' },
  input: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 15, paddingVertical: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, borderRadius: 16, alignContent: 'center', justifyContent: 'center', backgroundColor: Theme.primary, shadowColor: Theme.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5 },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  // Actions
  shopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, minHeight: 54, borderRadius: 18, backgroundColor: Theme.primary, shadowColor: Theme.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6 },
  shopText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, minHeight: 50, borderRadius: 18, backgroundColor: 'rgba(247,108,108,0.12)', borderWidth: 1, borderColor: 'rgba(247,108,108,0.3)' },
  logoutText: { color: Theme.danger, fontSize: 15, fontWeight: '900' },

  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, minHeight: 50, borderRadius: 18, backgroundColor: 'rgba(255,120,0,0.14)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.30)' },
  loginBtnText: { color: Theme.primary, fontSize: 15, fontWeight: '900' },
});
