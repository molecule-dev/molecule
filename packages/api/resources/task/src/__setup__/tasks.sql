CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL,
  "parent_id" uuid,
  "title" varchar(1000) NOT NULL,
  "description" text,
  "priority" smallint NOT NULL DEFAULT 4,
  "due_date" date,
  "due_time" varchar(8),
  "recurrence_rule" varchar(255),
  "position" numeric NOT NULL DEFAULT 0,
  "is_completed" boolean NOT NULL DEFAULT false,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "updated_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "tasks_owner_id_index" ON "tasks" ("owner_id");
CREATE INDEX IF NOT EXISTS "tasks_parent_id_index" ON "tasks" ("parent_id");
CREATE INDEX IF NOT EXISTS "tasks_due_date_index" ON "tasks" ("due_date");
CREATE INDEX IF NOT EXISTS "tasks_is_completed_index" ON "tasks" ("is_completed");
CREATE INDEX IF NOT EXISTS "tasks_owner_completed_position_index" ON "tasks" ("owner_id", "is_completed", "position");
