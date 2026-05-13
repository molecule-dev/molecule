CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "project_id" uuid,
  "key" varchar(120) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "flag_type" varchar(32) NOT NULL DEFAULT 'boolean',
  "default_value" jsonb,
  "rollout_percentage" smallint NOT NULL DEFAULT 0,
  "is_enabled" boolean NOT NULL DEFAULT false,
  "state" varchar(20) NOT NULL DEFAULT 'off',
  "environment" varchar(64) NOT NULL DEFAULT 'production',
  "stale_days" smallint NOT NULL DEFAULT 30,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "updated_at" timestamptz NOT NULL DEFAULT current_timestamp,
  UNIQUE ("user_id", "project_id", "key", "environment")
);

CREATE INDEX IF NOT EXISTS "feature_flags_user_id_index" ON "feature_flags" ("user_id");
CREATE INDEX IF NOT EXISTS "feature_flags_project_id_index" ON "feature_flags" ("project_id");
CREATE INDEX IF NOT EXISTS "feature_flags_state_index" ON "feature_flags" ("state");
CREATE INDEX IF NOT EXISTS "feature_flags_environment_index" ON "feature_flags" ("environment");

CREATE TABLE IF NOT EXISTS "feature_flag_targeting_rules" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "flag_id" uuid NOT NULL REFERENCES "feature_flags"("id") ON DELETE CASCADE,
  "attribute" varchar(120) NOT NULL,
  "operator" varchar(40) NOT NULL,
  "value" jsonb,
  "serve_value" jsonb,
  "priority" integer NOT NULL DEFAULT 100,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "feature_flag_targeting_rules_flag_id_index" ON "feature_flag_targeting_rules" ("flag_id");
CREATE INDEX IF NOT EXISTS "feature_flag_targeting_rules_priority_index" ON "feature_flag_targeting_rules" ("priority");
