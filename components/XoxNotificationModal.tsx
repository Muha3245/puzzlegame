// components/XoxNotificationModal.tsx
// Global pop-up for incoming XOX challenges (appears over any screen).

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { XoxRoom } from '../lib/online';

interface Props {
  room: XoxRoom | null;
  onAccept: () => void;
  onReject: () => void;
  acceptBusy?: boolean;
}

export function XoxNotificationModal({ room, onAccept, onReject, acceptBusy }: Props) {
  const slideY  = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!room) return;

    Animated.parallel([
      Animated.spring(slideY,  { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220,            useNativeDriver: true }),
    ]).start();

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

  const sizeLabel = `${room.boardSize}×${room.boardSize}`;

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideY,  { toValue: 80, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0,  duration: 200, useNativeDriver: true }),
    ]).start(onReject);
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={dismiss} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }], opacity }]}>
        {/* Glow orbs */}
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        {/* Icon */}
        <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulse }] }]}>
          <Ionicons name="grid-outline" size={44} color="#8E6BFF" />
        </Animated.View>

        <Text style={styles.badge}>🎮 XOX CHALLENGE</Text>

        <Text style={styles.challenger} numberOfLines={1}>
          {room.player1Name}
        </Text>
        <Text style={styles.sub}>has challenged you to Tic Tac Toe!</Text>

        {/* Board size pill */}
        <View style={styles.detailPill}>
          <Ionicons name="grid-outline" size={14} color="#8E6BFF" />
          <Text style={styles.detailText}>{sizeLabel} Board</Text>
          <View style={styles.dot} />
          <Text style={styles.detailText}>You play as O</Text>
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <Pressable onPress={dismiss} style={styles.declineBtn}>
            <Ionicons name="close-circle-outline" size={20} color="#FF4D8D" />
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>

          <Pressable
            onPress={onAccept}
            disabled={acceptBusy}
            style={[styles.acceptBtn, acceptBusy && styles.btnBusy]}
          >
            {acceptBusy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="checkmark" size={20} color="#fff" />
            )}
            <Text style={styles.acceptText}>
              {acceptBusy ? 'Joining…' : 'Accept & Play!'}
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
    backgroundColor: 'rgba(11,16,32,0.78)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0E0B1A',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(142,107,255,0.35)',
    padding: 28,
    paddingBottom: 40,
    alignItems: 'center',
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(142,107,255,0.12)',
  },
  orb2: {
    position: 'absolute', bottom: -30, left: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(76,195,138,0.08)',
  },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(142,107,255,0.16)',
    borderWidth: 2, borderColor: 'rgba(142,107,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#8E6BFF', shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, elevation: 10,
  },
  badge: {
    color: '#8E6BFF', fontSize: 11, fontWeight: '900',
    letterSpacing: 2.5, marginBottom: 10,
  },
  challenger: {
    color: '#fff', fontSize: 26, fontWeight: '900',
    textAlign: 'center', marginBottom: 4,
  },
  sub: {
    color: 'rgba(200,180,255,0.72)', fontSize: 13, fontWeight: '700',
    textAlign: 'center', marginBottom: 18,
  },
  detailPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(142,107,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(142,107,255,0.30)',
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, marginBottom: 24,
  },
  detailText: { color: '#8E6BFF', fontSize: 13, fontWeight: '900' },
  dot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  declineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 15, borderRadius: 20,
    backgroundColor: 'rgba(255,77,141,0.10)',
    borderWidth: 1.5, borderColor: 'rgba(255,77,141,0.30)',
  },
  declineText: { color: '#FF4D8D', fontSize: 15, fontWeight: '900' },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7, paddingVertical: 15, borderRadius: 20,
    backgroundColor: '#8E6BFF',
    shadowColor: '#8E6BFF', shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 8,
  },
  acceptText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  btnBusy:   { opacity: 0.55 },
});
