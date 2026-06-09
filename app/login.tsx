// app/login.tsx

import { Ionicons } from '@expo/vector-icons';
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
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { loginAsGuest, loginWithEmail, loginWithGoogle, registerWithEmail } from '../lib/online';
import { Theme } from '../constants/theme';


type Mode = 'login' | 'register';

// SVG logo icon — puzzle piece / word grid
function LogoIcon({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Grid squares */}
      <Rect x="10" y="10" width="30" height="30" rx="6" fill={Theme.primary} />
      <Rect x="60" y="10" width="30" height="30" rx="6" fill={Theme.warn} opacity="0.9" />
      <Rect x="10" y="60" width="30" height="30" rx="6" fill={Theme.success} opacity="0.85" />
      <Rect x="60" y="60" width="30" height="30" rx="6" fill={Theme.primary} opacity="0.7" />
      {/* Center connector */}
      <Rect x="44" y="44" width="12" height="12" rx="3" fill="#fff" opacity="0.9" />
      {/* Letter dots */}
      <Circle cx="25" cy="25" r="6" fill="#fff" opacity="0.85" />
      <Circle cx="75" cy="25" r="6" fill="#fff" opacity="0.85" />
      <Circle cx="25" cy="75" r="6" fill="#fff" opacity="0.85" />
      <Circle cx="75" cy="75" r="6" fill="#fff" opacity="0.85" />
    </Svg>
  );
}

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

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

  const googleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      router.replace('/levels');
    } catch (error: any) {
      const msg: string = error?.message || 'Something went wrong.';
      if (!/cancel/i.test(msg)) Alert.alert('Google sign-in', msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setName(''); setEmail(''); setPassword('');
  };

  const isLogin = mode === 'login';

  return (
    <ImageBackground source={require('../assets/images/background.png')} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Brand ── */}
            <View style={styles.brand}>
              <View style={styles.logoRing}>
                <LogoIcon size={48} />
              </View>
              <Text style={styles.appName}>WordPuzzle</Text>
              <Text style={styles.tagline}>Train your mind, one word at a time</Text>
            </View>

            {/* ── Glass card ── */}
            <View style={styles.card}>
              {/* Mode tabs */}
              <View style={styles.tabRow}>
                <Pressable onPress={() => setMode('login')} style={[styles.tab, isLogin && styles.tabActive]}>
                  <Ionicons name="log-in-outline" size={14} color={isLogin ? Theme.primary : Theme.textMute} />
                  <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Sign In</Text>
                </Pressable>
                <Pressable onPress={() => setMode('register')} style={[styles.tab, !isLogin && styles.tabActive]}>
                  <Ionicons name="person-add-outline" size={14} color={!isLogin ? Theme.primary : Theme.textMute} />
                  <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Create Account</Text>
                </Pressable>
              </View>

              <Text style={styles.cardTitle}>
                {isLogin ? 'Welcome back' : 'Join the game'}
              </Text>
              <Text style={styles.cardSub}>
                {isLogin
                  ? 'Sign in to continue your progress'
                  : 'Register to save progress & join leaderboard'}
              </Text>

              {/* Name — register only */}
              {!isLogin && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Player Name</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="game-controller-outline" size={18} color={Theme.textDim} />
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your player name"
                      placeholderTextColor="rgba(200,168,122,0.5)"
                      style={styles.input}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Email */}
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={18} color={Theme.textDim} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="rgba(200,168,122,0.5)"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={Theme.textDim} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={isLogin ? '••••••••' : 'Min 6 characters'}
                    placeholderTextColor="rgba(200,168,122,0.5)"
                    style={[styles.input, { flex: 1 }]}
                    secureTextEntry={!showPw}
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPw ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={Theme.textDim}
                    />
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
                      <Ionicons
                        name={isLogin ? 'log-in' : 'person-add'}
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.primaryText}>
                        {isLogin ? 'Sign In' : 'Create Account'}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
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

              {/* Google */}
              <Pressable onPress={googleLogin} disabled={loading} style={styles.googleBtn}>
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text style={styles.googleText}>Continue with Google</Text>
              </Pressable>

              {/* Guest */}
              <Pressable onPress={guestLogin} disabled={loading} style={[styles.guestBtn, { marginTop: 10 }]}>
                <Ionicons name="person-outline" size={18} color={Theme.textDim} />
                <Text style={styles.guestText}>Play as Guest</Text>
              </Pressable>
            </View>

            {/* Switch mode */}
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
  bg: { flex: 1, backgroundColor: '#0D0500' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(42,10,128,0.55)' },
  orb1: { position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(192,84,232,0.16)' },
  orb2: { position: 'absolute', bottom: -60, right: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,107,179,0.11)' },
  orb3: { position: 'absolute', top: '40%', left: '25%', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,215,0,0.07)' },
  safe: { flex: 1 },
  kav: { flex: 1 },

  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 32 },

  // Brand
  brand: { alignItems: 'center', marginBottom: 28 },
  logoRing: {
    width: 84, height: 84, borderRadius: 24,
    backgroundColor: 'rgba(255,120,0,0.14)',
    borderWidth: 1.5, borderColor: 'rgba(255,150,0,0.40)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Theme.primary, shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  appName: {
    color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 1,
    textShadowColor: 'rgba(255,120,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  tagline: { marginTop: 6, color: Theme.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },

  // Glass card
  card: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,150,0,0.22)',
    padding: 22,
    shadowColor: '#000', shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 12 }, shadowRadius: 32, elevation: 14,
  },

  // Tabs
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 4, marginBottom: 20 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 11 },
  tabActive: { backgroundColor: 'rgba(255,120,0,0.22)', borderWidth: 1, borderColor: 'rgba(255,150,0,0.40)' },
  tabText: { color: Theme.textMute, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: Theme.primary, fontWeight: '900' },

  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  cardSub: { color: Theme.textDim, fontSize: 13, fontWeight: '600', marginBottom: 20, lineHeight: 18 },

  // Inputs
  fieldWrap: { marginBottom: 14 },
  label: { color: Theme.textDim, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,150,0,0.20)', paddingHorizontal: 14, minHeight: 50, gap: 8 },
  input: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 15, paddingVertical: 12 },
  eyeBtn: { padding: 4 },

  // Primary button
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Theme.primary, borderRadius: 18, paddingVertical: 16, shadowColor: Theme.primary, shadowOpacity: 0.55, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 8 },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,150,0,0.15)' },
  dividerText: { color: Theme.textMute, fontWeight: '700', fontSize: 12 },

  // Google
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)' },
  googleText: { color: '#1F1F1F', fontWeight: '900', fontSize: 15 },

  // Guest
  guestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 18, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,150,0,0.16)' },
  guestText: { color: Theme.textDim, fontWeight: '800', fontSize: 15 },

  // Switch
  switchRow: { alignItems: 'center', marginTop: 22 },
  switchText: { color: Theme.textDim, fontSize: 14, fontWeight: '600' },
  switchLink: { color: Theme.primary, fontWeight: '900' },
});
