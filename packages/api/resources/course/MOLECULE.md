# @molecule/api-resource-course

Course resource for molecule.dev.

Provides the course / module / module-item / enrollment data hierarchy plus
`assertCourseStaff` and `assertEnrolled` access helpers — the same checks
that previously lived inline as `_lmsAccess.ts` in the LMS flagship.

## Quick Start

```typescript
import {
  createCourse,
  createEnrollment,
  assertCourseStaff,
  assertEnrolled,
} from '@molecule/api-resource-course'

const course = await createCourse({
  org_id: orgId,
  title: 'Algebra 101',
  created_by: instructorId,
})

await createEnrollment({
  user_id: studentId,
  course_id: course.id,
  role: 'student',
})

// In a handler that mutates course content:
await assertCourseStaff(req.userId, course.id)
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-course @molecule/api-database @molecule/api-i18n @molecule/api-locales-resource-course @molecule/api-resource
```

## API

### Interfaces

#### `Course`

A course — the top-level container in the hierarchy.

```typescript
interface Course {
  /** Unique identifier (UUID). */
  id: string
  /** Owning organisation when multi-tenancy is enabled, otherwise the platform org id. */
  org_id: string
  /** Human-readable course title. */
  title: string
  /** Optional rich-text description of the course. */
  description: string | null
  /** Optional URL-friendly slug, unique within an org. */
  slug: string | null
  /** Course lifecycle: `draft` is invisible to students. */
  status: 'draft' | 'published' | 'archived'
  /** ID of the user who created the course (typically the lead instructor). */
  created_by: string
  /** ISO-8601 timestamp the course was created. */
  created_at: string
  /** ISO-8601 timestamp the course was last updated. */
  updated_at: string
}
```

#### `Enrollment`

An enrollment — a user's participation in a course in a given role.

```typescript
interface Enrollment {
  /** Unique identifier (UUID). */
  id: string
  /** Enrolled user id. */
  user_id: string
  /** Course the user is enrolled in. */
  course_id: string
  /** Role the user holds in this course. */
  role: EnrollmentRole
  /** Enrollment lifecycle status. */
  status: EnrollmentStatus
  /** ISO-8601 timestamp the user was enrolled. */
  enrolled_at: string
  /** ISO-8601 timestamp the enrollment was last updated. */
  updated_at: string
}
```

#### `Module`

A module — an ordered grouping of items within a course.

```typescript
interface Module {
  /** Unique identifier (UUID). */
  id: string
  /** Owning course id. */
  course_id: string
  /** Human-readable module title. */
  title: string
  /** Sort order within the course; lower comes first. */
  sort_order: number
  /** ISO-8601 timestamp the module was created. */
  created_at: string
  /** ISO-8601 timestamp the module was last updated. */
  updated_at: string
}
```

#### `ModuleItem`

A module item — an individual content block (video, reading, quiz, assignment).

The `payload` shape varies by `kind` and is stored as opaque JSON; consumers
are expected to validate it according to their domain (a quiz package, a
video package, etc.).

```typescript
interface ModuleItem {
  /** Unique identifier (UUID). */
  id: string
  /** Owning module id. */
  module_id: string
  /** Kind of content block. */
  kind: ModuleItemKind
  /** Opaque payload — shape determined by `kind`. */
  payload: unknown
  /** Sort order within the module; lower comes first. */
  sort_order: number
  /** ISO-8601 timestamp the item was created. */
  created_at: string
  /** ISO-8601 timestamp the item was last updated. */
  updated_at: string
}
```

### Types

#### `CreateCourseInput`

Input shape for {@link createCourse}.

```typescript
type CreateCourseInput = Pick<Course, 'org_id' | 'title' | 'created_by'> &
  Partial<Pick<Course, 'description' | 'slug' | 'status'>>
```

#### `CreateEnrollmentInput`

Input shape for {@link createEnrollment}.

```typescript
type CreateEnrollmentInput = Pick<Enrollment, 'user_id' | 'course_id' | 'role'> &
  Partial<Pick<Enrollment, 'status'>>
```

#### `CreateModuleInput`

Input shape for {@link createModule}.

```typescript
type CreateModuleInput = Pick<Module, 'course_id' | 'title' | 'sort_order'>
```

#### `CreateModuleItemInput`

Input shape for {@link createModuleItem}.

```typescript
type CreateModuleItemInput = Pick<
  ModuleItem,
  'module_id' | 'kind' | 'payload' | 'sort_order'
>
```

#### `EnrollmentRole`

Roles a user may hold within a single course enrollment.

