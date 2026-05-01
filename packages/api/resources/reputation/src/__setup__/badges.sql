CREATE TABLE IF NOT EXISTS "badges" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "kind" varchar(64) NOT NULL,
  "awardedAt" timestamptz NOT NULL DEFAULT current_timestamp,
  UNIQUE ("userId", "kind")
);

CREATE INDEX IF NOT EXISTS "badges_userId_index" ON "badges" ("userId");
CREATE INDEX IF NOT EXISTS "badges_kind_index" ON "badges" ("kind");
CREATE INDEX IF NOT EXISTS "badges_awardedAt_index" ON "badges" ("awardedAt");
