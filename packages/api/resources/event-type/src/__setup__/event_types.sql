CREATE TABLE IF NOT EXISTS "event_types" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL,
  "name" varchar(120) NOT NULL,
  "slug" varchar(80) NOT NULL UNIQUE,
  "description" text,
  "duration_minutes" integer NOT NULL DEFAULT 30,
  "location_kind" varchar(20) NOT NULL DEFAULT 'video',
  "location_value" jsonb,
  "buffer_before_minutes" integer NOT NULL DEFAULT 0,
  "buffer_after_minutes" integer NOT NULL DEFAULT 0,
  "min_notice_minutes" integer NOT NULL DEFAULT 240,
  "max_per_day" integer,
  "requires_confirmation" boolean NOT NULL DEFAULT false,
  "color" varchar(40),
  "is_active" boolean NOT NULL DEFAULT true,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "updated_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "event_types_owner_id_index" ON "event_types" ("owner_id");
CREATE INDEX IF NOT EXISTS "event_types_is_active_index" ON "event_types" ("is_active");

CREATE TABLE IF NOT EXISTS "availability_rules" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "day_of_week" smallint NOT NULL,
  "start_minute" integer NOT NULL,
  "end_minute" integer NOT NULL,
  "timezone" varchar(80) NOT NULL DEFAULT 'UTC',
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  CHECK ("day_of_week" >= 0 AND "day_of_week" <= 6),
  CHECK ("start_minute" >= 0 AND "start_minute" <= 1439),
  CHECK ("end_minute" > "start_minute" AND "end_minute" <= 1440)
);

CREATE INDEX IF NOT EXISTS "availability_rules_user_id_index" ON "availability_rules" ("user_id");
CREATE INDEX IF NOT EXISTS "availability_rules_day_of_week_index" ON "availability_rules" ("day_of_week");
