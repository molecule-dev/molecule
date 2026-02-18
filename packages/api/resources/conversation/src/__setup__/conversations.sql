CREATE TABLE IF NOT EXISTS "conversations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "messages" JSONB NOT NULL DEFAULT '[]',
  "aiContext" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
