const { mockFindOne } = vi.hoisted(() => ({ mockFindOne: vi.fn() }))

vi.mock('@molecule/api-database', () => ({
  count: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
  findOne: mockFindOne,
  updateById: vi.fn(),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  canAdministerResource,
  getShareAdminAuthorizer,
  requireRole,
  resolveRole,
  setShareAdminAuthorizer,
} from '../authorizers/index.js'

describe('@molecule/api-resource-share — authorizers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setShareAdminAuthorizer(null)
  })

  it('resolveRole returns null with no grants', async () => {
    mockFindOne.mockResolvedValue(null)
    expect(await resolveRole('doc', 'd1', 'u1')).toBeNull()
  })

  it('resolveRole returns role from any active grant', async () => {
    mockFindOne
      .mockResolvedValueOnce(null) // user
      .mockResolvedValueOnce({ role: 'editor', expiresAt: null }) // team
    const role = await resolveRole('doc', 'd1', 'u1', ['team-1'])
    expect(role).toBe('editor')
  })

  it('requireRole resolves silently when authorized', async () => {
    mockFindOne
      .mockResolvedValueOnce({ role: 'owner', expiresAt: null })
      .mockResolvedValueOnce(null)
    await expect(requireRole('doc', 'd1', 'editor', 'u1')).resolves.toBeUndefined()
  })

  it("requireRole throws 'forbidden' when unauthorized", async () => {
    mockFindOne.mockResolvedValue(null)
    await expect(requireRole('doc', 'd1', 'viewer', 'u1')).rejects.toMatchObject({
      message: 'forbidden',
      code: 'forbidden',
    })
  })

  it('requireRole throws when role is below required', async () => {
    mockFindOne
      .mockResolvedValueOnce({ role: 'viewer', expiresAt: null })
      .mockResolvedValueOnce(null)
    await expect(requireRole('doc', 'd1', 'editor', 'u1')).rejects.toMatchObject({
      message: 'forbidden',
    })
  })

  describe('share-admin authorizer (default DENY)', () => {
    it('denies when no authorizer is registered', async () => {
      expect(getShareAdminAuthorizer()).toBeNull()
      expect(await canAdministerResource('doc', 'd1', 'u1')).toBe(false)
    })

    it('delegates to a registered authorizer and passes through its decision', async () => {
      const calls: Array<[string, string, string]> = []
      setShareAdminAuthorizer((resourceType, resourceId, userId) => {
        calls.push([resourceType, resourceId, userId])
        return resourceType === 'doc' && resourceId === 'd1' && userId === 'owner-1'
      })
      expect(getShareAdminAuthorizer()).not.toBeNull()
      expect(await canAdministerResource('doc', 'd1', 'owner-1')).toBe(true)
      expect(await canAdministerResource('doc', 'd1', 'intruder')).toBe(false)
      expect(calls).toEqual([
        ['doc', 'd1', 'owner-1'],
        ['doc', 'd1', 'intruder'],
      ])
    })

    it('awaits async authorizers', async () => {
      setShareAdminAuthorizer(async () => true)
      expect(await canAdministerResource('doc', 'd1', 'u1')).toBe(true)
    })

    it('clears back to default DENY when set to null', async () => {
      setShareAdminAuthorizer(() => true)
      expect(await canAdministerResource('doc', 'd1', 'u1')).toBe(true)
      setShareAdminAuthorizer(null)
      expect(await canAdministerResource('doc', 'd1', 'u1')).toBe(false)
    })
  })
})
