import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  ImageBackground,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HighlightText } from '../components/HighlightText';
import { Theme, GlassEffects } from '../constants/theme';
import { MusicTheme, useAppState } from '../lib/storage';
import { setMusicVolume } from '../lib/audio';

const BG_URI =
  'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1200&q=80';

const MUSIC_OPTIONS: { label: string; value: MusicTheme; icon: keyof typeof Ionicons['glyphMap'] }[] = [
  { label: 'Relax',  value: 'relax',  icon: 'musical-notes-outline' },
  { label: 'Candy',  value: 'candy',  icon: 'ice-cream-outline' },
  { label: 'Forest', value: 'forest', icon: 'leaf-outline' },
  { label: 'Puzzle', value: 'puzzle', icon: 'grid-outline' },
];

function VolumeSlider({ volume, onChange }: { volume: number; onChange: (v: number) => void }) {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX } = e.nativeEvent;
        const w = trackWidthRef.current;
        if (w > 0) {
          const v = Math.max(0, Math.min(1, locationX / w));
          onChange(v);
          setMusicVolume(v).catch(() => {});
        }
      },
      onPanResponderMove: (e) => {
        const { locationX } = e.nativeEvent;
        const w = trackWidthRef.current;
        if (w > 0) {
          const v = Math.max(0, Math.min(1, locationX / w));
          onChange(v);
          setMusicVolume(v).catch(() => {});
        }
      },
    }),
  ).current;

  const thumbPos = trackWidth * volume;

  return (
    <View
      style={styles.sliderTrack}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        trackWidthRef.current = w;
        setTrackWidth(w);
      }}
      {...panResponder.panHandlers}
    >
      <View style={[styles.sliderFill, { width: thumbPos }]} />
      <View style={[styles.sliderThumb, { left: Math.max(0, thumbPos - 10) }]} />
    </View>
  );
}

export default function Settings() {
  const { state, updateSettings } = useAppState();
  const s = state.settings;
  const volume = s.musicVolume ?? 0.5;

  const handleVolumeChange = (v: number) => {
    updateSettings({ musicVolume: v });
  };

  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
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
          {/* Audio Settings */}
          <HighlightText size="small" color={Theme.textDim} style={styles.sectionTitle}>
            AUDIO SETTINGS
          </HighlightText>

          <View style={{ gap: 6 }}>
            <Row
              label="Sound Effects"
              sub="Tap and word-found chimes"
              right={<Toggle on={s.sound} onChange={(v) => updateSettings({ sound: v })} />}
            />
            <Row
              label="Background Music"
              sub="Music across full app"
              right={<Toggle on={s.music} onChange={(v) => updateSettings({ music: v })} />}
            />
            <Row
              label="Haptics"
              sub="Vibrate on word found"
              right={<Toggle on={s.haptics} onChange={(v) => updateSettings({ haptics: v })} />}
            />
          </View>

          {/* Volume slider */}
          <HighlightText size="small" color={Theme.textDim} style={styles.sectionTitle}>
            MUSIC VOLUME
          </HighlightText>

          <View style={styles.volumeCard}>
            <View style={styles.volumeRow}>
              <Ionicons name="volume-low-outline" size={18} color={Theme.textDim} />
              <VolumeSlider volume={volume} onChange={handleVolumeChange} />
              <Ionicons name="volume-high-outline" size={18} color={Theme.textDim} />
            </View>
            <Text style={styles.volumePct}>{Math.round(volume * 100)}%</Text>
          </View>

          {/* Music Theme Selection */}
          <HighlightText size="small" color={Theme.textDim} style={styles.sectionTitle}>
            BACKGROUND MUSIC THEME
          </HighlightText>

          <View style={styles.musicGrid}>
            {MUSIC_OPTIONS.map((item) => {
              const active = s.musicTheme === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => updateSettings({ musicTheme: item.value })}
                  style={[styles.musicCard, active && styles.musicCardActive]}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={active ? Theme.primary : Theme.textDim}
                    style={{ marginBottom: 4 }}
                  />
                  <HighlightText
                    size="small"
                    color={active ? '#fff' : Theme.textDim}
                    style={styles.musicLabel}
                  >
                    {item.label}
                  </HighlightText>
                </Pressable>
              );
            })}
          </View>

          {/* Notifications */}
          <HighlightText size="small" color={Theme.textDim} style={styles.sectionTitle}>
            NOTIFICATIONS
          </HighlightText>

          <Row
            label="Daily Reminder"
            sub="9:00 AM each morning"
            right={<Toggle on={s.notify} onChange={(v) => updateSettings({ notify: v })} />}
          />

          {/* App Information */}
          <HighlightText size="small" color={Theme.textDim} style={styles.sectionTitle}>
            APP INFORMATION
          </HighlightText>

          <View style={{ gap: 6 }}>
            <Row
              label="How to Play"
              sub="Quick walkthrough & tips"
              right={<Chev />}
              onPress={() => router.push('/help')}
            />
            <Row
              label="Language"
              sub="English"
              right={<Chev />}
              onPress={() => Alert.alert('Language', 'Only English is supported at the moment.')}
            />
            <Row
              label="Restore Purchases"
              right={<Chev />}
              onPress={() => Alert.alert('Restore Purchases', 'No purchases found on this account.')}
            />
            <Row
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

function Row({
  label,
  sub,
  right,
  onPress,
}: {
  label: string;
  sub?: string;
  right: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: Theme.primary }} />
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
  sectionTitle: { letterSpacing: 1.2, marginTop: 16, marginBottom: 6 },

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

  volumeCard: {
    borderRadius: 14,
    padding: 14,
    ...GlassEffects.light,
    gap: 8,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.primary,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    top: -7,
    shadowColor: Theme.primary,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  volumePct: {
    textAlign: 'center',
    color: Theme.textDim,
    fontWeight: '800',
    fontSize: 12,
  },

  musicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  musicCard: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    ...GlassEffects.light,
  },
  musicCardActive: {
    backgroundColor: 'rgba(255,120,0,0.20)',
    borderColor: Theme.primary,
    borderWidth: 1.5,
  },
  musicLabel: { marginBottom: 0 },

  version: {
    textAlign: 'center',
    color: Theme.textMute,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 18,
  },
});
