CREATE TABLE IF NOT EXISTS "bookmarks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "resourceType" VARCHAR(255) NOT NULL,
  "resourceId" VARCHAR(255) NOT NULL,
  "folder" VARCHAR(255),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("userId", "resourceType", "resourceId")
);

CREATE INDEX IF NOT EXISTS "idx_bookmarks_user" ON "bookmarks" ("userId");
CREATE INDEX IF NOT EXISTS "idx_bookmarks_resource" ON "bookmarks" ("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_bookmarks_folder" ON "bookmarks" ("userId", "folder");
