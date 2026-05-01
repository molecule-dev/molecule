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
npm install @molecule/api-resource-grade
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

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with {@link PostGradeInput} body.
- `res` — The response object.

#### `del(req, res)`

Deletes a grade by ID.

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

```typescript
function gpa(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `userId` param.
- `res` — The response object.

#### `list(req, res)`

Lists grades with pagination and optional `enrollmentId`, `userId`,
`courseId`, or `assignmentId` filters.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with optional `page`, `perPage`, and filter query params.
- `res` — The response object.

#### `read(req, res)`

Reads a single grade by ID. Returns 404 if not found.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param.
- `res` — The response object.

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

```typescript
function transcript(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `userId` param and optional `scale=raw` query.
- `res` — The response object.

#### `update(req, res)`

Updates a grade by ID. Only `scorePoints`, `maxPoints`, and `comment`
can be amended. If a `scale` is supplied the letter is recomputed
against the new (or existing) score.

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

#### `i18nRegistered`

Whether i18n registration has completed.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Handler map keyed by route handler name.

```typescript
const requestHandlerMap: { readonly courseAverage: typeof courseAverage; readonly create: typeof create; readonly del: typeof del; readonly gpa: typeof gpa; readonly list: typeof list; readonly read: typeof read; readonly transcript: typeof transcript; readonly update: typeof update; }
```

#### `routes`

Route array for grade CRUD plus aggregate endpoints (course average, GPA, transcript).

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/grades"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/grades"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/grades/:id"; readonly handler: "read"; }, { readonly method: "patch"; readonly path: "/grades/:id"; readonly handler: "update"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/grades/:id"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/enrollments/:enrollmentId/grade-average"; readonly handler: "courseAverage"; }, { readonly method: "get"; readonly path: "/users/:userId/gpa"; readonly handler: "gpa"; }, { readonly method: "get"; readonly path: "/users/:userId/transcript"; readonly handler: "transcript"; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-resource-grade` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-resource-grade`.
