import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HighlightText } from '../components/HighlightText';
import { Theme } from '../constants/theme';
import { useAppTheme } from '../lib/appTheme';
import { useAppState } from '../lib/storage';
import { playTapSound } from '../lib/audio';
import { goBackOrHome } from '../lib/navigation';

export default function Settings() {
  const { C } = useAppTheme();
  const { state, updateSettings } = useAppState();
  const s = state.settings;

  return (
    <View style={styles.bg}>
      <Image source={require('../assets/images/wordrush-arena-background.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: C.divider }]}>
          <Pressable onPress={() => { playTapSound(s.sound).catch(() => {}); goBackOrHome(); }} style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.divider }]}>
            <Ionicons name="chevron-back" size={24} color={C.ink} />
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
              onPress={() => Alert.alert('Privacy & Terms', 'By using WordRush Arena you agree to our privacy policy and terms of service.')}
            />
          </View>

          <Text style={[styles.version, { color: C.muted }]}>Word Search · v 2.2.5</Text>
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SectionHeader({ icon, label }: { icon: keyof typeof Ionicons['glyphMap']; label: string }) {
  const { C } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={C.muted} />
      <HighlightText size="small" color={C.muted} style={styles.sectionTitle}>{label}</HighlightText>
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
  const { C } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { backgroundColor: C.surface, borderColor: C.divider }]}>
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor ?? Theme.primary}22` }]}>
        <Ionicons name={icon} size={18} color={iconColor ?? Theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: C.ink }]}>{label}</Text>
        {sub && <Text style={[styles.rowSub, { color: C.muted }]}>{sub}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const { C, scheme } = useAppTheme();
  const offBg = scheme === 'dark' ? C.divider : '#B8B3AE';
  return (
    <Pressable
      onPress={() => onChange(!on)}
      style={[styles.toggle, { backgroundColor: on ? Theme.primary : offBg }]}
    >
      <View style={[styles.toggleKnob, { left: on ? 21 : 3 }]} />
    </Pressable>
  );
}

function Chev() {
  const { C } = useAppTheme();
  return <Ionicons name="chevron-forward" size={18} color={C.muted} />;
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 160 },

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
    borderWidth: 1,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '800' },
  rowSub: { fontSize: 11, marginTop: 1 },

  toggle: { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  toggleKnob: { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },

  version: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 24,
  },
});

