/**
 * Common reusable Zod schemas for typical API request patterns.
 *
 * @module
 */

import { z } from 'zod'

/**
 * Schema for standard pagination query parameters.
 *
 * Coerces string values to numbers (as query params arrive as strings).
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Schema for a single UUID `id` URL parameter.
 */
export const idParamSchema = z.object({
  id: z.uuid(),
})

/**
 * Schema that extends pagination with an optional search query `q`.
 */
export const searchQuerySchema = paginationSchema.extend({
  q: z.string().optional(),
})

/** Inferred type for pagination query parameters. */
export type PaginationQuery = z.infer<typeof paginationSchema>

/** Inferred type for search query parameters (pagination + search term). */
export type SearchQuery = z.infer<typeof searchQuerySchema>
