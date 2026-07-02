// components/BattleNotificationModal.tsx
// Beautiful in-app modal for incoming battle / rematch notifications.

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Theme } from '../constants/theme';
import { BattleRoom } from '../lib/online';
import { DEFAULT_BATTLE_STAKE } from '../lib/battleEconomy';

interface Props {
  room: BattleRoom | null;
  onAccept: () => void;
  onReject: () => void;
  acceptBusy?: boolean;
}

const DIFF_COLORS: Record<string, string> = {
  easy:   '#4CC38A',
  medium: '#FF7A00',
  hard:   '#FFD23F',
  pro:    '#FF4D8D',
};

export function BattleNotificationModal({ room, onAccept, onReject, acceptBusy }: Props) {
  const slideY  = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!room) return;

    // Slide in
    Animated.parallel([
      Animated.spring(slideY,  { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    // Pulse the flash icon
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [room]);

  if (!room) return null;

  const diffColor = DIFF_COLORS[room.difficulty] ?? Theme.primary;
  const stakeCoins = room.stakeCoins ?? DEFAULT_BATTLE_STAKE;

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 80, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0,  duration: 200, useNativeDriver: true }),
    ]).start(onReject);
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      {/* Dim backdrop */}
      <Pressable style={styles.backdrop} onPress={dismiss} />

      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideY }], opacity },
        ]}
        pointerEvents="box-none"
      >
        {/* Glow orbs */}
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        {/* Flash icon */}
        <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulse }] }]}>
          <Ionicons name="flash" size={44} color={Theme.warn} />
        </Animated.View>

        <Text style={styles.badge}>⚡ BATTLE CHALLENGE</Text>

        <Text style={styles.challenger} numberOfLines={1}>
          {room.player1Name}
        </Text>
        <Text style={styles.sub}>has challenged you to a live battle!</Text>

        {/* Match details pill */}
        <View style={[styles.detailPill, { borderColor: `${diffColor}55` }]}>
          <Ionicons name="game-controller-outline" size={14} color={diffColor} />
          <Text style={[styles.detailText, { color: diffColor }]}>
            {room.categoryTitle}
          </Text>
          <View style={styles.detailDot} />
          <Text style={[styles.detailText, { color: diffColor }]}>
            {room.difficulty.toUpperCase()}
          </Text>
          <View style={styles.detailDot} />
          <Text style={[styles.detailText, { color: diffColor }]}>
            Level {room.level}
          </Text>
        </View>

        {/* Coin info */}
        <View style={styles.rewardRow}>
          <Ionicons name="logo-bitcoin" size={13} color={Theme.warn} />
          <Text style={styles.rewardText}>Winner +{stakeCoins} • Loser -{stakeCoins}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <Pressable
            onPress={dismiss}
            style={styles.declineBtn}
          >
            <Ionicons name="close-circle-outline" size={20} color={Theme.danger} />
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>

          <Pressable
            onPress={onAccept}
            disabled={acceptBusy}
            style={[styles.acceptBtn, acceptBusy && styles.btnBusy]}
          >
            <Ionicons name="flash" size={20} color="#0D0500" />
            <Text style={styles.acceptText}>
              {acceptBusy ? 'Joining…' : 'Accept & Fight!'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,5,0,0.72)',
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A0800',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(255,150,0,0.35)',
    padding: 28,
    paddingBottom: 40,
    alignItems: 'center',
    overflow: 'hidden',
  },

  orb1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,100,0,0.12)',
  },
  orb2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,210,63,0.08)',
  },

  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,210,63,0.14)',
    borderWidth: 2,
    borderColor: 'rgba(255,210,63,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: Theme.warn,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },

  badge: {
    color: Theme.warn,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: 10,
  },

  challenger: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  sub: {
    color: Theme.textDim,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },

  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '900',
  },
  detailDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 24,
  },
  rewardText: {
    color: Theme.textDim,
    fontSize: 12,
    fontWeight: '700',
  },

  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },

  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    borderRadius: 20,
    backgroundColor: 'rgba(247,108,108,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(247,108,108,0.30)',
  },
  declineText: {
    color: Theme.danger,
    fontSize: 15,
    fontWeight: '900',
  },

  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 15,
    borderRadius: 20,
    backgroundColor: Theme.warn,
    shadowColor: Theme.warn,
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 8,
  },
  acceptText: {
    color: '#0D0500',
    fontSize: 15,
    fontWeight: '900',
  },
  btnBusy: {
    opacity: 0.55,
  },
});
