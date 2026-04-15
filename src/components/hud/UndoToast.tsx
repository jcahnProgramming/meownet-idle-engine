// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Undo Toast
//  Slides up from bottom after a purchase.
//  Shows a 5s countdown bar and an Undo button.
// ─────────────────────────────────────────────

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming,
} from 'react-native-reanimated';
import { gameConfig } from '../../config/gameConfig';

const theme = gameConfig.theme;

interface Props {
  description: string | null;
  expiresAt: number | null;
  onUndo: () => void;
}

export function UndoToast({ description, expiresAt, onUndo }: Props) {
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);
  const progress = useSharedValue(1);

  useEffect(() => {
    if (!description || !expiresAt) {
      translateY.value = withTiming(80, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
      return;
    }
    translateY.value = withSpring(0, { damping: 14, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });
    progress.value = 1;
    const remaining = expiresAt - Date.now();
    progress.value = withTiming(0, { duration: remaining });
  }, [description, expiresAt]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  if (!description) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        <Text style={styles.label}>↩ Bought: {description}</Text>
        <TouchableOpacity style={styles.undoBtn} onPress={onUndo}>
          <Text style={styles.undoText}>Undo</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.progressBg}>
        <Animated.View style={[styles.progressFill, barStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 72,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(30,20,45,0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    zIndex: 997,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  label: { flex: 1, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  undoBtn: {
    backgroundColor: theme.primaryColor,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  undoText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.07)' },
  progressFill: { height: '100%', backgroundColor: theme.primaryColor },
});
