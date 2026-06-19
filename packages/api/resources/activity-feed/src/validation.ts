/**
 * Activity feed input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

/**
 * Schema for validating activity creation input.
 *
 * Note: `actorId` is intentionally absent — the actor is always derived from the
 * authenticated session in the handler (`actor = caller`), never accepted from the
 * client body. Adding it here would let any user forge feed entries impersonating
 * another user (broken access control). Mirror the comment/review/thread pattern.
 */
export const createActivitySchema = z.object({
  /** The action that was performed (e.g. 'created', 'updated'). */
  action: z.string().min(1).max(255),
  /** The type of resource the action was performed on. */
  resourceType: z.string().min(1).max(255),
  /** The ID of the resource the action was performed on. */
  resourceId: z.string().min(1).max(255),
  /** Optional metadata associated with the activity. */
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Schema for validating mark-seen input.
 */
export const markSeenSchema = z.object({
  /** The ID of the last activity seen. */
  upToId: z.string().min(1).max(255),
})
