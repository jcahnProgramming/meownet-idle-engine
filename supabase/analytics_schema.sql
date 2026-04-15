-- ─────────────────────────────────────────────
--  MeowNet Idle Engine — Analytics Schema
--  Run this in Supabase SQL editor
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idle_analytics (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_slug     TEXT NOT NULL,
  event_type    TEXT NOT NULL,   -- 'tap', 'purchase', 'prestige', 'session_start', etc.
  event_data    JSONB,           -- flexible payload per event type
  session_id    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by game + event type
CREATE INDEX IF NOT EXISTS idx_analytics_game_event
  ON idle_analytics(game_slug, event_type, created_at DESC);

-- Index for per-user queries
CREATE INDEX IF NOT EXISTS idx_analytics_user
  ON idle_analytics(user_id, created_at DESC);

-- RLS: users can only insert their own events, admins can read all
ALTER TABLE idle_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own analytics"
  ON idle_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can read own analytics"
  ON idle_analytics FOR SELECT
  USING (auth.uid() = user_id);

-- ── Friends system ────────────────────────────
CREATE TABLE IF NOT EXISTS idle_friends (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_slug   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id, game_slug)
);

ALTER TABLE idle_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own friends"
  ON idle_friends FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
