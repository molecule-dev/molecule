-- Table for the notification-center database provider
-- (@molecule/api-notification-center-database). Column names are snake_case to
-- match that provider's contract: it create()s { user_id, type, title, body,
-- read, data, created_at } and findMany()s WHERE user_id / read / type ORDER BY
-- created_at, and maps rows back via row.user_id / row.created_at. A previous
-- stub shipped only id + camelCase "createdAt"/"updatedAt", so GET /api/notifications
-- 500'd at runtime ("column ... does not exist") on every out-of-the-box build.
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "data" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_idx" ON "notifications" ("user_id", "read");
