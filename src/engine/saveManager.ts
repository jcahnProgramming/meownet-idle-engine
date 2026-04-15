// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Save Manager
//  Local: MMKV (fast, sync)
//  Cloud: Supabase hosted free tier
// ─────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
import { GameConfig, GameState } from '../types/engine';

// MMKV loaded at runtime (native module)
let _storage: any = null;
function getStorage() {
  if (!_storage) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv');
    _storage = new MMKV({ id: 'idle-engine-save' });
  }
  return _storage;
}

// ── Local save / load ──────────────────────
export function saveLocal(config: GameConfig, state: GameState): void {
  const key = `game_state_${config.gameId}`;
  getStorage().set(key, JSON.stringify({ ...state, lastSaveAt: Date.now() }));
}

export function loadLocal(config: GameConfig): GameState | null {
  const key = `game_state_${config.gameId}`;
  const raw = getStorage().getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearLocal(config: GameConfig): void {
  getStorage().delete(`game_state_${config.gameId}`);
}

// ── Supabase client (hosted free tier) ─────
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

// ── Remote config (live balance tuning) ────
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
