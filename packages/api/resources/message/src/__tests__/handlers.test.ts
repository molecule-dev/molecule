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
  mockHasRealtimeProvider: vi.fn(() => false),
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

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

const { createThread } = await import('../handlers/createThread.js')
const { listThreads } = await import('../handlers/listThreads.js')
const { readThread } = await import('../handlers/readThread.js')
const { listMessagesHandler, sendMessageHandler } = await import('../handlers/messages.js')
const { markReadHandler } = await import('../handlers/markRead.js')
const { editMessageHandler } = await import('../handlers/editMessage.js')
const { deleteMessageHandler } = await import('../handlers/deleteMessage.js')
const { unreadCount } = await import('../handlers/unreadCount.js')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return { params: {}, body: {}, query: {}, ...overrides }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(overrides: Record<string, unknown> = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session: { userId: 'user-a' } },
    ...overrides,
  }
  return res
}

const baseThread = {
  id: 't1',
  participantAId: 'user-a',
  participantBId: 'user-b',
  unreadCountA: 0,
  unreadCountB: 0,
  lastMessageAt: null,
}

describe('@molecule/api-resource-message handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasRealtimeProvider.mockReturnValue(false)
  })

  describe('createThread', () => {
    it('returns 401 without session', async () => {
      const req = mockReq({ body: { participantId: 'user-b' } })
      const res = mockRes({ locals: {} })

      await createThread(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when participantId missing', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()

      await createThread(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 when self-thread', async () => {
      const req = mockReq({ body: { participantId: 'user-a' } })
      const res = mockRes()

      await createThread(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns existing thread', async () => {
      mockFindOne.mockResolvedValue(baseThread)
      const req = mockReq({ body: { participantId: 'user-b' } })
      const res = mockRes()

      await createThread(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(baseThread)
    })

    it('creates a new thread when none exists', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: baseThread })

      const req = mockReq({ body: { participantId: 'user-b' } })
      const res = mockRes()

      await createThread(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('listThreads', () => {
    it('returns 401 without session', async () => {
      const res = mockRes({ locals: {} })
      await listThreads(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns paginated threads', async () => {
      mockFindMany.mockResolvedValue([])
      const res = mockRes()
      await listThreads(mockReq({ query: { limit: '5' } }), res)
      expect(res.json).toHaveBeenCalledWith({ data: [], limit: 5, offset: 0 })
    })
  })

  describe('readThread', () => {
    it('returns 401 without session', async () => {
      const res = mockRes({ locals: {} })
      await readThread(mockReq({ params: { threadId: 't1' } }), res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 404 when missing', async () => {
      mockFindById.mockResolvedValue(null)
      const res = mockRes()
      await readThread(mockReq({ params: { threadId: 'missing' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 403 when caller is not a participant', async () => {
      mockFindById.mockResolvedValue({ ...baseThread, participantAId: 'x', participantBId: 'y' })
      const res = mockRes()
      await readThread(mockReq({ params: { threadId: 't1' } }), res)
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns the thread when caller is a participant', async () => {
      mockFindById.mockResolvedValue(baseThread)
      const res = mockRes()
      await readThread(mockReq({ params: { threadId: 't1' } }), res)
      expect(res.json).toHaveBeenCalledWith(baseThread)
    })
  })

  describe('sendMessageHandler', () => {
    it('returns 401 without session', async () => {
      const res = mockRes({ locals: {} })
      await sendMessageHandler(mockReq({ params: { threadId: 't1' } }), res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when body missing', async () => {
      const res = mockRes()
      await sendMessageHandler(mockReq({ params: { threadId: 't1' }, body: {} }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when thread missing', async () => {
      mockFindById.mockResolvedValue(null)
      const res = mockRes()
      await sendMessageHandler(mockReq({ params: { threadId: 't1' }, body: { body: 'hi' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 403 when not a participant', async () => {
      mockFindById.mockResolvedValue({ ...baseThread, participantAId: 'x', participantBId: 'y' })
      const res = mockRes()
      await sendMessageHandler(mockReq({ params: { threadId: 't1' }, body: { body: 'hi' } }), res)
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns 201 with the new message on success', async () => {
      mockFindById.mockResolvedValue(baseThread)
      mockCreate.mockResolvedValue({ data: { id: 'm1', body: 'hi' } })
      mockUpdateById.mockResolvedValue({ data: {} })

      const res = mockRes()
      await sendMessageHandler(mockReq({ params: { threadId: 't1' }, body: { body: 'hi' } }), res)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ id: 'm1', body: 'hi' })
    })
  })

  describe('listMessagesHandler', () => {
    it('returns 401 without session', async () => {
      const res = mockRes({ locals: {} })
      await listMessagesHandler(mockReq({ params: { threadId: 't1' } }), res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 404 when thread missing', async () => {
      mockFindById.mockResolvedValue(null)
      const res = mockRes()
      await listMessagesHandler(mockReq({ params: { threadId: 't1' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns messages when participant', async () => {
      mockFindById.mockResolvedValue(baseThread)
      mockFindMany.mockResolvedValue([{ id: 'm1' }])
      const res = mockRes()
      await listMessagesHandler(mockReq({ params: { threadId: 't1' } }), res)
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'm1' }], limit: 50 })
    })
  })

  describe('markReadHandler', () => {
    it('returns 204 on success', async () => {
      mockFindById.mockResolvedValue(baseThread)
      mockUpdateById.mockResolvedValue({ data: {} })

      const res = mockRes()
      await markReadHandler(mockReq({ params: { threadId: 't1' } }), res)
      expect(res.status).toHaveBeenCalledWith(204)
    })

    it('returns 404 when thread missing', async () => {
      mockFindById.mockResolvedValue(null)
      const res = mockRes()
      await markReadHandler(mockReq({ params: { threadId: 'missing' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('editMessageHandler', () => {
    it('returns 401 without session', async () => {
      const res = mockRes({ locals: {} })
      await editMessageHandler(mockReq({ params: { messageId: 'm1' } }), res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when body missing', async () => {
      const res = mockRes()
      await editMessageHandler(mockReq({ params: { messageId: 'm1' }, body: {} }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when not authored by user', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', senderId: 'other', deletedAt: null })
      const res = mockRes()
      await editMessageHandler(
        mockReq({ params: { messageId: 'm1' }, body: { body: 'edit' } }),
        res,
      )
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns updated message on success', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', senderId: 'user-a', deletedAt: null })
      mockUpdateById.mockResolvedValue({ data: { id: 'm1', body: 'edit' } })

      const res = mockRes()
      await editMessageHandler(
        mockReq({ params: { messageId: 'm1' }, body: { body: 'edit' } }),
        res,
      )
      expect(res.json).toHaveBeenCalledWith({ id: 'm1', body: 'edit' })
    })
  })

  describe('deleteMessageHandler', () => {
    it('returns 204 on success', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', senderId: 'user-a', deletedAt: null })
      mockUpdateById.mockResolvedValue({ data: {} })

      const res = mockRes()
      await deleteMessageHandler(mockReq({ params: { messageId: 'm1' } }), res)
      expect(res.status).toHaveBeenCalledWith(204)
    })

    it('returns 404 when not authored by user', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', senderId: 'other', deletedAt: null })
      const res = mockRes()
      await deleteMessageHandler(mockReq({ params: { messageId: 'm1' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('unreadCount', () => {
    it('returns 401 without session', async () => {
      const res = mockRes({ locals: {} })
      await unreadCount(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns total unread', async () => {
      mockFindMany.mockResolvedValue([])
      const res = mockRes()
      await unreadCount(mockReq(), res)
      expect(res.json).toHaveBeenCalledWith({ unreadCount: 0 })
    })
  })
})
