// components/AnimatedEntry.tsx
// Wrap any list item or card to get a staggered slide-in + fade-in on mount.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

type From = 'bottom' | 'left' | 'right' | 'scale';

interface Props {
  children: React.ReactNode;
  /** Milliseconds before this item starts animating — use index * N for stagger */
  delay?: number;
  /** Direction the element slides in from */
  from?: From;
  /** Animation duration in ms */
  duration?: number;
}

export function AnimatedEntry({ children, delay = 0, from = 'bottom', duration = 360 }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translate = anim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });
  const scale     = anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });

  const transform = (() => {
    switch (from) {
      case 'bottom': return [{ translateY: translate }];
      case 'left':   return [{ translateX: anim.interpolate({ inputRange: [0,1], outputRange: [-26, 0] }) }];
      case 'right':  return [{ translateX: translate }];
      case 'scale':  return [{ scale }];
    }
  })();

  return (
    <Animated.View style={{ opacity: anim, transform }}>
      {children}
    </Animated.View>
  );
}
