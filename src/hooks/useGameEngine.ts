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
  buyUpgrade,
  applyPrestige,
  canPrestige,
  createDefaultState,
  calculateProductionRates,
  getBuildingCost,
} from '../engine/gameLoop';
import { checkAchievements, applyAchievements } from '../engine/achievementEngine';
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
  | { type: 'BUY_UPGRADE'; upgradeId: string }
  | { type: 'PRESTIGE' };

function reducer(config: GameConfig, achievements: AchievementDef[]) {
  return (state: GameState, action: Action): GameState => {
    let next: GameState;
    switch (action.type) {
      case 'SET_STATE': return action.state;
      case 'TICK': next = tick(config, state, action.deltaMs); break;
      case 'TAP': next = { ...handleTap(config, state), tapCount: (state.tapCount ?? 0) + 1 }; break;
      case 'BUY_BUILDING': next = buyBuilding(config, state, action.buildingId) ?? state; break;
      case 'BUY_UPGRADE': next = buyUpgrade(config, state, action.upgradeId) ?? state; break;
      case 'PRESTIGE': next = canPrestige(config, state) ? applyPrestige(config, state) : state; break;
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
  const achievementQueue = useRef<AchievementDef[]>([]);

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
  const purchaseUpgrade = useCallback(
    (id: string) => dispatch({ type: 'BUY_UPGRADE', upgradeId: id }), []
  );
  const prestige = useCallback(() => dispatch({ type: 'PRESTIGE' }), []);
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

  return {
    state,
    loaded,
    productionRates,
    getBuildingCost: getBuildingCostMemo,
    prestigeAvailable: canPrestige(config, state),
    pendingOfflineEarnings,
    dismissOfflineEarnings,
    pendingAchievement,
    dismissAchievement,
    tap,
    purchaseBuilding,
    purchaseUpgrade,
    prestige,
  };
}
