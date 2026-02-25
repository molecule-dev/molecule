CREATE TABLE IF NOT EXISTS "checks" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "serviceId" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
  "status" varchar(20) NOT NULL,
  "httpStatus" integer,
  "latencyMs" integer,
  "error" text,
  "checkedAt" timestamptz DEFAULT current_timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "checks_serviceId_index" ON "checks" ("serviceId");
CREATE INDEX IF NOT EXISTS "checks_checkedAt_index" ON "checks" ("checkedAt");
CREATE INDEX IF NOT EXISTS "checks_serviceId_checkedAt_index" ON "checks" ("serviceId", "checkedAt" DESC);
