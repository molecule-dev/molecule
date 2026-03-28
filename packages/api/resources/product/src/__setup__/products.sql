CREATE TABLE IF NOT EXISTS "products" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL UNIQUE,
  "description" TEXT,
  "price" BIGINT NOT NULL DEFAULT 0,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "imageUrl" TEXT,
  "sku" VARCHAR(100),
  "inventory" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deletedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_products_slug" ON "products" ("slug");
CREATE INDEX IF NOT EXISTS "idx_products_status" ON "products" ("status") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_products_sku" ON "products" ("sku") WHERE "sku" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "sku" VARCHAR(100),
  "price" BIGINT,
  "inventory" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_product_variants_productId" ON "product_variants" ("productId");
