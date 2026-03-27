import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { Permission, PermissionsProvider, Role } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let can: typeof ProviderModule.can
let assign: typeof ProviderModule.assign
let revoke: typeof ProviderModule.revoke
let getRoles: typeof ProviderModule.getRoles
let createRole: typeof ProviderModule.createRole
let deleteRole: typeof ProviderModule.deleteRole
let getPermissions: typeof ProviderModule.getPermissions
let addPermission: typeof ProviderModule.addPermission
let removePermission: typeof ProviderModule.removePermission

const makePermission = (overrides?: Partial<Permission>): Permission => ({
  id: 'perm-1',
  action: 'read',
  resource: 'project',
  ...overrides,
})

const makeRole = (overrides?: Partial<Role>): Role => ({
  id: 'role-1',
  name: 'editor',
  permissions: [makePermission()],
  ...overrides,
})

const makeMockProvider = (overrides?: Partial<PermissionsProvider>): PermissionsProvider => ({
  can: vi.fn().mockResolvedValue(true),
  assign: vi.fn().mockResolvedValue(undefined),
  revoke: vi.fn().mockResolvedValue(undefined),
  getRoles: vi.fn().mockResolvedValue([makeRole()]),
  createRole: vi.fn().mockResolvedValue(makeRole()),
  deleteRole: vi.fn().mockResolvedValue(undefined),
  getPermissions: vi.fn().mockResolvedValue([makePermission()]),
  addPermission: vi.fn().mockResolvedValue(undefined),
  removePermission: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('permissions provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    can = providerModule.can
    assign = providerModule.assign
    revoke = providerModule.revoke
    getRoles = providerModule.getRoles
    createRole = providerModule.createRole
    deleteRole = providerModule.deleteRole
    getPermissions = providerModule.getPermissions
    addPermission = providerModule.addPermission
    removePermission = providerModule.removePermission
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Permissions provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = makeMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      setProvider(makeMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })

  describe('can', () => {
    it('should throw when no provider is set', async () => {
      await expect(can('user:1', 'read', 'project')).rejects.toThrow(
        'Permissions provider not configured',
      )
    })

    it('should delegate to provider can', async () => {
      const mockCan = vi.fn().mockResolvedValue(true)
      setProvider(makeMockProvider({ can: mockCan }))

      const result = await can('user:1', 'read', 'project')

      expect(mockCan).toHaveBeenCalledWith('user:1', 'read', 'project', undefined)
      expect(result).toBe(true)
    })

    it('should pass context to provider can', async () => {
      const mockCan = vi.fn().mockResolvedValue(false)
      setProvider(makeMockProvider({ can: mockCan }))

      const context = { ownerId: 'user:1' }
      const result = await can('user:2', 'write', 'project', context)

      expect(mockCan).toHaveBeenCalledWith('user:2', 'write', 'project', context)
      expect(result).toBe(false)
    })
  })

  describe('assign', () => {
    it('should throw when no provider is set', async () => {
      await expect(assign('user:1', 'editor')).rejects.toThrow(
        'Permissions provider not configured',
      )
    })

    it('should delegate to provider assign', async () => {
      const mockAssign = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ assign: mockAssign }))

      await assign('user:1', 'editor')

      expect(mockAssign).toHaveBeenCalledWith('user:1', 'editor', undefined)
    })

    it('should pass scope to provider assign', async () => {
      const mockAssign = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ assign: mockAssign }))

      await assign('user:1', 'editor', 'org:123')

      expect(mockAssign).toHaveBeenCalledWith('user:1', 'editor', 'org:123')
    })
  })

  describe('revoke', () => {
    it('should throw when no provider is set', async () => {
      await expect(revoke('user:1', 'editor')).rejects.toThrow(
        'Permissions provider not configured',
      )
    })

    it('should delegate to provider revoke', async () => {
      const mockRevoke = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ revoke: mockRevoke }))

      await revoke('user:1', 'editor', 'org:123')

      expect(mockRevoke).toHaveBeenCalledWith('user:1', 'editor', 'org:123')
    })
  })

  describe('getRoles', () => {
    it('should throw when no provider is set', async () => {
      await expect(getRoles('user:1')).rejects.toThrow('Permissions provider not configured')
    })

    it('should delegate to provider getRoles', async () => {
      const expected = [makeRole()]
      const mockGetRoles = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ getRoles: mockGetRoles }))

      const result = await getRoles('user:1')

      expect(mockGetRoles).toHaveBeenCalledWith('user:1')
      expect(result).toBe(expected)
    })
  })

  describe('createRole', () => {
    it('should throw when no provider is set', async () => {
      await expect(createRole({ name: 'admin', permissions: [] })).rejects.toThrow(
        'Permissions provider not configured',
      )
    })

    it('should delegate to provider createRole', async () => {
      const expected = makeRole({ id: 'role-new', name: 'admin' })
      const mockCreateRole = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ createRole: mockCreateRole }))

      const input = { name: 'admin', permissions: [makePermission()] }
      const result = await createRole(input)

      expect(mockCreateRole).toHaveBeenCalledWith(input)
      expect(result).toBe(expected)
    })
  })

  describe('deleteRole', () => {
    it('should throw when no provider is set', async () => {
      await expect(deleteRole('role-1')).rejects.toThrow('Permissions provider not configured')
    })

    it('should delegate to provider deleteRole', async () => {
      const mockDeleteRole = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ deleteRole: mockDeleteRole }))

      await deleteRole('role-1')

      expect(mockDeleteRole).toHaveBeenCalledWith('role-1')
    })
  })

  describe('getPermissions', () => {
    it('should throw when no provider is set', async () => {
      await expect(getPermissions('editor')).rejects.toThrow('Permissions provider not configured')
    })

    it('should delegate to provider getPermissions', async () => {
      const expected = [makePermission()]
      const mockGetPermissions = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ getPermissions: mockGetPermissions }))

      const result = await getPermissions('editor')

      expect(mockGetPermissions).toHaveBeenCalledWith('editor')
      expect(result).toBe(expected)
    })
  })

  describe('addPermission', () => {
    it('should throw when no provider is set', async () => {
      await expect(addPermission('editor', makePermission())).rejects.toThrow(
        'Permissions provider not configured',
      )
    })

    it('should delegate to provider addPermission', async () => {
      const perm = makePermission()
      const mockAddPermission = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ addPermission: mockAddPermission }))

      await addPermission('editor', perm)

      expect(mockAddPermission).toHaveBeenCalledWith('editor', perm)
    })
  })

  describe('removePermission', () => {
    it('should throw when no provider is set', async () => {
      await expect(removePermission('editor', 'perm-1')).rejects.toThrow(
        'Permissions provider not configured',
      )
    })

    it('should delegate to provider removePermission', async () => {
      const mockRemovePermission = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ removePermission: mockRemovePermission }))

      await removePermission('editor', 'perm-1')

      expect(mockRemovePermission).toHaveBeenCalledWith('editor', 'perm-1')
    })
  })
})
