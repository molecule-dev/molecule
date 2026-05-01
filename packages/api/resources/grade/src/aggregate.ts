/**
 * Grade aggregation: course averages, GPA, and transcripts.
 *
 * All aggregations are computed from {@link Grade} records returned by
 * the abstract `DataStore`. No raw SQL — works against any database
 * bond.
 *
 * @module
 */

import { findMany } from '@molecule/api-database'

import { resolveLetter, resolveRung } from './scale.js'
import type { CourseAverage, Gpa, GradeScale, Transcript, TranscriptLine } from './types.js'
import type { Grade } from './types.js'

/**
 * Aggregate grades by an arbitrary key, summing points and counting rows.
 * Internal helper — exported for tests.
 */
export function bucketByKey(
  grades: Grade[],
  keyOf: (g: Grade) => string,
): Map<string, { earnedPoints: number; possiblePoints: number; gradeCount: number }> {
  const buckets = new Map<
    string,
    { earnedPoints: number; possiblePoints: number; gradeCount: number }
  >()
  for (const grade of grades) {
    const key = keyOf(grade)
    const existing = buckets.get(key) ?? { earnedPoints: 0, possiblePoints: 0, gradeCount: 0 }
    existing.earnedPoints += grade.scorePoints
    existing.possiblePoints += grade.maxPoints
    existing.gradeCount += 1
    buckets.set(key, existing)
  }
  return buckets
}

/**
 * Compute the average percent for a single course enrollment.
 *
 * Sums earned and possible points across every grade for the enrollment
 * and divides. Returns `null` averagePercent when no points are possible
 * (e.g. enrolled but ungraded).
 *
 * @param enrollmentId - The enrollment to aggregate.
 * @param scale - Optional letter-grade scale. If supplied the result includes a `letter`.
 * @returns The course average, or null if the enrollment has no grades.
 */
export async function getCourseAverage(
  enrollmentId: string,
  scale?: GradeScale,
): Promise<CourseAverage | null> {
  const grades = await findMany<Grade>('grades', {
    where: [{ field: 'enrollmentId', operator: '=', value: enrollmentId }],
  })
  if (grades.length === 0) return null

  let earnedPoints = 0
  let possiblePoints = 0
  for (const grade of grades) {
    earnedPoints += grade.scorePoints
    possiblePoints += grade.maxPoints
  }

  const averagePercent = possiblePoints > 0 ? (earnedPoints / possiblePoints) * 100 : null
  const letter = averagePercent !== null && scale ? resolveLetter(averagePercent, scale) : null

  return {
    enrollmentId,
    userId: grades[0].userId,
    courseId: grades[0].courseId,
    earnedPoints,
    possiblePoints,
    averagePercent,
    letter,
    gradeCount: grades.length,
  }
}

/**
 * Compute a student's GPA across all their courses.
 *
 * For each `(userId, courseId)` bucket the average percent is computed,
 * resolved to a rung on the supplied scale, and the rung's
 * `gpaPoints` contribute equally (unweighted) to the mean.
 *
 * @param userId - The student.
 * @param scale - Letter-grade scale to use for resolution.
 * @returns The student's GPA, or null if the student has no graded courses.
 */
export async function getGpa(userId: string, scale: GradeScale): Promise<Gpa | null> {
  const grades = await findMany<Grade>('grades', {
    where: [{ field: 'userId', operator: '=', value: userId }],
  })
  if (grades.length === 0) return null

  const byCourse = bucketByKey(grades, (g) => g.courseId)

  let totalPoints = 0
  let courseCount = 0
  for (const bucket of byCourse.values()) {
    if (bucket.possiblePoints <= 0) continue
    const percent = (bucket.earnedPoints / bucket.possiblePoints) * 100
    const rung = resolveRung(percent, scale)
    if (!rung) continue
    totalPoints += rung.gpaPoints
    courseCount += 1
  }

  if (courseCount === 0) return null

  return {
    userId,
    gpa: totalPoints / courseCount,
    courseCount,
  }
}

/**
 * Build a full transcript for a student.
 *
 * One {@link TranscriptLine} per course with averages and (if a scale is
 * supplied) letters. The final `gpa` is the same value
 * {@link getGpa} would return.
 *
 * @param userId - The student.
 * @param scale - Optional letter-grade scale.
 * @returns The transcript, or null if the student has no graded courses.
 */
export async function getTranscript(
  userId: string,
  scale?: GradeScale,
): Promise<Transcript | null> {
  const grades = await findMany<Grade>('grades', {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [{ field: 'postedAt', direction: 'asc' }],
  })
  if (grades.length === 0) return null

  // Map courseId -> { earned, possible, count, enrollmentId }
  const byCourse = new Map<
    string,
    { earnedPoints: number; possiblePoints: number; gradeCount: number; enrollmentId: string }
  >()
  for (const grade of grades) {
    const existing = byCourse.get(grade.courseId) ?? {
      earnedPoints: 0,
      possiblePoints: 0,
      gradeCount: 0,
      enrollmentId: grade.enrollmentId,
    }
    existing.earnedPoints += grade.scorePoints
    existing.possiblePoints += grade.maxPoints
    existing.gradeCount += 1
    byCourse.set(grade.courseId, existing)
  }

  const lines: TranscriptLine[] = []
  let totalGpaPoints = 0
  let gpaCourseCount = 0
  for (const [courseId, bucket] of byCourse) {
    const averagePercent =
      bucket.possiblePoints > 0 ? (bucket.earnedPoints / bucket.possiblePoints) * 100 : null
    const rung = averagePercent !== null && scale ? resolveRung(averagePercent, scale) : null
    lines.push({
      courseId,
      enrollmentId: bucket.enrollmentId,
      averagePercent,
      letter: rung?.letter ?? null,
      gradeCount: bucket.gradeCount,
    })
    if (rung) {
      totalGpaPoints += rung.gpaPoints
      gpaCourseCount += 1
    }
  }

  return {
    userId,
    lines,
    gpa: gpaCourseCount > 0 ? totalGpaPoints / gpaCourseCount : null,
  }
}
