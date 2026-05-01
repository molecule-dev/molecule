CREATE TABLE IF NOT EXISTS "room_types" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "propertyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "capacity" INTEGER NOT NULL,
  "baseRateCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "amenities" JSONB,
  "photos" JSONB,
  "totalUnits" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_room_types_propertyId" ON "room_types" ("propertyId");
CREATE INDEX IF NOT EXISTS "idx_room_types_active" ON "room_types" ("active");
CREATE INDEX IF NOT EXISTS "idx_room_types_capacity" ON "room_types" ("capacity");
