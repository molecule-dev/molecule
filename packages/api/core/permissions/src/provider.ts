/**
 * Permissions provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-permissions-casbin`) call `setProvider()`
 * during setup. Application code uses the convenience functions which delegate
 * to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { CreateRole, Permission, PermissionsProvider, Role } from './types.js'

const BOND_TYPE = 'permissions'
expectBond(BOND_TYPE)

/**
 * Registers a permissions provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The permissions provider implementation to bond.
 */
export const setProvider = (provider: PermissionsProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded permissions provider, throwing if none is configured.
 *
 * @returns The bonded permissions provider.
 * @throws {Error} If no permissions provider has been bonded.
 */
export const getProvider = (): PermissionsProvider => {
  try {
    return bondRequire<PermissionsProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('permissions.error.noProvider', undefined, {
        defaultValue: 'Permissions provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a permissions provider is currently bonded.
 *
 * @returns `true` if a permissions provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Checks whether a subject is allowed to perform an action on a resource.
 *
 * @param subject - The entity requesting access (e.g. user ID).
 * @param action - The action being requested (e.g. `read`, `write`).
 * @param resource - The resource being accessed (e.g. `project`).
 * @param context - Optional ABAC context attributes for condition evaluation.
 * @returns `true` if the subject is authorized.
 * @throws {Error} If no permissions provider has been bonded.
 */
export const can = async (
  subject: string,
  action: string,
  resource: string,
  context?: Record<string, unknown>,
): Promise<boolean> => {
  return getProvider().can(subject, action, resource, context)
}

/**
 * Assigns a role to a subject, optionally within a scope.
 *
 * @param subject - The entity to assign the role to.
 * @param role - The role name to assign.
 * @param scope - Optional scope for the assignment (e.g. `org:123`).
 * @throws {Error} If no permissions provider has been bonded.
 */
export const assign = async (subject: string, role: string, scope?: string): Promise<void> => {
  return getProvider().assign(subject, role, scope)
}

/**
 * Revokes a role from a subject, optionally within a scope.
 *
 * @param subject - The entity to revoke the role from.
 * @param role - The role name to revoke.
 * @param scope - Optional scope for the revocation.
 * @throws {Error} If no permissions provider has been bonded.
 */
export const revoke = async (subject: string, role: string, scope?: string): Promise<void> => {
  return getProvider().revoke(subject, role, scope)
}

/**
 * Retrieves all roles assigned to a subject.
 *
 * @param subject - The entity to look up roles for.
 * @returns The roles assigned to the subject.
 * @throws {Error} If no permissions provider has been bonded.
 */
export const getRoles = async (subject: string): Promise<Role[]> => {
  return getProvider().getRoles(subject)
}

/**
 * Creates a new role definition.
 *
 * @param role - The role definition to create.
 * @returns The created role with an assigned `id`.
 * @throws {Error} If no permissions provider has been bonded.
 */
export const createRole = async (role: CreateRole): Promise<Role> => {
  return getProvider().createRole(role)
}

/**
 * Deletes a role definition by ID.
 *
 * @param roleId - The ID of the role to delete.
 * @throws {Error} If no permissions provider has been bonded.
 */
export const deleteRole = async (roleId: string): Promise<void> => {
  return getProvider().deleteRole(roleId)
}

/**
 * Retrieves all permissions granted by a role.
 *
 * @param role - The role name to look up permissions for.
 * @returns The permissions granted by the role.
 * @throws {Error} If no permissions provider has been bonded.
 */
export const getPermissions = async (role: string): Promise<Permission[]> => {
  return getProvider().getPermissions(role)
}

/**
 * Adds a permission to an existing role.
 *
 * @param role - The role name to add the permission to.
 * @param permission - The permission to add.
 * @throws {Error} If no permissions provider has been bonded.
 */
export const addPermission = async (role: string, permission: Permission): Promise<void> => {
  return getProvider().addPermission(role, permission)
}

/**
 * Removes a permission from a role.
 *
 * @param role - The role name to remove the permission from.
 * @param permissionId - The ID of the permission to remove.
 * @throws {Error} If no permissions provider has been bonded.
 */
export const removePermission = async (role: string, permissionId: string): Promise<void> => {
  return getProvider().removePermission(role, permissionId)
}
