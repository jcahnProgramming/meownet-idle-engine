// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Daily Challenge Engine
//
//  Challenges reset at midnight each day.
//  Progress is tracked in GameState so it
//  persists across app restarts.
//  Rewards are applied instantly on claim.
// ─────────────────────────────────────────────

import {
  GameConfig, GameState, ChallengeDef,
  DailyChallengeState,
} from '../types/engine';
import { add } from './bignum';

// ── Date helpers ────────────────────────────
export function todayString(): string {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

export function getDefaultChallengeState(): DailyChallengeState {
  return {
    date: todayString(),
    progress: {},
    completed: {},
    activeBoosts: [],
  };
}

// ── Reset if day has changed ────────────────
export function maybeResetChallenges(state: DailyChallengeState): DailyChallengeState {
  const today = todayString();
  if (state.date === today) return state;
  return { ...getDefaultChallengeState(), date: today };
}

// ── Get active challenges for today ─────────
export function getActiveChallenges(config: GameConfig): ChallengeDef[] {
  const challenges = config.dailyChallenges.length > 0
    ? config.dailyChallenges
    : [];

  // Pick 3 deterministically based on day-of-year so all players get same challenges
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const shuffled = [...challenges].sort((a, b) =>
    (((a.id.charCodeAt(0) * 31 + dayOfYear) % 97)) -
    (((b.id.charCodeAt(0) * 31 + dayOfYear) % 97))
  );
  return shuffled.slice(0, 3);
}

// ── Update progress on state changes ────────
export function updateChallengeProgress(
  config: GameConfig,
  state: GameState,
  prev: GameState,
  eventType: 'tap' | 'building_purchased' | 'upgrade_purchased' | 'prestige' | 'resource_delta',
  extra?: { resourceId?: string; amount?: number }
): DailyChallengeState {
  const challenges = getActiveChallenges(config);
  let cs = maybeResetChallenges(state.dailyChallenges);
  const progress = { ...cs.progress };

  for (const challenge of challenges) {
    if (cs.completed[challenge.id]) continue;

    let delta = 0;

    switch (challenge.goalType) {
      case 'tap_count':
        if (eventType === 'tap') delta = 1;
        break;
      case 'buildings_purchased':
        if (eventType === 'building_purchased') delta = extra?.amount ?? 1;
        break;
      case 'upgrades_purchased':
        if (eventType === 'upgrade_purchased') delta = 1;
        break;
      case 'prestige':
        if (eventType === 'prestige') delta = 1;
        break;
      case 'resource_earned':
        if (eventType === 'resource_delta' &&
          extra?.resourceId === challenge.resourceId &&
          (extra?.amount ?? 0) > 0) {
          delta = extra?.amount ?? 0;
        }
        break;
      case 'spend_resource':
        if (eventType === 'resource_delta' &&
          extra?.resourceId === challenge.resourceId &&
          (extra?.amount ?? 0) < 0) {
          delta = Math.abs(extra?.amount ?? 0);
        }
        break;
    }

    if (delta > 0) {
      progress[challenge.id] = (progress[challenge.id] ?? 0) + delta;
    }
  }

  return { ...cs, progress };
}

// ── Claim reward ────────────────────────────
export function claimChallengeReward(
  config: GameConfig,
  state: GameState,
  challengeId: string
): GameState | null {
  const challenges = getActiveChallenges(config);
  const challenge = challenges.find(c => c.id === challengeId);
  if (!challenge) return null;

  const cs = state.dailyChallenges;
  const progress = cs.progress[challengeId] ?? 0;
  if (progress < challenge.goalAmount) return null;
  if (cs.completed[challengeId]) return null;

  let newState = {
    ...state,
    dailyChallenges: {
      ...cs,
      completed: { ...cs.completed, [challengeId]: true },
    },
  };

  // Apply reward
  const { reward } = challenge;
  switch (reward.type) {
    case 'resource': {
      const rid = reward.resourceId ?? config.resources[0]?.id;
      if (rid) {
        newState = {
          ...newState,
          resources: {
            ...newState.resources,
            [rid]: add(newState.resources[rid] ?? 0, reward.amount),
          },
        };
      }
      break;
    }
    case 'prestige_currency': {
      newState = {
        ...newState,
        prestige: {
          ...newState.prestige,
          currency: add(newState.prestige.currency, reward.amount),
        },
      };
      break;
    }
    case 'multiplier_boost': {
      newState = {
        ...newState,
        dailyChallenges: {
          ...newState.dailyChallenges,
          activeBoosts: [
            ...newState.dailyChallenges.activeBoosts,
            {
              multiplier: reward.amount,
              expiresAt: Date.now() + (reward.durationMs ?? 30 * 60 * 1000),
            },
          ],
        },
      };
      break;
    }
  }

  return newState;
}

// ── Get active boost multiplier ──────────────
export function getActiveBoostMultiplier(state: GameState): number {
  const now = Date.now();
  return state.dailyChallenges.activeBoosts
    .filter(b => b.expiresAt > now)
    .reduce((acc, b) => acc * b.multiplier, 1);
}

// ── Seconds until midnight ───────────────────
export function secondsUntilReset(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}
