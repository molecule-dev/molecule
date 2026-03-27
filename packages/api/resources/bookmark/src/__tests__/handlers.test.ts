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
import { check } from '../handlers/read.js'
import { folders } from '../handlers/update.js'

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

describe('@molecule/api-resource-bookmark handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ body: { resourceType: 'post', resourceId: 'p1' } })
      const res = mockRes({ locals: {} })
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 with invalid input', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should create a bookmark', async () => {
      const bookmark = { id: 'b1', userId: 'user-1', resourceType: 'post', resourceId: 'p1' }
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: bookmark })

      const req = mockReq({ body: { resourceType: 'post', resourceId: 'p1' } })
      const res = mockRes()
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(bookmark)
    })

    it('should create a bookmark with folder', async () => {
      const bookmark = { id: 'b1', folder: 'favorites' }
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: bookmark })

      const req = mockReq({
        body: { resourceType: 'post', resourceId: 'p1', folder: 'favorites' },
      })
      const res = mockRes()
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('should return existing bookmark (idempotent)', async () => {
      const existing = { id: 'b1' }
      mockFindOne.mockResolvedValue(existing)

      const req = mockReq({ body: { resourceType: 'post', resourceId: 'p1' } })
      const res = mockRes()
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  describe('del', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { resourceType: 'post', resourceId: 'p1' } })
      const res = mockRes({ locals: {} })
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when params missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should remove bookmark and return 204', async () => {
      mockDeleteMany.mockResolvedValue({ affected: 1 })

      const req = mockReq({ params: { resourceType: 'post', resourceId: 'p1' } })
      const res = mockRes()
      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })

  describe('list', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })
      await list(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return paginated bookmarks', async () => {
      const bookmarks = [{ id: 'b1' }]
      mockFindMany.mockResolvedValue(bookmarks)
      mockCount.mockResolvedValue(1)

      const req = mockReq({ query: { limit: '10' } })
      const res = mockRes()
      await list(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: bookmarks,
        total: 1,
        limit: 10,
        offset: 0,
      })
    })
  })

  describe('check', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { resourceType: 'post', resourceId: 'p1' } })
      const res = mockRes({ locals: {} })
      await check(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return bookmarked: true when bookmarked', async () => {
      mockFindOne.mockResolvedValue({ id: 'b1' })

      const req = mockReq({ params: { resourceType: 'post', resourceId: 'p1' } })
      const res = mockRes()
      await check(req, res)

      expect(res.json).toHaveBeenCalledWith({ bookmarked: true })
    })

    it('should return bookmarked: false when not bookmarked', async () => {
      mockFindOne.mockResolvedValue(null)

      const req = mockReq({ params: { resourceType: 'post', resourceId: 'p1' } })
      const res = mockRes()
      await check(req, res)

      expect(res.json).toHaveBeenCalledWith({ bookmarked: false })
    })
  })

  describe('folders', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })
      await folders(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return sorted folder names', async () => {
      mockFindMany.mockResolvedValue([
        { folder: 'work' },
        { folder: 'favorites' },
        { folder: 'work' },
        { folder: null },
      ])

      const req = mockReq()
      const res = mockRes()
      await folders(req, res)

      expect(res.json).toHaveBeenCalledWith({ folders: ['favorites', 'work'] })
    })
  })
})
