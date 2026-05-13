CREATE TABLE IF NOT EXISTS "meetings" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(20) NOT NULL DEFAULT 'scheduled',
  "scheduled_at" timestamptz,
  "started_at" timestamptz,
  "ended_at" timestamptz,
  "duration_seconds" integer NOT NULL DEFAULT 0,
  "recording_url" text,
  "transcript" text,
  "summary" text,
  "attendees" jsonb NOT NULL DEFAULT '[]',
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "updated_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "meetings_owner_id_index" ON "meetings" ("owner_id");
CREATE INDEX IF NOT EXISTS "meetings_status_index" ON "meetings" ("status");
CREATE INDEX IF NOT EXISTS "meetings_scheduled_at_index" ON "meetings" ("scheduled_at" DESC);

CREATE TABLE IF NOT EXISTS "meeting_action_items" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "meeting_id" uuid NOT NULL REFERENCES "meetings"("id") ON DELETE CASCADE,
  "description" text NOT NULL,
  "assignee" varchar(255),
  "due_date" date,
  "is_completed" boolean NOT NULL DEFAULT false,
  "source_excerpt" text,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "updated_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "meeting_action_items_meeting_id_index" ON "meeting_action_items" ("meeting_id");
