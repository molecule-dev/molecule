CREATE TABLE IF NOT EXISTS "trashedItems" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "resourceType" VARCHAR(255) NOT NULL,
  "resourceId" VARCHAR(255) NOT NULL,
  "userId" UUID,
  "snapshot" JSONB NOT NULL,
  "reason" TEXT,
  "trashedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMPTZ,
  "restoredAt" TIMESTAMPTZ,
  "restoredBy" UUID,
  "purgedAt" TIMESTAMPTZ,
  CONSTRAINT "uq_trashed_items_resource_active" UNIQUE ("resourceType", "resourceId", "trashedAt")
);

CREATE INDEX IF NOT EXISTS "idx_trashed_items_resource" ON "trashedItems" ("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_trashed_items_user" ON "trashedItems" ("userId");
CREATE INDEX IF NOT EXISTS "idx_trashed_items_trashed_at" ON "trashedItems" ("trashedAt");
CREATE INDEX IF NOT EXISTS "idx_trashed_items_expires_at" ON "trashedItems" ("expiresAt");
CREATE INDEX IF NOT EXISTS "idx_trashed_items_restored_at" ON "trashedItems" ("restoredAt");
CREATE INDEX IF NOT EXISTS "idx_trashed_items_purged_at" ON "trashedItems" ("purgedAt");