`instructor` and `ta` are course staff and may modify course content.
`student` and `observer` are read-only consumers.

```typescript
type EnrollmentRole = 'student' | 'instructor' | 'ta' | 'observer'
```

#### `EnrollmentStatus`

Lifecycle states for a course enrollment.

```typescript
type EnrollmentStatus = 'active' | 'invited' | 'completed' | 'dropped'
```

#### `ModuleItemKind`

Supported kinds for content blocks within a module.

Concrete payload shapes are stored as opaque JSON keyed by the kind so the
package stays decoupled from any particular media implementation.

```typescript
type ModuleItemKind = 'video' | 'reading' | 'quiz' | 'assignment'
```

#### `UpdateCourseInput`

Input shape for course updates.

```typescript
type UpdateCourseInput = Partial<Pick<Course, 'title' | 'description' | 'slug' | 'status'>>
```

#### `UpdateEnrollmentInput`

Input shape for enrollment updates.

```typescript
type UpdateEnrollmentInput = Partial<Pick<Enrollment, 'role' | 'status'>>
```

#### `UpdateModuleInput`

Input shape for module updates.

```typescript
type UpdateModuleInput = Partial<Pick<Module, 'title' | 'sort_order'>>
```

#### `UpdateModuleItemInput`

Input shape for module-item updates.

```typescript
type UpdateModuleItemInput = Partial<Pick<ModuleItem, 'kind' | 'payload' | 'sort_order'>>
```

### Classes

#### `CourseNotFoundError`

Error thrown when a course referenced by id does not exist.

Carries the requested course id and the i18n key callers should display
(defaults are pre-populated for the framework-default locale).

#### `NotCourseStaffError`

Error thrown when a user is not course staff (instructor or active TA).

#### `NotEnrolledError`

Error thrown when a user is not actively enrolled in a course.

### Functions

#### `assertCourseStaff(userId, courseId)`

Asserts the user is course staff. Throws when the course is missing or
the user does not hold a staff role.

```typescript
function assertCourseStaff(userId: string, courseId: string): Promise<void>
```

- `userId` — The user id.
- `courseId` — The course id.

#### `assertEnrolled(userId, courseId)`

Asserts the user is actively enrolled in the course (any role). Throws
when the course is missing or the user has no active enrollment.

```typescript
function assertEnrolled(userId: string, courseId: string): Promise<void>
```

- `userId` — The user id.
- `courseId` — The course id.

#### `createCourse(input)`

Creates a new course.

```typescript
function createCourse(input: CreateCourseInput): Promise<Course>
```

- `input` — Required course fields plus optional description / slug / status.

**Returns:** The persisted course record.

#### `createEnrollment(input)`

Creates an enrollment. Idempotent — when a row already exists for the
(`user_id`, `course_id`) pair the existing record is returned unchanged.

```typescript
function createEnrollment(input: CreateEnrollmentInput): Promise<Enrollment>
```

- `input` — Enrollment fields.

**Returns:** The new or existing enrollment.

#### `createModule(input)`

Creates a module within a course.

```typescript
function createModule(input: CreateModuleInput): Promise<Module>
```

- `input` — Required module fields.

**Returns:** The persisted module.

#### `createModuleItem(input)`

Creates a module item.

```typescript
function createModuleItem(input: CreateModuleItemInput): Promise<ModuleItem>
```

- `input` — Required module-item fields.

**Returns:** The persisted module item.

#### `deleteCourse(courseId)`

Deletes a course by id.

```typescript
function deleteCourse(courseId: string): Promise<boolean>
```

- `courseId` — The course id.

**Returns:** `true` if a row was deleted.

#### `deleteEnrollment(enrollmentId)`

Deletes an enrollment by id.

```typescript
function deleteEnrollment(enrollmentId: string): Promise<boolean>
```

- `enrollmentId` — The enrollment id.

**Returns:** `true` if a row was deleted.

#### `deleteModule(moduleId)`

Deletes a module.

```typescript
function deleteModule(moduleId: string): Promise<boolean>
```

- `moduleId` — The module id.

**Returns:** `true` if a row was deleted.

#### `deleteModuleItem(itemId)`

Deletes a module item.

```typescript
function deleteModuleItem(itemId: string): Promise<boolean>
```

- `itemId` — The item id.

**Returns:** `true` if a row was deleted.

#### `getCourse(courseId)`

Reads a course by id.

```typescript
function getCourse(courseId: string): Promise<Course | null>
```

- `courseId` — The course id.

**Returns:** The course, or `null` when no such course exists.

#### `getEnrollment(userId, courseId)`

