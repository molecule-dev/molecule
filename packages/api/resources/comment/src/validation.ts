/**
 * Comment input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

/**
 * Schema for validating comment creation input.
 */
export const createCommentSchema = z.object({
  /** The comment body text. Must be non-empty and at most 10,000 characters. */
  body: z.string().min(1).max(10_000),
  /** Optional parent comment ID for threaded replies. */
  parentId: z.string().uuid().optional(),
})

/**
 * Schema for validating comment update input.
 */
export const updateCommentSchema = z.object({
  /** The updated comment body text. Must be non-empty and at most 10,000 characters. */
  body: z.string().min(1).max(10_000),
})
