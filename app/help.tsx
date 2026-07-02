// app/help.tsx
// How-to-play modal with numbered steps.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Theme } from '../constants/theme';
import { goBackOrHome } from '../lib/navigation';

const STEPS = [
  { n: '1', title: 'Find hidden words',        body: 'Words are placed horizontally, vertically, or diagonally — forwards and backwards.' },
  { n: '2', title: 'Drag across letters',      body: 'Press the first letter, drag to the last, then release. The path must be a straight line.' },
  { n: '3', title: 'Use coins for power-ups',  body: 'Stuck? Spend coins on Reveal Letter, Reveal Word, or Magnify to find tricky placements.' },
  { n: '4', title: 'Complete the category',    body: 'Find every word to unlock the next category and earn stars + bonus coins.' },
];

export default function Help() {
  return (
    <Sheet visible title="How to Play" onClose={goBackOrHome}>
      <View style={{ gap: 12 }}>
        {STEPS.map((s) => (
          <View key={s.n} style={styles.step}>
            <View style={styles.num}><Text style={styles.numTxt}>{s.n}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.tip}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: Theme.success }}>💡 Pro tip</Text>
        <Text style={{ fontSize: 12, color: Theme.textDim, marginTop: 4, lineHeight: 18 }}>
          Scan rows for double-letters first. Words like APPLE or SHEEP often jump out and reveal crossings for the harder placements.
        </Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  step: {
    flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  num: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  numTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
  title: { fontSize: 14, fontWeight: '800', color: '#fff' },
  body: { fontSize: 12, color: Theme.textDim, marginTop: 2, lineHeight: 18 },
  tip: {
    marginTop: 18, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(76,195,138,0.1)',
    borderWidth: 1, borderColor: 'rgba(76,195,138,0.25)',
  },
});
