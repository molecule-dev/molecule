/**
 * Simple in-memory role-based permissions provider.
 *
 * Stores roles, permissions, and subject assignments entirely in memory.
 * Supports wildcard matching on actions/resources and basic ABAC condition
 * evaluation against context attributes. Ideal for development, testing, or
 * single-instance deployments without external dependencies.
 *
 * @module
 */

import type { CreateRole, Permission, PermissionsProvider, Role } from '@molecule/api-permissions'

import type { CustomPermissionsOptions } from './types.js'

/** Internal record for a role definition. */
interface RoleRecord {
  /** Unique identifier. */
  id: string
  /** Human-readable name. */
  name: string
  /** Optional description. */
  description?: string
  /** Permissions granted by this role. */
  permissions: Permission[]
}

/** Internal record for a subject-role assignment. */
interface Assignment {
  /** Role name. */
  role: string
  /** Optional scope. */
  scope?: string
}

/**
 * Creates a custom in-memory permissions provider implementing the
 * `PermissionsProvider` interface. All state is stored in memory — no
 * external services or libraries are required.
 *
 * @param options - Optional provider configuration.
 * @returns A `PermissionsProvider` backed by in-memory storage.
 */
export const createProvider = (options?: CustomPermissionsOptions): PermissionsProvider => {
  const wildcards = options?.wildcards ?? true

  /** Auto-incrementing counter for role IDs. */
  let roleIdCounter = 0

  /** Role definitions keyed by role ID. */
  const roles = new Map<string, RoleRecord>()

  /** Subject-to-role assignments keyed by subject. */
  const assignments = new Map<string, Assignment[]>()

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

  /**
   * Checks whether a string matches a pattern, supporting wildcard (`*`).
   *
   * @param value - The actual value to check.
   * @param pattern - The pattern to match against (may be `*` for any).
   * @returns `true` if the value matches the pattern.
   */
  const matches = (value: string, pattern: string): boolean => {
    if (wildcards && pattern === '*') return true
    return value === pattern
  }

  /**
   * Evaluates ABAC conditions against a context object. All condition
   * key-value pairs must match (logical AND).
   *
   * @param conditions - The conditions to evaluate.
   * @param context - The context to evaluate against.
   * @returns `true` if all conditions are satisfied or no conditions exist.
   */
  const evaluateConditions = (
    conditions: Record<string, unknown> | undefined,
    context: Record<string, unknown> | undefined,
  ): boolean => {
    if (!conditions || Object.keys(conditions).length === 0) return true
    if (!context) return false

    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] !== value) return false
    }
    return true
  }

  return {
    async can(
      subject: string,
      action: string,
      resource: string,
      context?: Record<string, unknown>,
    ): Promise<boolean> {
      const subjectAssignments = assignments.get(subject) ?? []

      for (const assignment of subjectAssignments) {
        const roleRecord = findRoleByName(assignment.role)
        if (!roleRecord) continue

        for (const perm of roleRecord.permissions) {
          if (
            matches(action, perm.action) &&
            matches(resource, perm.resource) &&
            evaluateConditions(perm.conditions, context)
          ) {
            return true
          }
        }
      }

      return false
    },

    async assign(subject: string, role: string, scope?: string): Promise<void> {
      const existing = assignments.get(subject) ?? []

      // Avoid duplicate assignments
      const duplicate = existing.some((a) => a.role === role && a.scope === scope)
      if (!duplicate) {
        existing.push({ role, scope })
        assignments.set(subject, existing)
      }
    },

    async revoke(subject: string, role: string, scope?: string): Promise<void> {
      const existing = assignments.get(subject)
      if (!existing) return

      const filtered = existing.filter((a) => !(a.role === role && a.scope === scope))
      if (filtered.length > 0) {
        assignments.set(subject, filtered)
      } else {
        assignments.delete(subject)
      }
    },

    async getRoles(subject: string): Promise<Role[]> {
      const subjectAssignments = assignments.get(subject) ?? []

      return subjectAssignments.map((assignment) => {
        const record = findRoleByName(assignment.role)
        if (record) {
          return {
            id: record.id,
            name: record.name,
            description: record.description,
            permissions: [...record.permissions],
            scope: assignment.scope,
          }
        }
        // Assignment references a role not in the store
        return {
          id: assignment.role,
          name: assignment.role,
          permissions: [],
          scope: assignment.scope,
        }
      })
    },

    async createRole(role: CreateRole): Promise<Role> {
      const id = generateRoleId()

      const permissions = role.permissions.map((p) => ({
        ...p,
        id: p.id || generatePermissionId(),
      }))

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
        permissions: [...permissions],
      }
    },

    async deleteRole(roleId: string): Promise<void> {
      const record = roles.get(roleId)
      if (!record) return

      // Remove all assignments referencing this role
      for (const [subject, subjectAssignments] of assignments.entries()) {
        const filtered = subjectAssignments.filter((a) => a.role !== record.name)
        if (filtered.length > 0) {
          assignments.set(subject, filtered)
        } else {
          assignments.delete(subject)
        }
      }

      roles.delete(roleId)
    },

    async getPermissions(role: string): Promise<Permission[]> {
      const record = findRoleByName(role)
      if (record) return [...record.permissions]
      return []
    },

    async addPermission(role: string, permission: Permission): Promise<void> {
      const record = findRoleByName(role)
      if (!record) return

      record.permissions.push({
        ...permission,
        id: permission.id || generatePermissionId(),
      })
    },

    async removePermission(role: string, permissionId: string): Promise<void> {
      const record = findRoleByName(role)
      if (!record) return

      record.permissions = record.permissions.filter((p) => p.id !== permissionId)
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: PermissionsProvider | null = null

/**
 * Default custom permissions provider instance. Lazily initialises on first
 * property access with default options.
 */
export const provider: PermissionsProvider = new Proxy({} as PermissionsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
