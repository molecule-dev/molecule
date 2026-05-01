CREATE TABLE IF NOT EXISTS "grades" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "enrollmentId" UUID NOT NULL,
  "assignmentId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "courseId" UUID NOT NULL,
  "scorePoints" DOUBLE PRECISION NOT NULL,
  "maxPoints" DOUBLE PRECISION NOT NULL,
  "letter" VARCHAR(8),
  "comment" TEXT,
  "postedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("enrollmentId", "assignmentId")
);

CREATE INDEX IF NOT EXISTS "idx_grades_enrollmentId" ON "grades" ("enrollmentId");
CREATE INDEX IF NOT EXISTS "idx_grades_userId" ON "grades" ("userId");
CREATE INDEX IF NOT EXISTS "idx_grades_courseId" ON "grades" ("courseId");
CREATE INDEX IF NOT EXISTS "idx_grades_assignmentId" ON "grades" ("assignmentId");
