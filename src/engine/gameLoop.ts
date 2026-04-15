// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Game Loop
//  All arithmetic via bignum for precision
// ─────────────────────────────────────────────

import { GameConfig, GameState, ResourceState } from '../types/engine';
import { add, multiply, floor, pow, min } from './bignum';

export { formatNumber } from './bignum';

// ── Production rate calculator ─────────────
export function calculateProductionRates(
  config: GameConfig,
  state: GameState
): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const resource of config.resources) {
    rates[resource.id] = 0;
  }

  for (const building of config.buildings) {
    const count = state.buildings[building.id] ?? 0;
    if (count === 0) continue;

    let multiplier = 1;
    for (const upgrade of config.upgrades) {
      if (!state.upgrades[upgrade.id]) continue;
      if (
        upgrade.effect.type === 'building_multiplier' &&
        upgrade.effect.targetId === building.id
      ) {
        multiplier = multiply(multiplier, upgrade.effect.multiplier ?? 1);
      }
      if (upgrade.effect.type === 'global_multiplier') {
        multiplier = multiply(multiplier, upgrade.effect.multiplier ?? 1);
      }
    }

    // Apply prestige shop global multiplier
    const prestigeMults = getPrestigeMultipliers(config, state);
    multiplier = multiply(multiplier, prestigeMults.globalMultiplier);

    // Apply active daily challenge boost
    const now = Date.now();
    const boostMult = state.dailyChallenges?.activeBoosts
      ?.filter((b: any) => b.expiresAt > now)
      ?.reduce((acc: number, b: any) => acc * b.multiplier, 1) ?? 1;
    multiplier = multiply(multiplier, boostMult);

    for (const [resourceId, baseRate] of Object.entries(building.baseProduction)) {
      const contribution = multiply(multiply(baseRate, count), multiplier);
      rates[resourceId] = add(rates[resourceId] ?? 0, contribution);
    }
  }

  return rates;
}

// ── Cost for next purchase ──────────────────
export function getBuildingCost(
  config: GameConfig,
  state: GameState,
  buildingId: string
): Record<string, number> {
  const building = config.buildings.find(b => b.id === buildingId);
  if (!building) return {};
  const owned = state.buildings[buildingId] ?? 0;
  const result: Record<string, number> = {};
  for (const [resourceId, baseCost] of Object.entries(building.baseCost)) {
    result[resourceId] = floor(multiply(baseCost, pow(building.costScaling, owned)));
  }
  return result;
}

// ── How many can afford right now ──────────
export function getAffordableCount(
  config: GameConfig,
  state: GameState,
  buildingId: string,
  budget?: number
): number {
  const building = config.buildings.find(b => b.id === buildingId);
  if (!building) return 0;
  const primaryResource = config.resources[0];
  if (!primaryResource) return 0;
  const available = budget ?? (state.resources[primaryResource.id] ?? 0);
  const owned = state.buildings[buildingId] ?? 0;
  const baseCost = building.baseCost[primaryResource.id] ?? 0;
  const k = building.costScaling;

  // n = floor(log(available * (k-1) / baseCost / k^owned + 1) / log(k))
  if (baseCost === 0) return 0;
  const inner = (available * (k - 1)) / (baseCost * Math.pow(k, owned)) + 1;
  if (inner <= 0) return 0;
  return Math.max(0, Math.floor(Math.log(inner) / Math.log(k)));
}

// ── Tick ────────────────────────────────────
export function tick(
  config: GameConfig,
  state: GameState,
  deltaMs: number
): GameState {
  const deltaSec = deltaMs / 1000;
  const rates = calculateProductionRates(config, state);
  const newResources = { ...state.resources };

  for (const resource of config.resources) {
    const earned = multiply(rates[resource.id] ?? 0, deltaSec);
    const current = newResources[resource.id] ?? 0;
    const cap = resource.cap === 'infinite' ? Infinity : resource.cap;
    newResources[resource.id] = min(add(current, earned), cap);
  }

  return {
    ...state,
    resources: newResources,
    lastTickAt: Date.now(),
    totalPlaytimeMs: state.totalPlaytimeMs + deltaMs,
  };
}

// ── Offline earnings ────────────────────────
export function applyOfflineEarnings(
  config: GameConfig,
  state: GameState
): { newState: GameState; offlineMs: number } {
  const now = Date.now();
  const elapsed = now - state.lastTickAt;
  const maxOfflineMs = config.balance.maxOfflineHours * 3600 * 1000;
  const cappedElapsed = Math.min(elapsed, maxOfflineMs);
  const offlineElapsed = multiply(cappedElapsed, config.balance.offlineEarningsRate);
  const newState = tick(config, state, offlineElapsed);
  return { newState: { ...newState, lastTickAt: now }, offlineMs: cappedElapsed };
}

