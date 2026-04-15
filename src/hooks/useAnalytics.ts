// ─────────────────────────────────────────────
//  MeowNet Idle Engine — useAnalytics hook
//  Initializes analytics on mount, auto-flushes
//  on app background, tracks session lifecycle.
// ─────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { GameConfig, GameState } from '../types/engine';
import {
  initAnalytics,
  setAnalyticsUser,
  flushAnalytics,
  endSession,
  track,
  AnalyticsEventType,
} from '../engine/analyticsEngine';

interface UseAnalyticsOptions {
  config: GameConfig;
  userId?: string;
  state?: GameState;
}

export function useAnalytics({ config, userId, state }: UseAnalyticsOptions) {
  const initializedRef = useRef(false);
  const prevStateRef = useRef<GameState | null>(null);

  // Initialize on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initAnalytics(config, userId);
  }, []);

  // Update user ID when auth resolves
  useEffect(() => {
    if (userId) setAnalyticsUser(userId);
  }, [userId]);

  // Track prestige, purchases, achievements by watching state diffs
  useEffect(() => {
    if (!state) return;
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (!prev) return;

    // Prestige
    if (state.prestige.totalPrestiges > prev.prestige.totalPrestiges) {
      track('prestige', {
        prestige_count: state.prestige.totalPrestiges,
        currency_earned: state.prestige.currency - prev.prestige.currency,
        playtime_ms: state.totalPlaytimeMs,
      });
    }

    // Building purchases
    for (const [id, count] of Object.entries(state.buildings)) {
      const prevCount = prev.buildings[id] ?? 0;
      if (count > prevCount) {
        track('building_purchased', {
          building_id: id,
          count_after: count,
          amount_bought: count - prevCount,
        });
      }
    }

    // Upgrade purchases
    for (const [id, owned] of Object.entries(state.upgrades)) {
      if (owned && !prev.upgrades[id]) {
        track('upgrade_purchased', { upgrade_id: id });
      }
    }

    // Prestige shop
    for (const [id, level] of Object.entries(state.prestigeShop)) {
      const prevLevel = prev.prestigeShop[id] ?? 0;
      if (level > prevLevel) {
        track('prestige_shop_purchase', { upgrade_id: id, level });
      }
    }

    // Achievements
    for (const [id, data] of Object.entries(state.achievements)) {
      if (data && !prev.achievements[id]) {
        track('achievement_unlocked', { achievement_id: id });
      }
    }
  }, [state]);

  // Flush on app background, end session on close
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'background') {
        flushAnalytics(config);
        if (state) endSession(config, state.totalPlaytimeMs);
      }
    });
    return () => sub.remove();
  }, [config, state]);

  return { track };
}
