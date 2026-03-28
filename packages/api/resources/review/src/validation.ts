/**
 * Review input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

/**
 * Schema for validating review creation input.
 */
export const createReviewSchema = z.object({
  /** Numeric rating from 1 to 5. */
  rating: z.number().int().min(1).max(5),
  /** Short review title (1–200 characters). */
  title: z.string().min(1).max(200),
  /** Review body text (1–10,000 characters). */
  body: z.string().min(1).max(10_000),
})

/**
 * Schema for validating review update input. All fields are optional.
 */
export const updateReviewSchema = z.object({
  /** Updated numeric rating from 1 to 5. */
  rating: z.number().int().min(1).max(5).optional(),
  /** Updated review title (1–200 characters). */
  title: z.string().min(1).max(200).optional(),
  /** Updated review body text (1–10,000 characters). */
  body: z.string().min(1).max(10_000).optional(),
})
