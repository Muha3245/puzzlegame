// components/Splash.tsx
// Animated intro screen with a letter-tile logo that assembles itself.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Theme } from '../constants/theme';

type Props = { onDone: () => void };

const PARTICLE_COLORS = ['#FF7A00', '#FFD23F', '#FF9F43', '#ffffff', '#FF6040', '#FF4D8D', '#4CC38A'];
const PARTICLE_COUNT  = 16;

// ── Letter-tile logo ─────────────────────────────────────────────────────────

const TILE_SIZE   = 54;
const TILE_GAP    = 10;
const LOGO_W      = TILE_SIZE * 2 + TILE_GAP;
const LOGO_H      = TILE_SIZE * 2 + TILE_GAP;

// Each tile: letter, tile background color, glow color
const TILES = [
  { letter: 'P', bg: '#FF7A00', glow: '#FF7A00' },
  { letter: 'U', bg: '#E94B8C', glow: '#E94B8C' },
  { letter: 'Z', bg: '#FFD23F', glow: '#FFD23F' },
  { letter: 'Z', bg: '#4CC38A', glow: '#4CC38A' },
];

function LogoMark() {
  // Per-tile drop animation (translateY from -80 → 0)
  const drops    = useRef(TILES.map(() => new Animated.Value(-80))).current;
  // Per-tile opacity
  const opacities = useRef(TILES.map(() => new Animated.Value(0))).current;
  // Highlight stripe width (0 → LOGO_W)
  const stripeW  = useRef(new Animated.Value(0)).current;
  // Stripe opacity
  const stripeOp = useRef(new Animated.Value(0)).current;
  // Inner glow pulse
  const innerGlow = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // 1. Tiles drop in with stagger
    const tileAnims = TILES.map((_, i) =>
      Animated.parallel([
        Animated.spring(drops[i], {
          toValue: 0,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacities[i], {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.stagger(95, tileAnims).start(() => {
      // 2. Stripe draws across after tiles land
      Animated.parallel([
        Animated.timing(stripeOp, {
          toValue: 1,
          duration: 120,
          useNativeDriver: false,
        }),
        Animated.timing(stripeW, {
          toValue: LOGO_W,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();

      // 3. Inner glow pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(innerGlow, { toValue: 1.0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(innerGlow, { toValue: 0.55, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={{ width: LOGO_W, height: LOGO_H }}>
      {/* Soft glow behind entire grid */}
      <Animated.View
        style={{
          position: 'absolute',
          top:    -22,
          left:   -22,
          width:  LOGO_W + 44,
          height: LOGO_H + 44,
          borderRadius: 48,
          backgroundColor: 'rgba(255,100,0,0.16)',
          opacity: innerGlow,
        }}
      />

      {/* 4 tiles in a 2×2 grid */}
      {TILES.map((tile, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return (
          <Animated.View
            key={tile.letter}
            style={{
              position:  'absolute',
              left:      col * (TILE_SIZE + TILE_GAP),
              top:       row * (TILE_SIZE + TILE_GAP),
              width:     TILE_SIZE,
              height:    TILE_SIZE,
              borderRadius: 16,
              backgroundColor: tile.bg,
              alignItems:    'center',
              justifyContent:'center',
              opacity:   opacities[i],
              transform: [{ translateY: drops[i] }],
              // iOS glow shadow
              shadowColor:   tile.glow,
              shadowOpacity: 0.65,
              shadowOffset:  { width: 0, height: 6 },
              shadowRadius:  14,
              elevation:     8,
            }}
          >
            <Text style={s.tileLetter}>{tile.letter}</Text>
          </Animated.View>
        );
      })}

      {/* Word-search highlight stripe (diagonal-ish across W→D) */}
      <Animated.View
        style={{
          position:     'absolute',
          top:          TILE_SIZE * 0.5 - 14,
          left:         0,
          width:        stripeW,
          height:       28,
          borderRadius: 14,
          backgroundColor: 'rgba(255,255,255,0.22)',
          opacity:      stripeOp,
          transform:    [{ rotate: '13deg' }],
        }}
      />
    </View>
  );
}

// ── Main Splash component ─────────────────────────────────────────────────────

export function Splash({ onDone }: Props) {
  const { width, height } = useWindowDimensions();

  const logoScale = useRef(new Animated.Value(0.4)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const titleY    = useRef(new Animated.Value(18)).current;
  const titleOp   = useRef(new Animated.Value(0)).current;
  const subOp     = useRef(new Animated.Value(0)).current;
  const barWidth  = useRef(new Animated.Value(0)).current;
  const wholeOp   = useRef(new Animated.Value(1)).current;

  // Floating particles — positions fixed on first render
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x:      width * 0.06 + Math.random() * (width * 0.88),
      startY: height * 0.40 + Math.random() * (height * 0.52),
      size:   2.5 + Math.random() * 5.5,
      color:  PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      yAnim:  new Animated.Value(0),
      opAnim: new Animated.Value(0),
      delay:  i * 90 + Math.random() * 170,
    }))
  ).current;

  useEffect(() => {
    // Pulsing glow ring loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.16, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 0.80, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Floating particles
    particles.forEach((p) => {
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(p.opAnim, { toValue: 0.70, duration: 230, useNativeDriver: true }),
          Animated.timing(p.yAnim, {
            toValue:  -(p.startY + height * 0.12),
            duration: 2100 + Math.random() * 600,
            easing:   Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(1500),
            Animated.timing(p.opAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });

    // Main entrance sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
        Animated.timing(titleOp,  { toValue: 1, duration: 480, delay: 350, useNativeDriver: true }),
        Animated.timing(titleY,   { toValue: 0, duration: 480, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(subOp,    { toValue: 1, duration: 480, delay: 500, useNativeDriver: true }),
        Animated.timing(barWidth, { toValue: 1, duration: 1400, delay: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]),
      Animated.timing(wholeOp, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(() => onDone());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const barInterp = barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[s.root, { opacity: wholeOp }]}>
      {/* Background orbs */}
      <View style={[s.orb, { width: width * 0.80, height: width * 0.80, borderRadius: width * 0.40, top: -width * 0.26, left: -width * 0.18, backgroundColor: 'rgba(255,80,0,0.11)' }]} />
      <View style={[s.orb, { width: width * 0.65, height: width * 0.65, borderRadius: width * 0.33, bottom: -width * 0.20, right: -width * 0.15, backgroundColor: 'rgba(255,120,0,0.08)' }]} />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position:    'absolute',
            left:        p.x,
            top:         p.startY,
            width:       p.size,
            height:      p.size,
            borderRadius:p.size / 2,
            backgroundColor: p.color,
            opacity:     p.opAnim,
            transform:   [{ translateY: p.yAnim }],
          }}
        />
      ))}

      {/* Logo area: outer glow ring + tile grid */}
      <View style={s.logoArea}>
        {/* Outer pulsing glow ring */}
        <Animated.View style={[s.glowRing, { transform: [{ scale: glowScale }] }]} />

        {/* Animated letter-tile logo */}
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <LogoMark />
        </Animated.View>
      </View>

      {/* App name */}
      <Animated.Text style={[s.title, { opacity: titleOp, transform: [{ translateY: titleY }] }]}>
        Puzzle Arena
      </Animated.Text>
      <Animated.Text style={[s.sub, { opacity: subOp }]}>
        PLAY · BATTLE · WIN
      </Animated.Text>

      {/* Progress bar */}
      <View style={s.barTrack}>
        <Animated.View style={[s.barFill, { width: barInterp }]} />
      </View>
      <Animated.Text style={[s.hint, { opacity: subOp }]}>
        Loading…
      </Animated.Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0500',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          200,
    overflow:        'hidden',
  },
  orb: { position: 'absolute' },

  logoArea: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  glowRing: {
    position:        'absolute',
    width:           220,
    height:          220,
    borderRadius:    110,
    backgroundColor: 'rgba(255,100,0,0.13)',
    shadowColor:     '#FF7A00',
    shadowOpacity:   0.75,
    shadowOffset:    { width: 0, height: 0 },
    shadowRadius:    50,
    elevation:       0,
  },

  tileLetter: {
    color:      '#fff',
    fontSize:   26,
    fontWeight: '900',
    textShadowColor:  'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  title: {
    color:      '#fff',
    fontSize:   38,
    fontWeight: '900',
    marginTop:  28,
    letterSpacing: 0.5,
    textShadowColor:  'rgba(255,120,0,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  sub: {
    color:      Theme.textDim,
    fontSize:   12,
    fontWeight: '700',
    marginTop:  7,
    letterSpacing: 2.4,
  },

  barTrack: {
    marginTop:       52,
    width:           220,
    height:          6,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius:    999,
    overflow:        'hidden',
  },
  barFill: {
    height:          '100%',
    backgroundColor: Theme.primary,
    borderRadius:    999,
    shadowColor:     Theme.primary,
    shadowOpacity:   0.9,
    shadowOffset:    { width: 0, height: 0 },
    shadowRadius:    8,
  },
  hint: {
    marginTop:    11,
    color:        Theme.textMute,
    fontSize:     11,
    fontWeight:   '700',
    letterSpacing:1.6,
  },
});
