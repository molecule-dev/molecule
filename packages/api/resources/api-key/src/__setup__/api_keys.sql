CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "userId" uuid NOT NULL,
  "name" text NOT NULL,
  "hashedToken" text UNIQUE NOT NULL,
  "masked" text NOT NULL,
  "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "lastUsedAt" timestamptz,
  "expiresAt" timestamptz,
  "revokedAt" timestamptz,
  "version" integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS "api_keys_userId_index" ON "api_keys" ("userId");
CREATE INDEX IF NOT EXISTS "api_keys_hashedToken_index" ON "api_keys" ("hashedToken");
CREATE INDEX IF NOT EXISTS "api_keys_revokedAt_index" ON "api_keys" ("revokedAt");
CREATE INDEX IF NOT EXISTS "api_keys_expiresAt_index" ON "api_keys" ("expiresAt");
