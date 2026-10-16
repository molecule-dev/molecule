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
-- The CREATE mirrors articles.sql's "article_tags" (see the test that keeps the
-- two in step). It is a no-op in a scaffolded app, where articles.sql runs
-- first, and states the table's shape for anything that applies this file on its
-- own — the scaffolding tool finds a setup file through the table it declares
-- here, and copies it into the project.
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
