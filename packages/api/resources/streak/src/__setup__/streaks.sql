CREATE TABLE IF NOT EXISTS "streaks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "activity_kind" VARCHAR(64) NOT NULL,
  "current_streak" INTEGER NOT NULL DEFAULT 0,
  "longest_streak" INTEGER NOT NULL DEFAULT 0,
  "last_activity_date" TIMESTAMPTZ,
  "freezes_used" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "activity_kind")
);

CREATE INDEX IF NOT EXISTS "idx_streaks_user" ON "streaks" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_streaks_activity" ON "streaks" ("activity_kind");
