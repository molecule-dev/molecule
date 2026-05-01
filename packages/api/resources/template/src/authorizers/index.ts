/**
 * Resource template authorizers.
 *
 * Lightweight ownership/visibility predicates for downstream handlers that
 * compose template management into their own auth checks. The actual
 * permission gates remain inside resource handlers — this module only
 * provides reusable boolean helpers.
 *
 * @module
 */

import type { Template } from '../types.js'

/**
 * Returns `true` when the supplied user can view the template — that is,
 * the template is public or the user is its creator.
 *
 * @param template - Template under inspection.
 * @param userId - The viewing user's ID, or `null` for anonymous viewers.
 * @returns `true` when the template is visible.
 */
export function canViewTemplate(template: Template, userId: string | null): boolean {
  if (template.isPublic) return true
  if (!userId) return false
  return template.createdBy === userId
}

/**
 * Returns `true` when the supplied user can edit the template (currently
 * limited to the creator). Hosts that need richer rules (org admin, share
 * grants, etc.) should layer their own check on top.
 *
 * @param template - Template under inspection.
 * @param userId - The editing user's ID, or `null`.
 * @returns `true` when the user is the creator.
 */
export function canEditTemplate(template: Template, userId: string | null): boolean {
  if (!userId) return false
  return template.createdBy === userId
}
