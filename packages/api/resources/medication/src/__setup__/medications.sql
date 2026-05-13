CREATE TABLE IF NOT EXISTS "medications" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "generic_name" varchar(255),
  "dosage" varchar(80) NOT NULL,
  "unit" varchar(40),
  "frequency" varchar(40) NOT NULL DEFAULT 'daily',
  "times_of_day" jsonb NOT NULL DEFAULT '[]',
  "start_date" date,
  "end_date" date,
  "notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "updated_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "medications_owner_id_index" ON "medications" ("owner_id");
CREATE INDEX IF NOT EXISTS "medications_is_active_index" ON "medications" ("is_active");

CREATE TABLE IF NOT EXISTS "medication_logs" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "medication_id" uuid NOT NULL REFERENCES "medications"("id") ON DELETE CASCADE,
  "owner_id" uuid NOT NULL,
  "taken_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "status" varchar(20) NOT NULL DEFAULT 'taken',
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "medication_logs_medication_id_index" ON "medication_logs" ("medication_id");
CREATE INDEX IF NOT EXISTS "medication_logs_owner_taken_at_index" ON "medication_logs" ("owner_id", "taken_at" DESC);
