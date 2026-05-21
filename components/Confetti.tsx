// components/Confetti.tsx
// Particle-burst confetti that fires when `active` flips to true.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

const COLORS  = ['#FF7A00', '#FFD23F', '#FF9F43', '#4CC38A', '#FF4D8D', '#FFFFFF', '#FF6040', '#A78BFA'];
const COUNT   = 22;

type Particle = {
  tx: Animated.Value; // absolute x on screen
  ty: Animated.Value; // absolute y on screen
  rot: Animated.Value;
  op: Animated.Value;
  color: string;
  w: number;
  h: number;
};

export function Confetti({ active }: { active: boolean }) {
  const { width, height } = useWindowDimensions();

  const particles = useRef<Particle[]>(
    Array.from({ length: COUNT }, (_, i) => ({
      tx:  new Animated.Value(0),
      ty:  new Animated.Value(0),
      rot: new Animated.Value(0),
      op:  new Animated.Value(0),
      color: COLORS[i % COLORS.length],
      // alternate between round dots and flat ribbons
      w: i % 3 === 0 ? 8 : 11,
      h: i % 3 === 0 ? 8 : 4,
    }))
  ).current;

  const fired = useRef(false);

  useEffect(() => {
    if (!active || fired.current) return;
    fired.current = true;

    const cx = width  * 0.5;
    const cy = height * 0.38;

    particles.forEach((p, i) => {
      // Reset to launch point
      p.tx.setValue(cx);
      p.ty.setValue(cy);
      p.rot.setValue(0);
      p.op.setValue(1);

      const angle = ((i / COUNT) * 360 + (Math.random() * 22 - 11)) * (Math.PI / 180);
      const speed = 110 + Math.random() * 140;
      const dx = Math.cos(angle) * speed;
      // upward initial arc then gravity pulls down
      const peakDy  = -Math.abs(Math.sin(angle) * speed) - Math.random() * 60;
      const finalDy = peakDy + 380 + Math.random() * 120;

      Animated.parallel([
        // Horizontal spread
        Animated.timing(p.tx, {
          toValue: cx + dx,
          duration: 1050,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Vertical: arc up then fall
        Animated.sequence([
          Animated.timing(p.ty, {
            toValue: cy + peakDy,
            duration: 340,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.ty, {
            toValue: cy + finalDy,
            duration: 780,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Spin
        Animated.timing(p.rot, {
          toValue: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 6),
          duration: 1100,
          useNativeDriver: true,
        }),
        // Fade out near end
        Animated.sequence([
          Animated.delay(560),
          Animated.timing(p.op, { toValue: 0, duration: 490, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, [active]);

  // Reset fired flag when active goes false so rematch can re-trigger
  useEffect(() => {
    if (!active) fired.current = false;
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p, i) => {
        const rotate = p.rot.interpolate({ inputRange: [-10, 10], outputRange: ['-720deg', '720deg'] });
        const isRound = p.w === p.h;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              top:  0,
              width:  p.w,
              height: p.h,
              borderRadius: isRound ? p.w / 2 : 2,
              backgroundColor: p.color,
              opacity: p.op,
              transform: [{ translateX: p.tx }, { translateY: p.ty }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
