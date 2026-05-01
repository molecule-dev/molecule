const {
  mockCreate,
  mockFindById,
  mockFindMany,
  mockFindOne,
  mockCount,
  mockUpdateById,
  mockUpdateMany,
  mockDeleteById,
  mockDeleteMany,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindOne: vi.fn(),
  mockCount: vi.fn(),
  mockUpdateById: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockDeleteById: vi.fn(),
  mockDeleteMany: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  findOne: mockFindOne,
  count: mockCount,
  updateById: mockUpdateById,
  updateMany: mockUpdateMany,
  deleteById: mockDeleteById,
  deleteMany: mockDeleteMany,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  countTrashedItems,
  deleteTrashForResource,
  getActiveTrashedItem,
  getTrashedItemById,
  listTrashedItems,
  purgeExpired,
  purgeItem,
  purgeItemHard,
  restoreFromTrash,
  trashItem,
} from '../service.js'

const ACTIVE_WHERE = [
  { field: 'restoredAt', operator: 'is_null' },
  { field: 'purgedAt', operator: 'is_null' },
]

describe('@molecule/api-trash service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('trashItem', () => {
    it('writes a row with snapshot, no expiry by default, and active timestamps null', async () => {
      const created = {
        id: 't1',
        resourceType: 'document',
        resourceId: 'd1',
        userId: 'u1',
        snapshot: { title: 'Hello' },
        reason: 'user delete',
        trashedAt: '2026-05-01T00:00:00.000Z',
        expiresAt: null,
        restoredAt: null,
        restoredBy: null,
        purgedAt: null,
      }
      mockCreate.mockResolvedValue({ data: created, affected: 1 })

      const result = await trashItem({
        resourceType: 'document',
        resourceId: 'd1',
        userId: 'u1',
        snapshot: { title: 'Hello' },
        reason: 'user delete',
      })

      expect(mockCreate).toHaveBeenCalledWith('trashedItems', {
        resourceType: 'document',
        resourceId: 'd1',
        userId: 'u1',
        snapshot: { title: 'Hello' },
        reason: 'user delete',
        expiresAt: null,
        restoredAt: null,
        restoredBy: null,
        purgedAt: null,
      })
      expect(result).toEqual(created)
    })

    it('computes expiresAt = now + ttlMs when ttlMs is supplied', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-05-01T00:00:00.000Z'))
      mockCreate.mockResolvedValue({ data: { id: 't1' }, affected: 1 })

      await trashItem({
        resourceType: 'document',
        resourceId: 'd1',
        snapshot: {},
        ttlMs: 7 * 24 * 60 * 60 * 1000,
      })

      expect(mockCreate).toHaveBeenCalledWith(
        'trashedItems',
        expect.objectContaining({
          expiresAt: '2026-05-08T00:00:00.000Z',
        }),
      )
      vi.useRealTimers()
    })

    it('defaults userId and reason to null', async () => {
      mockCreate.mockResolvedValue({ data: { id: 't1' }, affected: 1 })

      await trashItem({ resourceType: 'document', resourceId: 'd1', snapshot: {} })

      expect(mockCreate).toHaveBeenCalledWith(
        'trashedItems',
        expect.objectContaining({ userId: null, reason: null, expiresAt: null }),
      )
    })

    it('throws when create returns no data', async () => {
      mockCreate.mockResolvedValue({ data: null, affected: 0 })

      await expect(
        trashItem({ resourceType: 'document', resourceId: 'd1', snapshot: {} }),
      ).rejects.toThrow('Failed to trash item')
    })

    it('treats zero or negative ttlMs as no expiry', async () => {
      mockCreate.mockResolvedValue({ data: { id: 't1' }, affected: 1 })

      await trashItem({ resourceType: 'document', resourceId: 'd1', snapshot: {}, ttlMs: 0 })
      expect(mockCreate).toHaveBeenLastCalledWith(
        'trashedItems',
        expect.objectContaining({ expiresAt: null }),
      )

      await trashItem({ resourceType: 'document', resourceId: 'd1', snapshot: {}, ttlMs: -5 })
      expect(mockCreate).toHaveBeenLastCalledWith(
        'trashedItems',
        expect.objectContaining({ expiresAt: null }),
      )
    })
  })

  describe('getActiveTrashedItem', () => {
    it('looks up by resource keys + active filter', async () => {
      mockFindOne.mockResolvedValue({ id: 't1' })
      expect(await getActiveTrashedItem('document', 'd1')).toEqual({ id: 't1' })
      expect(mockFindOne).toHaveBeenCalledWith('trashedItems', [
        { field: 'resourceType', operator: '=', value: 'document' },
        { field: 'resourceId', operator: '=', value: 'd1' },
        ...ACTIVE_WHERE,
      ])
    })

    it('returns null when none exists', async () => {
      mockFindOne.mockResolvedValue(null)
      expect(await getActiveTrashedItem('document', 'd1')).toBeNull()
    })
  })

  describe('getTrashedItemById', () => {
    it('delegates to findById', async () => {
      mockFindById.mockResolvedValue({ id: 't1' })
      expect(await getTrashedItemById('t1')).toEqual({ id: 't1' })
      expect(mockFindById).toHaveBeenCalledWith('trashedItems', 't1')
    })
  })

  describe('listTrashedItems', () => {
    it('returns active-only by default ordered by trashedAt desc', async () => {
      mockFindMany.mockResolvedValue([{ id: 't1' }])
      mockCount.mockResolvedValue(1)

      const result = await listTrashedItems()

      expect(result).toEqual({ data: [{ id: 't1' }], total: 1, limit: 20, offset: 0 })
      expect(mockFindMany).toHaveBeenCalledWith('trashedItems', {
        where: ACTIVE_WHERE,
        orderBy: [{ field: 'trashedAt', direction: 'desc' }],
        limit: 20,
        offset: 0,
      })
    })

    it('filters by resourceType and userId when supplied', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await listTrashedItems({ resourceType: 'document', userId: 'u1', limit: 5, offset: 10 })

      expect(mockFindMany).toHaveBeenCalledWith('trashedItems', {
        where: [
          { field: 'resourceType', operator: '=', value: 'document' },
          { field: 'userId', operator: '=', value: 'u1' },
          ...ACTIVE_WHERE,
        ],
        orderBy: [{ field: 'trashedAt', direction: 'desc' }],
        limit: 5,
        offset: 10,
      })
    })

    it('omits the active-only filter when includeInactive=true', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await listTrashedItems({ includeInactive: true })

      expect(mockFindMany).toHaveBeenCalledWith('trashedItems', {
        where: [],
        orderBy: [{ field: 'trashedAt', direction: 'desc' }],
        limit: 20,
        offset: 0,
      })
    })
  })

  describe('countTrashedItems', () => {
    it('counts active rows by default', async () => {
      mockCount.mockResolvedValue(3)
      expect(await countTrashedItems()).toBe(3)
      expect(mockCount).toHaveBeenCalledWith('trashedItems', ACTIVE_WHERE)
    })

    it('honors filter combinations', async () => {
      mockCount.mockResolvedValue(0)
      await countTrashedItems({ resourceType: 'project', userId: 'u9', includeInactive: true })
      expect(mockCount).toHaveBeenCalledWith('trashedItems', [
        { field: 'resourceType', operator: '=', value: 'project' },
        { field: 'userId', operator: '=', value: 'u9' },
      ])
    })
  })

  describe('restoreFromTrash', () => {
    it('returns null when row not found', async () => {
      mockFindById.mockResolvedValue(null)
      const cb = vi.fn()
      expect(await restoreFromTrash('missing', 'u1', cb)).toBeNull()
      expect(cb).not.toHaveBeenCalled()
    })

    it('returns null when row is already restored or purged', async () => {
      mockFindById.mockResolvedValue({
        id: 't1',
        resourceType: 'document',
        resourceId: 'd1',
        snapshot: {},
        restoredAt: '2026-04-01T00:00:00.000Z',
        purgedAt: null,
      })
      const cb = vi.fn()
      expect(await restoreFromTrash('t1', 'u1', cb)).toBeNull()
      expect(cb).not.toHaveBeenCalled()

      mockFindById.mockResolvedValue({
        id: 't2',
        resourceType: 'document',
        resourceId: 'd2',
        snapshot: {},
        restoredAt: null,
        purgedAt: '2026-04-01T00:00:00.000Z',
      })
      expect(await restoreFromTrash('t2', 'u1', cb)).toBeNull()
      expect(cb).not.toHaveBeenCalled()
    })

    it('runs the callback BEFORE stamping restoredAt', async () => {
      const target = {
        id: 't1',
        resourceType: 'document',
        resourceId: 'd1',
        snapshot: { title: 'Hello' },
        restoredAt: null,
        purgedAt: null,
      }
      mockFindById.mockResolvedValue(target)
      mockUpdateById.mockResolvedValue({
        data: { ...target, restoredAt: '2026-05-01T00:00:00.000Z', restoredBy: 'u1' },
        affected: 1,
      })

      const order: string[] = []
      const cb = vi.fn(async () => {
        order.push('callback')
      })
      mockUpdateById.mockImplementationOnce(async (_t, _id, data) => {
        order.push('updateById')
        return {
          data: { ...target, ...data },
          affected: 1,
        }
      })

      const result = await restoreFromTrash('t1', 'u1', cb)

      expect(order).toEqual(['callback', 'updateById'])
      expect(cb).toHaveBeenCalledWith(target.snapshot, target)
      expect(result?.callbackSucceeded).toBe(true)
      expect(result?.trashedItem.restoredBy).toBe('u1')
    })

    it('does NOT stamp restoredAt when the callback throws', async () => {
      const target = {
        id: 't1',
        resourceType: 'document',
        resourceId: 'd1',
        snapshot: {},
        restoredAt: null,
        purgedAt: null,
      }
      mockFindById.mockResolvedValue(target)
      const cb = vi.fn(async () => {
        throw new Error('parent recreate failed')
      })

      await expect(restoreFromTrash('t1', 'u1', cb)).rejects.toThrow('parent recreate failed')
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('throws when updateById returns no data after a successful callback', async () => {
      mockFindById.mockResolvedValue({
        id: 't1',
        resourceType: 'document',
        resourceId: 'd1',
        snapshot: {},
        restoredAt: null,
        purgedAt: null,
      })
      mockUpdateById.mockResolvedValue({ data: null, affected: 0 })

      await expect(
        restoreFromTrash('t1', 'u1', vi.fn().mockResolvedValue(undefined)),
      ).rejects.toThrow('Failed to update trash row after restore')
    })
  })

  describe('purgeItem', () => {
    it('returns null when row not found', async () => {
      mockFindById.mockResolvedValue(null)
      expect(await purgeItem('missing')).toBeNull()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('returns null when already purged', async () => {
      mockFindById.mockResolvedValue({
        id: 't1',
        purgedAt: '2026-01-01T00:00:00.000Z',
      })
      expect(await purgeItem('t1')).toBeNull()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('stamps purgedAt and returns the updated row', async () => {
      mockFindById.mockResolvedValue({ id: 't1', purgedAt: null })
      mockUpdateById.mockResolvedValue({
        data: { id: 't1', purgedAt: '2026-05-01T00:00:00.000Z' },
        affected: 1,
      })
      const result = await purgeItem('t1')
      expect(result?.purgedAt).toBeDefined()
      expect(mockUpdateById).toHaveBeenCalledWith(
        'trashedItems',
        't1',
        expect.objectContaining({ purgedAt: expect.any(String) }),
      )
    })
  })

  describe('purgeItemHard', () => {
    it('reports true on success and false on no-op', async () => {
      mockDeleteById.mockResolvedValueOnce({ data: null, affected: 1 })
      expect(await purgeItemHard('t1')).toBe(true)
      mockDeleteById.mockResolvedValueOnce({ data: null, affected: 0 })
      expect(await purgeItemHard('t2')).toBe(false)
      mockDeleteById.mockResolvedValueOnce({ data: null })
      expect(await purgeItemHard('t3')).toBe(false)
    })
  })

  describe('purgeExpired', () => {
    it('soft-purges every active row whose expiresAt is past', async () => {
      mockUpdateMany.mockResolvedValue({ data: null, affected: 4 })
      const now = new Date('2026-05-01T00:00:00.000Z')

      const purged = await purgeExpired(now)

      expect(purged).toBe(4)
      expect(mockUpdateMany).toHaveBeenCalledWith(
        'trashedItems',
        [
          { field: 'expiresAt', operator: '<=', value: '2026-05-01T00:00:00.000Z' },
          ...ACTIVE_WHERE,
        ],
        { purgedAt: '2026-05-01T00:00:00.000Z' },
      )
    })

    it('coerces missing affected to 0', async () => {
      mockUpdateMany.mockResolvedValue({ data: null })
      expect(await purgeExpired(new Date())).toBe(0)
    })
  })

  describe('deleteTrashForResource', () => {
    it('hard-deletes every row for the resource and returns the affected count', async () => {
      mockDeleteMany.mockResolvedValue({ data: null, affected: 2 })
      expect(await deleteTrashForResource('document', 'd1')).toBe(2)
      expect(mockDeleteMany).toHaveBeenCalledWith('trashedItems', [
        { field: 'resourceType', operator: '=', value: 'document' },
        { field: 'resourceId', operator: '=', value: 'd1' },
      ])
    })

    it('coerces missing affected to 0', async () => {
      mockDeleteMany.mockResolvedValue({ data: null })
      expect(await deleteTrashForResource('document', 'd1')).toBe(0)
    })
  })
})
