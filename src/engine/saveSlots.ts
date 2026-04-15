// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Save Slots
//  Supports up to N independent save files.
//  Slot 0 is always the default/active slot.
//  Slot metadata (name, playtime, prestige count,
//  timestamp) is stored separately for fast
//  slot selection UI without loading full state.
// ─────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameConfig, GameState } from '../types/engine';

export interface SlotMeta {
  slot: number;
  name: string;
  lastSavedAt: number;
  totalPlaytimeMs: number;
  prestigeCount: number;
  primaryResourceAmount: number;
  primaryResourceId: string;
  isEmpty: boolean;
}

const MAX_SLOTS = 3;

function slotKey(config: GameConfig, slot: number): string {
  return `game_state_${config.gameId}_slot${slot}`;
}

function metaKey(config: GameConfig): string {
  return `game_slots_meta_${config.gameId}`;
}

// ── Save to a specific slot ──────────────────
export async function saveToSlot(
  config: GameConfig,
  state: GameState,
  slot: number
): Promise<void> {
  await AsyncStorage.setItem(
    slotKey(config, slot),
    JSON.stringify({ ...state, lastSaveAt: Date.now() })
  );
  await updateSlotMeta(config, state, slot);
}

// ── Load from a specific slot ────────────────
export async function loadFromSlot(
  config: GameConfig,
  slot: number
): Promise<GameState | null> {
  const raw = await AsyncStorage.getItem(slotKey(config, slot));
  if (!raw) return null;
  try { return JSON.parse(raw) as GameState; } catch { return null; }
}

// ── Delete a slot ────────────────────────────
export async function deleteSlot(config: GameConfig, slot: number): Promise<void> {
  await AsyncStorage.removeItem(slotKey(config, slot));
  const metas = await getAllSlotMetas(config);
  const updated = metas.map(m =>
    m.slot === slot
      ? { ...m, isEmpty: true, name: `Slot ${slot + 1}`, lastSavedAt: 0 }
      : m
  );
  await AsyncStorage.setItem(metaKey(config), JSON.stringify(updated));
}

// ── Update slot metadata ─────────────────────
async function updateSlotMeta(
  config: GameConfig,
  state: GameState,
  slot: number
): Promise<void> {
  const primaryResource = config.resources[0];
  const meta: SlotMeta = {
    slot,
    name: `Slot ${slot + 1}`,
    lastSavedAt: Date.now(),
    totalPlaytimeMs: state.totalPlaytimeMs,
    prestigeCount: state.prestige.totalPrestiges,
    primaryResourceAmount: state.resources[primaryResource?.id ?? ''] ?? 0,
    primaryResourceId: primaryResource?.id ?? '',
    isEmpty: false,
  };

  const metas = await getAllSlotMetas(config);
  const updated = metas.map(m => m.slot === slot ? meta : m);
  await AsyncStorage.setItem(metaKey(config), JSON.stringify(updated));
}

// ── Get all slot metadata ────────────────────
export async function getAllSlotMetas(config: GameConfig): Promise<SlotMeta[]> {
  const raw = await AsyncStorage.getItem(metaKey(config));
  if (raw) {
    try { return JSON.parse(raw) as SlotMeta[]; } catch {}
  }
  // Return empty slots
  return Array.from({ length: MAX_SLOTS }, (_, i) => ({
    slot: i,
    name: `Slot ${i + 1}`,
    lastSavedAt: 0,
    totalPlaytimeMs: 0,
    prestigeCount: 0,
    primaryResourceAmount: 0,
    primaryResourceId: config.resources[0]?.id ?? '',
    isEmpty: true,
  }));
}

// ── Get active slot index ────────────────────
export async function getActiveSlot(config: GameConfig): Promise<number> {
  const raw = await AsyncStorage.getItem(`active_slot_${config.gameId}`);
  return raw ? parseInt(raw, 10) : 0;
}

export async function setActiveSlot(config: GameConfig, slot: number): Promise<void> {
  await AsyncStorage.setItem(`active_slot_${config.gameId}`, String(slot));
}

export { MAX_SLOTS };
