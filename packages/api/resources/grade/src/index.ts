/**
 * Grade resource for molecule.dev.
 *
 * Stores per-student per-course assignment grades and computes course
 * averages, GPAs, and transcripts. Letter-grade resolution is driven by
 * an injected {@link GradeScale} so different institutions can use
 * different scales (4.0, 4.3, plus/minus, etc.). All user-facing text
 * is i18n-ready via the companion `@molecule/api-locales-resource-grade`
 * bond.
 *
 * @module
 * @example
 * ```typescript
 * import {
 *   routes,
 *   requestHandlerMap,
 *   getCourseAverage,
 *   getGpa,
 *   getTranscript,
 *   defaultGradeScale,
 * } from '@molecule/api-resource-grade'
 * ```
 *
 * @remarks
 * Table: `src/__setup__/grades.sql` creates `grades`. An mlcl-scaffolded API
 * replays `__setup__/*.sql` automatically on migrate; anywhere else run it
 * once — nothing at runtime creates it.
 *
 * **A grade row's `userId` is the STUDENT being graded, NOT the actor allowed
 * to edit it** — letting the row's owner mutate it would let students change
 * their own grades. Mutations (`POST/PATCH/DELETE /grades…`) are therefore
 * role-gated and DENY BY DEFAULT: the caller needs an admin session claim
 * (`isAdmin`, `role: 'admin'`, or a `grade:manage`/`admin` permissions claim)
 * or an `@molecule/api-permissions` grant (`manage grade`). Out of the box NO
 * ONE can write grades — grant your instructor/registrar role first; a 403
 * here means "grant the permission", never "remove the gate". The gate is
 * enforced both as the `requireAdmin` route middleware and inside every
 * mutation handler (fail-closed), so it holds even when routes are wired
 * without middlewares.
 *
 * Reads are self-or-admin: `GET /users/:userId/gpa` and `…/transcript` reject
 * callers whose session userId ≠ `:userId` unless they are a grade admin —
 * handlers read the authenticated user from `res.locals.session` (mount
 * behind your global auth middleware).
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks) against
 * the running API; adapt each item to this app's actual screens/roles and check
 * every box off one by one. A box you can't check is a real bug to fix, never a
 * skip. Note that out of the box NO ONE may write grades — first grant your
 * instructor/registrar role an admin session claim (isAdmin / role 'admin') or
 * an `@molecule/api-permissions` `manage grade` grant, else every POST/PATCH/
 * DELETE /grades correctly 403s and there is no instructor to test as.
 * - [ ] As that instructor, enter a grade for a student on an assignment
 *   (POST /grades with enrollmentId, assignmentId, the student's userId,
 *   courseId, scorePoints, maxPoints); it persists (201) and — signed in AS THAT
 *   STUDENT — the score and derived letter appear on their own grades view
 *   (GET /grades, GET /grades/:id).
 * - [ ] Score is range-validated: a negative scorePoints, a scorePoints above
 *   maxPoints, or maxPoints <= 0 is rejected (400 scoreOutOfRange /
 *   maxPointsPositive) and nothing is persisted — a student can never end up with
 *   an impossible negative or over-100% grade.
 * - [ ] Aggregates are RIGHT, not just present: a course average
 *   (GET /enrollments/:enrollmentId/grade-average) equals 100 * sum(scorePoints)
 *   / sum(maxPoints) — so a big exam outweighs a small quiz because points ARE
 *   the weight (there is no separate assignment-weight field) — and GPA
 *   (GET /users/:userId/gpa) is the mean of each course's letter-rung gpaPoints
 *   on the active scale (each course counts equally; not credit-hour weighted).
 *   An assignment with NO grade row is EXCLUDED from the average, never counted
 *   as zero (the defined policy); confirm adding then removing one grade moves
 *   the average accordingly.
 * - [ ] Editing a grade (PATCH /grades/:id) reflects immediately for the student
 *   and re-derives the letter/average, and updatedAt advances. (This resource
 *   stores no grader/updatedBy column — if your app audits WHO changed a grade,
 *   verify that trail too; if it doesn't, don't claim an audit that isn't
 *   modeled.)
 * - [ ] PRIVACY / AUTHORIZATION — a student sees ONLY their own grades: signed
 *   in as student A, GET /grades never returns another student's rows (an
 *   attacker-supplied ?userId= is ignored and force-scoped to A), and
 *   id-guessing another student's grade / GPA / transcript / course-average
 *   returns 403 (or 404), never their data.
 * - [ ] Only the instructor/course-staff may enter or edit: as a plain student,
 *   POST /grades (grading yourself or anyone else), PATCH /grades/:id to raise
 *   your own score, and DELETE /grades/:id all 403 through every exposed
 *   endpoint — a student can never write or alter a grade, only read their own.
 */

export * from './browser-guard.js'
export * from './aggregate.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './scale.js'
export * from './types.js'
