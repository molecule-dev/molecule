CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "providerCustomerId" TEXT NOT NULL,
  "providerPaymentMethodId" TEXT NOT NULL,
  "last4" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "expMonth" INTEGER NOT NULL,
  "expYear" INTEGER NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payment_methods_userId_idx" ON "payment_methods" ("userId");
CREATE INDEX IF NOT EXISTS "payment_methods_provider_idx" ON "payment_methods" ("provider");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_providerPaymentMethodId_idx"
  ON "payment_methods" ("providerPaymentMethodId");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_userId_default_idx"
  ON "payment_methods" ("userId") WHERE "isDefault" = true;
