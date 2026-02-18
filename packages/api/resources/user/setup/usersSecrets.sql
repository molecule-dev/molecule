CREATE TABLE IF NOT EXISTS "usersSecrets" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "passwordHash" text,
  "passwordResetToken" text,
  "passwordResetTokenAt" timestamptz,
  "pendingTwoFactorSecret" text,
  "twoFactorSecret" text
);
