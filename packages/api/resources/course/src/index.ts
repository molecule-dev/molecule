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
 * The package depends on `@molecule/api-database` (DataStore) — no raw SQL
 * is used in handler code. Wire any DataStore bond (PostgreSQL, MongoDB, etc.)
 * at app startup before invoking these functions.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './i18n.js'
export * from './service.js'
export * from './types.js'
