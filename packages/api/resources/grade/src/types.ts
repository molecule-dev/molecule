/**
 * Grade resource types.
 *
 * @module
 */

/**
 * A single graded assignment for a student in a course.
 *
 * `enrollmentId` joins the student to the course; `assignmentId` identifies
 * the graded artifact. `letter` is optional and is derived from the score
 * percentage via a configurable {@link GradeScale}.
 */
export interface Grade {
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

/**
 * A single rung of a letter-grade scale.
 *
 * `minPercent` is inclusive: a score percentage `p` matches the rung
 * iff `p >= minPercent`. The first rung whose threshold is met (scanning
 * highest-to-lowest) wins. `gpaPoints` is the GPA contribution for the
 * rung (typically 0–4 on a 4.0 scale).
 */
export interface GradeScaleRung {
  /** Letter label, e.g. "A", "B+", "F". */
  letter: string
  /** Inclusive lower bound on score percentage, 0–100. */
  minPercent: number
  /** GPA contribution for this rung. */
  gpaPoints: number
}

/**
 * A configurable letter-grade scale.
 *
 * Different institutions use different scales (4.0 vs 4.3, plus/minus,
 * etc.). The scale is injected per call rather than baked in.
 */
export interface GradeScale {
  /** Human-readable name, e.g. "US 4.0 plus/minus". */
  name: string
  /** Rungs ordered however the caller likes — the resolver sorts them. */
  rungs: GradeScaleRung[]
}

/**
 * Input for posting a new grade.
 */
export interface PostGradeInput {
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

/**
 * Input for amending an existing grade.
 */
export type UpdateGradeInput = Partial<
  Pick<PostGradeInput, 'scorePoints' | 'maxPoints' | 'comment' | 'scale'>
>

/**
 * Course-level average for a student.
 */
export interface CourseAverage {
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

/**
 * GPA computation for a student across all courses.
 */
export interface Gpa {
  /** Student. */
  userId: string
  /** Weighted GPA on the supplied scale (4.0 default). */
  gpa: number
  /** Number of courses contributing to the GPA. */
  courseCount: number
}

/**
 * Transcript line: one row per course the student has graded work in.
 */
export interface TranscriptLine {
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

/**
 * Full transcript for a student.
 */
export interface Transcript {
  /** Student. */
  userId: string
  /** One line per course. */
  lines: TranscriptLine[]
  /** GPA across all courses (only present if a scale was supplied). */
  gpa: number | null
}
