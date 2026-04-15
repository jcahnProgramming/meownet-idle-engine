// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Achievement Engine
// ─────────────────────────────────────────────

import { AchievementDef, AchievementState, GameState } from '../types/engine';

export function checkAchievements(
  achievements: AchievementDef[],
  state: GameState,
  prevState: GameState
): AchievementDef[] {
  const newlyUnlocked: AchievementDef[] = [];

  for (const achievement of achievements) {
    // Already unlocked
    if (state.achievements[achievement.id]) continue;

    const { trigger } = achievement;
    let unlocked = false;

    switch (trigger.type) {
      case 'resource_total':
        unlocked = (state.resources[trigger.resourceId] ?? 0) >= trigger.amount;
        break;
      case 'building_count':
        unlocked = (state.buildings[trigger.buildingId] ?? 0) >= trigger.count;
        break;
      case 'upgrade_purchased':
        unlocked = !!state.upgrades[trigger.upgradeId];
        break;
      case 'prestige_count':
        unlocked = state.prestige.totalPrestiges >= trigger.count;
        break;
      case 'tap_count':
        unlocked = (state.tapCount ?? 0) >= trigger.count;
        break;
    }

    if (unlocked) {
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

export function applyAchievements(
  state: GameState,
  newlyUnlocked: AchievementDef[]
): GameState {
  if (newlyUnlocked.length === 0) return state;
  const now = Date.now();
  const newAchievements = { ...state.achievements };
  for (const a of newlyUnlocked) {
    newAchievements[a.id] = { unlockedAt: now };
  }
  return { ...state, achievements: newAchievements };
}
