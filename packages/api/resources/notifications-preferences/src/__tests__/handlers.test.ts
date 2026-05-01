const { mockFindOne, mockCreate, mockUpdateMany } = vi.hoisted(() => ({
  mockFindOne: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdateMany: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  findOne: mockFindOne,
  create: mockCreate,
  updateMany: mockUpdateMany,
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

import { getPreferencesHandler } from '../handlers/get-preferences.js'
import { updatePreferencesHandler } from '../handlers/update-preferences.js'

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

describe('@molecule/api-notifications-preferences handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPreferencesHandler', () => {
    it('returns 401 when no session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })
      await getPreferencesHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns the stored preferences map', async () => {
      const preferences = {
        'order.shipped': { email: true, push: false, sms: true, inApp: true },
      }
      mockFindOne.mockResolvedValue({ userId: 'user-1', preferences })

      const req = mockReq()
      const res = mockRes()
      await getPreferencesHandler(req, res)

      expect(res.json).toHaveBeenCalledWith({ preferences })
    })

    it('returns an empty map when no row exists', async () => {
      mockFindOne.mockResolvedValue(null)
      const req = mockReq()
      const res = mockRes()
      await getPreferencesHandler(req, res)
      expect(res.json).toHaveBeenCalledWith({ preferences: {} })
    })

    it('returns 500 on service error', async () => {
      mockFindOne.mockRejectedValue(new Error('boom'))
      const req = mockReq()
      const res = mockRes()
      await getPreferencesHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('updatePreferencesHandler', () => {
    it('returns 401 when no session', async () => {
      const req = mockReq({ body: { 'order.shipped': { email: false } } })
      const res = mockRes({ locals: {} })
      await updatePreferencesHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when body is not an object', async () => {
      const req = mockReq({ body: 'nope' })
      const res = mockRes()
      await updatePreferencesHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 when body is an array', async () => {
      const req = mockReq({ body: [] })
      const res = mockRes()
      await updatePreferencesHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 when a type entry is not an object', async () => {
      const req = mockReq({ body: { 'order.shipped': true } })
      const res = mockRes()
      await updatePreferencesHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 when a channel value is not a boolean', async () => {
      const req = mockReq({ body: { 'order.shipped': { email: 'yes' } } })
      const res = mockRes()
      await updatePreferencesHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 when an unknown channel is supplied', async () => {
      const req = mockReq({ body: { 'order.shipped': { fax: true } } })
      const res = mockRes()
      await updatePreferencesHandler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('creates the row on first update and returns the merged map', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: {} })

      const req = mockReq({ body: { 'order.shipped': { email: false } } })
      const res = mockRes()
      await updatePreferencesHandler(req, res)

      expect(mockCreate).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({
        preferences: {
          'order.shipped': { email: false, push: true, sms: true, inApp: true },
        },
      })
    })

    it('merges into an existing row and preserves untouched types', async () => {
      mockFindOne.mockResolvedValue({
        userId: 'user-1',
        preferences: {
          'order.shipped': { email: true, push: true, sms: true, inApp: true },
          'streak.at_risk': { email: true, push: true, sms: true, inApp: true },
        },
      })
      mockUpdateMany.mockResolvedValue({ affected: 1 })

      const req = mockReq({ body: { 'order.shipped': { email: false, sms: false } } })
      const res = mockRes()
      await updatePreferencesHandler(req, res)

      expect(mockUpdateMany).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({
        preferences: {
          'order.shipped': { email: false, push: true, sms: false, inApp: true },
          'streak.at_risk': { email: true, push: true, sms: true, inApp: true },
        },
      })
    })

    it('returns 500 when the underlying update fails', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockRejectedValue(new Error('boom'))

      const req = mockReq({ body: { 'order.shipped': { email: false } } })
      const res = mockRes()
      await updatePreferencesHandler(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
