// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Game Loop
//  Reads GameConfig, manages state, never has
//  game-specific logic baked in.
// ─────────────────────────────────────────────

import { GameConfig, GameState, ResourceState } from '../types/engine';

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

    // Gather multipliers from purchased upgrades
    let multiplier = 1;
    for (const upgrade of config.upgrades) {
      if (!state.upgrades[upgrade.id]) continue;
      if (
        upgrade.effect.type === 'building_multiplier' &&
        upgrade.effect.targetId === building.id
      ) {
        multiplier *= upgrade.effect.multiplier ?? 1;
      }
      if (upgrade.effect.type === 'global_multiplier') {
        multiplier *= upgrade.effect.multiplier ?? 1;
      }
    }

    for (const [resourceId, baseRate] of Object.entries(building.baseProduction)) {
      rates[resourceId] = (rates[resourceId] ?? 0) + baseRate * count * multiplier;
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
    result[resourceId] = Math.floor(baseCost * Math.pow(building.costScaling, owned));
  }
  return result;
}

// ── Tick: advance state by deltaMs ─────────
export function tick(
  config: GameConfig,
  state: GameState,
  deltaMs: number
): GameState {
  const deltaSec = deltaMs / 1000;
  const rates = calculateProductionRates(config, state);
  const newResources = { ...state.resources };

  for (const resource of config.resources) {
    const earned = (rates[resource.id] ?? 0) * deltaSec;
    const current = newResources[resource.id] ?? 0;
    const cap = resource.cap === 'infinite' ? Infinity : resource.cap;
    newResources[resource.id] = Math.min(current + earned, cap);
  }

  return {
    ...state,
    resources: newResources,
    lastTickAt: Date.now(),
    totalPlaytimeMs: state.totalPlaytimeMs + deltaMs,
  };
}

// ── Offline earnings catch-up ───────────────
export function applyOfflineEarnings(
  config: GameConfig,
  state: GameState
): { newState: GameState; offlineMs: number } {
  const now = Date.now();
  const elapsed = now - state.lastTickAt;
  const maxOfflineMs = config.balance.maxOfflineHours * 3600 * 1000;
  const cappedElapsed = Math.min(elapsed, maxOfflineMs);
  const offlineElapsed = cappedElapsed * config.balance.offlineEarningsRate;

  const newState = tick(config, state, offlineElapsed);
  return { newState: { ...newState, lastTickAt: now }, offlineMs: cappedElapsed };
}

// ── Tap action ─────────────────────────────
export function handleTap(
  config: GameConfig,
  state: GameState
): GameState {
  const primaryResource = config.resources[0];
  if (!primaryResource) return state;

  let tapMultiplier = config.balance.tapProductionMultiplier;
  for (const upgrade of config.upgrades) {
    if (state.upgrades[upgrade.id] && upgrade.effect.type === 'tap_multiplier') {
      tapMultiplier *= upgrade.effect.multiplier ?? 1;
    }
  }

  const newResources = { ...state.resources };
  const cap = primaryResource.cap === 'infinite' ? Infinity : primaryResource.cap;
  newResources[primaryResource.id] = Math.min(
    (newResources[primaryResource.id] ?? 0) + tapMultiplier,
    cap
  );

  return { ...state, resources: newResources };
}

// ── Buy building ───────────────────────────
export function buyBuilding(
  config: GameConfig,
  state: GameState,
  buildingId: string
): GameState | null {
  const building = config.buildings.find(b => b.id === buildingId);
  if (!building) return null;

  const cost = getBuildingCost(config, state, buildingId);
  const newResources = { ...state.resources };

  // Check affordability
  for (const [resourceId, amount] of Object.entries(cost)) {
    if ((newResources[resourceId] ?? 0) < amount) return null;
  }

  // Deduct cost
  for (const [resourceId, amount] of Object.entries(cost)) {
    newResources[resourceId] -= amount;
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

// ── Buy upgrade ────────────────────────────
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
    newResources[resourceId] -= amount;
  }

  return {
    ...state,
    resources: newResources,
    upgrades: { ...state.upgrades, [upgradeId]: true },
  };
}

// ── Prestige ───────────────────────────────
export function canPrestige(config: GameConfig, state: GameState): boolean {
  if (!config.prestige.enabled) return false;
  const amount = state.resources[config.prestige.requiredResource] ?? 0;
  return amount >= config.prestige.requiredAmount;
}

export function applyPrestige(
  config: GameConfig,
  state: GameState
): GameState {
  const { prestige } = config;
  const earned = state.resources[prestige.requiredResource] ?? 0;
  const currency = Math.floor(
    Math.pow(earned / prestige.requiredAmount, prestige.formulaExponent) * 10
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
    prestige: {
      currency: state.prestige.currency + currency,
      totalPrestiges: state.prestige.totalPrestiges + 1,
      lifetimeEarnings: state.prestige.lifetimeEarnings,
    },
    lastSaveAt: Date.now(),
    lastTickAt: Date.now(),
    totalPlaytimeMs: state.totalPlaytimeMs,
  };
}

// ── Default state factory ───────────────────
export function createDefaultState(config: GameConfig): GameState {
  const resources: ResourceState = {};
  for (const r of config.resources) {
    resources[r.id] = r.startingValue;
  }
  return {
    resources,
    buildings: {},
    upgrades: {},
    prestige: { currency: 0, totalPrestiges: 0, lifetimeEarnings: {} },
    lastSaveAt: Date.now(),
    lastTickAt: Date.now(),
    totalPlaytimeMs: 0,
  };
}

// ── Number formatter for big numbers ───────
export function formatNumber(n: number): string {
  if (n < 1000) return n.toFixed(1);
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
  const i = Math.floor(Math.log10(n) / 3);
  const scaled = n / Math.pow(1000, i);
  return scaled.toFixed(2) + (suffixes[i] ?? 'e' + i * 3);
}
