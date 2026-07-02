// components/Splash.tsx
// SDK 54 safe splash screen. Duplicate React keys fixed by using letter + index.

import React, { useEffect, useMemo, useRef } from 'react';
import { Image } from 'expo-image';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

type Props = { onDone: () => void };

const TILES = [
  { letter: 'W', bg: '#29E0FF' },
  { letter: 'O', bg: '#4CC38A' },
  { letter: 'R', bg: '#FFD23F' },
  { letter: 'D', bg: '#FF4D8D' },
  { letter: 'R', bg: '#8E6BFF' },
  { letter: 'U', bg: '#FF8C42' },
  { letter: 'S', bg: '#29E0FF' },
  { letter: 'H', bg: '#FF6BB3' },
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
    <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}>
      <Image
        source={require('../assets/images/wordrush-arena-logo.png')}
        style={styles.logoImage}
        contentFit="contain"
      />
      <View pointerEvents="none" style={styles.tileOrbit}>
        {TILES.map((tile, i) => (
          <Animated.View
            key={`${tile.letter}-${i}`}
            style={[
              styles.miniTile,
              {
                backgroundColor: tile.bg,
                opacity: opacities[i],
                transform: [{ translateY: drops[i] }],
              },
            ]}
          >
            <Text style={styles.miniTileText}>{tile.letter}</Text>
          </Animated.View>
        ))}
      </View>
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
      <Image
        source={require('../assets/images/wordrush-arena-background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View style={styles.bgOverlay} />
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
          <Text style={styles.title}>WordRush Arena</Text>
          <Text style={styles.subtitle}>Word Search | XOX | Online Battles</Text>
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
    backgroundColor: '#05091C',
    overflow: 'hidden',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,28,0.36)',
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
  logoWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 210,
    height: 210,
  },
  tileOrbit: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  miniTile: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  miniTileText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
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

