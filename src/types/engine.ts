// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Core Types
//  These types are read by the engine. Never
//  modify this file per-fork — edit gameConfig.ts
// ─────────────────────────────────────────────

export interface ResourceDef {
  id: string;
  name: string;
  icon: string;           // emoji or asset key
  startingValue: number;
  cap: number | 'infinite';
  displayPrecision?: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseCost: Record<string, number>;   // resourceId → amount
  costScaling: number;                // e.g. 1.15 = 15% more expensive each purchase
  baseProduction: Record<string, number>; // resourceId → per-second
  unlockCondition?: {
    resourceId: string;
    amount: number;
  };
  maxCount?: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: Record<string, number>;
  effect: {
    type: 'building_multiplier' | 'global_multiplier' | 'unlock' | 'tap_multiplier';
    targetId?: string;    // buildingId for building_multiplier
    multiplier?: number;
  };
  unlockCondition?: {
    buildingId?: string;
    buildingCount?: number;
    resourceId?: string;
    resourceAmount?: number;
    upgradeId?: string;   // prerequisite upgrade
  };
}

export interface PrestigeConfig {
  enabled: boolean;
  requiredResource: string;
  requiredAmount: number;
  currencyName: string;       // e.g. "Stars", "Souls"
  currencyIcon: string;
  formulaExponent: number;    // prestige currency = (resource / threshold) ^ exponent
  persistedUpgrades?: string[]; // upgrade IDs that survive prestige
}

export interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  fontFamily?: string;
  buildingSprites?: Record<string, string>; // buildingId → image asset key
}

export interface BalanceConfig {
  tickRateMs: number;         // how often the engine ticks (e.g. 100)
  offlineEarningsRate: number; // fraction of online rate (0–1)
  maxOfflineHours: number;
  tapProductionMultiplier: number;
}

export interface RemoteConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  gameSlug: string;           // used to scope leaderboard + remote config rows
}

// ─── The full game config object ─────────────
export interface GameConfig {
  gameId: string;
  gameName: string;
  version: string;
  resources: ResourceDef[];
  buildings: BuildingDef[];
  upgrades: UpgradeDef[];
  prestige: PrestigeConfig;
  achievements: AchievementDef[];
  prestigeShop: PrestigeUpgradeDef[];
  theme: ThemeConfig;
  balance: BalanceConfig;
  remote: RemoteConfig;
}

// ─── Runtime state (managed by engine, not config) ───
export interface ResourceState {
  [resourceId: string]: number;
}

export interface BuildingState {
  [buildingId: string]: number; // count owned
}

export interface UpgradeState {
  [upgradeId: string]: boolean; // purchased?
}

export interface PrestigeState {
  currency: number;
  totalPrestiges: number;
  lifetimeEarnings: Record<string, number>;
}

export interface GameState {
  resources: ResourceState;
  buildings: BuildingState;
  upgrades: UpgradeState;
  prestige: PrestigeState;
  achievements: AchievementState;
  prestigeShop: PrestigeShopState;
  tapCount: number;
  lastSaveAt: number;
  lastTickAt: number;
  totalPlaytimeMs: number;
}

// ─── Achievements ─────────────────────────────
export type AchievementTrigger =
  | { type: 'resource_total'; resourceId: string; amount: number }
  | { type: 'building_count'; buildingId: string; count: number }
  | { type: 'upgrade_purchased'; upgradeId: string }
  | { type: 'prestige_count'; count: number }
  | { type: 'tap_count'; count: number };

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  trigger: AchievementTrigger;
  hidden?: boolean; // don't show until unlocked
}

export interface AchievementState {
  [achievementId: string]: {
    unlockedAt: number; // unix ms
  };
}

// ─── Prestige Shop ────────────────────────────
export interface PrestigeUpgradeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;             // prestige currency cost
  maxLevel: number;         // how many times purchasable (1 = one-time)
  effect: {
    type: 'global_multiplier' | 'offline_rate' | 'tap_multiplier' | 'start_resources';
    value: number;          // multiplier per level or flat bonus
  };
}

export interface PrestigeShopState {
  [upgradeId: string]: number; // level purchased
}
