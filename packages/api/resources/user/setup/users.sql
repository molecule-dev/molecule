CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "createdAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "updatedAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "username" varchar(255) NOT NULL,
  "name" text,
  "email" varchar(1023) UNIQUE,
  "twoFactorEnabled" boolean DEFAULT false,
  "oauthServer" text,
  "oauthId" text,
  "oauthData" jsonb,
  "planKey" text,
  "planExpiresAt" timestamptz,
  "planAutoRenews" boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS "users_createdAt_index" ON "users" ("createdAt");
CREATE INDEX IF NOT EXISTS "users_updatedAt_index" ON "users" ("updatedAt");
CREATE INDEX IF NOT EXISTS "users_username_index" ON "users" ("username");
CREATE INDEX IF NOT EXISTS "users_email_index" ON "users" ("email");
