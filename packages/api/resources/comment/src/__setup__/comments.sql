CREATE TABLE IF NOT EXISTS "comments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "resourceType" VARCHAR(255) NOT NULL,
  "resourceId" VARCHAR(255) NOT NULL,
  "userId" UUID NOT NULL,
  "parentId" UUID REFERENCES "comments"("id") ON DELETE CASCADE,
  "body" TEXT NOT NULL,
  "editedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_comments_resource" ON "comments" ("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_comments_parent" ON "comments" ("parentId");
CREATE INDEX IF NOT EXISTS "idx_comments_user" ON "comments" ("userId");
