// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Undo Engine
//  5-second grace window to cancel the last
//  building or upgrade purchase.
//  Stores a single snapshot of pre-purchase
//  state in memory (no persistence needed).
// ─────────────────────────────────────────────

import { GameState } from '../types/engine';

interface UndoEntry {
  snapshot: GameState;
  description: string;    // "Cat x1", "Power Paws upgrade", etc.
  expiresAt: number;      // unix ms
}

const UNDO_WINDOW_MS = 5000;

let _entry: UndoEntry | null = null;

export function pushUndoSnapshot(state: GameState, description: string) {
  _entry = {
    snapshot: state,
    description,
    expiresAt: Date.now() + UNDO_WINDOW_MS,
  };
}

export function getUndoEntry(): UndoEntry | null {
  if (!_entry) return null;
  if (Date.now() > _entry.expiresAt) {
    _entry = null;
    return null;
  }
  return _entry;
}

export function consumeUndo(): GameState | null {
  const entry = getUndoEntry();
  if (!entry) return null;
  _entry = null;
  return entry.snapshot;
}

export function clearUndo() {
  _entry = null;
}
