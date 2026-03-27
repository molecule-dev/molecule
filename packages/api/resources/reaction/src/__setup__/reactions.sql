CREATE TABLE IF NOT EXISTS "reactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "resourceType" VARCHAR(255) NOT NULL,
  "resourceId" VARCHAR(255) NOT NULL,
  "userId" UUID NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("resourceType", "resourceId", "userId", "type")
);

CREATE INDEX IF NOT EXISTS "idx_reactions_resource" ON "reactions" ("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_reactions_user" ON "reactions" ("userId");
