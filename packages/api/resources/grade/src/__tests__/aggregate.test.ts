const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }))

vi.mock('@molecule/api-database', () => ({
  findMany: mockFindMany,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { bucketByKey, getCourseAverage, getGpa, getTranscript } from '../aggregate.js'
import { defaultGradeScale } from '../scale.js'
import type { Grade } from '../types.js'

function grade(overrides: Partial<Grade>): Grade {
  return {
    id: 'g',
    enrollmentId: 'e',
    assignmentId: 'a',
    userId: 'u',
    courseId: 'c',
    scorePoints: 0,
    maxPoints: 0,
    letter: null,
    comment: null,
    postedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('@molecule/api-resource-grade aggregate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('bucketByKey', () => {
    it('sums earned/possible points and counts within each bucket', () => {
      const grades = [
        grade({ courseId: 'c1', scorePoints: 80, maxPoints: 100 }),
        grade({ courseId: 'c1', scorePoints: 90, maxPoints: 100 }),
        grade({ courseId: 'c2', scorePoints: 50, maxPoints: 100 }),
      ]
      const buckets = bucketByKey(grades, (g) => g.courseId)
      expect(buckets.get('c1')).toEqual({
        earnedPoints: 170,
        possiblePoints: 200,
        gradeCount: 2,
      })
      expect(buckets.get('c2')).toEqual({
        earnedPoints: 50,
        possiblePoints: 100,
        gradeCount: 1,
      })
    })
  })

  describe('getCourseAverage', () => {
    it('returns null when no grades exist', async () => {
      mockFindMany.mockResolvedValue([])
      expect(await getCourseAverage('enr-1')).toBe(null)
    })

    it('aggregates earned and possible points', async () => {
      mockFindMany.mockResolvedValue([
        grade({ enrollmentId: 'enr-1', scorePoints: 85, maxPoints: 100 }),
        grade({ enrollmentId: 'enr-1', scorePoints: 95, maxPoints: 100 }),
      ])

      const result = await getCourseAverage('enr-1')
      expect(result?.earnedPoints).toBe(180)
      expect(result?.possiblePoints).toBe(200)
      expect(result?.averagePercent).toBe(90)
      expect(result?.gradeCount).toBe(2)
      expect(result?.letter).toBe(null)
    })

    it('attaches a letter when a scale is supplied', async () => {
      mockFindMany.mockResolvedValue([
        grade({ enrollmentId: 'enr-1', scorePoints: 95, maxPoints: 100 }),
      ])
      const result = await getCourseAverage('enr-1', defaultGradeScale)
      expect(result?.letter).toBe('A')
    })

    it('returns null averagePercent when possiblePoints is zero', async () => {
      // Edge case: no points possible (shouldn't happen via create() but DB
      // could be in this state from outside writes).
      mockFindMany.mockResolvedValue([
        grade({ enrollmentId: 'enr-1', scorePoints: 0, maxPoints: 0 }),
      ])
      const result = await getCourseAverage('enr-1', defaultGradeScale)
      expect(result?.averagePercent).toBe(null)
      expect(result?.letter).toBe(null)
    })
  })

  describe('getGpa', () => {
    it('returns null when student has no grades', async () => {
      mockFindMany.mockResolvedValue([])
      expect(await getGpa('u', defaultGradeScale)).toBe(null)
    })

    it('averages each course separately, then averages courses', async () => {
      // Course 1: 100% (4.0), Course 2: 75% -> C (2.0). GPA = 3.0.
      mockFindMany.mockResolvedValue([
        grade({ userId: 'u', courseId: 'c1', scorePoints: 100, maxPoints: 100 }),
        grade({ userId: 'u', courseId: 'c2', scorePoints: 75, maxPoints: 100 }),
      ])

      const result = await getGpa('u', defaultGradeScale)
      expect(result?.gpa).toBeCloseTo(3.0, 5)
      expect(result?.courseCount).toBe(2)
    })

    it('skips courses with zero possible points', async () => {
      mockFindMany.mockResolvedValue([
        grade({ userId: 'u', courseId: 'c1', scorePoints: 0, maxPoints: 0 }),
        grade({ userId: 'u', courseId: 'c2', scorePoints: 100, maxPoints: 100 }),
      ])
      const result = await getGpa('u', defaultGradeScale)
      expect(result?.courseCount).toBe(1)
      expect(result?.gpa).toBeCloseTo(4.0, 5)
    })

    it('returns null when no course produces a graded average', async () => {
      mockFindMany.mockResolvedValue([
        grade({ userId: 'u', courseId: 'c1', scorePoints: 0, maxPoints: 0 }),
      ])
      expect(await getGpa('u', defaultGradeScale)).toBe(null)
    })
  })

  describe('getTranscript', () => {
    it('returns null when student has no grades', async () => {
      mockFindMany.mockResolvedValue([])
      expect(await getTranscript('u')).toBe(null)
    })

    it('produces one line per course with averages and letters', async () => {
      mockFindMany.mockResolvedValue([
        grade({
          userId: 'u',
          courseId: 'c1',
          enrollmentId: 'e1',
          scorePoints: 90,
          maxPoints: 100,
        }),
        grade({
          userId: 'u',
          courseId: 'c1',
          enrollmentId: 'e1',
          scorePoints: 80,
          maxPoints: 100,
        }),
        grade({
          userId: 'u',
          courseId: 'c2',
          enrollmentId: 'e2',
          scorePoints: 70,
          maxPoints: 100,
        }),
      ])
      const result = await getTranscript('u', defaultGradeScale)
      expect(result?.lines).toHaveLength(2)
      const c1 = result!.lines.find((l) => l.courseId === 'c1')!
      expect(c1.averagePercent).toBe(85)
      expect(c1.letter).toBe('B')
      expect(c1.gradeCount).toBe(2)
      expect(c1.enrollmentId).toBe('e1')
      // GPA: (3.0 + 1.7) / 2 = 2.35
      expect(result?.gpa).toBeCloseTo(2.35, 5)
    })

    it('reports null gpa when no scale is supplied', async () => {
      mockFindMany.mockResolvedValue([
        grade({
          userId: 'u',
          courseId: 'c1',
          enrollmentId: 'e1',
          scorePoints: 90,
          maxPoints: 100,
        }),
      ])
      const result = await getTranscript('u')
      expect(result?.gpa).toBe(null)
      expect(result?.lines[0].letter).toBe(null)
      expect(result?.lines[0].averagePercent).toBe(90)
    })
  })
})
