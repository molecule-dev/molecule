-- Tag order on an article: the column "article_tags"."position" keeps the order
-- the tags were given in, so a reader of the join table (a tag filter, an app's
-- own query) gets them in that order instead of the database's arbitrary row
-- order.
--
-- Why this is its own file: a database that already applied articles.sql never
-- re-runs it — "_molecule_migrations" records each setup file once — so the
-- column cannot be delivered by editing that file alone. This file is new, so it
-- runs on every database that has the table, whether it was created before or
-- after the column existed.
--
-- The CREATE repeats articles.sql's "article_tags" (see the test that keeps the
-- two in step). In a scaffolded app it is a no-op — articles.sql sorts first and
-- has already created the table, so the column below is what this file is for —
-- and it is what lets the scaffolding tool find the file at all: a setup file is
-- copied into a project through the table it declares.
CREATE TABLE IF NOT EXISTS "article_tags" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "articleId" UUID NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
  "tag" VARCHAR(100) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("articleId", "tag")
);

-- The upgrade for a database whose "article_tags" predates the column. Every
-- database bond accepts this form: Postgres and PGlite take the clause natively,
-- and the SQLite and MySQL bonds apply the statement only when the column is not
-- there yet.
ALTER TABLE "article_tags" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;
