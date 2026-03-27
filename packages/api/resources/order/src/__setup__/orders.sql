CREATE TABLE IF NOT EXISTS "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "subtotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "tax" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "shipping" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "discount" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "total" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "shippingAddress" JSONB,
  "billingAddress" JSONB,
  "paymentId" VARCHAR(255),
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_orders_userId" ON "orders" ("userId");
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" ("status");
CREATE INDEX IF NOT EXISTS "idx_orders_createdAt" ON "orders" ("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL REFERENCES "orders" ("id") ON DELETE CASCADE,
  "productId" VARCHAR(255) NOT NULL,
  "variantId" VARCHAR(255),
  "name" VARCHAR(255) NOT NULL,
  "price" NUMERIC(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "image" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_order_items_orderId" ON "order_items" ("orderId");

CREATE TABLE IF NOT EXISTS "order_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL REFERENCES "orders" ("id") ON DELETE CASCADE,
  "status" VARCHAR(20) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_order_events_orderId" ON "order_events" ("orderId");
