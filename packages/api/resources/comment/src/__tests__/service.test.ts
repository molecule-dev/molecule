const {
  mockCreate,
  mockFindById,
  mockFindMany,
  mockFindOne,
  mockCount,
  mockUpdateById,
  mockDeleteById,
  mockGetActiveTransaction,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindOne: vi.fn(),
  mockCount: vi.fn(),
  mockUpdateById: vi.fn(),
  mockDeleteById: vi.fn(),
  mockGetActiveTransaction: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  findOne: mockFindOne,
  count: mockCount,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
  getActiveTransaction: mockGetActiveTransaction,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createComment,
  deleteComment,
  getCommentById,
  getCommentCount,
  getCommentsByResource,
  getReplies,
  updateComment,
} from '../service.js'

describe('@molecule/api-resource-comment service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // No active transaction, no existing number, no previous number row: the
    // first comment gets number 1.
    mockGetActiveTransaction.mockReturnValue(undefined)
    mockFindOne.mockResolvedValue(null)
    mockFindMany.mockResolvedValue([])
  })

  describe('createComment', () => {
    it('creates a top-level comment WITH its sequential number', async () => {
      const comment = { id: 'c1', body: 'Hello', parentId: null }
      mockCreate.mockResolvedValue({ data: comment })

      const result = await createComment('post', 'p1', 'user-1', { body: 'Hello' })

      expect(mockCreate).toHaveBeenCalledWith('comments', {
        resourceType: 'post',
        resourceId: 'p1',
        userId: 'user-1',
        parentId: null,
        body: 'Hello',
        editedAt: null,
      })
      expect(mockCreate).toHaveBeenCalledWith('comment_numbers', { number: 1, commentId: 'c1' })
      expect(result).toEqual({ ...comment, number: 1 })
    })

    it('creates a reply with parentId, numbered like any other comment', async () => {
      const reply = { id: 'c2', body: 'Reply', parentId: 'c1' }
      mockCreate.mockResolvedValue({ data: reply })

      const result = await createComment('post', 'p1', 'user-1', {
        body: 'Reply',
        parentId: 'c1',
      })

      expect(mockCreate).toHaveBeenCalledWith(
        'comments',
        expect.objectContaining({ parentId: 'c1' }),
      )
      expect(result).toEqual({ ...reply, number: 1 })
    })

    it('removes the comment it just wrote when numbering fails', async () => {
      mockCreate.mockResolvedValue({ data: { id: 'c1', body: 'Hello', parentId: null } })
      mockFindOne.mockRejectedValue(new Error('no such table: comment_numbers'))
      mockDeleteById.mockResolvedValue({ affected: 1 })

      await expect(createComment('post', 'p1', 'user-1', { body: 'Hello' })).rejects.toThrow(
        'Could not number comment c1',
      )
      expect(mockDeleteById).toHaveBeenCalledWith('comments', 'c1')
    })
  })

  describe('getCommentsByResource', () => {
    it('should return paginated top-level comments', async () => {
      const comments = [{ id: 'c1' }]
      mockFindMany.mockResolvedValue(comments)
      mockCount.mockResolvedValue(1)

      const result = await getCommentsByResource('post', 'p1', { limit: 10, offset: 0 })

      expect(result).toEqual({ data: comments, total: 1, limit: 10, offset: 0 })
      expect(mockFindMany).toHaveBeenCalledWith('comments', {
        where: [
          { field: 'resourceType', operator: '=', value: 'post' },
          { field: 'resourceId', operator: '=', value: 'p1' },
          { field: 'parentId', operator: 'is_null' },
        ],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 10,
        offset: 0,
      })
    })

    it('should default to limit=20, offset=0', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const result = await getCommentsByResource('post', 'p1')

      expect(result.limit).toBe(20)
      expect(result.offset).toBe(0)
    })
  })

  describe('getCommentById', () => {
    it('should return comment when found', async () => {
      const comment = { id: 'c1' }
      mockFindById.mockResolvedValue(comment)

      expect(await getCommentById('c1')).toEqual(comment)
    })

    it('moves updatedAt past a stored time that is ahead of the clock', async () => {
      const ahead = new Date(Date.now() + 60_000).toISOString()
      mockFindById.mockResolvedValue({ id: 'c1', userId: 'user-1', updatedAt: ahead })
      mockUpdateById.mockResolvedValue({ data: { id: 'c1' } })

      await updateComment('c1', 'user-1', { body: 'Updated' })

      const patch = mockUpdateById.mock.calls.at(-1)?.[2] as { updatedAt: string }
      expect(Date.parse(patch.updatedAt)).toBe(Date.parse(ahead) + 1)
    })

    it('should return null when not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await getCommentById('missing')).toBeNull()
    })
  })

  describe('updateComment', () => {
    it('should update owned comment', async () => {
      mockFindById.mockResolvedValue({ id: 'c1', userId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: 'c1', body: 'Updated' } })

      const result = await updateComment('c1', 'user-1', { body: 'Updated' })

      expect(result).toEqual({ id: 'c1', body: 'Updated' })
      expect(mockUpdateById).toHaveBeenCalledWith(
        'comments',
        'c1',
        expect.objectContaining({ body: 'Updated' }),
      )
    })

    it('should return null when not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await updateComment('missing', 'user-1', { body: 'Updated' })).toBeNull()
    })

    it('should return null when not owned by user', async () => {
      mockFindById.mockResolvedValue({ id: 'c1', userId: 'other-user' })

      expect(await updateComment('c1', 'user-1', { body: 'Updated' })).toBeNull()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })
  })

  describe('deleteComment', () => {
    it('should delete owned comment', async () => {
      mockFindById.mockResolvedValue({ id: 'c1', userId: 'user-1' })
      mockDeleteById.mockResolvedValue({ affected: 1 })

      expect(await deleteComment('c1', 'user-1')).toBe(true)
      expect(mockDeleteById).toHaveBeenCalledWith('comments', 'c1')
    })

    it('should return false when not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await deleteComment('missing', 'user-1')).toBe(false)
    })

    it('should return false when not owned', async () => {
      mockFindById.mockResolvedValue({ id: 'c1', userId: 'other-user' })

      expect(await deleteComment('c1', 'user-1')).toBe(false)
      expect(mockDeleteById).not.toHaveBeenCalled()
    })
  })

  describe('getReplies', () => {
    it('should return paginated replies', async () => {
      const replyComments = [{ id: 'r1' }]
      mockFindMany.mockResolvedValue(replyComments)
      mockCount.mockResolvedValue(1)

      const result = await getReplies('c1', { limit: 5, offset: 0 })

      expect(result).toEqual({ data: replyComments, total: 1, limit: 5, offset: 0 })
      expect(mockFindMany).toHaveBeenCalledWith('comments', {
        where: [{ field: 'parentId', operator: '=', value: 'c1' }],
        orderBy: [{ field: 'createdAt', direction: 'asc' }],
        limit: 5,
        offset: 0,
      })
    })
  })

  describe('getCommentCount', () => {
    it('should return total comments for a resource', async () => {
      mockCount.mockResolvedValue(42)

      expect(await getCommentCount('post', 'p1')).toBe(42)
      expect(mockCount).toHaveBeenCalledWith('comments', [
        { field: 'resourceType', operator: '=', value: 'post' },
        { field: 'resourceId', operator: '=', value: 'p1' },
      ])
    })
  })
})
