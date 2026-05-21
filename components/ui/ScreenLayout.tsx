// components/ui/ScreenLayout.tsx
// Dark gaming glass background shared by winner, profile, battle, and other screens.

import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Dark gaming setup — orange-tinted atmospheric background
const BG_URI =
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';

interface ScreenLayoutProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenLayout({
  children,
  edges = ['top', 'left', 'right', 'bottom'],
}: ScreenLayoutProps) {
  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0D0500' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,5,0,0.82)',
  },
  orb1: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,100,0,0.14)',
  },
  orb2: {
    position: 'absolute',
    bottom: 60,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,60,0,0.09)',
  },
  orb3: {
    position: 'absolute',
    top: '45%',
    left: '30%',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,180,0,0.06)',
  },
  safe: { flex: 1 },
});
