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
