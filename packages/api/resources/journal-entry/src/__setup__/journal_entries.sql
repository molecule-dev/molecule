-- @molecule/api-resource-journal-entry — schema setup
--
-- `journal_entries` holds owner-scoped diary entries with optional
-- at-rest encryption (body_encrypted set when @molecule/api-encryption
-- is bonded). `mood_entries` is a sibling table for mood scoring,
-- linked back via `journal_entries.mood_id`.

CREATE TABLE IF NOT EXISTS journal_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  written_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title         TEXT,
  body          TEXT,
  body_encrypted TEXT,
  body_iv       TEXT,
  mood_id       UUID,
  prompt_id     UUID,
  activity_ids  JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags          JSONB NOT NULL DEFAULT '[]'::jsonb,
  word_count    INTEGER NOT NULL DEFAULT 0,
  ai_summary    TEXT,
  ai_themes     JSONB,
  is_private    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_written
  ON journal_entries (user_id, written_at DESC);

CREATE TABLE IF NOT EXISTS mood_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score           INTEGER NOT NULL,
  energy          INTEGER,
  anxiety         INTEGER,
  label           TEXT,
  activities      JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes           TEXT,
  journal_entry_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_recorded
  ON mood_entries (user_id, recorded_at DESC);
