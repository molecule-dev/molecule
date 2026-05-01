CREATE TABLE IF NOT EXISTS "versions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "resourceType" VARCHAR(255) NOT NULL,
  "resourceId" VARCHAR(255) NOT NULL,
  "version" INTEGER NOT NULL,
  "userId" UUID,
  "snapshot" JSONB NOT NULL,
  "changes" JSONB,
  "reason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_versions_resource_version" UNIQUE ("resourceType", "resourceId", "version")
);

CREATE INDEX IF NOT EXISTS "idx_versions_resource" ON "versions" ("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_versions_created" ON "versions" ("createdAt");
CREATE INDEX IF NOT EXISTS "idx_versions_user" ON "versions" ("userId");
