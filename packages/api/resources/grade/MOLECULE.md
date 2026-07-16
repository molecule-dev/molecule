# @molecule/api-resource-grade

Grade resource for molecule.dev.

Stores per-student per-course assignment grades and computes course
averages, GPAs, and transcripts. Letter-grade resolution is driven by
an injected {@link GradeScale} so different institutions can use
different scales (4.0, 4.3, plus/minus, etc.). All user-facing text
is i18n-ready via the companion `@molecule/api-locales-resource-grade`
bond.

## Quick Start

```typescript
import {
  routes,
  requestHandlerMap,
  getCourseAverage,
  getGpa,
  getTranscript,
  defaultGradeScale,
} from '@molecule/api-resource-grade'
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-grade @molecule/api-database @molecule/api-i18n @molecule/api-locales-resource-grade @molecule/api-logger @molecule/api-permissions @molecule/api-resource
```

## API

### Interfaces

#### `CourseAverage`

Course-level average for a student.

```typescript
interface CourseAverage {
  /** Enrollment whose grades were aggregated. */
  enrollmentId: string
  /** Student. */
  userId: string
  /** Course. */
  courseId: string
  /** Total earned points across all grades. */
  earnedPoints: number
  /** Total possible points across all grades. */
  possiblePoints: number
  /** Average as a percentage 0–100, or null if `possiblePoints === 0`. */
  averagePercent: number | null
  /** Optional letter, derived if a scale was supplied. */
  letter: string | null
  /** Number of grades aggregated. */
  gradeCount: number
}
```

#### `Gpa`

GPA computation for a student across all courses.

```typescript
interface Gpa {
  /** Student. */
  userId: string
  /** Weighted GPA on the supplied scale (4.0 default). */
  gpa: number
  /** Number of courses contributing to the GPA. */
  courseCount: number
}
```

#### `Grade`

A single graded assignment for a student in a course.

`enrollmentId` joins the student to the course; `assignmentId` identifies
the graded artifact. `letter` is optional and is derived from the score
percentage via a configurable {@link GradeScale}.

```typescript
interface Grade {
  /** Unique identifier. */
  id: string
  /** Foreign key to the student-course enrollment. */
  enrollmentId: string
  /** Foreign key to the assignment being graded. */
  assignmentId: string
  /** Foreign key to the student (denormalised for fast GPA / transcript queries). */
  userId: string
  /** Foreign key to the course (denormalised for fast course-average queries). */
  courseId: string
  /** Number of points the student earned. */
  scorePoints: number
  /** Maximum points possible on this assignment. */
  maxPoints: number
  /** Optional letter-grade label (A, B+, etc.) — derived via the active scale. */
  letter: string | null
  /** Optional teacher comment. */
  comment: string | null
  /** ISO 8601 posting timestamp. */
  postedAt: string
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string
}
```

#### `GradeScale`

A configurable letter-grade scale.

Different institutions use different scales (4.0 vs 4.3, plus/minus,
etc.). The scale is injected per call rather than baked in.

```typescript
interface GradeScale {
  /** Human-readable name, e.g. "US 4.0 plus/minus". */
  name: string
  /** Rungs ordered however the caller likes — the resolver sorts them. */
  rungs: GradeScaleRung[]
}
```

#### `GradeScaleRung`

A single rung of a letter-grade scale.

`minPercent` is inclusive: a score percentage `p` matches the rung
iff `p >= minPercent`. The first rung whose threshold is met (scanning
highest-to-lowest) wins. `gpaPoints` is the GPA contribution for the
rung (typically 0–4 on a 4.0 scale).

```typescript
interface GradeScaleRung {
  /** Letter label, e.g. "A", "B+", "F". */
  letter: string
  /** Inclusive lower bound on score percentage, 0–100. */
  minPercent: number
  /** GPA contribution for this rung. */
  gpaPoints: number
}
```

#### `PostGradeInput`

Input for posting a new grade.

```typescript
interface PostGradeInput {
  /** Foreign key to the student-course enrollment. */
  enrollmentId: string
  /** Foreign key to the assignment being graded. */
  assignmentId: string
  /** Foreign key to the student. */
  userId: string
  /** Foreign key to the course. */
  courseId: string
  /** Points earned. */
  scorePoints: number
  /** Maximum possible points. */
  maxPoints: number
  /** Optional teacher comment. */
  comment?: string | null
  /** Optional letter-grade scale. If supplied, `letter` is derived. */
  scale?: GradeScale
}
```

#### `Transcript`