// ── Tap ─────────────────────────────────────
export function handleTap(
  config: GameConfig,
  state: GameState
): GameState {
  const primaryResource = config.resources[0];
  if (!primaryResource) return state;

  let tapMultiplier = config.balance.tapProductionMultiplier;
  for (const upgrade of config.upgrades) {
    if (state.upgrades[upgrade.id] && upgrade.effect.type === 'tap_multiplier') {
      tapMultiplier = multiply(tapMultiplier, upgrade.effect.multiplier ?? 1);
    }
  }

  const newResources = { ...state.resources };
  const cap = primaryResource.cap === 'infinite' ? Infinity : primaryResource.cap;
  newResources[primaryResource.id] = min(
    add(newResources[primaryResource.id] ?? 0, tapMultiplier),
    cap
  );

  return { ...state, resources: newResources };
}

// ── Buy building ────────────────────────────
export function buyBuilding(
  config: GameConfig,
  state: GameState,
  buildingId: string
): GameState | null {
  const building = config.buildings.find(b => b.id === buildingId);
  if (!building) return null;

  const cost = getBuildingCost(config, state, buildingId);
  const newResources = { ...state.resources };

  for (const [resourceId, amount] of Object.entries(cost)) {
    if ((newResources[resourceId] ?? 0) < amount) return null;
  }
  for (const [resourceId, amount] of Object.entries(cost)) {
    newResources[resourceId] = add(newResources[resourceId] ?? 0, -amount);
  }

  return {
    ...state,
    resources: newResources,
    buildings: {
      ...state.buildings,
      [buildingId]: (state.buildings[buildingId] ?? 0) + 1,
    },
  };
}

// ── Buy upgrade ─────────────────────────────
export function buyUpgrade(
  config: GameConfig,
  state: GameState,
  upgradeId: string
): GameState | null {
  const upgrade = config.upgrades.find(u => u.id === upgradeId);
  if (!upgrade || state.upgrades[upgradeId]) return null;

  const newResources = { ...state.resources };
  for (const [resourceId, amount] of Object.entries(upgrade.cost)) {
    if ((newResources[resourceId] ?? 0) < amount) return null;
    newResources[resourceId] = add(newResources[resourceId] ?? 0, -amount);
  }

  return {
    ...state,
    resources: newResources,
    upgrades: { ...state.upgrades, [upgradeId]: true },
  };
}

// ── Prestige ────────────────────────────────
export function canPrestige(config: GameConfig, state: GameState): boolean {
  if (!config.prestige.enabled) return false;
  return (state.resources[config.prestige.requiredResource] ?? 0) >= config.prestige.requiredAmount;
}

export function applyPrestige(config: GameConfig, state: GameState): GameState {
  const { prestige } = config;
  const earned = state.resources[prestige.requiredResource] ?? 0;
  const currency = floor(
    multiply(pow(earned / prestige.requiredAmount, prestige.formulaExponent), 10)
  );

  const persistedUpgradeIds = new Set(prestige.persistedUpgrades ?? []);
  const newUpgrades: Record<string, boolean> = {};
  for (const id of persistedUpgradeIds) {
    if (state.upgrades[id]) newUpgrades[id] = true;
  }

  const freshResources: ResourceState = {};
  for (const r of config.resources) {
    freshResources[r.id] = r.startingValue;
  }

  // Apply prestige shop start resource bonuses
  const mults = getPrestigeMultipliers(config, state);
  for (const [resourceId, bonus] of Object.entries(mults.startResources)) {
    freshResources[resourceId] = add(freshResources[resourceId] ?? 0, bonus);
  }

  return {
    resources: freshResources,
    buildings: {},
    upgrades: newUpgrades,
    achievements: state.achievements,
    prestigeShop: state.prestigeShop,
    dailyChallenges: state.dailyChallenges,
    tapCount: state.tapCount ?? 0,
    prestige: {
      currency: add(state.prestige.currency, currency),
      totalPrestiges: state.prestige.totalPrestiges + 1,
      lifetimeEarnings: state.prestige.lifetimeEarnings,
    },
    lastSaveAt: Date.now(),
    lastTickAt: Date.now(),
    totalPlaytimeMs: state.totalPlaytimeMs,
  };
}

