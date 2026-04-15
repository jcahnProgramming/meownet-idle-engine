// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Offline Earnings Modal
// ─────────────────────────────────────────────

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { gameConfig } from '../../config/gameConfig';
import { formatNumber } from '../../engine/gameLoop';

const theme = gameConfig.theme;

interface OfflineEarnings {
  offlineMs: number;
  earned: Record<string, number>;
}

interface Props {
  earnings: OfflineEarnings | null;
  onCollect: () => void;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return 'a moment';
}

export function OfflineEarningsModal({ earnings, onCollect }: Props) {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (earnings) {
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [earnings]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!earnings) return null;

  const significantEarnings = Object.entries(earnings.earned).filter(
    ([, amt]) => amt >= 0.1
  );

  if (significantEarnings.length === 0) return null;

  return (
    <Modal transparent animationType="fade" visible={!!earnings}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Icon */}
          <Text style={styles.icon}>⏰</Text>

          {/* Title */}
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            You were away for {formatDuration(earnings.offlineMs)}
          </Text>

          {/* Earnings list */}
          <View style={styles.earningsList}>
            {significantEarnings.map(([resourceId, amount]) => {
              const resource = gameConfig.resources.find(r => r.id === resourceId);
              return (
                <View key={resourceId} style={styles.earningsRow}>
                  <Text style={styles.earningsIcon}>{resource?.icon}</Text>
                  <Text style={styles.earningsLabel}>{resource?.name}</Text>
                  <Text style={styles.earningsAmount}>+{formatNumber(amount)}</Text>
                </View>
              );
            })}
          </View>

          {/* Offline rate note */}
          <Text style={styles.rateNote}>
            Earned at {Math.round(gameConfig.balance.offlineEarningsRate * 100)}% offline rate
          </Text>

          {/* Collect button */}
          <TouchableOpacity style={styles.collectButton} onPress={onCollect}>
            <Text style={styles.collectText}>Collect!</Text>
          </TouchableOpacity>
        </Animated.View>
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
    padding: 32,
  },
  card: {
    width: '100%',
    backgroundColor: theme.surfaceColor,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  icon: { fontSize: 52, marginBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.textColor,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
  },
  earningsList: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  earningsIcon: { fontSize: 24, marginRight: 10 },
  earningsLabel: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.accentColor,
  },
  rateNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    marginBottom: 24,
  },
  collectButton: {
    width: '100%',
    height: 52,
    backgroundColor: theme.primaryColor,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primaryColor,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  collectText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
});
