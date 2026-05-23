import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedPressable } from './AnimatedPressable';

const BG = 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=90';

export function ScreenShell({ title, subtitle, children, showBack = true }: { title: string; subtitle?: string; children: ReactNode; showBack?: boolean }) {
  return (
    <ImageBackground source={{ uri: BG }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.blobOne} />
      <View style={styles.blobTwo} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          {showBack ? (
            <AnimatedPressable style={styles.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home' as any))}>
              <Ionicons name="chevron-back" size={23} color="#fff" />
            </AnimatedPressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {children}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#120F2D' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,10,34,0.82)' },
  blobOne: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,122,0,0.28)', top: -40, right: -70 },
  blobTwo: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(75,195,138,0.22)', bottom: -80, left: -90 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12 },
  back: { width: 44, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: 'rgba(255,255,255,0.68)', fontSize: 13, fontWeight: '700', marginTop: 2 },
});
