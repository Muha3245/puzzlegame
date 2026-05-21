// app/index.tsx
// Entry — show Splash, then navigate to /levels.

import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Splash } from '../components/Splash';

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0D0500' }}>
      <Splash onDone={() => router.replace('/levels')} />
    </View>
  );
}
