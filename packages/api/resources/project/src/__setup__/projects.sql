CREATE TABLE IF NOT EXISTS "projects" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "projectType" TEXT NOT NULL DEFAULT 'api',
  "framework" TEXT,
  "packages" JSONB NOT NULL DEFAULT '[]',
  "envVars" JSONB NOT NULL DEFAULT '{}',
  "sandboxId" TEXT,
  "sandboxStatus" TEXT DEFAULT 'stopped',
  "lastActiveAt" TIMESTAMPTZ,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
