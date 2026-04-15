// ─────────────────────────────────────────────
//  MeowNet Idle Engine — useGameEngine hook
// ─────────────────────────────────────────────

import { useEffect, useRef, useCallback, useReducer, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { GameConfig, GameState, ResourceState, AchievementDef } from '../types/engine';
import {
  tick,
  applyOfflineEarnings,
  handleTap,
  buyBuilding,
  buyBuildingBulk,
  buyUpgrade,
  buyPrestigeUpgrade,
  applyPrestige,
  canPrestige,
  createDefaultState,
  calculateProductionRates,
  getBuildingCost,
  getBuildingBulkCost,
} from '../engine/gameLoop';
import { checkAchievements, applyAchievements } from '../engine/achievementEngine';
import { checkMilestones } from '../engine/milestoneEngine';
import { updateChallengeProgress, claimChallengeReward, maybeResetChallenges } from '../engine/dailyChallengeEngine';
import { pushUndoSnapshot, consumeUndo, getUndoEntry } from '../engine/undoEngine';
import { rollGachaPack, GachaReward } from '../engine/gachaEngine';
import { MilestoneEvent } from '../components/hud/MilestoneToast';
import { saveLocal, loadLocal, syncToCloud } from '../engine/saveManager';
import { achievements as defaultAchievements } from '../config/gameConfig';

export interface OfflineEarnings {
  offlineMs: number;
  earned: Record<string, number>;
}

type Action =
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'TAP' }
  | { type: 'BUY_BUILDING'; buildingId: string }
  | { type: 'BUY_BUILDING_BULK'; buildingId: string; count: number | 'max' }
  | { type: 'BUY_UPGRADE'; upgradeId: string }
  | { type: 'BUY_PRESTIGE_UPGRADE'; upgradeId: string }
  | { type: 'CLAIM_CHALLENGE'; challengeId: string }
  | { type: 'ROLL_GACHA'; packId: string }
  | { type: 'UNDO' }
  | { type: 'PRESTIGE' };

function reducer(config: GameConfig, achievements: AchievementDef[]) {
  return (state: GameState, action: Action): GameState => {
    let next: GameState;
    switch (action.type) {
      case 'SET_STATE': return action.state;
      case 'TICK': next = tick(config, state, action.deltaMs); break;
      case 'TAP': {
        const tapped = { ...handleTap(config, state), tapCount: (state.tapCount ?? 0) + 1 };
        const cs = updateChallengeProgress(config, tapped, state, 'tap');
        next = { ...tapped, dailyChallenges: cs };
        break;
      }
      case 'BUY_BUILDING': {
        pushUndoSnapshot(state, `${config.buildings.find(b => b.id === action.buildingId)?.name ?? 'Building'} ×1`);
        const bought = buyBuilding(config, state, action.buildingId) ?? state;
        const cs = updateChallengeProgress(config, bought, state, 'building_purchased', { amount: 1 });
        next = { ...bought, dailyChallenges: cs };
        break;
      }
      case 'BUY_BUILDING_BULK': {
        const bname = config.buildings.find(b => b.id === action.buildingId)?.name ?? 'Building';
        pushUndoSnapshot(state, `${bname} ×${action.count}`);
        const bought = buyBuildingBulk(config, state, action.buildingId, action.count) ?? state;
        const prevCount = state.buildings[action.buildingId] ?? 0;
        const newCount = bought.buildings[action.buildingId] ?? 0;
        const cs = updateChallengeProgress(config, bought, state, 'building_purchased', { amount: newCount - prevCount });
        next = { ...bought, dailyChallenges: cs };
        break;
      }
      case 'BUY_UPGRADE': {
        pushUndoSnapshot(state, `${config.upgrades.find(u => u.id === action.upgradeId)?.name ?? 'Upgrade'}`);
        const upgraded = buyUpgrade(config, state, action.upgradeId) ?? state;
        const cs = updateChallengeProgress(config, upgraded, state, 'upgrade_purchased');
        next = { ...upgraded, dailyChallenges: cs };
        break;
      }
      case 'UNDO': next = consumeUndo() ?? state; break;
      case 'BUY_PRESTIGE_UPGRADE': next = buyPrestigeUpgrade(config, state, action.upgradeId) ?? state; break;
      case 'CLAIM_CHALLENGE': next = claimChallengeReward(config, state, action.challengeId) ?? state; break;
      case 'ROLL_GACHA': next = rollGachaPack(config, state, action.packId)?.newState ?? state; break;
      case 'PRESTIGE': {
        const prestiged = canPrestige(config, state) ? applyPrestige(config, state) : state;
        const cs = updateChallengeProgress(config, prestiged, state, 'prestige');
        next = { ...prestiged, dailyChallenges: cs };
        break;
      }
      default: return state;
    }
    // Check achievements after every state change
    const newlyUnlocked = checkAchievements(achievements, next, state);
    return applyAchievements(next, newlyUnlocked);
  };
}

