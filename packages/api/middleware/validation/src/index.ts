/**
 * Request validation middleware for molecule API packages.
 * Uses Zod schemas to validate request body, params, and query.
 *
 * @example
 * ```typescript
 * import { validate, validateBody, paginationSchema } from '@molecule/api-middleware-validation'
 * import { z } from 'zod'
 *
 * const createPostSchema = z.object({
 *   title: z.string().min(1).max(200),
 *   content: z.string().min(1),
 *   tags: z.array(z.string()).optional(),
 * })
 *
 * router.post('/posts', validateBody(createPostSchema), createPost)
 * router.get('/posts', validate({ query: paginationSchema }), listPosts)
 * ```
 *
 * @module
 */

export * from './response.js'
export * from './schemas.js'
export * from './types.js'
export * from './validate.js'
