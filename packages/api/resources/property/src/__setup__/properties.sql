CREATE TABLE IF NOT EXISTS "properties" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerId" TEXT,
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL UNIQUE,
  "description" TEXT,
  "type" VARCHAR(20) NOT NULL DEFAULT 'apartment',
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "addressLine1" VARCHAR(255) NOT NULL,
  "addressLine2" VARCHAR(255),
  "city" VARCHAR(120) NOT NULL,
  "region" VARCHAR(120),
  "postalCode" VARCHAR(32),
  "countryCode" VARCHAR(2) NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "unitCount" INTEGER NOT NULL DEFAULT 0,
  "coverImageUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deletedAt" TIMESTAMPTZ
);

-- Tenant-scoping: associate each property with the user who created it.
-- Added via ALTER for databases whose "properties" table predates this column.
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

CREATE INDEX IF NOT EXISTS "idx_properties_ownerId" ON "properties" ("ownerId");
CREATE INDEX IF NOT EXISTS "idx_properties_slug" ON "properties" ("slug");
CREATE INDEX IF NOT EXISTS "idx_properties_status" ON "properties" ("status") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_properties_type" ON "properties" ("type") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_properties_city" ON "properties" ("city") WHERE "deletedAt" IS NULL;

CREATE TABLE IF NOT EXISTS "property_units" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "propertyId" UUID NOT NULL REFERENCES "properties" ("id") ON DELETE CASCADE,
  "name" VARCHAR(120) NOT NULL,
  "description" TEXT,
  "floor" INTEGER,
  "bedrooms" INTEGER,
  "bathrooms" INTEGER,
  "maxOccupancy" INTEGER,
  "areaSquareMetres" DOUBLE PRECISION,
  "isAvailable" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_property_units_propertyId" ON "property_units" ("propertyId");

CREATE TABLE IF NOT EXISTS "property_photos" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "propertyId" UUID NOT NULL REFERENCES "properties" ("id") ON DELETE CASCADE,
  "url" TEXT NOT NULL,
  "caption" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_property_photos_propertyId" ON "property_photos" ("propertyId");

CREATE TABLE IF NOT EXISTS "property_amenities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "propertyId" UUID NOT NULL REFERENCES "properties" ("id") ON DELETE CASCADE,
  "code" VARCHAR(64) NOT NULL,
  "label" VARCHAR(160) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("propertyId", "code")
);

CREATE INDEX IF NOT EXISTS "idx_property_amenities_propertyId" ON "property_amenities" ("propertyId");
