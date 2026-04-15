// ─────────────────────────────────────────────
//  MeowNet Idle Engine — HUD Component
//  Animated resource counters + production rate
// ─────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { gameConfig } from '../../config/gameConfig';
import { GameState } from '../../types/engine';
import { formatNumber } from '../../engine/gameLoop';

const theme = gameConfig.theme;

interface Props {
  state: GameState;
  productionRates: Record<string, number>;
}

function AnimatedNumber({ value, style }: { value: number; style?: object }) {
  const displayRef = useRef(value);
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState(formatNumber(value));

  useEffect(() => {
    const from = displayRef.current;
    const to = value;
    displayRef.current = value;

    // Only animate small jumps (taps); let ticks update directly for perf
    if (Math.abs(to - from) / Math.max(from, 1) > 0.01) {
      setDisplay(formatNumber(to));
      return;
    }

    animVal.setValue(from);
    const listener = animVal.addListener(({ value: v }) => {
      setDisplay(formatNumber(v));
    });
    Animated.timing(animVal, {
      toValue: to,
      duration: 80,
      useNativeDriver: false,
    }).start(() => animVal.removeListener(listener));
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

export function HUD({ state, productionRates }: Props) {
  const primary = gameConfig.resources[0];
  const secondaries = gameConfig.resources.slice(1);

  return (
    <View style={styles.root}>
      {/* Primary resource — big and centered */}
      <View style={styles.primaryRow}>
        <Text style={styles.primaryIcon}>{primary?.icon}</Text>
        <View>
          <Text style={styles.primaryLabel}>{primary?.name}</Text>
          <AnimatedNumber
            value={state.resources[primary?.id ?? ''] ?? 0}
            style={styles.primaryValue}
          />
          <Text style={styles.primaryRate}>
            +{formatNumber(productionRates[primary?.id ?? ''] ?? 0)}/s
          </Text>
        </View>

        {/* Prestige currency */}
        {gameConfig.prestige.enabled && (
          <View style={styles.prestigeBadge}>
            <Text style={styles.prestigeIcon}>{gameConfig.prestige.currencyIcon}</Text>
            <Text style={styles.prestigeValue}>
              {formatNumber(state.prestige.currency)}
            </Text>
            <Text style={styles.prestigeLabel}>{gameConfig.prestige.currencyName}</Text>
          </View>
        )}
      </View>

      {/* Secondary resources */}
      {secondaries.length > 0 && (
        <View style={styles.secondaryRow}>
          {secondaries.map(r => {
            const amount = state.resources[r.id] ?? 0;
            const cap = r.cap !== 'infinite' ? r.cap : null;
            return (
              <View key={r.id} style={styles.secondaryChip}>
                <Text style={styles.secondaryIcon}>{r.icon}</Text>
                <Text style={styles.secondaryText}>
                  {formatNumber(amount)}
                  {cap ? ` / ${formatNumber(cap)}` : ''}
                </Text>
                {(productionRates[r.id] ?? 0) > 0 && (
                  <Text style={styles.secondaryRate}>
                    +{formatNumber(productionRates[r.id])}/s
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.surfaceColor,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryIcon: { fontSize: 40 },
  primaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  primaryValue: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.textColor,
    lineHeight: 36,
  },
  primaryRate: {
    fontSize: 13,
    color: theme.accentColor,
    marginTop: 1,
  },
  prestigeBadge: {
    marginLeft: 'auto' as any,
    alignItems: 'flex-end',
  },
  prestigeIcon: { fontSize: 22 },
  prestigeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.accentColor,
  },
  prestigeLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  secondaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  secondaryIcon: { fontSize: 14 },
  secondaryText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
  secondaryRate: {
    fontSize: 11,
    color: theme.accentColor,
    marginLeft: 2,
  },
});
