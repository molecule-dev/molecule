const { mockCreate, mockFindById, mockFindMany, mockCount, mockUpdateById, mockDeleteById } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindById: vi.fn(),
    mockFindMany: vi.fn(),
    mockCount: vi.fn(),
    mockUpdateById: vi.fn(),
    mockDeleteById: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  count: mockCount,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addMessage,
  createThread,
  deleteMessage,
  deleteThread,
  getMessages,
  getThreadById,
  getThreads,
  getUnreadCount,
  markRead,
  updateMessage,
  updateThread,
} from '../service.js'

describe('@molecule/api-resource-thread service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createThread', () => {
    it('should create a thread with required fields', async () => {
      const thread = { id: 't1', title: 'Discussion', creatorId: 'user-1' }
      mockCreate.mockResolvedValue({ data: thread })

      const result = await createThread('user-1', { title: 'Discussion' })

      expect(mockCreate).toHaveBeenCalledWith('threads', {
        title: 'Discussion',
        creatorId: 'user-1',
        resourceType: null,
        resourceId: null,
        closed: false,
      })
      expect(result).toEqual(thread)
    })

    it('should create a thread attached to a resource', async () => {
      const thread = {
        id: 't2',
        title: 'Support',
        creatorId: 'user-1',
        resourceType: 'order',
        resourceId: 'o1',
      }
      mockCreate.mockResolvedValue({ data: thread })

      const result = await createThread('user-1', {
        title: 'Support',
        resourceType: 'order',
        resourceId: 'o1',
      })

      expect(mockCreate).toHaveBeenCalledWith(
        'threads',
        expect.objectContaining({ resourceType: 'order', resourceId: 'o1' }),
      )
      expect(result).toEqual(thread)
    })
  })

  describe('getThreadById', () => {
    it('should return thread when found', async () => {
      const thread = { id: 't1', title: 'Discussion' }
      mockFindById.mockResolvedValue(thread)

      expect(await getThreadById('t1')).toEqual(thread)
    })

    it('should return null when not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await getThreadById('missing')).toBeNull()
    })
  })

  describe('getThreads', () => {
    it('should return paginated threads for a user', async () => {
      const threads = [{ id: 't1' }]
      mockFindMany.mockResolvedValue(threads)
      mockCount.mockResolvedValue(1)

      const result = await getThreads('user-1', { limit: 10, offset: 0 })

      expect(result).toEqual({ data: threads, total: 1, limit: 10, offset: 0 })
      expect(mockFindMany).toHaveBeenCalledWith('threads', {
        where: [{ field: 'creatorId', operator: '=', value: 'user-1' }],
        orderBy: [{ field: 'updatedAt', direction: 'desc' }],
        limit: 10,
        offset: 0,
      })
    })

    it('should default to limit=20, offset=0', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const result = await getThreads('user-1')

      expect(result.limit).toBe(20)
      expect(result.offset).toBe(0)
    })

    it('should filter by resourceType and closed status', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await getThreads('user-1', { resourceType: 'project', closed: false })

      expect(mockFindMany).toHaveBeenCalledWith(
        'threads',
        expect.objectContaining({
          where: expect.arrayContaining([
            { field: 'resourceType', operator: '=', value: 'project' },
            { field: 'closed', operator: '=', value: false },
          ]),
        }),
      )
    })
  })

  describe('updateThread', () => {
    it('should update owned thread', async () => {
      mockFindById.mockResolvedValue({ id: 't1', creatorId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: 't1', title: 'Updated' } })

      const result = await updateThread('t1', 'user-1', { title: 'Updated' })

      expect(result).toEqual({ id: 't1', title: 'Updated' })
      expect(mockUpdateById).toHaveBeenCalledWith(
        'threads',
        't1',
        expect.objectContaining({ title: 'Updated' }),
      )
    })

    it('should return null when not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await updateThread('missing', 'user-1', { title: 'Updated' })).toBeNull()
    })

    it('should return null when not owned by user', async () => {
      mockFindById.mockResolvedValue({ id: 't1', creatorId: 'other-user' })

      expect(await updateThread('t1', 'user-1', { title: 'Updated' })).toBeNull()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('should allow closing a thread', async () => {
      mockFindById.mockResolvedValue({ id: 't1', creatorId: 'user-1', closed: false })
      mockUpdateById.mockResolvedValue({ data: { id: 't1', closed: true } })

      const result = await updateThread('t1', 'user-1', { closed: true })

      expect(result).toEqual({ id: 't1', closed: true })
      expect(mockUpdateById).toHaveBeenCalledWith(
        'threads',
        't1',
        expect.objectContaining({ closed: true }),
      )
    })
  })

  describe('deleteThread', () => {
    it('should delete owned thread', async () => {
      mockFindById.mockResolvedValue({ id: 't1', creatorId: 'user-1' })
      mockDeleteById.mockResolvedValue({ affected: 1 })

      expect(await deleteThread('t1', 'user-1')).toBe(true)
      expect(mockDeleteById).toHaveBeenCalledWith('threads', 't1')
    })

    it('should return false when not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await deleteThread('missing', 'user-1')).toBe(false)
    })

    it('should return false when not owned', async () => {
      mockFindById.mockResolvedValue({ id: 't1', creatorId: 'other-user' })

      expect(await deleteThread('t1', 'user-1')).toBe(false)
      expect(mockDeleteById).not.toHaveBeenCalled()
    })
  })

  describe('addMessage', () => {
    it('should add a message to an open thread', async () => {
      mockFindById.mockResolvedValue({ id: 't1', closed: false })
      const msg = { id: 'm1', threadId: 't1', userId: 'user-1', body: 'Hello' }
      mockCreate.mockResolvedValue({ data: msg })
      mockUpdateById.mockResolvedValue({ data: {} })

      const result = await addMessage('t1', 'user-1', { body: 'Hello' })

      expect(result).toEqual(msg)
      expect(mockCreate).toHaveBeenCalledWith('thread_messages', {
        threadId: 't1',
        userId: 'user-1',
        body: 'Hello',
        editedAt: null,
      })
    })

    it('should return null for a closed thread', async () => {
      mockFindById.mockResolvedValue({ id: 't1', closed: true })

      expect(await addMessage('t1', 'user-1', { body: 'Hello' })).toBeNull()
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should return null when thread not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await addMessage('missing', 'user-1', { body: 'Hello' })).toBeNull()
    })

    it('should update thread updatedAt after adding message', async () => {
      mockFindById.mockResolvedValue({ id: 't1', closed: false })
      mockCreate.mockResolvedValue({ data: { id: 'm1' } })
      mockUpdateById.mockResolvedValue({ data: {} })

      await addMessage('t1', 'user-1', { body: 'Hello' })

      expect(mockUpdateById).toHaveBeenCalledWith(
        'threads',
        't1',
        expect.objectContaining({ updatedAt: expect.any(String) }),
      )
    })
  })

  describe('getMessages', () => {
    it('should return paginated messages', async () => {
      const messages = [{ id: 'm1' }]
      mockFindMany.mockResolvedValue(messages)
      mockCount.mockResolvedValue(1)

      const result = await getMessages('t1', { limit: 10, offset: 0 })

      expect(result).toEqual({ data: messages, total: 1, limit: 10, offset: 0 })
      expect(mockFindMany).toHaveBeenCalledWith('thread_messages', {
        where: [{ field: 'threadId', operator: '=', value: 't1' }],
        orderBy: [{ field: 'createdAt', direction: 'asc' }],
        limit: 10,
        offset: 0,
      })
    })

    it('should default to limit=50, offset=0', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const result = await getMessages('t1')

      expect(result.limit).toBe(50)
      expect(result.offset).toBe(0)
    })
  })

  describe('updateMessage', () => {
    it('should update owned message', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', userId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: 'm1', body: 'Edited' } })

      const result = await updateMessage('m1', 'user-1', { body: 'Edited' })

      expect(result).toEqual({ id: 'm1', body: 'Edited' })
      expect(mockUpdateById).toHaveBeenCalledWith(
        'thread_messages',
        'm1',
        expect.objectContaining({ body: 'Edited' }),
      )
    })

    it('should return null when not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await updateMessage('missing', 'user-1', { body: 'Edited' })).toBeNull()
    })

    it('should return null when not owned', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', userId: 'other-user' })

      expect(await updateMessage('m1', 'user-1', { body: 'Edited' })).toBeNull()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })
  })

  describe('deleteMessage', () => {
    it('should delete owned message', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', userId: 'user-1' })
      mockDeleteById.mockResolvedValue({ affected: 1 })

      expect(await deleteMessage('m1', 'user-1')).toBe(true)
      expect(mockDeleteById).toHaveBeenCalledWith('thread_messages', 'm1')
    })

    it('should return false when not found', async () => {
      mockFindById.mockResolvedValue(null)

      expect(await deleteMessage('missing', 'user-1')).toBe(false)
    })

    it('should return false when not owned', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', userId: 'other-user' })

      expect(await deleteMessage('m1', 'user-1')).toBe(false)
      expect(mockDeleteById).not.toHaveBeenCalled()
    })
  })

  describe('markRead', () => {
    it('should create read status when none exists', async () => {
      mockFindMany.mockResolvedValue([])
      mockCreate.mockResolvedValue({ data: {} })

      await markRead('t1', 'user-1', 'm5')

      expect(mockCreate).toHaveBeenCalledWith('thread_read_status', {
        threadId: 't1',
        userId: 'user-1',
        lastReadMessageId: 'm5',
        updatedAt: expect.any(String),
      })
    })

    it('should update existing read status', async () => {
      mockFindMany.mockResolvedValue([{ threadId: 't1', userId: 'user-1' }])
      mockUpdateById.mockResolvedValue({ data: {} })

      await markRead('t1', 'user-1', 'm10')

      expect(mockUpdateById).toHaveBeenCalledWith('thread_read_status', 't1', {
        lastReadMessageId: 'm10',
        updatedAt: expect.any(String),
      })
    })
  })

  describe('getUnreadCount', () => {
    it('should return 0 when user has no threads', async () => {
      mockFindMany.mockImplementation((table: string) => {
        if (table === 'thread_read_status') return Promise.resolve([])
        if (table === 'threads') return Promise.resolve([])
        return Promise.resolve([])
      })

      expect(await getUnreadCount('user-1')).toBe(0)
    })

    it('should count threads with unread messages', async () => {
      mockFindMany.mockImplementation((table: string) => {
        if (table === 'thread_read_status') return Promise.resolve([])
        if (table === 'threads') return Promise.resolve([{ id: 't1' }, { id: 't2' }])
        return Promise.resolve([])
      })
      mockCount.mockResolvedValue(3)

      expect(await getUnreadCount('user-1')).toBe(2)
    })

    it('should not count threads with no messages as unread when no read status', async () => {
      mockFindMany.mockImplementation((table: string) => {
        if (table === 'thread_read_status') return Promise.resolve([])
        if (table === 'threads') return Promise.resolve([{ id: 't1' }])
        return Promise.resolve([])
      })
      mockCount.mockResolvedValue(0)

      expect(await getUnreadCount('user-1')).toBe(0)
    })
  })
})
