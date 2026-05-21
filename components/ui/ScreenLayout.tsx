// components/ui/ScreenLayout.tsx
// Dark navy glass background shared by all screens.

import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG_URI =
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=90';

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
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#050c20' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,8,32,0.76)',
  },
  orb1: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(91,155,255,0.12)',
  },
  orb2: {
    position: 'absolute',
    bottom: 60,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(76,195,138,0.09)',
  },
  safe: { flex: 1 },
});
