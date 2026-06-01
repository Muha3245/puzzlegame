// app/profile.tsx

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../constants/theme';
import { useAppTheme } from '../lib/appTheme';
import { ensureUserProfile, getMyProfile, logoutOnline, PublicUser, updatePhotoURL } from '../lib/online';
import { supabase } from '../lib/supabase';
import { useAppState } from '../lib/storage';
import { PlayerAvatar, FRAME_CONFIGS } from '../components/PlayerAvatar';
import { pickAndUploadAvatar } from '../lib/uploadPhoto';

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
  const { C, scheme, toggle } = useAppTheme();
  const { state, updateProfile } = useAppState();
  const [name, setName] = useState(state.profile.name);
  const [onlineProfile, setOnlineProfile] = useState<PublicUser | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authDisplayName, setAuthDisplayName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingOnline, setLoadingOnline] = useState(true);

  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!isLoggedIn) {
      Alert.alert('Sign in required', 'Please sign in to upload a profile picture.');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;
    setUploading(true);
    try {
      const url = await pickAndUploadAvatar(uid);
      if (url) {
        updateProfile({ photoURL: url });
        updatePhotoURL(url).catch(() => {});
      }
    } catch (err: any) {
      const msg: string = err?.message ?? 'Something went wrong.';
      const isBucket = msg.toLowerCase().includes('bucket') || msg.toLowerCase().includes('not found');
      Alert.alert(
        'Upload failed',
        isBucket
          ? 'Storage not set up yet.\n\nIn your Supabase dashboard go to Storage → New bucket → name it "avatars" → set it to Public.'
          : msg
      );
    } finally {
      setUploading(false);
    }
  };

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
    try {
      await logoutOnline();
      // Clear locally-cached identity so the next user/guest doesn't inherit
      // the previous account's avatar or name.
      updateProfile({ photoURL: undefined });
      setOnlineProfile(null);
      setIsLoggedIn(false);
      router.replace('/login');
    } catch (e: any) {
      Alert.alert('Logout failed', e?.message || 'Could not sign out. Please try again.');
    }
  };

  const avatar = safeAvatar(state.profile.avatar);

  return (
    <View style={[styles.bg, { backgroundColor: C.bg }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: C.divider }]}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.divider }]}>
            <Ionicons name="chevron-back" size={22} color={C.ink} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.ink }]}>My Profile</Text>
          <Pressable onPress={toggle} style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.divider }]}>
            <Ionicons name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={C.ink} />
          </Pressable>
          <Pressable onPress={() => router.push('/coins')} style={styles.coinPill}>
            <Ionicons name="logo-bitcoin" size={14} color={Theme.warn} />
            <Text style={styles.coinText}>{state.coins}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── Hero card ── */}
          <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.divider }]}>
            <Pressable onPress={handleUpload} disabled={uploading} style={styles.avatarWrapper}>
              <PlayerAvatar
                photoURL={state.profile.photoURL}
                displayName={onlineProfile?.displayName ?? authDisplayName ?? state.profile.name}
                avatarIcon={avatar}
                frameId={state.profile.frameId}
                size={88}
              />
              <View style={[styles.uploadBadge, { backgroundColor: 'rgba(0,0,0,0.52)', borderColor: C.surface }]}>
                {uploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="camera" size={16} color="#fff" />}
              </View>
            </Pressable>
            <Pressable onPress={handleUpload} disabled={uploading} style={styles.changePhotoBtn}>
              <Ionicons name="cloud-upload-outline" size={14} color={Theme.primary} />
              <Text style={styles.changePhotoText}>
                {uploading ? 'Uploading…' : state.profile.photoURL ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </Pressable>

            <Text style={[styles.heroName, { color: C.ink }]}>
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
                  style={[styles.avatarBtn, { backgroundColor: C.surface, borderColor: C.divider }, selected && styles.avatarBtnSelected]}
                >
                  <Ionicons
                    name={av}
                    size={26}
                    color={selected ? Theme.primary : C.muted}
                  />
                  {selected && <View style={styles.avatarSelectedDot} />}
                </Pressable>
              );
            })}
          </View>

          {/* ── Profile Frame ── */}
          <SectionLabel text="PROFILE FRAME" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.frameRow}
            style={{ marginBottom: 4 }}
          >
            {Object.values(FRAME_CONFIGS).map((frame) => {
              const selected = (state.profile.frameId ?? 'none') === frame.id;
              return (
                <Pressable
                  key={frame.id}
                  onPress={() => updateProfile({ frameId: frame.id })}
                  style={[
                    styles.frameCard,
                    selected
                      ? { borderColor: Theme.primary, backgroundColor: 'rgba(255,122,0,0.08)' }
                      : { borderColor: C.divider, backgroundColor: C.surface },
                  ]}
                >
                  <PlayerAvatar
                    photoURL={state.profile.photoURL}
                    displayName={onlineProfile?.displayName ?? state.profile.name}
                    avatarIcon={avatar}
                    frameId={frame.id}
                    size={44}
                  />
                  <Text style={[styles.frameCardName, { color: selected ? Theme.primary : C.ink }]}>
                    {frame.label}
                  </Text>
                  <Text style={[styles.frameCardSub, { color: frame.id === 'none' ? C.muted : frame.ringColor }]}>
                    {frame.subtitle}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Player name ── */}
          <SectionLabel text="PLAYER NAME" />
          <View style={styles.nameRow}>
            <View style={[styles.nameInputWrap, { backgroundColor: C.surface, borderColor: C.divider }]}>
              <Ionicons name="person-outline" size={18} color={C.muted} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter player name"
                placeholderTextColor={C.muted}
                style={[styles.input, { color: C.ink }]}
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
          <Pressable onPress={() => router.push('/coins')} style={styles.shopBtn}>
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
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  const { C } = useAppTheme();
  return (
    <View style={styles.sectionLabelRow}>
      <View style={[styles.sectionLabelLine, { backgroundColor: C.divider }]} />
      <Text style={[styles.sectionLabel, { color: C.muted }]}>{text}</Text>
      <View style={[styles.sectionLabelLine, { backgroundColor: C.divider }]} />
    </View>
  );
}

function StatCard({ iconName, label, value, accent }: {
  iconName: keyof typeof Ionicons['glyphMap'];
  label: string;
  value: string;
  accent: string;
}) {
  const { C } = useAppTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: `${accent}30` }]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={iconName} size={20} color={accent} />
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: C.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '900' },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,210,63,0.14)', borderWidth: 1, borderColor: 'rgba(255,210,63,0.35)' },
  coinText: { color: Theme.warn, fontSize: 13, fontWeight: '900' },

  content: { padding: 16, paddingBottom: 40 },

  // Hero card
  heroCard: { alignItems: 'center', padding: 28, borderRadius: 28, borderWidth: 1, marginBottom: 16, shadowColor: Theme.primary, shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 4 },
  avatarGlowRing: { width: 108, height: 108, borderRadius: 54, backgroundColor: 'rgba(255,120,0,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarRing: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,120,0,0.15)', borderWidth: 2.5, borderColor: 'rgba(255,150,0,0.5)', alignItems: 'center', justifyContent: 'center' },

  heroName: { fontSize: 28, fontWeight: '900', marginBottom: 6 },
  titleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,120,0,0.18)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.35)', marginBottom: 12 },
  titleBadgeText: { color: Theme.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(76,195,138,0.12)', borderWidth: 1, borderColor: 'rgba(76,195,138,0.3)' },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Theme.success },
  onlineBadgeText: { color: Theme.success, fontSize: 12, fontWeight: '800' },

  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: 'rgba(255,210,63,0.1)', borderWidth: 1, borderColor: 'rgba(255,210,63,0.25)' },
  offlineBadgeText: { color: Theme.warn, fontSize: 12, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 20, borderWidth: 1 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '800', marginTop: 2 },

  // Section label
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 12 },
  sectionLabelLine: { flex: 1, height: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },

  // Avatar grid
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  avatarBtn: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarBtnSelected: { backgroundColor: 'rgba(255,120,0,0.22)', borderColor: Theme.primary, borderWidth: 2 },
  avatarSelectedDot: { position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: 3, backgroundColor: Theme.primary },

  // Name input
  nameRow: { flexDirection: 'row', gap: 10 },
  nameInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  input: { flex: 1, fontWeight: '800', fontSize: 15, paddingVertical: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, borderRadius: 16, alignContent: 'center', justifyContent: 'center', backgroundColor: Theme.primary, shadowColor: Theme.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5 },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  // Actions
  shopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, minHeight: 54, borderRadius: 18, backgroundColor: Theme.primary, shadowColor: Theme.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6 },
  shopText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, minHeight: 50, borderRadius: 18, backgroundColor: 'rgba(247,108,108,0.12)', borderWidth: 1, borderColor: 'rgba(247,108,108,0.3)' },
  logoutText: { color: Theme.danger, fontSize: 15, fontWeight: '900' },

  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, minHeight: 50, borderRadius: 18, backgroundColor: 'rgba(255,120,0,0.14)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.30)' },
  loginBtnText: { color: Theme.primary, fontSize: 15, fontWeight: '900' },

  // Avatar upload
  avatarWrapper: { alignSelf: 'center', width: 122, height: 122, position: 'relative', marginBottom: 6 },
  uploadBadge: { position: 'absolute', bottom: 6, right: 6, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, zIndex: 10 },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,122,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,122,0,0.30)', marginBottom: 10 },
  changePhotoText: { color: Theme.primary, fontSize: 12, fontWeight: '800' },

  // Frame picker
  frameRow: { gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  frameCard: { width: 78, alignItems: 'center', gap: 4, paddingBottom: 10, paddingTop: 4, borderRadius: 16, borderWidth: 1.5 },
  frameCardName: { fontSize: 11, fontWeight: '900', textAlign: 'center' },
  frameCardSub: { fontSize: 9, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
});
