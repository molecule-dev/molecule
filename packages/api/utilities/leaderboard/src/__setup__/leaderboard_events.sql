CREATE TABLE IF NOT EXISTS "leaderboard_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "metric" VARCHAR(64) NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "scope_key" VARCHAR(128),
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_leaderboard_events_metric" ON "leaderboard_events" ("metric");
CREATE INDEX IF NOT EXISTS "idx_leaderboard_events_user" ON "leaderboard_events" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_leaderboard_events_metric_occurred_at"
  ON "leaderboard_events" ("metric", "occurred_at");
CREATE INDEX IF NOT EXISTS "idx_leaderboard_events_scope"
  ON "leaderboard_events" ("metric", "scope_key", "occurred_at")
  WHERE "scope_key" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "leaderboard_rollups" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "metric" VARCHAR(64) NOT NULL,
  "window_kind" VARCHAR(16) NOT NULL,
  "window_start" TIMESTAMPTZ NOT NULL,
  "window_end" TIMESTAMPTZ NOT NULL,
  "scope_key" VARCHAR(128),
  "user_id" UUID NOT NULL,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rank" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("metric", "window_kind", "window_start", "scope_key", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_leaderboard_rollups_lookup"
  ON "leaderboard_rollups" ("metric", "window_kind", "window_start", "scope_key", "rank");
