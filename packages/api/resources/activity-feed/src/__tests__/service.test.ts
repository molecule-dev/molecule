const { mockCreate, mockFindById, mockFindMany, mockCount, mockUpdateById } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockUpdateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  count: mockCount,
  updateById: mockUpdateById,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getFeed, getTimeline, getUnseenCount, logActivity, markSeen } from '../service.js'

describe('@molecule/api-resource-activity-feed service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logActivity', () => {
    it('should create an activity with required fields', async () => {
      const activity = {
        id: 'a1',
        actorId: 'user-1',
        action: 'created',
        resourceType: 'post',
        resourceId: 'p1',
        metadata: null,
      }
      mockCreate.mockResolvedValue({ data: activity })

      const result = await logActivity({
        actorId: 'user-1',
        action: 'created',
        resourceType: 'post',
        resourceId: 'p1',
      })

      expect(mockCreate).toHaveBeenCalledWith('activities', {
        actorId: 'user-1',
        action: 'created',
        resourceType: 'post',
        resourceId: 'p1',
        metadata: null,
      })
      expect(result).toEqual(activity)
    })

    it('should create an activity with metadata', async () => {
      const activity = {
        id: 'a2',
        actorId: 'user-1',
        action: 'commented',
        resourceType: 'post',
        resourceId: 'p1',
        metadata: { commentId: 'c1' },
      }
      mockCreate.mockResolvedValue({ data: activity })

      const result = await logActivity({
        actorId: 'user-1',
        action: 'commented',
        resourceType: 'post',
        resourceId: 'p1',
        metadata: { commentId: 'c1' },
      })

      expect(mockCreate).toHaveBeenCalledWith(
        'activities',
        expect.objectContaining({ metadata: { commentId: 'c1' } }),
      )
      expect(result).toEqual(activity)
    })
  })

  describe('getFeed', () => {
    it('should return paginated activities', async () => {
      const activities = [{ id: 'a1' }]
      mockFindMany.mockResolvedValue(activities)
      mockCount.mockResolvedValue(1)

      const result = await getFeed('user-1', { limit: 10, offset: 0 })

      expect(result).toEqual({ data: activities, total: 1, limit: 10, offset: 0 })
      expect(mockFindMany).toHaveBeenCalledWith('activities', {
        where: [],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 10,
        offset: 0,
      })
    })

    it('should default to limit=20, offset=0', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const result = await getFeed('user-1')

      expect(result.limit).toBe(20)
      expect(result.offset).toBe(0)
    })

    it('should filter by resourceType', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await getFeed('user-1', { resourceType: 'post' })

      expect(mockFindMany).toHaveBeenCalledWith(
        'activities',
        expect.objectContaining({
          where: [{ field: 'resourceType', operator: '=', value: 'post' }],
        }),
      )
    })

    it('should filter by action', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await getFeed('user-1', { action: 'created' })

      expect(mockFindMany).toHaveBeenCalledWith(
        'activities',
        expect.objectContaining({
          where: [{ field: 'action', operator: '=', value: 'created' }],
        }),
      )
    })

    it('should filter by both resourceType and action', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await getFeed('user-1', { resourceType: 'post', action: 'updated' })

      expect(mockFindMany).toHaveBeenCalledWith(
        'activities',
        expect.objectContaining({
          where: expect.arrayContaining([
            { field: 'resourceType', operator: '=', value: 'post' },
            { field: 'action', operator: '=', value: 'updated' },
          ]),
        }),
      )
    })
  })

  describe('getTimeline', () => {
    it('should return paginated activities for a resource', async () => {
      const activities = [{ id: 'a1' }]
      mockFindMany.mockResolvedValue(activities)
      mockCount.mockResolvedValue(1)

      const result = await getTimeline('post', 'p1', { limit: 10, offset: 0 })

      expect(result).toEqual({ data: activities, total: 1, limit: 10, offset: 0 })
      expect(mockFindMany).toHaveBeenCalledWith('activities', {
        where: [
          { field: 'resourceType', operator: '=', value: 'post' },
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

      const result = await getTimeline('post', 'p1')

      expect(result.limit).toBe(20)
      expect(result.offset).toBe(0)
    })
  })

  describe('markSeen', () => {
    it('should create seen status when none exists', async () => {
      mockFindMany.mockResolvedValue([])
      mockCreate.mockResolvedValue({ data: {} })

      await markSeen('user-1', 'a5')

      expect(mockCreate).toHaveBeenCalledWith('activity_seen_status', {
        userId: 'user-1',
        lastSeenActivityId: 'a5',
        updatedAt: expect.any(String),
      })
    })

    it('should update existing seen status', async () => {
      mockFindMany.mockResolvedValue([{ userId: 'user-1', lastSeenActivityId: 'a3' }])
      mockUpdateById.mockResolvedValue({ data: {} })

      await markSeen('user-1', 'a10')

      expect(mockUpdateById).toHaveBeenCalledWith('activity_seen_status', 'user-1', {
        lastSeenActivityId: 'a10',
        updatedAt: expect.any(String),
      })
    })
  })

  describe('getUnseenCount', () => {
    it('should return total count when user has no seen status', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(42)

      expect(await getUnseenCount('user-1')).toBe(42)
    })

    it('should return count of activities after last seen', async () => {
      mockFindMany.mockResolvedValue([{ userId: 'user-1', lastSeenActivityId: 'a5' }])
      mockFindById.mockResolvedValue({ id: 'a5', createdAt: '2026-01-01T00:00:00.000Z' })
      mockCount.mockResolvedValue(3)

      expect(await getUnseenCount('user-1')).toBe(3)
      expect(mockCount).toHaveBeenCalledWith('activities', [
        { field: 'createdAt', operator: '>', value: '2026-01-01T00:00:00.000Z' },
      ])
    })

    it('should return total count when last seen activity not found', async () => {
      mockFindMany.mockResolvedValue([{ userId: 'user-1', lastSeenActivityId: 'deleted' }])
      mockFindById.mockResolvedValue(null)
      mockCount.mockResolvedValue(10)

      expect(await getUnseenCount('user-1')).toBe(10)
    })
  })
})
