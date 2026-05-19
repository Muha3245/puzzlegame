// app/login.tsx

import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginAsGuest, loginWithEmail, registerWithEmail } from '../lib/online';

const BG_URI =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);

      if (mode === 'register') {
        if (!name.trim()) throw new Error('Please enter your player name.');
        await registerWithEmail(name, email, password);
      } else {
        await loginWithEmail(email, password);
      }

      router.replace('/levels');
    } catch (error: any) {
      Alert.alert('Login error', error?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const guestLogin = async () => {
    try {
      setLoading(true);
      await loginAsGuest();
      router.replace('/levels');
    } catch (error: any) {
      Alert.alert('Guest login error', error?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg}>
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎮</Text>
          <Text style={styles.title}>{mode === 'login' ? 'Welcome Back' : 'Create Player'}</Text>
          <Text style={styles.sub}>Login to save progress, join leaderboard, and add friends.</Text>

          {mode === 'register' ? (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Player name"
              placeholderTextColor="#8A7EA6"
              style={styles.input}
            />
          ) : null}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#8A7EA6"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#8A7EA6"
            secureTextEntry
            style={styles.input}
          />

          <Pressable disabled={loading} onPress={submit} style={styles.primaryBtn}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>{mode === 'login' ? 'Login' : 'Register'}</Text>
            )}
          </Pressable>

          <Pressable disabled={loading} onPress={guestLogin} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Play as Guest</Text>
          </Pressable>

          <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={styles.switchText}>
              {mode === 'login' ? 'New player? Create account' : 'Already have account? Login'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 14, 62, 0.45)',
  },
  safe: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
  },
  emoji: { fontSize: 48 },
  title: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: '900',
    color: '#28145C',
  },
  sub: {
    marginTop: 8,
    color: '#6A608F',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#F2EEFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#28145C',
    fontWeight: '800',
    marginBottom: 10,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#FF6F00',
    paddingVertical: 14,
    borderRadius: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: '#EFFF44',
    paddingVertical: 14,
    borderRadius: 17,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryText: {
    color: '#B91F86',
    fontWeight: '900',
    fontSize: 15,
  },
  switchText: {
    marginTop: 16,
    color: '#5A36A0',
    fontWeight: '900',
  },
});
