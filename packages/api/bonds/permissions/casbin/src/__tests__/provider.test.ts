import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PermissionsProvider } from '@molecule/api-permissions'

// Mock Casbin
const mockEnforce = vi.fn()
const mockAddPolicy = vi.fn()
const mockRemovePolicy = vi.fn()
const mockRemoveFilteredPolicy = vi.fn()
const mockAddGroupingPolicy = vi.fn()
const mockRemoveGroupingPolicy = vi.fn()
const mockRemoveFilteredGroupingPolicy = vi.fn()
const mockGetRolesForUser = vi.fn()
const mockGetFilteredPolicy = vi.fn()

const mockEnforcer = {
  enforce: mockEnforce,
  addPolicy: mockAddPolicy,
  removePolicy: mockRemovePolicy,
  removeFilteredPolicy: mockRemoveFilteredPolicy,
  addGroupingPolicy: mockAddGroupingPolicy,
  removeGroupingPolicy: mockRemoveGroupingPolicy,
  removeFilteredGroupingPolicy: mockRemoveFilteredGroupingPolicy,
  getRolesForUser: mockGetRolesForUser,
  getFilteredPolicy: mockGetFilteredPolicy,
}

const mockLoadModelFromText = vi.fn()
const mockNewModel = vi.fn().mockReturnValue({ loadModelFromText: mockLoadModelFromText })
const mockNewEnforcer = vi.fn().mockResolvedValue(mockEnforcer)

vi.mock('casbin', () => ({
  newEnforcer: (...args: unknown[]) => mockNewEnforcer(...args),
  newModel: () => mockNewModel(),
}))

