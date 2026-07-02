import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WordRushBackdrop } from '../WordRushBackdrop';

interface ScreenLayoutProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenLayout({
  children,
  edges = ['top', 'left', 'right', 'bottom'],
}: ScreenLayoutProps) {
  return (
    <View style={styles.bg}>
      <WordRushBackdrop />
      <View style={styles.overlay} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#2A0A80' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42,10,128,0.50)',
  },
  orb1: {
    position: 'absolute', top: -60, left: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(192,84,232,0.16)',
  },
  orb2: {
    position: 'absolute', bottom: 60, right: -50,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,107,179,0.10)',
  },
  safe: { flex: 1 },
});
