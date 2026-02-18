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
CREATE INDEX IF NOT EXISTS "payments_transactionId_index" ON "payments" ("transactionId");
CREATE INDEX IF NOT EXISTS "payments_productId_index" ON "payments" ("productId");
CREATE INDEX IF NOT EXISTS "payments_platformKey_index" ON "payments" ("platformKey");
