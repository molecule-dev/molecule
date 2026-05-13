CREATE TABLE IF NOT EXISTS "forum_threads" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "author_id" uuid NOT NULL,
  "category_id" uuid,
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "slug" varchar(120) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'open',
  "is_pinned" boolean NOT NULL DEFAULT false,
  "vote_score" integer NOT NULL DEFAULT 0,
  "reply_count" integer NOT NULL DEFAULT 0,
  "view_count" integer NOT NULL DEFAULT 0,
  "last_activity_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "updated_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "forum_threads_author_id_index" ON "forum_threads" ("author_id");
CREATE INDEX IF NOT EXISTS "forum_threads_category_id_index" ON "forum_threads" ("category_id");
CREATE INDEX IF NOT EXISTS "forum_threads_status_index" ON "forum_threads" ("status");
CREATE INDEX IF NOT EXISTS "forum_threads_last_activity_index" ON "forum_threads" ("last_activity_at" DESC);
CREATE INDEX IF NOT EXISTS "forum_threads_vote_score_index" ON "forum_threads" ("vote_score" DESC);

CREATE TABLE IF NOT EXISTS "forum_replies" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL REFERENCES "forum_threads"("id") ON DELETE CASCADE,
  "parent_reply_id" uuid REFERENCES "forum_replies"("id") ON DELETE CASCADE,
  "author_id" uuid NOT NULL,
  "body" text NOT NULL,
  "vote_score" integer NOT NULL DEFAULT 0,
  "is_deleted" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  "updated_at" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "forum_replies_thread_id_index" ON "forum_replies" ("thread_id");
CREATE INDEX IF NOT EXISTS "forum_replies_parent_reply_id_index" ON "forum_replies" ("parent_reply_id");

CREATE TABLE IF NOT EXISTS "forum_votes" (
  "id" uuid UNIQUE PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "target_type" varchar(20) NOT NULL,
  "target_id" uuid NOT NULL,
  "value" smallint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT current_timestamp,
  UNIQUE ("user_id", "target_type", "target_id")
);

CREATE INDEX IF NOT EXISTS "forum_votes_target_index" ON "forum_votes" ("target_type", "target_id");
