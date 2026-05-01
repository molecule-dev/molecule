CREATE TABLE IF NOT EXISTS "reputation_events" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "kind" varchar(64) NOT NULL,
  "delta" integer NOT NULL,
  "sourceId" text,
  "metadata" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "reputation_events_userId_index" ON "reputation_events" ("userId");
CREATE INDEX IF NOT EXISTS "reputation_events_kind_index" ON "reputation_events" ("kind");
CREATE INDEX IF NOT EXISTS "reputation_events_sourceId_index" ON "reputation_events" ("sourceId");
CREATE INDEX IF NOT EXISTS "reputation_events_createdAt_index" ON "reputation_events" ("createdAt");
