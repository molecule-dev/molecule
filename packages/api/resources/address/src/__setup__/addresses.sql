CREATE TABLE IF NOT EXISTS "addresses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "label" VARCHAR(100),
  "recipientName" VARCHAR(255) NOT NULL,
  "line1" VARCHAR(255) NOT NULL,
  "line2" VARCHAR(255),
  "city" VARCHAR(255) NOT NULL,
  "region" VARCHAR(255),
  "postalCode" VARCHAR(32) NOT NULL,
  "countryIso" CHAR(2) NOT NULL,
  "phone" VARCHAR(64),
  "isDefaultShipping" BOOLEAN NOT NULL DEFAULT FALSE,
  "isDefaultBilling" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_addresses_user" ON "addresses" ("userId");
CREATE INDEX IF NOT EXISTS "idx_addresses_user_default_shipping"
  ON "addresses" ("userId") WHERE "isDefaultShipping" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_addresses_user_default_billing"
  ON "addresses" ("userId") WHERE "isDefaultBilling" = TRUE;
