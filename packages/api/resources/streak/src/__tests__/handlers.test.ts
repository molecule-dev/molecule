/**
 * Handler tests — auth, validation, and error paths.
 *
 * Mocks `@molecule/api-database`, `@molecule/api-i18n`, and
 * `@molecule/api-logger` so handlers can be exercised without bonded
 * providers.
 */

const { mockCreate, mockFindOne, mockUpdateById } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
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

import { freeze } from '../handlers/freeze.js'
import { read } from '../handlers/read.js'
import { record } from '../handlers/record.js'

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

describe('@molecule/api-streak handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('record', () => {
    it('returns 401 when no session', async () => {
      const req = mockReq({ params: { activityKind: 'lesson' } })
      const res = mockRes({ locals: {} })
      await record(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 with missing activityKind', async () => {
      const req = mockReq({ params: {} })
      const res = mockRes()
      await record(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 with invalid `when`', async () => {
      const req = mockReq({ params: { activityKind: 'lesson' }, body: { when: 'not-a-date' } })
      const res = mockRes()
      await record(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('creates a streak row on first record', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: {} })
      const req = mockReq({ params: { activityKind: 'lesson' }, body: {} })
      const res = mockRes()
      await record(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockCreate).toHaveBeenCalledTimes(1)
      const payload = res.json.mock.calls[0][0]
      expect(payload.state.current_streak).toBe(1)
    })

    it('updates an existing streak row', async () => {
      const last = new Date('2026-01-01T08:00:00.000Z').toISOString()
      mockFindOne.mockResolvedValue({
        id: 'row-1',
        user_id: 'user-1',
        activity_kind: 'lesson',
        current_streak: 3,
        longest_streak: 5,
        last_activity_date: last,
        freezes_used: 0,
        createdAt: last,
        updatedAt: last,
      })
      mockUpdateById.mockResolvedValue({ data: {} })
      const req = mockReq({
        params: { activityKind: 'lesson' },
        body: { when: '2026-01-02T08:00:00.000Z' },
      })
      const res = mockRes()
      await record(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockUpdateById).toHaveBeenCalledTimes(1)
      const payload = res.json.mock.calls[0][0]
      expect(payload.state.current_streak).toBe(4)
    })

    it('returns 500 on database error', async () => {
      mockFindOne.mockRejectedValue(new Error('db down'))
      const req = mockReq({ params: { activityKind: 'lesson' }, body: {} })
      const res = mockRes()
      await record(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('read', () => {
    it('returns 401 when no session', async () => {
      const req = mockReq({ params: { activityKind: 'lesson' } })
      const res = mockRes({ locals: {} })
      await read(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns zeroed state when no row exists', async () => {
      mockFindOne.mockResolvedValue(null)
      const req = mockReq({ params: { activityKind: 'lesson' } })
      const res = mockRes()
      await read(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = res.json.mock.calls[0][0]
      expect(payload.current_streak).toBe(0)
    })
  })

  describe('freeze', () => {
    it('returns 401 when no session', async () => {
      const req = mockReq({ params: { activityKind: 'lesson' } })
      const res = mockRes({ locals: {} })
      await freeze(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('no-ops when no row exists', async () => {
      mockFindOne.mockResolvedValue(null)
      const req = mockReq({ params: { activityKind: 'lesson' }, body: { freezes_per_period: 1 } })
      const res = mockRes()
      await freeze(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = res.json.mock.calls[0][0]
      expect(payload.freezeConsumed).toBe(false)
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('consumes a freeze when below cap', async () => {
      const last = new Date('2026-01-01T08:00:00.000Z').toISOString()
      mockFindOne.mockResolvedValue({
        id: 'row-1',
        user_id: 'user-1',
        activity_kind: 'lesson',
        current_streak: 3,
        longest_streak: 5,
        last_activity_date: last,
        freezes_used: 0,
        createdAt: last,
        updatedAt: last,
      })
      mockUpdateById.mockResolvedValue({ data: {} })
      const req = mockReq({ params: { activityKind: 'lesson' }, body: { freezes_per_period: 2 } })
      const res = mockRes()
      await freeze(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = res.json.mock.calls[0][0]
      expect(payload.freezeConsumed).toBe(true)
      expect(payload.state.freezes_used).toBe(1)
      expect(mockUpdateById).toHaveBeenCalledTimes(1)
    })
  })
})
