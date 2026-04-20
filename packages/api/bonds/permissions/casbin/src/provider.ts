/**
 * Casbin-based implementation of the permissions provider.
 *
 * Uses Casbin's RBAC model to provide role-based and attribute-based access
 * control. Supports custom model definitions, policy files, and external
 * adapters for persistent storage.
 *
 * @module
 */

import type { Enforcer } from 'casbin'
import { newEnforcer, newModel } from 'casbin'

import type { CreateRole, Permission, PermissionsProvider, Role } from '@molecule/api-permissions'

import type { CasbinPermissionsOptions } from './types.js'

/** Default RBAC model definition for Casbin. */
const DEFAULT_MODEL = `
[request_definition]
r = sub, act, obj

[policy_definition]
p = sub, act, obj

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
`.trim()

/** In-memory store for role definitions (id, name, description, permissions). */
interface RoleRecord {
  /** Unique identifier for this role. */
  id: string
  /** Human-readable role name. */
  name: string
  /** Optional description. */
  description?: string
  /** Permissions associated with this role. */
  permissions: Permission[]
  /** Optional scope. */
  scope?: string
}

/**
 * Creates a Casbin-backed permissions provider implementing the
 * `PermissionsProvider` interface. If no options are provided, uses
 * a default RBAC model with in-memory policy storage.
 *
 * @param options - Casbin configuration options.
 * @returns A `PermissionsProvider` backed by Casbin.
 */
export const createProvider = (options?: CasbinPermissionsOptions): PermissionsProvider => {
  let enforcer: Enforcer | null = null

  /** Auto-incrementing counter for role IDs, scoped per provider instance. */
  let roleIdCounter = 0

  /** In-memory role metadata store (Casbin only stores policies, not role metadata). */
  const roles = new Map<string, RoleRecord>()

  /**
   * Lazily initialises the Casbin enforcer.
   *
   * @returns The Casbin enforcer instance.
   */
  const getEnforcer = async (): Promise<Enforcer> => {
    if (enforcer) return enforcer

    if (options?.modelPath) {
      enforcer = options.adapter
        ? await newEnforcer(options.modelPath, options.adapter)
        : options.policyPath
          ? await newEnforcer(options.modelPath, options.policyPath)
          : await newEnforcer(options.modelPath)
    } else {
      const model = newModel()
      model.loadModelFromText(options?.modelText ?? DEFAULT_MODEL)
      enforcer = options?.adapter
        ? await newEnforcer(model, options.adapter)
        : await newEnforcer(model)
    }

    return enforcer
  }

  /**
   * Generates a unique role ID.
   *
   * @returns A unique role identifier string.
   */
  const generateRoleId = (): string => {
    roleIdCounter++
    return `role-${roleIdCounter}`
  }

  /**
   * Generates a unique permission ID.
   *
   * @returns A unique permission identifier string.
   */
  const generatePermissionId = (): string => {
    return `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  /**
   * Finds a role record by name.
   *
   * @param roleName - The role name to search for.
   * @returns The role record, or undefined.
   */
  const findRoleByName = (roleName: string): RoleRecord | undefined => {
    for (const record of roles.values()) {
      if (record.name === roleName) return record
    }
    return undefined
  }

  return {
    async can(
      subject: string,
      action: string,
      resource: string,
      _context?: Record<string, unknown>,
    ): Promise<boolean> {
      const e = await getEnforcer()
      return e.enforce(subject, action, resource)
    },

    async assign(subject: string, role: string, _scope?: string): Promise<void> {
      const e = await getEnforcer()
      await e.addGroupingPolicy(subject, role)
    },

    async revoke(subject: string, role: string, _scope?: string): Promise<void> {
      const e = await getEnforcer()
      await e.removeGroupingPolicy(subject, role)
    },

    async getRoles(subject: string): Promise<Role[]> {
      const e = await getEnforcer()
      const roleNames = await e.getRolesForUser(subject)
      return roleNames.map((name) => {
        const record = findRoleByName(name)
        if (record) {
          return {
            id: record.id,
            name: record.name,
            description: record.description,
            permissions: record.permissions,
            scope: record.scope,
          }
        }
        // Role exists in Casbin but not in our metadata store
        return {
          id: name,
          name,
          permissions: [],
        }
      })
    },

    async createRole(role: CreateRole): Promise<Role> {
      const e = await getEnforcer()
      const id = generateRoleId()

      const permissions = role.permissions.map((p) => ({
        ...p,
        id: p.id || generatePermissionId(),
      }))

      // Add policies for each permission
      for (const perm of permissions) {
        await e.addPolicy(role.name, perm.action, perm.resource)
      }

      const record: RoleRecord = {
        id,
        name: role.name,
        description: role.description,
        permissions,
      }
      roles.set(id, record)

      return {
        id,
        name: role.name,
        description: role.description,
        permissions,
      }
    },

    async deleteRole(roleId: string): Promise<void> {
      const e = await getEnforcer()
      const record = roles.get(roleId)

      if (record) {
        // Remove all policies for this role
        await e.removeFilteredPolicy(0, record.name)
        // Remove all grouping policies (role assignments)
        await e.removeFilteredGroupingPolicy(1, record.name)
        roles.delete(roleId)
      }
    },

    async getPermissions(role: string): Promise<Permission[]> {
      const record = findRoleByName(role)
      if (record) return record.permissions

      // Fall back to reading from Casbin policies
      const e = await getEnforcer()
      const policies = await e.getFilteredPolicy(0, role)
      return policies.map((policy, index) => ({
        id: `policy-${index}`,
        action: policy[1],
        resource: policy[2],
      }))
    },

    async addPermission(role: string, permission: Permission): Promise<void> {
      const e = await getEnforcer()
      await e.addPolicy(role, permission.action, permission.resource)

      const record = findRoleByName(role)
      if (record) {
        record.permissions.push({
          ...permission,
          id: permission.id || generatePermissionId(),
        })
      }
    },

    async removePermission(role: string, permissionId: string): Promise<void> {
      const record = findRoleByName(role)
      if (record) {
        const perm = record.permissions.find((p) => p.id === permissionId)
        if (perm) {
          const e = await getEnforcer()
          await e.removePolicy(role, perm.action, perm.resource)
          record.permissions = record.permissions.filter((p) => p.id !== permissionId)
        }
      }
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: PermissionsProvider | null = null

/**
 * Default Casbin permissions provider instance. Lazily initialises on first
 * property access using the default RBAC model.
 */
export const provider: PermissionsProvider = new Proxy({} as PermissionsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
