CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerId" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deletedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_workspaces_owner" ON "workspaces" ("ownerId");
CREATE INDEX IF NOT EXISTS "idx_workspaces_slug" ON "workspaces" ("slug");

CREATE TABLE IF NOT EXISTS "workspace_members" (
  "workspaceId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" VARCHAR(16) NOT NULL,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("workspaceId", "userId")
);

CREATE INDEX IF NOT EXISTS "idx_workspace_members_user" ON "workspace_members" ("userId");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_workspace" ON "workspace_members" ("workspaceId");

CREATE TABLE IF NOT EXISTS "workspace_invites" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "role" VARCHAR(16) NOT NULL,
  "token" VARCHAR(128) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "acceptedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_workspace_invites_workspace" ON "workspace_invites" ("workspaceId");
CREATE INDEX IF NOT EXISTS "idx_workspace_invites_email" ON "workspace_invites" ("email");
CREATE INDEX IF NOT EXISTS "idx_workspace_invites_token" ON "workspace_invites" ("token");