describe('@molecule/api-permissions-casbin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNewEnforcer.mockResolvedValue(mockEnforcer)
    mockGetRolesForUser.mockResolvedValue([])
    mockGetFilteredPolicy.mockResolvedValue([])
    mockEnforce.mockResolvedValue(false)
    mockAddPolicy.mockResolvedValue(true)
    mockRemovePolicy.mockResolvedValue(true)
    mockRemoveFilteredPolicy.mockResolvedValue(true)
    mockAddGroupingPolicy.mockResolvedValue(true)
    mockRemoveGroupingPolicy.mockResolvedValue(true)
    mockRemoveFilteredGroupingPolicy.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('createProvider()', () => {
    it('should create a provider with default config', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      expect(p).toBeDefined()
      expect(typeof p.can).toBe('function')
      expect(typeof p.assign).toBe('function')
    })

    it('should lazily initialise the enforcer', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      // Enforcer not created yet
      expect(mockNewEnforcer).not.toHaveBeenCalled()

      // First call triggers initialisation
      await p.can('user1', 'read', 'doc')
      expect(mockNewEnforcer).toHaveBeenCalledTimes(1)

      // Second call reuses the same enforcer
      await p.can('user1', 'write', 'doc')
      expect(mockNewEnforcer).toHaveBeenCalledTimes(1)
    })

    it('should use default RBAC model when no options provided', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.can('user1', 'read', 'doc')

      expect(mockNewModel).toHaveBeenCalled()
      expect(mockLoadModelFromText).toHaveBeenCalledWith(
        expect.stringContaining('[request_definition]'),
      )
      expect(mockNewEnforcer).toHaveBeenCalledWith(
        expect.objectContaining({ loadModelFromText: expect.any(Function) }),
      )
    })

    it('should use modelPath when provided', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider({ modelPath: '/path/to/model.conf' })

      await p.can('user1', 'read', 'doc')

      expect(mockNewEnforcer).toHaveBeenCalledWith('/path/to/model.conf')
    })

    it('should use modelPath + policyPath when both provided', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider({ modelPath: '/model.conf', policyPath: '/policy.csv' })

      await p.can('user1', 'read', 'doc')

      expect(mockNewEnforcer).toHaveBeenCalledWith('/model.conf', '/policy.csv')
    })

    it('should use modelPath + adapter when both provided', async () => {
      const mockAdapter = { loadPolicy: vi.fn() }
      const { createProvider } = await import('../provider.js')
      const p = createProvider({ modelPath: '/model.conf', adapter: mockAdapter })

      await p.can('user1', 'read', 'doc')

      expect(mockNewEnforcer).toHaveBeenCalledWith('/model.conf', mockAdapter)
    })

    it('should use modelText when provided without modelPath', async () => {
      const customModel = '[request_definition]\nr = sub, act\n[matchers]\nm = r.sub == p.sub'
      const { createProvider } = await import('../provider.js')
      const p = createProvider({ modelText: customModel })

      await p.can('user1', 'read', 'doc')

      expect(mockLoadModelFromText).toHaveBeenCalledWith(customModel)
    })

    it('should use adapter with inline model when no modelPath', async () => {
      const mockAdapter = { loadPolicy: vi.fn() }
      const { createProvider } = await import('../provider.js')
      const p = createProvider({ adapter: mockAdapter })

      await p.can('user1', 'read', 'doc')

      expect(mockNewEnforcer).toHaveBeenCalledWith(
        expect.objectContaining({ loadModelFromText: expect.any(Function) }),
        mockAdapter,
      )
    })
  })

  describe('interface conformance', () => {
    it('conforms to the PermissionsProvider interface', async () => {
      const { createProvider } = await import('../provider.js')
      const p: PermissionsProvider = createProvider()

      expect(typeof p.can).toBe('function')
      expect(typeof p.assign).toBe('function')
      expect(typeof p.revoke).toBe('function')
      expect(typeof p.getRoles).toBe('function')
      expect(typeof p.createRole).toBe('function')
      expect(typeof p.deleteRole).toBe('function')
      expect(typeof p.getPermissions).toBe('function')
      expect(typeof p.addPermission).toBe('function')
      expect(typeof p.removePermission).toBe('function')
    })
  })

  describe('can()', () => {
    it('returns true when enforcer allows', async () => {
      mockEnforce.mockResolvedValueOnce(true)

      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      const result = await p.can('alice', 'read', 'documents')

      expect(result).toBe(true)
      expect(mockEnforce).toHaveBeenCalledWith('alice', 'read', 'documents')
    })

    it('returns false when enforcer denies', async () => {
      mockEnforce.mockResolvedValueOnce(false)

      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      const result = await p.can('alice', 'delete', 'documents')

      expect(result).toBe(false)
      expect(mockEnforce).toHaveBeenCalledWith('alice', 'delete', 'documents')
    })

    it('accepts optional context parameter', async () => {
      mockEnforce.mockResolvedValueOnce(true)

      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      const result = await p.can('alice', 'read', 'documents', { orgId: 'org-1' })

      expect(result).toBe(true)
      // Context is accepted but not used by default RBAC model
      expect(mockEnforce).toHaveBeenCalledWith('alice', 'read', 'documents')
    })
  })

  describe('assign()', () => {
    it('adds a grouping policy for the subject-role pair', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.assign('alice', 'admin')

      expect(mockAddGroupingPolicy).toHaveBeenCalledWith('alice', 'admin')
    })

    it('accepts optional scope parameter', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.assign('alice', 'admin', 'org:123')

      expect(mockAddGroupingPolicy).toHaveBeenCalledWith('alice', 'admin')
    })
  })

  describe('revoke()', () => {
    it('removes the grouping policy for the subject-role pair', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.revoke('alice', 'admin')

      expect(mockRemoveGroupingPolicy).toHaveBeenCalledWith('alice', 'admin')
    })
  })

  describe('getRoles()', () => {
    it('returns roles assigned to a subject', async () => {
      mockGetRolesForUser.mockResolvedValueOnce(['admin', 'editor'])

      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      // Pre-create roles so metadata is available
      await p.createRole({ name: 'admin', description: 'Administrator', permissions: [] })
      await p.createRole({ name: 'editor', permissions: [] })

      const roles = await p.getRoles('alice')

      expect(roles).toHaveLength(2)
      expect(roles[0].name).toBe('admin')
      expect(roles[0].description).toBe('Administrator')
      expect(roles[1].name).toBe('editor')
    })

    it('returns basic role info when metadata is not in the store', async () => {
      mockGetRolesForUser.mockResolvedValueOnce(['unknown-role'])

      const { createProvider } = await import('../provider.js')
      const p = createProvider()
      const roles = await p.getRoles('alice')

      expect(roles).toHaveLength(1)
      expect(roles[0].id).toBe('unknown-role')
      expect(roles[0].name).toBe('unknown-role')
      expect(roles[0].permissions).toEqual([])
    })

    it('returns empty array when user has no roles', async () => {
      mockGetRolesForUser.mockResolvedValueOnce([])

      const { createProvider } = await import('../provider.js')
      const p = createProvider()
      const roles = await p.getRoles('alice')

      expect(roles).toEqual([])
    })
  })

  describe('createRole()', () => {
    it('creates a role with permissions and adds policies', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      const role = await p.createRole({
        name: 'editor',
        description: 'Can edit documents',
        permissions: [
          { id: '', action: 'read', resource: 'documents' },
          { id: '', action: 'write', resource: 'documents' },
        ],
      })

      expect(role.id).toMatch(/^role-/)
      expect(role.name).toBe('editor')
      expect(role.description).toBe('Can edit documents')
      expect(role.permissions).toHaveLength(2)
      expect(role.permissions[0].action).toBe('read')
      expect(role.permissions[1].action).toBe('write')

      // Should add Casbin policies
      expect(mockAddPolicy).toHaveBeenCalledWith('editor', 'read', 'documents')
      expect(mockAddPolicy).toHaveBeenCalledWith('editor', 'write', 'documents')
    })

    it('generates permission IDs when not provided', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      const role = await p.createRole({
        name: 'viewer',
        permissions: [{ id: '', action: 'read', resource: 'docs' }],
      })

      expect(role.permissions[0].id).toMatch(/^perm-/)
    })

    it('preserves existing permission IDs', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      const role = await p.createRole({
        name: 'viewer',
        permissions: [{ id: 'custom-id', action: 'read', resource: 'docs' }],
      })

      expect(role.permissions[0].id).toBe('custom-id')
    })

    it('creates a role with empty permissions', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      const role = await p.createRole({ name: 'empty', permissions: [] })

      expect(role.name).toBe('empty')
      expect(role.permissions).toEqual([])
      expect(mockAddPolicy).not.toHaveBeenCalled()
    })
  })

  describe('deleteRole()', () => {
    it('removes all policies and grouping policies for the role', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      const role = await p.createRole({
        name: 'editor',
        permissions: [{ id: '', action: 'read', resource: 'docs' }],
      })

      await p.deleteRole(role.id)

      expect(mockRemoveFilteredPolicy).toHaveBeenCalledWith(0, 'editor')
      expect(mockRemoveFilteredGroupingPolicy).toHaveBeenCalledWith(1, 'editor')
    })

    it('does nothing when deleting a non-existent role', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.deleteRole('nonexistent-id')

      expect(mockRemoveFilteredPolicy).not.toHaveBeenCalled()
      expect(mockRemoveFilteredGroupingPolicy).not.toHaveBeenCalled()
    })
  })

  describe('getPermissions()', () => {
    it('returns permissions from the metadata store', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.createRole({
        name: 'editor',
        permissions: [
          { id: 'p1', action: 'read', resource: 'docs' },
          { id: 'p2', action: 'write', resource: 'docs' },
        ],
      })

      const perms = await p.getPermissions('editor')

      expect(perms).toHaveLength(2)
      expect(perms[0].action).toBe('read')
      expect(perms[1].action).toBe('write')
    })

    it('falls back to Casbin policies when role is not in metadata store', async () => {
      mockGetFilteredPolicy.mockResolvedValueOnce([
        ['viewer', 'read', 'docs'],
        ['viewer', 'list', 'docs'],
      ])

      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      const perms = await p.getPermissions('viewer')

      expect(perms).toHaveLength(2)
      expect(perms[0]).toEqual({
        id: 'policy-0',
        action: 'read',
        resource: 'docs',
      })
      expect(perms[1]).toEqual({
        id: 'policy-1',
        action: 'list',
        resource: 'docs',
      })
      expect(mockGetFilteredPolicy).toHaveBeenCalledWith(0, 'viewer')
    })
  })

  describe('addPermission()', () => {
    it('adds a Casbin policy and updates the metadata store', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.createRole({ name: 'editor', permissions: [] })

      await p.addPermission('editor', { id: 'p1', action: 'delete', resource: 'docs' })

      expect(mockAddPolicy).toHaveBeenCalledWith('editor', 'delete', 'docs')

      const perms = await p.getPermissions('editor')
      expect(perms).toHaveLength(1)
      expect(perms[0].action).toBe('delete')
    })

    it('generates permission ID when not provided', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.createRole({ name: 'editor', permissions: [] })

      await p.addPermission('editor', { id: '', action: 'read', resource: 'docs' })

      const perms = await p.getPermissions('editor')
      expect(perms[0].id).toMatch(/^perm-/)
    })

    it('still adds Casbin policy even if role is not in metadata store', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.addPermission('external-role', { id: 'p1', action: 'read', resource: 'docs' })

      expect(mockAddPolicy).toHaveBeenCalledWith('external-role', 'read', 'docs')
    })
  })

  describe('removePermission()', () => {
    it('removes a permission from the role and Casbin', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.createRole({
        name: 'editor',
        permissions: [{ id: 'p1', action: 'read', resource: 'docs' }],
      })

      await p.removePermission('editor', 'p1')

      expect(mockRemovePolicy).toHaveBeenCalledWith('editor', 'read', 'docs')

      const perms = await p.getPermissions('editor')
      expect(perms).toHaveLength(0)
    })

    it('does nothing when permission ID is not found', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.createRole({ name: 'editor', permissions: [] })

      await p.removePermission('editor', 'nonexistent')

      expect(mockRemovePolicy).not.toHaveBeenCalled()
    })

    it('does nothing when role is not in metadata store', async () => {
      const { createProvider } = await import('../provider.js')
      const p = createProvider()

      await p.removePermission('unknown-role', 'p1')

      expect(mockRemovePolicy).not.toHaveBeenCalled()
    })
  })

  describe('provider (default export)', () => {
    it('exports a lazily-initialized default provider via Proxy', async () => {
      const { provider } = await import('../provider.js')

      expect(provider).toBeDefined()
      expect(typeof provider.can).toBe('function')
      expect(typeof provider.assign).toBe('function')
      expect(typeof provider.revoke).toBe('function')
      expect(typeof provider.getRoles).toBe('function')
      expect(typeof provider.createRole).toBe('function')
      expect(typeof provider.deleteRole).toBe('function')
      expect(typeof provider.getPermissions).toBe('function')
      expect(typeof provider.addPermission).toBe('function')
      expect(typeof provider.removePermission).toBe('function')
    })

    it('conforms to PermissionsProvider interface', async () => {
      const { provider } = await import('../provider.js')
      const p: PermissionsProvider = provider

      expect(p).toBeDefined()
    })
  })
})
