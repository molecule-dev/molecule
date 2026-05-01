CREATE TABLE IF NOT EXISTS "reputation_scores" (
  "userId" uuid PRIMARY KEY NOT NULL,
  "score" integer NOT NULL DEFAULT 0,
  "level" integer NOT NULL DEFAULT 0,
  "updatedAt" timestamptz NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS "reputation_scores_score_index" ON "reputation_scores" ("score");
CREATE INDEX IF NOT EXISTS "reputation_scores_level_index" ON "reputation_scores" ("level");
CREATE INDEX IF NOT EXISTS "reputation_scores_updatedAt_index" ON "reputation_scores" ("updatedAt");
