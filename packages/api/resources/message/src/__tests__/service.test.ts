import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockCreate,
  mockFindById,
  mockFindOne,
  mockFindMany,
  mockCount,
  mockUpdateById,
  mockBroadcast,
  mockHasRealtimeProvider,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFindOne: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockUpdateById: vi.fn(),
  mockBroadcast: vi.fn(),
  mockHasRealtimeProvider: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findOne: mockFindOne,
  findMany: mockFindMany,
  count: mockCount,
  updateById: mockUpdateById,
}))

vi.mock('@molecule/api-realtime', () => ({
  broadcast: mockBroadcast,
  hasProvider: mockHasRealtimeProvider,
}))

const {
  canonicaliseParticipants,
  countMessages,
  deleteMessage,
  editMessage,
  getOrCreateThread,
  getThreadById,
  getTotalUnreadCount,
  listMessages,
  listThreadsForParticipant,
  markRead,
  sendMessage,
} = await import('../service.js')

const { MESSAGE_REALTIME_EVENTS, threadRoomId } = await import('../types.js')

describe('@molecule/api-resource-message service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasRealtimeProvider.mockReturnValue(false)
  })

  describe('canonicaliseParticipants', () => {
    it('returns smaller id first', () => {
      expect(canonicaliseParticipants('b', 'a')).toEqual(['a', 'b'])
      expect(canonicaliseParticipants('a', 'b')).toEqual(['a', 'b'])
    })

    it('throws when both participants are the same', () => {
      expect(() => canonicaliseParticipants('a', 'a')).toThrow()
    })
  })

  describe('threadRoomId', () => {
    it('produces a stable room id', () => {
      expect(threadRoomId('t1')).toBe('thread:t1')
    })
  })

  describe('getOrCreateThread', () => {
    it('returns existing thread when found in either order', async () => {
      const thread = {
        id: 't1',
        participantAId: 'a',
        participantBId: 'b',
        unreadCountA: 0,
        unreadCountB: 0,
      }
      mockFindOne.mockResolvedValue(thread)

      const result = await getOrCreateThread('b', 'a')

      expect(result).toEqual(thread)
      expect(mockFindOne).toHaveBeenCalledWith('message_threads', [
        { field: 'participantAId', operator: '=', value: 'a' },
        { field: 'participantBId', operator: '=', value: 'b' },
      ])
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('creates a thread when none exists', async () => {
      mockFindOne.mockResolvedValue(null)
      const created = {
        id: 't2',
        participantAId: 'a',
        participantBId: 'b',
        lastMessageAt: null,
        unreadCountA: 0,
        unreadCountB: 0,
      }
      mockCreate.mockResolvedValue({ data: created })

      const result = await getOrCreateThread('a', 'b')

      expect(result).toEqual(created)
      expect(mockCreate).toHaveBeenCalledWith('message_threads', {
        participantAId: 'a',
        participantBId: 'b',
        lastMessageAt: null,
        unreadCountA: 0,
        unreadCountB: 0,
      })
    })

    it('throws when create returns no data', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: null })

      await expect(getOrCreateThread('a', 'b')).rejects.toThrow(/Failed to create/)
    })

    it('throws when both participants are equal', async () => {
      await expect(getOrCreateThread('a', 'a')).rejects.toThrow()
    })
  })

  describe('getThreadById', () => {
    it('returns thread when found', async () => {
      mockFindById.mockResolvedValue({ id: 't1' })
      expect(await getThreadById('t1')).toEqual({ id: 't1' })
    })

    it('returns null when missing', async () => {
      mockFindById.mockResolvedValue(null)
      expect(await getThreadById('missing')).toBeNull()
    })
  })

  describe('listThreadsForParticipant', () => {
    it('merges and sorts by lastMessageAt desc', async () => {
      mockFindMany.mockImplementation((_table: string, opts: { where: { field: string }[] }) => {
        if (opts.where[0].field === 'participantAId') {
          return Promise.resolve([
            { id: 't1', lastMessageAt: '2026-01-02T00:00:00Z', participantAId: 'me' },
            { id: 't3', lastMessageAt: null, participantAId: 'me' },
          ])
        }
        return Promise.resolve([
          { id: 't2', lastMessageAt: '2026-01-03T00:00:00Z', participantBId: 'me' },
        ])
      })

      const result = await listThreadsForParticipant('me', { limit: 10 })

      expect(result.map((t) => t.id)).toEqual(['t2', 't1', 't3'])
    })

    it('clamps limit and applies offset', async () => {
      mockFindMany.mockResolvedValue([])
      await listThreadsForParticipant('me', { limit: 1000, offset: 5 })
      // Both queries must be issued.
      expect(mockFindMany).toHaveBeenCalledTimes(2)
    })
  })

  describe('sendMessage', () => {
    const thread = {
      id: 't1',
      participantAId: 'a',
      participantBId: 'b',
      unreadCountA: 0,
      unreadCountB: 0,
    }

    it('persists, bumps recipient unread, and sets lastMessageAt', async () => {
      mockFindById.mockResolvedValue(thread)
      const persisted = { id: 'm1', threadId: 't1', senderId: 'a', body: 'hi' }
      mockCreate.mockResolvedValue({ data: persisted })
      mockUpdateById.mockResolvedValue({ data: {} })

      const result = await sendMessage('t1', 'a', 'hi')

      expect(result).toEqual(persisted)
      expect(mockCreate).toHaveBeenCalledWith(
        'messages',
        expect.objectContaining({
          threadId: 't1',
          senderId: 'a',
          body: 'hi',
          attachments: [],
          editedAt: null,
          deletedAt: null,
        }),
      )
      expect(mockUpdateById).toHaveBeenCalledWith(
        'message_threads',
        't1',
        expect.objectContaining({
          unreadCountB: 1,
          lastMessageAt: expect.any(String),
        }),
      )
    })

    it('bumps unreadCountA when participant B sends', async () => {
      mockFindById.mockResolvedValue({ ...thread, unreadCountA: 5 })
      mockCreate.mockResolvedValue({ data: { id: 'm1' } })
      mockUpdateById.mockResolvedValue({ data: {} })

      await sendMessage('t1', 'b', 'hi')

      expect(mockUpdateById).toHaveBeenCalledWith(
        'message_threads',
        't1',
        expect.objectContaining({ unreadCountA: 6 }),
      )
    })

    it('throws when body is empty/whitespace', async () => {
      await expect(sendMessage('t1', 'a', '')).rejects.toThrow(/non-empty/)
      await expect(sendMessage('t1', 'a', '   ')).rejects.toThrow(/non-empty/)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('throws when thread is missing', async () => {
      mockFindById.mockResolvedValue(null)
      await expect(sendMessage('missing', 'a', 'hi')).rejects.toThrow(/not found/)
    })

    it('throws when sender is not a participant', async () => {
      mockFindById.mockResolvedValue(thread)
      await expect(sendMessage('t1', 'c', 'hi')).rejects.toThrow(/not a participant/)
    })

    it('broadcasts when realtime is bonded', async () => {
      mockHasRealtimeProvider.mockReturnValue(true)
      mockFindById.mockResolvedValue(thread)
      const persisted = { id: 'm1', threadId: 't1', senderId: 'a', body: 'hi' }
      mockCreate.mockResolvedValue({ data: persisted })
      mockUpdateById.mockResolvedValue({ data: {} })

      await sendMessage('t1', 'a', 'hi')

      expect(mockBroadcast).toHaveBeenCalledWith(
        threadRoomId('t1'),
        MESSAGE_REALTIME_EVENTS.messageSent,
        persisted,
      )
    })

    it('does not broadcast when realtime is not bonded', async () => {
      mockHasRealtimeProvider.mockReturnValue(false)
      mockFindById.mockResolvedValue(thread)
      mockCreate.mockResolvedValue({ data: { id: 'm1' } })
      mockUpdateById.mockResolvedValue({ data: {} })

      await sendMessage('t1', 'a', 'hi')

      expect(mockBroadcast).not.toHaveBeenCalled()
    })

    it('persists even when broadcast throws', async () => {
      mockHasRealtimeProvider.mockReturnValue(true)
      mockBroadcast.mockRejectedValue(new Error('socket exploded'))
      mockFindById.mockResolvedValue(thread)
      mockCreate.mockResolvedValue({ data: { id: 'm1' } })
      mockUpdateById.mockResolvedValue({ data: {} })

      await expect(sendMessage('t1', 'a', 'hi')).resolves.toBeDefined()
    })

    it('handles concurrent sends — both increment from observed counter', async () => {
      // Each call observes the thread independently (real DB increment would
      // need a transactional UPDATE; the abstract DataStore does not yet
      // expose one, so we document concurrent behaviour rather than claim
      // race-freedom).
      let counter = 0
      mockFindById.mockImplementation(() => Promise.resolve({ ...thread, unreadCountB: counter }))
      mockCreate.mockImplementation(() => Promise.resolve({ data: { id: `m${counter}` } }))
      mockUpdateById.mockImplementation((_t, _id, data: Record<string, unknown>) => {
        counter = data.unreadCountB as number
        return Promise.resolve({ data: {} })
      })

      await Promise.all([sendMessage('t1', 'a', 'one'), sendMessage('t1', 'a', 'two')])

      // Two sends must produce two creates and two updates.
      expect(mockCreate).toHaveBeenCalledTimes(2)
      expect(mockUpdateById).toHaveBeenCalledTimes(2)
    })
  })

  describe('markRead', () => {
    const thread = {
      id: 't1',
      participantAId: 'a',
      participantBId: 'b',
      unreadCountA: 7,
      unreadCountB: 3,
    }

    it('zeroes the reader-A unread counter', async () => {
      mockFindById.mockResolvedValue(thread)
      mockUpdateById.mockResolvedValue({ data: {} })

      await markRead('t1', 'a')

      expect(mockUpdateById).toHaveBeenCalledWith(
        'message_threads',
        't1',
        expect.objectContaining({ unreadCountA: 0 }),
      )
    })

    it('zeroes the reader-B unread counter', async () => {
      mockFindById.mockResolvedValue(thread)
      mockUpdateById.mockResolvedValue({ data: {} })

      await markRead('t1', 'b')

      expect(mockUpdateById).toHaveBeenCalledWith(
        'message_threads',
        't1',
        expect.objectContaining({ unreadCountB: 0 }),
      )
    })

    it('throws when thread is missing', async () => {
      mockFindById.mockResolvedValue(null)
      await expect(markRead('missing', 'a')).rejects.toThrow(/not found/)
    })

    it('throws when reader is not a participant', async () => {
      mockFindById.mockResolvedValue(thread)
      await expect(markRead('t1', 'c')).rejects.toThrow(/not a participant/)
    })

    it('broadcasts message:read when realtime is bonded', async () => {
      mockHasRealtimeProvider.mockReturnValue(true)
      mockFindById.mockResolvedValue(thread)
      mockUpdateById.mockResolvedValue({ data: {} })

      await markRead('t1', 'a')

      expect(mockBroadcast).toHaveBeenCalledWith(
        threadRoomId('t1'),
        MESSAGE_REALTIME_EVENTS.messageRead,
        expect.objectContaining({ threadId: 't1', readerId: 'a' }),
      )
    })
  })

  describe('listMessages', () => {
    it('returns messages ordered desc with default limit 50', async () => {
      mockFindMany.mockResolvedValue([{ id: 'm2' }, { id: 'm1' }])

      const result = await listMessages('t1')

      expect(result).toEqual([{ id: 'm2' }, { id: 'm1' }])
      expect(mockFindMany).toHaveBeenCalledWith('messages', {
        where: [{ field: 'threadId', operator: '=', value: 't1' }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 50,
      })
    })

    it('applies a `before` filter', async () => {
      mockFindMany.mockResolvedValue([])
      await listMessages('t1', { before: '2026-01-01T00:00:00Z', limit: 10 })

      expect(mockFindMany).toHaveBeenCalledWith(
        'messages',
        expect.objectContaining({
          where: [
            { field: 'threadId', operator: '=', value: 't1' },
            { field: 'createdAt', operator: '<', value: '2026-01-01T00:00:00Z' },
          ],
          limit: 10,
        }),
      )
    })

    it('clamps limit to 200', async () => {
      mockFindMany.mockResolvedValue([])
      await listMessages('t1', { limit: 1_000_000 })
      expect(mockFindMany).toHaveBeenCalledWith('messages', expect.objectContaining({ limit: 200 }))
    })
  })

  describe('editMessage', () => {
    it('updates body and stamps editedAt for owner', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', senderId: 'a', deletedAt: null })
      mockUpdateById.mockResolvedValue({ data: { id: 'm1', body: 'edited' } })

      const result = await editMessage('m1', 'a', 'edited')

      expect(result).toEqual({ id: 'm1', body: 'edited' })
      expect(mockUpdateById).toHaveBeenCalledWith(
        'messages',
        'm1',
        expect.objectContaining({ body: 'edited', editedAt: expect.any(String) }),
      )
    })

    it('returns null when not found', async () => {
      mockFindById.mockResolvedValue(null)
      expect(await editMessage('missing', 'a', 'edit')).toBeNull()
    })

    it('returns null when not owner', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', senderId: 'b', deletedAt: null })
      expect(await editMessage('m1', 'a', 'edit')).toBeNull()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('returns null when message is soft-deleted', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', senderId: 'a', deletedAt: 'x' })
      expect(await editMessage('m1', 'a', 'edit')).toBeNull()
    })

    it('throws on empty body', async () => {
      await expect(editMessage('m1', 'a', '   ')).rejects.toThrow(/non-empty/)
    })
  })

  describe('deleteMessage', () => {
    it('soft-deletes for owner and blanks body', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', senderId: 'a', deletedAt: null })
      mockUpdateById.mockResolvedValue({ data: {} })

      const ok = await deleteMessage('m1', 'a')

      expect(ok).toBe(true)
      expect(mockUpdateById).toHaveBeenCalledWith(
        'messages',
        'm1',
        expect.objectContaining({ deletedAt: expect.any(String), body: '', attachments: [] }),
      )
    })

    it('returns false when not owned', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', senderId: 'b', deletedAt: null })
      expect(await deleteMessage('m1', 'a')).toBe(false)
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('returns false when already deleted', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', senderId: 'a', deletedAt: 'x' })
      expect(await deleteMessage('m1', 'a')).toBe(false)
    })

    it('returns false when missing', async () => {
      mockFindById.mockResolvedValue(null)
      expect(await deleteMessage('missing', 'a')).toBe(false)
    })
  })

  describe('getTotalUnreadCount', () => {
    it('sums unread across A and B sides', async () => {
      mockFindMany.mockImplementation((_table: string, opts: { where: { value: string }[] }) => {
        if (opts.where[0].field === 'participantAId') {
          return Promise.resolve([{ unreadCountA: 3 }, { unreadCountA: 1 }])
        }
        return Promise.resolve([{ unreadCountB: 5 }])
      })

      expect(await getTotalUnreadCount('me')).toBe(9)
    })

    it('handles missing counters gracefully', async () => {
      mockFindMany.mockResolvedValue([{ id: 't' }])
      expect(await getTotalUnreadCount('me')).toBe(0)
    })
  })

  describe('countMessages', () => {
    it('delegates to count()', async () => {
      mockCount.mockResolvedValue(42)
      expect(await countMessages('t1')).toBe(42)
      expect(mockCount).toHaveBeenCalledWith('messages', [
        { field: 'threadId', operator: '=', value: 't1' },
      ])
    })
  })
})
