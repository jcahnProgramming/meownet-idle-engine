// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Building Sprite
//  Animates the building icon based on count.
//  Thresholds: 1, 10, 25, 50, 100
//  At each threshold: scale pulse + glow burst.
//  Idle animation speed increases with count.
// ─────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
  withSpring, Easing,
} from 'react-native-reanimated';

interface Props {
  icon: string;
  count: number;
  size?: number;
}

// Thresholds where the building "levels up" visually
const LEVEL_THRESHOLDS = [1, 10, 25, 50, 100, 250, 500];

function getLevel(count: number): number {
  let level = 0;
  for (const t of LEVEL_THRESHOLDS) {
    if (count >= t) level++;
    else break;
  }
  return level;
}

// Idle bob speed increases with level
function getBobDuration(level: number): number {
  return Math.max(600, 2000 - level * 200);
}

// Glow intensity increases with level
function getGlowOpacity(level: number): number {
  return Math.min(0.8, level * 0.1);
}

export function BuildingSprite({ icon, count, size = 36 }: Props) {
  const level = getLevel(count);
  const prevLevelRef = useRef(level);

  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const glowOpacity = useSharedValue(getGlowOpacity(level));

  // Idle bob animation — speed based on level
  useEffect(() => {
    const duration = getBobDuration(level);
    translateY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [level]);

  // Level-up burst animation
  useEffect(() => {
    if (level > prevLevelRef.current) {
      prevLevelRef.current = level;
      scale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(getGlowOpacity(level), { duration: 600 })
      );
    }
  }, [level]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Emoji size scales slightly with level
  const fontSize = size + Math.min(level * 2, 12);

  return (
    <Animated.View style={styles.container}>
      {/* Glow halo */}
      <Animated.View style={[
        styles.glow,
        { width: fontSize * 2, height: fontSize * 2, borderRadius: fontSize },
        glowStyle,
      ]} />
      {/* Icon */}
      <Animated.Text style={[styles.icon, { fontSize }, iconStyle]}>
        {icon}
      </Animated.Text>
      {/* Level indicator dots for high levels */}
      {level >= 3 && (
        <Animated.View style={styles.levelDots}>
          {Array.from({ length: Math.min(level - 2, 5) }).map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                i < level - 2 ? styles.dotFilled : styles.dotEmpty,
              ]}
            />
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(255,209,102,0.15)',
  },
  icon: {
    textAlign: 'center',
  },
  levelDots: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotFilled: {
    backgroundColor: 'rgba(255,209,102,0.8)',
  },
  dotEmpty: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
