/**
 * Service tests — DataStore mocked.
 *
 * Verifies the recordEvent / getScore / getEvents / awardBadge /
 * listBadges / revokeBadge contracts: idempotency, level recompute,
 * limit handling, append-only event semantics.
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

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  awardBadge,
  getEvents,
  getScore,
  listBadges,
  recordEvent,
  revokeBadge,
} from '../service.js'

describe('@molecule/api-reputation service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('recordEvent', () => {
    it('appends an event row and creates a new score row when none exists', async () => {
      mockCreate.mockResolvedValueOnce({ data: {}, affected: 1 })
      mockFindOne.mockResolvedValueOnce(null)
      mockCreate.mockResolvedValueOnce({
        data: {
          userId: 'user-1',
          score: 10,
          level: 0,
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
        affected: 1,
      })

      const result = await recordEvent('user-1', 'vote', 10, { sourceId: 'post-1' })

      expect(mockCreate).toHaveBeenCalledTimes(2)
      // First call: events insert with sourceId + null metadata.
      const eventArgs = mockCreate.mock.calls[0]
      expect(eventArgs[0]).toBe('reputation_events')
      expect(eventArgs[1]).toMatchObject({
        userId: 'user-1',
        kind: 'vote',
        delta: 10,
        sourceId: 'post-1',
        metadata: null,
      })
      // Second call: scores insert.
      expect(mockCreate.mock.calls[1][0]).toBe('reputation_scores')
      expect(mockCreate.mock.calls[1][1]).toMatchObject({
        userId: 'user-1',
        score: 10,
        level: 0,
      })
      expect(result.score).toBe(10)
      expect(result.level).toBe(0)
    })

    it('updates the existing score row and recomputes level on threshold crossing', async () => {
      mockCreate.mockResolvedValueOnce({ data: {}, affected: 1 })
      mockFindOne.mockResolvedValueOnce({
        userId: 'user-1',
        score: 95,
        level: 0,
        updatedAt: '2026-05-01T00:00:00.000Z',
      })
      mockUpdateById.mockResolvedValueOnce({
        data: {
          userId: 'user-1',
          score: 105,
          level: 1,
          updatedAt: '2026-05-01T00:00:01.000Z',
        },
        affected: 1,
      })

      const result = await recordEvent('user-1', 'accepted-solution', 10)

      expect(mockUpdateById).toHaveBeenCalledTimes(1)
      const [table, id, data] = mockUpdateById.mock.calls[0]!
      expect(table).toBe('reputation_scores')
      expect(id).toBe('user-1')
      expect(data).toMatchObject({ score: 105, level: 1 })
      expect(result.level).toBe(1)
    })

    it('applies negative deltas and updates the level downward', async () => {
      mockCreate.mockResolvedValueOnce({ data: {}, affected: 1 })
      mockFindOne.mockResolvedValueOnce({
        userId: 'user-1',
        score: 105,
        level: 1,
        updatedAt: '2026-05-01T00:00:00.000Z',
      })
      mockUpdateById.mockResolvedValueOnce({
        data: null,
        affected: 1,
      })

      const result = await recordEvent('user-1', 'report-rejected', -10)

      expect(mockUpdateById).toHaveBeenCalledTimes(1)
      expect(mockUpdateById.mock.calls[0]![2]).toMatchObject({ score: 95, level: 0 })
      expect(result.score).toBe(95)
      expect(result.level).toBe(0)
    })

    it('passes metadata through when provided', async () => {
      mockCreate.mockResolvedValue({ data: {}, affected: 1 })
      mockFindOne.mockResolvedValueOnce(null)

      await recordEvent('user-1', 'post', 5, {
        sourceId: 'p1',
        metadata: { topic: 'help' },
      })

      expect(mockCreate.mock.calls[0]![1]).toMatchObject({
        metadata: { topic: 'help' },
        sourceId: 'p1',
      })
    })
  })

  describe('getScore', () => {
    it('returns a zeroed score when no row exists', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      const result = await getScore('user-1')
      expect(result).toMatchObject({ userId: 'user-1', score: 0, level: 0 })
    })

    it('returns the persisted row when present', async () => {
      mockFindOne.mockResolvedValueOnce({
        userId: 'user-1',
        score: 250,
        level: 1,
        updatedAt: '2026-05-01T00:00:00.000Z',
      })
      const result = await getScore('user-1')
      expect(result.score).toBe(250)
      expect(result.level).toBe(1)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('getEvents', () => {
    it('returns mapped events newest-first with default limit', async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: 'e2',
          userId: 'user-1',
          kind: 'vote',
          delta: 1,
          sourceId: 'p2',
          metadata: null,
          createdAt: '2026-05-01T00:00:01.000Z',
        },
        {
          id: 'e1',
          userId: 'user-1',
          kind: 'post',
          delta: 5,
          sourceId: null,
          metadata: { topic: 'help' },
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ])

      const result = await getEvents('user-1')

      expect(mockFindMany).toHaveBeenCalledWith('reputation_events', {
        where: [{ field: 'userId', operator: '=', value: 'user-1' }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 50,
      })
      expect(result).toHaveLength(2)
      expect(result[0]!.id).toBe('e2')
      expect(result[1]!.metadata).toEqual({ topic: 'help' })
      expect(result[0]!.createdAt).toBeInstanceOf(Date)
    })

    it('honours an explicit limit', async () => {
      mockFindMany.mockResolvedValueOnce([])
      await getEvents('user-1', 5)
      expect(mockFindMany.mock.calls[0]![1]).toMatchObject({ limit: 5 })
    })
  })

  describe('awardBadge', () => {
    it('creates a new badge row when none exists', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      mockCreate.mockResolvedValueOnce({
        data: {
          id: 'b1',
          userId: 'user-1',
          kind: 'first-post',
          awardedAt: '2026-05-01T00:00:00.000Z',
        },
        affected: 1,
      })

      const badge = await awardBadge('user-1', 'first-post')

      expect(mockCreate).toHaveBeenCalledWith(
        'badges',
        expect.objectContaining({
          userId: 'user-1',
          kind: 'first-post',
        }),
      )
      expect(badge.kind).toBe('first-post')
      expect(badge.id).toBe('b1')
    })

    it('is idempotent — returns the existing row without creating a new one', async () => {
      mockFindOne.mockResolvedValueOnce({
        id: 'b1',
        userId: 'user-1',
        kind: 'first-post',
        awardedAt: '2026-05-01T00:00:00.000Z',
      })

      const badge = await awardBadge('user-1', 'first-post')

      expect(mockCreate).not.toHaveBeenCalled()
      expect(badge.id).toBe('b1')
    })
  })

  describe('listBadges', () => {
    it('returns mapped badges newest-first', async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: 'b2',
          userId: 'user-1',
          kind: 'top-contributor',
          awardedAt: '2026-05-01T00:00:01.000Z',
        },
        {
          id: 'b1',
          userId: 'user-1',
          kind: 'first-post',
          awardedAt: '2026-05-01T00:00:00.000Z',
        },
      ])

      const result = await listBadges('user-1')

      expect(mockFindMany).toHaveBeenCalledWith('badges', {
        where: [{ field: 'userId', operator: '=', value: 'user-1' }],
        orderBy: [{ field: 'awardedAt', direction: 'desc' }],
      })
      expect(result).toHaveLength(2)
      expect(result[0]!.kind).toBe('top-contributor')
    })
  })

  describe('revokeBadge', () => {
    it('returns true when a row was deleted', async () => {
      mockDeleteMany.mockResolvedValueOnce({ data: null, affected: 1 })
      const ok = await revokeBadge('user-1', 'first-post')
      expect(ok).toBe(true)
      expect(mockDeleteMany).toHaveBeenCalledWith('badges', [
        { field: 'userId', operator: '=', value: 'user-1' },
        { field: 'kind', operator: '=', value: 'first-post' },
      ])
    })

    it('returns false when no rows matched', async () => {
      mockDeleteMany.mockResolvedValueOnce({ data: null, affected: 0 })
      const ok = await revokeBadge('user-1', 'first-post')
      expect(ok).toBe(false)
    })
  })
})
