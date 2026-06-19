const {
  mockListTrashedItems,
  mockCountTrashedItems,
  mockGetTrashedItemById,
  mockRestoreFromTrash,
  mockPurgeItem,
  mockGetRestoreCallback,
} = vi.hoisted(() => ({
  mockListTrashedItems: vi.fn(),
  mockCountTrashedItems: vi.fn(),
  mockGetTrashedItemById: vi.fn(),
  mockRestoreFromTrash: vi.fn(),
  mockPurgeItem: vi.fn(),
  mockGetRestoreCallback: vi.fn(),
}))

vi.mock('../service.js', () => ({
  listTrashedItems: mockListTrashedItems,
  countTrashedItems: mockCountTrashedItems,
  getTrashedItemById: mockGetTrashedItemById,
  restoreFromTrash: mockRestoreFromTrash,
  purgeItem: mockPurgeItem,
}))

vi.mock('../registry.js', () => ({
  getRestoreCallback: mockGetRestoreCallback,
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

import { isTrashAdmin, trashAdmin } from '../authorizers/trashAdmin.js'
import { trashCount } from '../handlers/count.js'
import { list } from '../handlers/list.js'
import { purge } from '../handlers/purge.js'
import { read } from '../handlers/read.js'
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
    locals: { session: { userId: 'user-1' } },
    ...overrides,
  }
  return res
}

describe('@molecule/api-trash handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns 401 when there is no authenticated session (P3J-2)', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockListTrashedItems).not.toHaveBeenCalled()
    })

    it('scopes to the session userId and IGNORES a client-supplied userId (P3J-2)', async () => {
      mockListTrashedItems.mockResolvedValue({ data: [], total: 0, limit: 20, offset: 0 })

      // Attacker tries to dump another tenant's trash by passing ?userId=victim.
      const req = mockReq({ query: { userId: 'victim' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await list(req, res)

      // The query userId is dropped; only the session's own userId is queried.
      expect(mockListTrashedItems).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'attacker' }),
      )
    })

    it('lists the caller own rows by default', async () => {
      const result = { data: [{ id: 't1', userId: 'user-1' }], total: 1, limit: 20, offset: 0 }
      mockListTrashedItems.mockResolvedValue(result)

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(mockListTrashedItems).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      )
      expect(res.json).toHaveBeenCalledWith(result)
    })

    it('lets an admin (opt-in widening) filter by any userId', async () => {
      mockListTrashedItems.mockResolvedValue({ data: [], total: 0, limit: 20, offset: 0 })

      const req = mockReq({ query: { userId: 'someone-else' } })
      const res = mockRes({ locals: { session: { userId: 'admin-1' }, trashAdmin: true } })

      await list(req, res)

      expect(mockListTrashedItems).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'someone-else' }),
      )
    })

    it('lets an admin span all users when no userId is given', async () => {
      mockListTrashedItems.mockResolvedValue({ data: [], total: 0, limit: 20, offset: 0 })

      const req = mockReq()
      const res = mockRes({ locals: { session: { userId: 'admin-1' }, trashAdmin: true } })

      await list(req, res)

      expect(mockListTrashedItems).toHaveBeenCalledWith(
        expect.objectContaining({ userId: undefined }),
      )
    })

    it('returns 500 on a service error', async () => {
      mockListTrashedItems.mockRejectedValue(new Error('DB down'))

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('trashCount', () => {
    it('returns 401 when there is no authenticated session (P3J-2)', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })

      await trashCount(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockCountTrashedItems).not.toHaveBeenCalled()
    })

    it('scopes to the session userId and IGNORES a client-supplied userId (P3J-2)', async () => {
      mockCountTrashedItems.mockResolvedValue(0)

      const req = mockReq({ query: { userId: 'victim' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await trashCount(req, res)

      expect(mockCountTrashedItems).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'attacker' }),
      )
      expect(res.json).toHaveBeenCalledWith({ total: 0 })
    })

    it('lets an admin count any userId', async () => {
      mockCountTrashedItems.mockResolvedValue(3)

      const req = mockReq({ query: { userId: 'someone-else' } })
      const res = mockRes({ locals: { session: { userId: 'admin-1' }, trashAdmin: true } })

      await trashCount(req, res)

      expect(mockCountTrashedItems).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'someone-else' }),
      )
    })
  })

  describe('read', () => {
    it('returns 401 when there is no authenticated session (P3J-2)', async () => {
      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes({ locals: {} })

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockGetTrashedItemById).not.toHaveBeenCalled()
    })

    it('returns 404 (no existence leak) for a row owned by another user (P3J-2)', async () => {
      mockGetTrashedItemById.mockResolvedValue({ id: 't1', userId: 'victim', snapshot: {} })

      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      // The victim's snapshot is never returned.
      expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({ userId: 'victim' }))
    })

    it('returns the row to its owner', async () => {
      const item = { id: 't1', userId: 'user-1', snapshot: { title: 'x' } }
      mockGetTrashedItemById.mockResolvedValue(item)

      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(item)
    })

    it('lets an admin read any user row', async () => {
      const item = { id: 't1', userId: 'victim', snapshot: {} }
      mockGetTrashedItemById.mockResolvedValue(item)

      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes({ locals: { session: { userId: 'admin-1' }, trashAdmin: true } })

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(item)
    })

    it('returns 404 when the row does not exist', async () => {
      mockGetTrashedItemById.mockResolvedValue(null)

      const req = mockReq({ params: { trashId: 'missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('restore', () => {
    it('returns 401 when there is no authenticated session', async () => {
      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes({ locals: {} })

      await restore(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockGetTrashedItemById).not.toHaveBeenCalled()
    })

    it('returns 404 (no existence leak) when restoring another user row (P3J-3)', async () => {
      mockGetTrashedItemById.mockResolvedValue({
        id: 't1',
        userId: 'victim',
        resourceType: 'document',
        restoredAt: null,
        purgedAt: null,
        snapshot: {},
      })

      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await restore(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockRestoreFromTrash).not.toHaveBeenCalled()
    })

    it('restores the owner own row', async () => {
      mockGetTrashedItemById.mockResolvedValue({
        id: 't1',
        userId: 'user-1',
        resourceType: 'document',
        restoredAt: null,
        purgedAt: null,
        snapshot: {},
      })
      mockGetRestoreCallback.mockReturnValue(vi.fn())
      mockRestoreFromTrash.mockResolvedValue({
        trashedItem: { id: 't1', restoredAt: '2026-06-19T00:00:00.000Z' },
        callbackSucceeded: true,
      })

      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes()

      await restore(req, res)

      expect(mockRestoreFromTrash).toHaveBeenCalledWith('t1', 'user-1', expect.any(Function))
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('lets an admin restore any user row', async () => {
      mockGetTrashedItemById.mockResolvedValue({
        id: 't1',
        userId: 'victim',
        resourceType: 'document',
        restoredAt: null,
        purgedAt: null,
        snapshot: {},
      })
      mockGetRestoreCallback.mockReturnValue(vi.fn())
      mockRestoreFromTrash.mockResolvedValue({
        trashedItem: { id: 't1' },
        callbackSucceeded: true,
      })

      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes({ locals: { session: { userId: 'admin-1' }, trashAdmin: true } })

      await restore(req, res)

      expect(mockRestoreFromTrash).toHaveBeenCalledWith('t1', 'admin-1', expect.any(Function))
      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('purge', () => {
    it('returns 401 when there is no authenticated session', async () => {
      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes({ locals: {} })

      await purge(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockGetTrashedItemById).not.toHaveBeenCalled()
      expect(mockPurgeItem).not.toHaveBeenCalled()
    })

    it('returns 404 (no existence leak) when purging another user row (P3J-3)', async () => {
      mockGetTrashedItemById.mockResolvedValue({ id: 't1', userId: 'victim', purgedAt: null })

      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await purge(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockPurgeItem).not.toHaveBeenCalled()
    })

    it('purges the owner own row', async () => {
      mockGetTrashedItemById.mockResolvedValue({ id: 't1', userId: 'user-1', purgedAt: null })
      mockPurgeItem.mockResolvedValue({ id: 't1', purgedAt: '2026-06-19T00:00:00.000Z' })

      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes()

      await purge(req, res)

      expect(mockPurgeItem).toHaveBeenCalledWith('t1')
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it('lets an admin purge any user row', async () => {
      mockGetTrashedItemById.mockResolvedValue({ id: 't1', userId: 'victim', purgedAt: null })
      mockPurgeItem.mockResolvedValue({ id: 't1', purgedAt: '2026-06-19T00:00:00.000Z' })

      const req = mockReq({ params: { trashId: 't1' } })
      const res = mockRes({ locals: { session: { userId: 'admin-1' }, trashAdmin: true } })

      await purge(req, res)

      expect(mockPurgeItem).toHaveBeenCalledWith('t1')
      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('trashAdmin authorizer', () => {
    it('isTrashAdmin is false for a plain authenticated session', () => {
      const res = mockRes()
      expect(isTrashAdmin(res)).toBe(false)
    })

    it('isTrashAdmin is false with no session (fail-closed)', () => {
      const res = mockRes({ locals: {} })
      expect(isTrashAdmin(res)).toBe(false)
    })

    it('isTrashAdmin honors isAdmin / role / roles / permissions claims', () => {
      expect(isTrashAdmin(mockRes({ locals: { session: { userId: 'a', isAdmin: true } } }))).toBe(
        true,
      )
      expect(isTrashAdmin(mockRes({ locals: { session: { userId: 'a', role: 'admin' } } }))).toBe(
        true,
      )
      expect(
        isTrashAdmin(mockRes({ locals: { session: { userId: 'a', roles: ['admin'] } } })),
      ).toBe(true)
      expect(
        isTrashAdmin(
          mockRes({ locals: { session: { userId: 'a', permissions: ['trash:manage'] } } }),
        ),
      ).toBe(true)
    })

    it('trashAdmin middleware sets res.locals.trashAdmin only for admins, always calls next', () => {
      const next = vi.fn()

      const adminRes = mockRes({ locals: { session: { userId: 'a', isAdmin: true } } })
      trashAdmin()(mockReq(), adminRes, next)
      expect(adminRes.locals.trashAdmin).toBe(true)
      expect(next).toHaveBeenCalledWith()

      const userRes = mockRes()
      trashAdmin()(mockReq(), userRes, next)
      expect(userRes.locals.trashAdmin).toBeUndefined()
      expect(next).toHaveBeenCalledTimes(2)
    })
  })
})
