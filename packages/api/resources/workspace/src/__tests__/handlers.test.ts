const { mockCreate, mockFindOne, mockFindMany, mockCount, mockDeleteMany, mockUpdateById } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindOne: vi.fn(),
    mockFindMany: vi.fn(),
    mockCount: vi.fn(),
    mockDeleteMany: vi.fn(),
    mockUpdateById: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  count: mockCount,
  deleteMany: mockDeleteMany,
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

import { create } from '../handlers/create.js'
import { del } from '../handlers/del.js'
import { accept, invite } from '../handlers/invites.js'
import { list } from '../handlers/list.js'
import { listAll, remove, updateRole } from '../handlers/members.js'
import { read } from '../handlers/read.js'
import { update } from '../handlers/update.js'

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
    locals: { session: { userId: 'u1' } },
    ...overrides,
  }
  return res
}

describe('@molecule/api-resource-workspace handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('returns 401 without a session', async () => {
      const req = mockReq({ body: { name: 'Acme' } })
      const res = mockRes({ locals: {} })
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 with invalid body', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 201 with workspace on success', async () => {
      mockCreate
        .mockResolvedValueOnce({ data: { id: 'w1', ownerId: 'u1', name: 'Acme', slug: 'acme' } })
        .mockResolvedValueOnce({ data: { workspaceId: 'w1', userId: 'u1', role: 'owner' } })

      const req = mockReq({ body: { name: 'Acme' } })
      const res = mockRes()
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('list', () => {
    it('returns 401 without a session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })
      await list(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns paginated workspaces', async () => {
      mockFindMany
        .mockResolvedValueOnce([{ workspaceId: 'w1' }]) // memberships
        .mockResolvedValueOnce([{ id: 'w1' }]) // workspaces
      mockCount.mockResolvedValueOnce(1)

      const req = mockReq({ query: { limit: '5' } })
      const res = mockRes()
      await list(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: [{ id: 'w1' }],
        total: 1,
        limit: 5,
        offset: 0,
      })
    })
  })

  describe('read', () => {
    it('returns 403 when caller is not a member', async () => {
      mockFindOne.mockResolvedValueOnce(null) // assertMember -> no membership

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns the workspace when caller is a member', async () => {
      mockFindOne
        .mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'member' })
        .mockResolvedValueOnce({ id: 'w1', deletedAt: null })

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await read(req, res)

      expect(res.json).toHaveBeenCalledWith({ id: 'w1', deletedAt: null })
    })

    it('returns 404 when workspace is soft-deleted', async () => {
      mockFindOne
        .mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'member' })
        .mockResolvedValueOnce({ id: 'w1', deletedAt: new Date().toISOString() })

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('update', () => {
    it('returns 403 when caller is only a member', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'member' })

      const req = mockReq({ params: { id: 'w1' }, body: { name: 'Renamed' } })
      const res = mockRes()
      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('updates when caller is admin', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'admin' })
      mockUpdateById.mockResolvedValueOnce({ data: { id: 'w1', name: 'Renamed' } })

      const req = mockReq({ params: { id: 'w1' }, body: { name: 'Renamed' } })
      const res = mockRes()
      await update(req, res)

      expect(res.json).toHaveBeenCalledWith({ id: 'w1', name: 'Renamed' })
    })
  })

  describe('del', () => {
    it('returns 403 when caller is admin (not owner)', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'admin' })

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('soft-deletes when caller is owner', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'owner' })
      mockUpdateById.mockResolvedValueOnce({ data: {} })
      mockDeleteMany.mockResolvedValue({ affected: 0 })

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
    })
  })

  describe('invite', () => {
    it('returns 403 when caller is only a member (role escalation guard)', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'member' })

      const req = mockReq({ params: { id: 'w1' }, body: { email: 'a@b.com', role: 'admin' } })
      const res = mockRes()
      await invite(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns 400 with invalid email', async () => {
      const req = mockReq({ params: { id: 'w1' }, body: { email: 'not-an-email' } })
      const res = mockRes()
      await invite(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('creates an invite when caller is admin', async () => {
      mockFindOne
        .mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'admin' })
        .mockResolvedValueOnce(null) // no existing pending invite
      mockCreate.mockResolvedValueOnce({
        data: { id: 'i1', workspaceId: 'w1', email: 'a@b.com', role: 'member', token: 'tok' },
      })

      const req = mockReq({ params: { id: 'w1' }, body: { email: 'a@b.com' } })
      const res = mockRes()
      await invite(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('accept', () => {
    it('returns 401 without a session', async () => {
      const req = mockReq({ body: { token: 'tok' } })
      const res = mockRes({ locals: {} })
      await accept(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 for missing token', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()
      await accept(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 for invalid/expired invite', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      const req = mockReq({ body: { token: 'tok' } })
      const res = mockRes()
      await accept(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('listAll members', () => {
    it('returns 403 for non-member', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await listAll(req, res)
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('returns members for a member', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'member' })
      mockFindMany.mockResolvedValueOnce([{ userId: 'u1', role: 'member' }])

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await listAll(req, res)

      expect(res.json).toHaveBeenCalledWith({ data: [{ userId: 'u1', role: 'member' }] })
    })
  })

  describe('updateRole', () => {
    it('returns 409 on last-owner demotion attempt', async () => {
      // assertMember admin check
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'owner' })
      // service.updateMemberRole — looks up target member
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'owner' })
      // service queries owners count
      mockFindMany.mockResolvedValueOnce([{ userId: 'u1', role: 'owner' }])

      const req = mockReq({ params: { id: 'w1', userId: 'u1' }, body: { role: 'member' } })
      const res = mockRes()
      await updateRole(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })
  })

  describe('remove', () => {
    it('lets a member remove themselves', async () => {
      // assertMember (self -> minRole member)
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'member' })
      // service.removeMember -> getMembership
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'member' })
      mockDeleteMany.mockResolvedValueOnce({ affected: 1 })

      const req = mockReq({ params: { id: 'w1', userId: 'u1' } })
      const res = mockRes()
      await remove(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
    })

    it('refuses non-admin removing someone else', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'member' })

      const req = mockReq({ params: { id: 'w1', userId: 'u2' } })
      const res = mockRes()
      await remove(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })
  })
})
