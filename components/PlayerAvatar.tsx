import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useAppTheme } from '../lib/appTheme';

export type FrameId = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'champion';

export type FrameConfig = {
  id: FrameId;
  label: string;
  subtitle: string;
  price: number;
  ringColor: string;
  ringWidth: number;
  glowColor: string | null;
  glowRadius: number;
  ornamentCount: number;
  ornamentSize: number;
  animated: boolean;
  topIcon: keyof typeof Ionicons['glyphMap'] | null;
};

export const FRAME_CONFIGS: Record<FrameId, FrameConfig> = {
  none: {
    id: 'none', label: 'Default', subtitle: 'Standard',
    price: 0, ringColor: '#888888', ringWidth: 2,
    glowColor: null, glowRadius: 0,
    ornamentCount: 0, ornamentSize: 7, animated: false, topIcon: null,
  },
  bronze: {
    id: 'bronze', label: 'Bronze', subtitle: 'Warrior',
    price: 500, ringColor: '#C87941', ringWidth: 3,
    glowColor: 'rgba(200,121,65,0.28)', glowRadius: 10,
    ornamentCount: 0, ornamentSize: 8, animated: false, topIcon: null,
  },
  silver: {
    id: 'silver', label: 'Silver', subtitle: 'Elite',
    price: 1200, ringColor: '#A0AABB', ringWidth: 3,
    glowColor: 'rgba(160,170,187,0.32)', glowRadius: 12,
    ornamentCount: 2, ornamentSize: 8, animated: false, topIcon: null,
  },
  gold: {
    id: 'gold', label: 'Gold', subtitle: 'Legendary',
    price: 2500, ringColor: '#E8C000', ringWidth: 4,
    glowColor: 'rgba(232,192,0,0.38)', glowRadius: 16,
    ornamentCount: 4, ornamentSize: 9, animated: false, topIcon: 'star',
  },
  diamond: {
    id: 'diamond', label: 'Diamond', subtitle: 'Supreme',
    price: 5000, ringColor: '#40D8FF', ringWidth: 4,
    glowColor: 'rgba(64,216,255,0.42)', glowRadius: 20,
    ornamentCount: 4, ornamentSize: 9, animated: true, topIcon: null,
  },
  champion: {
    id: 'champion', label: 'Champion', subtitle: 'Conqueror',
    price: 10000, ringColor: '#FF5500', ringWidth: 5,
    glowColor: 'rgba(255,85,0,0.45)', glowRadius: 22,
    ornamentCount: 4, ornamentSize: 10, animated: true, topIcon: 'trophy',
  },
};

function getOrnamentPositions(count: number, radius: number) {
  if (count === 0) return [];
  const out: { x: number; y: number }[] = [];
  const start = -Math.PI / 2;
  for (let i = 0; i < count; i++) {
    const a = start + (i * 2 * Math.PI) / count;
    out.push({ x: Math.round(radius * Math.cos(a)), y: Math.round(radius * Math.sin(a)) });
  }
  return out;
}

interface Props {
  photoURL?: string | null;
  displayName?: string;
  avatarIcon?: string | null;
  frameId?: string | null;
  size?: number;
}

export function PlayerAvatar({ photoURL, displayName, avatarIcon, frameId, size = 88 }: Props) {
  const { C } = useAppTheme();
  const frame = FRAME_CONFIGS[(frameId as FrameId) ?? 'none'] ?? FRAME_CONFIGS.none;

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!frame.animated) {
      pulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.00, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [frame.animated]);

  const frameSize = size + 12;
  const outerSize = size + 34;
  const half = outerSize / 2;

  const initial = (displayName || 'P').charAt(0).toUpperCase();
  const ornamentPositions = getOrnamentPositions(frame.ornamentCount, frameSize / 2);

  return (
    <Animated.View
      style={[
        { width: outerSize, height: outerSize, alignItems: 'center', justifyContent: 'center' },
        frame.animated && { transform: [{ scale: pulse }] },
      ]}
    >
      {/* Glow backdrop */}
      {frame.glowColor ? (
        <View
          style={{
            position: 'absolute',
            width: frameSize + 12,
            height: frameSize + 12,
            borderRadius: (frameSize + 12) / 2,
            backgroundColor: frame.glowColor,
          }}
        />
      ) : null}

      {/* Frame ring */}
      <View
        style={{
          width: frameSize,
          height: frameSize,
          borderRadius: frameSize / 2,
          borderWidth: frame.ringWidth,
          borderColor: frame.ringColor,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.bg,
          shadowColor: frame.ringColor,
          shadowOpacity: frame.glowColor ? 0.75 : 0,
          shadowRadius: frame.glowRadius,
          shadowOffset: { width: 0, height: 0 },
          elevation: frame.glowRadius > 0 ? 6 : 0,
        }}
      >
        {/* Photo or letter */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            backgroundColor: photoURL ? C.surface : 'rgba(255,120,0,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {photoURL ? (
            <Image
              source={{ uri: photoURL }}
              style={{ width: size, height: size }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : avatarIcon ? (
            <Ionicons name={avatarIcon as any} size={size * 0.48} color="#FF7A00" />
          ) : (
            <Text
              style={{
                fontSize: size * 0.38,
                fontWeight: '900',
                color: '#FF7A00',
                includeFontPadding: false,
              }}
            >
              {initial}
            </Text>
          )}
        </View>
      </View>

      {/* Ornament dots */}
      {ornamentPositions.map((pos, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: frame.ornamentSize,
            height: frame.ornamentSize,
            borderRadius: frame.ornamentSize / 2,
            backgroundColor: frame.ringColor,
            left: half + pos.x - frame.ornamentSize / 2,
            top: half + pos.y - frame.ornamentSize / 2,
            shadowColor: frame.ringColor,
            shadowOpacity: 0.8,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 0 },
            elevation: 2,
          }}
        />
      ))}

      {/* Top icon (gold / champion) */}
      {frame.topIcon ? (
        <View
          style={{
            position: 'absolute',
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: frame.ringColor,
            alignItems: 'center',
            justifyContent: 'center',
            left: half - 11,
            top: half - frameSize / 2 - 6,
            elevation: 4,
            shadowColor: frame.ringColor,
            shadowOpacity: 0.9,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <Ionicons name={frame.topIcon} size={13} color="#fff" />
        </View>
      ) : null}
    </Animated.View>
  );
}
