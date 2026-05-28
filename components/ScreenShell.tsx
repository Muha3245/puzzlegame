import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../lib/appTheme';
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
  const { C, scheme, toggle } = useAppTheme();

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: C.divider }]}>
          {showBack ? (
            <AnimatedPressable
              style={[styles.back, { backgroundColor: C.surface, borderColor: C.divider }]}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/home' as any))}
            >
              <Ionicons name="chevron-back" size={23} color={C.ink} />
            </AnimatedPressable>
          ) : null}

          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: C.ink }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: C.muted }]}>{subtitle}</Text>
            ) : null}
          </View>

          {/* Theme toggle */}
          <AnimatedPressable
            style={[styles.back, { backgroundColor: C.surface, borderColor: C.divider }]}
            onPress={toggle}
          >
            <Ionicons
              name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color={C.ink}
            />
          </AnimatedPressable>
        </View>

        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});
