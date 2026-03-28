/**
 * Type definitions for the permissions core interface.
 *
 * Defines the `PermissionsProvider` interface for role-based and
 * attribute-based access control (RBAC/ABAC). Bond packages implement
 * this interface to provide concrete authorization logic.
 *
 * @module
 */

/**
 * A permission granting an action on a resource, optionally with conditions.
 */
export interface Permission {
  /** Unique identifier for this permission. */
  id: string

  /** The action this permission grants (e.g. `read`, `write`, `delete`). */
  action: string

  /** The resource this permission applies to (e.g. `project`, `user`, `*`). */
  resource: string

  /** Optional ABAC conditions that must be met for this permission to apply. */
  conditions?: Record<string, unknown>
}

/**
 * A role grouping one or more permissions, optionally scoped.
 */
export interface Role {
  /** Unique identifier for this role. */
  id: string

  /** Human-readable name of the role (e.g. `admin`, `editor`). */
  name: string

  /** Optional description of the role's purpose. */
  description?: string

  /** Permissions granted by this role. */
  permissions: Permission[]

  /** Optional scope restricting where this role applies (e.g. `org:123`). */
  scope?: string
}

/**
 * Input for creating a new role.
 */
export interface CreateRole {
  /** Human-readable name of the role. */
  name: string

  /** Optional description of the role's purpose. */
  description?: string

  /** Permissions to assign to the role. */
  permissions: Permission[]
}

/**
 * Permissions provider interface.
 *
 * All permissions providers must implement this interface to provide
 * authorization checking, role management, and permission assignment.
 */
export interface PermissionsProvider {
  /**
   * Checks whether a subject is allowed to perform an action on a resource.
   *
   * @param subject - The entity requesting access (e.g. user ID).
   * @param action - The action being requested (e.g. `read`, `write`).
   * @param resource - The resource being accessed (e.g. `project`).
   * @param context - Optional ABAC context attributes for condition evaluation.
   * @returns `true` if the subject is authorized.
   */
  can(
    subject: string,
    action: string,
    resource: string,
    context?: Record<string, unknown>,
  ): Promise<boolean>

  /**
   * Assigns a role to a subject, optionally within a scope.
   *
   * @param subject - The entity to assign the role to.
   * @param role - The role name to assign.
   * @param scope - Optional scope for the assignment (e.g. `org:123`).
   */
  assign(subject: string, role: string, scope?: string): Promise<void>

  /**
   * Revokes a role from a subject, optionally within a scope.
   *
   * @param subject - The entity to revoke the role from.
   * @param role - The role name to revoke.
   * @param scope - Optional scope for the revocation.
   */
  revoke(subject: string, role: string, scope?: string): Promise<void>

  /**
   * Retrieves all roles assigned to a subject.
   *
   * @param subject - The entity to look up roles for.
   * @returns The roles assigned to the subject.
   */
  getRoles(subject: string): Promise<Role[]>

  /**
   * Creates a new role definition.
   *
   * @param role - The role definition to create.
   * @returns The created role with an assigned `id`.
   */
  createRole(role: CreateRole): Promise<Role>

  /**
   * Deletes a role definition by ID.
   *
   * @param roleId - The ID of the role to delete.
   */
  deleteRole(roleId: string): Promise<void>

  /**
   * Retrieves all permissions granted by a role.
   *
   * @param role - The role name to look up permissions for.
   * @returns The permissions granted by the role.
   */
  getPermissions(role: string): Promise<Permission[]>

  /**
   * Adds a permission to an existing role.
   *
   * @param role - The role name to add the permission to.
   * @param permission - The permission to add.
   */
  addPermission(role: string, permission: Permission): Promise<void>

  /**
   * Removes a permission from a role.
   *
   * @param role - The role name to remove the permission from.
   * @param permissionId - The ID of the permission to remove.
   */
  removePermission(role: string, permissionId: string): Promise<void>
}
