CREATE TABLE IF NOT EXISTS "inventory_stock" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "total" INTEGER NOT NULL DEFAULT 0,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("productId", "variantId")
);

CREATE TABLE IF NOT EXISTS "inventory_reservations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "quantity" INTEGER NOT NULL,
  "orderId" TEXT NOT NULL,
  -- The authenticated user who created this reservation. Bound at reserve time
  -- so release/confirm can verify ownership (owner or admin) — a reservation is
  -- tied to a caller's cart/order, not the shared catalog.
  "userId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "inventory_movements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT,
  "referenceId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
