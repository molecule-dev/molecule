CREATE TABLE IF NOT EXISTS "bookings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "startTime" TIMESTAMPTZ NOT NULL,
  "endTime" TIMESTAMPTZ NOT NULL,
  "duration" INTEGER NOT NULL,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_bookings_userId" ON "bookings" ("userId");
CREATE INDEX IF NOT EXISTS "idx_bookings_resource" ON "bookings" ("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_bookings_status" ON "bookings" ("status");
CREATE INDEX IF NOT EXISTS "idx_bookings_startTime" ON "bookings" ("startTime");
