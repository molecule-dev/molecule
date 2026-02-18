CREATE TABLE IF NOT EXISTS "devices" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "createdAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "updatedAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "userId" uuid NOT NULL,
  "name" text,
  "pushPlatform" text,
  "pushSubscription" jsonb,
  "hasPushSubscription" boolean
);
CREATE INDEX IF NOT EXISTS "devices_createdAt_index" ON "devices" ("createdAt");
CREATE INDEX IF NOT EXISTS "devices_updatedAt_index" ON "devices" ("updatedAt");
CREATE INDEX IF NOT EXISTS "devices_userId_index" ON "devices" ("userId");
