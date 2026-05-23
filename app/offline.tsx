import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ScreenShell } from '../components/ScreenShell';

function GameCard({ title, subtitle, icon, color, onPress }: any) {
  return (
    <AnimatedPressable style={[styles.card, { borderColor: color }]} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={32} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.playPill}><Text style={styles.playText}>PLAY</Text></View>
    </AnimatedPressable>
  );
}

export default function OfflineGames() {
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
        <View style={styles.note}>
          <Ionicons name="wifi-outline" size={20} color="#8DE7FF" />
          <Text style={styles.noteText}>Online is currently only for Word Search Battle using your existing database.</Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 34, gap: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 140, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderRadius: 28, padding: 18 },
  icon: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.68)', fontSize: 13, fontWeight: '700', lineHeight: 18, marginTop: 5 },
  playPill: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  playText: { color: '#120F2D', fontWeight: '900', fontSize: 11 },
  note: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(141,231,255,0.13)', borderRadius: 20, padding: 14, alignItems: 'center' },
  noteText: { flex: 1, color: 'rgba(255,255,255,0.78)', fontWeight: '700', lineHeight: 18 },
});
