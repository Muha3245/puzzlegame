// app/settings.tsx
// Settings modal — toggles + entry rows.

import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Sheet } from '../components/Sheet';
import { Theme } from '../constants/theme';
import { useAppState } from '../lib/storage';

export default function Settings() {
  const { state, updateSettings } = useAppState();
  const s = state.settings;
  const close = () => router.back();

  return (
    <Sheet visible title="Settings" onClose={close}>
      <View style={{ gap: 6 }}>
        <Row label="Sound Effects"     sub="Tap and word-found chimes" right={<Toggle on={s.sound}   onChange={(v) => updateSettings({ sound: v })} />} />
        <Row label="Background Music"  sub="Calm ambient loop"         right={<Toggle on={s.music}   onChange={(v) => updateSettings({ music: v })} />} />
        <Row label="Haptics"           sub="Vibrate on word found"     right={<Toggle on={s.haptics} onChange={(v) => updateSettings({ haptics: v })} />} />
        <Row label="Daily Reminder"    sub="9:00 AM each morning"      right={<Toggle on={s.notify}  onChange={(v) => updateSettings({ notify: v })} />} />
      </View>

      <Text style={styles.section}>APP</Text>
      <View style={{ gap: 6 }}>
        <Row label="How to Play"        sub="Quick walkthrough & tips" right={<Chev/>} onPress={() => router.push('/help')} />
        <Row label="Language"           sub="English"                  right={<Chev/>} />
        <Row label="Restore Purchases"                                  right={<Chev/>} />
        <Row label="Privacy & Terms"                                    right={<Chev/>} />
      </View>

      <Text style={styles.version}>Word Search · v 2.2.5</Text>
    </Sheet>
  );
}

function Row({ label, sub, right, onPress }: { label: string; sub?: string; right: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: Theme.primary }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>{label}</Text>
        {sub && <Text style={{ fontSize: 11, color: Theme.textDim, marginTop: 1 }}>{sub}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!on)} style={[styles.toggle, { backgroundColor: on ? Theme.success : 'rgba(255,255,255,0.1)' }]}>
      <View style={[styles.toggleKnob, { left: on ? 21 : 3 }]} />
    </Pressable>
  );
}

function Chev() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16">
      <Path d="M6 3 L 11 8 L 6 13" stroke={Theme.textMute} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(91,155,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  toggle: { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  toggleKnob: {
    position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff',
  },
  section: { color: Theme.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 16, marginBottom: 6 },
  version: { textAlign: 'center', color: Theme.textMute, fontSize: 11, fontWeight: '700', marginTop: 18 },
});
