// components/ui/AppHeader.tsx
// Shared header bar used by all screens — dark glass style.

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../../constants/theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  coins?: number;
}

export function AppHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightSlot,
  coins,
}: AppHeaderProps) {
  const handleBack = onBack ?? (() => router.back());

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable onPress={handleBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
      ) : (
        <View style={styles.iconBtnPlaceholder} />
      )}

      <View style={styles.titleBlock}>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.right}>
        {coins !== undefined ? (
          <Pressable onPress={() => router.push('/shop' as any)} style={styles.coinPill}>
            <Ionicons name="logo-bitcoin" size={14} color={Theme.warn} />
            <Text style={styles.coinText}>{coins}</Text>
          </Pressable>
        ) : null}
        {rightSlot}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 58,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBtnPlaceholder: {
    width: 40,
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  subtitle: {
    color: Theme.textDim,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,210,63,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.3)',
  },
  coinText: {
    color: Theme.warn,
    fontSize: 13,
    fontWeight: '900',
  },
});
