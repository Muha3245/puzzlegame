import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ScreenShell } from '../components/ScreenShell';

function GameMark({ mark, icon, color }: { mark: string; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={[styles.markShell, { borderColor: color }]}>
      <View style={[styles.markGlow, { backgroundColor: color }]} />
      <Text style={styles.markText}>{mark}</Text>
      <View style={[styles.markIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
    </View>
  );
}

function GameCard({ title, subtitle, icon, color, mark, onPress }: any) {
  return (
    <AnimatedPressable
      style={[styles.card, { borderColor: color }]}
      onPress={onPress}
    >
      <GameMark mark={mark} icon={icon} color={color} />
      <View style={styles.cardCopy}>
        <View style={[styles.modePill, { backgroundColor: color }]}>
          <Text style={styles.modePillText}>{title}</Text>
        </View>
        <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.74)' }]}>{subtitle}</Text>
      </View>
      <View style={[styles.playPill, { backgroundColor: color }]}>
        <Ionicons name="chevron-forward" size={18} color="#fff" />
      </View>
    </AnimatedPressable>
  );
}

export default function OfflineGames() {
  return (
    <ScreenShell title="Offline Games" subtitle="No internet needed. Play solo, bot or same mobile.">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GameCard
          title="WORD"
          subtitle="Choose difficulty, solve levels, use hints and collect coins."
          icon="grid"
          mark="WR"
          color="#4CC38A"
          onPress={() => router.push('/levels')}
        />
        <GameCard
          title="XOX"
          subtitle="Play vs bot or two players on the same mobile."
          icon="close-circle"
          mark="XO"
          color="#FF7A00"
          onPress={() => router.push('/xox' as any)}
        />
        <View style={styles.note}>
          <Ionicons name="wifi-outline" size={20} color="#4CC38A" />
          <Text style={styles.noteText}>
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
    minHeight: 132,
    borderWidth: 1.5,
    borderBottomWidth: 5,
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  markShell: {
    width: 82,
    height: 82,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(5,9,28,0.58)',
  },
  markGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    opacity: 0.24,
  },
  markText: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  markIcon: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1, gap: 8 },
  modePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modePillText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  subtitle: { fontSize: 13, fontWeight: '700', lineHeight: 18, marginTop: 5 },
  playPill: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  note: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  noteText: { flex: 1, fontWeight: '700', lineHeight: 18, color: 'rgba(255,255,255,0.72)' },
});
