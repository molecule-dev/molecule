CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid UNIQUE PRIMARY KEY NOT NULL,
  "actor" text NOT NULL,
  "action" text NOT NULL,
  "resource" text NOT NULL,
  "resource_id" text,
  "details" text,
  "ip" text,
  "user_agent" text,
  "timestamp" timestamptz DEFAULT current_timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "audit_log_actor_index" ON "audit_log" ("actor");
CREATE INDEX IF NOT EXISTS "audit_log_action_index" ON "audit_log" ("action");
CREATE INDEX IF NOT EXISTS "audit_log_resource_index" ON "audit_log" ("resource");
CREATE INDEX IF NOT EXISTS "audit_log_timestamp_index" ON "audit_log" ("timestamp");
