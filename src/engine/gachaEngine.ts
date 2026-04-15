// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Gacha / Loot Engine
//
//  Players spend prestige currency on loot packs.
//  Each pack contains N random rewards drawn from
//  a weighted pool defined in gameConfig.ts.
//
//  Reward types:
//  - resource_burst    instant resource bonus
//  - temp_multiplier   timed production boost
//  - prestige_refund   some currency back (rare)
//  - building_unlock   instant buildings added
// ─────────────────────────────────────────────

import { GameConfig, GameState } from '../types/engine';
import { add } from './bignum';

export type GachaRewardType =
  | 'resource_burst'
  | 'temp_multiplier'
  | 'prestige_refund'
  | 'building_unlock';

export interface GachaReward {
  type: GachaRewardType;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  label: string;
  resourceId?: string;
  amount?: number;
  buildingId?: string;
  durationMs?: number;
}

export interface GachaPack {
  id: string;
  name: string;
  icon: string;
  cost: number;           // prestige currency
  rollCount: number;      // how many rewards per pull
  description: string;
}

// ── Default packs ────────────────────────────
export const DEFAULT_PACKS: GachaPack[] = [
  {
    id: 'basic_pack',
    name: 'Basic Pack',
    icon: '📦',
    cost: 1,
    rollCount: 3,
    description: '3 random rewards',
  },
  {
    id: 'premium_pack',
    name: 'Premium Pack',
    icon: '💎',
    cost: 5,
    rollCount: 10,
    description: '10 rewards, better odds',
  },
];

// ── Weighted reward pool ─────────────────────
// weight = relative probability (higher = more common)
function buildRewardPool(config: GameConfig): Array<{ weight: number; reward: GachaReward }> {
  const primaryResource = config.resources[0];
  const pool: Array<{ weight: number; reward: GachaReward }> = [];

  if (primaryResource) {
    pool.push({
      weight: 40,
      reward: {
        type: 'resource_burst', rarity: 'common',
        icon: primaryResource.icon, label: `+1K ${primaryResource.name}`,
        resourceId: primaryResource.id, amount: 1000,
      },
    });
    pool.push({
      weight: 25,
      reward: {
        type: 'resource_burst', rarity: 'rare',
        icon: primaryResource.icon, label: `+10K ${primaryResource.name}`,
        resourceId: primaryResource.id, amount: 10000,
      },
    });
    pool.push({
      weight: 10,
      reward: {
        type: 'resource_burst', rarity: 'epic',
        icon: primaryResource.icon, label: `+100K ${primaryResource.name}`,
        resourceId: primaryResource.id, amount: 100000,
      },
    });
  }

  pool.push({
    weight: 15,
    reward: {
      type: 'temp_multiplier', rarity: 'rare',
      icon: '⚡', label: '×2 boost (15m)',
      amount: 2, durationMs: 15 * 60 * 1000,
    },
  });
  pool.push({
    weight: 5,
    reward: {
      type: 'temp_multiplier', rarity: 'epic',
      icon: '🔥', label: '×5 boost (10m)',
      amount: 5, durationMs: 10 * 60 * 1000,
    },
  });
  pool.push({
    weight: 4,
    reward: {
      type: 'prestige_refund', rarity: 'rare',
      icon: config.prestige.currencyIcon, label: `+1 ${config.prestige.currencyName}`,
      amount: 1,
    },
  });
  pool.push({
    weight: 1,
    reward: {
      type: 'prestige_refund', rarity: 'legendary',
      icon: '🌟', label: `+3 ${config.prestige.currencyName}`,
      amount: 3,
    },
  });

  // Add one building roll per building type
  for (const building of config.buildings.slice(0, 3)) {
    pool.push({
      weight: 8,
      reward: {
        type: 'building_unlock', rarity: 'common',
        icon: building.icon, label: `+1 ${building.name}`,
        buildingId: building.id, amount: 1,
      },
    });
  }

  return pool;
}

function weightedRandom<T>(items: Array<{ weight: number; reward: T }>): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.reward;
  }
  return items[items.length - 1].reward;
}

// ── Roll a pack ──────────────────────────────
export function rollGachaPack(
  config: GameConfig,
  state: GameState,
  packId: string
): { newState: GameState; rewards: GachaReward[] } | null {
  const pack = DEFAULT_PACKS.find(p => p.id === packId);
  if (!pack) return null;
  if (state.prestige.currency < pack.cost) return null;

  const pool = buildRewardPool(config);
  const rewards: GachaReward[] = [];
  let newState: GameState = {
    ...state,
    prestige: { ...state.prestige, currency: add(state.prestige.currency, -pack.cost) },
  };

  for (let i = 0; i < pack.rollCount; i++) {
    const reward = weightedRandom(pool);
    rewards.push(reward);

    switch (reward.type) {
      case 'resource_burst': {
        if (reward.resourceId && reward.amount) {
          newState = {
            ...newState,
            resources: {
              ...newState.resources,
              [reward.resourceId]: add(newState.resources[reward.resourceId] ?? 0, reward.amount),
            },
          };
        }
        break;
      }
      case 'temp_multiplier': {
        if (reward.amount && reward.durationMs) {
          newState = {
            ...newState,
            dailyChallenges: {
              ...newState.dailyChallenges,
              activeBoosts: [
                ...(newState.dailyChallenges?.activeBoosts ?? []),
                { multiplier: reward.amount, expiresAt: Date.now() + reward.durationMs },
              ],
            },
          };
        }
        break;
      }
      case 'prestige_refund': {
        if (reward.amount) {
          newState = {
            ...newState,
            prestige: { ...newState.prestige, currency: add(newState.prestige.currency, reward.amount) },
          };
        }
        break;
      }
      case 'building_unlock': {
        if (reward.buildingId && reward.amount) {
          newState = {
            ...newState,
            buildings: {
              ...newState.buildings,
              [reward.buildingId]: (newState.buildings[reward.buildingId] ?? 0) + reward.amount,
            },
          };
        }
        break;
      }
    }
  }

  return { newState, rewards };
}
