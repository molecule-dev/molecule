/**
 * Handler tests — public reads, validation, error paths.
 *
 * Mocks `@molecule/api-database`, `@molecule/api-i18n`, and
 * `@molecule/api-logger` so handlers can be exercised without bonded
 * providers.
 */

const { mockCreate, mockDeleteMany, mockFindMany, mockFindOne, mockUpdateById } = vi.hoisted(
  () => ({
    mockCreate: vi.fn(),
    mockDeleteMany: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindOne: vi.fn(),
    mockUpdateById: vi.fn(),
  }),
)

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  deleteMany: mockDeleteMany,
  findMany: mockFindMany,
  findOne: mockFindOne,
  updateById: mockUpdateById,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  ),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getBadges } from '../handlers/getBadges.js'
import { getReputation } from '../handlers/getReputation.js'

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
    locals: {},
    ...overrides,
  }
  return res
}

describe('@molecule/api-reputation handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getReputation', () => {
    it('returns 400 when :id is missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()
      await getReputation(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns the persisted score (no auth required)', async () => {
      mockFindOne.mockResolvedValueOnce({
        userId: 'user-1',
        score: 250,
        level: 1,
        updatedAt: '2026-05-01T00:00:00.000Z',
      })
      const req = mockReq({ params: { id: 'user-1' } })
      const res = mockRes()
      await getReputation(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = res.json.mock.calls[0][0]
      expect(payload.score).toBe(250)
      expect(payload.level).toBe(1)
    })

    it('returns a zeroed score when no row exists', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      const req = mockReq({ params: { id: 'user-1' } })
      const res = mockRes()
      await getReputation(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = res.json.mock.calls[0][0]
      expect(payload.score).toBe(0)
      expect(payload.level).toBe(0)
    })

    it('returns 500 on database error', async () => {
      mockFindOne.mockRejectedValueOnce(new Error('db down'))
      const req = mockReq({ params: { id: 'user-1' } })
      const res = mockRes()
      await getReputation(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getBadges', () => {
    it('returns 400 when :id is missing', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()
      await getBadges(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns the user badges (no auth required)', async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: 'b1',
          userId: 'user-1',
          kind: 'first-post',
          awardedAt: '2026-05-01T00:00:00.000Z',
        },
      ])
      const req = mockReq({ params: { id: 'user-1' } })
      const res = mockRes()
      await getBadges(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = res.json.mock.calls[0][0]
      expect(payload).toHaveLength(1)
      expect(payload[0].kind).toBe('first-post')
    })

    it('returns 500 on database error', async () => {
      mockFindMany.mockRejectedValueOnce(new Error('db down'))
      const req = mockReq({ params: { id: 'user-1' } })
      const res = mockRes()
      await getBadges(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
