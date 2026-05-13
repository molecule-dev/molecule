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

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { auditStreak, consumeFreeze, getStreak, recordActivity } from '../service.js'
import type { StreakConfig } from '../types.js'

const CONFIG: StreakConfig = {
  activity_kind: 'workout',
  reset_after_hours: 24,
  freezes_per_period: 1,
}

const HOUR_MS = 60 * 60 * 1000

beforeEach(() => {
  vi.resetAllMocks()
})

describe('recordActivity (first time)', () => {
  it('creates a new streak row when no prior row exists', async () => {
    mockFindOne.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ data: {} })
    const out = await recordActivity('user-1', CONFIG, new Date('2026-05-13T10:00:00Z'))
    expect(out.state.current_streak).toBe(1)
    expect(out.state.longest_streak).toBe(1)
    expect(mockCreate).toHaveBeenCalledWith(
      'streaks',
      expect.objectContaining({
        user_id: 'user-1',
        activity_kind: 'workout',
        current_streak: 1,
      }),
    )
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('scopes findOne by user_id + activity_kind', async () => {
    mockFindOne.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ data: {} })
    await recordActivity('user-1', CONFIG)
    expect(mockFindOne.mock.calls[0][1]).toEqual([
      { field: 'user_id', operator: '=', value: 'user-1' },
      { field: 'activity_kind', operator: '=', value: 'workout' },
    ])
  })
})

describe('recordActivity (existing row)', () => {
  function makeRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'st-1',
      user_id: 'user-1',
      activity_kind: 'workout',
      current_streak: 3,
      longest_streak: 5,
      last_activity_date: new Date('2026-05-12T10:00:00Z').toISOString(),
      freezes_used: 0,
      createdAt: '2026-05-10T08:00:00.000Z',
      updatedAt: '2026-05-12T10:00:00.000Z',
      ...overrides,
    }
  }

  it('updates the existing row (not creates) when prior row exists', async () => {
    mockFindOne.mockResolvedValue(makeRow())
    mockUpdateById.mockResolvedValue({ data: {} })
    // 24h after last → continuation
    await recordActivity('user-1', CONFIG, new Date('2026-05-13T10:00:00Z'))
    expect(mockUpdateById).toHaveBeenCalledWith('streaks', 'st-1', expect.any(Object))
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('bumps current_streak on continuation', async () => {
    mockFindOne.mockResolvedValue(makeRow())
    mockUpdateById.mockResolvedValue({ data: {} })
    const result = await recordActivity('user-1', CONFIG, new Date('2026-05-13T10:00:00Z'))
    expect(result.state.current_streak).toBe(4)
    expect(result.reset).toBe(false)
  })

  it('resets streak when gap exceeds reset window (no freeze available)', async () => {
    mockFindOne.mockResolvedValue(makeRow({ freezes_used: 1 })) // freeze exhausted
    mockUpdateById.mockResolvedValue({ data: {} })
    // 72h after last → reset
    const result = await recordActivity('user-1', CONFIG, new Date('2026-05-15T10:00:00Z'))
    expect(result.state.current_streak).toBe(1)
    expect(result.reset).toBe(true)
  })
})

describe('consumeFreeze', () => {
  it('returns zeroed state when no row exists for the user', async () => {
    mockFindOne.mockResolvedValue(null)
    const out = await consumeFreeze('user-1', CONFIG)
    expect(out.state.current_streak).toBe(0)
    expect(out.freezeConsumed).toBe(false)
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('does not write when no freeze can be consumed (cap reached)', async () => {
    mockFindOne.mockResolvedValue({
      id: 'st-1',
      user_id: 'user-1',
      activity_kind: 'workout',
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: new Date().toISOString(),
      freezes_used: 1, // cap = 1
      createdAt: '',
      updatedAt: '',
    })
    const out = await consumeFreeze('user-1', CONFIG)
    expect(out.freezeConsumed).toBe(false)
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('writes back freezes_used when a freeze is consumed', async () => {
    mockFindOne.mockResolvedValue({
      id: 'st-1',
      user_id: 'user-1',
      activity_kind: 'workout',
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: new Date().toISOString(),
      freezes_used: 0, // freeze available
      createdAt: '',
      updatedAt: '',
    })
    mockUpdateById.mockResolvedValue({ data: {} })
    const out = await consumeFreeze('user-1', CONFIG)
    expect(out.freezeConsumed).toBe(true)
    expect(mockUpdateById.mock.calls[0][2]).toEqual({ freezes_used: 1 })
  })
})

describe('getStreak', () => {
  it('returns zeroed state when no row exists', async () => {
    mockFindOne.mockResolvedValue(null)
    const out = await getStreak('user-1', 'workout')
    expect(out).toEqual({
      user_id: 'user-1',
      activity_kind: 'workout',
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
      freezes_used: 0,
    })
  })

  it('returns row-derived state when row exists', async () => {
    mockFindOne.mockResolvedValue({
      id: 'st-1',
      user_id: 'user-1',
      activity_kind: 'workout',
      current_streak: 7,
      longest_streak: 10,
      last_activity_date: '2026-05-13T08:00:00.000Z',
      freezes_used: 0,
      createdAt: '',
      updatedAt: '',
    })
    const out = await getStreak('user-1', 'workout')
    expect(out.current_streak).toBe(7)
    expect(out.longest_streak).toBe(10)
    expect(out.last_activity_date).toBeInstanceOf(Date)
  })

  it('handles null last_activity_date gracefully', async () => {
    mockFindOne.mockResolvedValue({
      id: 'st-1',
      user_id: 'user-1',
      activity_kind: 'workout',
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
      freezes_used: 0,
      createdAt: '',
      updatedAt: '',
    })
    const out = await getStreak('user-1', 'workout')
    expect(out.last_activity_date).toBeNull()
  })
})

describe('auditStreak', () => {
  it('false when no row exists', async () => {
    mockFindOne.mockResolvedValue(null)
    expect(await auditStreak('user-1', CONFIG)).toBe(false)
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('false when streak is still fresh (within reset window)', async () => {
    const now = new Date('2026-05-13T10:00:00Z')
    mockFindOne.mockResolvedValue({
      id: 'st-1',
      user_id: 'user-1',
      activity_kind: 'workout',
      current_streak: 3,
      longest_streak: 3,
      last_activity_date: new Date(now.getTime() - 12 * HOUR_MS).toISOString(),
      freezes_used: 0,
      createdAt: '',
      updatedAt: '',
    })
    expect(await auditStreak('user-1', CONFIG, now)).toBe(false)
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('true and zeroes streak when stale beyond reset window', async () => {
    const now = new Date('2026-05-15T10:00:00Z')
    mockFindOne.mockResolvedValue({
      id: 'st-1',
      user_id: 'user-1',
      activity_kind: 'workout',
      current_streak: 5,
      longest_streak: 10,
      last_activity_date: new Date('2026-05-13T10:00:00Z').toISOString(),
      freezes_used: 1,
      createdAt: '',
      updatedAt: '',
    })
    mockUpdateById.mockResolvedValue({ data: {} })
    expect(await auditStreak('user-1', CONFIG, now)).toBe(true)
    expect(mockUpdateById).toHaveBeenCalledWith('streaks', 'st-1', {
      current_streak: 0,
      freezes_used: 0,
    })
  })
})
