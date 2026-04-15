-- ─────────────────────────────────────────────
--  MeowNet Idle Engine — Supabase Schema
--  Run this in your hosted Supabase SQL editor
--  at supabase.com → project → SQL editor
-- ─────────────────────────────────────────────

-- Cloud saves: one row per user per game
create table if not exists idle_saves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  game_slug   text not null,
  state       jsonb not null,
  saved_at    timestamptz not null default now(),
  unique(user_id, game_slug)
);

-- Leaderboard: one row per user per game (upserted)
create table if not exists idle_leaderboard (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  game_slug   text not null,
  username    text not null,
  score       bigint not null default 0,
  updated_at  timestamptz not null default now(),
  unique(user_id, game_slug)
);

-- Remote config: live balance overrides per game
create table if not exists idle_remote_config (
  id          uuid primary key default gen_random_uuid(),
  game_slug   text not null unique,
  config_json jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────
create index if not exists idx_saves_user_game
  on idle_saves(user_id, game_slug);

create index if not exists idx_leaderboard_game_score
  on idle_leaderboard(game_slug, score desc);

-- ── Row Level Security ───────────────────────
alter table idle_saves enable row level security;
alter table idle_leaderboard enable row level security;
alter table idle_remote_config enable row level security;

-- Saves: users can only read/write their own
create policy "users manage own saves"
  on idle_saves for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Leaderboard: anyone can read, owner can write
create policy "leaderboard public read"
  on idle_leaderboard for select
  using (true);

create policy "users manage own score"
  on idle_leaderboard for insert
  with check (auth.uid() = user_id);

create policy "users update own score"
  on idle_leaderboard for update
  using (auth.uid() = user_id);

-- Remote config: public read only (you edit via dashboard)
create policy "remote config public read"
  on idle_remote_config for select
  using (true);

-- ── Seed a config row for the example game ───
insert into idle_remote_config (game_slug, config_json)
values ('cat-cafe', '{}')
on conflict (game_slug) do nothing;
