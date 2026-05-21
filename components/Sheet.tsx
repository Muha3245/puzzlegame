// components/Sheet.tsx

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GlassEffects } from '../constants/theme';

export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible?: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (visible === false) return null;
  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  sheet: {
    maxHeight: '88%',
    ...GlassEffects.strong,
    backgroundColor: 'rgba(13,5,0,0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
  },

  handle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    flex: 1,
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
});