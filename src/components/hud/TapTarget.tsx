// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Tap Particles
//  Skia-rendered burst of +1 floaters on tap
// ─────────────────────────────────────────────

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { gameConfig } from '../../config/gameConfig';
import { formatNumber } from '../../engine/gameLoop';

const theme = gameConfig.theme;

interface Particle {
  id: number;
  x: number;
  y: number;
}

interface FloaterProps {
  particle: Particle;
  label: string;
  onDone: (id: number) => void;
}

function Floater({ particle, label, onDone }: FloaterProps) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withTiming(-80, { duration: 900 });
    opacity.value = withTiming(0, { duration: 900 }, finished => {
      if (finished) runOnJS(onDone)(particle.id);
    });
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    position: 'absolute',
    left: particle.x - 20,
    top: particle.y - 20,
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      <Animated.Text style={styles.floaterText}>{label}</Animated.Text>
    </Animated.View>
  );
}

interface Props {
  onTap: () => void;
  tapMultiplier?: number;
  children: React.ReactNode;
}

let _nextId = 0;

export function TapTarget({ onTap, tapMultiplier = 1, children }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback((evt: any) => {
    onTap();

    // Spring the button
    scale.value = withSequence(withSpring(0.88, { damping: 6 }), withSpring(1, { damping: 8 }));

    // Spawn a floater near the tap location
    const { locationX, locationY } = evt.nativeEvent;
    const jitter = () => (Math.random() - 0.5) * 30;
    const id = _nextId++;
    setParticles(p => [
      ...p,
      { id, x: locationX + jitter(), y: locationY + jitter() },
    ]);
  }, [onTap]);

  const removeParticle = useCallback((id: number) => {
    setParticles(p => p.filter(x => x.id !== id));
  }, []);

  const label = `+${formatNumber(tapMultiplier)}`;

  return (
    <View style={styles.wrapper}>
      <Animated.View style={animStyle}>
        <Pressable onPress={handlePress}>
          {children}
        </Pressable>
      </Animated.View>

      {particles.map(p => (
        <Floater
          key={p.id}
          particle={p}
          label={label}
          onDone={removeParticle}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floaterText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.accentColor,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
