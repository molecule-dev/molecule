/**
 * Article input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

/** Tag names: trimmed, non-empty, at most 50 characters, at most 20 of them. */
const tagList = z.array(z.string().trim().min(1).max(50)).max(20)

/**
 * Schema for creating an article.
 */
export const createArticleSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(1_000).optional(),
  body: z.string().min(1).max(200_000),
  tagList: tagList.optional(),
})

/**
 * Schema for updating an article (every field optional).
 */
export const updateArticleSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(1_000).optional(),
  body: z.string().min(1).max(200_000).optional(),
  tagList: tagList.optional(),
})
