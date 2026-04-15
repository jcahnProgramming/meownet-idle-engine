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

  return {
    resources: freshResources,
    buildings: {},
    upgrades: newUpgrades,
    achievements: state.achievements,
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
    tapCount: 0,
    prestige: { currency: 0, totalPrestiges: 0, lifetimeEarnings: {} },
    lastSaveAt: Date.now(),
    lastTickAt: Date.now(),
    totalPlaytimeMs: 0,
  };
}
