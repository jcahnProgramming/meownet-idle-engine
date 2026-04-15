// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Achievement Toast
// ─────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { AchievementDef } from '../../types/engine';
import { gameConfig } from '../../config/gameConfig';

const theme = gameConfig.theme;

interface Props {
  achievement: AchievementDef | null;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: Props) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!achievement) return;

    // Slide in
    translateY.value = withSpring(0, { damping: 14, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });

    // Slide out after 3s
    translateY.value = withDelay(3000, withTiming(-100, { duration: 400 }));
    opacity.value = withDelay(3000, withTiming(0, { duration: 400 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    }));
  }, [achievement?.id]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!achievement) return null;

  return (
    <Animated.View style={[styles.toast, animStyle]} pointerEvents="none">
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{achievement.icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Achievement Unlocked!</Text>
        <Text style={styles.name}>{achievement.name}</Text>
        <Text style={styles.desc} numberOfLines={1}>{achievement.description}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceColor,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.accentColor,
    zIndex: 999,
    shadowColor: theme.accentColor,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,209,102,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 28 },
  body: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.accentColor,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textColor,
  },
  desc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 1,
  },
});