Full transcript for a student.

```typescript
interface Transcript {
  /** Student. */
  userId: string
  /** One line per course. */
  lines: TranscriptLine[]
  /** GPA across all courses (only present if a scale was supplied). */
  gpa: number | null
}
```

#### `TranscriptLine`

Transcript line: one row per course the student has graded work in.

```typescript
interface TranscriptLine {
  /** Course. */
  courseId: string
  /** Enrollment. */
  enrollmentId: string
  /** Average percent across the course's grades, or null if no points. */
  averagePercent: number | null
  /** Letter for the average, if a scale was supplied. */
  letter: string | null
  /** Number of graded assignments. */
  gradeCount: number
}
```

### Types

#### `UpdateGradeInput`

Input for amending an existing grade.

```typescript
type UpdateGradeInput = Partial<
  Pick<PostGradeInput, 'scorePoints' | 'maxPoints' | 'comment' | 'scale'>
>
```

### Functions

#### `authenticate()`

Route middleware that requires *any* authenticated session before a read route
runs (`list`, `read`, `courseAverage`). It does NOT itself scope to a user — the
handler performs the per-row / per-resource ownership scoping (a student sees
only their own grades; an admin sees all). Forwards `Unauthorized` to the error
handler when there is no session.

Academic records are sensitive PII (e.g. FERPA-protected), so the read side is
gated exactly like the write side — never left open. Exposed as a
`requestHandlerMap` key so the injector's route scanner preserves it (a bare
`'authenticate'` middleware string that isn't a handler-map key is silently
dropped — the same trap that once left these routes fully unauthenticated).

```typescript
function authenticate(): MoleculeRequestHandler
```

**Returns:** An Express-compatible middleware function.

#### `bucketByKey(grades, keyOf)`

Aggregate grades by an arbitrary key, summing points and counting rows.
Internal helper — exported for tests.

```typescript
function bucketByKey(grades: Grade[], keyOf: (g: Grade) => string): Map<string, { earnedPoints: number; possiblePoints: number; gradeCount: number; }>
```

#### `courseAverage(req, res)`

Returns the course average for a single enrollment.

404 if the enrollment has no grades. The default 4.0 plus/minus
scale is used unless `?scale=raw` is passed (which suppresses the
letter).

Fail-closed authorization (defense-in-depth, independent of the route
middleware): rejects an anonymous caller (401). The enrollment's owning student
is resolved from the aggregated grades; a non-admin caller is only served when
that owner is themselves (`average.userId === session.userId`), otherwise 403.
A grade admin (instructor/registrar) sees any enrollment's average.

