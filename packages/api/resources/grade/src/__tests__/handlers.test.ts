const {
  mockCreate,
  mockFindMany,
  mockFindById,
  mockUpdateById,
  mockDeleteById,
  mockHasProvider,
  mockCan,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindById: vi.fn(),
  mockUpdateById: vi.fn(),
  mockDeleteById: vi.fn(),
  mockHasProvider: vi.fn(),
  mockCan: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findMany: mockFindMany,
  findById: mockFindById,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
}))

vi.mock('@molecule/api-permissions', () => ({
  hasProvider: mockHasProvider,
  can: mockCan,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (key: string, _values?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  ),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@molecule/api-locales-resource-grade', () => ({}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authenticate, requireSelfOrAdmin } from '../authorizers/index.js'
import { courseAverage } from '../handlers/courseAverage.js'
import { create } from '../handlers/create.js'
import { del } from '../handlers/del.js'
import { gpa } from '../handlers/gpa.js'
import { list } from '../handlers/list.js'
import { read } from '../handlers/read.js'
import { transcript } from '../handlers/transcript.js'
import { update } from '../handlers/update.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  }
}

/** Session claim that satisfies the grade admin gate without a permissions provider. */
const ADMIN_SESSION = { userId: 'admin-1', isAdmin: true }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(overrides: Record<string, unknown> = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    // Default to an admin session so the (now admin-gated) mutation handlers
    // exercise their happy path; non-admin / anonymous cases override `locals`.
    locals: { session: { ...ADMIN_SESSION } },
    ...overrides,
  }
  return res
}

const validBody = {
  enrollmentId: 'enr-1',
  assignmentId: 'asn-1',
  userId: 'user-1',
  courseId: 'course-1',
  scorePoints: 90,
  maxPoints: 100,
}

describe('@molecule/api-resource-grade handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Fail-closed defaults: no permissions provider, deny.
    mockHasProvider.mockReturnValue(false)
    mockCan.mockResolvedValue(false)
  })

  describe('create', () => {
    it('returns 401 when there is no session (unauthenticated)', async () => {
      const req = mockReq({ body: validBody })
      const res = mockRes({ locals: {} })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      // Fail-closed: no grade row inserted for an anonymous caller.
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('returns 403 for an authenticated non-admin user (student cannot post arbitrary scores)', async () => {
      // The row's userId is the student; even that student is not authorized to post.
      const req = mockReq({ body: validBody })
      const res = mockRes({ locals: { session: { userId: 'user-1' } } })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.forbidden' }),
      )
      // Fail-closed: no write attempted for a non-admin.
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('posts a grade for a non-claim user when the permissions provider grants manage grade', async () => {
      mockHasProvider.mockReturnValue(true)
      mockCan.mockResolvedValue(true)
      mockCreate.mockResolvedValue({ data: { id: 'g1' } })

      const req = mockReq({ body: validBody })
      const res = mockRes({ locals: { session: { userId: 'instructor-1' } } })

      await create(req, res)

      expect(mockCan).toHaveBeenCalledWith('user:instructor-1', 'manage', 'grade')
      expect(mockCreate).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('returns 400 when foreign keys are missing', async () => {
      const req = mockReq({ body: { scorePoints: 80, maxPoints: 100 } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.foreignKeysRequired' }),
      )
    })

    it('returns 400 when scorePoints is not numeric', async () => {
      const req = mockReq({
        body: { ...validBody, scorePoints: 'oops' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.scoreNumeric' }),
      )
    })

    it('returns 400 when maxPoints is zero or negative', async () => {
      const req = mockReq({ body: { ...validBody, maxPoints: 0 } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.maxPointsPositive' }),
      )
    })

    it('returns 400 when scorePoints is negative', async () => {
      const req = mockReq({ body: { ...validBody, scorePoints: -1 } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.scoreOutOfRange' }),
      )
    })

    it('returns 400 when scorePoints exceeds maxPoints', async () => {
      const req = mockReq({ body: { ...validBody, scorePoints: 101, maxPoints: 100 } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.scoreOutOfRange' }),
      )
    })

    it('creates a grade with no letter when no scale is given', async () => {
      mockCreate.mockResolvedValue({ data: { id: 'g1' } })

      const req = mockReq({ body: validBody })
      const res = mockRes()

      await create(req, res)

      expect(mockCreate).toHaveBeenCalledWith(
        'grades',
        expect.objectContaining({
          enrollmentId: 'enr-1',
          assignmentId: 'asn-1',
          userId: 'user-1',
          courseId: 'course-1',
          scorePoints: 90,
          maxPoints: 100,
          letter: null,
          comment: null,
        }),
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('derives the letter when a scale is supplied', async () => {
      mockCreate.mockResolvedValue({ data: { id: 'g1' } })

      const req = mockReq({
        body: {
          ...validBody,
          scorePoints: 95,
          maxPoints: 100,
          scale: {
            name: 'pass-fail',
            rungs: [
              { letter: 'P', minPercent: 60, gpaPoints: 1 },
              { letter: 'F', minPercent: 0, gpaPoints: 0 },
            ],
          },
        },
      })
      const res = mockRes()

      await create(req, res)

      expect(mockCreate).toHaveBeenCalledWith('grades', expect.objectContaining({ letter: 'P' }))
    })

    it('returns 500 on database error', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ body: validBody })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.createFailed' }),
      )
    })
  })

  describe('read', () => {
    it('returns grade by id', async () => {
      const grade = { id: 'g1', scorePoints: 90, maxPoints: 100 }
      mockFindById.mockResolvedValue(grade)

      const req = mockReq({ params: { id: 'g1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(grade)
    })

    it('returns 404 when grade not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.notFound' }),
      )
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: 'g1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.readFailed' }),
      )
    })
  })

  describe('list', () => {
    it('returns paginated grades with no filters', async () => {
      const grades = [{ id: 'g1' }, { id: 'g2' }]
      mockFindMany.mockResolvedValue(grades)

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('grades', {
        where: [],
        orderBy: [{ field: 'postedAt', direction: 'desc' }],
        limit: 20,
        offset: 0,
      })
      expect(res.json).toHaveBeenCalledWith({ data: grades, page: 1, perPage: 20 })
    })

    it('respects page and perPage query params and caps perPage', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq({ query: { page: '3', perPage: '500' } })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith(
        'grades',
        expect.objectContaining({ limit: 100, offset: 200 }),
      )
    })

    it('filters by enrollmentId, userId, courseId, assignmentId', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq({
        query: {
          enrollmentId: 'enr-1',
          userId: 'user-1',
          courseId: 'course-1',
          assignmentId: 'asn-1',
        },
      })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('grades', {
        where: [
          { field: 'enrollmentId', operator: '=', value: 'enr-1' },
          { field: 'userId', operator: '=', value: 'user-1' },
          { field: 'courseId', operator: '=', value: 'course-1' },
          { field: 'assignmentId', operator: '=', value: 'asn-1' },
        ],
        orderBy: [{ field: 'postedAt', direction: 'desc' }],
        limit: 20,
        offset: 0,
      })
    })

    it('returns 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.listFailed' }),
      )
    })
  })

  describe('update', () => {
    it('returns 401 when there is no session (unauthenticated)', async () => {
      const req = mockReq({ params: { id: 'g1' }, body: { scorePoints: 100 } })
      const res = mockRes({ locals: {} })

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockFindById).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('returns 403 for an authenticated non-admin user (student cannot amend grades)', async () => {
      const req = mockReq({ params: { id: 'g1' }, body: { scorePoints: 100 } })
      // The row's userId is the student; even that student is not authorized.
      const res = mockRes({ locals: { session: { userId: 'user-1' } } })

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.forbidden' }),
      )
      // Fail-closed: no read or write attempted for a non-admin.
      expect(mockFindById).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('allows a non-claim user when the permissions provider grants manage grade', async () => {
      mockHasProvider.mockReturnValue(true)
      mockCan.mockResolvedValue(true)
      mockFindById.mockResolvedValue({ id: 'g1', scorePoints: 50, maxPoints: 100 })
      mockUpdateById.mockResolvedValue({ data: { id: 'g1', scorePoints: 80 } })

      const req = mockReq({ params: { id: 'g1' }, body: { scorePoints: 80 } })
      const res = mockRes({ locals: { session: { userId: 'instructor-1' } } })

      await update(req, res)

      expect(mockCan).toHaveBeenCalledWith('user:instructor-1', 'manage', 'grade')
      expect(mockUpdateById).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({ id: 'g1', scorePoints: 80 })
    })

    it('returns 404 when grade not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' }, body: { scorePoints: 80 } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 400 when amended scorePoints exceeds existing maxPoints', async () => {
      mockFindById.mockResolvedValue({
        id: 'g1',
        scorePoints: 50,
        maxPoints: 100,
      })

      const req = mockReq({ params: { id: 'g1' }, body: { scorePoints: 200 } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.scoreOutOfRange' }),
      )
    })

    it('updates only provided fields', async () => {
      mockFindById.mockResolvedValue({ id: 'g1', scorePoints: 50, maxPoints: 100 })
      mockUpdateById.mockResolvedValue({ data: { id: 'g1', scorePoints: 80 } })

      const req = mockReq({ params: { id: 'g1' }, body: { scorePoints: 80 } })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.scorePoints).toBe(80)
      expect(updateData.maxPoints).toBeUndefined()
      expect(updateData.updatedAt).toBeDefined()
    })

    it('recomputes letter when scale is supplied', async () => {
      mockFindById.mockResolvedValue({ id: 'g1', scorePoints: 50, maxPoints: 100 })
      mockUpdateById.mockResolvedValue({ data: { id: 'g1' } })

      const req = mockReq({
        params: { id: 'g1' },
        body: {
          scorePoints: 95,
          scale: {
            name: 'pass-fail',
            rungs: [
              { letter: 'P', minPercent: 60, gpaPoints: 1 },
              { letter: 'F', minPercent: 0, gpaPoints: 0 },
            ],
          },
        },
      })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.letter).toBe('P')
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: 'g1', scorePoints: 50, maxPoints: 100 })
      mockUpdateById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: 'g1' }, body: { scorePoints: 80 } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.updateFailed' }),
      )
    })
  })

  describe('del', () => {
    it('returns 401 when there is no session (unauthenticated)', async () => {
      const req = mockReq({ params: { id: 'g1' } })
      const res = mockRes({ locals: {} })

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockDeleteById).not.toHaveBeenCalled()
    })

    it('returns 403 for an authenticated non-admin user (grade delete blocked)', async () => {
      const req = mockReq({ params: { id: 'g1' } })
      const res = mockRes({ locals: { session: { userId: 'user-1' } } })

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.forbidden' }),
      )
      // Fail-closed: no delete attempted for a non-admin.
      expect(mockDeleteById).not.toHaveBeenCalled()
    })

    it('returns 404 when grade not found', async () => {
      mockDeleteById.mockResolvedValue({ data: null, affected: 0 })

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.notFound' }),
      )
    })

    it('deletes the grade and returns 204', async () => {
      mockDeleteById.mockResolvedValue({ data: { id: 'g1' }, affected: 1 })

      const req = mockReq({ params: { id: 'g1' } })
      const res = mockRes()

      await del(req, res)

      expect(mockDeleteById).toHaveBeenCalledWith('grades', 'g1')
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it('returns 500 on database error', async () => {
      mockDeleteById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: 'g1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.deleteFailed' }),
      )
    })
  })

  describe('courseAverage', () => {
    it('returns 404 when enrollment has no grades', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq({ params: { enrollmentId: 'enr-1' } })
      const res = mockRes()

      await courseAverage(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.noGrades' }),
      )
    })

    it('returns averaged percent and a letter on the default scale', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'g1',
          enrollmentId: 'enr-1',
          userId: 'u',
          courseId: 'c',
          scorePoints: 90,
          maxPoints: 100,
        },
        {
          id: 'g2',
          enrollmentId: 'enr-1',
          userId: 'u',
          courseId: 'c',
          scorePoints: 80,
          maxPoints: 100,
        },
      ])

      const req = mockReq({ params: { enrollmentId: 'enr-1' } })
      const res = mockRes()

      await courseAverage(req, res)

      const payload = res.json.mock.calls[0][0] as Record<string, unknown>
      expect(payload.averagePercent).toBe(85)
      expect(payload.letter).toBe('B')
      expect(payload.gradeCount).toBe(2)
    })

    it('omits letter when scale=raw is requested', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'g1',
          enrollmentId: 'enr-1',
          userId: 'u',
          courseId: 'c',
          scorePoints: 90,
          maxPoints: 100,
        },
      ])

      const req = mockReq({
        params: { enrollmentId: 'enr-1' },
        query: { scale: 'raw' },
      })
      const res = mockRes()

      await courseAverage(req, res)

      const payload = res.json.mock.calls[0][0] as Record<string, unknown>
      expect(payload.letter).toBe(null)
      expect(payload.averagePercent).toBe(90)
    })

    it('returns 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { enrollmentId: 'enr-1' } })
      const res = mockRes()

      await courseAverage(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.courseAverageFailed' }),
      )
    })
  })

  describe('gpa', () => {
    it('returns 404 when student has no graded courses', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq({ params: { userId: 'u' } })
      const res = mockRes()

      await gpa(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('computes GPA across courses on the default scale', async () => {
      // Course 1: 95% -> A -> 4.0
      // Course 2: 85% -> B -> 3.0
      // GPA = 3.5
      mockFindMany.mockResolvedValue([
        {
          id: 'g1',
          enrollmentId: 'e1',
          userId: 'u',
          courseId: 'c1',
          scorePoints: 95,
          maxPoints: 100,
        },
        {
          id: 'g2',
          enrollmentId: 'e2',
          userId: 'u',
          courseId: 'c2',
          scorePoints: 85,
          maxPoints: 100,
        },
      ])

      const req = mockReq({ params: { userId: 'u' } })
      const res = mockRes()

      await gpa(req, res)

      const payload = res.json.mock.calls[0][0] as Record<string, unknown>
      expect(payload.gpa).toBeCloseTo(3.5, 5)
      expect(payload.courseCount).toBe(2)
      expect(payload.userId).toBe('u')
    })

    it('returns 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { userId: 'u' } })
      const res = mockRes()

      await gpa(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.gpaFailed' }),
      )
    })
  })

  describe('transcript', () => {
    it('returns 404 when student has no grades', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq({ params: { userId: 'u' } })
      const res = mockRes()

      await transcript(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns one line per course with letters and overall GPA', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'g1',
          enrollmentId: 'e1',
          userId: 'u',
          courseId: 'c1',
          scorePoints: 95,
          maxPoints: 100,
          postedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'g2',
          enrollmentId: 'e2',
          userId: 'u',
          courseId: 'c2',
          scorePoints: 70,
          maxPoints: 100,
          postedAt: '2026-02-01T00:00:00Z',
        },
      ])

      const req = mockReq({ params: { userId: 'u' } })
      const res = mockRes()

      await transcript(req, res)

      const payload = res.json.mock.calls[0][0] as {
        userId: string
        lines: Array<{ courseId: string; letter: string | null; averagePercent: number | null }>
        gpa: number | null
      }
      expect(payload.userId).toBe('u')
      expect(payload.lines).toHaveLength(2)
      const c1 = payload.lines.find((l) => l.courseId === 'c1')!
      const c2 = payload.lines.find((l) => l.courseId === 'c2')!
      expect(c1.averagePercent).toBe(95)
      expect(c1.letter).toBe('A')
      expect(c2.averagePercent).toBe(70)
      expect(c2.letter).toBe('C-')
      // GPA: (4.0 + 1.7) / 2 = 2.85
      expect(payload.gpa).toBeCloseTo(2.85, 5)
    })

    it('omits letters and GPA when scale=raw is requested', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'g1',
          enrollmentId: 'e1',
          userId: 'u',
          courseId: 'c1',
          scorePoints: 95,
          maxPoints: 100,
          postedAt: '2026-01-01T00:00:00Z',
        },
      ])

      const req = mockReq({ params: { userId: 'u' }, query: { scale: 'raw' } })
      const res = mockRes()

      await transcript(req, res)

      const payload = res.json.mock.calls[0][0] as {
        lines: Array<{ letter: string | null; averagePercent: number | null }>
        gpa: number | null
      }
      expect(payload.lines[0].letter).toBe(null)
      expect(payload.lines[0].averagePercent).toBe(95)
      expect(payload.gpa).toBe(null)
    })

    it('returns 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { userId: 'u' } })
      const res = mockRes()

      await transcript(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'grade.error.transcriptFailed' }),
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Read-side authorization (M6-1): the read endpoints were fully unauthenticated,
  // allowing anonymous IDOR exfiltration of any student's grades/GPA/transcript.
  // Each read handler must now reject anonymous callers (401) and scope non-admins
  // to their own records (403/own-only), while admins retain full visibility.
  // ---------------------------------------------------------------------------
  describe('read authorization (IDOR)', () => {
    /** A plain student session — no admin claim, no permissions grant. */
    const studentRes = (userId: string): ReturnType<typeof mockRes> =>
      mockRes({ locals: { session: { userId } } })

    describe('read', () => {
      it('returns 401 for an anonymous caller and never touches the DB', async () => {
        const req = mockReq({ params: { id: 'g1' } })
        const res = mockRes({ locals: {} })

        await read(req, res)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ errorKey: 'resource.error.unauthorized' }),
        )
        expect(mockFindById).not.toHaveBeenCalled()
      })

      it('returns 403 when a student reads another student grade (cross-user IDOR)', async () => {
        mockFindById.mockResolvedValue({
          id: 'g1',
          userId: 'victim',
          scorePoints: 90,
          maxPoints: 100,
        })

        const req = mockReq({ params: { id: 'g1' } })
        const res = studentRes('attacker')

        await read(req, res)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ errorKey: 'grade.error.forbidden' }),
        )
      })

      it('returns a student own grade (legitimate self-read)', async () => {
        const grade = { id: 'g1', userId: 'student-1', scorePoints: 90, maxPoints: 100 }
        mockFindById.mockResolvedValue(grade)

        const req = mockReq({ params: { id: 'g1' } })
        const res = studentRes('student-1')

        await read(req, res)

        expect(res.json).toHaveBeenCalledWith(grade)
      })

      it('lets a grade admin read any student grade', async () => {
        const grade = { id: 'g1', userId: 'someone-else', scorePoints: 90, maxPoints: 100 }
        mockFindById.mockResolvedValue(grade)

        const req = mockReq({ params: { id: 'g1' } })
        const res = mockRes() // default ADMIN_SESSION

        await read(req, res)

        expect(res.json).toHaveBeenCalledWith(grade)
      })
    })

    describe('list', () => {
      it('returns 401 for an anonymous caller and never touches the DB', async () => {
        const req = mockReq()
        const res = mockRes({ locals: {} })

        await list(req, res)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(mockFindMany).not.toHaveBeenCalled()
      })

      it('force-scopes a non-admin to their own grades, overriding an attacker userId filter', async () => {
        mockFindMany.mockResolvedValue([])

        // Attacker (student "attacker") tries to dump victim's grades.
        const req = mockReq({ query: { userId: 'victim' } })
        const res = studentRes('attacker')

        await list(req, res)

        const passedWhere = mockFindMany.mock.calls[0][1].where as Array<{
          field: string
          value: string
        }>
        const userIdConds = passedWhere.filter((c) => c.field === 'userId')
        // Exactly one userId condition, pinned to the caller — never the victim.
        expect(userIdConds).toEqual([{ field: 'userId', operator: '=', value: 'attacker' }])
        expect(userIdConds.some((c) => c.value === 'victim')).toBe(false)
      })

      it('lets a grade admin filter by an arbitrary userId (full visibility)', async () => {
        mockFindMany.mockResolvedValue([])

        const req = mockReq({ query: { userId: 'any-student' } })
        const res = mockRes() // default ADMIN_SESSION

        await list(req, res)

        const passedWhere = mockFindMany.mock.calls[0][1].where as Array<{
          field: string
          value: string
        }>
        expect(passedWhere).toContainEqual({ field: 'userId', operator: '=', value: 'any-student' })
      })
    })

    describe('gpa', () => {
      it('returns 401 for an anonymous caller and never touches the DB', async () => {
        const req = mockReq({ params: { userId: 'victim' } })
        const res = mockRes({ locals: {} })

        await gpa(req, res)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(mockFindMany).not.toHaveBeenCalled()
      })

      it('returns 403 when a student requests another student GPA (cross-user IDOR)', async () => {
        const req = mockReq({ params: { userId: 'victim' } })
        const res = studentRes('attacker')

        await gpa(req, res)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ errorKey: 'grade.error.forbidden' }),
        )
        expect(mockFindMany).not.toHaveBeenCalled()
      })

      it('lets a student fetch their own GPA (legitimate self-read)', async () => {
        mockFindMany.mockResolvedValue([
          {
            id: 'g1',
            enrollmentId: 'e1',
            userId: 'me',
            courseId: 'c1',
            scorePoints: 95,
            maxPoints: 100,
          },
        ])

        const req = mockReq({ params: { userId: 'me' } })
        const res = studentRes('me')

        await gpa(req, res)

        const payload = res.json.mock.calls[0][0] as Record<string, unknown>
        expect(payload.userId).toBe('me')
        expect(payload.gpa).toBeCloseTo(4.0, 5)
      })
    })

    describe('transcript', () => {
      it('returns 401 for an anonymous caller and never touches the DB', async () => {
        const req = mockReq({ params: { userId: 'victim' } })
        const res = mockRes({ locals: {} })

        await transcript(req, res)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(mockFindMany).not.toHaveBeenCalled()
      })

      it('returns 403 when a student requests another student transcript (cross-user IDOR)', async () => {
        const req = mockReq({ params: { userId: 'victim' } })
        const res = studentRes('attacker')

        await transcript(req, res)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ errorKey: 'grade.error.forbidden' }),
        )
        expect(mockFindMany).not.toHaveBeenCalled()
      })

      it('lets a student fetch their own transcript, and an admin fetch anyone', async () => {
        mockFindMany.mockResolvedValue([
          {
            id: 'g1',
            enrollmentId: 'e1',
            userId: 'me',
            courseId: 'c1',
            scorePoints: 95,
            maxPoints: 100,
            postedAt: '2026-01-01T00:00:00Z',
          },
        ])

        const selfReq = mockReq({ params: { userId: 'me' } })
        const selfRes = studentRes('me')
        await transcript(selfReq, selfRes)
        expect((selfRes.json.mock.calls[0][0] as { userId: string }).userId).toBe('me')

        const adminReq = mockReq({ params: { userId: 'me' } })
        const adminRes = mockRes() // default ADMIN_SESSION
        await transcript(adminReq, adminRes)
        expect((adminRes.json.mock.calls[0][0] as { userId: string }).userId).toBe('me')
      })
    })

    describe('courseAverage', () => {
      it('returns 401 for an anonymous caller and never touches the DB', async () => {
        const req = mockReq({ params: { enrollmentId: 'enr-1' } })
        const res = mockRes({ locals: {} })

        await courseAverage(req, res)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(mockFindMany).not.toHaveBeenCalled()
      })

      it('returns 403 when a student requests an enrollment owned by another student', async () => {
        mockFindMany.mockResolvedValue([
          {
            id: 'g1',
            enrollmentId: 'enr-1',
            userId: 'victim',
            courseId: 'c',
            scorePoints: 90,
            maxPoints: 100,
          },
        ])

        const req = mockReq({ params: { enrollmentId: 'enr-1' } })
        const res = studentRes('attacker')

        await courseAverage(req, res)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ errorKey: 'grade.error.forbidden' }),
        )
      })

      it('returns the average for the enrollment owner (legitimate self-read)', async () => {
        mockFindMany.mockResolvedValue([
          {
            id: 'g1',
            enrollmentId: 'enr-1',
            userId: 'me',
            courseId: 'c',
            scorePoints: 90,
            maxPoints: 100,
          },
        ])

        const req = mockReq({ params: { enrollmentId: 'enr-1' } })
        const res = studentRes('me')

        await courseAverage(req, res)

        const payload = res.json.mock.calls[0][0] as Record<string, unknown>
        expect(payload.averagePercent).toBe(90)
        expect(payload.userId).toBe('me')
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Route-middleware gates (preserved as requestHandlerMap keys so the injector's
  // route scanner keeps them — a bare middleware string would be silently dropped).
  // ---------------------------------------------------------------------------
  describe('read route middlewares', () => {
    it('authenticate() forwards Unauthorized for an anonymous caller and calls next() for a session', async () => {
      const mw = authenticate()

      const next1 = vi.fn()
      await mw(mockReq(), mockRes({ locals: {} }), next1)
      expect(next1).toHaveBeenCalledWith(expect.anything())

      const next2 = vi.fn()
      await mw(mockReq(), studentResLike('u'), next2)
      expect(next2).toHaveBeenCalledWith()
    })

    it('requireSelfOrAdmin() allows the owner, allows an admin, and rejects a cross-user caller', async () => {
      const mw = requireSelfOrAdmin()

      // Owner.
      const ownerNext = vi.fn()
      await mw(mockReq({ params: { userId: 'u' } }), studentResLike('u'), ownerNext)
      expect(ownerNext).toHaveBeenCalledWith()

      // Admin reading someone else.
      const adminNext = vi.fn()
      await mw(mockReq({ params: { userId: 'someone' } }), mockRes(), adminNext)
      expect(adminNext).toHaveBeenCalledWith()

      // Cross-user student -> Forbidden (error forwarded).
      const crossNext = vi.fn()
      await mw(mockReq({ params: { userId: 'victim' } }), studentResLike('attacker'), crossNext)
      expect(crossNext).toHaveBeenCalledWith(expect.anything())

      // Anonymous -> Unauthorized (error forwarded).
      const anonNext = vi.fn()
      await mw(mockReq({ params: { userId: 'victim' } }), mockRes({ locals: {} }), anonNext)
      expect(anonNext).toHaveBeenCalledWith(expect.anything())
    })
  })
})

/** A student (non-admin) response whose session carries only a userId. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function studentResLike(userId: string): any {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session: { userId } },
  }
}
