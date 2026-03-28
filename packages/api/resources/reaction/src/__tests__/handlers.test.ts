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
import { list } from '../handlers/list.js'

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

describe('@molecule/api-resource-reaction handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create (add reaction)', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        body: { type: 'like' },
      })
      const res = mockRes({ locals: {} })

      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when resource params missing', async () => {
      const req = mockReq({ params: {}, body: { type: 'like' } })
      const res = mockRes()

      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when type is missing', async () => {
      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        body: {},
      })
      const res = mockRes()

      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should add a new reaction', async () => {
      const reaction = { id: 'r1', type: 'like', userId: 'user-1' }
      mockFindOne.mockResolvedValue(null) // No existing reaction
      mockCreate.mockResolvedValue({ data: reaction })

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        body: { type: 'like' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(reaction)
    })

    it('should return existing reaction (idempotent)', async () => {
      const existing = { id: 'r1', type: 'like', userId: 'user-1' }
      mockFindOne.mockResolvedValue(existing)

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        body: { type: 'like' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(existing)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should return 500 on database error', async () => {
      mockFindOne.mockRejectedValue(new Error('DB error'))

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        body: { type: 'like' },
      })
      const res = mockRes()

      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('del (remove reaction)', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
      })
      const res = mockRes({ locals: {} })

      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should remove all user reactions on resource', async () => {
      mockDeleteMany.mockResolvedValue({ affected: 1 })

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        query: {},
      })
      const res = mockRes()

      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it('should remove specific reaction type', async () => {
      mockDeleteMany.mockResolvedValue({ affected: 1 })

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        query: { type: 'like' },
      })
      const res = mockRes()

      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(204)
    })
  })

  describe('list (get summary)', () => {
    it('should return 400 when resource params missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await list(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return reaction summary', async () => {
      const reactions = [
        { id: 'r1', type: 'like', userId: 'user-1' },
        { id: 'r2', type: 'like', userId: 'user-2' },
        { id: 'r3', type: 'love', userId: 'user-1' },
      ]
      mockFindMany.mockResolvedValue(reactions)
      mockCount.mockResolvedValue(3)

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
      })
      const res = mockRes()

      await list(req, res)

      expect(res.json).toHaveBeenCalledWith({
        total: 3,
        counts: { like: 2, love: 1 },
        userReactions: ['like', 'love'],
      })
    })

    it('should work without user session', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
      })
      const res = mockRes({ locals: {} })

      await list(req, res)

      expect(res.json).toHaveBeenCalledWith({
        total: 0,
        counts: {},
        userReactions: [],
      })
    })
  })
})
