import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedPressable } from './AnimatedPressable';

export function ScreenShell({
  title,
  subtitle,
  children,
  showBack = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean;
}) {
  return (
    <View style={styles.root}>
      <Image
        source={require('../assets/images/background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          {showBack ? (
            <AnimatedPressable
              style={styles.btn}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/home' as any))}
            >
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2A0A80' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  title: {
    fontSize: 28, fontWeight: '900', letterSpacing: -0.4, color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 13, fontWeight: '700', marginTop: 2, color: 'rgba(255,255,255,0.82)',
    textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
});
