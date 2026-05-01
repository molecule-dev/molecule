CREATE TABLE IF NOT EXISTS "notifications_preferences" (
  "userId" UUID PRIMARY KEY,
  "preferences" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notifications_preferences_preferences"
  ON "notifications_preferences" USING GIN ("preferences");
