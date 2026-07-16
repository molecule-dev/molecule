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
 * @remarks
 * Express/Connect middleware (Express 4 and 5 — including the Express 5
 * getter-only `req.query`, which is handled internally). For other
 * frameworks, call the schemas directly and shape your own 400 response.
 * On success the parsed values REPLACE `req.body` / `req.params` /
 * `req.query`, so Zod coercions and defaults are what handlers see. On
 * failure the response is `400 { error, errors: [{ field, message, code }] }`.
 *
 * Sibling: `@molecule/api-utilities-validation` is the PROGRAMMATIC helper
 * set (`getValidProps`, `safeParse`) for use inside handlers/services — both
 * packages export a `validate`, so alias if you import both.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './response.js'
export * from './schemas.js'
export * from './types.js'
export * from './validate.js'
