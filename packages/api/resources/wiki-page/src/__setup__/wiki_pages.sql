CREATE TABLE IF NOT EXISTS "wiki_spaces" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(120) NOT NULL UNIQUE,
  "is_public" boolean NOT NULL DEFAULT false,
  "visibility" varchar(20) NOT NULL DEFAULT 'private',
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "updated_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "wiki_spaces_owner_id_index" ON "wiki_spaces" ("owner_id");

CREATE TABLE IF NOT EXISTS "wiki_pages" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "space_id" uuid NOT NULL REFERENCES "wiki_spaces"("id") ON DELETE CASCADE,
  "parent_id" uuid REFERENCES "wiki_pages"("id") ON DELETE CASCADE,
  "slug" varchar(120) NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL DEFAULT '',
  "position" integer NOT NULL DEFAULT 0,
  "is_published" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "updated_at" timestamptz NOT NULL DEFAULT current_timestamp,
  UNIQUE ("space_id", "slug")
);

CREATE INDEX IF NOT EXISTS "wiki_pages_space_id_index" ON "wiki_pages" ("space_id");
CREATE INDEX IF NOT EXISTS "wiki_pages_parent_id_index" ON "wiki_pages" ("parent_id");
CREATE INDEX IF NOT EXISTS "wiki_pages_position_index" ON "wiki_pages" ("space_id", "position");
