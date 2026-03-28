CREATE TABLE IF NOT EXISTS "activities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorId" VARCHAR(255) NOT NULL,
  "action" VARCHAR(255) NOT NULL,
  "resourceType" VARCHAR(255) NOT NULL,
  "resourceId" VARCHAR(255) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_activities_createdAt" ON "activities" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_activities_resource" ON "activities" ("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_activities_actor" ON "activities" ("actorId");

CREATE TABLE IF NOT EXISTS "activity_seen_status" (
  "userId" VARCHAR(255) PRIMARY KEY,
  "lastSeenActivityId" UUID NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
