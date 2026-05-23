// components/Splash.tsx
// SDK 54 safe splash screen. Duplicate React keys fixed by using letter + index.

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

type Props = { onDone: () => void };

const TILE_SIZE = 46;
const TILE_GAP = 8;
const TILES = [
  { letter: 'P', bg: '#FF7A00' },
  { letter: 'U', bg: '#FF6040' },
  { letter: 'Z', bg: '#FFD23F' },
  { letter: 'Z', bg: '#4CC38A' },
  { letter: 'L', bg: '#7C5CFF' },
  { letter: 'E', bg: '#FF4D8D' },
];

function LogoMark() {
  const drops = useRef(TILES.map(() => new Animated.Value(-42))).current;
  const opacities = useRef(TILES.map(() => new Animated.Value(0))).current;
  const pulse = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.stagger(
      75,
      TILES.map((_, i) =>
        Animated.parallel([
          Animated.spring(drops[i], {
            toValue: 0,
            friction: 6,
            tension: 120,
            useNativeDriver: true,
          }),
          Animated.timing(opacities[i], {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]),
      ),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.92, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [drops, opacities, pulse]);

  return (
    <Animated.View style={[styles.logoGrid, { transform: [{ scale: pulse }] }]}>
      {TILES.map((tile, i) => (
        <Animated.View
          // Do not use only tile.letter because Puzzle has two Z letters.
          key={`${tile.letter}-${i}`}
          style={[
            styles.tile,
            {
              backgroundColor: tile.bg,
              opacity: opacities[i],
              transform: [{ translateY: drops[i] }],
            },
          ]}
        >
          <Text style={styles.tileText}>{tile.letter}</Text>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

export function Splash({ onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const titleY = useRef(new Animated.Value(16)).current;
  const titleOp = useRef(new Animated.Value(0)).current;
  const wholeOp = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;

  const bubbles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        key: `bubble-${i}`,
        left: Math.random() * width,
        top: height * 0.18 + Math.random() * height * 0.65,
        size: 5 + Math.random() * 10,
        opacity: 0.14 + Math.random() * 0.22,
      })),
    [width, height],
  );

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOp, { toValue: 1, duration: 420, delay: 260, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 420, delay: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(progress, { toValue: 1, duration: 1300, delay: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]),
      Animated.delay(240),
      Animated.timing(wholeOp, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [onDone, progress, titleOp, titleY, wholeOp]);

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[styles.root, { opacity: wholeOp }]}>
      {bubbles.map((b) => (
        <View
          key={b.key}
          style={[
            styles.bubble,
            { left: b.left, top: b.top, width: b.size, height: b.size, borderRadius: b.size / 2, opacity: b.opacity },
          ]}
        />
      ))}

      <View style={styles.center}>
        <LogoMark />
        <Animated.View style={{ opacity: titleOp, transform: [{ translateY: titleY }] }}>
          <Text style={styles.title}>Puzzle Arena</Text>
          <Text style={styles.subtitle}>Word Search • XOX • Battle</Text>
        </Animated.View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#13233F',
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  logoGrid: {
    width: TILE_SIZE * 3 + TILE_GAP * 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
    justifyContent: 'center',
    marginBottom: 24,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tileText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  progressTrack: {
    width: 190,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginTop: 26,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FFD23F',
  },
});
