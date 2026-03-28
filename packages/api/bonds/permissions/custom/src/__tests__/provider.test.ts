import { describe, expect, it } from 'vitest'

import type { PermissionsProvider } from '@molecule/api-permissions'

import { createProvider, provider } from '../provider.js'

describe('@molecule/api-permissions-custom', () => {
  describe('createProvider()', () => {
    it('should create a provider with default options', () => {
      const p = createProvider()

      expect(p).toBeDefined()
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

  describe('interface conformance', () => {
    it('conforms to the PermissionsProvider interface', () => {
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
    it('returns false when subject has no roles', async () => {
      const p = createProvider()

      const result = await p.can('alice', 'read', 'documents')
      expect(result).toBe(false)
    })

    it('returns true when subject has matching permission', async () => {
      const p = createProvider()

      await p.createRole({
        name: 'reader',
        permissions: [{ id: 'p1', action: 'read', resource: 'documents' }],
      })
      await p.assign('alice', 'reader')

      const result = await p.can('alice', 'read', 'documents')
      expect(result).toBe(true)
    })

    it('returns false when action does not match', async () => {
      const p = createProvider()

      await p.createRole({
        name: 'reader',
        permissions: [{ id: 'p1', action: 'read', resource: 'documents' }],
      })
      await p.assign('alice', 'reader')

      const result = await p.can('alice', 'write', 'documents')
      expect(result).toBe(false)
    })

    it('returns false when resource does not match', async () => {
      const p = createProvider()

      await p.createRole({
        name: 'reader',
        permissions: [{ id: 'p1', action: 'read', resource: 'documents' }],
      })
      await p.assign('alice', 'reader')

      const result = await p.can('alice', 'read', 'settings')
      expect(result).toBe(false)
    })

    it('supports wildcard action matching', async () => {
      const p = createProvider()

      await p.createRole({
        name: 'admin',
        permissions: [{ id: 'p1', action: '*', resource: 'documents' }],
      })
      await p.assign('alice', 'admin')

      expect(await p.can('alice', 'read', 'documents')).toBe(true)
      expect(await p.can('alice', 'write', 'documents')).toBe(true)
      expect(await p.can('alice', 'delete', 'documents')).toBe(true)
    })

    it('supports wildcard resource matching', async () => {
      const p = createProvider()

      await p.createRole({
        name: 'reader',
        permissions: [{ id: 'p1', action: 'read', resource: '*' }],
      })
      await p.assign('alice', 'reader')

      expect(await p.can('alice', 'read', 'documents')).toBe(true)
      expect(await p.can('alice', 'read', 'settings')).toBe(true)
      expect(await p.can('alice', 'write', 'documents')).toBe(false)
    })

    it('supports wildcard on both action and resource', async () => {
      const p = createProvider()

      await p.createRole({
        name: 'superadmin',
        permissions: [{ id: 'p1', action: '*', resource: '*' }],
      })
      await p.assign('alice', 'superadmin')

      expect(await p.can('alice', 'read', 'documents')).toBe(true)
      expect(await p.can('alice', 'delete', 'users')).toBe(true)
    })

    it('disables wildcard matching when wildcards option is false', async () => {
      const p = createProvider({ wildcards: false })

      await p.createRole({
        name: 'admin',
        permissions: [{ id: 'p1', action: '*', resource: 'documents' }],
      })
      await p.assign('alice', 'admin')

      // Wildcard literal does not match 'read'
      expect(await p.can('alice', 'read', 'documents')).toBe(false)
      // But literal '*' matches itself
      expect(await p.can('alice', '*', 'documents')).toBe(true)
    })

    it('evaluates ABAC conditions against context', async () => {
      const p = createProvider()

      await p.createRole({
        name: 'org-editor',
        permissions: [
          {
            id: 'p1',
            action: 'write',
            resource: 'documents',
            conditions: { orgId: 'org-1' },
          },
        ],
      })
      await p.assign('alice', 'org-editor')

      expect(await p.can('alice', 'write', 'documents', { orgId: 'org-1' })).toBe(true)
      expect(await p.can('alice', 'write', 'documents', { orgId: 'org-2' })).toBe(false)
      expect(await p.can('alice', 'write', 'documents')).toBe(false)
    })

    it('evaluates multiple conditions with logical AND', async () => {
      const p = createProvider()

      await p.createRole({
        name: 'restricted',
        permissions: [
          {
            id: 'p1',
            action: 'read',
            resource: 'documents',
            conditions: { orgId: 'org-1', department: 'engineering' },
          },
        ],
      })
      await p.assign('alice', 'restricted')

      expect(
        await p.can('alice', 'read', 'documents', {
          orgId: 'org-1',
          department: 'engineering',
        }),
      ).toBe(true)
      expect(
        await p.can('alice', 'read', 'documents', {
          orgId: 'org-1',
          department: 'marketing',
        }),
      ).toBe(false)
      expect(await p.can('alice', 'read', 'documents', { orgId: 'org-1' })).toBe(false)
    })

    it('allows when no conditions are defined on permission', async () => {
      const p = createProvider()

      await p.createRole({
        name: 'reader',
        permissions: [{ id: 'p1', action: 'read', resource: 'documents' }],
      })
      await p.assign('alice', 'reader')

      // Extra context attributes are ignored when permission has no conditions
      expect(await p.can('alice', 'read', 'documents', { orgId: 'org-1' })).toBe(true)
    })

    it('checks across multiple roles for a subject', async () => {
      const p = createProvider()

      await p.createRole({
        name: 'reader',
        permissions: [{ id: 'p1', action: 'read', resource: 'documents' }],
      })
      await p.createRole({
        name: 'writer',
        permissions: [{ id: 'p2', action: 'write', resource: 'documents' }],
      })
      await p.assign('alice', 'reader')
      await p.assign('alice', 'writer')

      expect(await p.can('alice', 'read', 'documents')).toBe(true)
      expect(await p.can('alice', 'write', 'documents')).toBe(true)
      expect(await p.can('alice', 'delete', 'documents')).toBe(false)
    })
  })

  describe('assign()', () => {
    it('assigns a role to a subject', async () => {
      const p = createProvider()

      await p.createRole({ name: 'admin', permissions: [] })
      await p.assign('alice', 'admin')

      const roles = await p.getRoles('alice')
      expect(roles).toHaveLength(1)
      expect(roles[0].name).toBe('admin')
    })

    it('prevents duplicate assignments', async () => {
      const p = createProvider()

      await p.createRole({ name: 'admin', permissions: [] })
      await p.assign('alice', 'admin')
      await p.assign('alice', 'admin')

      const roles = await p.getRoles('alice')
      expect(roles).toHaveLength(1)
    })

    it('allows same role with different scopes', async () => {
      const p = createProvider()

      await p.createRole({ name: 'admin', permissions: [] })
      await p.assign('alice', 'admin', 'org:1')
      await p.assign('alice', 'admin', 'org:2')

      const roles = await p.getRoles('alice')
      expect(roles).toHaveLength(2)
      expect(roles[0].scope).toBe('org:1')
      expect(roles[1].scope).toBe('org:2')
    })
  })

  describe('revoke()', () => {
    it('revokes a role from a subject', async () => {
      const p = createProvider()

      await p.createRole({ name: 'admin', permissions: [] })
      await p.assign('alice', 'admin')
      await p.revoke('alice', 'admin')

      const roles = await p.getRoles('alice')
      expect(roles).toEqual([])
    })

    it('does nothing when revoking a non-assigned role', async () => {
      const p = createProvider()

      await p.revoke('alice', 'admin')

      const roles = await p.getRoles('alice')
      expect(roles).toEqual([])
    })

    it('only revokes the matching scope', async () => {
      const p = createProvider()

      await p.createRole({ name: 'admin', permissions: [] })
      await p.assign('alice', 'admin', 'org:1')
      await p.assign('alice', 'admin', 'org:2')
      await p.revoke('alice', 'admin', 'org:1')

      const roles = await p.getRoles('alice')
      expect(roles).toHaveLength(1)
      expect(roles[0].scope).toBe('org:2')
    })
  })

  describe('getRoles()', () => {
    it('returns roles assigned to a subject', async () => {
      const p = createProvider()

      await p.createRole({ name: 'admin', description: 'Administrator', permissions: [] })
      await p.createRole({ name: 'editor', permissions: [] })
      await p.assign('alice', 'admin')
      await p.assign('alice', 'editor')

      const roles = await p.getRoles('alice')

      expect(roles).toHaveLength(2)
      expect(roles[0].name).toBe('admin')
      expect(roles[0].description).toBe('Administrator')
      expect(roles[1].name).toBe('editor')
    })

    it('returns basic role info when role is not in the store', async () => {
      const p = createProvider()

      await p.assign('alice', 'external-role')

      const roles = await p.getRoles('alice')
      expect(roles).toHaveLength(1)
      expect(roles[0].id).toBe('external-role')
      expect(roles[0].name).toBe('external-role')
      expect(roles[0].permissions).toEqual([])
    })

    it('returns empty array when subject has no roles', async () => {
      const p = createProvider()

      const roles = await p.getRoles('alice')
      expect(roles).toEqual([])
    })

    it('includes scope in returned roles', async () => {
      const p = createProvider()

      await p.createRole({ name: 'admin', permissions: [] })
      await p.assign('alice', 'admin', 'org:123')

      const roles = await p.getRoles('alice')
      expect(roles[0].scope).toBe('org:123')
    })
  })

  describe('createRole()', () => {
    it('creates a role with permissions', async () => {
      const p = createProvider()

      const role = await p.createRole({
        name: 'editor',
        description: 'Can edit documents',
        permissions: [
          { id: 'p1', action: 'read', resource: 'documents' },
          { id: 'p2', action: 'write', resource: 'documents' },
        ],
      })

      expect(role.id).toMatch(/^role-/)
      expect(role.name).toBe('editor')
      expect(role.description).toBe('Can edit documents')
      expect(role.permissions).toHaveLength(2)
      expect(role.permissions[0].action).toBe('read')
      expect(role.permissions[1].action).toBe('write')
    })

    it('generates permission IDs when not provided', async () => {
      const p = createProvider()

      const role = await p.createRole({
        name: 'viewer',
        permissions: [{ id: '', action: 'read', resource: 'docs' }],
      })

      expect(role.permissions[0].id).toMatch(/^perm-/)
    })

    it('preserves existing permission IDs', async () => {
      const p = createProvider()

      const role = await p.createRole({
        name: 'viewer',
        permissions: [{ id: 'custom-id', action: 'read', resource: 'docs' }],
      })

      expect(role.permissions[0].id).toBe('custom-id')
    })

    it('creates a role with empty permissions', async () => {
      const p = createProvider()

      const role = await p.createRole({ name: 'empty', permissions: [] })

      expect(role.name).toBe('empty')
      expect(role.permissions).toEqual([])
    })

    it('assigns unique sequential IDs to roles', async () => {
      const p = createProvider()

      const role1 = await p.createRole({ name: 'a', permissions: [] })
      const role2 = await p.createRole({ name: 'b', permissions: [] })

      expect(role1.id).not.toBe(role2.id)
    })
  })

  describe('deleteRole()', () => {
    it('removes the role definition', async () => {
      const p = createProvider()

      const role = await p.createRole({
        name: 'editor',
        permissions: [{ id: 'p1', action: 'read', resource: 'docs' }],
      })

      await p.deleteRole(role.id)

      const perms = await p.getPermissions('editor')
      expect(perms).toEqual([])
    })

    it('removes all assignments referencing the deleted role', async () => {
      const p = createProvider()

      const role = await p.createRole({ name: 'editor', permissions: [] })
      await p.assign('alice', 'editor')
      await p.assign('bob', 'editor')

      await p.deleteRole(role.id)

      expect(await p.getRoles('alice')).toEqual([])
      expect(await p.getRoles('bob')).toEqual([])
    })

    it('does nothing when deleting a non-existent role', async () => {
      const p = createProvider()

      // Should not throw
      await p.deleteRole('nonexistent-id')
    })

    it('does not affect other roles when deleting one', async () => {
      const p = createProvider()

      const role1 = await p.createRole({ name: 'reader', permissions: [] })
      await p.createRole({ name: 'writer', permissions: [] })
      await p.assign('alice', 'reader')
      await p.assign('alice', 'writer')

      await p.deleteRole(role1.id)

      const roles = await p.getRoles('alice')
      expect(roles).toHaveLength(1)
      expect(roles[0].name).toBe('writer')
    })
  })

  describe('getPermissions()', () => {
    it('returns permissions for a role', async () => {
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

    it('returns empty array for unknown role', async () => {
      const p = createProvider()

      const perms = await p.getPermissions('nonexistent')
      expect(perms).toEqual([])
    })
  })

  describe('addPermission()', () => {
    it('adds a permission to an existing role', async () => {
      const p = createProvider()

      await p.createRole({ name: 'editor', permissions: [] })
      await p.addPermission('editor', { id: 'p1', action: 'delete', resource: 'docs' })

      const perms = await p.getPermissions('editor')
      expect(perms).toHaveLength(1)
      expect(perms[0].action).toBe('delete')
    })

    it('generates permission ID when not provided', async () => {
      const p = createProvider()

      await p.createRole({ name: 'editor', permissions: [] })
      await p.addPermission('editor', { id: '', action: 'read', resource: 'docs' })

      const perms = await p.getPermissions('editor')
      expect(perms[0].id).toMatch(/^perm-/)
    })

    it('does nothing when role is not in the store', async () => {
      const p = createProvider()

      await p.addPermission('nonexistent', { id: 'p1', action: 'read', resource: 'docs' })

      const perms = await p.getPermissions('nonexistent')
      expect(perms).toEqual([])
    })
  })

  describe('removePermission()', () => {
    it('removes a permission from a role', async () => {
      const p = createProvider()

      await p.createRole({
        name: 'editor',
        permissions: [{ id: 'p1', action: 'read', resource: 'docs' }],
      })

      await p.removePermission('editor', 'p1')

      const perms = await p.getPermissions('editor')
      expect(perms).toHaveLength(0)
    })

    it('does nothing when permission ID is not found', async () => {
      const p = createProvider()

      await p.createRole({ name: 'editor', permissions: [] })
      await p.removePermission('editor', 'nonexistent')

      const perms = await p.getPermissions('editor')
      expect(perms).toEqual([])
    })

    it('does nothing when role is not in the store', async () => {
      const p = createProvider()

      // Should not throw
      await p.removePermission('unknown-role', 'p1')
    })
  })

  describe('provider (default export)', () => {
    it('exports a lazily-initialized default provider via Proxy', () => {
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

    it('conforms to PermissionsProvider interface', () => {
      const p: PermissionsProvider = provider
      expect(p).toBeDefined()
    })
  })
})
