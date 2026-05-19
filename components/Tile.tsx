// components/Tile.tsx
// Circular category tile with label, progress ring, completion badge, and lock state.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Category } from '../constants/categories';
import { Theme } from '../constants/theme';
import { CatIcon } from './CatIcon';

const TILE = 70;

type Props = {
  cat: Category;
  progress: number;
  locked?: boolean;
  onPress: (cat: Category) => void;
};

export function Tile({ cat, progress, locked, onPress }: Props) {
  const total = cat.words.length;
  const done = !locked && progress >= total;
  const partial = !locked && progress > 0 && !done;

  return (
    <Pressable onPress={() => !locked && onPress(cat)} disabled={locked} style={styles.button}>
      {({ pressed }) => (
        <>
          <View style={[
            styles.tile,
            {
              backgroundColor: locked ? '#36406A' : cat.color,
              transform: [{ translateY: pressed ? 2 : 0 }, { scale: pressed ? 0.97 : 1 }],
            },
          ]}>
            {locked ? (
              <Svg width={26} height={26} viewBox="0 0 24 24">
                <Path d="M7 11 V 8 a 5 5 0 0 1 10 0 V 11" stroke="#A4B0D8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <Rect x="5" y="11" width="14" height="10" rx="2" fill="#A4B0D8"/>
                <Circle cx="12" cy="16" r="1.5" fill="#36406A"/>
              </Svg>
            ) : (
              <CatIcon id={cat.id} size={42} />
            )}
            {partial && (
              <Svg width={TILE + 10} height={TILE + 10} style={styles.ring}>
                <Circle cx={(TILE + 10) / 2} cy={(TILE + 10) / 2} r={(TILE + 10) / 2 - 3} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
                <Circle
                  cx={(TILE + 10) / 2} cy={(TILE + 10) / 2} r={(TILE + 10) / 2 - 3} fill="none"
                  stroke={Theme.warn} strokeWidth="3"
                  strokeDasharray={`${(progress / total) * 2 * Math.PI * ((TILE + 10) / 2 - 3)} 999`}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${(TILE + 10) / 2} ${(TILE + 10) / 2})`}
                />
              </Svg>
            )}
            {done && (
              <View style={styles.badge}>
                <Svg width={11} height={11} viewBox="0 0 12 12">
                  <Path d="M2 6 L 5 9 L 10 3" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </Svg>
              </View>
            )}
          </View>
          <Text style={[styles.label, { color: locked ? Theme.textMute : '#fff' }]}>
            {cat.name}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', width: TILE },
  tile: {
    width: TILE, height: TILE, borderRadius: TILE / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 11, fontWeight: '800', marginTop: 6, letterSpacing: 0.2 },
  ring: { position: 'absolute', top: -5, left: -5 },
  badge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Theme.success,
    borderWidth: 3, borderColor: Theme.bg,
    alignItems: 'center', justifyContent: 'center',
  },
});
