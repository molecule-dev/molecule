/**
 * Threaded comments resource for molecule.dev.
 *
 * Polymorphic comments that attach to any resource type. Supports threaded
 * replies, pagination, and ownership-based authorization.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-comment'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /:resourceType/:resourceId/comments
 * // GET    /:resourceType/:resourceId/comments
 * // GET    /comments/:commentId
 * // PUT    /comments/:commentId
 * // DELETE /comments/:commentId
 * // GET    /comments/:commentId/replies
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
