/**
 * Reviews with ratings resource for molecule.dev.
 *
 * Polymorphic reviews that attach to any resource type. Supports star ratings
 * (1–5), title/body text, helpfulness voting, and aggregate rating statistics.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-review'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /:resourceType/:resourceId/reviews
 * // GET    /:resourceType/:resourceId/reviews
 * // GET    /:resourceType/:resourceId/reviews/rating
 * // GET    /reviews/:reviewId
 * // PUT    /reviews/:reviewId
 * // DELETE /reviews/:reviewId
 * // POST   /reviews/:reviewId/helpful
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
