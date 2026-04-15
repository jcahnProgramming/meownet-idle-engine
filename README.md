# 🐾 MeowNet Idle Engine

A fully-featured, config-driven idle game engine for React Native / Expo. Fork it, change one file, ship your own idle game.

---

## What's Included

| Feature | Description |
|---|---|
| ⚙️ Config-driven | All game content lives in `gameConfig.ts` — zero engine changes needed to fork |
| 🔢 BigNumber math | `decimal.js` for precise arithmetic at any scale |
| 🏗 Buildings + upgrades | With multipliers, unlock conditions, cost scaling |
| 🛒 Bulk buy | x1 / x10 / x100 / Max toggle |
| ✨ Prestige system | Reset for permanent currency + prestige shop |
| 🏆 Achievements | 9 built-in, extensible, toast notifications with queue |
| 📲 Push notifications | Re-engagement, prestige-ready, daily challenge alerts |
| 📊 Analytics | Session tracking, purchase events, prestige events → Supabase |
| 📅 Daily challenges | 5 rotating goals, rewards (resources / prestige currency / boosts) |
| 🎰 Gacha / loot packs | Spend prestige currency on randomized reward packs |
| 👥 Friends leaderboard | Filter leaderboard to friends by user ID |
| 🏅 Global leaderboard | Full Supabase-backed leaderboard |
| ⏱ Offline earnings | Capped catch-up with "Welcome Back" modal |
| 🔔 Milestone toasts | Pill notifications for key in-game moments |
| ↩️ Undo purchase | 5-second grace window with countdown bar |
| 📈 Stats screen | Lifetime stats: resources, buildings, achievements, boosts |
| 💾 Save slots | 3 independent save files, load/save/delete |
| 🌍 i18n | `t()` function with EN / ES / FR / JA built in |
| 🎵 Sound system | Procedural tones for tap/buy/upgrade/prestige, mute toggle |
| 🔧 Remote config | Live balance overrides from Supabase — no app update needed |
| 🧪 A/B testing | Deterministic variant assignment per user |
| 🍴 Fork CLI | `node scripts/create-fork.js` generates a new `gameConfig.ts` |

---

## Quick Start

### 1. Clone & install
```bash
git clone https://github.com/jcahnProgramming/meownet-idle-engine
cd meownet-idle-engine
npm install
```

