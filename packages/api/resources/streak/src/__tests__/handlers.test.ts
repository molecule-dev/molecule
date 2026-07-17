/**
 * Handler tests — auth, validation, error paths, and the server-authority
 * invariant: the request body can NOT set or inflate the persisted streak.
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearStreakConfigResolver, setStreakConfigResolver } from '../config-registry.js'
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

/**
 * Builds a stored streak row for `user-1` / `lesson`.
 *
 * @param overrides - Row field overrides.
 * @returns A mock `StreakRow`.
 */
function makeRow(overrides: Record<string, unknown> = {}) {
  const last = new Date('2026-01-01T08:00:00.000Z').toISOString()
  return {
    id: 'row-1',
    user_id: 'user-1',
    activity_kind: 'lesson',
    current_streak: 3,
    longest_streak: 5,
    last_activity_date: last,
    freezes_used: 0,
    createdAt: last,
    updatedAt: last,
    ...overrides,
  }
}

describe('@molecule/api-streak handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearStreakConfigResolver()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    clearStreakConfigResolver()
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

    it('increments by one on a normal next-period record (server clock)', async () => {
      // Row last active at 08:00; server "now" is exactly 24h later → continuation.
      vi.setSystemTime(new Date('2026-01-02T08:00:00.000Z'))
      mockFindOne.mockResolvedValue(makeRow())
      mockUpdateById.mockResolvedValue({ data: {} })
      const req = mockReq({ params: { activityKind: 'lesson' }, body: {} })
      const res = mockRes()
      await record(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = res.json.mock.calls[0][0]
      expect(payload.state.current_streak).toBe(4)
      // Persisted value matches the server-computed one.
      expect(mockUpdateById.mock.calls[0][2].current_streak).toBe(4)
    })

    it('IGNORES a body that claims an inflated streak / config / when', async () => {
      // Server "now" is 4h after last activity → SAME period → count unchanged.
      vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))
      mockFindOne.mockResolvedValue(makeRow())
      mockUpdateById.mockResolvedValue({ data: {} })
      const req = mockReq({
        params: { activityKind: 'lesson' },
        body: {
          current_streak: 999,
          longest_streak: 999,
          reset_after_hours: 100000,
          freezes_per_period: 9999,
          when: '2035-01-01T00:00:00.000Z', // a forged "future day"
        },
      })
      const res = mockRes()
      await record(req, res)
      expect(res.status).toHaveBeenCalledWith(200)

      const persisted = mockUpdateById.mock.calls[0][2]
      // The client's numbers never reach persistence — the server-computed
      // same-period value (unchanged 3) wins.
      expect(persisted.current_streak).toBe(3)
      expect(persisted.current_streak).not.toBe(999)
      expect(persisted.longest_streak).toBe(5)
      expect(persisted.longest_streak).not.toBe(999)
    })

    it('a missed day RESETS even when the body tries to widen the window / add freezes', async () => {
      // 72h gap (> 2× the 24h window) with no server-granted freeze → reset.
      vi.setSystemTime(new Date('2026-01-04T08:00:00.000Z'))
      mockFindOne.mockResolvedValue(makeRow({ current_streak: 7, longest_streak: 10 }))
      mockUpdateById.mockResolvedValue({ data: {} })
      const req = mockReq({
        params: { activityKind: 'lesson' },
        // Client tries to make the window huge (so no gap) and grant itself freezes.
        body: { reset_after_hours: 100000, freezes_per_period: 9999 },
      })
      const res = mockRes()
      await record(req, res)
      expect(res.status).toHaveBeenCalledWith(200)

      const payload = res.json.mock.calls[0][0]
      expect(payload.reset).toBe(true)
      expect(payload.freezeConsumed).toBe(false)
      const persisted = mockUpdateById.mock.calls[0][2]
      expect(persisted.current_streak).toBe(1) // reset wins; body could not prevent it
      expect(persisted.longest_streak).toBe(10) // high-water mark retained
    })

    it('a missed day does NOT reset when the SERVER config grants a freeze', async () => {
      // Same 72h gap, but the server-side resolver grants a freeze → absorbed.
      setStreakConfigResolver(() => ({ freezes_per_period: 1 }))
      vi.setSystemTime(new Date('2026-01-04T08:00:00.000Z'))
      mockFindOne.mockResolvedValue(makeRow({ current_streak: 7, longest_streak: 10 }))
      mockUpdateById.mockResolvedValue({ data: {} })
      const req = mockReq({ params: { activityKind: 'lesson' }, body: {} })
      const res = mockRes()
      await record(req, res)

      const payload = res.json.mock.calls[0][0]
      expect(payload.reset).toBe(false)
      expect(payload.freezeConsumed).toBe(true)
      expect(payload.state.current_streak).toBe(8)
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

    it('IGNORES a body freeze cap — default (no resolver) cap is 0, so it no-ops', async () => {
      mockFindOne.mockResolvedValue(makeRow({ freezes_used: 0 }))
      const req = mockReq({
        params: { activityKind: 'lesson' },
        body: { freezes_per_period: 9999 },
      })
      const res = mockRes()
      await freeze(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = res.json.mock.calls[0][0]
      expect(payload.freezeConsumed).toBe(false)
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('consumes a freeze when the SERVER config grants one', async () => {
      setStreakConfigResolver(() => ({ freezes_per_period: 2 }))
      mockFindOne.mockResolvedValue(makeRow({ freezes_used: 0 }))
      mockUpdateById.mockResolvedValue({ data: {} })
      const req = mockReq({ params: { activityKind: 'lesson' }, body: {} })
      const res = mockRes()
      await freeze(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = res.json.mock.calls[0][0]
      expect(payload.freezeConsumed).toBe(true)
      expect(payload.state.freezes_used).toBe(1)
      expect(mockUpdateById).toHaveBeenCalledTimes(1)
    })

    it('no-ops when no row exists', async () => {
      setStreakConfigResolver(() => ({ freezes_per_period: 1 }))
      mockFindOne.mockResolvedValue(null)
      const req = mockReq({ params: { activityKind: 'lesson' }, body: {} })
      const res = mockRes()
      await freeze(req, res)
      expect(res.status).toHaveBeenCalledWith(200)
      const payload = res.json.mock.calls[0][0]
      expect(payload.freezeConsumed).toBe(false)
      expect(mockUpdateById).not.toHaveBeenCalled()
    })
  })
})