Reads a user's enrollment in a course (if any).

```typescript
function getEnrollment(userId: string, courseId: string): Promise<Enrollment | null>
```

- `userId` — The user id.
- `courseId` — The course id.

**Returns:** The enrollment, or `null` when the user is not enrolled.

#### `getModule(moduleId)`

Reads a module by id.

```typescript
function getModule(moduleId: string): Promise<Module | null>
```

- `moduleId` — The module id.

**Returns:** The module, or `null` when missing.

#### `getModuleItem(itemId)`

Reads a module item by id.

```typescript
function getModuleItem(itemId: string): Promise<ModuleItem | null>
```

- `itemId` — The item id.

**Returns:** The module item, or `null` when missing.

#### `isCourseStaff(userId, courseId)`

True when the user is the course's lead instructor or an active staff
enrollment (instructor or TA).

```typescript
function isCourseStaff(userId: string, courseId: string): Promise<boolean>
```

- `userId` — The user id.
- `courseId` — The course id.

**Returns:** Whether the user is course staff.

#### `isEnrolled(userId, courseId)`

True when the user has any active enrollment in the course (any role).

```typescript
function isEnrolled(userId: string, courseId: string): Promise<boolean>
```

- `userId` — The user id.
- `courseId` — The course id.

**Returns:** Whether the user is enrolled.

#### `listCourses(orgId, options)`

Lists courses for an org, ordered most-recent first.

```typescript
function listCourses(orgId: string, options?: { limit?: number; offset?: number; status?: Course["status"]; }): Promise<{ data: Course[]; total: number; limit: number; offset: number; }>
```

- `orgId` — The owning org id.
- `options` — Optional pagination and status filter.
- `options.limit` — Maximum number of results (default 20).
- `options.offset` — Number of results to skip (default 0).
- `options.status` — Restrict to courses with this lifecycle status.

**Returns:** Paginated courses.

#### `listEnrollments(courseId, options)`

Lists enrollments in a course, optionally filtered by role.

```typescript
function listEnrollments(courseId: string, options?: { role?: Enrollment["role"]; status?: Enrollment["status"]; }): Promise<Enrollment[]>
```

- `courseId` — The course id.
- `options` — Optional role filter.
- `options.role` — Restrict to enrollments with this role.
- `options.status` — Restrict to enrollments with this lifecycle status.

**Returns:** The enrollments.

#### `listModuleItems(moduleId)`

Lists module items for a module in `sort_order` ascending.

```typescript
function listModuleItems(moduleId: string): Promise<ModuleItem[]>
```

- `moduleId` — The owning module id.

**Returns:** The module items.

#### `listModules(courseId)`

Lists modules for a course in `sort_order` ascending.

```typescript
function listModules(courseId: string): Promise<Module[]>
```

- `courseId` — The owning course id.

**Returns:** The modules.

#### `requireCourse(courseId)`

Reads a course by id, throwing {@link CourseNotFoundError} when missing.

```typescript
function requireCourse(courseId: string): Promise<Course>
```

- `courseId` — The course id.

**Returns:** The course.

#### `updateCourse(courseId, patch)`

Updates a course.

```typescript
function updateCourse(courseId: string, patch: Partial<Pick<Course, "title" | "description" | "slug" | "status">>): Promise<Course | null>
```

- `courseId` — The course id.
- `patch` — Partial fields to update.

**Returns:** The updated course, or `null` when not found.

#### `updateEnrollment(enrollmentId, patch)`

Updates an enrollment.

```typescript
function updateEnrollment(enrollmentId: string, patch: Partial<Pick<Enrollment, "status" | "role">>): Promise<Enrollment | null>
```

- `enrollmentId` — The enrollment id.
- `patch` — Partial fields to update.

**Returns:** The updated enrollment, or `null` when not found.

#### `updateModule(moduleId, patch)`

Updates a module.

```typescript
function updateModule(moduleId: string, patch: Partial<Pick<Module, "title" | "sort_order">>): Promise<Module | null>
```

- `moduleId` — The module id.
- `patch` — Partial fields to update.

**Returns:** The updated module, or `null` when not found.

#### `updateModuleItem(itemId, patch)`

Updates a module item.

```typescript
function updateModuleItem(itemId: string, patch: Partial<Pick<ModuleItem, "sort_order" | "kind" | "payload">>): Promise<ModuleItem | null>
```

- `itemId` — The item id.
- `patch` — Partial fields to update.

**Returns:** The updated module item, or `null` when not found.

### Constants

#### `COURSE_ENROLLMENTS_TABLE`

