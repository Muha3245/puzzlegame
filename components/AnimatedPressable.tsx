import React, { ReactNode, useRef } from 'react';
import { Animated, GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { playGameSound, SoundName } from '../lib/audio';
import { getAppSettings } from '../lib/storage';

type Props = PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  sound?: boolean;
  /** Which standard game sound to play on press. Defaults to a light "tap". */
  soundType?: SoundName;
  scaleTo?: number;
};

export function AnimatedPressable({ children, style, onPress, sound = true, soundType = 'tap', scaleTo = 0.94, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    // Snappy press-down, bouncy release — a more tactile, modern feel.
    Animated.spring(scale, { toValue: scaleTo, friction: 7, tension: 320, useNativeDriver: true }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
  };

  const handlePress = (event: GestureResponderEvent) => {
    // The click sound is part of the tactile press feedback, so it follows the
    // Haptics setting as well as Sound Effects: turning either off silences it.
    const s = getAppSettings();
    if (sound && s.sound && s.haptics) playGameSound(soundType, true).catch(() => {});
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
