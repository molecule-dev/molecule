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

import { setShareAdminAuthorizer } from '../authorizers/index.js'
import { create } from '../handlers/create.js'
import { createLink } from '../handlers/createLink.js'
import { del } from '../handlers/del.js'
import { list } from '../handlers/list.js'
import { listLinks } from '../handlers/listLinks.js'
import { read } from '../handlers/read.js'
import { resolveLink } from '../handlers/resolveLink.js'
import { revokeLink } from '../handlers/revokeLink.js'
import { update } from '../handlers/update.js'
import { requestHandlerMap } from '../requestHandlerMap.js'
import { routes } from '../routes.js'

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

const validGrantBody = {
  resourceType: 'doc',
  resourceId: 'd1',
  principalType: 'user',
  principalId: 'u2',
  role: 'editor',
}

describe('@molecule/api-resource-share — handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the module-level ownership authorizer to its secure default (DENY)
    // before every test. Tests that exercise the legitimate path register one.
    setShareAdminAuthorizer(null)
  })

  describe('create', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ body: validGrantBody })
      const res = mockRes({ locals: {} })
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 on bad input', async () => {
      const req = mockReq({ body: { resourceType: 'doc' } })
      const res = mockRes()
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('rejects unknown role', async () => {
      const req = mockReq({ body: { ...validGrantBody, role: 'admin' } })
      const res = mockRes()
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('rejects unknown principalType', async () => {
      const req = mockReq({ body: { ...validGrantBody, principalType: 'organization' } })
      const res = mockRes()
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 403 when no ownership authorizer is registered (unauthorized grant)', async () => {
      // Default-DENY: this is the P3J-1 attack — an authenticated user posting a
      // grant for a resource they do not own. Without a registered authorizer it
      // MUST be refused, never reaching the DB.
      const req = mockReq({ body: { ...validGrantBody, role: 'owner', principalId: 'user-1' } })
      const res = mockRes()
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('returns 403 when the ownership authorizer denies', async () => {
      setShareAdminAuthorizer(() => false)
      const req = mockReq({ body: validGrantBody })
      const res = mockRes()
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('grants a share and returns 201 when the authorizer allows (owner flow)', async () => {
      const seen: Array<[string, string, string]> = []
      setShareAdminAuthorizer(async (resourceType, resourceId, userId) => {
        seen.push([resourceType, resourceId, userId])
        return true
      })
      mockFindOne.mockResolvedValue(null)
      const created = { id: 's1', ...validGrantBody, grantedBy: 'user-1' }
      mockCreate.mockResolvedValue({ data: created, affected: 1 })

      const req = mockReq({ body: validGrantBody })
      const res = mockRes()
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(created)
      // The authorizer is asked about the target resource, with the caller id.
      expect(seen).toEqual([['doc', 'd1', 'user-1']])
    })
  })

  describe('list', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes({ locals: {} })
      await list(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when params missing', async () => {
      const req = mockReq()
      const res = mockRes()
      await list(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 403 when no ownership authorizer is registered (M6-2 ACL disclosure)', async () => {
      // Default-DENY: an authenticated user must NOT be able to enumerate the
      // full ACL (every principal id + role) of an arbitrary resource. Without a
      // registered authorizer the listing MUST be refused, never hitting the DB.
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes()
      await list(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockFindMany).not.toHaveBeenCalled()
      expect(mockCount).not.toHaveBeenCalled()
    })

    it('returns 403 when the caller does not administer the resource (M6-2)', async () => {
      const seen: Array<[string, string, string]> = []
      setShareAdminAuthorizer((resourceType, resourceId, userId) => {
        seen.push([resourceType, resourceId, userId])
        return false
      })
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes()
      await list(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      // Authorized against the requested resource, with the caller id.
      expect(seen).toEqual([['doc', 'd1', 'user-1']])
      expect(mockFindMany).not.toHaveBeenCalled()
    })

    it('returns paginated list when the authorizer allows (manager flow)', async () => {
      setShareAdminAuthorizer(() => true)
      mockFindMany.mockResolvedValue([{ id: 's1' }])
      mockCount.mockResolvedValue(1)
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes()
      await list(req, res)
      expect(res.json).toHaveBeenCalledWith({
        data: [{ id: 's1' }],
        total: 1,
        limit: 50,
        offset: 0,
      })
    })

    it('honours principalType filter', async () => {
      setShareAdminAuthorizer(() => true)
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      const req = mockReq({
        params: { resourceType: 'doc', resourceId: 'd1' },
        query: { principalType: 'team' },
      })
      const res = mockRes()
      await list(req, res)
      const where = mockFindMany.mock.calls[0][1].where
      expect(where).toEqual(
        expect.arrayContaining([{ field: 'principalType', operator: '=', value: 'team' }]),
      )
    })

    it('ignores invalid principalType filter values', async () => {
      setShareAdminAuthorizer(() => true)
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      const req = mockReq({
        params: { resourceType: 'doc', resourceId: 'd1' },
        query: { principalType: 'evil' },
      })
      const res = mockRes()
      await list(req, res)
      const where = mockFindMany.mock.calls[0][1].where
      expect(where).not.toEqual(
        expect.arrayContaining([{ field: 'principalType', operator: '=', value: 'evil' }]),
      )
    })
  })

  describe('read (effective role)', () => {
    it('returns 400 when params missing', async () => {
      const req = mockReq()
      const res = mockRes()
      await read(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns null role when no grants', async () => {
      mockFindOne.mockResolvedValue(null)
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes()
      await read(req, res)
      expect(res.json).toHaveBeenCalledWith({ role: null })
    })

    it('returns role even for anonymous when public grant exists', async () => {
      mockFindOne.mockResolvedValueOnce({ role: 'viewer', expiresAt: null })
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes({ locals: {} })
      await read(req, res)
      expect(res.json).toHaveBeenCalledWith({ role: 'viewer' })
    })
  })

  describe('update', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ params: { id: 's1' }, body: { role: 'owner' } })
      const res = mockRes({ locals: {} })
      await update(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when id missing', async () => {
      const req = mockReq({ body: { role: 'owner' } })
      const res = mockRes()
      await update(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when share not found', async () => {
      setShareAdminAuthorizer(() => true)
      mockFindOne.mockResolvedValue(null)
      const req = mockReq({ params: { id: 's-missing' }, body: { role: 'owner' } })
      const res = mockRes()
      await update(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('returns 403 when no ownership authorizer is registered', async () => {
      mockFindOne.mockResolvedValue({ id: 's1', resourceType: 'doc', resourceId: 'd1' })
      const req = mockReq({ params: { id: 's1' }, body: { role: 'owner' } })
      const res = mockRes()
      await update(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it("returns 403 when the caller does not administer the share's resource", async () => {
      const seen: Array<[string, string, string]> = []
      setShareAdminAuthorizer((resourceType, resourceId, userId) => {
        seen.push([resourceType, resourceId, userId])
        return false
      })
      mockFindOne.mockResolvedValue({ id: 's1', resourceType: 'doc', resourceId: 'd1' })
      const req = mockReq({ params: { id: 's1' }, body: { role: 'owner' } })
      const res = mockRes()
      await update(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      // Authorized against the share's OWN resource, not anything from the body.
      expect(seen).toEqual([['doc', 'd1', 'user-1']])
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('updates a share when the authorizer allows', async () => {
      setShareAdminAuthorizer(() => true)
      mockFindOne.mockResolvedValue({ id: 's1', resourceType: 'doc', resourceId: 'd1' })
      mockUpdateById.mockResolvedValue({ data: { id: 's1', role: 'owner' }, affected: 1 })
      const req = mockReq({ params: { id: 's1' }, body: { role: 'owner' } })
      const res = mockRes()
      await update(req, res)
      expect(res.json).toHaveBeenCalledWith({ id: 's1', role: 'owner' })
    })

    it('rejects invalid role', async () => {
      const req = mockReq({ params: { id: 's1' }, body: { role: 'admin' } })
      const res = mockRes()
      await update(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('del', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ params: { id: 's1' } })
      const res = mockRes({ locals: {} })
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when id missing', async () => {
      const req = mockReq()
      const res = mockRes()
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when share not found', async () => {
      setShareAdminAuthorizer(() => true)
      mockFindOne.mockResolvedValue(null)
      const req = mockReq({ params: { id: 's-missing' } })
      const res = mockRes()
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockDeleteMany).not.toHaveBeenCalled()
    })

    it('returns 403 when no ownership authorizer is registered (unauthorized revoke)', async () => {
      mockFindOne.mockResolvedValue({ id: 's1', resourceType: 'doc', resourceId: 'd1' })
      const req = mockReq({ params: { id: 's1' } })
      const res = mockRes()
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockDeleteMany).not.toHaveBeenCalled()
    })

    it("returns 403 when the caller does not administer the share's resource", async () => {
      const seen: Array<[string, string, string]> = []
      setShareAdminAuthorizer((resourceType, resourceId, userId) => {
        seen.push([resourceType, resourceId, userId])
        return false
      })
      mockFindOne.mockResolvedValue({ id: 's1', resourceType: 'doc', resourceId: 'd1' })
      const req = mockReq({ params: { id: 's1' } })
      const res = mockRes()
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(seen).toEqual([['doc', 'd1', 'user-1']])
      expect(mockDeleteMany).not.toHaveBeenCalled()
    })

    it('revokes and returns 204 when the authorizer allows', async () => {
      setShareAdminAuthorizer(() => true)
      mockFindOne.mockResolvedValue({ id: 's1', resourceType: 'doc', resourceId: 'd1' })
      mockDeleteMany.mockResolvedValue({ data: null, affected: 1 })
      const req = mockReq({ params: { id: 's1' } })
      const res = mockRes()
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })

  describe('createLink', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ body: { resourceType: 'doc', resourceId: 'd1', role: 'viewer' } })
      const res = mockRes({ locals: {} })
      await createLink(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 on bad input', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()
      await createLink(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 403 when no ownership authorizer is registered (unauthorized mint)', async () => {
      // Default-DENY: minting a public link is the same privilege as a direct
      // grant. An authenticated user posting a link for a resource they do not
      // administer MUST be refused, never reaching the DB.
      const req = mockReq({ body: { resourceType: 'doc', resourceId: 'd1', role: 'viewer' } })
      const res = mockRes()
      await createLink(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('returns 403 when the caller does not administer the resource', async () => {
      const seen: Array<[string, string, string]> = []
      setShareAdminAuthorizer((resourceType, resourceId, userId) => {
        seen.push([resourceType, resourceId, userId])
        return false
      })
      const req = mockReq({ body: { resourceType: 'doc', resourceId: 'd1', role: 'viewer' } })
      const res = mockRes()
      await createLink(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      // Authorized against the resource in the (validated) body, with the caller id.
      expect(seen).toEqual([['doc', 'd1', 'user-1']])
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('creates a link and returns 201 with slug when the authorizer allows', async () => {
      setShareAdminAuthorizer(() => true)
      const created = { id: 'l1', slug: 'abc', role: 'viewer' }
      mockCreate.mockResolvedValue({ data: created, affected: 1 })
      const req = mockReq({
        body: { resourceType: 'doc', resourceId: 'd1', role: 'viewer' },
      })
      const res = mockRes()
      await createLink(req, res)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(created)
    })
  })

  describe('listLinks', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes({ locals: {} })
      await listLinks(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when params missing', async () => {
      const req = mockReq()
      const res = mockRes()
      await listLinks(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 403 when no ownership authorizer is registered (M6-2 slug disclosure)', async () => {
      // Default-DENY: listing share-link records discloses their slugs (each a
      // bearer credential). An authenticated user must not enumerate links on an
      // arbitrary resource without administering it.
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes()
      await listLinks(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockFindMany).not.toHaveBeenCalled()
    })

    it('returns 403 when the caller does not administer the resource (M6-2)', async () => {
      const seen: Array<[string, string, string]> = []
      setShareAdminAuthorizer((resourceType, resourceId, userId) => {
        seen.push([resourceType, resourceId, userId])
        return false
      })
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes()
      await listLinks(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(seen).toEqual([['doc', 'd1', 'user-1']])
      expect(mockFindMany).not.toHaveBeenCalled()
    })

    it('returns links wrapped under data when the authorizer allows', async () => {
      setShareAdminAuthorizer(() => true)
      mockFindMany.mockResolvedValue([{ id: 'l1' }])
      const req = mockReq({ params: { resourceType: 'doc', resourceId: 'd1' } })
      const res = mockRes()
      await listLinks(req, res)
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'l1' }] })
    })
  })

  describe('revokeLink', () => {
    it('returns 401 with no session', async () => {
      const req = mockReq({ params: { id: 'l1' } })
      const res = mockRes({ locals: {} })
      await revokeLink(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when id missing', async () => {
      const req = mockReq()
      const res = mockRes()
      await revokeLink(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 for unknown id', async () => {
      mockFindOne.mockResolvedValue(null)
      const req = mockReq({ params: { id: 'l-missing' } })
      const res = mockRes()
      await revokeLink(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 403 when no ownership authorizer is registered (unauthorized revoke)', async () => {
      // Default-DENY: the link is resolved to learn its resource, then the
      // caller must administer THAT resource. Without a registered authorizer
      // the revoke MUST be refused, never touching the DB write.
      mockFindOne.mockResolvedValue({ id: 'l1', resourceType: 'doc', resourceId: 'd1' })
      const req = mockReq({ params: { id: 'l1' } })
      const res = mockRes()
      await revokeLink(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it("returns 403 when the caller does not administer the link's resource", async () => {
      const seen: Array<[string, string, string]> = []
      setShareAdminAuthorizer((resourceType, resourceId, userId) => {
        seen.push([resourceType, resourceId, userId])
        return false
      })
      mockFindOne.mockResolvedValue({ id: 'l1', resourceType: 'doc', resourceId: 'd1' })
      const req = mockReq({ params: { id: 'l1' } })
      const res = mockRes()
      await revokeLink(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
      // Authorized against the link's OWN resource, not anything from the body.
      expect(seen).toEqual([['doc', 'd1', 'user-1']])
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('revokes a link when the authorizer allows', async () => {
      setShareAdminAuthorizer(() => true)
      mockFindOne.mockResolvedValue({
        id: 'l1',
        resourceType: 'doc',
        resourceId: 'd1',
        revokedAt: null,
      })
      mockUpdateById.mockResolvedValue({
        data: { id: 'l1', revokedAt: '2026-05-01T00:00:00.000Z' },
        affected: 1,
      })
      const req = mockReq({ params: { id: 'l1' } })
      const res = mockRes()
      await revokeLink(req, res)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'l1', revokedAt: expect.any(String) }),
      )
    })
  })

  describe('resolveLink (public)', () => {
    it('does NOT require a session', async () => {
      mockFindOne.mockResolvedValue({ id: 'l1', revokedAt: null, expiresAt: null })
      const req = mockReq({ params: { slug: 'abc' } })
      const res = mockRes({ locals: {} })
      await resolveLink(req, res)
      expect(res.status).not.toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ id: 'l1', revokedAt: null, expiresAt: null })
    })

    it('returns 400 when slug missing', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })
      await resolveLink(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when slug unknown / revoked / expired', async () => {
      mockFindOne.mockResolvedValue(null)
      const req = mockReq({ params: { slug: 'xxx' } })
      const res = mockRes({ locals: {} })
      await resolveLink(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // The auto-mount surface is a security boundary: the injector mounts EXACTLY
  // the routes in `routes`, wiring each to its `requestHandlerMap` entry. The
  // five mutating handlers must never appear in either — they carry no inherent
  // ownership knowledge and are mounted by consumers behind their own gate.
  describe('auto-mount surface (routes + requestHandlerMap)', () => {
    const AUTO_MOUNT_HANDLERS = ['list', 'read', 'listLinks', 'resolveLink']
    const MUTATING_HANDLERS = ['create', 'update', 'del', 'createLink', 'revokeLink']

    it('requestHandlerMap exposes EXACTLY the four documented read/resolve handlers', () => {
      expect(Object.keys(requestHandlerMap).sort()).toEqual([...AUTO_MOUNT_HANDLERS].sort())
    })

    it('requestHandlerMap contains none of the five mutating handlers', () => {
      for (const name of MUTATING_HANDLERS) {
        expect(requestHandlerMap).not.toHaveProperty(name)
      }
    })

    it('routes reference exactly the four auto-mount handlers, each backed by the map', () => {
      const routeHandlers = routes.map((r) => r.handler)
      expect([...routeHandlers].sort()).toEqual([...AUTO_MOUNT_HANDLERS].sort())
      for (const r of routes) {
        expect(Object.keys(requestHandlerMap)).toContain(r.handler)
      }
    })

    it('no route mounts a mutating handler', () => {
      const routeHandlers = new Set(routes.map((r) => r.handler))
      for (const name of MUTATING_HANDLERS) {
        expect(routeHandlers.has(name)).toBe(false)
      }
    })

    it('only resolveLink is public; every other route requires authentication', () => {
      for (const r of routes) {
        const middlewares = (r as { middlewares?: readonly string[] }).middlewares ?? []
        if (r.handler === 'resolveLink') {
          // The slug is the credential — no `authenticate` gate.
          expect(middlewares).not.toContain('authenticate')
        } else {
          expect(middlewares).toContain('authenticate')
        }
      }
    })
  })
})
