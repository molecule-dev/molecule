CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "createdAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "updatedAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "userId" uuid NOT NULL,
  "transactionId" text,
  "productId" text,
  "platformKey" text,
  "data" jsonb,
  "receipt" text
);
CREATE INDEX IF NOT EXISTS "payments_createdAt_index" ON "payments" ("createdAt");
CREATE INDEX IF NOT EXISTS "payments_updatedAt_index" ON "payments" ("updatedAt");
CREATE INDEX IF NOT EXISTS "payments_userId_index" ON "payments" ("userId");
-- A platform transaction must bind to exactly ONE account (first-claim-wins).
-- This UNIQUE index is the race-safe backstop for receipt/subscription replay
-- (R2-1): a second account inserting the same (platformKey, transactionId)
-- fails, so it can never be granted the plan. Also serves the transactionId
-- lookup the plain index used to. NULL transactionIds are allowed/non-unique.
CREATE UNIQUE INDEX IF NOT EXISTS "payments_platformKey_transactionId_unique" ON "payments" ("platformKey", "transactionId");
CREATE INDEX IF NOT EXISTS "payments_productId_index" ON "payments" ("productId");
CREATE INDEX IF NOT EXISTS "payments_platformKey_index" ON "payments" ("platformKey");
