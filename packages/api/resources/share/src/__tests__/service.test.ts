const { mockCount, mockCreate, mockDeleteMany, mockFindMany, mockFindOne, mockUpdateById } =
  vi.hoisted(() => ({
    mockCount: vi.fn(),
    mockCreate: vi.fn(),
    mockDeleteMany: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindOne: vi.fn(),
    mockUpdateById: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  count: mockCount,
  create: mockCreate,
  deleteMany: mockDeleteMany,
  findMany: mockFindMany,
  findOne: mockFindOne,
  updateById: mockUpdateById,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  canAccess,
  compareRoles,
  createShareLink,
  generateSlug,
  getEffectiveRole,
  getPrincipalRole,
  getShareLinkById,
  grantShare,
  isExpired,
  listShareLinks,
  listShares,
  resolveShareLink,
  revokeShare,
  revokeShareById,
  revokeShareLink,
  roleSatisfies,
  updateShare,
} from '../service.js'
import { SHARE_ROLES } from '../types.js'

describe('@molecule/api-resource-share — service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('role helpers', () => {
    it('orders roles viewer < commenter < editor < owner', () => {
      expect(SHARE_ROLES).toEqual(['viewer', 'commenter', 'editor', 'owner'])
      expect(compareRoles('viewer', 'editor')).toBeLessThan(0)
      expect(compareRoles('owner', 'viewer')).toBeGreaterThan(0)
      expect(compareRoles('editor', 'editor')).toBe(0)
    })

    it('roleSatisfies treats higher roles as satisfying lower requirements', () => {
      expect(roleSatisfies('owner', 'viewer')).toBe(true)
      expect(roleSatisfies('editor', 'editor')).toBe(true)
      expect(roleSatisfies('viewer', 'editor')).toBe(false)
    })

    it('isExpired returns false when timestamp is null/undefined/future', () => {
      expect(isExpired(null)).toBe(false)
      expect(isExpired(undefined)).toBe(false)
      const future = new Date(Date.now() + 60_000).toISOString()
      expect(isExpired(future)).toBe(false)
    })

    it('isExpired returns true for past timestamps', () => {
      const past = new Date(Date.now() - 60_000).toISOString()
      expect(isExpired(past)).toBe(true)
    })

    it('isExpired returns false for unparseable timestamps', () => {
      expect(isExpired('not-a-date')).toBe(false)
    })
  })

  describe('grantShare', () => {
    it('creates a new share when none exists', async () => {
      mockFindOne.mockResolvedValue(null)
      const created = { id: 's1', resourceType: 'doc', resourceId: 'd1' }
      mockCreate.mockResolvedValue({ data: created, affected: 1 })

      const result = await grantShare({
        resourceType: 'doc',
        resourceId: 'd1',
        principalType: 'user',
        principalId: 'u1',
        role: 'editor',
        grantedBy: 'admin-1',
      })

      expect(mockCreate).toHaveBeenCalledWith(
        'resource-shares',
        expect.objectContaining({
          resourceType: 'doc',
          resourceId: 'd1',
          principalType: 'user',
          principalId: 'u1',
          role: 'editor',
          grantedBy: 'admin-1',
          expiresAt: null,
        }),
      )
      expect(result).toBe(created)
    })

    it('upserts: updates existing share role/expiry', async () => {
      mockFindOne.mockResolvedValue({ id: 's1', role: 'viewer', expiresAt: null })
      const updated = { id: 's1', role: 'editor', expiresAt: '2099-01-01T00:00:00.000Z' }
      mockUpdateById.mockResolvedValue({ data: updated, affected: 1 })

      const result = await grantShare({
        resourceType: 'doc',
        resourceId: 'd1',
        principalType: 'user',
        principalId: 'u1',
        role: 'editor',
        expiresAt: '2099-01-01T00:00:00.000Z',
      })

      expect(mockCreate).not.toHaveBeenCalled()
      expect(mockUpdateById).toHaveBeenCalledWith('resource-shares', 's1', {
        role: 'editor',
        expiresAt: '2099-01-01T00:00:00.000Z',
      })
      expect(result).toBe(updated)
    })
  })

  describe('updateShare', () => {
    it('returns existing share when patch is empty', async () => {
      const existing = { id: 's1', role: 'editor' }
      mockFindOne.mockResolvedValue(existing)
      const result = await updateShare('s1', {})
      expect(mockUpdateById).not.toHaveBeenCalled()
      expect(result).toBe(existing)
    })

    it('updates role only', async () => {
      mockUpdateById.mockResolvedValue({ data: { id: 's1', role: 'owner' }, affected: 1 })
      const result = await updateShare('s1', { role: 'owner' })
      expect(mockUpdateById).toHaveBeenCalledWith('resource-shares', 's1', { role: 'owner' })
      expect(result).toEqual({ id: 's1', role: 'owner' })
    })

    it('returns null when row not found', async () => {
      mockUpdateById.mockResolvedValue({ data: null, affected: 0 })
      const result = await updateShare('s-missing', { role: 'owner' })
      expect(result).toBeNull()
    })
  })

  describe('revoke', () => {
    it('revokeShare deletes by full key', async () => {
      mockDeleteMany.mockResolvedValue({ data: null, affected: 1 })
      await revokeShare('doc', 'd1', 'user', 'u1')
      expect(mockDeleteMany).toHaveBeenCalledWith(
        'resource-shares',
        expect.arrayContaining([
          { field: 'resourceType', operator: '=', value: 'doc' },
          { field: 'resourceId', operator: '=', value: 'd1' },
          { field: 'principalType', operator: '=', value: 'user' },
          { field: 'principalId', operator: '=', value: 'u1' },
        ]),
      )
    })

    it('revokeShareById deletes by id', async () => {
      mockDeleteMany.mockResolvedValue({ data: null, affected: 1 })
      await revokeShareById('s1')
      expect(mockDeleteMany).toHaveBeenCalledWith('resource-shares', [
        { field: 'id', operator: '=', value: 's1' },
      ])
    })
  })

  describe('listShares', () => {
    it('returns paginated list with total', async () => {
      mockFindMany.mockResolvedValue([{ id: 's1' }])
      mockCount.mockResolvedValue(1)
      const result = await listShares('doc', 'd1', { limit: 10, offset: 0 })
      expect(result).toEqual({ data: [{ id: 's1' }], total: 1, limit: 10, offset: 0 })
    })

    it('applies optional principalType filter', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      await listShares('doc', 'd1', { principalType: 'team' })
      const where = mockFindMany.mock.calls[0][1].where
      expect(where).toEqual(
        expect.arrayContaining([{ field: 'principalType', operator: '=', value: 'team' }]),
      )
    })
  })

  describe('getPrincipalRole', () => {
    it('returns null when no row', async () => {
      mockFindOne.mockResolvedValue(null)
      expect(await getPrincipalRole('doc', 'd1', 'user', 'u1')).toBeNull()
    })

    it('returns the role when active', async () => {
      mockFindOne.mockResolvedValue({ role: 'editor', expiresAt: null })
      expect(await getPrincipalRole('doc', 'd1', 'user', 'u1')).toBe('editor')
    })

    it('returns null when expired', async () => {
      const past = new Date(Date.now() - 1000).toISOString()
      mockFindOne.mockResolvedValue({ role: 'editor', expiresAt: past })
      expect(await getPrincipalRole('doc', 'd1', 'user', 'u1')).toBeNull()
    })
  })

  describe('getEffectiveRole', () => {
    it('returns null with no grants', async () => {
      mockFindOne.mockResolvedValue(null)
      expect(await getEffectiveRole('doc', 'd1', 'u1')).toBeNull()
    })

    it('chooses the highest role from user, team, public grants', async () => {
      // user: viewer, team: editor, public: commenter -> editor wins
      mockFindOne
        .mockResolvedValueOnce({ role: 'viewer', expiresAt: null })
        .mockResolvedValueOnce({ role: 'editor', expiresAt: null })
        .mockResolvedValueOnce({ role: 'commenter', expiresAt: null })

      const role = await getEffectiveRole('doc', 'd1', 'u1', ['team-1'])
      expect(role).toBe('editor')
    })

    it('treats anonymous (null userId) but still returns public role', async () => {
      mockFindOne.mockResolvedValueOnce({ role: 'viewer', expiresAt: null })
      const role = await getEffectiveRole('doc', 'd1', null)
      expect(role).toBe('viewer')
    })

    it('skips expired grants', async () => {
      const past = new Date(Date.now() - 1000).toISOString()
      mockFindOne
        .mockResolvedValueOnce({ role: 'editor', expiresAt: past })
        .mockResolvedValueOnce(null)
      const role = await getEffectiveRole('doc', 'd1', 'u1')
      expect(role).toBeNull()
    })
  })

  describe('canAccess', () => {
    it('returns true when effective role satisfies', async () => {
      mockFindOne
        .mockResolvedValueOnce({ role: 'editor', expiresAt: null })
        .mockResolvedValueOnce(null)
      expect(await canAccess('doc', 'd1', 'commenter', 'u1')).toBe(true)
    })

    it('returns false when effective role is below required', async () => {
      mockFindOne
        .mockResolvedValueOnce({ role: 'viewer', expiresAt: null })
        .mockResolvedValueOnce(null)
      expect(await canAccess('doc', 'd1', 'editor', 'u1')).toBe(false)
    })

    it('returns false when no grants', async () => {
      mockFindOne.mockResolvedValue(null)
      expect(await canAccess('doc', 'd1', 'viewer', 'u1')).toBe(false)
    })
  })

  describe('share links', () => {
    it('generateSlug returns 32 hex chars', () => {
      const slug = generateSlug()
      expect(slug).toMatch(/^[0-9a-f]{32}$/)
    })

    it('generateSlug returns distinct values', () => {
      const a = generateSlug()
      const b = generateSlug()
      expect(a).not.toBe(b)
    })

    it('createShareLink creates row with generated slug', async () => {
      const created = { id: 'l1', slug: 'abc' }
      mockCreate.mockResolvedValue({ data: created, affected: 1 })
      const result = await createShareLink({
        resourceType: 'doc',
        resourceId: 'd1',
        role: 'viewer',
      })
      expect(mockCreate).toHaveBeenCalledWith(
        'resource-share-links',
        expect.objectContaining({
          resourceType: 'doc',
          resourceId: 'd1',
          role: 'viewer',
          revokedAt: null,
        }),
      )
      // Slug is generated, not passed in.
      const written = mockCreate.mock.calls[0][1] as Record<string, unknown>
      expect(written.slug).toMatch(/^[0-9a-f]{32}$/)
      expect(result).toBe(created)
    })

    it('listShareLinks delegates to findMany', async () => {
      mockFindMany.mockResolvedValue([{ id: 'l1' }])
      const result = await listShareLinks('doc', 'd1')
      expect(result).toEqual([{ id: 'l1' }])
    })

    it('getShareLinkById returns the link by id', async () => {
      const link = { id: 'l1', resourceType: 'doc', resourceId: 'd1' }
      mockFindOne.mockResolvedValue(link)
      const result = await getShareLinkById('l1')
      expect(mockFindOne).toHaveBeenCalledWith('resource-share-links', [
        { field: 'id', operator: '=', value: 'l1' },
      ])
      expect(result).toBe(link)
    })

    it('getShareLinkById returns null when not found', async () => {
      mockFindOne.mockResolvedValue(null)
      expect(await getShareLinkById('l-missing')).toBeNull()
    })

    it('revokeShareLink returns null when missing', async () => {
      mockFindOne.mockResolvedValue(null)
      expect(await revokeShareLink('l-missing')).toBeNull()
    })

    it('revokeShareLink is idempotent — returns existing if already revoked', async () => {
      const already = { id: 'l1', revokedAt: '2020-01-01T00:00:00.000Z' }
      mockFindOne.mockResolvedValue(already)
      const result = await revokeShareLink('l1')
      expect(mockUpdateById).not.toHaveBeenCalled()
      expect(result).toBe(already)
    })

    it('revokeShareLink sets revokedAt on active link', async () => {
      mockFindOne.mockResolvedValue({ id: 'l1', revokedAt: null })
      mockUpdateById.mockResolvedValue({ data: { id: 'l1', revokedAt: 'now' }, affected: 1 })
      const result = await revokeShareLink('l1')
      expect(mockUpdateById).toHaveBeenCalledWith(
        'resource-share-links',
        'l1',
        expect.objectContaining({ revokedAt: expect.any(String) }),
      )
      expect(result).toEqual({ id: 'l1', revokedAt: 'now' })
    })

    it('resolveShareLink returns null for unknown slug', async () => {
      mockFindOne.mockResolvedValue(null)
      expect(await resolveShareLink('xxx')).toBeNull()
    })

    it('resolveShareLink returns null for revoked link', async () => {
      mockFindOne.mockResolvedValue({ id: 'l1', revokedAt: '2020-01-01T00:00:00.000Z' })
      expect(await resolveShareLink('xxx')).toBeNull()
    })

    it('resolveShareLink returns null for expired link', async () => {
      const past = new Date(Date.now() - 1000).toISOString()
      mockFindOne.mockResolvedValue({ id: 'l1', revokedAt: null, expiresAt: past })
      expect(await resolveShareLink('xxx')).toBeNull()
    })

    it('resolveShareLink returns active link', async () => {
      const link = { id: 'l1', revokedAt: null, expiresAt: null }
      mockFindOne.mockResolvedValue(link)
      expect(await resolveShareLink('xxx')).toBe(link)
    })
  })
})
