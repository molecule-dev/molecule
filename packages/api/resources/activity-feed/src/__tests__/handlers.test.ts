const { mockCreate, mockFindById, mockFindMany, mockCount, mockUpdateById } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockUpdateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  count: mockCount,
  updateById: mockUpdateById,
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

import { feed } from '../handlers/feed.js'
import { log } from '../handlers/logActivity.js'
import { seen } from '../handlers/markSeen.js'
import { timeline } from '../handlers/timeline.js'
import { unseen } from '../handlers/unseen.js'

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

describe('@molecule/api-resource-activity-feed handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('log', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({
        body: { actorId: 'user-1', action: 'created', resourceType: 'post', resourceId: 'p1' },
      })
      const res = mockRes({ locals: {} })

      await log(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when validation fails', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()

      await log(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when actorId is empty', async () => {
      const req = mockReq({
        body: { actorId: '', action: 'created', resourceType: 'post', resourceId: 'p1' },
      })
      const res = mockRes()

      await log(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should create an activity', async () => {
      const activity = {
        id: 'a1',
        actorId: 'user-1',
        action: 'created',
        resourceType: 'post',
        resourceId: 'p1',
        metadata: null,
      }
      mockCreate.mockResolvedValue({ data: activity })

      const req = mockReq({
        body: { actorId: 'user-1', action: 'created', resourceType: 'post', resourceId: 'p1' },
      })
      const res = mockRes()

      await log(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(activity)
    })

    it('should return 500 on database error', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({
        body: { actorId: 'user-1', action: 'created', resourceType: 'post', resourceId: 'p1' },
      })
      const res = mockRes()

      await log(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('feed', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })

      await feed(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return paginated activities', async () => {
      const activities = [{ id: 'a1' }]
      mockFindMany.mockResolvedValue(activities)
      mockCount.mockResolvedValue(1)

      const req = mockReq({ query: { limit: '10', offset: '0' } })
      const res = mockRes()

      await feed(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: activities,
        total: 1,
        limit: 10,
        offset: 0,
      })
    })

    it('should pass filter params to service', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const req = mockReq({ query: { resourceType: 'post', action: 'created' } })
      const res = mockRes()

      await feed(req, res)

      expect(mockFindMany).toHaveBeenCalledWith(
        'activities',
        expect.objectContaining({
          where: expect.arrayContaining([
            { field: 'resourceType', operator: '=', value: 'post' },
            { field: 'action', operator: '=', value: 'created' },
          ]),
        }),
      )
    })

    it('should return 500 on error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ query: {} })
      const res = mockRes()

      await feed(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('timeline', () => {
    it('should return 400 when params missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()

      await timeline(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return paginated timeline for a resource', async () => {
      const activities = [{ id: 'a1' }]
      mockFindMany.mockResolvedValue(activities)
      mockCount.mockResolvedValue(1)

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        query: { limit: '10', offset: '0' },
      })
      const res = mockRes()

      await timeline(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: activities,
        total: 1,
        limit: 10,
        offset: 0,
      })
    })

    it('should return 500 on error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq({
        params: { resourceType: 'post', resourceId: 'p1' },
        query: {},
      })
      const res = mockRes()

      await timeline(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('unseen', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })

      await unseen(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return unseen count', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(5)

      const req = mockReq()
      const res = mockRes()

      await unseen(req, res)

      expect(res.json).toHaveBeenCalledWith({ count: 5 })
    })

    it('should return 500 on error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq()
      const res = mockRes()

      await unseen(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('seen', () => {
    it('should return 401 when no session', async () => {
      const req = mockReq({ body: { upToId: 'a5' } })
      const res = mockRes({ locals: {} })

      await seen(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when upToId missing', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()

      await seen(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when upToId is empty', async () => {
      const req = mockReq({ body: { upToId: '' } })
      const res = mockRes()

      await seen(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should mark activities as seen', async () => {
      mockFindMany.mockResolvedValue([])
      mockCreate.mockResolvedValue({ data: {} })

      const req = mockReq({ body: { upToId: 'a5' } })
      const res = mockRes()

      await seen(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it('should return 500 on error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ body: { upToId: 'a5' } })
      const res = mockRes()

      await seen(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
