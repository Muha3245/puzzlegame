import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type DiffOption = {
  key: string;
  label: string;
  emoji: string;
  color: string;
  subtitle: string;
};

const DIFFICULTIES: DiffOption[] = [
  { key: 'easy',   label: 'Easy',   emoji: '🌱', color: '#4CC38A', subtitle: 'Great for warm-up rounds' },
  { key: 'medium', label: 'Medium', emoji: '⚡', color: '#5B9BFF', subtitle: 'Balanced challenge' },
  { key: 'hard',   label: 'Hard',   emoji: '🔥', color: '#FF9F43', subtitle: 'For skilled players' },
  { key: 'pro',    label: 'Pro',    emoji: '💀', color: '#E94B8C', subtitle: 'Expert-only challenge' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (difficulty: string) => Promise<void>;
};

export function DifficultyPickerModal({ visible, onClose, onSelect }: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const scaleAnims = useRef(DIFFICULTIES.map(() => new Animated.Value(1))).current;

  const handlePress = async (diff: DiffOption, idx: number) => {
    if (busyKey) return;
    setBusyKey(diff.key);
    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnims[idx], { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
    ]).start();
    try {
      await onSelect(diff.key);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose Difficulty</Text>
            <Pressable onPress={onClose} disabled={!!busyKey} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            A random level from that difficulty will be picked for both players
          </Text>
          <View style={styles.grid}>
            {DIFFICULTIES.map((diff, idx) => (
              <Animated.View
                key={diff.key}
                style={[styles.btnWrap, { transform: [{ scale: scaleAnims[idx] }] }]}
              >
                <Pressable
                  onPress={() => handlePress(diff, idx)}
                  disabled={!!busyKey}
                  style={[
                    styles.btn,
                    { backgroundColor: diff.color, shadowColor: diff.color },
                    !!busyKey && busyKey !== diff.key && styles.btnDimmed,
                  ]}
                >
                  {busyKey === diff.key ? (
                    <ActivityIndicator color="#fff" size="large" />
                  ) : (
                    <>
                      <Text style={styles.emoji}>{diff.emoji}</Text>
                      <Text style={styles.label}>{diff.label}</Text>
                      <Text style={styles.sub}>{diff.subtitle}</Text>
                    </>
                  )}
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#1A0A00',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,120,0,0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  btnWrap: { width: '47%' },
  btn: {
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  btnDimmed: { opacity: 0.45 },
  emoji: { fontSize: 32, marginBottom: 8 },
  label: { color: '#fff', fontSize: 17, fontWeight: '900', marginBottom: 4 },
  sub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
