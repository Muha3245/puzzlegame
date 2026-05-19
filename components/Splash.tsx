// components/Splash.tsx
// Splash / preloader. Animates in for ~1.7s then calls onDone.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Line as SvgLine, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Theme } from '../constants/theme';

type Props = { onDone: () => void };

export function Splash({ onDone }: Props) {
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const titleY    = useRef(new Animated.Value(10)).current;
  const titleOp   = useRef(new Animated.Value(0)).current;
  const subOp     = useRef(new Animated.Value(0)).current;
  const barWidth  = useRef(new Animated.Value(0)).current;
  const wholeOp   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
        Animated.timing(titleOp, { toValue: 1, duration: 500, delay: 250, useNativeDriver: true }),
        Animated.timing(titleY,  { toValue: 0, duration: 500, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(subOp,   { toValue: 1, duration: 500, delay: 400, useNativeDriver: true }),
        Animated.timing(barWidth, { toValue: 1, duration: 1400, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]),
      Animated.timing(wholeOp, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [logoScale, titleY, titleOp, subOp, barWidth, wholeOp, onDone]);

  return (
    <Animated.View style={[styles.root, { opacity: wholeOp }]}>
      <Animated.View style={{ transform: [{ scale: logoScale }] }}>
        <LogoSVG />
      </Animated.View>
      <Animated.Text style={[styles.title, { opacity: titleOp, transform: [{ translateY: titleY }] }]}>
        Word Search
      </Animated.Text>
      <Animated.Text style={[styles.sub, { opacity: subOp }]}>
        FIND · SOLVE · LEVEL UP
      </Animated.Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
    </Animated.View>
  );
}

function LogoSVG() {
  const cells = [
    ['E','Y','D','R'],
    ['B','G','L','F'],
    ['O','O','F','Y'],
    ['X','R','T','S'],
  ];
  return (
    <Svg width={168} height={168} viewBox="0 0 168 168">
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF"/>
          <Stop offset="1" stopColor="#EAEEF8"/>
        </LinearGradient>
        <LinearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5B9BFF"/>
          <Stop offset="1" stopColor="#2E6FE2"/>
        </LinearGradient>
      </Defs>
      <G transform="rotate(-8 84 84)">
        <Rect x="6" y="6" width="156" height="156" rx="32" fill="url(#lg)"/>
        {cells.map((row, r) => row.map((ch, c) => (
          <SvgText key={`${r}-${c}`} x={26 + c * 36} y={48 + r * 32} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1F1B16">
            {ch}
          </SvgText>
        )))}
        <SvgLine x1="20" y1="36" x2="148" y2="132" stroke="url(#lg2)" strokeWidth="34" strokeLinecap="round" opacity={0.95}/>
        <G fill="#fff" fontSize="20" fontWeight="900">
          <SvgText x="36"  y="50"  textAnchor="middle">W</SvgText>
          <SvgText x="68"  y="74"  textAnchor="middle">O</SvgText>
          <SvgText x="100" y="98"  textAnchor="middle">R</SvgText>
          <SvgText x="132" y="124" textAnchor="middle">D</SvgText>
        </G>
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: Theme.bg,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 200,
  },
  title: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 26, letterSpacing: -0.5 },
  sub: { color: Theme.textDim, fontSize: 13, fontWeight: '700', marginTop: 6, letterSpacing: 1.5 },
  barTrack: {
    marginTop: 60, width: 220, height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999, padding: 2,
  },
  barFill: {
    height: '100%', backgroundColor: Theme.warn, borderRadius: 999,
  },
});
