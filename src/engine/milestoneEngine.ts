// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Milestone Engine
//  Fires one-time toast notifications at key
//  moments: production thresholds, first buys,
//  upgrade combos, prestige milestones, etc.
//  Stored in AsyncStorage so they fire only once.
// ─────────────────────────────────────────────

import { GameConfig, GameState } from '../types/engine';
import { MilestoneEvent } from '../components/hud/MilestoneToast';

interface MilestoneDef {
  id: string;
  icon: string;
  message: string;
  check: (state: GameState, prev: GameState, config: GameConfig) => boolean;
}

const MILESTONES: MilestoneDef[] = [
  {
    id: 'first_building',
    icon: '🏗',
    message: 'First building purchased!',
    check: (state, prev) =>
      Object.values(state.buildings).some(v => v > 0) &&
      !Object.values(prev.buildings).some(v => v > 0),
  },
  {
    id: 'first_upgrade',
    icon: '⚡',
    message: 'First upgrade purchased!',
    check: (state, prev) =>
      Object.values(state.upgrades).some(Boolean) &&
      !Object.values(prev.upgrades).some(Boolean),
  },
  {
    id: 'ten_buildings',
    icon: '🏙',
    message: '10 total buildings!',
    check: (state, prev) => {
      const total = Object.values(state.buildings).reduce((a, b) => a + b, 0);
      const prevTotal = Object.values(prev.buildings).reduce((a, b) => a + b, 0);
      return total >= 10 && prevTotal < 10;
    },
  },
  {
    id: 'production_1ps',
    icon: '📈',
    message: 'Producing 1/sec!',
    check: (state, prev, config) => {
      const rid = config.resources[0]?.id;
      if (!rid) return false;
      const rate = (state.resources[rid] ?? 0) - (prev.resources[rid] ?? 0);
      return rate >= 1 && ((prev.resources[rid] ?? 0) - (state.resources[rid] ?? 0)) < 1;
    },
  },
  {
    id: 'prestige_shop_first',
    icon: '🌟',
    message: 'First prestige upgrade!',
    check: (state, prev) =>
      Object.values(state.prestigeShop).some(v => v > 0) &&
      !Object.values(prev.prestigeShop).some(v => v > 0),
  },
  {
    id: 'prestige_second',
    icon: '✨',
    message: 'Prestige #2 — you\'re a pro!',
    check: (state, prev) =>
      state.prestige.totalPrestiges >= 2 && prev.prestige.totalPrestiges < 2,
  },
  {
    id: 'tap_1000',
    icon: '👆',
    message: '1,000 taps! Dedicated tapper!',
    check: (state, prev) =>
      (state.tapCount ?? 0) >= 1000 && (prev.tapCount ?? 0) < 1000,
  },
  {
    id: 'all_upgrades',
    icon: '💎',
    message: 'All upgrades purchased!',
    check: (state, _prev, config) =>
      config.upgrades.length > 0 &&
      config.upgrades.every(u => !!state.upgrades[u.id]),
  },
];

export function checkMilestones(
  config: GameConfig,
  state: GameState,
  prev: GameState,
  fired: Set<string>
): MilestoneEvent[] {
  const triggered: MilestoneEvent[] = [];
  for (const m of MILESTONES) {
    if (fired.has(m.id)) continue;
    try {
      if (m.check(state, prev, config)) {
        triggered.push({ id: m.id, icon: m.icon, message: m.message });
        fired.add(m.id);
      }
    } catch {}
  }
  return triggered;
}