```typescript
function courseAverage(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `enrollmentId` param and optional `scale=raw` query.
- `res` — The response object.

#### `create(req, res)`

Posts a new grade for an assignment.

Validates that all foreign keys are present and that scoring is sane
(`scorePoints >= 0`, `maxPoints > 0`, `scorePoints <= maxPoints`).
If a `scale` is supplied on the input the resolved letter is stored.

Restricted to a grade-management authority (instructor/registrar/admin) and
enforced here (not merely via route middleware): the row's `userId` is the
student being graded — never the actor permitted to post the grade — so a
non-admin caller is rejected (401 when unauthenticated, 403 otherwise) before
any grade row is inserted — defense-in-depth that does not depend on the
`requireAdmin` route middleware being wired, and that prevents a student
posting arbitrary scores for any user.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with {@link PostGradeInput} body.
- `res` — The response object.

#### `del(req, res)`

Deletes a grade by ID.

Restricted to a grade-management authority (instructor/registrar/admin) and
enforced here (not merely via route middleware): the row's `userId` is the
student*, never the actor permitted to delete the grade, so a non-admin caller
is rejected (401 when unauthenticated, 403 otherwise) before anything is
deleted — defense-in-depth that does not depend on the `requireAdmin` route
middleware being wired.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param.
- `res` — The response object.

#### `getCourseAverage(enrollmentId, scale)`

Compute the average percent for a single course enrollment.

Sums earned and possible points across every grade for the enrollment
and divides. Returns `null` averagePercent when no points are possible
(e.g. enrolled but ungraded).

```typescript
function getCourseAverage(enrollmentId: string, scale?: GradeScale): Promise<CourseAverage | null>
```

- `enrollmentId` — The enrollment to aggregate.
- `scale` — Optional letter-grade scale. If supplied the result includes a `letter`.

**Returns:** The course average, or null if the enrollment has no grades.

#### `getGpa(userId, scale)`

Compute a student's GPA across all their courses.

For each `(userId, courseId)` bucket the average percent is computed,
resolved to a rung on the supplied scale, and the rung's
`gpaPoints` contribute equally (unweighted) to the mean.

```typescript
function getGpa(userId: string, scale: GradeScale): Promise<Gpa | null>
```

- `userId` — The student.
- `scale` — Letter-grade scale to use for resolution.

**Returns:** The student's GPA, or null if the student has no graded courses.

#### `getTranscript(userId, scale)`

Build a full transcript for a student.

One {@link TranscriptLine} per course with averages and (if a scale is
supplied) letters. The final `gpa` is the same value
{@link getGpa} would return.

```typescript
function getTranscript(userId: string, scale?: GradeScale): Promise<Transcript | null>
```

- `userId` — The student.
- `scale` — Optional letter-grade scale.

**Returns:** The transcript, or null if the student has no graded courses.

#### `gpa(req, res)`

Returns a student's GPA on the default 4.0 plus/minus scale.

404 if the student has no graded courses.

Fail-closed authorization (defense-in-depth, independent of the route
middleware): rejects an anonymous caller (401) and only allows the request when
the caller is the student themselves (`req.params.userId === session.userId`)
or a grade admin; otherwise 403. One student can never read another's GPA.

```typescript
function gpa(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `userId` param.
- `res` — The response object.

#### `isGradeAdmin(res)`

Resolves whether the current request's session belongs to an actor authorized
to administer grades (post/amend/delete). Fail-closed: returns `false` when there is
no authenticated session, and otherwise only `true` when the session carries an
admin claim or a bonded permissions provider grants the `manage grade`
permission.

Use this for in-handler defense-in-depth (it does not depend on the route
middleware being preserved by the injector).

```typescript
function isGradeAdmin(res: MoleculeResponse): Promise<boolean>
```

- `res` — The response whose `locals.session` is inspected.

**Returns:** `true` when the session is an authorized grade admin.

#### `list(req, res)`

Lists grades with pagination and optional `enrollmentId`, `userId`,
`courseId`, or `assignmentId` filters.

Fail-closed authorization (defense-in-depth, independent of the route
middleware): rejects an anonymous caller (401). A non-admin caller is force-
scoped to their OWN grades — the `userId` filter is overridden with the
caller's session id, so an attacker-supplied `?userId=` can never widen the
result to another student (and the un-filtered "dump every grade" case is
impossible for non-admins). A grade admin (instructor/registrar) may filter
freely, including by an arbitrary `userId`.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with optional `page`, `perPage`, and filter query params.
- `res` — The response object.

#### `read(req, res)`

Reads a single grade by ID. Returns 404 if not found.

Fail-closed authorization (defense-in-depth, independent of the route
middleware): rejects an anonymous caller (401) and, for a non-admin, only
returns the grade when it belongs to the caller (`grade.userId === userId`);
otherwise 403. A grade admin (instructor/registrar) sees any grade. This keeps
one student from reading another student's grade by id even if the resource is
wired without the `authenticate` route middleware.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param.
- `res` — The response object.

#### `requireAdmin()`

Route middleware that gates the admin-only grade mutation routes (`create`,
`update`, `del`). Calls `next()` only for an authenticated grade admin; otherwise
forwards an error to the framework error handler — `Unauthorized` when no
session is present, `Forbidden` when the session is authenticated but not
authorized to manage grades.

Exposed as a `requestHandlerMap` key so the injector's route scanner keeps it
(unlike the inert global `'authenticate'` string, which is dropped).

```typescript
function requireAdmin(): MoleculeRequestHandler
```

**Returns:** An Express-compatible middleware function.

#### `requireSelfOrAdmin()`

Route middleware for the per-student aggregate routes (`/users/:userId/gpa`,
`/users/:userId/transcript`). Calls `next()` only when the caller is the
student themselves (`session.userId === req.params.userId`) OR an authorized
grade admin (instructor/registrar). Otherwise forwards `Unauthorized` (no
session) or `Forbidden` (authenticated but neither owner nor admin) — so one
student can never read another student's GPA or transcript.

Exposed as a `requestHandlerMap` key so the injector's route scanner preserves
it.

```typescript
function requireSelfOrAdmin(): MoleculeRequestHandler
```

**Returns:** An Express-compatible middleware function.

#### `resolveLetter(percent, scale)`

Resolve a score percentage to a letter on the given scale.

```typescript
function resolveLetter(percent: number, scale: GradeScale): string | null
```

- `percent` — Score percentage 0–100.
- `scale` — The grade scale to apply.

**Returns:** The matching letter, or null if no rung matches.

#### `resolveRung(percent, scale)`

Resolve a score percentage to its letter-grade rung on the given scale.

```typescript
function resolveRung(percent: number, scale: GradeScale): GradeScaleRung | null
```

- `percent` — Score percentage 0–100.
- `scale` — The grade scale to apply.

**Returns:** The matching rung, or null if no rung matches (empty scale).

#### `toPercent(scorePoints, maxPoints)`

Compute the percentage value of a score / max pair.

```typescript
function toPercent(scorePoints: number, maxPoints: number): number | null
```

- `scorePoints` — Earned points.
- `maxPoints` — Possible points.

**Returns:** Percentage 0–100, or null if `maxPoints <= 0`.

#### `transcript(req, res)`

Returns a student's full transcript: per-course averages, letters,
and overall GPA.

404 if the student has no grades. Pass `?scale=raw` to suppress
letter / GPA computation.

Fail-closed authorization (defense-in-depth, independent of the route
middleware): rejects an anonymous caller (401) and only allows the request when
the caller is the student themselves (`req.params.userId === session.userId`)
or a grade admin; otherwise 403. One student can never read another's
transcript.

```typescript
function transcript(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `userId` param and optional `scale=raw` query.
- `res` — The response object.

#### `update(req, res)`

Updates a grade by ID. Only `scorePoints`, `maxPoints`, and `comment`
can be amended. If a `scale` is supplied the letter is recomputed
against the new (or existing) score.

Restricted to a grade-management authority (instructor/registrar/admin) and
enforced here (not merely via route middleware): the row's `userId` is the
student*, never the actor permitted to amend the grade, so a non-admin caller
is rejected (401 when unauthenticated, 403 otherwise) before anything is read
or written — defense-in-depth that does not depend on the `requireAdmin` route
middleware being wired, and that prevents a student editing their own grade.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param and {@link UpdateGradeInput} body.
- `res` — The response object.

### Constants

#### `defaultGradeScale`

The default US 4.0 plus/minus letter-grade scale.

Rounding is whatever the caller stores; the resolver only checks
inclusive thresholds. Rungs are listed highest-first for clarity but
{@link resolveLetter} sorts internally so any order works.

```typescript
const defaultGradeScale: GradeScale
```

#### `GRADE_ADMIN_PERMISSION`

Session-claim permission string (`'grade:manage'`) that, when present in a
session's `permissions` array, grants grade administration without a bonded
permissions provider.

```typescript
const GRADE_ADMIN_PERMISSION: "grade:manage"
```

#### `GRADE_PERMISSION_ACTION`

Permission action checked against `@molecule/api-permissions` for grade
administration.

```typescript
const GRADE_PERMISSION_ACTION: "manage"
```

#### `GRADE_PERMISSION_RESOURCE`

Permission resource checked against `@molecule/api-permissions` for grade
administration.

```typescript
const GRADE_PERMISSION_RESOURCE: "grade"
```

#### `i18nRegistered`

Whether i18n registration has completed.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Handler map keyed by route handler name.

`requireAdmin` (write routes), `authenticate` (read routes: `list`/`read`/
`courseAverage`), and `requireSelfOrAdmin` (per-student `gpa`/`transcript`) are
the authorizer middlewares referenced by `routes.ts`. They must live here (as
real handler-map keys) so the mlcl injector's route scanner preserves them — a
bare middleware string that isn't a handler-map key is silently dropped, which
is exactly what once left the entire read side unauthenticated.

```typescript
const requestHandlerMap: { readonly courseAverage: typeof courseAverage; readonly create: typeof create; readonly del: typeof del; readonly gpa: typeof gpa; readonly list: typeof list; readonly read: typeof read; readonly transcript: typeof transcript; readonly update: typeof update; readonly authenticate: MoleculeRequestHandler; readonly requireAdmin: MoleculeRequestHandler; readonly requireSelfOrAdmin: MoleculeRequestHandler; }
```

#### `routes`

Route array for grade CRUD plus aggregate endpoints (course average, GPA, transcript).

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/grades"; readonly handler: "create"; readonly middlewares: readonly ["requireAdmin"]; }, { readonly method: "get"; readonly path: "/grades"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/grades/:id"; readonly handler: "read"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "patch"; readonly path: "/grades/:id"; readonly handler: "update"; readonly middlewares: readonly ["requireAdmin"]; }, { readonly method: "delete"; readonly path: "/grades/:id"; readonly handler: "del"; readonly middlewares: readonly ["requireAdmin"]; }, { readonly method: "get"; readonly path: "/enrollments/:enrollmentId/grade-average"; readonly handler: "courseAverage"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/users/:userId/gpa"; readonly handler: "gpa"; readonly middlewares: readonly ["requireSelfOrAdmin"]; }, { readonly method: "get"; readonly path: "/users/:userId/transcript"; readonly handler: "transcript"; readonly middlewares: readonly ["requireSelfOrAdmin"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-resource-grade` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-permissions` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-resource-grade`
- `@molecule/api-logger`
- `@molecule/api-permissions`
- `@molecule/api-resource`

Table: `src/__setup__/grades.sql` creates `grades`. An mlcl-scaffolded API
replays `__setup__/*.sql` automatically on migrate; anywhere else run it
once — nothing at runtime creates it.

**A grade row's `userId` is the STUDENT being graded, NOT the actor allowed
to edit it** — letting the row's owner mutate it would let students change
their own grades. Mutations (`POST/PATCH/DELETE /grades…`) are therefore
role-gated and DENY BY DEFAULT: the caller needs an admin session claim
(`isAdmin`, `role: 'admin'`, or a `grade:manage`/`admin` permissions claim)
or an `@molecule/api-permissions` grant (`manage grade`). Out of the box NO
ONE can write grades — grant your instructor/registrar role first; a 403
here means "grant the permission", never "remove the gate". The gate is
enforced both as the `requireAdmin` route middleware and inside every
mutation handler (fail-closed), so it holds even when routes are wired
without middlewares.

Reads are self-or-admin: `GET /users/:userId/gpa` and `…/transcript` reject
callers whose session userId ≠ `:userId` unless they are a grade admin —
handlers read the authenticated user from `res.locals.session` (mount
behind your global auth middleware).

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks) against
the running API; adapt each item to this app's actual screens/roles and check
every box off one by one. A box you can't check is a real bug to fix, never a
skip. Note that out of the box NO ONE may write grades — first grant your
instructor/registrar role an admin session claim (isAdmin / role 'admin') or
an `@molecule/api-permissions` `manage grade` grant, else every POST/PATCH/
DELETE /grades correctly 403s and there is no instructor to test as.
- [ ] As that instructor, enter a grade for a student on an assignment
  (POST /grades with enrollmentId, assignmentId, the student's userId,
  courseId, scorePoints, maxPoints); it persists (201) and — signed in AS THAT
  STUDENT — the score and derived letter appear on their own grades view
  (GET /grades, GET /grades/:id).
