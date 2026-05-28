import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ScreenShell } from '../components/ScreenShell';
import { useAppTheme } from '../lib/appTheme';

function GameCard({ title, subtitle, icon, color, onPress }: any) {
  const { C } = useAppTheme();
  return (
    <AnimatedPressable
      style={[styles.card, { borderColor: color, backgroundColor: C.surface }]}
      onPress={onPress}
    >
      <View style={[styles.icon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={32} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: C.ink }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>{subtitle}</Text>
      </View>
      <View style={[styles.playPill, { backgroundColor: C.ink }]}>
        <Text style={[styles.playText, { color: C.bg }]}>PLAY</Text>
      </View>
    </AnimatedPressable>
  );
}

export default function OfflineGames() {
  const { C } = useAppTheme();
  return (
    <ScreenShell title="Offline Games" subtitle="No internet needed. Play solo, bot or same mobile.">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GameCard
          title="Word Search"
          subtitle="Choose difficulty, solve levels, use hints and collect coins."
          icon="grid"
          color="#4CC38A"
          onPress={() => router.push('/levels')}
        />
        <GameCard
          title="XOX / Tic Tac Toe"
          subtitle="Play vs bot or two players on the same mobile."
          icon="close-circle"
          color="#FF7A00"
          onPress={() => router.push('/xox' as any)}
        />
        <View style={[styles.note, { backgroundColor: C.surface, borderColor: C.divider }]}>
          <Ionicons name="wifi-outline" size={20} color="#4CC38A" />
          <Text style={[styles.noteText, { color: C.muted }]}>
            Online is currently only for Word Search Battle using your existing database.
          </Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 34, gap: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 140,
    borderWidth: 1.5,
    borderRadius: 28,
    padding: 18,
  },
  icon: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900' },
  subtitle: { fontSize: 13, fontWeight: '700', lineHeight: 18, marginTop: 5 },
  playPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  playText: { fontWeight: '900', fontSize: 11 },
  note: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  noteText: { flex: 1, fontWeight: '700', lineHeight: 18 },
});
