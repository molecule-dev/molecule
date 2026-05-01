CREATE TABLE IF NOT EXISTS "subscribers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "topic" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "confirmToken" TEXT NOT NULL,
  "unsubscribeToken" TEXT NOT NULL,
  "metadata" JSONB,
  "confirmedAt" TIMESTAMPTZ,
  "unsubscribedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_subscribers_channel_address_topic"
  ON "subscribers" ("channel", "address", COALESCE("topic", ''));
CREATE UNIQUE INDEX IF NOT EXISTS "idx_subscribers_confirmToken" ON "subscribers" ("confirmToken");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_subscribers_unsubscribeToken"
  ON "subscribers" ("unsubscribeToken");
CREATE INDEX IF NOT EXISTS "idx_subscribers_status" ON "subscribers" ("status");
CREATE INDEX IF NOT EXISTS "idx_subscribers_topic" ON "subscribers" ("topic");
