# MeowNet Idle Engine

A config-driven idle game engine built with React Native + Expo. Fork this repo, edit one file, ship a game.

## Philosophy

The entire game design lives in `src/config/gameConfig.ts`. The engine reads it and builds everything — resources, buildings, upgrades, prestige, theme. **You never touch the engine per-fork.**

```
gameConfig.ts  ← fork changes only this
engine/        ← never modified per-fork
supabase/      ← shared schema, scoped by gameSlug
```

## Stack

- **React Native + Expo** — iOS, Android, Web from one codebase
- **@shopify/react-native-skia** — GPU-accelerated 2D graphics
- **react-native-reanimated** — smooth animations
- **react-native-mmkv** — fast local save state
- **Supabase (hosted free tier)** — cloud saves, leaderboards, remote config

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/jcahnProgramming/meownet-idle-engine.git
cd meownet-idle-engine
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project (free tier)
2. Open **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key from **Settings → API**

```bash
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

### 3. Run

```bash
npx expo start
```

## Forking to make a new game

```bash
# 1. Fork this repo on GitHub
# 2. Clone your fork
git clone https://github.com/yourname/my-awesome-idle-game.git
cd my-awesome-idle-game

# 3. Edit ONLY this file:
nano src/config/gameConfig.ts

# 4. Update .env with your Supabase project
# 5. Ship it
```

## gameConfig.ts Reference

| Section | What it controls |
|---|---|
| `resources` | Currency names, icons, caps |
| `buildings` | Producers, costs, scaling, unlock conditions |
| `upgrades` | Multipliers, tap boosts, unlock trees |
| `prestige` | Reset currency, formula, persisted upgrades |
| `theme` | Colors, fonts, art assets |
| `balance` | Tick rate, offline earnings, tap multiplier |
| `remote` | Supabase project URL + anon key + game slug |

## Supabase Tables

| Table | Purpose |
|---|---|
| `idle_saves` | Cloud save per user per game |
| `idle_leaderboard` | Top scores per game |
| `idle_remote_config` | Live balance overrides (edit from dashboard, no app update needed) |

The `game_slug` field scopes all data — multiple games can share one Supabase project.

## Project Structure

```
src/
  config/
    gameConfig.ts       ← THE file you edit per-fork
  engine/
    gameLoop.ts         ← tick, offline calc, buy logic
    saveManager.ts      ← MMKV local + Supabase cloud sync
  hooks/
    useGameEngine.ts    ← React hook wiring everything together
  screens/
    GameScreen.tsx      ← Main game UI (config-driven)
  types/
    engine.ts           ← TypeScript types (never modify)
supabase/
  schema.sql            ← Run once in your Supabase project
```

## Built by

[MeowNet Studios](https://meownetstudios.com) — Denver, CO
