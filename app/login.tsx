// app/login.tsx
// Beautiful login / register screen — full-bleed background image + glass card.

import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginAsGuest, loginWithEmail, registerWithEmail } from '../lib/online';

// Unsplash galaxy / cosmic background — dark and rich
const BG_URI =
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=90';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Subtle press animation on primary button
  const btnScale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();

  const submit = async () => {
    try {
      setLoading(true);
      if (mode === 'register') {
        if (!name.trim()) throw new Error('Please enter your player name.');
        if (!email.trim()) throw new Error('Please enter your email.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await registerWithEmail(name, email, password);
      } else {
        if (!email.trim()) throw new Error('Please enter your email.');
        await loginWithEmail(email, password);
      }
      router.replace('/levels');
    } catch (error: any) {
      Alert.alert('Oops!', error?.message || 'Something went wrong.');
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
      Alert.alert('Guest error', error?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setName('');
    setEmail('');
    setPassword('');
  };

  const isLogin = mode === 'login';

  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      {/* Deep tinted overlay */}
      <View style={styles.overlay} />

      {/* Floating accent orbs for depth */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Logo / brand ── */}
            <View style={styles.brand}>
              <View style={styles.logoRing}>
                <Text style={styles.logoEmoji}>🧩</Text>
              </View>
              <Text style={styles.appName}>WordPuzzle</Text>
              <Text style={styles.tagline}>Train your mind, one word at a time</Text>
            </View>

            {/* ── Glass card ── */}
            <View style={styles.card}>
              {/* Tab switcher */}
              <View style={styles.tabRow}>
                <Pressable
                  onPress={() => setMode('login')}
                  style={[styles.tab, isLogin && styles.tabActive]}
                >
                  <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Sign In</Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('register')}
                  style={[styles.tab, !isLogin && styles.tabActive]}
                >
                  <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Create Account</Text>
                </Pressable>
              </View>

              <Text style={styles.cardTitle}>
                {isLogin ? 'Welcome back 👋' : 'Join the game 🚀'}
              </Text>
              <Text style={styles.cardSub}>
                {isLogin
                  ? 'Sign in to continue your progress'
                  : 'Register to save progress & join leaderboard'}
              </Text>

              {/* Name field — register only */}
              {!isLogin && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Player Name</Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputIcon}>🎮</Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your player name"
                      placeholderTextColor="rgba(164,176,216,0.5)"
                      style={styles.input}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Email field */}
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="rgba(164,176,216,0.5)"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password field */}
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={isLogin ? '••••••••' : 'Min 6 characters'}
                    placeholderTextColor="rgba(164,176,216,0.5)"
                    style={[styles.input, { flex: 1 }]}
                    secureTextEntry={!showPw}
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
                  </Pressable>
                </View>
              </View>

              {/* Primary CTA */}
              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 6 }}>
                <Pressable
                  onPress={submit}
                  onPressIn={pressIn}
                  onPressOut={pressOut}
                  disabled={loading}
                  style={styles.primaryBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.primaryText}>
                        {isLogin ? 'Sign In' : 'Create Account'}
                      </Text>
                      <Text style={styles.primaryArrow}>→</Text>
                    </>
                  )}
                </Pressable>
              </Animated.View>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Guest play */}
              <Pressable onPress={guestLogin} disabled={loading} style={styles.guestBtn}>
                <Text style={styles.guestIcon}>👻</Text>
                <Text style={styles.guestText}>Play as Guest</Text>
              </Pressable>
            </View>

            {/* Switch mode link */}
            <Pressable onPress={toggleMode} style={styles.switchRow}>
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.switchLink}>{isLogin ? 'Register' : 'Sign in'}</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#050c20' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 8, 32, 0.72)',
  },

  // Glowing accent orbs
  orb1: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(91, 155, 255, 0.15)',
  },
  orb2: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(233, 75, 140, 0.12)',
  },

  safe: { flex: 1 },
  kav: { flex: 1 },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 32,
  },

  // ── Brand / logo ──
  brand: { alignItems: 'center', marginBottom: 28 },

  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(91,155,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(91,155,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#5B9BFF',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: { fontSize: 38 },

  appName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(91,155,255,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  tagline: {
    marginTop: 6,
    color: 'rgba(164,176,216,0.8)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Glass card ──
  card: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    padding: 22,
    // iOS glass shadow
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    elevation: 14,
  },

  // ── Mode tabs ──
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(91,155,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(91,155,255,0.4)',
  },
  tabText: {
    color: 'rgba(164,176,216,0.6)',
    fontWeight: '700',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#5B9BFF',
    fontWeight: '900',
  },

  cardTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardSub: {
    color: 'rgba(164,176,216,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 18,
  },

  // ── Input fields ──
  fieldWrap: { marginBottom: 14 },
  label: {
    color: 'rgba(164,176,216,0.85)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 8,
  },
  inputIcon: { fontSize: 16 },
  input: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    paddingVertical: 12,
  },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 16 },

  // ── Primary button ──
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5B9BFF',
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: '#5B9BFF',
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 8,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  primaryArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },

  // ── Divider ──
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: 'rgba(164,176,216,0.5)',
    fontWeight: '700',
    fontSize: 12,
  },

  // ── Guest button ──
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  guestIcon: { fontSize: 18 },
  guestText: {
    color: 'rgba(164,176,216,0.85)',
    fontWeight: '800',
    fontSize: 15,
  },

  // ── Switch mode ──
  switchRow: { alignItems: 'center', marginTop: 22 },
  switchText: {
    color: 'rgba(164,176,216,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  switchLink: {
    color: '#5B9BFF',
    fontWeight: '900',
  },
});