// ── Default state ───────────────────────────
export function createDefaultState(config: GameConfig): GameState {
  const resources: ResourceState = {};
  for (const r of config.resources) {
    resources[r.id] = r.startingValue;
  }
  return {
    resources,
    buildings: {},
    upgrades: {},
    achievements: {},
    prestigeShop: {},
    dailyChallenges: {
      date: new Date().toISOString().slice(0, 10),
      progress: {},
      completed: {},
      activeBoosts: [],
    },
    tapCount: 0,
    prestige: { currency: 0, totalPrestiges: 0, lifetimeEarnings: {} },
    lastSaveAt: Date.now(),
    lastTickAt: Date.now(),
    totalPlaytimeMs: 0,
  };
}

// ── Bulk buy buildings ──────────────────────
export function buyBuildingBulk(
  config: GameConfig,
  state: GameState,
  buildingId: string,
  count: number | 'max'
): GameState | null {
  const building = config.buildings.find(b => b.id === buildingId);
  if (!building) return null;

  const affordable = getAffordableCount(config, state, buildingId);
  const toBuy = count === 'max' ? affordable : Math.min(count, affordable);
  if (toBuy <= 0) return null;

  const owned = state.buildings[buildingId] ?? 0;
  const newResources = { ...state.resources };

  // Deduct total cost for all purchases
  for (const [resourceId, baseCost] of Object.entries(building.baseCost)) {
    let totalCost = 0;
    for (let i = 0; i < toBuy; i++) {
      totalCost = add(totalCost, floor(multiply(baseCost, pow(building.costScaling, owned + i))));
    }
    if ((newResources[resourceId] ?? 0) < totalCost) return null;
    newResources[resourceId] = add(newResources[resourceId] ?? 0, -totalCost);
  }

  return {
    ...state,
    resources: newResources,
    buildings: {
      ...state.buildings,
      [buildingId]: owned + toBuy,
    },
  };
}

// ── Cost for bulk purchase ──────────────────
export function getBuildingBulkCost(
  config: GameConfig,
  state: GameState,
  buildingId: string,
  count: number | 'max'
): Record<string, number> {
  const building = config.buildings.find(b => b.id === buildingId);
  if (!building) return {};

  const affordable = getAffordableCount(config, state, buildingId);
  const toBuy = count === 'max' ? affordable : Math.min(count, affordable);
  const owned = state.buildings[buildingId] ?? 0;
  const result: Record<string, number> = {};

  for (const [resourceId, baseCost] of Object.entries(building.baseCost)) {
    let totalCost = 0;
    for (let i = 0; i < toBuy; i++) {
      totalCost = add(totalCost, floor(multiply(baseCost, pow(building.costScaling, owned + i))));
    }
    result[resourceId] = totalCost;
  }

  return result;
}

// ── Prestige shop ───────────────────────────
export function buyPrestigeUpgrade(
  config: GameConfig,
  state: GameState,
  upgradeId: string
): GameState | null {
  const upgrade = config.prestigeShop.find(u => u.id === upgradeId);
  if (!upgrade) return null;

  const currentLevel = state.prestigeShop[upgradeId] ?? 0;
  if (currentLevel >= upgrade.maxLevel) return null;

  if (state.prestige.currency < upgrade.cost) return null;

  return {
    ...state,
    prestige: {
      ...state.prestige,
      currency: add(state.prestige.currency, -upgrade.cost),
    },
    prestigeShop: {
      ...state.prestigeShop,
      [upgradeId]: currentLevel + 1,
    },
  };
}

export function getPrestigeMultipliers(config: GameConfig, state: GameState): {
  globalMultiplier: number;
  offlineRate: number;
  tapMultiplier: number;
  startResources: Record<string, number>;
} {
  let globalMultiplier = 1;
  let offlineRateBonus = 0;
  let tapMultiplier = 1;
  const startResources: Record<string, number> = {};

  for (const upgrade of config.prestigeShop) {
    const level = state.prestigeShop[upgrade.id] ?? 0;
    if (level === 0) continue;

    switch (upgrade.effect.type) {
      case 'global_multiplier':
        globalMultiplier = multiply(globalMultiplier, pow(upgrade.effect.value, level));
        break;
      case 'offline_rate':
        offlineRateBonus += upgrade.effect.value * level;
        break;
      case 'tap_multiplier':
        tapMultiplier = multiply(tapMultiplier, pow(upgrade.effect.value, level));
        break;
      case 'start_resources':
        if (config.resources[0]) {
          startResources[config.resources[0].id] =
            (startResources[config.resources[0].id] ?? 0) +
            upgrade.effect.value * level;
        }
        break;
    }
  }

  return {
    globalMultiplier,
    offlineRate: Math.min(1, config.balance.offlineEarningsRate + offlineRateBonus),
    tapMultiplier,
    startResources,
  };
}
