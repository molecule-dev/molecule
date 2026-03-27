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
  addReaction,
  getReactionCounts,
  getReactionSummary,
  getUserReactions,
  removeReaction,
} from '../service.js'

describe('@molecule/api-resource-reaction service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addReaction', () => {
    it('should create a new reaction when none exists', async () => {
      const reaction = { id: 'r1', type: 'like' }
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: reaction })

      const result = await addReaction('post', 'p1', 'user-1', 'like')

      expect(mockFindOne).toHaveBeenCalledWith('reactions', [
        { field: 'resourceType', operator: '=', value: 'post' },
        { field: 'resourceId', operator: '=', value: 'p1' },
        { field: 'userId', operator: '=', value: 'user-1' },
        { field: 'type', operator: '=', value: 'like' },
      ])
      expect(mockCreate).toHaveBeenCalledWith('reactions', {
        resourceType: 'post',
        resourceId: 'p1',
        userId: 'user-1',
        type: 'like',
      })
      expect(result).toEqual(reaction)
    })

    it('should return existing reaction (idempotent)', async () => {
      const existing = { id: 'r1', type: 'like' }
      mockFindOne.mockResolvedValue(existing)

      const result = await addReaction('post', 'p1', 'user-1', 'like')

      expect(result).toEqual(existing)
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  describe('removeReaction', () => {
    it('should remove all reactions by user on resource', async () => {
      mockDeleteMany.mockResolvedValue({ affected: 2 })

      await removeReaction('post', 'p1', 'user-1')

      expect(mockDeleteMany).toHaveBeenCalledWith('reactions', [
        { field: 'resourceType', operator: '=', value: 'post' },
        { field: 'resourceId', operator: '=', value: 'p1' },
        { field: 'userId', operator: '=', value: 'user-1' },
      ])
    })

    it('should remove only specific type when provided', async () => {
      mockDeleteMany.mockResolvedValue({ affected: 1 })

      await removeReaction('post', 'p1', 'user-1', 'like')

      expect(mockDeleteMany).toHaveBeenCalledWith('reactions', [
        { field: 'resourceType', operator: '=', value: 'post' },
        { field: 'resourceId', operator: '=', value: 'p1' },
        { field: 'userId', operator: '=', value: 'user-1' },
        { field: 'type', operator: '=', value: 'like' },
      ])
    })
  })

  describe('getReactionSummary', () => {
    it('should aggregate reactions by type', async () => {
      const reactions = [
        { id: 'r1', type: 'like', userId: 'u1' },
        { id: 'r2', type: 'like', userId: 'u2' },
        { id: 'r3', type: 'love', userId: 'u1' },
      ]
      mockFindMany.mockResolvedValue(reactions)
      mockCount.mockResolvedValue(3)

      const result = await getReactionSummary('post', 'p1', 'u1')

      expect(result).toEqual({
        total: 3,
        counts: { like: 2, love: 1 },
        userReactions: ['like', 'love'],
      })
    })

    it('should return empty summary for no reactions', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const result = await getReactionSummary('post', 'p1')

      expect(result).toEqual({
        total: 0,
        counts: {},
        userReactions: [],
      })
    })
  })

  describe('getUserReactions', () => {
    it('should return user reactions for resource', async () => {
      const reactions = [{ id: 'r1', type: 'like', userId: 'user-1' }]
      mockFindMany.mockResolvedValue(reactions)

      const result = await getUserReactions('post', 'p1', 'user-1')
      expect(result).toEqual(reactions)
    })
  })

  describe('getReactionCounts', () => {
    it('should return counts per type', async () => {
      const reactions = [
        { id: 'r1', type: 'like' },
        { id: 'r2', type: 'like' },
        { id: 'r3', type: 'love' },
      ]
      mockFindMany.mockResolvedValue(reactions)

      const result = await getReactionCounts('post', 'p1')
      expect(result).toEqual({ like: 2, love: 1 })
    })

    it('should return empty for no reactions', async () => {
      mockFindMany.mockResolvedValue([])

      const result = await getReactionCounts('post', 'p1')
      expect(result).toEqual({})
    })
  })
})
