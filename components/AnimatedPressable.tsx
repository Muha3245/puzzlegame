import React, { ReactNode, useRef } from 'react';
import { Animated, GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { playTapSound } from '../lib/audio';

type Props = PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  sound?: boolean;
  scaleTo?: number;
};

export function AnimatedPressable({ children, style, onPress, sound = true, scaleTo = 0.96, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: scaleTo, friction: 6, tension: 220, useNativeDriver: true }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }).start();
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (sound) playTapSound(true).catch(() => {});
    onPress?.(event);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable {...rest} onPressIn={pressIn} onPressOut={pressOut} onPress={handlePress} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
