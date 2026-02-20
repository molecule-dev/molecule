CREATE TABLE IF NOT EXISTS "uptimeWindows" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "serviceId" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
  "window" varchar(10) NOT NULL,
  "uptimePct" numeric(6,3) NOT NULL,
  "totalChecks" integer NOT NULL,
  "upChecks" integer NOT NULL,
  "avgLatencyMs" numeric(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS "uptimeWindows_serviceId_index" ON "uptimeWindows" ("serviceId");
CREATE UNIQUE INDEX IF NOT EXISTS "uptimeWindows_serviceId_window_index" ON "uptimeWindows" ("serviceId", "window");
