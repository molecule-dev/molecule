-- Course resource schema.
--
-- Tables: courses, course_modules, course_module_items, course_enrollments.
-- The `org_id` column is set by the multi-tenancy bond at insert time; in
-- single-tenant deployments it can be a fixed platform-org id.

CREATE TABLE IF NOT EXISTS "courses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "slug" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "courses_org_slug_idx"
  ON "courses" ("org_id", "slug")
  WHERE "slug" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "courses_org_status_idx"
  ON "courses" ("org_id", "status");

CREATE TABLE IF NOT EXISTS "course_modules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "course_id" UUID NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "course_modules_course_idx"
  ON "course_modules" ("course_id", "sort_order");

CREATE TABLE IF NOT EXISTS "course_module_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "module_id" UUID NOT NULL REFERENCES "course_modules"("id") ON DELETE CASCADE,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "course_module_items_module_idx"
  ON "course_module_items" ("module_id", "sort_order");

CREATE TABLE IF NOT EXISTS "course_enrollments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "course_id" UUID NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL DEFAULT 'student',
  "status" TEXT NOT NULL DEFAULT 'active',
  "enrolled_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "course_enrollments_user_course_idx"
  ON "course_enrollments" ("user_id", "course_id");
CREATE INDEX IF NOT EXISTS "course_enrollments_course_role_idx"
  ON "course_enrollments" ("course_id", "role", "status");
