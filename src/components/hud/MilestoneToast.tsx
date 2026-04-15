// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Milestone Toast
//  Lightweight notification for in-game moments
//  that don't warrant a full achievement popup
// ─────────────────────────────────────────────

import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { gameConfig } from '../../config/gameConfig';

const theme = gameConfig.theme;

export interface MilestoneEvent {
  id: string;
  icon: string;
  message: string;
}

interface Props {
  event: MilestoneEvent | null;
  onDismiss: () => void;
}

export function MilestoneToast({ event, onDismiss }: Props) {
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!event) return;
    translateY.value = withSpring(0, { damping: 14, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 180 });
    translateY.value = withDelay(2500, withTiming(80, { duration: 350 }));
    opacity.value = withDelay(2500, withTiming(0, { duration: 350 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    }));
  }, [event?.id]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!event) return null;

  return (
    <Animated.View style={[styles.toast, animStyle]} pointerEvents="none">
      <Text style={styles.icon}>{event.icon}</Text>
      <Text style={styles.message}>{event.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(30,20,40,0.92)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 998,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  icon: { fontSize: 20 },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textColor,
  },
});
