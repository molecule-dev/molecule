-- Schema for @molecule/api-realtime-rooms.
--
-- Rooms are app-level pub/sub channels with persisted membership and
-- role-based authorisation. Membership rows fix the IDOR pattern in
-- flagship realtime apps: handlers MUST consult `realtime_room_members`
-- (via assertCanAct()) before broadcasting / subscribing.

CREATE TABLE IF NOT EXISTS "realtime_rooms" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "kind" VARCHAR(64) NOT NULL,
  "owner_id" UUID NOT NULL,
  "capacity" INTEGER,
  "join_code" VARCHAR(64),
  "is_public" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_realtime_rooms_kind" ON "realtime_rooms" ("kind");
CREATE INDEX IF NOT EXISTS "idx_realtime_rooms_owner" ON "realtime_rooms" ("owner_id");

CREATE TABLE IF NOT EXISTS "realtime_room_members" (
  "room_id" UUID NOT NULL REFERENCES "realtime_rooms" ("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL,
  "role" VARCHAR(16) NOT NULL CHECK ("role" IN ('host', 'guest')),
  "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("room_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_realtime_room_members_room"
  ON "realtime_room_members" ("room_id");
CREATE INDEX IF NOT EXISTS "idx_realtime_room_members_user"
  ON "realtime_room_members" ("user_id");
