CREATE TABLE IF NOT EXISTS "follows" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "followerId" UUID NOT NULL,
  "targetType" VARCHAR(255) NOT NULL,
  "targetId" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("followerId", "targetType", "targetId")
);

CREATE INDEX IF NOT EXISTS "idx_follows_follower" ON "follows" ("followerId");
CREATE INDEX IF NOT EXISTS "idx_follows_target" ON "follows" ("targetType", "targetId");
