CREATE TABLE IF NOT EXISTS "articles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" VARCHAR(255) NOT NULL UNIQUE,
  "title" VARCHAR(300) NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "body" TEXT NOT NULL,
  "tagList" TEXT NOT NULL DEFAULT '[]',
  "authorId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_articles_author" ON "articles" ("authorId");
CREATE INDEX IF NOT EXISTS "idx_articles_created" ON "articles" ("createdAt");

CREATE TABLE IF NOT EXISTS "article_tags" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "articleId" UUID NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
  "tag" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("articleId", "tag")
);

CREATE INDEX IF NOT EXISTS "idx_article_tags_tag" ON "article_tags" ("tag");
