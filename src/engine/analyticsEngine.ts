// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Analytics Engine
//
//  Tracks key player events to idle_analytics.
//  All events are fire-and-forget (never block
//  gameplay). Events batch in memory and flush
//  every 30s or on app background.
//
//  Built-in event types:
//  session_start, session_end, tap_burst,
//  building_purchased, upgrade_purchased,
//  prestige, prestige_shop_purchase,
//  achievement_unlocked, milestone_reached,
//  offline_collected, daily_challenge_complete
// ─────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GameConfig } from '../types/engine';

export type AnalyticsEventType =
  | 'session_start'
  | 'session_end'
  | 'tap_burst'
  | 'building_purchased'
  | 'upgrade_purchased'
  | 'prestige'
  | 'prestige_shop_purchase'
  | 'achievement_unlocked'
  | 'milestone_reached'
  | 'offline_collected'
  | 'daily_challenge_complete'
  | 'first_open';

export interface AnalyticsEvent {
  event_type: AnalyticsEventType;
  event_data?: Record<string, any>;
}

interface QueuedEvent extends AnalyticsEvent {
  session_id: string;
  created_at: string;
}

let _client: SupabaseClient | null = null;
let _queue: QueuedEvent[] = [];
let _sessionId: string = '';
let _userId: string | null = null;
let _gameSlug: string = '';
let _flushTimer: ReturnType<typeof setInterval> | null = null;

function getClient(config: GameConfig): SupabaseClient {
  if (!_client) {
    _client = createClient(config.remote.supabaseUrl, config.remote.supabaseAnonKey);
  }
  return _client;
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function initAnalytics(config: GameConfig, userId?: string) {
  _gameSlug = config.remote.gameSlug;
  _userId = userId ?? null;
  _sessionId = generateSessionId();
  getClient(config);

  // Auto-flush every 30 seconds
  if (_flushTimer) clearInterval(_flushTimer);
  _flushTimer = setInterval(() => flushAnalytics(config), 30_000);

  track('session_start', { platform: 'ios' });
}

export function setAnalyticsUser(userId: string) {
  _userId = userId;
}

export function track(eventType: AnalyticsEventType, data?: Record<string, any>) {
  _queue.push({
    event_type: eventType,
    event_data: data,
    session_id: _sessionId,
    created_at: new Date().toISOString(),
  });
}

export async function flushAnalytics(config: GameConfig) {
  if (_queue.length === 0) return;

  const toFlush = [..._queue];
  _queue = [];

  try {
    const client = getClient(config);
    const rows = toFlush.map(e => ({
      user_id: _userId,
      game_slug: _gameSlug,
      session_id: e.session_id,
      event_type: e.event_type,
      event_data: e.event_data ?? {},
      created_at: e.created_at,
    }));

    const { error } = await (client.from('idle_analytics') as any).insert(rows);
    if (error) {
      // Re-queue on failure (but cap to avoid memory bloat)
      if (_queue.length < 500) _queue.unshift(...toFlush);
    }
  } catch {
    // Silently fail — never block gameplay
  }
}

export function endSession(config: GameConfig, totalPlaytimeMs: number) {
  track('session_end', { playtime_ms: totalPlaytimeMs });
  flushAnalytics(config);
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
}
