CREATE TABLE IF NOT EXISTS "services" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "createdAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "updatedAt" timestamptz DEFAULT current_timestamp NOT NULL,
  "name" varchar(255) NOT NULL,
  "url" text NOT NULL,
  "method" varchar(10) DEFAULT 'GET' NOT NULL,
  "expectedStatus" integer DEFAULT 200 NOT NULL,
  "timeoutMs" integer DEFAULT 10000 NOT NULL,
  "intervalMs" integer DEFAULT 60000 NOT NULL,
  "groupName" varchar(255),
  "enabled" boolean DEFAULT true NOT NULL
);
CREATE INDEX IF NOT EXISTS "services_name_index" ON "services" ("name");
CREATE INDEX IF NOT EXISTS "services_enabled_index" ON "services" ("enabled");
