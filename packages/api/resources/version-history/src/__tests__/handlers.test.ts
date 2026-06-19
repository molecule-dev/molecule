const {
  mockGetVersionsForResource,
  mockGetVersionCount,
  mockGetVersionByNumber,
  mockGetVersionById,
  mockDiffVersions,
  mockRestoreVersion,
  mockCreateVersion,
  mockGetOwnershipResolver,
} = vi.hoisted(() => ({
  mockGetVersionsForResource: vi.fn(),
  mockGetVersionCount: vi.fn(),
  mockGetVersionByNumber: vi.fn(),
  mockGetVersionById: vi.fn(),
  mockDiffVersions: vi.fn(),
  mockRestoreVersion: vi.fn(),
  mockCreateVersion: vi.fn(),
  mockGetOwnershipResolver: vi.fn(),
}))

vi.mock('../service.js', () => ({
  getVersionsForResource: mockGetVersionsForResource,
  getVersionCount: mockGetVersionCount,
  getVersionByNumber: mockGetVersionByNumber,
  getVersionById: mockGetVersionById,
  diffVersions: mockDiffVersions,
  restoreVersion: mockRestoreVersion,
  createVersion: mockCreateVersion,
}))

vi.mock('../registry.js', () => ({
  getOwnershipResolver: mockGetOwnershipResolver,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((key: string) => key),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isVersionAuthorized,
  isVersionHistoryAdmin,
  versionHistoryAdmin,
} from '../authorizers/ownership.js'
import { versionCount } from '../handlers/count.js'
import { create } from '../handlers/create.js'
import { diff } from '../handlers/diff.js'
import { list } from '../handlers/list.js'
import { read } from '../handlers/read.js'
import { readByNumber } from '../handlers/readByNumber.js'
import { restore } from '../handlers/restore.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(overrides: Record<string, unknown> = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session: { userId: 'owner' } },
    ...overrides,
  }
  return res
}

/** A resolver that authorizes only `owner`, like a real per-resource owner check. */
const ownerOnlyResolver = vi.fn(({ userId }: { userId: string }) => userId === 'owner')

