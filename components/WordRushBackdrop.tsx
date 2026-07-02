import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const AnimatedView = Animated.createAnimatedComponent(View);

function DriftTile({
  left,
  top,
  size,
  color,
  delay = 0,
}: {
  left: number | `${number}%`;
  top: number | `${number}%`;
  size: number;
  color: string;
  delay?: number;
}) {
  const drift = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(drift, {
            toValue: 1,
            duration: 2600 + delay,
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.85,
            duration: 1300 + delay / 2,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(drift, {
            toValue: 0,
            duration: 2600 + delay,
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.45,
            duration: 1300 + delay / 2,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, [delay, drift, glow]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const rotate = drift.interpolate({ inputRange: [0, 1], outputRange: ['-7deg', '7deg'] });

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        styles.tile,
        {
          left,
          top,
          width: size,
          height: size,
          borderRadius: size * 0.24,
          borderColor: color,
          opacity: glow,
          transform: [{ translateY }, { rotate }],
        },
      ]}
    />
  );
}

export function WordRushBackdrop({ animated = true }: { animated?: boolean }) {
  return (
    <>
      <Image
        source={require('../assets/images/wordrush-arena-background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View pointerEvents="none" style={styles.scrim} />
      {animated ? (
        <>
          <DriftTile left="9%" top="15%" size={34} color="rgba(41,224,255,0.55)" />
          <DriftTile left="78%" top="24%" size={28} color="rgba(255,210,63,0.50)" delay={420} />
          <DriftTile left="18%" top="78%" size={24} color="rgba(255,77,141,0.45)" delay={780} />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,9,28,0.22)',
  },
  tile: {
    position: 'absolute',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
});
