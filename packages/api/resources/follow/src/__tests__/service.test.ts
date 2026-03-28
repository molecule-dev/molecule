const { mockCreate, mockFindOne, mockFindMany, mockCount, mockDeleteMany } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindOne: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockDeleteMany: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  count: mockCount,
  deleteMany: mockDeleteMany,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  follow,
  getFollowerCount,
  getFollowers,
  getFollowing,
  getFollowingCount,
  isFollowing,
  unfollow,
} from '../service.js'

describe('@molecule/api-resource-follow service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('follow', () => {
    it('should return existing follow if already following', async () => {
      const existing = { id: 'f1', followerId: 'u1', targetType: 'user', targetId: 'u2' }
      mockFindOne.mockResolvedValue(existing)

      const result = await follow('u1', 'user', 'u2')

      expect(result).toBe(existing)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should create new follow if not already following', async () => {
      const newFollow = { id: 'f2', followerId: 'u1', targetType: 'user', targetId: 'u2' }
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: newFollow })

      const result = await follow('u1', 'user', 'u2')

      expect(result).toEqual(newFollow)
      expect(mockCreate).toHaveBeenCalledWith('follows', {
        followerId: 'u1',
        targetType: 'user',
        targetId: 'u2',
      })
    })
  })

  describe('unfollow', () => {
    it('should delete matching follow records', async () => {
      mockDeleteMany.mockResolvedValue({ affected: 1 })

      await unfollow('u1', 'user', 'u2')

      expect(mockDeleteMany).toHaveBeenCalledWith('follows', [
        { field: 'followerId', operator: '=', value: 'u1' },
        { field: 'targetType', operator: '=', value: 'user' },
        { field: 'targetId', operator: '=', value: 'u2' },
      ])
    })
  })

  describe('getFollowers', () => {
    it('should return paginated followers with defaults', async () => {
      const followers = [{ id: 'f1', followerId: 'u1' }]
      mockFindMany.mockResolvedValue(followers)
      mockCount.mockResolvedValue(1)

      const result = await getFollowers('user', 'u2')

      expect(result).toEqual({ data: followers, total: 1, limit: 20, offset: 0 })
    })

    it('should use custom pagination', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await getFollowers('user', 'u2', { limit: 10, offset: 5 })

      expect(mockFindMany).toHaveBeenCalledWith('follows', {
        where: [
          { field: 'targetType', operator: '=', value: 'user' },
          { field: 'targetId', operator: '=', value: 'u2' },
        ],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 10,
        offset: 5,
      })
    })
  })

  describe('getFollowing', () => {
    it('should return paginated following with defaults', async () => {
      const following = [{ id: 'f1', targetType: 'project', targetId: 'p1' }]
      mockFindMany.mockResolvedValue(following)
      mockCount.mockResolvedValue(1)

      const result = await getFollowing('u1')

      expect(result).toEqual({ data: following, total: 1, limit: 20, offset: 0 })
    })
  })

  describe('isFollowing', () => {
    it('should return true when follow exists', async () => {
      mockFindOne.mockResolvedValue({ id: 'f1' })

      const result = await isFollowing('u1', 'user', 'u2')

      expect(result).toBe(true)
    })

    it('should return false when follow does not exist', async () => {
      mockFindOne.mockResolvedValue(null)

      const result = await isFollowing('u1', 'user', 'u2')

      expect(result).toBe(false)
    })
  })

  describe('getFollowerCount', () => {
    it('should return count of followers', async () => {
      mockCount.mockResolvedValue(42)

      const result = await getFollowerCount('user', 'u2')

      expect(result).toBe(42)
      expect(mockCount).toHaveBeenCalledWith('follows', [
        { field: 'targetType', operator: '=', value: 'user' },
        { field: 'targetId', operator: '=', value: 'u2' },
      ])
    })
  })

  describe('getFollowingCount', () => {
    it('should return count of following', async () => {
      mockCount.mockResolvedValue(15)

      const result = await getFollowingCount('u1')

      expect(result).toBe(15)
      expect(mockCount).toHaveBeenCalledWith('follows', [
        { field: 'followerId', operator: '=', value: 'u1' },
      ])
    })
  })
})