Database table for {@link Enrollment} records.

```typescript
const COURSE_ENROLLMENTS_TABLE: "course_enrollments"
```

#### `COURSE_MODULE_ITEMS_TABLE`

Database table for {@link ModuleItem} records.

```typescript
const COURSE_MODULE_ITEMS_TABLE: "course_module_items"
```

#### `COURSE_MODULES_TABLE`

Database table for {@link Module} records.

```typescript
const COURSE_MODULES_TABLE: "course_modules"
```

#### `COURSES_TABLE`

Database table for {@link Course} records.

```typescript
const COURSES_TABLE: "courses"
```

#### `i18nRegistered`

Set to `true` once the locale module has been registered.

```typescript
const i18nRegistered: true
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-resource-course` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-resource-course`
- `@molecule/api-resource`

- **Migration required.** `src/__setup__/courses.sql` ships with this package
  (tables `courses`, `course_modules`, `course_module_items`,
  `course_enrollments`) and must exist in the target database before use
  (scaffolded apps apply it automatically; existing apps must apply it first).
- **Service-only package — no routes or handlers ship.** You own the HTTP
  surface: authenticate every endpoint and enforce access SERVER-SIDE with the
  helpers — `assertCourseStaff(userId, courseId)` before any content mutation,
  `assertEnrolled(userId, courseId)` before member-only reads. Client-side
  gating alone is not access control.
- **The assert helpers THROW typed errors** (`CourseNotFoundError`,
  `NotCourseStaffError`, `NotEnrolledError`) — map them to 404/403 in your
  handlers instead of letting them bubble as 500s.
- **Enrollments are the whole ACL.** Staff = the course's `created_by` OR an
  ACTIVE enrollment with role `instructor`/`ta`; `assertEnrolled` requires
  `status: 'active'` (any role). Create enrollments with the right
  `role`/`status` — there is no separate permissions table.
- Persistence goes through the abstract `@molecule/api-database` DataStore —
  wire any database bond at startup before calling these functions.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual course/enrollment screens, and check every
box off one by one. A box you can't check is an integration bug to fix — not
a skip. Ground every check in the REAL model (course status
draft/published/archived; enrollment role student/instructor/ta/observer and
status active/invited/completed/dropped; content = modules -> module items of
kind video/reading/quiz/assignment) — never a field the interface lacks:
- [ ] An instructor CREATING a course persists its real fields (title,
  description, and its modules + module items) and the course then appears in
  the instructor's own list at the exact title/structure entered — not
  renamed, not missing its modules.
- [ ] Only PUBLISHED courses are visible to students: a course left `draft`
  is hidden from the student catalog and cannot be enrolled in (enrolling in
  a draft is rejected), while publishing it (status -> published) makes it
  appear and become enrollable. An archived course likewise drops out of the
  catalog.
- [ ] A student ENROLLING in a published course gains access to its content
  and the enrollment is recorded once — a role `student`, status `active`
  row keyed to that (user, course); re-enrolling is idempotent (no duplicate
  enrollment), and the student can now read the modules/items they could not
  see before.
- [ ] PROGRESS tracking advances correctly as the student completes lessons:
  finishing 2 of 4 module items reads 50% (progress is a fraction of the
  course's real item count, never a hardcoded number), and completing every
  item flips the enrollment to status `completed` (issuing a certificate if
  the app models one). Progress only moves by actually completing items — a
  student cannot self-mark `completed` without doing the lessons.
- [ ] Un-enrolled / gated access is denied SERVER-SIDE: a student with no
  active enrollment who requests the course's member-only (paid/gated)
  content is rejected 403 (assertEnrolled -> NotEnrolledError), never served
  the gated lessons by client-side hiding alone; a `dropped`/`invited`
  enrollment is not `active` and is treated as un-enrolled.
- [ ] AUTHORIZATION (staff) — only the course owner (`created_by`) or an
  active instructor/ta may edit content, publish/unpublish, delete the
  course, or view the enrollment roster: a student or observer attempting any
  of these is denied 403 (assertCourseStaff -> NotCourseStaffError), and a
  missing course id returns 404 (CourseNotFoundError), not a 500.
- [ ] AUTHORIZATION (per-student) — enrollment and progress are scoped to the
  session user: the enrollment/progress a student sees is their OWN, and
  reading or mutating another student's enrollment/progress by guessing its
  id is denied 403 — a caller can never enroll, advance, or complete on
  behalf of another user (the subject is the session, never the request body).

## Translations

Translation strings are provided by `@molecule/api-locales-resource-course`.
