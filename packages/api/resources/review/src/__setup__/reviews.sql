CREATE TABLE IF NOT EXISTS "reviews" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "resourceType" VARCHAR(255) NOT NULL,
  "resourceId" VARCHAR(255) NOT NULL,
  "userId" UUID NOT NULL,
  "rating" INTEGER NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
  "title" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "helpful" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("resourceType", "resourceId", "userId")
);

CREATE INDEX IF NOT EXISTS "idx_reviews_resource" ON "reviews" ("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_reviews_user" ON "reviews" ("userId");
CREATE INDEX IF NOT EXISTS "idx_reviews_rating" ON "reviews" ("resourceType", "resourceId", "rating");

CREATE TABLE IF NOT EXISTS "review_helpful" (
  "reviewId" UUID NOT NULL REFERENCES "reviews"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("reviewId", "userId")
);
