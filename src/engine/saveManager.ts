// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Save Manager
//  Local: AsyncStorage (works in all dev modes)
//  Cloud: Supabase hosted free tier
// ─────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { GameConfig, GameState } from '../types/engine';

// ── Local save / load ──────────────────────
export async function saveLocal(config: GameConfig, state: GameState): Promise<void> {
  const key = `game_state_${config.gameId}`;
  await AsyncStorage.setItem(key, JSON.stringify({ ...state, lastSaveAt: Date.now() }));
}

export async function loadLocal(config: GameConfig): Promise<GameState | null> {
  const key = `game_state_${config.gameId}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export async function clearLocal(config: GameConfig): Promise<void> {
  await AsyncStorage.removeItem(`game_state_${config.gameId}`);
}

// ── Supabase client ────────────────────────
let _client: ReturnType<typeof createClient> | null = null;

function getSupabaseClient(config: GameConfig) {
  if (!_client) {
    _client = createClient(config.remote.supabaseUrl, config.remote.supabaseAnonKey);
  }
  return _client;
}

// ── Cloud sync ─────────────────────────────
export async function syncToCloud(
  config: GameConfig,
  state: GameState,
  userId: string
): Promise<void> {
  const supabase = getSupabaseClient(config);
  await (supabase.from('idle_saves') as any).upsert({
    user_id: userId,
    game_slug: config.remote.gameSlug,
    state: state,
    saved_at: new Date().toISOString(),
  });
}

export async function loadFromCloud(
  config: GameConfig,
  userId: string
): Promise<GameState | null> {
  const supabase = getSupabaseClient(config);
  const { data } = await (supabase
    .from('idle_saves') as any)
    .select('state')
    .eq('user_id', userId)
    .eq('game_slug', config.remote.gameSlug)
    .single();
  return (data as any)?.state ?? null;
}

// ── Leaderboard ────────────────────────────
export async function submitScore(
  config: GameConfig,
  userId: string,
  username: string,
  score: number
): Promise<void> {
  const supabase = getSupabaseClient(config);
  await (supabase.from('idle_leaderboard') as any).upsert({
    user_id: userId,
    game_slug: config.remote.gameSlug,
    username,
    score,
    updated_at: new Date().toISOString(),
  });
}

export async function getLeaderboard(
  config: GameConfig,
  limit = 20
): Promise<{ username: string; score: number }[]> {
  const supabase = getSupabaseClient(config);
  const { data } = await (supabase
    .from('idle_leaderboard') as any)
    .select('username, score')
    .eq('game_slug', config.remote.gameSlug)
    .order('score', { ascending: false })
    .limit(limit);
  return (data as any[]) ?? [];
}

// ── Remote config ──────────────────────────
export async function fetchRemoteConfig(
  config: GameConfig
): Promise<Partial<GameConfig> | null> {
  const supabase = getSupabaseClient(config);
  const { data } = await (supabase
    .from('idle_remote_config') as any)
    .select('config_json')
    .eq('game_slug', config.remote.gameSlug)
    .single();
  return (data as any)?.config_json ?? null;
}
