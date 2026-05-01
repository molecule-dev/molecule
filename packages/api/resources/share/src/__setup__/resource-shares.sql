CREATE TABLE IF NOT EXISTS "resource-shares" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "resourceType" VARCHAR(255) NOT NULL,
  "resourceId" VARCHAR(255) NOT NULL,
  "principalType" VARCHAR(32) NOT NULL,
  "principalId" VARCHAR(255) NOT NULL,
  "role" VARCHAR(32) NOT NULL,
  "grantedBy" UUID,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("resourceType", "resourceId", "principalType", "principalId")
);

CREATE INDEX IF NOT EXISTS "idx_resource_shares_resource"
  ON "resource-shares" ("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_resource_shares_principal"
  ON "resource-shares" ("principalType", "principalId");
CREATE INDEX IF NOT EXISTS "idx_resource_shares_expiry"
  ON "resource-shares" ("expiresAt");
