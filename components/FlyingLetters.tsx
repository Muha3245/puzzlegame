// components/FlyingLetters.tsx
// When a word is matched, its letters pop in near the grid and fly up toward the
// top of the screen one-by-one (staggered), then fade out. Purely cosmetic.

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

type Props = {
  word: string;
  color: string;
  onDone: () => void;
};

const STAGGER = 75; // ms between each letter taking off
const FLIGHT = 750; // ms for a single letter's flight

export function FlyingLetters({ word, color, onDone }: Props) {
  const { height } = useWindowDimensions();
  const letters = word.split('');

  // One animated driver per letter (0 → 1).
  const anims = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const seq = letters.map((_, i) =>
      Animated.timing(anims[i], {
        toValue: 1,
        duration: FLIGHT,
        delay: i * STAGGER,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    Animated.parallel(seq).start(() => onDone());
    // Mount-only: the parent gives each animation a fresh key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rise = height * 0.42; // how far up the letters travel

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.row}>
        {letters.map((ch, i) => {
          const a = anims[i];
          const translateY = a.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -rise],
          });
          const opacity = a.interpolate({
            inputRange: [0, 0.12, 0.75, 1],
            outputRange: [0, 1, 1, 0],
          });
          const scale = a.interpolate({
            inputRange: [0, 0.2, 1],
            outputRange: [0.4, 1.15, 0.85],
          });

          return (
            <Animated.View
              key={`${ch}-${i}`}
              style={[
                styles.tile,
                { backgroundColor: color, opacity, transform: [{ translateY }, { scale }] },
              ]}
            >
              <Text style={styles.tileText}>{ch}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  tile: {
    minWidth: 34,
    height: 38,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tileText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
});
