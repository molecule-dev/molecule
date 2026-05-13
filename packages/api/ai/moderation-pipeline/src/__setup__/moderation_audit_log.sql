CREATE TABLE IF NOT EXISTS "moderation_audit_log" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid,
  "content_excerpt" text NOT NULL,
  "decision" varchar(20) NOT NULL,
  "matched_category" varchar(40),
  "scores" jsonb NOT NULL DEFAULT '[]',
  "reasoning" text,
  "resource_type" varchar(80),
  "resource_id" varchar(255),
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "moderation_audit_log_owner_id_index" ON "moderation_audit_log" ("owner_id");
CREATE INDEX IF NOT EXISTS "moderation_audit_log_resource_index" ON "moderation_audit_log" ("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "moderation_audit_log_created_at_index" ON "moderation_audit_log" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "moderation_audit_log_decision_index" ON "moderation_audit_log" ("decision");
