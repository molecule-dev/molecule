/**
 * Reaction input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

/**
 * Schema for validating reaction creation/toggle input.
 */
export const addReactionSchema = z.object({
  /** The reaction type (e.g. 'like', 'love'). Must be non-empty and at most 50 characters. */
  type: z.string().min(1).max(50),
})

/**
 * Schema for validating reaction removal input.
 */
export const removeReactionSchema = z.object({
  /** Optional specific reaction type to remove. */
  type: z.string().min(1).max(50).optional(),
})
