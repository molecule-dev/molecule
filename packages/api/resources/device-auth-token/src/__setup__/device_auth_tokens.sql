CREATE TABLE IF NOT EXISTS "device_auth_tokens" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "deviceId" uuid NOT NULL,
  "hashedToken" text UNIQUE NOT NULL,
  "masked" text NOT NULL,
  "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "lastUsedAt" timestamptz,
  "lastUsedIp" text,
  "expiresAt" timestamptz,
  "revokedAt" timestamptz,
  "version" integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS "device_auth_tokens_deviceId_index" ON "device_auth_tokens" ("deviceId");
CREATE INDEX IF NOT EXISTS "device_auth_tokens_hashedToken_index" ON "device_auth_tokens" ("hashedToken");
CREATE INDEX IF NOT EXISTS "device_auth_tokens_revokedAt_index" ON "device_auth_tokens" ("revokedAt");
CREATE INDEX IF NOT EXISTS "device_auth_tokens_expiresAt_index" ON "device_auth_tokens" ("expiresAt");
