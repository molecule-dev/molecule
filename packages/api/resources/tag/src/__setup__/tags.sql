CREATE TABLE IF NOT EXISTS "tags" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(120) NOT NULL UNIQUE,
  "color" VARCHAR(7),
  "description" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "resource_tags" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tagId" UUID NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "resourceType" VARCHAR(50) NOT NULL,
  "resourceId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("tagId", "resourceType", "resourceId")
);

CREATE INDEX IF NOT EXISTS "idx_resource_tags_resource" ON "resource_tags"("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_resource_tags_tag" ON "resource_tags"("tagId");
CREATE INDEX IF NOT EXISTS "idx_tags_slug" ON "tags"("slug");
