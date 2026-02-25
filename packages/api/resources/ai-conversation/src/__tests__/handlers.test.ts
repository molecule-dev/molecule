const { mockCreate, mockFindOne, mockUpdateById, mockDeleteById } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
  mockDeleteById: vi.fn(),
}))

const { mockGetProvider } = vi.hoisted(() => ({
  mockGetProvider: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
}))

vi.mock('@molecule/api-ai', () => ({
  getProvider: mockGetProvider,
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

vi.mock('@molecule/api-bond', () => ({
  getAnalytics: () => ({
    identify: vi.fn().mockResolvedValue(undefined),
    track: vi.fn().mockResolvedValue(undefined),
    page: vi.fn().mockResolvedValue(undefined),
  }),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clear } from '../handlers/del.js'
import { history } from '../handlers/list.js'
import { read } from '../handlers/read.js'
import { update } from '../handlers/update.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: { projectId: 'proj-1' },
    body: {},
    on: vi.fn(),
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
  }
  return res
}

describe('@molecule/api-resource-ai-conversation handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('history', () => {
    it('should return empty messages when no conversation exists', async () => {
      mockFindOne.mockResolvedValue(null)

      const req = mockReq()
      const res = mockRes()

      await history(req, res)

      expect(res.json).toHaveBeenCalledWith({ messages: [] })
    })

    it('should return conversation messages', async () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
        { role: 'assistant', content: 'Hi there!', timestamp: '2024-01-01T00:00:01Z' },
      ]
      mockFindOne.mockResolvedValue({ messages })

      const req = mockReq()
      const res = mockRes()

      await history(req, res)

      expect(res.json).toHaveBeenCalledWith({ messages })
    })
  })

  describe('read', () => {
    it('should return conversation', async () => {
      const conversation = { id: 'conv-1', projectId: 'proj-1', messages: [] }
      mockFindOne.mockResolvedValue(conversation)

      const req = mockReq()
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(conversation)
    })

    it('should return 404 when not found', async () => {
      mockFindOne.mockResolvedValue(null)

      const req = mockReq()
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('update', () => {
    it('should return 404 when conversation not found', async () => {
      mockFindOne.mockResolvedValue(null)

      const req = mockReq({ body: { aiContext: { system: 'Be helpful' } } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should update aiContext', async () => {
      mockFindOne.mockResolvedValue({ id: 'conv-1' })
      mockUpdateById.mockResolvedValue({ data: { id: 'conv-1' } })

      const req = mockReq({ body: { aiContext: { system: 'Be helpful' } } })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.aiContext).toBe('{"system":"Be helpful"}')
      expect(updateData.updatedAt).toBeDefined()
    })

    it('should not update aiContext when not provided', async () => {
      mockFindOne.mockResolvedValue({ id: 'conv-1' })
      mockUpdateById.mockResolvedValue({ data: { id: 'conv-1' } })

      const req = mockReq({ body: {} })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.aiContext).toBeUndefined()
    })
  })

  describe('clear', () => {
    it('should return 204 when no conversation exists', async () => {
      mockFindOne.mockResolvedValue(null)

      const req = mockReq()
      const res = mockRes()

      await clear(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
      expect(mockDeleteById).not.toHaveBeenCalled()
    })

    it('should delete conversation and return 204', async () => {
      mockFindOne.mockResolvedValue({ id: 'conv-1' })
      mockDeleteById.mockResolvedValue(undefined)

      const req = mockReq()
      const res = mockRes()

      await clear(req, res)

      expect(mockDeleteById).toHaveBeenCalledWith('conversations', 'conv-1')
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })
})
