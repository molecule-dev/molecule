CREATE TABLE IF NOT EXISTS "readings" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL,
  "sensor_id" varchar(120) NOT NULL,
  "metric" varchar(80) NOT NULL,
  "value" double precision NOT NULL,
  "unit" varchar(40),
  "recorded_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "metadata" jsonb
);

CREATE INDEX IF NOT EXISTS "readings_owner_sensor_metric_index" ON "readings" ("owner_id", "sensor_id", "metric");
CREATE INDEX IF NOT EXISTS "readings_recorded_at_index" ON "readings" ("recorded_at" DESC);
CREATE INDEX IF NOT EXISTS "readings_owner_metric_recorded_at_index" ON "readings" ("owner_id", "metric", "recorded_at" DESC);