describe('@molecule/api-resource-version-history handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: a resolver IS registered and authorizes only `owner`.
    mockGetOwnershipResolver.mockReturnValue(ownerOnlyResolver)
  })

  describe('list', () => {
    it('returns 401 when there is no authenticated session (P5RES-02)', async () => {
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes({ locals: {} })

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockGetVersionsForResource).not.toHaveBeenCalled()
    })

    it('returns 404 (no existence leak) for a resource the caller does not own (P5RES-02)', async () => {
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockGetVersionsForResource).not.toHaveBeenCalled()
    })

    it('returns 404 when no ownership resolver is registered (fail-closed)', async () => {
      mockGetOwnershipResolver.mockReturnValue(undefined)
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockGetVersionsForResource).not.toHaveBeenCalled()
    })

    it('lists versions for the parent resource owner', async () => {
      const result = { data: [{ id: 'v1' }], total: 1, limit: 20, offset: 0 }
      mockGetVersionsForResource.mockResolvedValue(result)
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes()

      await list(req, res)

      expect(mockGetVersionsForResource).toHaveBeenCalledWith('doc', 'd1', { limit: 20, offset: 0 })
      expect(res.json).toHaveBeenCalledWith(result)
    })

    it('lets an admin (opt-in widening) list any resource versions', async () => {
      const result = { data: [{ id: 'v1' }], total: 1, limit: 20, offset: 0 }
      mockGetVersionsForResource.mockResolvedValue(result)
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes({ locals: { session: { userId: 'admin' }, versionHistoryAdmin: true } })

      await list(req, res)

      // Admin bypasses the resolver entirely.
      expect(mockGetOwnershipResolver).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(result)
    })
  })

  describe('versionCount', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes({ locals: {} })

      await versionCount(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockGetVersionCount).not.toHaveBeenCalled()
    })

    it('returns 404 for a resource the caller does not own', async () => {
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await versionCount(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockGetVersionCount).not.toHaveBeenCalled()
    })

    it('counts versions for the owner', async () => {
      mockGetVersionCount.mockResolvedValue(7)
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes()

      await versionCount(req, res)

      expect(res.json).toHaveBeenCalledWith({ total: 7 })
    })
  })

  describe('readByNumber', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1', version: '2' } })
      const res = mockRes({ locals: {} })

      await readByNumber(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockGetVersionByNumber).not.toHaveBeenCalled()
    })

    it('returns 404 for a resource the caller does not own (P5RES-02)', async () => {
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1', version: '2' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await readByNumber(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockGetVersionByNumber).not.toHaveBeenCalled()
    })

    it('returns the version for the owner', async () => {
      const version = { id: 'v2', resourceType: 'doc', resourceId: 'd1', version: 2 }
      mockGetVersionByNumber.mockResolvedValue(version)
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1', version: '2' } })
      const res = mockRes()

      await readByNumber(req, res)

      expect(res.json).toHaveBeenCalledWith(version)
    })
  })

  describe('read', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ params: { versionId: 'v1' } })
      const res = mockRes({ locals: {} })

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockGetVersionById).not.toHaveBeenCalled()
    })

    it('returns 404 (no existence leak) for a version whose parent the caller does not own (P5RES-02)', async () => {
      mockGetVersionById.mockResolvedValue({
        id: 'v1',
        resourceType: 'doc',
        resourceId: 'd1',
        snapshot: { secret: 'tenant data' },
      })
      const req = mockReq({ params: { versionId: 'v1' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      // The other tenant's snapshot is never returned.
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({ snapshot: { secret: 'tenant data' } }),
      )
    })

    it('returns the version to the parent-resource owner', async () => {
      const version = { id: 'v1', resourceType: 'doc', resourceId: 'd1', snapshot: { title: 'x' } }
      mockGetVersionById.mockResolvedValue(version)
      const req = mockReq({ params: { versionId: 'v1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(version)
    })

    it('lets an admin read any version', async () => {
      const version = { id: 'v1', resourceType: 'doc', resourceId: 'd1', snapshot: {} }
      mockGetVersionById.mockResolvedValue(version)
      const req = mockReq({ params: { versionId: 'v1' } })
      const res = mockRes({ locals: { session: { userId: 'admin' }, versionHistoryAdmin: true } })

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(version)
    })

    it('returns 404 when the version does not exist', async () => {
      mockGetVersionById.mockResolvedValue(null)
      const req = mockReq({ params: { versionId: 'missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('diff', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ params: { fromVersionId: 'v1', toVersionId: 'v2' } })
      const res = mockRes({ locals: {} })

      await diff(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockDiffVersions).not.toHaveBeenCalled()
    })

    it('returns 404 (no existence leak) for a diff whose parent the caller does not own (P5RES-02)', async () => {
      mockDiffVersions.mockResolvedValue({
        from: { id: 'v1', resourceType: 'doc', resourceId: 'd1', snapshot: {} },
        to: { id: 'v2', resourceType: 'doc', resourceId: 'd1', snapshot: {} },
        changes: {},
      })
      const req = mockReq({ params: { fromVersionId: 'v1', toVersionId: 'v2' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await diff(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({ changes: {} }))
    })

    it('returns the diff to the owner', async () => {
      const result = {
        from: { id: 'v1', resourceType: 'doc', resourceId: 'd1', snapshot: {} },
        to: { id: 'v2', resourceType: 'doc', resourceId: 'd1', snapshot: {} },
        changes: { title: { before: 'a', after: 'b' } },
      }
      mockDiffVersions.mockResolvedValue(result)
      const req = mockReq({ params: { fromVersionId: 'v1', toVersionId: 'v2' } })
      const res = mockRes()

      await diff(req, res)

      expect(res.json).toHaveBeenCalledWith(result)
    })

    it('returns 404 when a version is missing', async () => {
      mockDiffVersions.mockResolvedValue(null)
      const req = mockReq({ params: { fromVersionId: 'v1', toVersionId: 'missing' } })
      const res = mockRes()

      await diff(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('restore', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ params: { versionId: 'v1' } })
      const res = mockRes({ locals: {} })

      await restore(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockGetVersionById).not.toHaveBeenCalled()
      expect(mockRestoreVersion).not.toHaveBeenCalled()
    })

    it('returns 404 (no existence leak) when restoring a version whose parent the caller does not own (P5RES-02)', async () => {
      mockGetVersionById.mockResolvedValue({
        id: 'v1',
        resourceType: 'doc',
        resourceId: 'd1',
        version: 2,
        snapshot: {},
      })
      const req = mockReq({ params: { versionId: 'v1' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await restore(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockRestoreVersion).not.toHaveBeenCalled()
    })

    it('restores a version for the parent-resource owner', async () => {
      mockGetVersionById.mockResolvedValue({
        id: 'v1',
        resourceType: 'doc',
        resourceId: 'd1',
        version: 2,
        snapshot: {},
      })
      mockRestoreVersion.mockResolvedValue({ id: 'v3', version: 3 })
      const req = mockReq({ params: { versionId: 'v1' } })
      const res = mockRes()

      await restore(req, res)

      expect(mockRestoreVersion).toHaveBeenCalledWith('v1', 'owner', null)
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('lets an admin restore any version', async () => {
      mockGetVersionById.mockResolvedValue({
        id: 'v1',
        resourceType: 'doc',
        resourceId: 'd1',
        version: 2,
        snapshot: {},
      })
      mockRestoreVersion.mockResolvedValue({ id: 'v3', version: 3 })
      const req = mockReq({ params: { versionId: 'v1' } })
      const res = mockRes({ locals: { session: { userId: 'admin' }, versionHistoryAdmin: true } })

      await restore(req, res)

      expect(mockRestoreVersion).toHaveBeenCalledWith('v1', 'admin', null)
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('returns 404 when the version does not exist', async () => {
      mockGetVersionById.mockResolvedValue(null)
      const req = mockReq({ params: { versionId: 'missing' } })
      const res = mockRes()

      await restore(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockRestoreVersion).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({
        params: { resourceType: 'doc', resourceId: 'd1' },
        body: { snapshot: { title: 'x' } },
      })
      const res = mockRes({ locals: {} })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockCreateVersion).not.toHaveBeenCalled()
    })

    it('returns 404 (no cross-tenant injection) for a resource the caller does not own (P5RES-02)', async () => {
      const req = mockReq({
        params: { resourceType: 'doc', resourceId: 'd1' },
        body: { snapshot: { title: 'x' } },
      })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockCreateVersion).not.toHaveBeenCalled()
    })

    it('captures a version for the owner', async () => {
      mockCreateVersion.mockResolvedValue({ id: 'v1', version: 1 })
      const req = mockReq({
        params: { resourceType: 'doc', resourceId: 'd1' },
        body: { snapshot: { title: 'x' } },
      })
      const res = mockRes()

      await create(req, res)

      expect(mockCreateVersion).toHaveBeenCalledWith(
        expect.objectContaining({ resourceType: 'doc', resourceId: 'd1', userId: 'owner' }),
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('ownership authorizer', () => {
    it('isVersionAuthorized fails closed when no resolver is registered', async () => {
      mockGetOwnershipResolver.mockReturnValue(undefined)
      const res = mockRes()

      expect(
        await isVersionAuthorized(res, { resourceType: 'doc', resourceId: 'd1', userId: 'u' }),
      ).toBe(false)
    })

    it('isVersionAuthorized defers to the registered resolver', async () => {
      const res = mockRes()

      expect(
        await isVersionAuthorized(res, { resourceType: 'doc', resourceId: 'd1', userId: 'owner' }),
      ).toBe(true)
      expect(
        await isVersionAuthorized(res, {
          resourceType: 'doc',
          resourceId: 'd1',
          userId: 'attacker',
        }),
      ).toBe(false)
    })

    it('isVersionAuthorized lets an admin bypass the resolver', async () => {
      const res = mockRes({ locals: { session: { userId: 'admin' }, versionHistoryAdmin: true } })

      expect(
        await isVersionAuthorized(res, {
          resourceType: 'doc',
          resourceId: 'd1',
          userId: 'admin',
        }),
      ).toBe(true)
      expect(mockGetOwnershipResolver).not.toHaveBeenCalled()
    })

    it('isVersionHistoryAdmin is false for a plain authenticated session', () => {
      expect(isVersionHistoryAdmin(mockRes())).toBe(false)
    })

    it('isVersionHistoryAdmin is false with no session (fail-closed)', () => {
      expect(isVersionHistoryAdmin(mockRes({ locals: {} }))).toBe(false)
    })

    it('isVersionHistoryAdmin honors isAdmin / role / roles / permissions claims', () => {
      expect(
        isVersionHistoryAdmin(mockRes({ locals: { session: { userId: 'a', isAdmin: true } } })),
      ).toBe(true)
      expect(
        isVersionHistoryAdmin(mockRes({ locals: { session: { userId: 'a', role: 'admin' } } })),
      ).toBe(true)
      expect(
        isVersionHistoryAdmin(mockRes({ locals: { session: { userId: 'a', roles: ['admin'] } } })),
      ).toBe(true)
      expect(
        isVersionHistoryAdmin(
          mockRes({ locals: { session: { userId: 'a', permissions: ['versionHistory:manage'] } } }),
        ),
      ).toBe(true)
    })

    it('versionHistoryAdmin middleware sets the flag only for admins, always calls next', () => {
      const next = vi.fn()

      const adminRes = mockRes({ locals: { session: { userId: 'a', isAdmin: true } } })
      versionHistoryAdmin()(mockReq(), adminRes, next)
      expect(adminRes.locals.versionHistoryAdmin).toBe(true)
      expect(next).toHaveBeenCalledWith()

      const userRes = mockRes()
      versionHistoryAdmin()(mockReq(), userRes, next)
      expect(userRes.locals.versionHistoryAdmin).toBeUndefined()
      expect(next).toHaveBeenCalledTimes(2)
    })
  })
})
