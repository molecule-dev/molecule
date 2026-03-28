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
import { deleteMsg } from '../handlers/deleteMessage.js'
import { list } from '../handlers/list.js'
import { markThreadRead } from '../handlers/markRead.js'
import { createMessage, listMessages } from '../handlers/messages.js'
import { read } from '../handlers/read.js'
import { unread } from '../handlers/unread.js'
import { update } from '../handlers/update.js'
import { updateMsg } from '../handlers/updateMessage.js'

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

describe('@molecule/api-resource-thread handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ body: { title: 'Test' } })
      const res = mockRes({ locals: {} })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when title is empty', async () => {
      const req = mockReq({ body: { title: '' } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when title is missing', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should create a thread', async () => {
      const thread = { id: 't1', title: 'Discussion', creatorId: 'user-1' }
      mockCreate.mockResolvedValue({ data: thread })

      const req = mockReq({ body: { title: 'Discussion' } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(thread)
    })

    it('should create a thread with resource attachment', async () => {
      const thread = {
        id: 't2',
        title: 'Support',
        creatorId: 'user-1',
        resourceType: 'order',
        resourceId: 'o1',
      }
      mockCreate.mockResolvedValue({ data: thread })

      const req = mockReq({
        body: { title: 'Support', resourceType: 'order', resourceId: 'o1' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(thread)
    })

    it('should return 500 on database error', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ body: { title: 'Test' } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('read', () => {
    it('should return 400 when threadId missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { threadId: 't-missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return thread by ID', async () => {
      const thread = { id: 't1', title: 'Discussion' }
      mockFindById.mockResolvedValue(thread)

      const req = mockReq({ params: { threadId: 't1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(thread)
    })
  })

  describe('list', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return paginated threads', async () => {
      const threads = [{ id: 't1' }]
      mockFindMany.mockResolvedValue(threads)
      mockCount.mockResolvedValue(1)

      const req = mockReq({ query: { limit: '10', offset: '0' } })
      const res = mockRes()

      await list(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: threads,
        total: 1,
        limit: 10,
        offset: 0,
      })
    })
  })

  describe('update', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { threadId: 't1' }, body: { title: 'Updated' } })
      const res = mockRes({ locals: {} })

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when threadId missing', async () => {
      const req = mockReq({ params: {}, body: { title: 'Updated' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when not found or not owned', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { threadId: 't1' }, body: { title: 'Updated' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should update owned thread', async () => {
      mockFindById.mockResolvedValue({ id: 't1', creatorId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: 't1', title: 'Updated' } })

      const req = mockReq({ params: { threadId: 't1' }, body: { title: 'Updated' } })
      const res = mockRes()

      await update(req, res)

      expect(res.json).toHaveBeenCalledWith({ id: 't1', title: 'Updated' })
    })
  })

  describe('del', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { threadId: 't1' } })
      const res = mockRes({ locals: {} })

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { threadId: 't1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should delete owned thread', async () => {
      mockFindById.mockResolvedValue({ id: 't1', creatorId: 'user-1' })
      mockDeleteById.mockResolvedValue({ affected: 1 })

      const req = mockReq({ params: { threadId: 't1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })

  describe('listMessages', () => {
    it('should return 400 when threadId missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await listMessages(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return paginated messages', async () => {
      const messages = [{ id: 'm1', body: 'Hello' }]
      mockFindMany.mockResolvedValue(messages)
      mockCount.mockResolvedValue(1)

      const req = mockReq({ params: { threadId: 't1' }, query: {} })
      const res = mockRes()

      await listMessages(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: messages,
        total: 1,
        limit: 50,
        offset: 0,
      })
    })
  })

  describe('createMessage', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { threadId: 't1' }, body: { body: 'Hello' } })
      const res = mockRes({ locals: {} })

      await createMessage(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when threadId missing', async () => {
      const req = mockReq({ params: {}, body: { body: 'Hello' } })
      const res = mockRes()

      await createMessage(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when body is empty', async () => {
      const req = mockReq({ params: { threadId: 't1' }, body: { body: '' } })
      const res = mockRes()

      await createMessage(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when thread is closed', async () => {
      mockFindById.mockResolvedValue({ id: 't1', closed: true })

      const req = mockReq({ params: { threadId: 't1' }, body: { body: 'Hello' } })
      const res = mockRes()

      await createMessage(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should create a message', async () => {
      mockFindById.mockResolvedValue({ id: 't1', closed: false })
      const msg = { id: 'm1', threadId: 't1', userId: 'user-1', body: 'Hello' }
      mockCreate.mockResolvedValue({ data: msg })
      mockUpdateById.mockResolvedValue({ data: {} })

      const req = mockReq({ params: { threadId: 't1' }, body: { body: 'Hello' } })
      const res = mockRes()

      await createMessage(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(msg)
    })
  })

  describe('updateMsg', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { messageId: 'm1' }, body: { body: 'Updated' } })
      const res = mockRes({ locals: {} })

      await updateMsg(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when messageId missing', async () => {
      const req = mockReq({ params: {}, body: { body: 'Updated' } })
      const res = mockRes()

      await updateMsg(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { messageId: 'm1' }, body: { body: 'Updated' } })
      const res = mockRes()

      await updateMsg(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should update owned message', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', userId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: 'm1', body: 'Updated' } })

      const req = mockReq({ params: { messageId: 'm1' }, body: { body: 'Updated' } })
      const res = mockRes()

      await updateMsg(req, res)

      expect(res.json).toHaveBeenCalledWith({ id: 'm1', body: 'Updated' })
    })
  })

  describe('deleteMsg', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { messageId: 'm1' } })
      const res = mockRes({ locals: {} })

      await deleteMsg(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { messageId: 'm1' } })
      const res = mockRes()

      await deleteMsg(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should delete owned message', async () => {
      mockFindById.mockResolvedValue({ id: 'm1', userId: 'user-1' })
      mockDeleteById.mockResolvedValue({ affected: 1 })

      const req = mockReq({ params: { messageId: 'm1' } })
      const res = mockRes()

      await deleteMsg(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })

  describe('markThreadRead', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { threadId: 't1' }, body: { lastReadMessageId: 'm1' } })
      const res = mockRes({ locals: {} })

      await markThreadRead(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when threadId missing', async () => {
      const req = mockReq({ params: {}, body: { lastReadMessageId: 'm1' } })
      const res = mockRes()

      await markThreadRead(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when lastReadMessageId missing', async () => {
      const req = mockReq({ params: { threadId: 't1' }, body: {} })
      const res = mockRes()

      await markThreadRead(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should mark thread as read', async () => {
      mockFindMany.mockResolvedValue([])
      mockCreate.mockResolvedValue({ data: {} })

      const req = mockReq({ params: { threadId: 't1' }, body: { lastReadMessageId: 'm5' } })
      const res = mockRes()

      await markThreadRead(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })

  describe('unread', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })

      await unread(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return unread count', async () => {
      mockFindMany.mockImplementation((table: string) => {
        if (table === 'thread_read_status') return Promise.resolve([])
        if (table === 'threads') return Promise.resolve([])
        return Promise.resolve([])
      })

      const req = mockReq()
      const res = mockRes()

      await unread(req, res)

      expect(res.json).toHaveBeenCalledWith({ count: 0 })
    })
  })
})
