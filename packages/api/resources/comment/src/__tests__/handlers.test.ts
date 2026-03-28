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

import { commentCount } from '../handlers/count.js'
import { create } from '../handlers/create.js'
import { del } from '../handlers/del.js'
import { list } from '../handlers/list.js'
import { read } from '../handlers/read.js'
import { replies } from '../handlers/replies.js'
import { update } from '../handlers/update.js'

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

describe('@molecule/api-resource-comment handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        body: { body: 'Hello' },
      })
      const res = mockRes({ locals: {} })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when resourceType is missing', async () => {
      const req = mockReq({
        params: { resourceId: 'p1' },
        body: { body: 'Hello' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when body is empty', async () => {
      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        body: { body: '' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should create a top-level comment', async () => {
      const comment = {
        id: 'c1',
        resourceType: 'post',
        resourceId: 'p1',
        userId: 'user-1',
        parentId: null,
        body: 'Great post!',
      }
      mockCreate.mockResolvedValue({ data: comment })

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        body: { body: 'Great post!' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(comment)
      expect(mockCreate).toHaveBeenCalledWith(
        'comments',
        expect.objectContaining({
          resourceType: 'post',
          resourceId: 'p1',
          userId: 'user-1',
          parentId: null,
          body: 'Great post!',
        }),
      )
    })

    it('should create a threaded reply', async () => {
      const parentUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      const reply = {
        id: 'c2',
        resourceType: 'post',
        resourceId: 'p1',
        userId: 'user-1',
        parentId: parentUuid,
        body: 'Thanks!',
      }
      mockCreate.mockResolvedValue({ data: reply })

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        body: { body: 'Thanks!', parentId: parentUuid },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(mockCreate).toHaveBeenCalledWith(
        'comments',
        expect.objectContaining({ parentId: parentUuid }),
      )
    })

    it('should return 400 when parentId is not a UUID', async () => {
      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        body: { body: 'Hello', parentId: 'not-a-uuid' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 500 on database error', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        body: { body: 'Hello' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('list', () => {
    it('should return 400 when resource params missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return paginated top-level comments', async () => {
      const comments = [{ id: 'c1', body: 'Hello' }]
      mockFindMany.mockResolvedValue(comments)
      mockCount.mockResolvedValue(1)

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        query: { limit: '10', offset: '0' },
      })
      const res = mockRes()

      await list(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: comments,
        total: 1,
        limit: 10,
        offset: 0,
      })
    })
  })

  describe('read', () => {
    it('should return 400 when commentId missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when comment not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { commentId: 'c-missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return comment by ID', async () => {
      const comment = { id: 'c1', body: 'Hello' }
      mockFindById.mockResolvedValue(comment)

      const req = mockReq({ params: { commentId: 'c1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(comment)
    })
  })

  describe('update', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { commentId: 'c1' }, body: { body: 'Updated' } })
      const res = mockRes({ locals: {} })

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when body is invalid', async () => {
      const req = mockReq({ params: { commentId: 'c1' }, body: { body: '' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when comment not found or not owned', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { commentId: 'c1' }, body: { body: 'Updated' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should update owned comment', async () => {
      const existing = { id: 'c1', userId: 'user-1', body: 'Old' }
      const updated = { ...existing, body: 'Updated', editedAt: expect.any(String) }
      mockFindById.mockResolvedValue(existing)
      mockUpdateById.mockResolvedValue({ data: updated })

      const req = mockReq({ params: { commentId: 'c1' }, body: { body: 'Updated' } })
      const res = mockRes()

      await update(req, res)

      expect(res.json).toHaveBeenCalledWith(updated)
      expect(mockUpdateById).toHaveBeenCalledWith(
        'comments',
        'c1',
        expect.objectContaining({ body: 'Updated' }),
      )
    })

    it("should not update another user's comment", async () => {
      const existing = { id: 'c1', userId: 'other-user', body: 'Old' }
      mockFindById.mockResolvedValue(existing)

      const req = mockReq({ params: { commentId: 'c1' }, body: { body: 'Updated' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockUpdateById).not.toHaveBeenCalled()
    })
  })

  describe('del', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ params: { commentId: 'c1' } })
      const res = mockRes({ locals: {} })

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when comment not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { commentId: 'c-missing' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should delete owned comment and return 204', async () => {
      mockFindById.mockResolvedValue({ id: 'c1', userId: 'user-1' })
      mockDeleteById.mockResolvedValue({ affected: 1 })

      const req = mockReq({ params: { commentId: 'c1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it("should not delete another user's comment", async () => {
      mockFindById.mockResolvedValue({ id: 'c1', userId: 'other-user' })

      const req = mockReq({ params: { commentId: 'c1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockDeleteById).not.toHaveBeenCalled()
    })
  })

  describe('replies', () => {
    it('should return 400 when commentId missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await replies(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return paginated replies', async () => {
      const replyComments = [{ id: 'r1', parentId: 'c1', body: 'Reply' }]
      mockFindMany.mockResolvedValue(replyComments)
      mockCount.mockResolvedValue(1)

      const req = mockReq({
        params: { commentId: 'c1' },
        query: {},
      })
      const res = mockRes()

      await replies(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: replyComments,
        total: 1,
        limit: 20,
        offset: 0,
      })
    })
  })

  describe('commentCount', () => {
    it('should return 400 when resource params missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await commentCount(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return comment count', async () => {
      mockCount.mockResolvedValue(5)

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
      })
      const res = mockRes()

      await commentCount(req, res)

      expect(res.json).toHaveBeenCalledWith({ count: 5 })
    })
  })
})
