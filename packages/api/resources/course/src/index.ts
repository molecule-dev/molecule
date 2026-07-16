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
 * @module
 */

export * from './browser-guard.js'
export * from './i18n.js'
export * from './service.js'
export * from './types.js'
