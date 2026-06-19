/**
 * Resource-share authorizers.
 *
 * Authorization helpers for handler code that needs to check whether the
 * current actor satisfies a minimum role on a resource. The actual
 * permission check stays inside resource handlers (e.g. document.update
 * calls `requireRole(resourceType, resourceId, 'editor', userId, teamIds)`)
 * so each downstream resource keeps full control over which mutations need
 * which roles.
 *
 * @module
 */

import { canAccess, getEffectiveRole } from '../service.js'
import type { ShareRole } from '../types.js'

/**
 * Resource-ownership predicate: returns `true` when `userId` is permitted to
 * administer (grant / update / revoke) shares on the given resource. This is
 * the gate that decides who may hand out access — it is deliberately distinct
 * from {@link resolveRole}, which answers "what can this user already do",
 * because the raw share table has no inherent knowledge of which user *owns*
 * an arbitrary `(resourceType, resourceId)`. Only the consuming app does.
 *
 * @param resourceType - Resource type (e.g. 'document', 'project').
 * @param resourceId - Resource ID.
 * @param userId - The authenticated user ID requesting the mutation.
 * @returns `true` to allow the share mutation, `false` to deny.
 */
export type ShareAdminAuthorizer = (
  resourceType: string,
  resourceId: string,
  userId: string,
) => Promise<boolean> | boolean

let shareAdminAuthorizer: ShareAdminAuthorizer | null = null

/**
 * Registers the resource-ownership authorizer consulted by the share
 * grant/update/revoke handlers before any mutation. **Until an app registers
 * one, every share mutation is DENIED (secure by default)** — the share table
 * cannot know who owns an arbitrary resource, so the consuming app MUST supply
 * that knowledge (e.g. "is `userId` the owner of / an admin on this project?").
 *
 * Pass `null` to clear a previously-registered authorizer (restores default
 * deny).
 *
 * @param authorizer - The ownership predicate, or `null` to clear.
 */
export function setShareAdminAuthorizer(authorizer: ShareAdminAuthorizer | null): void {
  shareAdminAuthorizer = authorizer
}

/**
 * Returns the currently-registered share-admin authorizer, or `null` when
 * none has been registered.
 *
 * @returns The registered authorizer, or `null`.
 */
export function getShareAdminAuthorizer(): ShareAdminAuthorizer | null {
  return shareAdminAuthorizer
}

/**
 * Default-DENY ownership gate. Returns `true` only when an authorizer has been
 * registered via {@link setShareAdminAuthorizer} AND that authorizer allows
 * `userId` to administer the resource. When no authorizer is registered, this
 * returns `false` — the share grant/update/revoke handlers respond 403.
 *
 * @param resourceType - Resource type.
 * @param resourceId - Resource ID.
 * @param userId - The authenticated user ID.
 * @returns `true` if the mutation is allowed, otherwise `false`.
 */
export async function canAdministerResource(
  resourceType: string,
  resourceId: string,
  userId: string,
): Promise<boolean> {
  if (!shareAdminAuthorizer) return false
  return shareAdminAuthorizer(resourceType, resourceId, userId)
}

/**
 * Resolves the highest active role a user has on a resource, considering
 * direct user grants, team grants, and any active public grant. Returns
 * `null` when no active grant applies.
 *
 * @param resourceType - Resource type (e.g. 'document').
 * @param resourceId - Resource ID.
 * @param userId - User ID, or `null` for anonymous viewers.
 * @param teamIds - Team IDs the user belongs to.
 * @returns The effective role, or `null`.
 */
export async function resolveRole(
  resourceType: string,
  resourceId: string,
  userId: string | null,
  teamIds: string[] = [],
): Promise<ShareRole | null> {
  return getEffectiveRole(resourceType, resourceId, userId, teamIds)
}

/**
 * Throws `Error('forbidden')` unless the user has at least the required
 * role on the resource. Intended for use inside other resource handlers
 * that integrate with shares.
 *
 * @param resourceType - Resource type.
 * @param resourceId - Resource ID.
 * @param required - Minimum role required.
 * @param userId - User ID, or `null` for anonymous.
 * @param teamIds - Team IDs the user belongs to.
 * @throws {Error} Error tagged 'forbidden' when access is denied.
 */
export async function requireRole(
  resourceType: string,
  resourceId: string,
  required: ShareRole,
  userId: string | null,
  teamIds: string[] = [],
): Promise<void> {
  const ok = await canAccess(resourceType, resourceId, required, userId, teamIds)
  if (!ok) {
    const err = new Error('forbidden')
    ;(err as Error & { code?: string }).code = 'forbidden'
    throw err
  }
}
