import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HighlightText } from '../components/HighlightText';
import { Theme, GlassEffects } from '../constants/theme';
import { useAppState } from '../lib/storage';

const BG_URI =
  'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1200&q=80';

export default function Settings() {
  const { state, updateSettings } = useAppState();
  const s = state.settings;

  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <HighlightText size="large">Settings</HighlightText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader icon="volume-high-outline" label="AUDIO" />

          <View style={{ gap: 6 }}>
            <Row
              icon="musical-note-outline"
              iconColor={Theme.primary}
              label="Sound Effects"
              sub="Tap, win, lose and battle chimes"
              right={<Toggle on={s.sound} onChange={(v) => updateSettings({ sound: v })} />}
            />
            <Row
              icon="phone-portrait-outline"
              iconColor={Theme.success}
              label="Haptics"
              sub="Vibrate on word found"
              right={<Toggle on={s.haptics} onChange={(v) => updateSettings({ haptics: v })} />}
            />
          </View>

          <SectionHeader icon="notifications-outline" label="NOTIFICATIONS" />

          <Row
            icon="alarm-outline"
            iconColor={Theme.warn}
            label="Daily Reminder"
            sub="9:00 AM each morning"
            right={<Toggle on={s.notify} onChange={(v) => updateSettings({ notify: v })} />}
          />

          <SectionHeader icon="information-circle-outline" label="APP INFORMATION" />

          <View style={{ gap: 6 }}>
            <Row
              icon="help-circle-outline"
              iconColor={Theme.primary}
              label="How to Play"
              sub="Quick walkthrough & tips"
              right={<Chev />}
              onPress={() => router.push('/help')}
            />
            <Row
              icon="language-outline"
              iconColor={Theme.textDim}
              label="Language"
              sub="English"
              right={<Chev />}
              onPress={() => Alert.alert('Language', 'Only English is supported at the moment.')}
            />
            <Row
              icon="refresh-circle-outline"
              iconColor={Theme.success}
              label="Restore Purchases"
              right={<Chev />}
              onPress={() => Alert.alert('Restore Purchases', 'No purchases found on this account.')}
            />
            <Row
              icon="shield-checkmark-outline"
              iconColor="#5B9BFF"
              label="Privacy & Terms"
              right={<Chev />}
              onPress={() => Alert.alert('Privacy & Terms', 'By using WordPuzzle you agree to our privacy policy and terms of service.')}
            />
          </View>

          <Text style={styles.version}>Word Search · v 2.2.5</Text>
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function SectionHeader({ icon, label }: { icon: keyof typeof Ionicons['glyphMap']; label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={Theme.textDim} />
      <HighlightText size="small" color={Theme.textDim} style={styles.sectionTitle}>{label}</HighlightText>
    </View>
  );
}

function Row({
  icon,
  iconColor,
  label,
  sub,
  right,
  onPress,
}: {
  icon: keyof typeof Ionicons['glyphMap'];
  iconColor?: string;
  label: string;
  sub?: string;
  right: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor ?? Theme.primary}22` }]}>
        <Ionicons name={icon} size={18} color={iconColor ?? Theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!on)}
      style={[styles.toggle, { backgroundColor: on ? Theme.primary : 'rgba(255,255,255,0.1)' }]}
    >
      <View style={[styles.toggleKnob, { left: on ? 21 : 3 }]} />
    </Pressable>
  );
}

function Chev() {
  return <Ionicons name="chevron-forward" size={18} color={Theme.textMute} />;
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0D0500' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,5,0,0.84)' },
  orb1: { position: 'absolute', top: -50, left: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,100,0,0.13)' },
  orb2: { position: 'absolute', bottom: 60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,60,0,0.09)' },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,120,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: 16, paddingVertical: 8 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: { letterSpacing: 1.2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    ...GlassEffects.light,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,120,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  rowSub: { fontSize: 11, color: Theme.textDim, marginTop: 1 },

  toggle: { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  toggleKnob: { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },

  version: {
    textAlign: 'center',
    color: Theme.textMute,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 24,
  },
});
