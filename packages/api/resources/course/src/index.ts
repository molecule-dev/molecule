/**
 * Course resource for molecule.dev.
 *
 * Provides the course / module / module-item / enrollment data hierarchy plus
 * `assertCourseStaff` and `assertEnrolled` access helpers — the same checks
 * that previously lived inline as `_lmsAccess.ts` in the LMS flagship.
 *
 * @example
 * ```typescript
 * import {
 *   createCourse,
 *   createEnrollment,
 *   assertCourseStaff,
 *   assertEnrolled,
 * } from '@molecule/api-resource-course'
 *
 * const course = await createCourse({
 *   org_id: orgId,
 *   title: 'Algebra 101',
 *   created_by: instructorId,
 * })
 *
 * await createEnrollment({
 *   user_id: studentId,
 *   course_id: course.id,
 *   role: 'student',
 * })
 *
 * // In a handler that mutates course content:
 * await assertCourseStaff(req.userId, course.id)
 * ```
 *
 * @remarks
 * - **Migration required.** `src/__setup__/courses.sql` ships with this package
 *   (tables `courses`, `course_modules`, `course_module_items`,
 *   `course_enrollments`) and must exist in the target database before use
 *   (scaffolded apps apply it automatically; existing apps must apply it first).
 * - **Service-only package — no routes or handlers ship.** You own the HTTP
 *   surface: authenticate every endpoint and enforce access SERVER-SIDE with the
 *   helpers — `assertCourseStaff(userId, courseId)` before any content mutation,
 *   `assertEnrolled(userId, courseId)` before member-only reads. Client-side
 *   gating alone is not access control.
 * - **The assert helpers THROW typed errors** (`CourseNotFoundError`,
 *   `NotCourseStaffError`, `NotEnrolledError`) — map them to 404/403 in your
 *   handlers instead of letting them bubble as 500s.
 * - **Enrollments are the whole ACL.** Staff = the course's `created_by` OR an
 *   ACTIVE enrollment with role `instructor`/`ta`; `assertEnrolled` requires
 *   `status: 'active'` (any role). Create enrollments with the right
 *   `role`/`status` — there is no separate permissions table.
 * - Persistence goes through the abstract `@molecule/api-database` DataStore —
 *   wire any database bond at startup before calling these functions.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual course/enrollment screens, and check every
 * box off one by one. A box you can't check is an integration bug to fix — not
 * a skip. Ground every check in the REAL model (course status
 * draft/published/archived; enrollment role student/instructor/ta/observer and
 * status active/invited/completed/dropped; content = modules -> module items of
 * kind video/reading/quiz/assignment) — never a field the interface lacks:
 * - [ ] An instructor CREATING a course persists its real fields (title,
 *   description, and its modules + module items) and the course then appears in
 *   the instructor's own list at the exact title/structure entered — not
 *   renamed, not missing its modules.
 * - [ ] Only PUBLISHED courses are visible to students: a course left `draft`
 *   is hidden from the student catalog and cannot be enrolled in (enrolling in
 *   a draft is rejected), while publishing it (status -> published) makes it
 *   appear and become enrollable. An archived course likewise drops out of the
 *   catalog.
 * - [ ] A student ENROLLING in a published course gains access to its content
 *   and the enrollment is recorded once — a role `student`, status `active`
 *   row keyed to that (user, course); re-enrolling is idempotent (no duplicate
 *   enrollment), and the student can now read the modules/items they could not
 *   see before.
 * - [ ] PROGRESS tracking advances correctly as the student completes lessons:
 *   finishing 2 of 4 module items reads 50% (progress is a fraction of the
 *   course's real item count, never a hardcoded number), and completing every
 *   item flips the enrollment to status `completed` (issuing a certificate if
 *   the app models one). Progress only moves by actually completing items — a
 *   student cannot self-mark `completed` without doing the lessons.
 * - [ ] Un-enrolled / gated access is denied SERVER-SIDE: a student with no
 *   active enrollment who requests the course's member-only (paid/gated)
 *   content is rejected 403 (assertEnrolled -> NotEnrolledError), never served
 *   the gated lessons by client-side hiding alone; a `dropped`/`invited`
 *   enrollment is not `active` and is treated as un-enrolled.
 * - [ ] AUTHORIZATION (staff) — only the course owner (`created_by`) or an
 *   active instructor/ta may edit content, publish/unpublish, delete the
 *   course, or view the enrollment roster: a student or observer attempting any
 *   of these is denied 403 (assertCourseStaff -> NotCourseStaffError), and a
 *   missing course id returns 404 (CourseNotFoundError), not a 500.
 * - [ ] AUTHORIZATION (per-student) — enrollment and progress are scoped to the
 *   session user: the enrollment/progress a student sees is their OWN, and
 *   reading or mutating another student's enrollment/progress by guessing its
 *   id is denied 403 — a caller can never enroll, advance, or complete on
 *   behalf of another user (the subject is the session, never the request body).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './i18n.js'
export * from './service.js'
export * from './types.js'
