/**
 * Service tests — DataStore round-trips for record / query / rollup.
 *
 * Mocks `@molecule/api-database` so the service can be exercised
 * without a bonded provider.
 */

const { mockCreate, mockFindMany, mockDeleteMany } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockDeleteMany: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findMany: mockFindMany,
  deleteMany: mockDeleteMany,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteEvents, getLeaderboard, recordMetric, rollupLeaderboard } from '../service.js'

describe('@molecule/api-leaderboard service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ data: null, affected: 1 })
    mockDeleteMany.mockResolvedValue({ data: null, affected: 0 })
    mockFindMany.mockResolvedValue([])
  })

  describe('recordMetric', () => {
    it('writes a row to leaderboard_events with the right payload', async () => {
      const when = new Date('2026-05-01T12:00:00Z')
      await recordMetric('user-1', 'xp', 50, when, 'classroom-1')
      expect(mockCreate).toHaveBeenCalledWith('leaderboard_events', {
        user_id: 'user-1',
        metric: 'xp',
        value: 50,
        scope_key: 'classroom-1',
        occurred_at: when,
      })
    })

    it('defaults scope_key to null when not supplied', async () => {
      await recordMetric('user-1', 'xp', 10, new Date('2026-05-01T12:00:00Z'))
      const call = mockCreate.mock.calls[0]
      expect(call?.[1]).toMatchObject({ scope_key: null })
    })

    it('rejects non-finite values', async () => {
      await expect(recordMetric('u', 'xp', Number.NaN)).rejects.toThrow(/finite/)
      await expect(recordMetric('u', 'xp', Infinity)).rejects.toThrow(/finite/)
    })
  })

  describe('getLeaderboard', () => {
    it('queries findMany with metric + window bounds + scope filter', async () => {
      const now = new Date('2026-05-01T12:00:00Z')
      mockFindMany.mockResolvedValue([])
      await getLeaderboard({ metric: 'xp', window: 'daily', scopeKey: 'cohort-a', now })
      const [table, opts] = mockFindMany.mock.calls[0]!
      expect(table).toBe('leaderboard_events')
      const where = opts.where as { field: string; operator: string; value?: unknown }[]
      expect(where.find((w) => w.field === 'metric')).toMatchObject({
        operator: '=',
        value: 'xp',
      })
      expect(where.find((w) => w.field === 'scope_key')).toMatchObject({
        operator: '=',
        value: 'cohort-a',
      })
      expect(where.some((w) => w.field === 'occurred_at' && w.operator === '>=')).toBe(true)
      expect(where.some((w) => w.field === 'occurred_at' && w.operator === '<')).toBe(true)
    })

    it('uses is_null filter when no scopeKey is supplied', async () => {
      await getLeaderboard({ metric: 'xp', window: 'all-time' })
      const [, opts] = mockFindMany.mock.calls[0]!
      const where = opts.where as { field: string; operator: string }[]
      expect(where.find((w) => w.field === 'scope_key')).toMatchObject({ operator: 'is_null' })
    })

    it('aggregates DataStore rows and ranks them', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: '1',
          user_id: 'a',
          metric: 'xp',
          value: 10,
          scope_key: null,
          occurred_at: '2026-05-01T01:00:00Z',
        },
        {
          id: '2',
          user_id: 'a',
          metric: 'xp',
          value: 25,
          scope_key: null,
          occurred_at: '2026-05-01T02:00:00Z',
        },
        {
          id: '3',
          user_id: 'b',
          metric: 'xp',
          value: 50,
          scope_key: null,
          occurred_at: '2026-05-01T01:00:00Z',
        },
      ])
      const result = await getLeaderboard({ metric: 'xp', window: 'all-time' })
      expect(result).toEqual([
        { user_id: 'b', rank: 1, score: 50 },
        { user_id: 'a', rank: 2, score: 35 },
      ])
    })

    it('omits all-time bounds (no occurred_at filters)', async () => {
      await getLeaderboard({ metric: 'xp', window: 'all-time' })
      const [, opts] = mockFindMany.mock.calls[0]!
      const where = opts.where as { field: string }[]
      expect(where.some((w) => w.field === 'occurred_at')).toBe(false)
    })
  })

  describe('rollupLeaderboard', () => {
    it('clears existing rollup rows for the same window before writing', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: '1',
          user_id: 'a',
          metric: 'xp',
          value: 10,
          scope_key: null,
          occurred_at: '2026-05-01T00:00:00Z',
        },
      ])
      const now = new Date('2026-05-01T12:00:00Z')
      await rollupLeaderboard({ metric: 'xp', window: 'weekly', now })

      const deleteCall = mockDeleteMany.mock.calls.find((c) => c[0] === 'leaderboard_rollups')
      expect(deleteCall).toBeDefined()
      const where = deleteCall![1] as { field: string; operator: string; value?: unknown }[]
      expect(where.find((w) => w.field === 'metric')).toMatchObject({ value: 'xp' })
      expect(where.find((w) => w.field === 'window_kind')).toMatchObject({ value: 'weekly' })
      expect(where.find((w) => w.field === 'scope_key')).toMatchObject({ operator: 'is_null' })
    })

    it('writes one rollup row per ranked entry', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: '1',
          user_id: 'a',
          metric: 'xp',
          value: 10,
          scope_key: null,
          occurred_at: '2026-05-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: 'b',
          metric: 'xp',
          value: 30,
          scope_key: null,
          occurred_at: '2026-05-01T00:00:00Z',
        },
      ])
      const now = new Date('2026-05-01T12:00:00Z')
      const result = await rollupLeaderboard({ metric: 'xp', window: 'weekly', now })

      const rollupInserts = mockCreate.mock.calls.filter((c) => c[0] === 'leaderboard_rollups')
      expect(rollupInserts).toHaveLength(2)
      expect(rollupInserts[0]?.[1]).toMatchObject({
        metric: 'xp',
        window_kind: 'weekly',
        user_id: 'b',
        rank: 1,
        score: 30,
      })
      expect(rollupInserts[1]?.[1]).toMatchObject({ user_id: 'a', rank: 2, score: 10 })
      expect(result).toEqual([
        { user_id: 'b', rank: 1, score: 30 },
        { user_id: 'a', rank: 2, score: 10 },
      ])
    })

    it('uses "custom" as the window_kind for custom windows', async () => {
      mockFindMany.mockResolvedValue([])
      await rollupLeaderboard({
        metric: 'xp',
        window: { start: new Date('2026-04-01'), end: new Date('2026-05-01') },
      })
      const deleteCall = mockDeleteMany.mock.calls.find((c) => c[0] === 'leaderboard_rollups')
      const where = deleteCall![1] as { field: string; operator: string; value?: unknown }[]
      expect(where.find((w) => w.field === 'window_kind')).toMatchObject({ value: 'custom' })
    })
  })

  describe('deleteEvents', () => {
    it('deletes by metric only when no scopeKey is provided', async () => {
      await deleteEvents('xp')
      const [table, where] = mockDeleteMany.mock.calls[0]!
      expect(table).toBe('leaderboard_events')
      expect(where).toEqual([{ field: 'metric', operator: '=', value: 'xp' }])
    })

    it('narrows to scope when supplied', async () => {
      await deleteEvents('xp', 'cohort-a')
      const [, where] = mockDeleteMany.mock.calls[0]!
      expect(where).toContainEqual({ field: 'metric', operator: '=', value: 'xp' })
      expect(where).toContainEqual({ field: 'scope_key', operator: '=', value: 'cohort-a' })
    })
  })
})
