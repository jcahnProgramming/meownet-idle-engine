// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Daily Challenges Screen
// ─────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { gameConfig as defaultConfig, dailyChallenges as defaultChallenges } from '../config/gameConfig';
import { GameConfig, GameState, ChallengeDef } from '../types/engine';
import {
  getActiveChallenges,
  maybeResetChallenges,
  secondsUntilReset,
  getActiveBoostMultiplier,
} from '../engine/dailyChallengeEngine';
import { formatNumber } from '../engine/gameLoop';

const defaultTheme = defaultConfig.theme;

interface Props {
  config?: GameConfig;
  state: GameState;
  onClaim: (challengeId: string) => void;
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function rewardLabel(challenge: ChallengeDef, config: GameConfig): string {
  const { reward } = challenge;
  switch (reward.type) {
    case 'resource': {
      const res = config.resources.find(r => r.id === reward.resourceId);
      return `+${formatNumber(reward.amount)} ${res?.icon ?? ''}`;
    }
    case 'prestige_currency':
      return `+${reward.amount} ${config.prestige.currencyIcon}`;
    case 'multiplier_boost':
      return `×${reward.amount} boost (${Math.round((reward.durationMs ?? 0) / 60000)}m)`;
    default:
      return '';
  }
}

export default function DailyChallengesScreen({ config: configProp, state, onClaim }: Props) {
  const config = configProp ?? defaultConfig;
  const challenges = getActiveChallenges(config).length > 0
    ? getActiveChallenges(config)
    : defaultChallenges.slice(0, 3);

  const cs = maybeResetChallenges(state.dailyChallenges);
  const [countdown, setCountdown] = useState(secondsUntilReset());
  const boostMultiplier = getActiveBoostMultiplier(state);

  useEffect(() => {
    const t = setInterval(() => setCountdown(secondsUntilReset()), 1000);
    return () => clearInterval(t);
  }, []);

  const completedCount = challenges.filter(c => cs.completed[c.id]).length;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Daily Challenges</Text>
          <Text style={styles.subtitle}>Resets in {formatCountdown(countdown)}</Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>{completedCount}/{challenges.length}</Text>
        </View>
      </View>

      {/* Active boost */}
      {boostMultiplier > 1 && (
        <View style={styles.boostBanner}>
          <Text style={styles.boostText}>
            ⚡ Active Boost: ×{boostMultiplier} production
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {challenges.map(challenge => {
          const progress = cs.progress[challenge.id] ?? 0;
          const completed = !!cs.completed[challenge.id];
          const claimable = progress >= challenge.goalAmount && !completed;
          const pct = Math.min(1, progress / challenge.goalAmount);

          return (
            <View key={challenge.id} style={[styles.card, completed && styles.cardDone]}>
              {/* Icon + title row */}
              <View style={styles.cardTop}>
                <Text style={styles.cardIcon}>{challenge.icon}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{challenge.title}</Text>
                  <Text style={styles.cardDesc}>{challenge.description}</Text>
                </View>
                {completed && <Text style={styles.checkmark}>✅</Text>}
              </View>

              {/* Progress bar */}
              {!completed && (
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${pct * 100}%` as any }]} />
                </View>
              )}

              {/* Progress text + reward */}
              <View style={styles.cardBottom}>
                {!completed ? (
                  <Text style={styles.progressLabel}>
                    {formatNumber(Math.min(progress, challenge.goalAmount))} / {formatNumber(challenge.goalAmount)}
                  </Text>
                ) : (
                  <Text style={styles.completedLabel}>Completed!</Text>
                )}
                <Text style={styles.rewardLabel}>
                  🎁 {rewardLabel(challenge, config)}
                </Text>
              </View>

              {/* Claim button */}
              {claimable && (
                <TouchableOpacity
                  style={styles.claimButton}
                  onPress={() => onClaim(challenge.id)}
                >
                  <Text style={styles.claimText}>Claim Reward</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: defaultTheme.backgroundColor },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: { fontSize: 22, fontWeight: '800', color: defaultTheme.textColor },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  progressBadge: {
    backgroundColor: 'rgba(244,132,95,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: defaultTheme.primaryColor,
  },
  progressText: { fontSize: 15, fontWeight: '800', color: defaultTheme.primaryColor },
  boostBanner: {
    margin: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,209,102,0.12)',
    borderWidth: 1,
    borderColor: defaultTheme.accentColor,
    alignItems: 'center',
  },
  boostText: { fontSize: 13, fontWeight: '700', color: defaultTheme.accentColor },
  list: { padding: 12, gap: 12 },
  card: {
    backgroundColor: defaultTheme.surfaceColor,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  cardDone: { opacity: 0.6, borderColor: 'rgba(80,200,100,0.2)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { fontSize: 34, width: 44, textAlign: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: defaultTheme.textColor },
  cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  checkmark: { fontSize: 22 },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: defaultTheme.primaryColor,
    borderRadius: 3,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  completedLabel: { fontSize: 12, color: 'rgba(80,200,100,0.8)', fontWeight: '600' },
  rewardLabel: { fontSize: 12, fontWeight: '600', color: defaultTheme.accentColor },
  claimButton: {
    backgroundColor: defaultTheme.primaryColor,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: defaultTheme.primaryColor,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  claimText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
