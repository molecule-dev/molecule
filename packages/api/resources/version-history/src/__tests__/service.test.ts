const { mockCreate, mockFindById, mockFindMany, mockFindOne, mockCount, mockDeleteMany } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindById: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindOne: vi.fn(),
    mockCount: vi.fn(),
    mockDeleteMany: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  findOne: mockFindOne,
  count: mockCount,
  deleteMany: mockDeleteMany,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createVersion,
  deleteVersionsForResource,
  diffVersions,
  getLatestVersion,
  getVersionById,
  getVersionByNumber,
  getVersionCount,
  getVersionsForResource,
  restoreVersion,
} from '../service.js'

describe('@molecule/api-resource-version-history service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createVersion', () => {
    it('creates the first version with version=1, no diff, append-only metadata', async () => {
      mockFindMany.mockResolvedValue([])
      const created = {
        id: 'v1',
        resourceType: 'doc',
        resourceId: 'd1',
        version: 1,
        userId: 'u1',
        snapshot: { title: 'Hello' },
        changes: null,
        reason: 'initial',
      }
      mockCreate.mockResolvedValue({ data: created, affected: 1 })

      const result = await createVersion({
        resourceType: 'doc',
        resourceId: 'd1',
        userId: 'u1',
        snapshot: { title: 'Hello' },
        reason: 'initial',
      })

      expect(mockFindMany).toHaveBeenCalledWith('versions', {
        where: [
          { field: 'resourceType', operator: '=', value: 'doc' },
          { field: 'resourceId', operator: '=', value: 'd1' },
        ],
        orderBy: [{ field: 'version', direction: 'desc' }],
        limit: 1,
      })
      expect(mockCreate).toHaveBeenCalledWith('versions', {
        resourceType: 'doc',
        resourceId: 'd1',
        version: 1,
        userId: 'u1',
        snapshot: { title: 'Hello' },
        changes: null,
        reason: 'initial',
      })
      expect(result).toEqual(created)
    })

    it('increments version and computes shallow diff against the prior snapshot', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'v1',
          version: 3,
          resourceType: 'doc',
          resourceId: 'd1',
          snapshot: { title: 'Old', body: 'Same' },
        },
      ])
      const created = { id: 'v2', version: 4 }
      mockCreate.mockResolvedValue({ data: created, affected: 1 })

      await createVersion({
        resourceType: 'doc',
        resourceId: 'd1',
        userId: 'u1',
        snapshot: { title: 'New', body: 'Same' },
      })

      expect(mockCreate).toHaveBeenCalledWith('versions', {
        resourceType: 'doc',
        resourceId: 'd1',
        version: 4,
        userId: 'u1',
        snapshot: { title: 'New', body: 'Same' },
        changes: { title: { before: 'Old', after: 'New' } },
        reason: null,
      })
    })

    it('defaults userId to null for system-generated versions', async () => {
      mockFindMany.mockResolvedValue([])
      mockCreate.mockResolvedValue({ data: { id: 'v1' }, affected: 1 })

      await createVersion({
        resourceType: 'doc',
        resourceId: 'd1',
        snapshot: { title: 'Hi' },
      })

      expect(mockCreate).toHaveBeenCalledWith(
        'versions',
        expect.objectContaining({ userId: null, reason: null }),
      )
    })

    it('throws when create returns no data', async () => {
      mockFindMany.mockResolvedValue([])
      mockCreate.mockResolvedValue({ data: null, affected: 0 })

      await expect(
        createVersion({ resourceType: 'doc', resourceId: 'd1', snapshot: {} }),
      ).rejects.toThrow('Failed to create version')
    })
  })

  describe('getLatestVersion', () => {
    it('returns the newest row or null', async () => {
      mockFindMany.mockResolvedValue([{ id: 'v1', version: 5 }])
      expect(await getLatestVersion('doc', 'd1')).toEqual({ id: 'v1', version: 5 })

      mockFindMany.mockResolvedValue([])
      expect(await getLatestVersion('doc', 'd2')).toBeNull()
    })
  })

  describe('getVersionsForResource', () => {
    it('returns paginated versions ordered desc, with sane defaults', async () => {
      mockFindMany.mockResolvedValue([{ id: 'v1' }])
      mockCount.mockResolvedValue(1)

      const result = await getVersionsForResource('doc', 'd1')

      expect(result).toEqual({ data: [{ id: 'v1' }], total: 1, limit: 20, offset: 0 })
      expect(mockFindMany).toHaveBeenCalledWith('versions', {
        where: [
          { field: 'resourceType', operator: '=', value: 'doc' },
          { field: 'resourceId', operator: '=', value: 'd1' },
        ],
        orderBy: [{ field: 'version', direction: 'desc' }],
        limit: 20,
        offset: 0,
      })
    })

    it('honors explicit pagination', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const result = await getVersionsForResource('doc', 'd1', { limit: 5, offset: 10 })

      expect(result).toEqual({ data: [], total: 0, limit: 5, offset: 10 })
    })
  })

  describe('getVersionById', () => {
    it('delegates to findById', async () => {
      mockFindById.mockResolvedValue({ id: 'v1' })
      expect(await getVersionById('v1')).toEqual({ id: 'v1' })
      expect(mockFindById).toHaveBeenCalledWith('versions', 'v1')
    })
  })

  describe('getVersionByNumber', () => {
    it('looks up the row matching all three keys', async () => {
      mockFindOne.mockResolvedValue({ id: 'v1', version: 3 })

      expect(await getVersionByNumber('doc', 'd1', 3)).toEqual({ id: 'v1', version: 3 })
      expect(mockFindOne).toHaveBeenCalledWith('versions', [
        { field: 'resourceType', operator: '=', value: 'doc' },
        { field: 'resourceId', operator: '=', value: 'd1' },
        { field: 'version', operator: '=', value: 3 },
      ])
    })
  })

  describe('diffVersions', () => {
    it('returns null when either version is missing', async () => {
      mockFindById.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'v2' })
      expect(await diffVersions('missing', 'v2')).toBeNull()
    })

    it('returns null when versions belong to different resources', async () => {
      mockFindById
        .mockResolvedValueOnce({ id: 'v1', resourceType: 'doc', resourceId: 'd1', version: 1 })
        .mockResolvedValueOnce({ id: 'v2', resourceType: 'doc', resourceId: 'd2', version: 2 })

      expect(await diffVersions('v1', 'v2')).toBeNull()
    })

    it('always treats the lower-numbered version as `from`', async () => {
      const a = {
        id: 'v1',
        resourceType: 'doc',
        resourceId: 'd1',
        version: 1,
        snapshot: { title: 'Old' },
      }
      const b = {
        id: 'v2',
        resourceType: 'doc',
        resourceId: 'd1',
        version: 2,
        snapshot: { title: 'New' },
      }
      mockFindById.mockResolvedValueOnce(b).mockResolvedValueOnce(a)

      const result = await diffVersions('v2', 'v1')

      expect(result?.from.id).toBe('v1')
      expect(result?.to.id).toBe('v2')
      expect(result?.changes).toEqual({ title: { before: 'Old', after: 'New' } })
    })
  })

  describe('restoreVersion', () => {
    it('returns null when target version not found', async () => {
      mockFindById.mockResolvedValue(null)
      expect(await restoreVersion('missing', 'u1')).toBeNull()
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('appends a new version with the target snapshot and a default reason', async () => {
      const target = {
        id: 'v1',
        resourceType: 'doc',
        resourceId: 'd1',
        version: 2,
        snapshot: { title: 'Old' },
      }
      mockFindById.mockResolvedValue(target)
      mockFindMany.mockResolvedValue([{ ...target, version: 5 }])
      mockCreate.mockResolvedValue({ data: { id: 'v6', version: 6 }, affected: 1 })

      const result = await restoreVersion('v1', 'u1')

      expect(mockCreate).toHaveBeenCalledWith(
        'versions',
        expect.objectContaining({
          resourceType: 'doc',
          resourceId: 'd1',
          version: 6,
          userId: 'u1',
          snapshot: { title: 'Old' },
          reason: 'Restored from version 2',
        }),
      )
      expect(result).toEqual({ id: 'v6', version: 6 })
    })

    it('honors an explicit reason', async () => {
      mockFindById.mockResolvedValue({
        id: 'v1',
        resourceType: 'doc',
        resourceId: 'd1',
        version: 2,
        snapshot: { title: 'Old' },
      })
      mockFindMany.mockResolvedValue([])
      mockCreate.mockResolvedValue({ data: { id: 'v2' }, affected: 1 })

      await restoreVersion('v1', 'u1', 'rolling back vandalism')

      expect(mockCreate).toHaveBeenCalledWith(
        'versions',
        expect.objectContaining({ reason: 'rolling back vandalism' }),
      )
    })
  })

  describe('deleteVersionsForResource', () => {
    it('returns the affected row count', async () => {
      mockDeleteMany.mockResolvedValue({ affected: 7, data: null })
      expect(await deleteVersionsForResource('doc', 'd1')).toBe(7)
      expect(mockDeleteMany).toHaveBeenCalledWith('versions', [
        { field: 'resourceType', operator: '=', value: 'doc' },
        { field: 'resourceId', operator: '=', value: 'd1' },
      ])
    })

    it('coerces missing affected to 0', async () => {
      mockDeleteMany.mockResolvedValue({ data: null })
      expect(await deleteVersionsForResource('doc', 'd1')).toBe(0)
    })
  })

  describe('getVersionCount', () => {
    it('delegates to count() with the correct where clause', async () => {
      mockCount.mockResolvedValue(42)
      expect(await getVersionCount('doc', 'd1')).toBe(42)
      expect(mockCount).toHaveBeenCalledWith('versions', [
        { field: 'resourceType', operator: '=', value: 'doc' },
        { field: 'resourceId', operator: '=', value: 'd1' },
      ])
    })
  })
})