- [ ] Score is range-validated: a negative scorePoints, a scorePoints above
  maxPoints, or maxPoints <= 0 is rejected (400 scoreOutOfRange /
  maxPointsPositive) and nothing is persisted — a student can never end up with
  an impossible negative or over-100% grade.
- [ ] Aggregates are RIGHT, not just present: a course average
  (GET /enrollments/:enrollmentId/grade-average) equals 100 * sum(scorePoints)
  / sum(maxPoints) — so a big exam outweighs a small quiz because points ARE
  the weight (there is no separate assignment-weight field) — and GPA
  (GET /users/:userId/gpa) is the mean of each course's letter-rung gpaPoints
  on the active scale (each course counts equally; not credit-hour weighted).
  An assignment with NO grade row is EXCLUDED from the average, never counted
  as zero (the defined policy); confirm adding then removing one grade moves
  the average accordingly.
- [ ] Editing a grade (PATCH /grades/:id) reflects immediately for the student
  and re-derives the letter/average, and updatedAt advances. (This resource
  stores no grader/updatedBy column — if your app audits WHO changed a grade,
  verify that trail too; if it doesn't, don't claim an audit that isn't
  modeled.)
- [ ] PRIVACY / AUTHORIZATION — a student sees ONLY their own grades: signed
  in as student A, GET /grades never returns another student's rows (an
  attacker-supplied ?userId= is ignored and force-scoped to A), and
  id-guessing another student's grade / GPA / transcript / course-average
  returns 403 (or 404), never their data.
- [ ] Only the instructor/course-staff may enter or edit: as a plain student,
  POST /grades (grading yourself or anyone else), PATCH /grades/:id to raise
  your own score, and DELETE /grades/:id all 403 through every exposed
  endpoint — a student can never write or alter a grade, only read their own.

## Translations

Translation strings are provided by `@molecule/api-locales-resource-grade`.
