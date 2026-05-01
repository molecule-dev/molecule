/**
 * Pure engine tests — rank assignment, tie-breaking, windowed
 * aggregation, scope isolation, pagination, and recompute semantics.
 *
 * No DB is involved.
 */

import { describe, expect, it } from 'vitest'

import { computeLeaderboard } from '../engine.js'
import type { LeaderboardEvent } from '../types.js'
import { isInWindow, resolveWindow } from '../window.js'

function event(user_id: string, value: number, when: string, scopeKey?: string): LeaderboardEvent {
  return { user_id, value, when: new Date(when), scopeKey }
}

describe('@molecule/api-leaderboard engine', () => {
  describe('rank assignment', () => {
    it('ranks users by aggregated score (sum, descending)', () => {
      const events: LeaderboardEvent[] = [
        event('a', 10, '2026-05-01T00:00:00Z'),
        event('a', 5, '2026-05-01T01:00:00Z'),
        event('b', 20, '2026-05-01T00:00:00Z'),
        event('c', 7, '2026-05-01T00:00:00Z'),
      ]
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time' },
      })
      expect(result).toEqual([
        { user_id: 'b', rank: 1, score: 20 },
        { user_id: 'a', rank: 2, score: 15 },
        { user_id: 'c', rank: 3, score: 7 },
      ])
    })

    it('uses competition ranking (1, 2, 2, 4) for ties', () => {
      const events: LeaderboardEvent[] = [
        event('a', 100, '2026-05-01T00:00:00Z'),
        event('b', 50, '2026-05-01T00:00:00Z'),
        event('c', 50, '2026-05-01T00:00:00Z'),
        event('d', 10, '2026-05-01T00:00:00Z'),
      ]
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time', tieBreak: 'user_id' },
      })
      expect(result.map((e) => [e.user_id, e.rank, e.tied])).toEqual([
        ['a', 1, undefined],
        ['b', 2, true],
        ['c', 2, true],
        ['d', 4, undefined],
      ])
    })

    it('marks all members of a tie even when more than two share a rank', () => {
      const events: LeaderboardEvent[] = [
        event('a', 50, '2026-05-01T00:00:00Z'),
        event('b', 50, '2026-05-01T00:00:00Z'),
        event('c', 50, '2026-05-01T00:00:00Z'),
      ]
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time', tieBreak: 'user_id' },
      })
      expect(result.every((e) => e.tied)).toBe(true)
      expect(result.map((e) => e.rank)).toEqual([1, 1, 1])
    })
  })

  describe('tie-break strategies', () => {
    it('"earliest" sorts ties by earliest contributing event', () => {
      const events: LeaderboardEvent[] = [
        event('late', 50, '2026-05-01T05:00:00Z'),
        event('early', 50, '2026-05-01T01:00:00Z'),
        event('mid', 50, '2026-05-01T03:00:00Z'),
      ]
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time', tieBreak: 'earliest' },
      })
      expect(result.map((e) => e.user_id)).toEqual(['early', 'mid', 'late'])
      // Ranks still tied (all rank 1)
      expect(result.every((e) => e.rank === 1)).toBe(true)
    })

    it('"user_id" sorts ties lexicographically', () => {
      const events: LeaderboardEvent[] = [
        event('charlie', 50, '2026-05-01T00:00:00Z'),
        event('alice', 50, '2026-05-01T00:00:00Z'),
        event('bob', 50, '2026-05-01T00:00:00Z'),
      ]
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time', tieBreak: 'user_id' },
      })
      expect(result.map((e) => e.user_id)).toEqual(['alice', 'bob', 'charlie'])
    })
  })

  describe('aggregation strategies', () => {
    const events: LeaderboardEvent[] = [
      event('a', 10, '2026-05-01T01:00:00Z'),
      event('a', 25, '2026-05-01T02:00:00Z'),
      event('a', 5, '2026-05-01T03:00:00Z'),
      event('b', 100, '2026-05-01T00:30:00Z'),
    ]

    it('sum (default) totals values', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time' },
      })
      expect(result.find((e) => e.user_id === 'a')?.score).toBe(40)
      expect(result.find((e) => e.user_id === 'b')?.score).toBe(100)
    })

    it('max returns the highest single value', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time' },
        aggregation: 'max',
      })
      expect(result.find((e) => e.user_id === 'a')?.score).toBe(25)
      expect(result.find((e) => e.user_id === 'b')?.score).toBe(100)
    })

    it('count returns the number of contributing events', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time' },
        aggregation: 'count',
      })
      expect(result.find((e) => e.user_id === 'a')?.score).toBe(3)
      expect(result.find((e) => e.user_id === 'b')?.score).toBe(1)
    })

    it('latest returns the value of the most recent event', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time' },
        aggregation: 'latest',
      })
      expect(result.find((e) => e.user_id === 'a')?.score).toBe(5)
      expect(result.find((e) => e.user_id === 'b')?.score).toBe(100)
    })
  })

  describe('windowed aggregation', () => {
    const events: LeaderboardEvent[] = [
      event('a', 10, '2026-04-25T12:00:00Z'), // before week
      event('a', 50, '2026-04-28T12:00:00Z'), // inside week starting Mon 2026-04-27
      event('b', 100, '2026-04-29T08:00:00Z'), // inside week
      event('b', 999, '2026-05-05T00:00:00Z'), // after week
    ]
    // ISO week of 2026-04-29 (Wed) starts Mon 2026-04-27 UTC.
    const refNow = new Date('2026-04-29T10:00:00Z')

    it('weekly window includes only Monday→Monday events', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'weekly', now: refNow },
      })
      expect(result).toEqual([
        { user_id: 'b', rank: 1, score: 100 },
        { user_id: 'a', rank: 2, score: 50 },
      ])
    })

    it('daily window restricts to UTC day of `now`', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'daily', now: refNow },
      })
      // Only the 2026-04-29 event from `b` falls in the UTC day of refNow.
      expect(result).toEqual([{ user_id: 'b', rank: 1, score: 100 }])
    })

    it('monthly window covers the calendar month of `now`', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'monthly', now: refNow },
      })
      // April events for both users contribute.
      expect(result).toEqual([
        { user_id: 'b', rank: 1, score: 100 },
        { user_id: 'a', rank: 2, score: 60 },
      ])
    })

    it('all-time aggregates every event regardless of timestamp', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time' },
      })
      expect(result).toEqual([
        { user_id: 'b', rank: 1, score: 1099 },
        { user_id: 'a', rank: 2, score: 60 },
      ])
    })

    it('custom window respects half-open `[start, end)` boundaries', () => {
      const start = new Date('2026-04-28T00:00:00Z')
      const end = new Date('2026-04-30T00:00:00Z')
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: { start, end } },
      })
      expect(result).toEqual([
        { user_id: 'b', rank: 1, score: 100 },
        { user_id: 'a', rank: 2, score: 50 },
      ])
    })

    it('boundary edge: `end` is exclusive, `start` is inclusive', () => {
      const e: LeaderboardEvent[] = [
        event('start-edge', 5, '2026-04-28T00:00:00Z'), // inclusive start
        event('end-edge', 99, '2026-04-30T00:00:00Z'), // exclusive end -> excluded
      ]
      const result = computeLeaderboard({
        events: e,
        options: {
          metric: 'xp',
          window: {
            start: new Date('2026-04-28T00:00:00Z'),
            end: new Date('2026-04-30T00:00:00Z'),
          },
        },
      })
      expect(result.map((r) => r.user_id)).toEqual(['start-edge'])
    })
  })

  describe('scopeKey isolation', () => {
    const events: LeaderboardEvent[] = [
      event('a', 50, '2026-05-01T00:00:00Z', 'classroom-1'),
      event('b', 30, '2026-05-01T00:00:00Z', 'classroom-1'),
      event('c', 100, '2026-05-01T00:00:00Z', 'classroom-2'),
      event('d', 80, '2026-05-01T00:00:00Z'), // no scope
    ]

    it('only includes events for the requested scopeKey', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time', scopeKey: 'classroom-1' },
      })
      expect(result.map((e) => e.user_id)).toEqual(['a', 'b'])
    })

    it('queries without scopeKey ignore scoped events', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time' },
      })
      expect(result.map((e) => e.user_id)).toEqual(['d'])
    })

    it('different scopes produce different boards from the same events', () => {
      const r1 = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time', scopeKey: 'classroom-1' },
      })
      const r2 = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time', scopeKey: 'classroom-2' },
      })
      expect(r1.map((e) => e.user_id)).toEqual(['a', 'b'])
      expect(r2.map((e) => e.user_id)).toEqual(['c'])
    })
  })

  describe('pagination', () => {
    const events: LeaderboardEvent[] = Array.from({ length: 25 }, (_, i) =>
      event(`user-${String(i).padStart(2, '0')}`, 100 - i, '2026-05-01T00:00:00Z'),
    )

    it('limit returns top-N entries', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time', limit: 5 },
      })
      expect(result).toHaveLength(5)
      expect(result.map((e) => e.rank)).toEqual([1, 2, 3, 4, 5])
    })

    it('offset skips leading entries while preserving rank numbers', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time', limit: 5, offset: 10 },
      })
      expect(result).toHaveLength(5)
      // Page 3 (offset 10, limit 5) should expose ranks 11..15.
      expect(result.map((e) => e.rank)).toEqual([11, 12, 13, 14, 15])
    })

    it('offset beyond the dataset returns empty', () => {
      const result = computeLeaderboard({
        events,
        options: { metric: 'xp', window: 'all-time', offset: 1000 },
      })
      expect(result).toEqual([])
    })

    it('rejects negative limit', () => {
      expect(() =>
        computeLeaderboard({
          events,
          options: { metric: 'xp', window: 'all-time', limit: -1 },
        }),
      ).toThrow(/limit/)
    })
  })

  describe('recompute-after-event semantics', () => {
    it('a fresh recompute reflects newly added events without state', () => {
      const initial: LeaderboardEvent[] = [
        event('a', 10, '2026-05-01T00:00:00Z'),
        event('b', 5, '2026-05-01T00:00:00Z'),
      ]
      const r1 = computeLeaderboard({
        events: initial,
        options: { metric: 'xp', window: 'all-time' },
      })
      expect(r1.map((e) => [e.user_id, e.rank, e.score])).toEqual([
        ['a', 1, 10],
        ['b', 2, 5],
      ])

      // New event flips ranking — recompute on the union picks it up.
      const updated = [...initial, event('b', 100, '2026-05-01T01:00:00Z')]
      const r2 = computeLeaderboard({
        events: updated,
        options: { metric: 'xp', window: 'all-time' },
      })
      expect(r2.map((e) => [e.user_id, e.rank, e.score])).toEqual([
        ['b', 1, 105],
        ['a', 2, 10],
      ])
    })

    it('idempotent: recomputing the same input returns the same result', () => {
      const events: LeaderboardEvent[] = [
        event('a', 10, '2026-05-01T00:00:00Z'),
        event('b', 5, '2026-05-01T00:00:00Z'),
      ]
      const r1 = computeLeaderboard({ events, options: { metric: 'xp', window: 'all-time' } })
      const r2 = computeLeaderboard({ events, options: { metric: 'xp', window: 'all-time' } })
      expect(r1).toEqual(r2)
    })
  })

  describe('window helpers', () => {
    it('resolveWindow returns null/null for "all-time"', () => {
      const w = resolveWindow('all-time')
      expect(w).toEqual({ start: null, end: null })
    })

    it('isInWindow treats null edges as unbounded', () => {
      const w = resolveWindow('all-time')
      expect(isInWindow(new Date('1999-01-01'), w)).toBe(true)
      expect(isInWindow(new Date('2099-12-31'), w)).toBe(true)
    })

    it('rejects malformed custom windows', () => {
      expect(() =>
        resolveWindow({ start: new Date('2026-01-01'), end: new Date('2025-01-01') }),
      ).toThrow(/strictly after/)
    })
  })
})