function diffResources(before: ResourceState, after: ResourceState): Record<string, number> {
  const diff: Record<string, number> = {};
  for (const key of Object.keys(after)) {
    const delta = (after[key] ?? 0) - (before[key] ?? 0);
    if (delta > 0) diff[key] = delta;
  }
  return diff;
}

interface UseGameEngineOptions {
  config: GameConfig;
  userId?: string;
  autoSaveIntervalMs?: number;
}

export function useGameEngine({
  config,
  userId,
  autoSaveIntervalMs = 10_000,
}: UseGameEngineOptions) {
  const [loaded, setLoaded] = useState(false);
  const [pendingOfflineEarnings, setPendingOfflineEarnings] = useState<OfflineEarnings | null>(null);
  const [pendingAchievement, setPendingAchievement] = useState<AchievementDef | null>(null);
  const [pendingMilestone, setPendingMilestone] = useState<MilestoneEvent | null>(null);
  const achievementQueue = useRef<AchievementDef[]>([]);
  const milestoneQueue = useRef<MilestoneEvent[]>([]);
  const firedMilestones = useRef<Set<string>>(new Set());

  const [state, dispatch] = useReducer(
    reducer(config, defaultAchievements),
    createDefaultState(config)
  );

  const stateRef = useRef(state);
  const prevStateRef = useRef(state);

  // Detect newly unlocked achievements by watching state
  useEffect(() => {
    const prev = prevStateRef.current;
    const curr = state;
    prevStateRef.current = curr;

    // Check milestones
    const newMilestones = checkMilestones(config, curr, prev, firedMilestones.current);
    for (const m of newMilestones) milestoneQueue.current.push(m);
    if (!pendingMilestone && milestoneQueue.current.length > 0) {
      setPendingMilestone(milestoneQueue.current.shift()!);
    }

    // Find achievements unlocked in this state that weren't before
    for (const a of defaultAchievements) {
      if (curr.achievements[a.id] && !prev.achievements[a.id]) {
        achievementQueue.current.push(a);
      }
    }

    // Show next in queue if nothing showing
    if (!pendingAchievement && achievementQueue.current.length > 0) {
      setPendingAchievement(achievementQueue.current.shift()!);
    }
  }, [state]);

  stateRef.current = state;

  // Load saved state on mount
  useEffect(() => {
    loadLocal(config).then(saved => {
      if (saved) {
        // Migrate old saves that predate achievements
        const migrated = {
          ...saved,
          achievements: saved.achievements ?? {},
          prestigeShop: saved.prestigeShop ?? {},
          dailyChallenges: saved.dailyChallenges ?? {
            date: new Date().toISOString().slice(0, 10),
            progress: {}, completed: {}, activeBoosts: [],
          },
          tapCount: saved.tapCount ?? 0,
        };
        const before = migrated.resources;
        const { newState, offlineMs } = applyOfflineEarnings(config, migrated);
        const earned = diffResources(before, newState.resources);
        dispatch({ type: 'SET_STATE', state: newState });
        if (offlineMs > 60_000 && Object.keys(earned).length > 0) {
          setPendingOfflineEarnings({ offlineMs, earned });
        }
      }
      setLoaded(true);
    });
  }, []);

  // Game loop tick
  const lastTickRef = useRef(Date.now());
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      const now = Date.now();
      dispatch({ type: 'TICK', deltaMs: now - lastTickRef.current });
      lastTickRef.current = now;
    }, config.balance.tickRateMs);
    return () => clearInterval(interval);
  }, [loaded, config.balance.tickRateMs]);

  // Auto-save
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      saveLocal(config, stateRef.current);
      if (userId) syncToCloud(config, stateRef.current, userId).catch(() => {});
    }, autoSaveIntervalMs);
    return () => clearInterval(interval);
  }, [loaded, config, userId, autoSaveIntervalMs]);

  // App background/foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'background') saveLocal(config, stateRef.current);
      if (status === 'active') {
        loadLocal(config).then(saved => {
          if (saved) {
            const migrated = {
              ...saved,
              achievements: saved.achievements ?? {},
              prestigeShop: saved.prestigeShop ?? {},
              dailyChallenges: saved.dailyChallenges ?? {
                date: new Date().toISOString().slice(0, 10),
                progress: {}, completed: {}, activeBoosts: [],
              },
              tapCount: saved.tapCount ?? 0,
            };
            const before = migrated.resources;
            const { newState, offlineMs } = applyOfflineEarnings(config, migrated);
            const earned = diffResources(before, newState.resources);
            dispatch({ type: 'SET_STATE', state: newState });
            if (offlineMs > 60_000 && Object.keys(earned).length > 0) {
              setPendingOfflineEarnings({ offlineMs, earned });
            }
          }
        });
      }
    });
    return () => sub.remove();
  }, [config]);

  const tap = useCallback(() => dispatch({ type: 'TAP' }), []);
  const purchaseBuilding = useCallback(
    (id: string) => dispatch({ type: 'BUY_BUILDING', buildingId: id }), []
  );
  const purchaseBuildingBulk = useCallback(
    (id: string, count: number | 'max') => dispatch({ type: 'BUY_BUILDING_BULK', buildingId: id, count }), []
  );
  const purchaseUpgrade = useCallback(
    (id: string) => dispatch({ type: 'BUY_UPGRADE', upgradeId: id }), []
  );
  const purchasePrestigeUpgrade = useCallback(
    (id: string) => dispatch({ type: 'BUY_PRESTIGE_UPGRADE', upgradeId: id }), []
  );
  const [undoEntry, setUndoEntry] = useState<{ description: string; expiresAt: number } | null>(null);

  // Poll undo entry availability
  useEffect(() => {
    const t = setInterval(() => {
      const entry = getUndoEntry();
      setUndoEntry(entry ? { description: entry.description, expiresAt: entry.expiresAt } : null);
    }, 200);
    return () => clearInterval(t);
  }, []);
  const loadState = useCallback(
    (s: GameState) => dispatch({ type: 'SET_STATE', state: s }), []
  );
  const claimChallenge = useCallback(
    (id: string) => dispatch({ type: 'CLAIM_CHALLENGE', challengeId: id }), []
  );
  const prestige = useCallback(() => dispatch({ type: 'PRESTIGE' }), []);
  const dismissMilestone = useCallback(() => {
    setPendingMilestone(null);
    setTimeout(() => {
      if (milestoneQueue.current.length > 0) {
        setPendingMilestone(milestoneQueue.current.shift()!);
      }
    }, 400);
  }, []);

  const dismissOfflineEarnings = useCallback(() => setPendingOfflineEarnings(null), []);
  const dismissAchievement = useCallback(() => {
    setPendingAchievement(null);
    // Show next queued achievement after short delay
    setTimeout(() => {
      if (achievementQueue.current.length > 0) {
        setPendingAchievement(achievementQueue.current.shift()!);
      }
    }, 500);
  }, []);

  const productionRates = calculateProductionRates(config, state);
  const getBuildingCostMemo = useCallback(
    (id: string) => getBuildingCost(config, state, id),
    [config, state]
  );
  const getBuildingBulkCostMemo = useCallback(
    (id: string, count: number | 'max') => getBuildingBulkCost(config, state, id, count),
    [config, state]
  );

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const rollGacha = useCallback((packId: string): GachaReward[] | null => {
    const result = rollGachaPack(config, stateRef.current, packId);
    if (!result) return null;
    dispatch({ type: 'SET_STATE', state: result.newState });
    return result.rewards;
  }, [config]);

  return {
    state,
    loaded,
    productionRates,
    getBuildingCost: getBuildingCostMemo,
    getBuildingBulkCost: getBuildingBulkCostMemo,
    prestigeAvailable: canPrestige(config, state),
    pendingOfflineEarnings,
    dismissOfflineEarnings,
    pendingAchievement,
    dismissAchievement,
    pendingMilestone,
    dismissMilestone,
    undoEntry,
    undo,
    rollGacha,
    tap,
    purchaseBuilding,
    purchaseBuildingBulk,
    purchaseUpgrade,
    purchasePrestigeUpgrade,
    claimChallenge,
    loadState,
    prestige,
  };
}