### 2. Set up Supabase
Create a free project at [supabase.com](https://supabase.com), then:
```bash
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```
Run both SQL files in the Supabase SQL editor:
- `supabase/schema.sql`
- `supabase/analytics_schema.sql`

### 3. Run on iOS simulator
```bash
npx expo run:ios
```

---

## Creating a Fork

The fastest way to start a new game:

```bash
node scripts/create-fork.js
```

This prompts you for your game name, resource name, building name, colors, and prestige currency — then generates a ready-to-use `gameConfig.ts`.

Or manually: copy `src/config/gameConfig.ts`, rename it, and edit the values. The engine reads everything from that file.

---

## Project Structure

```
src/
├── config/
│   └── gameConfig.ts        ← THE ONLY FILE YOU NEED TO EDIT FOR A FORK
├── engine/
│   ├── gameLoop.ts          ← tick, offline, buy, prestige logic
│   ├── bignum.ts            ← decimal.js wrappers
│   ├── achievementEngine.ts ← achievement checking
│   ├── milestoneEngine.ts   ← milestone toast triggers
│   ├── dailyChallengeEngine.ts ← daily challenge logic
│   ├── gachaEngine.ts       ← loot pack rolling
│   ├── analyticsEngine.ts   ← Supabase event tracking
│   ├── saveManager.ts       ← AsyncStorage + Supabase cloud sync
│   ├── saveSlots.ts         ← multiple save file management
│   ├── remoteConfig.ts      ← live balance overrides
│   ├── undoEngine.ts        ← undo last purchase
│   ├── abTesting.ts         ← A/B variant assignment
│   └── i18n.ts              ← localization
├── hooks/
│   ├── useGameEngine.ts     ← main game loop hook
│   ├── useAuth.ts           ← Supabase auth
│   ├── useSoundEngine.ts    ← audio playback
│   ├── useAnalytics.ts      ← analytics lifecycle
│   └── useNotifications.ts  ← push notification scheduling
├── screens/
│   ├── GameScreen.tsx       ← main game: tap, buildings, upgrades
│   ├── PrestigeShopScreen.tsx
│   ├── GachaScreen.tsx
│   ├── DailyChallengesScreen.tsx
│   ├── StatsScreen.tsx
│   ├── SaveSlotsScreen.tsx
│   ├── LeaderboardScreen.tsx
│   ├── FriendsLeaderboardScreen.tsx
│   ├── SettingsScreen.tsx
│   └── AuthScreen.tsx
├── components/
│   ├── buildings/
│   │   ├── BuildingCard.tsx
│   │   └── BuyModeToggle.tsx
│   ├── shop/
│   │   └── UpgradeCard.tsx
│   └── hud/
│       ├── HUD.tsx
│       ├── TapTarget.tsx
│       ├── AchievementToast.tsx
│       ├── MilestoneToast.tsx
│       ├── OfflineEarningsModal.tsx
│       └── UndoToast.tsx
└── types/
    └── engine.ts            ← all TypeScript types
```

---

## gameConfig.ts Reference

Every field the engine reads, with comments:

```typescript
export const gameConfig: GameConfig = {
  gameId: 'my-game',         // unique ID, used as save key
  gameName: 'My Game',
  version: '1.0.0',
  locale: 'en',              // 'en' | 'es' | 'fr' | 'ja'

  resources: [{
    id: 'gold',
    name: 'Gold',
    icon: '💰',
    startingValue: 0,
    cap: 'infinite',          // or a number
    displayPrecision: 1,
  }],

  buildings: [{
    id: 'miner',
    name: 'Miner',
    icon: '⛏',
    description: 'Digs for gold.',
    baseCost: { gold: 10 },
    costScaling: 1.15,        // each purchase costs 15% more
    baseProduction: { gold: 0.1 }, // per second
    unlockCondition: {         // optional
      resourceId: 'gold',
      resourceAmount: 50,
    },
  }],

  upgrades: [{
    id: 'miner_gloves',
    name: 'Mining Gloves',
    description: 'Miners dig 2× faster.',
    icon: '🧤',
    cost: { gold: 200 },
    effect: {
      type: 'building_multiplier', // or 'global_multiplier', 'tap_multiplier'
      targetId: 'miner',
      multiplier: 2,
    },
    unlockCondition: { buildingId: 'miner', buildingCount: 10 },
  }],

  prestige: {
    enabled: true,
    requiredResource: 'gold',
    requiredAmount: 1_000_000,
    currencyName: 'Stars',
    currencyIcon: '⭐',
    formulaExponent: 0.5,
    persistedUpgrades: ['miner_gloves'], // survive prestige
  },

  balance: {
    tickRateMs: 100,
    offlineEarningsRate: 0.5, // 50% of online rate while offline
    maxOfflineHours: 8,
    tapProductionMultiplier: 1,
  },

  // ... theme, sound, notifications, remote — see gameConfig.ts
};
```

---

## Remote Config (Live Balance)

Edit the `idle_remote_config` table in Supabase to tune balance without an app update:

```json
{
  "balance": { "offlineEarningsRate": 0.75 },
  "buildings": [{ "id": "miner", "baseProduction": { "gold": 0.2 } }]
}
```

Changes apply on next app launch.

---

## A/B Testing

Add experiments to remote config:
```json
{
  "experiments": {
    "prestige_threshold": {
      "variants": ["control", "lower"],
      "weights": [50, 50]
    }
  }
}
```

Then in code:
```typescript
import { getVariant } from './src/engine/abTesting';
if (getVariant('prestige_threshold') === 'lower') { ... }
```

---

## Adding a Language

Add an entry to the `LOCALES` object in `src/engine/i18n.ts`:

```typescript
de: {
  tap_button: 'Tippen!',
  // ... all LocaleKey values
}
```

Then set `locale: 'de'` in `gameConfig.ts`.

---

## License

MIT — fork freely, ship your game, credit appreciated but not required.

Built with ❤️ by MeowNet Studios.
