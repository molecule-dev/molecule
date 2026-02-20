CREATE TABLE IF NOT EXISTS "incidents" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "createdAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "updatedAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "serviceId" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
  "title" varchar(500) NOT NULL,
  "description" text,
  "severity" varchar(20) NOT NULL,
  "status" varchar(20) NOT NULL,
  "autoDetected" boolean DEFAULT false NOT NULL,
  "startedAt" timestamptz NOT NULL,
  "resolvedAt" timestamptz
);
CREATE INDEX IF NOT EXISTS "incidents_serviceId_index" ON "incidents" ("serviceId");
CREATE INDEX IF NOT EXISTS "incidents_status_index" ON "incidents" ("status");
CREATE INDEX IF NOT EXISTS "incidents_startedAt_index" ON "incidents" ("startedAt" DESC);
