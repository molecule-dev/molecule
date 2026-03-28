CREATE TABLE IF NOT EXISTS "threads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR(500) NOT NULL,
  "creatorId" UUID NOT NULL,
  "resourceType" VARCHAR(255),
  "resourceId" VARCHAR(255),
  "closed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_threads_creator" ON "threads" ("creatorId");
CREATE INDEX IF NOT EXISTS "idx_threads_resource" ON "threads" ("resourceType", "resourceId");

CREATE TABLE IF NOT EXISTS "thread_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "threadId" UUID NOT NULL REFERENCES "threads"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "editedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_thread_messages_thread" ON "thread_messages" ("threadId");
CREATE INDEX IF NOT EXISTS "idx_thread_messages_user" ON "thread_messages" ("userId");

CREATE TABLE IF NOT EXISTS "thread_read_status" (
  "threadId" UUID NOT NULL REFERENCES "threads"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL,
  "lastReadMessageId" UUID NOT NULL REFERENCES "thread_messages"("id") ON DELETE CASCADE,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("threadId", "userId")
);
