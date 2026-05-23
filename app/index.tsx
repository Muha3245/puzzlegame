import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Splash } from '../components/Splash';

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: '#120F2D' }}>
      <Splash onDone={() => router.replace('/home' as any)} />
    </View>
  );
}
