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

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  acceptInvite,
  assertMember,
  createWorkspace,
  generateInviteToken,
  getPendingInvite,
  inviteMember,
  removeMember,
  roleAtLeast,
  slugify,
  updateMemberRole,
} from '../service.js'

describe('@molecule/api-resource-workspace service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('slugify', () => {
    it('lowercases, trims, replaces non-alphanumeric runs with single hyphens', () => {
      expect(slugify('My Cool Workspace!')).toBe('my-cool-workspace')
      expect(slugify('  Hello — World  ')).toBe('hello-world')
      expect(slugify('A_B_C')).toBe('a-b-c')
    })

    it('truncates output to 255 chars', () => {
      const long = 'a'.repeat(400)
      expect(slugify(long).length).toBe(255)
    })
  })

  describe('roleAtLeast', () => {
    it('respects member < admin < owner ordering', () => {
      expect(roleAtLeast('owner', 'admin')).toBe(true)
      expect(roleAtLeast('admin', 'admin')).toBe(true)
      expect(roleAtLeast('member', 'admin')).toBe(false)
      expect(roleAtLeast('admin', 'owner')).toBe(false)
      expect(roleAtLeast('owner', 'owner')).toBe(true)
      expect(roleAtLeast('member', 'member')).toBe(true)
    })
  })

  describe('createWorkspace', () => {
    it('creates the workspace and an owner membership', async () => {
      const workspace = {
        id: 'w1',
        ownerId: 'u1',
        name: 'Acme',
        slug: 'acme',
      }
      mockCreate
        .mockResolvedValueOnce({ data: workspace })
        .mockResolvedValueOnce({ data: { workspaceId: 'w1', userId: 'u1', role: 'owner' } })

      const result = await createWorkspace('u1', { name: 'Acme' })

      expect(result).toEqual(workspace)
      expect(mockCreate).toHaveBeenNthCalledWith(1, 'workspaces', {
        ownerId: 'u1',
        name: 'Acme',
        slug: 'acme',
        deletedAt: null,
      })
      expect(mockCreate).toHaveBeenNthCalledWith(2, 'workspace_members', {
        workspaceId: 'w1',
        userId: 'u1',
        role: 'owner',
      })
    })

    it('uses the supplied slug when given', async () => {
      mockCreate
        .mockResolvedValueOnce({ data: { id: 'w1', slug: 'override' } })
        .mockResolvedValueOnce({ data: {} })
      await createWorkspace('u1', { name: 'Acme', slug: 'override' })
      expect(mockCreate.mock.calls[0][1]).toMatchObject({ slug: 'override' })
    })
  })

  describe('assertMember', () => {
    it('throws workspace.error.notAMember when no membership exists', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      await expect(assertMember('w1', 'u1')).rejects.toThrow('workspace.error.notAMember')
    })

    it('throws workspace.error.insufficientRole when role too low', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'member' })
      await expect(assertMember('w1', 'u1', 'admin')).rejects.toThrow(
        'workspace.error.insufficientRole',
      )
    })

    it('passes when role meets minRole', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'owner' })
      await expect(assertMember('w1', 'u1', 'admin')).resolves.toBeUndefined()
    })

    it('defaults minRole to member', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'member' })
      await expect(assertMember('w1', 'u1')).resolves.toBeUndefined()
    })
  })

  describe('inviteMember', () => {
    it('returns existing pending invite when one is still valid', async () => {
      const existing = {
        id: 'i1',
        workspaceId: 'w1',
        email: 'a@b.com',
        role: 'member',
        token: 'tok',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        acceptedAt: null,
      }
      mockFindOne.mockResolvedValueOnce(existing)

      const result = await inviteMember('w1', 'a@b.com')
      expect(result).toEqual(existing)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('creates a new invite when none exists', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      const created = {
        id: 'i2',
        workspaceId: 'w1',
        email: 'a@b.com',
        role: 'admin',
        token: 'newtok',
        expiresAt: 'soon',
        acceptedAt: null,
      }
      mockCreate.mockResolvedValueOnce({ data: created })

      const result = await inviteMember('w1', 'a@b.com', 'admin')
      expect(result).toEqual(created)
      expect(mockCreate).toHaveBeenCalledWith(
        'workspace_invites',
        expect.objectContaining({
          workspaceId: 'w1',
          email: 'a@b.com',
          role: 'admin',
          acceptedAt: null,
        }),
      )
    })

    it('issues a new invite when the existing one is expired', async () => {
      mockFindOne.mockResolvedValueOnce({
        id: 'i1',
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        acceptedAt: null,
      })
      mockCreate.mockResolvedValueOnce({ data: { id: 'i2' } })

      await inviteMember('w1', 'a@b.com')
      expect(mockCreate).toHaveBeenCalled()
    })
  })

  describe('generateInviteToken', () => {
    it('produces a 64-char hex string', () => {
      const tok = generateInviteToken()
      expect(tok).toMatch(/^[0-9a-f]{64}$/)
    })

    it('produces unique tokens', () => {
      const a = generateInviteToken()
      const b = generateInviteToken()
      expect(a).not.toBe(b)
    })
  })

  describe('getPendingInvite', () => {
    it('returns null for missing invite', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      expect(await getPendingInvite('tok')).toBeNull()
    })

    it('returns null for accepted invite', async () => {
      mockFindOne.mockResolvedValueOnce({
        token: 'tok',
        acceptedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })
      expect(await getPendingInvite('tok')).toBeNull()
    })

    it('returns null for expired invite', async () => {
      mockFindOne.mockResolvedValueOnce({
        token: 'tok',
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      })
      expect(await getPendingInvite('tok')).toBeNull()
    })

    it('returns the invite when pending and unexpired', async () => {
      const invite = {
        token: 'tok',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }
      mockFindOne.mockResolvedValueOnce(invite)
      expect(await getPendingInvite('tok')).toEqual(invite)
    })
  })

  describe('acceptInvite', () => {
    it('rejects when token is invalid', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      await expect(acceptInvite('bad', 'u1')).rejects.toThrow('workspace.error.invalidInvite')
    })

    it('marks invite accepted and creates membership', async () => {
      const invite = {
        id: 'i1',
        workspaceId: 'w1',
        role: 'admin',
        token: 'tok',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }
      mockFindOne
        .mockResolvedValueOnce(invite) // getPendingInvite
        .mockResolvedValueOnce(null) // existing membership
      mockUpdateById.mockResolvedValueOnce({ data: invite })
      const member = { workspaceId: 'w1', userId: 'u1', role: 'admin' }
      mockCreate.mockResolvedValueOnce({ data: member })

      const result = await acceptInvite('tok', 'u1')

      expect(mockUpdateById).toHaveBeenCalledWith(
        'workspace_invites',
        'i1',
        expect.objectContaining({ acceptedAt: expect.any(String) }),
      )
      expect(result).toEqual(member)
    })

    it('returns existing membership without downgrading role', async () => {
      const invite = {
        id: 'i1',
        workspaceId: 'w1',
        role: 'member',
        token: 'tok',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }
      const existingMember = { workspaceId: 'w1', userId: 'u1', role: 'admin' }
      mockFindOne.mockResolvedValueOnce(invite).mockResolvedValueOnce(existingMember)
      mockUpdateById.mockResolvedValueOnce({ data: invite })

      const result = await acceptInvite('tok', 'u1')
      expect(result).toEqual(existingMember)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('handles concurrent acceptance — second call sees existing membership', async () => {
      // Two callers race on the same invite. The second sees the membership
      // already created and short-circuits without creating a duplicate row.
      const invite = {
        id: 'i1',
        workspaceId: 'w1',
        role: 'member',
        token: 'tok',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }
      const created = { workspaceId: 'w1', userId: 'u1', role: 'member' }

      // Caller A: invite + no existing member
      mockFindOne.mockResolvedValueOnce(invite).mockResolvedValueOnce(null)
      mockUpdateById.mockResolvedValueOnce({ data: invite })
      mockCreate.mockResolvedValueOnce({ data: created })

      // Caller B: invite (still appears pending in this test), existing member found
      mockFindOne.mockResolvedValueOnce(invite).mockResolvedValueOnce(created)
      mockUpdateById.mockResolvedValueOnce({ data: invite })

      const a = await acceptInvite('tok', 'u1')
      const b = await acceptInvite('tok', 'u1')

      expect(a).toEqual(created)
      expect(b).toEqual(created)
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateMemberRole', () => {
    it('refuses to demote the last owner', async () => {
      mockFindOne.mockResolvedValueOnce({
        workspaceId: 'w1',
        userId: 'u1',
        role: 'owner',
      })
      mockFindMany.mockResolvedValueOnce([{ workspaceId: 'w1', userId: 'u1', role: 'owner' }])

      await expect(updateMemberRole('w1', 'u1', 'admin')).rejects.toThrow(
        'workspace.error.lastOwner',
      )
    })

    it('allows demoting one owner when another exists', async () => {
      mockFindOne.mockResolvedValueOnce({
        workspaceId: 'w1',
        userId: 'u1',
        role: 'owner',
      })
      mockFindMany.mockResolvedValueOnce([
        { workspaceId: 'w1', userId: 'u1', role: 'owner' },
        { workspaceId: 'w1', userId: 'u2', role: 'owner' },
      ])
      mockDeleteMany.mockResolvedValueOnce({ affected: 1 })
      mockCreate.mockResolvedValueOnce({
        data: { workspaceId: 'w1', userId: 'u1', role: 'admin' },
      })

      const result = await updateMemberRole('w1', 'u1', 'admin')
      expect(result.role).toBe('admin')
    })

    it('throws when the user is not a member', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      await expect(updateMemberRole('w1', 'u1', 'admin')).rejects.toThrow(
        'workspace.error.notAMember',
      )
    })
  })

  describe('removeMember', () => {
    it('refuses to remove the last owner', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'owner' })
      mockFindMany.mockResolvedValueOnce([{ userId: 'u1', role: 'owner' }])
      await expect(removeMember('w1', 'u1')).rejects.toThrow('workspace.error.lastOwner')
    })

    it('removes a non-owner member', async () => {
      mockFindOne.mockResolvedValueOnce({ workspaceId: 'w1', userId: 'u1', role: 'member' })
      mockDeleteMany.mockResolvedValueOnce({ affected: 1 })
      await expect(removeMember('w1', 'u1')).resolves.toBeUndefined()
      expect(mockDeleteMany).toHaveBeenCalled()
    })

    it('no-ops when the user is not a member', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      await expect(removeMember('w1', 'u1')).resolves.toBeUndefined()
      expect(mockDeleteMany).not.toHaveBeenCalled()
    })
  })
})
