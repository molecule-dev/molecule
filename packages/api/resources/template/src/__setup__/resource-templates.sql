CREATE TABLE IF NOT EXISTS "resource-templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "resourceType" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "snapshot" JSONB NOT NULL,
  "variables" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "tags" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isPublic" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("resourceType", "slug")
);

CREATE INDEX IF NOT EXISTS "idx_resource_templates_type"
  ON "resource-templates" ("resourceType");
CREATE INDEX IF NOT EXISTS "idx_resource_templates_creator"
  ON "resource-templates" ("createdBy");
CREATE INDEX IF NOT EXISTS "idx_resource_templates_public"
  ON "resource-templates" ("isPublic");
