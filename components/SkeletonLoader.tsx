// components/SkeletonLoader.tsx
// Synchronized shimmer skeleton rows for data-loading screens.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// Single module-level animation shared by every skeleton block so they pulse in sync.
const shimmer = new Animated.Value(0.3);
Animated.loop(
  Animated.sequence([
    Animated.timing(shimmer, { toValue: 0.85, duration: 800, useNativeDriver: true }),
    Animated.timing(shimmer, { toValue: 0.3,  duration: 800, useNativeDriver: true }),
  ])
).start();

function Block({
  width,
  height = 13,
  radius = 6,
  style,
}: {
  width: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: object;
}) {
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: 'rgba(255,140,0,0.22)', opacity: shimmer }, style]}
    />
  );
}

function Circle({ size = 44 }: { size?: number }) {
  return <Block width={size} height={size} radius={size / 2} />;
}

/** Mimics a leaderboard player row */
export function SkeletonLeaderboardRow() {
  return (
    <View style={s.row}>
      <Circle />
      <View style={{ flex: 1, gap: 8 }}>
        <Block width="65%" height={14} />
        <Block width="40%" height={10} />
      </View>
      <Block width={72} height={36} radius={999} />
    </View>
  );
}

/** Mimics a friend / battle player card */
export function SkeletonCard() {
  return (
    <View style={s.card}>
      <Circle />
      <View style={{ flex: 1, gap: 8 }}>
        <Block width="58%" height={14} />
        <Block width="36%" height={10} />
      </View>
      <Block width={66} height={38} radius={19} />
    </View>
  );
}

/** Mimics a section header */
export function SkeletonSection() {
  return (
    <View style={s.section}>
      <Block width="45%" height={11} />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.07)',
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.07)',
    marginBottom: 8,
  },
  section: {
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
});
