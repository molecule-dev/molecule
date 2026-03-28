const {
  mockCreate,
  mockFindById,
  mockFindMany,
  mockFindOne,
  mockCount,
  mockUpdateById,
  mockDeleteById,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindOne: vi.fn(),
  mockCount: vi.fn(),
  mockUpdateById: vi.fn(),
  mockDeleteById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  findOne: mockFindOne,
  count: mockCount,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((key: string) => key),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from '../handlers/create.js'
import { del } from '../handlers/del.js'
import { helpful } from '../handlers/helpful.js'
import { list } from '../handlers/list.js'
import { averageRating } from '../handlers/rating.js'
import { read } from '../handlers/read.js'
import { update } from '../handlers/update.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    body: {},
    query: {},
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(overrides: Record<string, unknown> = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session: { userId: 'user-1' } },
    ...overrides,
  }
  return res
}

describe('@molecule/api-resource-review handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({
        params: { resourceType: 'product', resourceId: 'p1' },
        body: { rating: 5, title: 'Great', body: 'Love it' },
      })
      const res = mockRes({ locals: {} })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when resourceType is missing', async () => {
      const req = mockReq({
        params: { resourceId: 'p1' },
        body: { rating: 5, title: 'Great', body: 'Love it' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when rating is out of range', async () => {
      const req = mockReq({
        params: { resourceType: 'product', resourceId: 'p1' },
        body: { rating: 6, title: 'Great', body: 'Love it' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when title is empty', async () => {
      const req = mockReq({
        params: { resourceType: 'product', resourceId: 'p1' },
        body: { rating: 5, title: '', body: 'Love it' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should create a review', async () => {
      const review = {
        id: 'r1',
        resourceType: 'product',
        resourceId: 'p1',
        userId: 'user-1',
        rating: 5,
        title: 'Great',
        body: 'Love it',
        helpful: 0,
      }
      mockCreate.mockResolvedValue({ data: review })

      const req = mockReq({
        params: { resourceType: 'product', resourceId: 'p1' },
        body: { rating: 5, title: 'Great', body: 'Love it' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(review)
    })

    it('should return 500 on database error', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({
        params: { resourceType: 'product', resourceId: 'p1' },
        body: { rating: 5, title: 'Great', body: 'Love it' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('list', () => {
    it('should return 400 when resource params missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return paginated reviews', async () => {
      const reviews = [{ id: 'r1', rating: 5, title: 'Great' }]
      mockFindMany.mockResolvedValue(reviews)
      mockCount.mockResolvedValue(1)

      const req = mockReq({
        params: { resourceType: 'product', resourceId: 'p1' },
        query: { limit: '10', offset: '0' },
      })
      const res = mockRes()

      await list(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: reviews,
        total: 1,
        limit: 10,
        offset: 0,
      })
    })

    it('should support sorting by rating', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const req = mockReq({
        params: { resourceType: 'product', resourceId: 'p1' },
        query: { sortBy: 'rating', sortDirection: 'asc' },
      })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith(
        'reviews',
        expect.objectContaining({
          orderBy: [{ field: 'rating', direction: 'asc' }],
        }),
      )
    })
  })

  describe('read', () => {
    it('should return 400 when reviewId missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when review not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { reviewId: 'r-missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return review by ID', async () => {
      const review = { id: 'r1', rating: 5 }
      mockFindById.mockResolvedValue(review)

      const req = mockReq({ params: { reviewId: 'r1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(review)
    })
  })

  describe('update', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { reviewId: 'r1' }, body: { rating: 4 } })
      const res = mockRes({ locals: {} })

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when rating is invalid', async () => {
      const req = mockReq({ params: { reviewId: 'r1' }, body: { rating: 0 } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when review not found or not owned', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { reviewId: 'r1' }, body: { rating: 4 } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should update owned review', async () => {
      const existing = { id: 'r1', userId: 'user-1', rating: 5 }
      const updated = { ...existing, rating: 4 }
      mockFindById.mockResolvedValue(existing)
      mockUpdateById.mockResolvedValue({ data: updated })

      const req = mockReq({ params: { reviewId: 'r1' }, body: { rating: 4 } })
      const res = mockRes()

      await update(req, res)

      expect(res.json).toHaveBeenCalledWith(updated)
    })

    it("should not update another user's review", async () => {
      const existing = { id: 'r1', userId: 'other-user', rating: 5 }
      mockFindById.mockResolvedValue(existing)

      const req = mockReq({ params: { reviewId: 'r1' }, body: { rating: 4 } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockUpdateById).not.toHaveBeenCalled()
    })
  })

  describe('del', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { reviewId: 'r1' } })
      const res = mockRes({ locals: {} })

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when review not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { reviewId: 'r-missing' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should delete owned review and return 204', async () => {
      mockFindById.mockResolvedValue({ id: 'r1', userId: 'user-1' })
      mockDeleteById.mockResolvedValue({ affected: 1 })

      const req = mockReq({ params: { reviewId: 'r1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it("should not delete another user's review", async () => {
      mockFindById.mockResolvedValue({ id: 'r1', userId: 'other-user' })

      const req = mockReq({ params: { reviewId: 'r1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockDeleteById).not.toHaveBeenCalled()
    })
  })

  describe('averageRating', () => {
    it('should return 400 when resource params missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await averageRating(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return rating stats', async () => {
      mockFindMany.mockResolvedValue([{ rating: 5 }, { rating: 4 }])

      const req = mockReq({
        params: { resourceType: 'product', resourceId: 'p1' },
      })
      const res = mockRes()

      await averageRating(req, res)

      expect(res.json).toHaveBeenCalledWith({
        average: 4.5,
        count: 2,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
      })
    })
  })

  describe('helpful', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { reviewId: 'r1' } })
      const res = mockRes({ locals: {} })

      await helpful(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when reviewId missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await helpful(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should mark review as helpful and return 204', async () => {
      mockFindById.mockResolvedValue({ id: 'r1', helpful: 3 })
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: {} })
      mockUpdateById.mockResolvedValue({ data: {} })

      const req = mockReq({ params: { reviewId: 'r1' } })
      const res = mockRes()

      await helpful(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })
})
