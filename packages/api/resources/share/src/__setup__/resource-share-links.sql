CREATE TABLE IF NOT EXISTS "resource-share-links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "resourceType" VARCHAR(255) NOT NULL,
  "resourceId" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(64) NOT NULL UNIQUE,
  "role" VARCHAR(32) NOT NULL,
  "createdBy" UUID,
  "expiresAt" TIMESTAMPTZ,
  "revokedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_resource_share_links_resource"
  ON "resource-share-links" ("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_resource_share_links_slug"
  ON "resource-share-links" ("slug");
