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
import { FriendRequest } from '../lib/online';

interface Props {
  request: FriendRequest | null;
  onAccept: () => void;
  onReject: () => void;
  acceptBusy?: boolean;
}

export function FriendRequestNotificationModal({
  request,
  onAccept,
  onReject,
  acceptBusy,
}: Props) {
  const slideY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!request) return;

    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.16, duration: 520, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, pulse, request, slideY]);

  if (!request) return null;

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: 80, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onReject);
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={dismiss} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }], opacity }]}>
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulse }] }]}>
          <Ionicons name="person-add" size={42} color="#29E0FF" />
        </Animated.View>

        <Text style={styles.badge}>FRIEND REQUEST</Text>
        <Text style={styles.challenger} numberOfLines={1}>
          {request.fromName}
        </Text>
        <Text style={styles.sub}>wants to join your WordRush friends.</Text>

        <View style={styles.detailPill}>
          <Ionicons name="people-outline" size={14} color="#29E0FF" />
          <Text style={styles.detailText}>Play battles together</Text>
          <View style={styles.dot} />
          <Text style={styles.detailText}>Compare scores</Text>
        </View>

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
              <ActivityIndicator color="#04111A" size="small" />
            ) : (
              <Ionicons name="checkmark" size={20} color="#04111A" />
            )}
            <Text style={styles.acceptText}>
              {acceptBusy ? 'Adding...' : 'Accept'}
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
    backgroundColor: 'rgba(5,9,28,0.78)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(8,13,34,0.96)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(41,224,255,0.34)',
    padding: 24,
    paddingTop: 34,
    alignItems: 'center',
  },
  orb1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(41,224,255,0.14)',
    top: -60,
    left: -60,
  },
  orb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,77,141,0.13)',
    right: -48,
    bottom: -70,
  },
  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: 'rgba(41,224,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(41,224,255,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badge: {
    color: '#FFD23F',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  challenger: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
  sub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(41,224,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 18,
  },
  detailText: {
    color: '#29E0FF',
    fontSize: 12,
    fontWeight: '900',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 22,
  },
  declineBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,77,141,0.35)',
    backgroundColor: 'rgba(255,77,141,0.10)',
  },
  acceptBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#29E0FF',
  },
  btnBusy: {
    opacity: 0.72,
  },
  declineText: {
    color: '#FF4D8D',
    fontWeight: '900',
  },
  acceptText: {
    color: '#04111A',
    fontWeight: '900',
  },
});
