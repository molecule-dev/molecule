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

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createReview,
  deleteReview,
  getAverageRating,
  getReviewById,
  getReviewsByResource,
  markHelpful,
  updateReview,
} from '../service.js'

describe('@molecule/api-resource-review service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createReview', () => {
    it('should create a review', async () => {
      const review = { id: 'r1', rating: 5, title: 'Great', body: 'Love it', helpful: 0 }
      mockCreate.mockResolvedValue({ data: review })

      const result = await createReview('product', 'p1', 'user-1', {
        rating: 5,
        title: 'Great',
        body: 'Love it',
      })

      expect(mockCreate).toHaveBeenCalledWith('reviews', {
        resourceType: 'product',
        resourceId: 'p1',
        userId: 'user-1',
        rating: 5,
        title: 'Great',
        body: 'Love it',
        helpful: 0,
      })
      expect(result).toEqual(review)
    })
  })

  describe('getReviewsByResource', () => {
    it('should return paginated reviews', async () => {
      const reviews = [{ id: 'r1' }]
      mockFindMany.mockResolvedValue(reviews)
      mockCount.mockResolvedValue(1)

      const result = await getReviewsByResource('product', 'p1', { limit: 10, offset: 0 })

      expect(result).toEqual({ data: reviews, total: 1, limit: 10, offset: 0 })
      expect(mockFindMany).toHaveBeenCalledWith('reviews', {
        where: [
          { field: 'resourceType', operator: '=', value: 'product' },
          { field: 'resourceId', operator: '=', value: 'p1' },
        ],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 10,
        offset: 0,
      })
    })

    it('should default to limit=20, offset=0', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const result = await getReviewsByResource('product', 'p1')

      expect(result.limit).toBe(20)
      expect(result.offset).toBe(0)
    })

    it('should support custom sorting', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await getReviewsByResource('product', 'p1', { sortBy: 'rating', sortDirection: 'asc' })

      expect(mockFindMany).toHaveBeenCalledWith(
        'reviews',
        expect.objectContaining({
          orderBy: [{ field: 'rating', direction: 'asc' }],
        }),
      )
    })
  })

  describe('getReviewById', () => {
    it('should return review when found', async () => {
      const review = { id: 'r1' }
      mockFindById.mockResolvedValue(review)

      expect(await getReviewById('r1')).toEqual(review)
    })

    it('should return null when not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await getReviewById('missing')).toBeNull()
    })
  })

  describe('updateReview', () => {
    it('should update owned review', async () => {
      mockFindById.mockResolvedValue({ id: 'r1', userId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: 'r1', rating: 4, body: 'Updated' } })

      const result = await updateReview('r1', 'user-1', { rating: 4, body: 'Updated' })

      expect(result).toEqual({ id: 'r1', rating: 4, body: 'Updated' })
      expect(mockUpdateById).toHaveBeenCalledWith(
        'reviews',
        'r1',
        expect.objectContaining({ rating: 4, body: 'Updated' }),
      )
    })

    it('should only include provided fields in update', async () => {
      mockFindById.mockResolvedValue({ id: 'r1', userId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: 'r1', rating: 3 } })

      await updateReview('r1', 'user-1', { rating: 3 })

      const updateArg = mockUpdateById.mock.calls[0][2]
      expect(updateArg).toHaveProperty('rating', 3)
      expect(updateArg).not.toHaveProperty('title')
      expect(updateArg).not.toHaveProperty('body')
    })

    it('should return null when not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await updateReview('missing', 'user-1', { rating: 4 })).toBeNull()
    })

    it('should return null when not owned by user', async () => {
      mockFindById.mockResolvedValue({ id: 'r1', userId: 'other-user' })

      expect(await updateReview('r1', 'user-1', { rating: 4 })).toBeNull()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })
  })

  describe('deleteReview', () => {
    it('should delete owned review', async () => {
      mockFindById.mockResolvedValue({ id: 'r1', userId: 'user-1' })
      mockDeleteById.mockResolvedValue({ affected: 1 })

      expect(await deleteReview('r1', 'user-1')).toBe(true)
      expect(mockDeleteById).toHaveBeenCalledWith('reviews', 'r1')
    })

    it('should return false when not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await deleteReview('missing', 'user-1')).toBe(false)
    })

    it('should return false when not owned', async () => {
      mockFindById.mockResolvedValue({ id: 'r1', userId: 'other-user' })

      expect(await deleteReview('r1', 'user-1')).toBe(false)
      expect(mockDeleteById).not.toHaveBeenCalled()
    })
  })

  describe('getAverageRating', () => {
    it('should return zero stats when no reviews', async () => {
      mockFindMany.mockResolvedValue([])

      const stats = await getAverageRating('product', 'p1')

      expect(stats).toEqual({
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      })
    })

    it('should compute average and distribution', async () => {
      mockFindMany.mockResolvedValue([{ rating: 5 }, { rating: 4 }, { rating: 5 }, { rating: 3 }])

      const stats = await getAverageRating('product', 'p1')

      expect(stats.average).toBe(4.3)
      expect(stats.count).toBe(4)
      expect(stats.distribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 })
    })

    it('should round average to one decimal', async () => {
      mockFindMany.mockResolvedValue([{ rating: 1 }, { rating: 2 }, { rating: 3 }])

      const stats = await getAverageRating('product', 'p1')

      expect(stats.average).toBe(2)
    })
  })

  describe('markHelpful', () => {
    it('should mark review as helpful', async () => {
      mockFindById.mockResolvedValue({ id: 'r1', helpful: 3 })
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: {} })
      mockUpdateById.mockResolvedValue({ data: {} })

      await markHelpful('r1', 'user-2')

      expect(mockCreate).toHaveBeenCalledWith('review_helpful', {
        reviewId: 'r1',
        userId: 'user-2',
      })
      expect(mockUpdateById).toHaveBeenCalledWith('reviews', 'r1', { helpful: 4 })
    })

    it('should be idempotent — skip if already marked', async () => {
      mockFindById.mockResolvedValue({ id: 'r1', helpful: 3 })
      mockFindOne.mockResolvedValue({ reviewId: 'r1', userId: 'user-2' })

      await markHelpful('r1', 'user-2')

      expect(mockCreate).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('should do nothing if review not found', async () => {
      mockFindById.mockResolvedValue(null)

      await markHelpful('missing', 'user-2')

      expect(mockFindOne).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })
})
