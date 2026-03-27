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
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from '../handlers/create.js'
import { del } from '../handlers/del.js'
import { list } from '../handlers/list.js'
import { following } from '../handlers/read.js'
import { checkFollowing } from '../handlers/update.js'

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
    locals: { session: { userId: 'user-1' } },
    ...overrides,
  }
  return res
}

describe('@molecule/api-resource-follow handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create (follow)', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { targetType: 'user', targetId: 'u2' } })
      const res = mockRes({ locals: {} })
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when target params missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should create a follow', async () => {
      const followObj = { id: 'f1', followerId: 'user-1', targetType: 'user', targetId: 'u2' }
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: followObj })

      const req = mockReq({ params: { targetType: 'user', targetId: 'u2' } })
      const res = mockRes()
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(followObj)
    })

    it('should return existing follow (idempotent)', async () => {
      const existing = { id: 'f1' }
      mockFindOne.mockResolvedValue(existing)

      const req = mockReq({ params: { targetType: 'user', targetId: 'u2' } })
      const res = mockRes()
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  describe('del (unfollow)', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { targetType: 'user', targetId: 'u2' } })
      const res = mockRes({ locals: {} })
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should unfollow and return 204', async () => {
      mockDeleteMany.mockResolvedValue({ affected: 1 })

      const req = mockReq({ params: { targetType: 'user', targetId: 'u2' } })
      const res = mockRes()
      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })

  describe('list (followers)', () => {
    it('should return 400 when target params missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()
      await list(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return paginated followers', async () => {
      const followers = [{ id: 'f1', followerId: 'user-1' }]
      mockFindMany.mockResolvedValue(followers)
      mockCount.mockResolvedValue(1)

      const req = mockReq({ params: { targetType: 'user', targetId: 'u2' }, query: {} })
      const res = mockRes()
      await list(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: followers,
        total: 1,
        limit: 20,
        offset: 0,
      })
    })
  })

  describe('following', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })
      await following(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return paginated following list', async () => {
      const followList = [{ id: 'f1', targetType: 'user', targetId: 'u2' }]
      mockFindMany.mockResolvedValue(followList)
      mockCount.mockResolvedValue(1)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await following(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: followList,
        total: 1,
        limit: 20,
        offset: 0,
      })
    })
  })

  describe('checkFollowing', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { targetType: 'user', targetId: 'u2' } })
      const res = mockRes({ locals: {} })
      await checkFollowing(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return following: true', async () => {
      mockFindOne.mockResolvedValue({ id: 'f1' })

      const req = mockReq({ params: { targetType: 'user', targetId: 'u2' } })
      const res = mockRes()
      await checkFollowing(req, res)

      expect(res.json).toHaveBeenCalledWith({ following: true })
    })

    it('should return following: false', async () => {
      mockFindOne.mockResolvedValue(null)

      const req = mockReq({ params: { targetType: 'user', targetId: 'u2' } })
      const res = mockRes()
      await checkFollowing(req, res)

      expect(res.json).toHaveBeenCalledWith({ following: false })
    })
  })
})
