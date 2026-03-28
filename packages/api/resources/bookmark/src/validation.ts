/**
 * Bookmark input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

/**
 * Schema for validating bookmark creation input.
 */
export const createBookmarkSchema = z.object({
  /** The type of resource to bookmark. */
  resourceType: z.string().min(1).max(255),
  /** The ID of the resource to bookmark. */
  resourceId: z.string().min(1).max(255),
  /** Optional folder name for organization. */
  folder: z.string().min(1).max(255).optional(),
})
