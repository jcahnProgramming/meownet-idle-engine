// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Remote Config
//  Fetches live balance overrides from Supabase
//  and deep-merges them into the local gameConfig.
//
//  Supported overrides (anything in config_json):
//  - balance: { tickRateMs, offlineEarningsRate, ... }
//  - buildings: [{ id, baseCost, costScaling, baseProduction }]
//  - upgrades: [{ id, cost, effect }]
//  - prestige: { requiredAmount, formulaExponent }
//
//  Example Supabase row (idle_remote_config):
//  {
//    "balance": { "offlineEarningsRate": 0.75 },
//    "buildings": [{ "id": "cat", "baseProduction": { "cookies": 0.2 } }]
//  }
// ─────────────────────────────────────────────

import { GameConfig } from '../types/engine';
import { fetchRemoteConfig } from './saveManager';

export async function loadRemoteConfig(config: GameConfig): Promise<GameConfig> {
  try {
    const remote = await fetchRemoteConfig(config);
    if (!remote || Object.keys(remote).length === 0) return config;

    let merged = { ...config };

    // Merge balance overrides
    if ((remote as any).balance) {
      merged = {
        ...merged,
        balance: { ...merged.balance, ...(remote as any).balance },
      };
    }

    // Merge prestige overrides
    if ((remote as any).prestige) {
      merged = {
        ...merged,
        prestige: { ...merged.prestige, ...(remote as any).prestige },
      };
    }

    // Merge theme overrides
    if ((remote as any).theme) {
      merged = {
        ...merged,
        theme: { ...merged.theme, ...(remote as any).theme },
      };
    }

    // Merge building overrides (patch by id)
    if (Array.isArray((remote as any).buildings)) {
      merged = {
        ...merged,
        buildings: merged.buildings.map(building => {
          const override = (remote as any).buildings.find(
            (b: any) => b.id === building.id
          );
          if (!override) return building;
          return {
            ...building,
            ...(override.baseCost && { baseCost: { ...building.baseCost, ...override.baseCost } }),
            ...(override.costScaling && { costScaling: override.costScaling }),
            ...(override.baseProduction && {
              baseProduction: { ...building.baseProduction, ...override.baseProduction },
            }),
            ...(override.unlockCondition && { unlockCondition: override.unlockCondition }),
          };
        }),
      };
    }

    // Merge upgrade overrides (patch by id)
    if (Array.isArray((remote as any).upgrades)) {
      merged = {
        ...merged,
        upgrades: merged.upgrades.map(upgrade => {
          const override = (remote as any).upgrades.find(
            (u: any) => u.id === upgrade.id
          );
          if (!override) return upgrade;
          return {
            ...upgrade,
            ...(override.cost && { cost: { ...upgrade.cost, ...override.cost } }),
            ...(override.effect && { effect: { ...upgrade.effect, ...override.effect } }),
          };
        }),
      };
    }

    console.log('[RemoteConfig] Applied overrides:', Object.keys(remote));
    return merged;

  } catch (e) {
    // Never crash if remote config fails — just use local config
    console.warn('[RemoteConfig] Failed to load, using local config:', e);
    return config;
  }
}
