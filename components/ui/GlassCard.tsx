// components/ui/GlassCard.tsx
// Reusable glassmorphism card.

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  accent?: string;
}

export function GlassCard({ children, style, accent }: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        accent ? { borderColor: `${accent}30`, shadowColor: accent } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#5B9BFF',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 6,
  },
});
