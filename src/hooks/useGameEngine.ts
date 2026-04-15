// ─────────────────────────────────────────────
//  MeowNet Idle Engine — useGameEngine hook
// ─────────────────────────────────────────────

import { useEffect, useRef, useCallback, useReducer, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { GameConfig, GameState } from '../types/engine';
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
import { saveLocal, loadLocal, syncToCloud } from '../engine/saveManager';

type Action =
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'TAP' }
  | { type: 'BUY_BUILDING'; buildingId: string }
  | { type: 'BUY_UPGRADE'; upgradeId: string }
  | { type: 'PRESTIGE' };

function reducer(config: GameConfig) {
  return (state: GameState, action: Action): GameState => {
    switch (action.type) {
      case 'SET_STATE': return action.state;
      case 'TICK': return tick(config, state, action.deltaMs);
      case 'TAP': return handleTap(config, state);
      case 'BUY_BUILDING': return buyBuilding(config, state, action.buildingId) ?? state;
      case 'BUY_UPGRADE': return buyUpgrade(config, state, action.upgradeId) ?? state;
      case 'PRESTIGE': return canPrestige(config, state) ? applyPrestige(config, state) : state;
      default: return state;
    }
  };
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
  const [state, dispatch] = useReducer(
    reducer(config),
    createDefaultState(config)
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  // Load saved state on mount
  useEffect(() => {
    loadLocal(config).then(saved => {
      if (saved) {
        const { newState } = applyOfflineEarnings(config, saved);
        dispatch({ type: 'SET_STATE', state: newState });
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
      if (status === 'background') {
        saveLocal(config, stateRef.current);
      }
      if (status === 'active') {
        loadLocal(config).then(saved => {
          if (saved) {
            const { newState } = applyOfflineEarnings(config, saved);
            dispatch({ type: 'SET_STATE', state: newState });
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

  const productionRates = calculateProductionRates(config, state);
  const getBuildingCostMemo = useCallback(
    (id: string) => getBuildingCost(config, state, id),
    [config, state]
  );
  const prestigeAvailable = canPrestige(config, state);

  return {
    state,
    loaded,
    productionRates,
    getBuildingCost: getBuildingCostMemo,
    prestigeAvailable,
    tap,
    purchaseBuilding,
    purchaseUpgrade,
    prestige,
  };
}
