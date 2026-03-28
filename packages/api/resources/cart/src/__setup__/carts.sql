CREATE TABLE IF NOT EXISTS "carts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "coupon" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "carts_userId_idx" ON "carts" ("userId");

CREATE TABLE IF NOT EXISTS "cart_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cartId" UUID NOT NULL REFERENCES "carts"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "name" TEXT NOT NULL,
  "price" NUMERIC(10, 2) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "image" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cart_items_cartId_idx" ON "cart_items" ("cartId");
