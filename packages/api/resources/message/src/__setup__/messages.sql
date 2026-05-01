CREATE TABLE IF NOT EXISTS "message_threads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "participantAId" UUID NOT NULL,
  "participantBId" UUID NOT NULL,
  "lastMessageAt" TIMESTAMPTZ,
  "unreadCountA" INTEGER NOT NULL DEFAULT 0,
  "unreadCountB" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "message_threads_distinct_participants" CHECK ("participantAId" <> "participantBId"),
  CONSTRAINT "message_threads_canonical_order" CHECK ("participantAId" < "participantBId"),
  CONSTRAINT "message_threads_pair_unique" UNIQUE ("participantAId", "participantBId")
);

CREATE INDEX IF NOT EXISTS "idx_message_threads_a" ON "message_threads" ("participantAId");
CREATE INDEX IF NOT EXISTS "idx_message_threads_b" ON "message_threads" ("participantBId");
CREATE INDEX IF NOT EXISTS "idx_message_threads_last_message"
  ON "message_threads" ("lastMessageAt" DESC);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "threadId" UUID NOT NULL REFERENCES "message_threads"("id") ON DELETE CASCADE,
  "senderId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "attachments" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "editedAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_messages_thread_created"
  ON "messages" ("threadId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_messages_sender" ON "messages" ("senderId");
